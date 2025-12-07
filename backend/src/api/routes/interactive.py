"""
Interactive Tribunal API Routes

Enables natural conversation with the tribunal:
- Human can address specific agents or all agents
- Agents know about each other and don't cross-talk
- Supports interruption and context-aware responses
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ...agents.tribunal_orchestrator import orchestrator
from ...tools import parse_pdf


router = APIRouter()


class StartSessionRequest(BaseModel):
    text: str
    title: Optional[str] = None


class StartSessionResponse(BaseModel):
    session_id: str
    paper_title: str
    analyses: Dict[str, Any]
    opening_statements: List[Dict[str, Any]]


class SendMessageRequest(BaseModel):
    message: str
    interrupt: bool = False  # If True, interrupts current speaker


class AgentResponse(BaseModel):
    agent: str
    agent_key: str
    response: str


class SendMessageResponse(BaseModel):
    responses: List[AgentResponse]
    addressed_agents: List[str]


class SessionStateResponse(BaseModel):
    session_id: str
    paper_title: str
    analyses: Dict[str, Any]
    messages: List[Dict[str, Any]]
    current_speaker: Optional[str]


@router.post("/start", response_model=StartSessionResponse)
async def start_interactive_session(request: StartSessionRequest):
    """
    Start a new interactive tribunal session.

    This will:
    1. Create a new session
    2. Run initial parallel analysis by all 4 agents
    3. Generate opening statements from each agent
    4. Return the session ready for interactive conversation
    """
    import uuid

    if len(request.text.strip()) < 100:
        raise HTTPException(
            status_code=400,
            detail="Paper text must be at least 100 characters"
        )

    session_id = str(uuid.uuid4())
    metadata = {
        "title": request.title or "Untitled Paper",
        "source": "interactive"
    }

    # Create session
    session = orchestrator.create_session(session_id, request.text, metadata)

    # Run initial analysis
    analyses = await orchestrator.run_initial_analysis(session_id)

    # Get opening statements
    opening_statements = await orchestrator.get_agent_opening_statements(session_id)

    return StartSessionResponse(
        session_id=session_id,
        paper_title=metadata["title"],
        analyses={
            k: {"severity": v.get("severity", "UNKNOWN")}
            for k, v in analyses.items()
        },
        opening_statements=opening_statements
    )


@router.post("/start-pdf", response_model=StartSessionResponse)
async def start_interactive_session_pdf(file: UploadFile = File(...)):
    """
    Start a new interactive tribunal session from a PDF file.

    This will:
    1. Parse the PDF to extract text
    2. Create a new session
    3. Run initial parallel analysis by all 4 agents
    4. Generate opening statements from each agent
    5. Return the session ready for interactive conversation
    """
    import uuid

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    content = await file.read()
    paper_text, metadata = await parse_pdf(content)

    if len(paper_text.strip()) < 100:
        raise HTTPException(
            status_code=400,
            detail="Could not extract sufficient text from PDF"
        )

    session_id = str(uuid.uuid4())
    metadata["source"] = "interactive-pdf"

    # Create session
    session = orchestrator.create_session(session_id, paper_text, metadata)

    # Run initial analysis
    analyses = await orchestrator.run_initial_analysis(session_id)

    # Get opening statements
    opening_statements = await orchestrator.get_agent_opening_statements(session_id)

    return StartSessionResponse(
        session_id=session_id,
        paper_title=metadata.get("title", "Untitled Paper"),
        analyses={
            k: {"severity": v.get("severity", "UNKNOWN")}
            for k, v in analyses.items()
        },
        opening_statements=opening_statements
    )


@router.post("/{session_id}/message", response_model=SendMessageResponse)
async def send_message(session_id: str, request: SendMessageRequest):
    """
    Send a message to the tribunal.

    The orchestrator will:
    1. Determine which agent(s) should respond based on the message
    2. Generate responses in order (so agents can reference each other)
    3. Track the conversation for context

    Examples:
    - "Skeptic, what about confounding variables?" -> Only Skeptic responds
    - "What do you all think about the sample size?" -> All agents may respond
    - "Can you explain the p-value issue?" -> Statistician likely responds
    - "I disagree with your point about funding" -> Ethicist likely responds

    Set interrupt=True if you want to cut off any agent currently speaking
    (useful for real-time voice interaction).
    """
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    # Process the message
    responses = await orchestrator.process_human_message(
        session_id,
        request.message,
        interrupt_current=request.interrupt
    )

    return SendMessageResponse(
        responses=[
            AgentResponse(
                agent=r["agent"],
                agent_key=r["agent_key"],
                response=r["response"]
            )
            for r in responses
        ],
        addressed_agents=[r["agent"] for r in responses]
    )


@router.get("/{session_id}/state", response_model=SessionStateResponse)
async def get_session_state(session_id: str):
    """
    Get the current state of an interactive session.

    Returns the full conversation history and current speaker status.
    """
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionStateResponse(**state)


@router.post("/{session_id}/interrupt")
async def interrupt_speaker(session_id: str):
    """
    Interrupt the current speaker.

    Use this when the human wants to cut in. The interrupted agent's
    message will be marked as interrupted, and the next message from
    the human will be processed with that context.
    """
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    session = orchestrator.sessions[session_id]

    if session.current_speaker:
        # Mark as interrupted
        if session.messages:
            last_msg = session.messages[-1]
            if last_msg.participant == session.current_speaker:
                last_msg.was_interrupted = True
                last_msg.interrupted_at = last_msg.content

        interrupted = session.current_speaker.value
        session.current_speaker = None
        return {"status": "interrupted", "agent": interrupted}

    return {"status": "no_speaker", "agent": None}


@router.post("/{session_id}/request-verdict")
async def request_verdict(session_id: str):
    """
    Request the tribunal to deliver a final verdict.

    This ends the interactive session and generates a verdict
    based on the analyses and conversation. The verdict is stored
    to Mem0 (for dashboard) and Neo blockchain (for immutability).
    """
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    # Use orchestrator's generate_verdict which handles:
    # 1. Verdict generation from all analyses and conversation
    # 2. Storage to Mem0 (long-term memory for dashboard)
    # 3. Storage to Neo blockchain (immutable record)
    verdict = await orchestrator.generate_verdict(session_id)

    return {
        "verdict": verdict,
        "score": verdict.get("score", 0),
        "critical_issues": verdict.get("critical_issues", []),
        "neo_tx_hash": verdict.get("neo_tx_hash"),
        "mem0_stored": verdict.get("mem0_stored", False),
    }
