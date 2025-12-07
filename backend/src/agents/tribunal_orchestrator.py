import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Literal
from dataclasses import dataclass, field
from enum import Enum
from spoon_ai.chat import ChatBot

logger = logging.getLogger(__name__)

from .skeptic_agent import SkepticAgent
from .statistician_agent import StatisticianAgent
from .methodologist_agent import MethodologistAgent
from .ethicist_agent import EthicistAgent


class ParticipantType(Enum):
    HUMAN = "human"
    SKEPTIC = "skeptic"
    STATISTICIAN = "statistician"
    METHODOLOGIST = "methodologist"
    ETHICIST = "ethicist"


@dataclass
class ConversationMessage:
    participant: ParticipantType
    content: str
    timestamp: float
    addressed_to: Optional[List[ParticipantType]] = None
    was_interrupted: bool = False
    interrupted_at: Optional[str] = None


@dataclass
class TribunalSession:
    session_id: str
    paper_text: str
    paper_metadata: Dict[str, Any]

    analyses: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    messages: List[ConversationMessage] = field(default_factory=list)
    current_speaker: Optional[ParticipantType] = None
    pending_response: Optional[str] = None
    agents_who_have_spoken_this_round: List[ParticipantType] = field(default_factory=list)
    verdict: Optional[Dict[str, Any]] = None


