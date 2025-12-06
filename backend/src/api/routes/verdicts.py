from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ...memory import TribunalMemory
from ...storage import AIOZVerdictStorage
from ...neo import NeoReader

router = APIRouter()


class VerdictSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    query: str
    count: int


class VerdictsByScoreResponse(BaseModel):
    verdicts: List[Dict[str, Any]]
    score_range: Dict[str, int]
    count: int


class CriticalIssueStats(BaseModel):
    issue_type: str
    count: int
    percentage: float


@router.get("/by-score")
async def get_verdicts_by_score(
    min_score: int = Query(default=0, ge=0, le=100),
    max_score: int = Query(default=100, ge=0, le=100),
    limit: int = Query(default=20, ge=1, le=100)
) -> VerdictsByScoreResponse:
    if min_score > max_score:
        raise HTTPException(
            status_code=400,
            detail="min_score cannot be greater than max_score"
        )

    try:
        memory = TribunalMemory()
        results = await memory.get_verdicts_by_score_range(min_score, max_score, limit)
        return VerdictsByScoreResponse(
            verdicts=results,
            score_range={"min": min_score, "max": max_score},
            count=len(results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/critical-issues")
async def get_critical_issue_stats() -> Dict[str, Any]:
    try:
        memory = TribunalMemory()
        stats = await memory.get_critical_issue_stats()
        return {
            "issue_stats": stats,
            "total_issues": sum(s.get("count", 0) for s in stats),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_verdicts(
    limit: int = Query(default=10, ge=1, le=50)
) -> Dict[str, Any]:
    try:
        memory = TribunalMemory()
        results = await memory.get_recent_verdicts(limit)
        return {
            "verdicts": results,
            "count": len(results),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/similar/{session_id}")
async def find_similar_verdicts(
    session_id: str,
    limit: int = Query(default=5, ge=1, le=20)
) -> Dict[str, Any]:
    try:
        memory = TribunalMemory()

        verdict_data = await memory.get_verdict_by_session(session_id)
        if not verdict_data:
            raise HTTPException(status_code=404, detail="Session not found in memory")

        paper_text = verdict_data.get("paper_text", "")
        if not paper_text:
            raise HTTPException(
                status_code=400,
                detail="No paper text available for similarity search"
            )

        similar = await memory.find_similar_papers(paper_text[:1000], limit + 1)

        similar = [s for s in similar if s.get("session_id") != session_id][:limit]

        return {
            "session_id": session_id,
            "similar_verdicts": similar,
            "count": len(similar),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/download")
async def get_verdict_download_url(
    session_id: str,
    expires_in: int = Query(default=3600, ge=60, le=604800)
) -> Dict[str, Any]:
    try:
        storage = AIOZVerdictStorage()
        url = await storage.get_verdict_url(session_id, expires_in)

        if not url:
            raise HTTPException(
                status_code=404,
                detail="Verdict not found in AIOZ storage"
            )

        return {
            "session_id": session_id,
            "download_url": url,
            "expires_in": expires_in,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/blockchain/recent")
async def get_recent_blockchain_verdicts(
    limit: int = Query(default=10, ge=1, le=50)
) -> Dict[str, Any]:
    try:
        reader = NeoReader()
        results = await reader.get_recent_verdict_events(limit)
        return {
            "verdicts": results,
            "count": len(results),
            "network": reader.network,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/aggregate")
async def get_aggregate_stats() -> Dict[str, Any]:
    try:
        memory = TribunalMemory()
        stats = await memory.get_verdict_stats()

        return {
            "total_tribunals": stats.get("total_count", 0),
            "average_score": stats.get("average_score", 0),
            "score_distribution": stats.get("score_distribution", {}),
            "most_common_issues": stats.get("top_issues", []),
            "verdicts_on_chain": stats.get("blockchain_count", 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
