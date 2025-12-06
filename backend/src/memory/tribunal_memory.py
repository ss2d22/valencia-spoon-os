from typing import List, Dict, Any, Optional

from spoon_toolkits.memory import (
    AddMemoryTool,
    SearchMemoryTool,
    GetAllMemoryTool,
    UpdateMemoryTool,
    DeleteMemoryTool,
)


MEM0_CONFIG = {
    "user_id": "adversarial_science",
    "collection": "tribunal_verdicts",
    "async_mode": False,
}


class TribunalMemory:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or MEM0_CONFIG

        self.add_tool = AddMemoryTool(mem0_config=self.config)
        self.search_tool = SearchMemoryTool(mem0_config=self.config)
        self.get_all_tool = GetAllMemoryTool(mem0_config=self.config)
        self.update_tool = UpdateMemoryTool(mem0_config=self.config)
        self.delete_tool = DeleteMemoryTool(mem0_config=self.config)

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
            "verdict_summary": verdict.get("verdict", {}).get("summary", ""),
        }

        result = await self.add_tool.execute(
            content=memory_text.strip(),
            metadata=metadata
        )
        return result.output

    async def find_similar_papers(
        self,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        result = await self.search_tool.execute(
            query=query,
            limit=limit
        )
        return result.output if result.output else []

    async def find_by_issue(
        self,
        issue_type: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        result = await self.search_tool.execute(
            query=f"Critical issue: {issue_type}",
            limit=limit
        )
        return result.output if result.output else []

    async def get_low_score_papers(self, threshold: int = 50) -> List[Dict[str, Any]]:
        result = await self.search_tool.execute(
            query=f"papers with score below {threshold} serious concerns fatal flaws",
            limit=20
        )
        return result.output if result.output else []

    async def delete_verdict_memory(self, memory_id: str) -> bool:
        result = await self.delete_tool.execute(memory_id=memory_id)
        return "deleted" in str(result.output).lower() or "✅" in str(result.output)

    async def update_verdict_memory(
        self,
        memory_id: str,
        new_content: str
    ) -> bool:
        result = await self.update_tool.execute(
            memory_id=memory_id,
            content=new_content
        )
        return "updated" in str(result.output).lower() or "✅" in str(result.output)

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
        result = await self.get_all_tool.execute()
        memories = result.output if result.output else []
        return memories[offset:offset + limit]

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
        result = await self.search_tool.execute(
            query=f"Tribunal ID: {session_id}",
            limit=1
        )

        if result.output and len(result.output) > 0:
            return result.output[0]
        return None
