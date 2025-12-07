import os
from typing import List, Dict, Any, Optional

from mem0 import MemoryClient


MEM0_CONFIG = {
    "user_id": "adversarial_science",
    "collection": "tribunal_verdicts",
}


class TribunalMemory:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or MEM0_CONFIG
        api_key = os.getenv("MEM0_API_KEY")
        if not api_key:
            raise ValueError("MEM0_API_KEY not set")
        self.client = MemoryClient(api_key=api_key)
        self.user_id = self.config.get("user_id", "adversarial_science")

    async def store_verdict_memory(
        self,
        verdict: Dict[str, Any],
        paper_title: str
    ) -> str:
        critical_issues = verdict.get("critical_issues", [])
        issue_titles = [i.get("title", "Unknown") for i in critical_issues[:5]]

        memory_text = f"""
Tribunal Review: {paper_title}
Score: {verdict.get('verdict_score', 0)}/100
Verdict: {verdict.get('verdict', {}).get('summary', 'No verdict')}
Critical Issues: {', '.join(issue_titles) if issue_titles else 'None identified'}
Debate Rounds: {verdict.get('debate_rounds', 0)}
Tribunal ID: {verdict.get('tribunal_id', 'Unknown')}
"""

        metadata = {
            "paper_title": paper_title,
            "score": verdict.get("verdict_score", 0),
            "tribunal_id": verdict.get("tribunal_id", ""),
            "critical_issue_count": len(critical_issues),
        }

        result = self.client.add(
            memory_text.strip(),
            user_id=self.user_id,
            metadata=metadata
        )
        return str(result)

    async def find_similar_papers(
        self,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        results = self.client.search(
            query=query,
            user_id=self.user_id,
            limit=limit
        )
        return results if results else []

    async def find_by_issue(
        self,
        issue_type: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        results = self.client.search(
            query=f"Critical issue: {issue_type}",
            user_id=self.user_id,
            limit=limit
        )
        return results if results else []

    async def get_low_score_papers(self, threshold: int = 50) -> List[Dict[str, Any]]:
        results = self.client.search(
            query=f"papers with score below {threshold} serious concerns fatal flaws",
            user_id=self.user_id,
            limit=20
        )
        return results if results else []

    async def delete_verdict_memory(self, memory_id: str) -> bool:
        try:
            self.client.delete(memory_id)
            return True
        except Exception:
            return False

    async def get_verdict_stats(self) -> Dict[str, Any]:
        all_verdicts = await self.get_all_verdicts()

        if not all_verdicts:
            return {
                "total_verdicts": 0,
                "average_score": 0,
                "lowest_score": 0,
                "highest_score": 0,
            }

        scores = []
        for v in all_verdicts:
            metadata = v.get("metadata", {})
            score = metadata.get("score")
            if score is not None:
                scores.append(score)

        return {
            "total_verdicts": len(all_verdicts),
            "average_score": sum(scores) / len(scores) if scores else 0,
            "lowest_score": min(scores) if scores else 0,
            "highest_score": max(scores) if scores else 0,
        }

    async def get_all_verdicts(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        try:
            memories = self.client.get_all(user_id=self.user_id)
            return memories[offset:offset + limit] if memories else []
        except Exception:
            return []

    async def get_verdicts_by_score_range(
        self,
        min_score: int,
        max_score: int,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        all_verdicts = await self.get_all_verdicts(limit=500)

        filtered = [
            v for v in all_verdicts
            if min_score <= v.get("metadata", {}).get("score", 0) <= max_score
        ]

        return filtered[:limit]

    async def get_critical_issue_stats(self) -> List[Dict[str, Any]]:
        issue_types = [
            "p-hacking", "selection bias", "confounding",
            "small sample size", "missing data", "reproducibility",
            "ethical concerns", "methodology flaws", "statistical errors"
        ]

        stats = []
        for issue_type in issue_types:
            results = await self.find_by_issue(issue_type, limit=100)
            if results:
                stats.append({
                    "issue_type": issue_type,
                    "count": len(results),
                })

        return sorted(stats, key=lambda x: x["count"], reverse=True)

    async def get_recent_verdicts(self, limit: int = 10) -> List[Dict[str, Any]]:
        all_verdicts = await self.get_all_verdicts(limit=limit)
        return all_verdicts

    async def get_verdict_by_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        results = self.client.search(
            query=f"Tribunal ID: {session_id}",
            user_id=self.user_id,
            limit=1
        )

        if results and len(results) > 0:
            return results[0]
        return None
