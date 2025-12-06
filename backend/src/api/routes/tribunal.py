from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ...memory import TribunalMemory
from ...neo import NeoReader

router = APIRouter()


class TribunalHistoryResponse(BaseModel):
    session_id: str
    paper_title: str
    verdict_score: int
    created_at: str
    neo_tx_hash: Optional[str] = None


class TribunalCompareRequest(BaseModel):
    session_ids: List[str]


class AgentDebateRound(BaseModel):
    round_number: int
    agent: str
    statement: str
    targets: List[str]


@router.get("/history")
async def get_tribunal_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
) -> Dict[str, Any]:
    try:
        memory = TribunalMemory()
        results = await memory.get_all_verdicts(limit=limit, offset=offset)
        return {
            "tribunals": results,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/debate")
async def get_debate_transcript(session_id: str) -> Dict[str, Any]:
    from ..main import tribunal_sessions

    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]

    if session["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Tribunal not yet complete. Status: {session['status']}"
        )

    result = session.get("result", {})
    debate_rounds = result.get("debate_rounds", [])

    return {
        "session_id": session_id,
        "debate_rounds": debate_rounds,
        "total_rounds": len(debate_rounds),
    }


@router.get("/{session_id}/agents")
async def get_agent_analyses(session_id: str) -> Dict[str, Any]:
    from ..main import tribunal_sessions

    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]

    if session["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Tribunal not yet complete. Status: {session['status']}"
        )

    result = session.get("result", {})

    return {
        "session_id": session_id,
        "agents": {
            "skeptic": result.get("skeptic_analysis"),
            "statistician": result.get("statistician_analysis"),
            "methodologist": result.get("methodologist_analysis"),
            "ethicist": result.get("ethicist_analysis"),
        }
    }


@router.post("/compare")
async def compare_tribunals(request: TribunalCompareRequest) -> Dict[str, Any]:
    from ..main import tribunal_sessions

    if len(request.session_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 session IDs required for comparison"
        )

    if len(request.session_ids) > 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 sessions can be compared at once"
        )

    comparisons = []
    for session_id in request.session_ids:
        if session_id not in tribunal_sessions:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )

        session = tribunal_sessions[session_id]
        if session["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Session {session_id} not yet complete"
            )

        result = session.get("result", {})
        comparisons.append({
            "session_id": session_id,
            "paper_title": session.get("paper_metadata", {}).get("title"),
            "verdict_score": result.get("verdict_score", 0),
            "critical_issues": result.get("critical_issues", []),
            "verdict_summary": result.get("verdict", {}).get("summary"),
        })

    return {
        "comparisons": comparisons,
        "count": len(comparisons),
    }


@router.get("/{session_id}/blockchain")
async def get_blockchain_info(session_id: str) -> Dict[str, Any]:
    from ..main import tribunal_sessions

    if session_id not in tribunal_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = tribunal_sessions[session_id]
    result = session.get("result", {})

    neo_tx_hash = result.get("neo_tx_hash")
    if not neo_tx_hash:
        return {
            "session_id": session_id,
            "blockchain_verified": False,
            "message": "Verdict not yet recorded on blockchain"
        }

    try:
        reader = NeoReader()
        tx_info = await reader.get_transaction_info(neo_tx_hash)
        return {
            "session_id": session_id,
            "blockchain_verified": True,
            "neo_tx_hash": neo_tx_hash,
            "transaction_info": tx_info,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