class TribunalOrchestrator:
    AGENT_NAMES = {
        ParticipantType.SKEPTIC: "The Skeptic",
        ParticipantType.STATISTICIAN: "The Statistician",
        ParticipantType.METHODOLOGIST: "The Methodologist",
        ParticipantType.ETHICIST: "The Ethicist",
    }

    AGENT_NAMES_ZH = {
        ParticipantType.SKEPTIC: "怀疑论者",
        ParticipantType.STATISTICIAN: "统计学家",
        ParticipantType.METHODOLOGIST: "方法论专家",
        ParticipantType.ETHICIST: "伦理学家",
    }

    AGENT_KEYWORDS = {
        ParticipantType.SKEPTIC: ["skeptic", "alternative", "confound", "bias", "causation"],
        ParticipantType.STATISTICIAN: ["statistic", "p-value", "sample", "power", "significance", "effect size", "confidence"],
        ParticipantType.METHODOLOGIST: ["method", "design", "control", "blind", "randomiz", "protocol", "replicat"],
        ParticipantType.ETHICIST: ["ethic", "conflict", "funding", "consent", "privacy", "bias", "disclosure"],
    }

    AGENT_KEYWORDS_ZH = {
        ParticipantType.SKEPTIC: ["怀疑", "替代", "混杂", "偏差", "因果"],
        ParticipantType.STATISTICIAN: ["统计", "p值", "样本", "效力", "显著", "效应", "置信"],
        ParticipantType.METHODOLOGIST: ["方法", "设计", "对照", "盲法", "随机", "方案", "重复"],
        ParticipantType.ETHICIST: ["伦理", "冲突", "资金", "同意", "隐私", "披露"],
    }

    def __init__(self):
        self.agents = {
            ParticipantType.SKEPTIC: SkepticAgent(),
            ParticipantType.STATISTICIAN: StatisticianAgent(),
            ParticipantType.METHODOLOGIST: MethodologistAgent(),
            ParticipantType.ETHICIST: EthicistAgent(),
        }

        self.router = ChatBot(
            model_name="claude-sonnet-4-20250514",
            llm_provider="anthropic",
            temperature=0.1
        )
        self.sessions: Dict[str, TribunalSession] = {}

    def _is_chinese(self, session: TribunalSession) -> bool:
        """Check if the session is in Chinese."""
        return session.paper_metadata.get("language") == "zh"

    def _get_agent_name(self, agent_type: ParticipantType, session: TribunalSession) -> str:
        """Get agent name in appropriate language."""
        if self._is_chinese(session):
            return self.AGENT_NAMES_ZH.get(agent_type, self.AGENT_NAMES[agent_type])
        return self.AGENT_NAMES[agent_type]

    def create_session(
        self,
        session_id: str,
        paper_text: str,
        paper_metadata: Dict[str, Any]
    ) -> TribunalSession:
        session = TribunalSession(
            session_id=session_id,
            paper_text=paper_text,
            paper_metadata=paper_metadata
        )
        self.sessions[session_id] = session
        return session

    async def run_initial_analysis(self, session_id: str) -> Dict[str, Any]:
        """Run initial analysis - dispatches to Chinese or English version."""
        session = self.sessions[session_id]
        results = await asyncio.gather(
            self.agents[ParticipantType.SKEPTIC].analyze_paper(
                session.paper_text, session.paper_metadata
            ),
            self.agents[ParticipantType.STATISTICIAN].analyze_paper(
                session.paper_text, session.paper_metadata
            ),
            self.agents[ParticipantType.METHODOLOGIST].analyze_paper(
                session.paper_text, session.paper_metadata
            ),
            self.agents[ParticipantType.ETHICIST].analyze_paper(
                session.paper_text, session.paper_metadata
            ),
            return_exceptions=True
        )
        agent_types = [
            ParticipantType.SKEPTIC,
            ParticipantType.STATISTICIAN,
            ParticipantType.METHODOLOGIST,
            ParticipantType.ETHICIST
        ]

        for agent_type, result in zip(agent_types, results):
            if isinstance(result, Exception):
                session.analyses[agent_type.value] = {
                    "error": str(result),
                    "severity": "UNKNOWN"
                }
            else:
                session.analyses[agent_type.value] = result

        return session.analyses

    async def determine_respondents(
        self,
        session_id: str,
        human_message: str
    ) -> List[ParticipantType]:
        session = self.sessions[session_id]
        is_chinese = self._is_chinese(session)
        conversation_summary = self._summarize_conversation(session)

        if is_chinese:
            return await self._determine_respondents_chinese(session, human_message, conversation_summary)
        return await self._determine_respondents_english(session, human_message, conversation_summary)

    async def _determine_respondents_english(
        self,
        session: TribunalSession,
        human_message: str,
        conversation_summary: str
    ) -> List[ParticipantType]:
        router_prompt = f"""You are a tribunal moderator. A human is participating in a scientific paper review tribunal.

The tribunal has 4 agents:
1. THE SKEPTIC - Questions assumptions, looks for alternative explanations, confounding variables
2. THE STATISTICIAN - Audits statistics, p-values, sample sizes, effect sizes, power analysis
3. THE METHODOLOGIST - Evaluates experimental design, controls, blinding, randomization
4. THE ETHICIST - Identifies conflicts of interest, bias, consent issues, funding concerns

The human just said:
"{human_message}"

Recent conversation context:
{conversation_summary}

Determine which agent(s) should respond. Consider:
- Is the human addressing a specific agent by name or expertise area?
- Is this a general question all agents should weigh in on?
- Is this a follow-up to a specific agent's point?
- Does only one agent have relevant expertise?

Respond with ONLY a JSON list of agent names who should respond, in order.
Example responses:
- ["SKEPTIC"] - if addressing the skeptic specifically
- ["STATISTICIAN", "METHODOLOGIST"] - if about stats and methods
- ["SKEPTIC", "STATISTICIAN", "METHODOLOGIST", "ETHICIST"] - if asking all to weigh in
- [] - if this is a statement that doesn't require agent response

JSON response:"""

        messages = [{"role": "user", "content": router_prompt}]
        response = await self.router.ask(messages, system_msg="You are a tribunal moderator. Respond only with valid JSON.")
        return self._parse_respondents(response, human_message, is_chinese=False)

    async def _determine_respondents_chinese(
        self,
        session: TribunalSession,
        human_message: str,
        conversation_summary: str
    ) -> List[ParticipantType]:
        router_prompt = f"""你是评审团主持人。一位人类研究者正在参与科学论文评审会。

评审团有4位评审专家：
1. 怀疑论者 - 质疑假设，寻找替代解释，混杂变量
2. 统计学家 - 审核统计数据、p值、样本量、效应量、效力分析
3. 方法论专家 - 评估实验设计、对照、盲法、随机化
4. 伦理学家 - 识别利益冲突、偏见、知情同意问题、资金问题

人类刚刚说：
"{human_message}"

最近的对话背景：
{conversation_summary}

确定哪些评审专家应该回应。考虑：
- 人类是否在称呼特定的评审专家或其专业领域？
- 这是否是一个所有评审专家都应该发表意见的一般性问题？
- 这是否是对特定评审专家观点的跟进？
- 是否只有一个评审专家具有相关专业知识？

只用JSON列表回复应该回应的评审专家名称，按顺序排列。
示例回复：
- ["SKEPTIC"] - 如果专门针对怀疑论者
- ["STATISTICIAN", "METHODOLOGIST"] - 如果关于统计和方法
- ["SKEPTIC", "STATISTICIAN", "METHODOLOGIST", "ETHICIST"] - 如果要求所有人发表意见
- [] - 如果这是不需要评审专家回应的陈述

JSON回复："""

        messages = [{"role": "user", "content": router_prompt}]
        response = await self.router.ask(messages, system_msg="你是评审团主持人。只用有效的JSON回复。")
        return self._parse_respondents(response, human_message, is_chinese=True)

    def _parse_respondents(self, response: str, human_message: str, is_chinese: bool) -> List[ParticipantType]:
        try:
            import json
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]

            agent_names = json.loads(response)

            name_to_type = {
                "SKEPTIC": ParticipantType.SKEPTIC,
                "STATISTICIAN": ParticipantType.STATISTICIAN,
                "METHODOLOGIST": ParticipantType.METHODOLOGIST,
                "ETHICIST": ParticipantType.ETHICIST,
            }

            return [name_to_type[name.upper()] for name in agent_names if name.upper() in name_to_type]

        except Exception as e:
            return self._keyword_based_routing(human_message, is_chinese)

    def _keyword_based_routing(self, message: str, is_chinese: bool = False) -> List[ParticipantType]:
        message_lower = message.lower()
        respondents = []

        keywords = self.AGENT_KEYWORDS_ZH if is_chinese else self.AGENT_KEYWORDS

        # Check for direct agent mentions
        if is_chinese:
            if "怀疑" in message:
                respondents.append(ParticipantType.SKEPTIC)
            if "统计" in message:
                respondents.append(ParticipantType.STATISTICIAN)
            if "方法" in message:
                respondents.append(ParticipantType.METHODOLOGIST)
            if "伦理" in message:
                respondents.append(ParticipantType.ETHICIST)
        else:
            if "skeptic" in message_lower:
                respondents.append(ParticipantType.SKEPTIC)
            if "statistic" in message_lower:
                respondents.append(ParticipantType.STATISTICIAN)
            if "method" in message_lower:
                respondents.append(ParticipantType.METHODOLOGIST)
            if "ethic" in message_lower:
                respondents.append(ParticipantType.ETHICIST)

        if not respondents:
            for agent_type, agent_keywords in keywords.items():
                for keyword in agent_keywords:
                    if keyword in message_lower or keyword in message:
                        if agent_type not in respondents:
                            respondents.append(agent_type)
                        break

        if not respondents:
            if is_chinese:
                if "?" in message or "？" in message or "怎么" in message or "什么" in message or "大家" in message:
                    respondents = list(ParticipantType)[1:]  # All except HUMAN
            else:
                if "?" in message or "what do you" in message_lower or "thoughts" in message_lower:
                    respondents = list(ParticipantType)[1:]

        return respondents

    def _summarize_conversation(self, session: TribunalSession, last_n: int = 10) -> str:
        if not session.messages:
            return "No conversation yet." if not self._is_chinese(session) else "暂无对话。"

        recent = session.messages[-last_n:]
        lines = []
        for msg in recent:
            if self._is_chinese(session):
                speaker = self.AGENT_NAMES_ZH.get(msg.participant, msg.participant.value.upper())
                if msg.participant == ParticipantType.HUMAN:
                    speaker = "人类"
            else:
                speaker = msg.participant.value.upper()
                if msg.participant == ParticipantType.HUMAN:
                    speaker = "HUMAN"

            content = msg.content
            if msg.was_interrupted:
                content = f"[{'被打断' if self._is_chinese(session) else 'INTERRUPTED'}] {msg.interrupted_at}..."

            lines.append(f"{speaker}: {content[:200]}{'...' if len(content) > 200 else ''}")

        return "\n".join(lines)

    async def generate_agent_response(
        self,
        session_id: str,
        agent_type: ParticipantType,
        human_message: str,
        is_follow_up: bool = False
    ) -> str:
        session = self.sessions[session_id]
        if self._is_chinese(session):
            return await self._generate_agent_response_chinese(session, agent_type, human_message, is_follow_up)
        return await self._generate_agent_response_english(session, agent_type, human_message, is_follow_up)

    async def _generate_agent_response_english(
        self,
        session: TribunalSession,
        agent_type: ParticipantType,
        human_message: str,
        is_follow_up: bool = False
    ) -> str:
        agent = self.agents[agent_type]
        other_agents = [a for a in ParticipantType if a != agent_type and a != ParticipantType.HUMAN]
        other_agents_desc = ", ".join([self.AGENT_NAMES.get(a, a.value) for a in other_agents])
        agent_name = self.AGENT_NAMES[agent_type]

        already_said = self._get_already_said(session, is_chinese=False)
        conversation_history = self._summarize_conversation(session)
        own_analysis = session.analyses.get(agent_type.value, {})
        own_analysis_summary = own_analysis.get("raw_response", "No analysis yet.")[:1000]

        prompt = f"""You are {agent_name} in an interactive scientific tribunal.

IMPORTANT CONTEXT:
- You are ONE of 4 tribunal members: The Skeptic, The Statistician, The Methodologist, The Ethicist
- The other agents are: {other_agents_desc}
- A human researcher/reviewer is participating in this tribunal
- You should ONLY speak about your area of expertise
- Do NOT repeat points other agents have already made
- Keep responses conversational and focused (2-4 sentences unless asked for detail)
- If the question isn't for you, say "That's more [other agent]'s area" or stay silent

YOUR ANALYSIS OF THE PAPER:
{own_analysis_summary}

CONVERSATION SO FAR:
{conversation_history}

{f"OTHER AGENTS HAVE ALREADY RESPONDED TO THIS:{already_said}" if already_said else ""}

THE HUMAN JUST SAID:
"{human_message}"

Respond naturally as {agent_name}. If this question is clearly not for you, you can say something brief like "I'll defer to [relevant agent] on that" or simply not respond (return empty string).

Your response:"""

        messages = [{"role": "user", "content": prompt}]
        response = await agent.llm.ask(messages, system_msg=agent.system_prompt)
        session.agents_who_have_spoken_this_round.append(agent_type)

        return response.strip()

    async def _generate_agent_response_chinese(
        self,
        session: TribunalSession,
        agent_type: ParticipantType,
        human_message: str,
        is_follow_up: bool = False
    ) -> str:
        agent = self.agents[agent_type]
        other_agents = [a for a in ParticipantType if a != agent_type and a != ParticipantType.HUMAN]
        other_agents_desc = "、".join([self.AGENT_NAMES_ZH.get(a, a.value) for a in other_agents])
        agent_name = self.AGENT_NAMES_ZH[agent_type]

        already_said = self._get_already_said(session, is_chinese=True)
        conversation_history = self._summarize_conversation(session)
        own_analysis = session.analyses.get(agent_type.value, {})
        own_analysis_summary = own_analysis.get("raw_response", "暂无分析。")[:1000]

        prompt = f"""你是互动科学评审团中的{agent_name}。

重要背景：
- 你是4位评审团成员之一：怀疑论者、统计学家、方法论专家、伦理学家
- 其他评审专家是：{other_agents_desc}
- 一位人类研究者/评审员正在参与这个评审团
- 你应该只谈论你的专业领域
- 不要重复其他评审专家已经提出的观点
- 保持回应简洁且有针对性（2-4句话，除非要求详细说明）
- 如果问题不是针对你的，说"这更适合[其他评审专家]来回答"或保持沉默

你对论文的分析：
{own_analysis_summary}

到目前为止的对话：
{conversation_history}

{f"其他评审专家已经对此做出回应：{already_said}" if already_said else ""}

人类刚刚说：
"{human_message}"

作为{agent_name}自然地回应。如果这个问题明显不是针对你的，你可以简短地说"我把这个问题交给[相关评审专家]"或者不回应（返回空字符串）。

请用中文回复。

你的回应："""

        messages = [{"role": "user", "content": prompt}]
        response = await agent.llm.ask(messages, system_msg=agent.system_prompt_zh)
        session.agents_who_have_spoken_this_round.append(agent_type)

        return response.strip()

    def _get_already_said(self, session: TribunalSession, is_chinese: bool) -> str:
        already_said = ""
        for prev_agent in session.agents_who_have_spoken_this_round:
            if prev_agent in session.analyses:
                for msg in reversed(session.messages):
                    if msg.participant == prev_agent:
                        if is_chinese:
                            prev_agent_name = self.AGENT_NAMES_ZH.get(prev_agent, prev_agent.value)
                            already_said += f"\n{prev_agent_name}刚刚说：{msg.content[:300]}..."
                        else:
                            prev_agent_name = self.AGENT_NAMES.get(prev_agent, prev_agent.value)
                            already_said += f"\n{prev_agent_name} just said: {msg.content[:300]}..."
                        break
        return already_said

    async def process_human_message(
        self,
        session_id: str,
        message: str,
        interrupt_current: bool = False
    ) -> List[Dict[str, Any]]:
        session = self.sessions[session_id]
        if interrupt_current and session.current_speaker:
            if session.messages:
                last_msg = session.messages[-1]
                if last_msg.participant == session.current_speaker:
                    last_msg.was_interrupted = True
                    last_msg.interrupted_at = last_msg.content

            session.current_speaker = None
            session.pending_response = None
        session.agents_who_have_spoken_this_round = []
        import time
        human_msg = ConversationMessage(
            participant=ParticipantType.HUMAN,
            content=message,
            timestamp=time.time()
        )
        session.messages.append(human_msg)
        respondents = await self.determine_respondents(session_id, message)

        if not respondents:
            return []
        responses = []
        for agent_type in respondents:
            session.current_speaker = agent_type

            response = await self.generate_agent_response(
                session_id,
                agent_type,
                message,
                is_follow_up=len(responses) > 0
            )

            if response and response.strip():
                agent_msg = ConversationMessage(
                    participant=agent_type,
                    content=response,
                    timestamp=time.time()
                )
                session.messages.append(agent_msg)

                responses.append({
                    "agent": self._get_agent_name(agent_type, session),
                    "agent_key": agent_type.value,
                    "response": response
                })

        session.current_speaker = None
        return responses

    async def get_agent_opening_statements(
        self,
        session_id: str
    ) -> List[Dict[str, Any]]:
        session = self.sessions[session_id]
        if self._is_chinese(session):
            return await self._get_agent_opening_statements_chinese(session)
        return await self._get_agent_opening_statements_english(session)

    async def _get_agent_opening_statements_english(
        self,
        session: TribunalSession
    ) -> List[Dict[str, Any]]:
        import time

        async def generate_statement(agent_type: ParticipantType):
            agent = self.agents[agent_type]
            analysis = session.analyses.get(agent_type.value, {})
            severity = analysis.get("severity", "UNKNOWN")
            prompt = f"""Based on your analysis, give a 1-2 sentence opening statement. Be direct and punchy.

Severity: {severity}
Key findings: {analysis.get('raw_response', 'No analysis')[:800]}

Your opening statement (1-2 sentences only):"""

            messages = [{"role": "user", "content": prompt}]
            statement = await agent.llm.ask(messages, system_msg=agent.system_prompt)
            agent_name = self.AGENT_NAMES[agent_type]

            return {
                "agent_type": agent_type,
                "agent": agent_name,
                "agent_key": agent_type.value,
                "severity": severity,
                "statement": statement.strip()
            }

        agent_types = [
            ParticipantType.SKEPTIC,
            ParticipantType.STATISTICIAN,
            ParticipantType.METHODOLOGIST,
            ParticipantType.ETHICIST
        ]

        results = await asyncio.gather(
            *[generate_statement(at) for at in agent_types],
            return_exceptions=True
        )

        statements = []
        for result in results:
            if isinstance(result, Exception):
                continue

            statements.append({
                "agent": result["agent"],
                "agent_key": result["agent_key"],
                "severity": result["severity"],
                "statement": result["statement"]
            })
            session.messages.append(ConversationMessage(
                participant=result["agent_type"],
                content=result["statement"],
                timestamp=time.time()
            ))

        return statements

    async def _get_agent_opening_statements_chinese(
        self,
        session: TribunalSession
    ) -> List[Dict[str, Any]]:
        import time

        async def generate_statement(agent_type: ParticipantType):
            agent = self.agents[agent_type]
            analysis = session.analyses.get(agent_type.value, {})
            severity = analysis.get("severity", "UNKNOWN")

            severity_zh = {
                "FATAL_FLAW": "致命缺陷",
                "SERIOUS_CONCERN": "严重问题",
                "MINOR_ISSUE": "次要问题",
                "ACCEPTABLE": "可接受",
                "UNKNOWN": "未知"
            }.get(severity, severity)

            prompt = f"""根据你的分析，给出1-2句简短的开场陈述。要直接有力。

严重程度：{severity_zh}
主要发现：{analysis.get('raw_response', '暂无分析')[:800]}

你的开场陈述（只需1-2句话）："""

            messages = [{"role": "user", "content": prompt}]
            statement = await agent.llm.ask(messages, system_msg=agent.system_prompt_zh)
            agent_name = self.AGENT_NAMES_ZH[agent_type]

            return {
                "agent_type": agent_type,
                "agent": agent_name,
                "agent_key": agent_type.value,
                "severity": severity,
                "statement": statement.strip()
            }

        agent_types = [
            ParticipantType.SKEPTIC,
            ParticipantType.STATISTICIAN,
            ParticipantType.METHODOLOGIST,
            ParticipantType.ETHICIST
        ]

        results = await asyncio.gather(
            *[generate_statement(at) for at in agent_types],
            return_exceptions=True
        )

        statements = []
        for result in results:
            if isinstance(result, Exception):
                continue

            statements.append({
                "agent": result["agent"],
                "agent_key": result["agent_key"],
                "severity": result["severity"],
                "statement": result["statement"]
            })
            session.messages.append(ConversationMessage(
                participant=result["agent_type"],
                content=result["statement"],
                timestamp=time.time()
            ))

        return statements

    def is_verdict_request(self, message: str) -> bool:
        message_lower = message.lower()
        verdict_keywords_en = [
            "verdict", "final verdict", "give me the verdict",
            "what's the verdict", "your verdict", "the verdict",
            "final decision", "final ruling", "your ruling",
            "conclude", "wrap up", "final thoughts", "sum up",
            "summarize", "final score", "what's the score",
            "pass or fail", "thumbs up or down", "approve or reject",
            "ready for verdict", "make a decision", "give your decision"
        ]
        verdict_keywords_zh = [
            "判决", "最终判决", "给我判决",
            "最终决定", "最终裁决", "裁决",
            "总结", "结论", "最终意见",
            "评分", "得分", "通过还是不通过",
            "批准还是拒绝", "做出决定"
        ]
        return (any(kw in message_lower for kw in verdict_keywords_en) or
                any(kw in message for kw in verdict_keywords_zh))

    async def generate_verdict(self, session_id: str) -> Dict[str, Any]:
        session = self.sessions[session_id]
        if self._is_chinese(session):
            return await self._generate_verdict_chinese(session, session_id)
        return await self._generate_verdict_english(session, session_id)

    async def _generate_verdict_english(self, session: TribunalSession, session_id: str) -> Dict[str, Any]:
        analyses_summary = ""
        for agent_type in [ParticipantType.SKEPTIC, ParticipantType.STATISTICIAN,
                          ParticipantType.METHODOLOGIST, ParticipantType.ETHICIST]:
            analysis = session.analyses.get(agent_type.value, {})
            severity = analysis.get("severity", "UNKNOWN")
            summary = analysis.get("raw_response", "No analysis")[:500]
            agent_name = self.AGENT_NAMES[agent_type]
            analyses_summary += f"\n{agent_name} ({severity}):\n{summary}\n"

        conversation_summary = self._summarize_conversation(session, last_n=20)

        verdict_prompt = f"""You are the Chief Judge of a scientific paper review tribunal.

The four tribunal agents have completed their analysis:
{analyses_summary}

The discussion with the human:
{conversation_summary}

Based on ALL the evidence presented, generate a FINAL VERDICT.

Your verdict must include:
1. A clear PASS/FAIL/CONDITIONAL decision
2. A score from 0-100 (0 = completely invalid, 100 = exemplary science)
3. A 2-3 sentence summary of the key issues
4. Top 3 critical issues (if any)

Format your response EXACTLY as:
DECISION: [PASS/FAIL/CONDITIONAL]
SCORE: [0-100]
SUMMARY: [Your 2-3 sentence summary]
CRITICAL_ISSUES:
1. [Issue 1]
2. [Issue 2]
3. [Issue 3]

Your verdict:"""

        messages = [{"role": "user", "content": verdict_prompt}]
        verdict_response = await self.router.ask(
            messages,
            system_msg="You are an impartial scientific judge. Be firm but fair."
        )
        verdict = self._parse_verdict(verdict_response)
        session.verdict = verdict
        import time
        session.messages.append(ConversationMessage(
            participant=ParticipantType.HUMAN,
            content="[Verdict Requested]",
            timestamp=time.time()
        ))
        await self._store_verdict_to_backends(session_id, verdict, session)

        return verdict

    async def _generate_verdict_chinese(self, session: TribunalSession, session_id: str) -> Dict[str, Any]:
        analyses_summary = ""
        severity_zh = {
            "FATAL_FLAW": "致命缺陷",
            "SERIOUS_CONCERN": "严重问题",
            "MINOR_ISSUE": "次要问题",
            "ACCEPTABLE": "可接受",
            "UNKNOWN": "未知"
        }
        for agent_type in [ParticipantType.SKEPTIC, ParticipantType.STATISTICIAN,
                          ParticipantType.METHODOLOGIST, ParticipantType.ETHICIST]:
            analysis = session.analyses.get(agent_type.value, {})
            severity = analysis.get("severity", "UNKNOWN")
            severity_text = severity_zh.get(severity, severity)
            summary = analysis.get("raw_response", "暂无分析")[:500]
            agent_name = self.AGENT_NAMES_ZH[agent_type]
            analyses_summary += f"\n{agent_name}（{severity_text}）：\n{summary}\n"

        conversation_summary = self._summarize_conversation(session, last_n=20)

        verdict_prompt = f"""你是科学论文评审团的首席法官。

四位评审团评审专家已完成分析：
{analyses_summary}

与人类研究者的讨论：
{conversation_summary}

根据所有提交的证据，生成最终判决。

你的判决必须包括：
1. 明确的通过/不通过/有条件通过决定
2. 0-100的评分（0 = 完全无效，100 = 模范科学）
3. 2-3句关于关键问题的总结
4. 前3个关键问题（如有）

按以下格式回复：
决定：[通过/不通过/有条件通过]
评分：[0-100]
总结：[你的2-3句总结]
关键问题：
1. [问题1]
2. [问题2]
3. [问题3]

请用中文回复。

你的判决："""

        messages = [{"role": "user", "content": verdict_prompt}]
        verdict_response = await self.router.ask(
            messages,
            system_msg="你是公正的科学法官。要坚定但公平。请用中文回复。"
        )
        verdict = self._parse_verdict_chinese(verdict_response)
        session.verdict = verdict
        import time
        session.messages.append(ConversationMessage(
            participant=ParticipantType.HUMAN,
            content="[请求判决]",
            timestamp=time.time()
        ))
        await self._store_verdict_to_backends(session_id, verdict, session)

        return verdict

    async def _store_verdict_to_backends(
        self,
        session_id: str,
        verdict: Dict[str, Any],
        session: TribunalSession
    ) -> None:
        paper_title = session.paper_metadata.get("title", "Untitled Paper")
        is_chinese = self._is_chinese(session)
        debate_rounds = []
        current_round = {"round_number": 1, "statements": []}
        human_count = 0
        human_messages = []

        for msg in session.messages:
            if msg.participant == ParticipantType.HUMAN:
                human_count += 1
                current_round["statements"].append({
                    "agent": "你" if is_chinese else "You",
                    "text": msg.content,
                    "intensity": 5,
                    "is_user": True,
                    "was_interrupted": False
                })
                human_messages.append({
                    "text": msg.content,
                    "timestamp": datetime.fromtimestamp(msg.timestamp).isoformat() if msg.timestamp else None
                })
                if current_round["statements"]:
                    debate_rounds.append(current_round)
                    current_round = {"round_number": len(debate_rounds) + 1, "statements": []}
            else:
                agent_name = self.AGENT_NAMES_ZH.get(msg.participant, msg.participant.value) if is_chinese else self.AGENT_NAMES.get(msg.participant, msg.participant.value)
                current_round["statements"].append({
                    "agent": agent_name,
                    "text": msg.content,
                    "intensity": 7,
                    "is_user": False,
                    "was_interrupted": msg.was_interrupted
                })
        if current_round["statements"]:
            debate_rounds.append(current_round)

        verdict_data = {
            "tribunal_id": session_id,
            "session_id": session_id,
            "paper_title": paper_title,
            "verdict_score": verdict.get("score", 50),
            "decision": verdict.get("decision", "UNKNOWN"),
            "verdict": {
                "summary": verdict.get("summary", ""),
                "recommendation": f"Decision: {verdict.get('decision', 'UNKNOWN')}",
            },
            "agent_analyses": {
                agent_key: {
                    "agent": self.AGENT_NAMES_ZH.get(ParticipantType(agent_key), agent_key) if is_chinese else self.AGENT_NAMES.get(ParticipantType(agent_key), agent_key),
                    "raw_response": analysis.get("raw_response", ""),
                    "concerns": analysis.get("concerns", []),
                    "severity": analysis.get("severity", "UNKNOWN"),
                    "confidence": analysis.get("confidence", 50),
                }
                for agent_key, analysis in session.analyses.items()
            },
            "debate_rounds": debate_rounds,
            "critical_issues": [
                {
                    "title": issue,
                    "severity": "SERIOUS_CONCERN",
                    "agent": "评审团" if is_chinese else "Tribunal",
                    "description": issue
                }
                for issue in verdict.get("critical_issues", [])
            ],
            "critical_issues_count": len(verdict.get("critical_issues", [])),
            "total_messages": len(session.messages),
            "human_interactions": human_count,
            "human_messages": human_messages,
        }

        try:
            from ..storage.local_storage import LocalVerdictStorage
            local_storage = LocalVerdictStorage()
            local_key = await local_storage.store_verdict(verdict_data, session_id)
            logger.info(f"Full verdict stored to local storage: {local_key}")
            verdict["local_stored"] = True
        except Exception as e:
            logger.warning(f"Failed to store verdict to local storage: {e}")
            verdict["local_stored"] = False
        try:
            from ..memory.tribunal_memory import TribunalMemory
            memory = TribunalMemory()
            mem0_result = await memory.store_verdict_memory(verdict_data, paper_title)
            logger.info(f"Verdict stored to Mem0: {mem0_result}")
            verdict["mem0_stored"] = True
        except Exception as e:
            logger.warning(f"Failed to store verdict to Mem0: {e}")
            verdict["mem0_stored"] = False
            verdict["mem0_error"] = str(e)
        try:
            from ..neo.neo_client import store_verdict
            neo_tx_hash = await store_verdict(
                paper_content=session.paper_text[:5000],
                verdict_score=verdict.get("score", 50),
                aioz_verdict_key="",
                aioz_audio_key="",
                tribunal_id=session_id
            )
            logger.info(f"Verdict stored to Neo blockchain: {neo_tx_hash}")
            verdict["neo_tx_hash"] = neo_tx_hash
        except Exception as e:
            logger.warning(f"Failed to store verdict to Neo: {e}")
            verdict["neo_tx_hash"] = None
            verdict["neo_error"] = str(e)

    def _parse_verdict(self, response: str) -> Dict[str, Any]:
        lines = response.strip().split("\n")
        verdict = {
            "decision": "UNKNOWN",
            "score": 50,
            "summary": "",
            "critical_issues": []
        }

        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith("DECISION:"):
                verdict["decision"] = line.replace("DECISION:", "").strip()
            elif line.startswith("SCORE:"):
                try:
                    score_str = line.replace("SCORE:", "").strip()
                    verdict["score"] = int(score_str.split()[0])
                except (ValueError, IndexError):
                    verdict["score"] = 50
            elif line.startswith("SUMMARY:"):
                verdict["summary"] = line.replace("SUMMARY:", "").strip()
                current_section = "summary"
            elif line.startswith("CRITICAL_ISSUES:"):
                current_section = "issues"
            elif current_section == "issues" and line:
                issue = line.lstrip("0123456789.-) ").strip()
                if issue:
                    verdict["critical_issues"].append(issue)
            elif current_section == "summary" and line and not line.startswith("CRITICAL"):
                verdict["summary"] += " " + line

        return verdict

    def _parse_verdict_chinese(self, response: str) -> Dict[str, Any]:
        lines = response.strip().split("\n")
        verdict = {
            "decision": "UNKNOWN",
            "score": 50,
            "summary": "",
            "critical_issues": []
        }

        decision_map = {
            "通过": "PASS",
            "不通过": "FAIL",
            "有条件通过": "CONDITIONAL"
        }

        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith("决定：") or line.startswith("决定:"):
                decision_zh = line.replace("决定：", "").replace("决定:", "").strip()
                verdict["decision"] = decision_map.get(decision_zh, decision_zh)
            elif line.startswith("评分：") or line.startswith("评分:"):
                try:
                    score_str = line.replace("评分：", "").replace("评分:", "").strip()
                    verdict["score"] = int(score_str.split()[0])
                except (ValueError, IndexError):
                    verdict["score"] = 50
            elif line.startswith("总结：") or line.startswith("总结:"):
                verdict["summary"] = line.replace("总结：", "").replace("总结:", "").strip()
                current_section = "summary"
            elif line.startswith("关键问题：") or line.startswith("关键问题:"):
                current_section = "issues"
            elif current_section == "issues" and line:
                issue = line.lstrip("0123456789.-）) 、").strip()
                if issue:
                    verdict["critical_issues"].append(issue)
            elif current_section == "summary" and line and not line.startswith("关键"):
                verdict["summary"] += " " + line

        return verdict

    def get_session_state(self, session_id: str) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            return None

        is_chinese = self._is_chinese(session) if session else False

        return {
            "session_id": session_id,
            "paper_title": session.paper_metadata.get("title", "Untitled"),
            "analyses": {
                k: {
                    "severity": v.get("severity", "UNKNOWN"),
                    "agent": self.AGENT_NAMES_ZH.get(ParticipantType(k), k) if is_chinese else self.AGENT_NAMES.get(ParticipantType(k), k)
                }
                for k, v in session.analyses.items()
            },
            "messages": [
                {
                    "participant": msg.participant.value,
                    "content": msg.content,
                    "was_interrupted": msg.was_interrupted
                }
                for msg in session.messages
            ],
            "current_speaker": session.current_speaker.value if session.current_speaker else None,
            "verdict": session.verdict
        }


# Global orchestrator instance
orchestrator = TribunalOrchestrator()
