import asyncio
import uuid
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load .env file from backend directory (override=True to replace stale env vars)
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path, override=True)

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from ..graph import get_compiled_graph, TribunalState
from ..tools import parse_pdf, parse_text
from ..storage import AIOZVerdictStorage
from ..memory import TribunalMemory
from ..neo import NeoReader


tribunal_sessions: Dict[str, Dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("server starting")
    yield
    print("server stopping")


app = FastAPI(
    title="Adversarial Science API",
    description="AI Tribunal for Scientific Paper Review",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TribunalSubmitResponse(BaseModel):
    session_id: str
    status: str
    message: str


class TribunalStatusResponse(BaseModel):
    session_id: str
    status: str
    current_stage: Optional[str] = None
    progress: Optional[Dict[str, Any]] = None


class VerdictResponse(BaseModel):
    session_id: str
    verdict: Dict[str, Any]
    verdict_score: int
    critical_issues: list
    neo_tx_hash: Optional[str] = None
    aioz_verdict_key: Optional[str] = None
    aioz_audio_key: Optional[str] = None


class TextSubmitRequest(BaseModel):
    text: str
    title: Optional[str] = None


async def run_tribunal(session_id: str, paper_text: str, metadata: Dict[str, Any]):
    try:
        tribunal_sessions[session_id]["status"] = "running"
        tribunal_sessions[session_id]["current_stage"] = "initializing"

        graph = get_compiled_graph()

        initial_state: TribunalState = {
            "paper_text": paper_text,
            "paper_metadata": metadata,
            "skeptic_analysis": None,
            "statistician_analysis": None,
            "methodologist_analysis": None,
            "ethicist_analysis": None,
            "debate_rounds": [],
            "current_round": 0,
            "audio_segments": [],
            "verdict": None,
            "verdict_score": 0,
            "critical_issues": [],
            "neo_tx_hash": None,
            "aioz_verdict_key": None,
            "aioz_audio_key": None,
        }

        tribunal_sessions[session_id]["current_stage"] = "analyzing"

        result = await graph.invoke(initial_state)

        print(f"[DEBUG] Graph result keys: {result.keys() if result else 'None'}")
        print(f"[DEBUG] verdict: {result.get('verdict') if result else 'None'}")
        print(f"[DEBUG] verdict_score: {result.get('verdict_score') if result else 'None'}")

        tribunal_sessions[session_id]["status"] = "completed"
        tribunal_sessions[session_id]["current_stage"] = "completed"
        tribunal_sessions[session_id]["result"] = result

    except Exception as e:
        tribunal_sessions[session_id]["status"] = "failed"
        tribunal_sessions[session_id]["error"] = str(e)


@app.get("/")
async def root():
    return {
        "name": "Adversarial Science API",
        "version": "1.0.0",
        "description": "AI Tribunal for Scientific Paper Review",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/tribunal/submit", response_model=TribunalSubmitResponse)
async def submit_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    content = await file.read()
    paper_text, metadata = await parse_pdf(content)

    if not paper_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from PDF"
        )

    session_id = str(uuid.uuid4())

    tribunal_sessions[session_id] = {
        "status": "queued",
        "current_stage": None,
        "paper_metadata": metadata,
        "result": None,
        "error": None,
    }

    background_tasks.add_task(run_tribunal, session_id, paper_text, metadata)

    return TribunalSubmitResponse(
        session_id=session_id,
        status="processing",
        message="Tribunal session started. Poll /api/tribunal/{session_id}/status for updates."
    )


@app.post("/api/tribunal/submit-text", response_model=TribunalSubmitResponse)
async def submit_text(
    request: TextSubmitRequest,
    background_tasks: BackgroundTasks
):
    paper_text = request.text

    if len(paper_text.strip()) < 100:
        raise HTTPException(
            status_code=400,
            detail="Paper text must be at least 100 characters"
        )

    metadata = {
        "title": request.title or "Untitled Paper",
        "source": "direct_text",
    }

    session_id = str(uuid.uuid4())

    tribunal_sessions[session_id] = {
        "status": "queued",
        "current_stage": None,
        "paper_metadata": metadata,
        "result": None,
        "error": None,
    }

    background_tasks.add_task(run_tribunal, session_id, paper_text, metadata)

    return TribunalSubmitResponse(
        session_id=session_id,
        status="processing",
        message="Tribunal session started."
    )


@app.get("/api/tribunal/{session_id}/status", response_model=TribunalStatusResponse)
async def get_tribunal_status(session_id: str):
    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]

    return TribunalStatusResponse(
        session_id=session_id,
        status=session["status"],
        current_stage=session.get("current_stage"),
        progress={
            "paper_title": session.get("paper_metadata", {}).get("title"),
            "error": session.get("error"),
        }
    )


@app.get("/api/tribunal/{session_id}/verdict")
async def get_verdict(session_id: str):
    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]

    if session["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Tribunal not yet complete. Status: {session['status']}"
        )

    result = session.get("result", {})

    verdict = result.get("verdict")
    return VerdictResponse(
        session_id=session_id,
        verdict=verdict if verdict is not None else {},
        verdict_score=result.get("verdict_score", 0) or 0,
        critical_issues=result.get("critical_issues") or [],
        neo_tx_hash=result.get("neo_tx_hash"),
        aioz_verdict_key=result.get("aioz_verdict_key"),
        aioz_audio_key=result.get("aioz_audio_key"),
    )


@app.get("/api/tribunal/{session_id}/audio")
async def get_audio(session_id: str):
    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]

    if session["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail="Tribunal not yet complete"
        )

    result = session.get("result", {})
    audio_segments = result.get("audio_segments", [])

    if not audio_segments or not audio_segments[0]:
        raise HTTPException(
            status_code=404,
            detail="No audio available for this tribunal"
        )

    return StreamingResponse(
        iter([audio_segments[0]]),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"attachment; filename=tribunal_{session_id}.mp3"}
    )


@app.get("/api/tribunal/{session_id}/audio-url")
async def get_audio_url(session_id: str):
    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]
    result = session.get("result", {})
    aioz_audio_key = result.get("aioz_audio_key")

    if not aioz_audio_key:
        raise HTTPException(status_code=404, detail="No audio stored on AIOZ")

    try:
        storage = AIOZVerdictStorage()
        url = await storage.get_audio_url(session_id)
        return {"audio_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/verdicts/search")
async def search_verdicts(query: str, limit: int = 10):
    try:
        memory = TribunalMemory()
        results = await memory.find_similar_papers(query, limit)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/verdicts/stats")
async def get_verdict_stats():
    try:
        memory = TribunalMemory()
        stats = await memory.get_verdict_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/neo/verify/{tx_hash}")
async def verify_neo_transaction(tx_hash: str):
    try:
        reader = NeoReader()
        result = await reader.verify_verdict_tx(tx_hash)
        if result:
            return result
        raise HTTPException(status_code=404, detail="Transaction not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from .routes import tribunal, verdicts, interactive, voice

app.include_router(tribunal.router, prefix="/api/tribunal", tags=["tribunal"])
app.include_router(verdicts.router, prefix="/api/verdicts", tags=["verdicts"])
app.include_router(interactive.router, prefix="/api/interactive", tags=["interactive"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
