from typing import Dict, Any, List
import re
from spoon_ai.chat import ChatBot


class BaseTribunalAgent:
    name: str = "tribunal_agent"
    description: str = "Scientific paper review agent"
    role_name: str = "Base Agent"
    role_name_zh: str = "基础评审"
    voice_id: str = ""
    expertise_areas: List[str] = []
    system_prompt: str = ""
    system_prompt_zh: str = ""

    def __init__(self):
        self.llm = ChatBot(
            model_name="claude-sonnet-4-20250514",
            llm_provider="anthropic",
            temperature=0.3
        )

    async def analyze_paper(self, paper_text: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze paper - dispatches to English or Chinese version based on language."""
        lang = metadata.get("language", "en")
        if lang == "zh":
            return await self.analyze_paper_chinese(paper_text, metadata)
        return await self.analyze_paper_english(paper_text, metadata)

    async def analyze_paper_english(self, paper_text: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze paper in English."""
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

    async def analyze_paper_chinese(self, paper_text: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze paper in Chinese (中文分析论文)."""
        prompt = f"""作为{self.role_name_zh}，从你的专业角度分析这篇研究论文。

论文内容：
{paper_text[:10000]}

元数据：
{metadata}

请提供你的分析，包括：
1. 从你的专业领域发现的关键问题
2. 支持每个问题的具体证据/引用
3. 严重程度评级：致命缺陷 / 严重问题 / 次要问题 / 可接受
4. 你对评估的总体置信度（0-100）

请用中文回复。
"""
        messages = [{"role": "user", "content": prompt}]
        response = await self.llm.ask(messages, system_msg=self.system_prompt_zh)
        return self._parse_analysis_chinese(response)

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

    async def respond_to_others_chinese(
        self,
        own_analysis: Dict[str, Any],
        other_analyses: Dict[str, Dict[str, Any]],
        previous_rounds: List[Dict[str, Any]]
    ) -> str:
        """Respond to other agents in Chinese."""
        prompt = f"""你是科学评审团辩论中的{self.role_name_zh}。

你的原始分析：
{own_analysis}

其他评审团成员说：
- 怀疑论者: {other_analyses.get('skeptic', '无')}
- 统计学家: {other_analyses.get('statistician', '无')}
- 方法论专家: {other_analyses.get('methodologist', '无')}
- 伦理学家: {other_analyses.get('ethicist', '无')}

之前的辩论轮次：
{previous_rounds}

回应他们的观点。你同意还是不同意？
保持回复简短（2-3句话）以保持自然的辩论流程。
请用中文回复。
"""
        messages = [{"role": "user", "content": prompt}]
        return await self.llm.ask(messages, system_msg=self.system_prompt_zh)

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

    def _parse_analysis_chinese(self, response: str) -> Dict[str, Any]:
        """Parse Chinese analysis response."""
        severity = "UNKNOWN"
        severity_map = {
            "致命缺陷": "FATAL_FLAW",
            "严重问题": "SERIOUS_CONCERN",
            "次要问题": "MINOR_ISSUE",
            "可接受": "ACCEPTABLE"
        }
        for zh_level, en_level in severity_map.items():
            if zh_level in response:
                severity = en_level
                break
        # Also check English levels
        for level in ["FATAL_FLAW", "SERIOUS_CONCERN", "MINOR_ISSUE", "ACCEPTABLE"]:
            if level in response.upper():
                severity = level
                break

        confidence = 50
        confidence_match = re.search(r'置信度[：:\s]*(\d+)', response)
        if confidence_match:
            confidence = int(confidence_match.group(1))
        else:
            confidence_match = re.search(r'confidence[:\s]*(\d+)', response.lower())
            if confidence_match:
                confidence = int(confidence_match.group(1))

        return {
            "agent": self.role_name_zh,
            "agent_en": self.role_name,
            "raw_response": response,
            "concerns": self._extract_concerns_chinese(response),
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

    def _extract_concerns_chinese(self, response: str) -> List[Dict[str, Any]]:
        """Extract concerns from Chinese response."""
        concerns = []
        lines = response.split('\n')
        current_concern = None

        for line in lines:
            line = line.strip()
            # Check for Chinese list markers and standard markers
            if (line.startswith(('-', '*', '1.', '2.', '3.', '4.', '5.', '•', '·')) or
                line.startswith(('一、', '二、', '三、', '四、', '五、')) or
                line.startswith(('1、', '2、', '3、', '4、', '5、'))):
                if current_concern:
                    concerns.append(current_concern)
                current_concern = {
                    "title": line.lstrip('-*0123456789.、一二三四五•· '),
                    "evidence": "",
                    "severity": "UNKNOWN"
                }
            elif current_concern and line:
                current_concern["evidence"] += line + " "

        if current_concern:
            concerns.append(current_concern)

        return concerns
