from typing import Dict, Any, List
import re
from spoon_ai.chat import ChatBot


class BaseTribunalAgent:
    """Base class for tribunal agents - uses ChatBot directly for simple LLM calls."""

    name: str = "tribunal_agent"
    description: str = "Scientific paper review agent"
    role_name: str = "Base Agent"
    voice_id: str = ""
    expertise_areas: List[str] = []
    system_prompt: str = ""

    def __init__(self):
        self.llm = ChatBot(
            model_name="claude-sonnet-4-20250514",
            llm_provider="anthropic",
            temperature=0.3
        )

    async def analyze_paper(self, paper_text: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f"""Analyze this research paper from your perspective as {self.role_name}.

Paper content:
{paper_text[:10000]}

Metadata:
{metadata}

Provide your analysis with:
1. Key concerns from your expertise area
2. Specific evidence/quotes supporting each concern
3. Severity rating: FATAL_FLAW / SERIOUS_CONCERN / MINOR_ISSUE / ACCEPTABLE
4. Overall confidence in your assessment (0-100)
"""
        messages = [{"role": "user", "content": prompt}]
        response = await self.llm.ask(messages, system_msg=self.system_prompt)
        return self._parse_analysis(response)

    async def respond_to_others(
        self,
        own_analysis: Dict[str, Any],
        other_analyses: Dict[str, Dict[str, Any]],
        previous_rounds: List[Dict[str, Any]]
    ) -> str:
        prompt = f"""You are {self.role_name} in a scientific tribunal debate.

Your original analysis:
{own_analysis}

Other tribunal members said:
- The Skeptic: {other_analyses.get('skeptic', 'N/A')}
- The Statistician: {other_analyses.get('statistician', 'N/A')}
- The Methodologist: {other_analyses.get('methodologist', 'N/A')}
- The Ethicist: {other_analyses.get('ethicist', 'N/A')}

Previous debate rounds:
{previous_rounds}

Respond to their points. Do you agree? Disagree?
Keep response to 2-3 sentences for natural debate flow.
"""
        messages = [{"role": "user", "content": prompt}]
        return await self.llm.ask(messages, system_msg=self.system_prompt)

    def _parse_analysis(self, response: str) -> Dict[str, Any]:
        severity = "UNKNOWN"
        for level in ["FATAL_FLAW", "SERIOUS_CONCERN", "MINOR_ISSUE", "ACCEPTABLE"]:
            if level in response.upper():
                severity = level
                break

        confidence = 50
        confidence_match = re.search(r'confidence[:\s]*(\d+)', response.lower())
        if confidence_match:
            confidence = int(confidence_match.group(1))

        return {
            "agent": self.role_name,
            "raw_response": response,
            "concerns": self._extract_concerns(response),
            "severity": severity,
            "confidence": confidence
        }

    def _extract_concerns(self, response: str) -> List[Dict[str, Any]]:
        concerns = []
        lines = response.split('\n')
        current_concern = None

        for line in lines:
            line = line.strip()
            if line.startswith(('-', '*', '1.', '2.', '3.', '4.', '5.')):
                if current_concern:
                    concerns.append(current_concern)
                current_concern = {
                    "title": line.lstrip('-*0123456789. '),
                    "evidence": "",
                    "severity": "UNKNOWN"
                }
            elif current_concern and line:
                current_concern["evidence"] += line + " "

        if current_concern:
            concerns.append(current_concern)

        return concerns
