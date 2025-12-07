from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ...agents.tribunal_orchestrator import orchestrator
from ...tools import parse_pdf, parse_pdf_chinese
from ...tools.language_detector import is_supported_language


router = APIRouter()


def _is_chinese_text(text: str) -> bool:
    import re
    if not text:
        return False
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text[:2000]))
    total_chars = len(re.findall(r'\S', text[:2000]))
    if total_chars == 0:
        return False
    return chinese_chars / total_chars > 0.1


class StartSessionRequest(BaseModel):
    text: str
    title: Optional[str] = None


class StartSessionResponse(BaseModel):
    session_id: str
    paper_title: str
    detected_language: str
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
    import uuid

    if len(request.text.strip()) < 100:
        raise HTTPException(
            status_code=400,
            detail="Paper text must be at least 100 characters"
        )

    is_supported, lang_code, lang_name = is_supported_language(request.text)
    if not is_supported:
        raise HTTPException(
            status_code=400,
            detail=f"Language not supported: {lang_name}. Only English and Chinese papers are currently supported."
        )

    session_id = str(uuid.uuid4())
    metadata = {
        "title": request.title or "Untitled Paper",
        "source": "interactive",
        "language": lang_code
    }

    session = orchestrator.create_session(session_id, request.text, metadata)
    analyses = await orchestrator.run_initial_analysis(session_id)
    opening_statements = await orchestrator.get_agent_opening_statements(session_id)

    return StartSessionResponse(
        session_id=session_id,
        paper_title=metadata["title"],
        detected_language=lang_code,
        analyses={
            k: {"severity": v.get("severity", "UNKNOWN")}
            for k, v in analyses.items()
        },
        opening_statements=opening_statements
    )


@router.post("/start-pdf", response_model=StartSessionResponse)
async def start_interactive_session_pdf(file: UploadFile = File(...)):
    import uuid

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    content = await file.read()

    paper_text, metadata = await parse_pdf(content)

    if _is_chinese_text(paper_text):
        paper_text, metadata = await parse_pdf_chinese(content)

    if len(paper_text.strip()) < 100:
        raise HTTPException(
            status_code=400,
            detail="Could not extract sufficient text from PDF"
        )

    is_supported, lang_code, lang_name = is_supported_language(paper_text)
    if not is_supported:
        raise HTTPException(
            status_code=400,
            detail=f"Language not supported: {lang_name}. Only English and Chinese papers are currently supported."
        )

    session_id = str(uuid.uuid4())
    metadata["source"] = "interactive-pdf"
    metadata["language"] = lang_code

    session = orchestrator.create_session(session_id, paper_text, metadata)
    analyses = await orchestrator.run_initial_analysis(session_id)
    opening_statements = await orchestrator.get_agent_opening_statements(session_id)

    return StartSessionResponse(
        session_id=session_id,
        paper_title=metadata.get("title", "Untitled Paper"),
        detected_language=lang_code,
        analyses={
            k: {"severity": v.get("severity", "UNKNOWN")}
            for k, v in analyses.items()
        },
        opening_statements=opening_statements
    )


@router.post("/{session_id}/message", response_model=SendMessageResponse)
async def send_message(session_id: str, request: SendMessageRequest):
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

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
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionStateResponse(**state)


@router.post("/{session_id}/interrupt")
async def interrupt_speaker(session_id: str):
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    session = orchestrator.sessions[session_id]

    if session.current_speaker:
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
    state = orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    verdict = await orchestrator.generate_verdict(session_id)

    return {
        "verdict": verdict,
        "score": verdict.get("score", 0),
        "critical_issues": verdict.get("critical_issues", []),
        "neo_tx_hash": verdict.get("neo_tx_hash"),
        "mem0_stored": verdict.get("mem0_stored", False),
    }
