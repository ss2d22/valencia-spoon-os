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


@router.get("/all")
async def get_all_verdicts(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
) -> Dict[str, Any]:
    """Get all verdicts for the dashboard."""
    try:
        memory = TribunalMemory()
        results = await memory.get_all_verdicts(limit=limit, offset=offset)

        # Transform Mem0 results to frontend-friendly format
        verdicts = []
        for r in results:
            metadata = r.get("metadata", {})
            memory_text = r.get("memory", "")

            # Parse memory text to extract details
            lines = memory_text.split("\n")
            title = metadata.get("paper_title", "Untitled")
            score = metadata.get("score", 0)
            tribunal_id = metadata.get("tribunal_id", r.get("id", ""))
            critical_count = metadata.get("critical_issue_count", 0)

            verdicts.append({
                "session_id": tribunal_id,
                "memory_id": r.get("id"),
                "paper_title": title,
                "verdict_score": score,
                "critical_issues_count": critical_count,
                "created_at": r.get("created_at"),
                "memory_text": memory_text,
            })

        return {
            "verdicts": verdicts,
            "count": len(verdicts),
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-paper")
async def get_verdicts_grouped_by_paper(
    limit: int = Query(default=50, ge=1, le=200)
) -> Dict[str, Any]:
    """
    Get verdicts grouped by paper title for version history.
    Groups tribunals by paper title to show v1, v2, v3, etc.
    """
    try:
        memory = TribunalMemory()
        results = await memory.get_all_verdicts(limit=limit)

        # Group by paper title (normalized)
        paper_groups: Dict[str, List[Dict[str, Any]]] = {}

        for r in results:
            metadata = r.get("metadata", {})
            title = metadata.get("paper_title", "Untitled").strip()
            # Normalize title for grouping (lowercase, remove extra spaces)
            normalized_title = " ".join(title.lower().split())

            if normalized_title not in paper_groups:
                paper_groups[normalized_title] = []

            paper_groups[normalized_title].append({
                "session_id": metadata.get("tribunal_id", r.get("id", "")),
                "memory_id": r.get("id"),
                "paper_title": title,
                "verdict_score": metadata.get("score", 0),
                "critical_issues_count": metadata.get("critical_issue_count", 0),
                "created_at": r.get("created_at"),
            })

        # Sort versions within each paper by created_at (oldest first = v1)
        papers = []
        for normalized_title, versions in paper_groups.items():
            # Sort by created_at if available, otherwise by score to infer version order
            sorted_versions = sorted(
                versions,
                key=lambda x: x.get("created_at") or "",
            )

            # Add version numbers
            for i, version in enumerate(sorted_versions):
                version["version"] = i + 1

            papers.append({
                "paper_title": versions[0]["paper_title"],  # Use original title
                "version_count": len(versions),
                "latest_score": sorted_versions[-1]["verdict_score"] if sorted_versions else 0,
                "best_score": max(v["verdict_score"] for v in versions),
                "versions": sorted_versions,
            })

        # Sort papers by latest activity
        papers.sort(
            key=lambda x: x["versions"][-1].get("created_at") or "" if x["versions"] else "",
            reverse=True
        )

        return {
            "papers": papers,
            "total_papers": len(papers),
            "total_versions": sum(len(p["versions"]) for p in papers),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}")
async def get_verdict_by_session(session_id: str) -> Dict[str, Any]:
    """Get a specific verdict by session ID."""
    try:
        memory = TribunalMemory()
        result = await memory.get_verdict_by_session(session_id)

        if not result:
            raise HTTPException(status_code=404, detail="Verdict not found")

        metadata = result.get("metadata", {})

        return {
            "session_id": session_id,
            "memory_id": result.get("id"),
            "paper_title": metadata.get("paper_title", "Untitled"),
            "verdict_score": metadata.get("score", 0),
            "critical_issues_count": metadata.get("critical_issue_count", 0),
            "created_at": result.get("created_at"),
            "memory_text": result.get("memory", ""),
            "metadata": metadata,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
