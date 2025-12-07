"""
Tribunal Orchestrator - Manages multi-agent conversation with human participant.

Key responsibilities:
1. Route messages to appropriate agent(s)
2. Manage turn-taking and interruptions
3. Maintain shared conversation context
4. Handle agent-to-agent awareness (no cross-talk)
"""

import asyncio
import logging
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
    """A single message in the tribunal conversation."""
    participant: ParticipantType
    content: str
    timestamp: float
    addressed_to: Optional[List[ParticipantType]] = None  # None = all
    was_interrupted: bool = False
    interrupted_at: Optional[str] = None  # Partial content before interruption


@dataclass
class TribunalSession:
    """State for an interactive tribunal session."""
    session_id: str
    paper_text: str
    paper_metadata: Dict[str, Any]

    # Agent analyses (populated after initial analysis)
    analyses: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    # Conversation history
    messages: List[ConversationMessage] = field(default_factory=list)

    # Current speaker (for interruption handling)
    current_speaker: Optional[ParticipantType] = None
    pending_response: Optional[str] = None  # Response being generated

    # Turn state
    agents_who_have_spoken_this_round: List[ParticipantType] = field(default_factory=list)

    # Verdict (populated at end)
    verdict: Optional[Dict[str, Any]] = None


class TribunalOrchestrator:
    """
    Orchestrates multi-agent tribunal with human participation.

    Design principles:
    1. Each agent knows about all other agents and the human
    2. Agents only speak when addressed OR when they have relevant expertise
    3. Human can interrupt at any time
    4. Context is shared - all agents see the full conversation
    5. Agents don't "talk over" each other - orchestrator manages turns
    """

    AGENT_NAMES = {
        ParticipantType.SKEPTIC: "The Skeptic",
        ParticipantType.STATISTICIAN: "The Statistician",
        ParticipantType.METHODOLOGIST: "The Methodologist",
        ParticipantType.ETHICIST: "The Ethicist",
    }

    AGENT_KEYWORDS = {
        ParticipantType.SKEPTIC: ["skeptic", "alternative", "confound", "bias", "causation"],
        ParticipantType.STATISTICIAN: ["statistic", "p-value", "sample", "power", "significance", "effect size", "confidence"],
        ParticipantType.METHODOLOGIST: ["method", "design", "control", "blind", "randomiz", "protocol", "replicat"],
        ParticipantType.ETHICIST: ["ethic", "conflict", "funding", "consent", "privacy", "bias", "disclosure"],
    }

    def __init__(self):
        # Initialize agents
        self.agents = {
            ParticipantType.SKEPTIC: SkepticAgent(),
            ParticipantType.STATISTICIAN: StatisticianAgent(),
            ParticipantType.METHODOLOGIST: MethodologistAgent(),
            ParticipantType.ETHICIST: EthicistAgent(),
        }

        # Router LLM for determining which agent(s) should respond
        self.router = ChatBot(
            model_name="claude-sonnet-4-20250514",
            llm_provider="anthropic",
            temperature=0.1  # Low temperature for consistent routing
        )

        # Sessions
        self.sessions: Dict[str, TribunalSession] = {}

    def create_session(
        self,
        session_id: str,
        paper_text: str,
        paper_metadata: Dict[str, Any]
    ) -> TribunalSession:
        """Create a new interactive tribunal session."""
        session = TribunalSession(
            session_id=session_id,
            paper_text=paper_text,
            paper_metadata=paper_metadata
        )
        self.sessions[session_id] = session
        return session

    async def run_initial_analysis(self, session_id: str) -> Dict[str, Any]:
        """
        Run initial parallel analysis by all 4 agents.
        This happens before the interactive phase.
        """
        session = self.sessions[session_id]

        # Run all analyses in parallel
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

        # Store analyses
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
        """
        Determine which agent(s) should respond to a human message.

        Returns list of agents who should respond, in order.
        """
        session = self.sessions[session_id]

        # Build context for router
        conversation_summary = self._summarize_conversation(session)

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

        # Parse response
        try:
            import json
            # Extract JSON from response
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]

            agent_names = json.loads(response)

            # Convert to ParticipantType
            name_to_type = {
                "SKEPTIC": ParticipantType.SKEPTIC,
                "STATISTICIAN": ParticipantType.STATISTICIAN,
                "METHODOLOGIST": ParticipantType.METHODOLOGIST,
                "ETHICIST": ParticipantType.ETHICIST,
            }

            return [name_to_type[name.upper()] for name in agent_names if name.upper() in name_to_type]

        except Exception as e:
            # Fallback: keyword-based routing
            return self._keyword_based_routing(human_message)

    def _keyword_based_routing(self, message: str) -> List[ParticipantType]:
        """Fallback keyword-based routing."""
        message_lower = message.lower()
        respondents = []

        # Check for direct addressing
        if "skeptic" in message_lower:
            respondents.append(ParticipantType.SKEPTIC)
        if "statistic" in message_lower:
            respondents.append(ParticipantType.STATISTICIAN)
        if "method" in message_lower:
            respondents.append(ParticipantType.METHODOLOGIST)
        if "ethic" in message_lower:
            respondents.append(ParticipantType.ETHICIST)

        # If no direct addressing, check expertise keywords
        if not respondents:
            for agent_type, keywords in self.AGENT_KEYWORDS.items():
                for keyword in keywords:
                    if keyword in message_lower:
                        if agent_type not in respondents:
                            respondents.append(agent_type)
                        break

        # If still no match, default to all agents for general questions
        if not respondents and ("?" in message or "what do you" in message_lower or "thoughts" in message_lower):
            respondents = [
                ParticipantType.SKEPTIC,
                ParticipantType.STATISTICIAN,
                ParticipantType.METHODOLOGIST,
                ParticipantType.ETHICIST
            ]

        return respondents

    def _summarize_conversation(self, session: TribunalSession, last_n: int = 10) -> str:
        """Summarize recent conversation for context."""
        if not session.messages:
            return "No conversation yet."

        recent = session.messages[-last_n:]
        lines = []
        for msg in recent:
            speaker = msg.participant.value.upper()
            if msg.participant == ParticipantType.HUMAN:
                speaker = "HUMAN"

            content = msg.content
            if msg.was_interrupted:
                content = f"[INTERRUPTED] {msg.interrupted_at}..."

            lines.append(f"{speaker}: {content[:200]}{'...' if len(content) > 200 else ''}")

        return "\n".join(lines)

    async def generate_agent_response(
        self,
        session_id: str,
        agent_type: ParticipantType,
        human_message: str,
        is_follow_up: bool = False
    ) -> str:
        """
        Generate a response from a specific agent.

        The agent is aware of:
        - The full conversation history
        - Other agents' analyses
        - That the human might be addressing them specifically or generally
        - That they should not repeat what other agents have said
        """
        session = self.sessions[session_id]
        agent = self.agents[agent_type]

        # Build context-aware prompt
        other_agents = [
            a for a in ParticipantType
            if a != agent_type and a != ParticipantType.HUMAN
        ]
        other_agents_desc = ", ".join([self.AGENT_NAMES[a] for a in other_agents])

        # What other agents said in this response round
        agents_already_responded = session.agents_who_have_spoken_this_round
        already_said = ""
        for prev_agent in agents_already_responded:
            if prev_agent in session.analyses:
                for msg in reversed(session.messages):
                    if msg.participant == prev_agent:
                        already_said += f"\n{self.AGENT_NAMES[prev_agent]} just said: {msg.content[:300]}..."
                        break

        conversation_history = self._summarize_conversation(session)

        # Build the agent's own analysis summary
        own_analysis = session.analyses.get(agent_type.value, {})
        own_analysis_summary = own_analysis.get("raw_response", "No analysis yet.")[:1000]

        prompt = f"""You are {agent.role_name} in an interactive scientific tribunal.

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

Respond naturally as {agent.role_name}. If this question is clearly not for you, you can say something brief like "I'll defer to [relevant agent] on that" or simply not respond (return empty string).

Your response:"""

        messages = [{"role": "user", "content": prompt}]
        response = await agent.llm.ask(messages, system_msg=agent.system_prompt)

        # Track that this agent has spoken
        session.agents_who_have_spoken_this_round.append(agent_type)

        return response.strip()

    async def process_human_message(
        self,
        session_id: str,
        message: str,
        interrupt_current: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Process a message from the human participant.

        Args:
            session_id: The tribunal session ID
            message: What the human said
            interrupt_current: If True, interrupts any agent currently speaking

        Returns:
            List of agent responses in order
        """
        session = self.sessions[session_id]

        # Handle interruption
        if interrupt_current and session.current_speaker:
            # Mark the interrupted message
            if session.messages:
                last_msg = session.messages[-1]
                if last_msg.participant == session.current_speaker:
                    last_msg.was_interrupted = True
                    last_msg.interrupted_at = last_msg.content

            session.current_speaker = None
            session.pending_response = None

        # Reset round tracking
        session.agents_who_have_spoken_this_round = []

        # Record human message
        import time
        human_msg = ConversationMessage(
            participant=ParticipantType.HUMAN,
            content=message,
            timestamp=time.time()
        )
        session.messages.append(human_msg)

        # Determine which agents should respond
        respondents = await self.determine_respondents(session_id, message)

        if not respondents:
            return []

        # Generate responses from each agent (in order, not parallel)
        # This ensures later agents can reference earlier responses
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
                # Record agent message
                agent_msg = ConversationMessage(
                    participant=agent_type,
                    content=response,
                    timestamp=time.time()
                )
                session.messages.append(agent_msg)

                responses.append({
                    "agent": self.AGENT_NAMES[agent_type],
                    "agent_key": agent_type.value,
                    "response": response
                })

        session.current_speaker = None
        return responses

    async def get_agent_opening_statements(
        self,
        session_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get brief opening statements from each agent after initial analysis.
        These are short summaries of their key findings.
        Runs in parallel for speed.
        """
        session = self.sessions[session_id]
        import time

        async def generate_statement(agent_type: ParticipantType):
            agent = self.agents[agent_type]
            analysis = session.analyses.get(agent_type.value, {})
            severity = analysis.get("severity", "UNKNOWN")

            # Generate a brief opening statement
            prompt = f"""Based on your analysis, give a 1-2 sentence opening statement. Be direct and punchy.

Severity: {severity}
Key findings: {analysis.get('raw_response', 'No analysis')[:800]}

Your opening statement (1-2 sentences only):"""

            messages = [{"role": "user", "content": prompt}]
            statement = await agent.llm.ask(messages, system_msg=agent.system_prompt)

            return {
                "agent_type": agent_type,
                "agent": agent.role_name,
                "agent_key": agent_type.value,
                "severity": severity,
                "statement": statement.strip()
            }

        # Run all 4 opening statements in parallel
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

            # Record in conversation
            session.messages.append(ConversationMessage(
                participant=result["agent_type"],
                content=result["statement"],
                timestamp=time.time()
            ))

        return statements

    def is_verdict_request(self, message: str) -> bool:
        """Check if the user is asking for a verdict."""
        message_lower = message.lower()
        verdict_keywords = [
            "verdict", "final verdict", "give me the verdict",
            "what's the verdict", "your verdict", "the verdict",
            "final decision", "final ruling", "your ruling",
            "conclude", "wrap up", "final thoughts", "sum up",
            "summarize", "final score", "what's the score",
            "pass or fail", "thumbs up or down", "approve or reject",
            "ready for verdict", "make a decision", "give your decision"
        ]
        return any(kw in message_lower for kw in verdict_keywords)

    async def generate_verdict(self, session_id: str) -> Dict[str, Any]:
        """Generate a final verdict for the tribunal session."""
        session = self.sessions[session_id]

        # Build context from all analyses and conversation
        analyses_summary = ""
        for agent_type in [ParticipantType.SKEPTIC, ParticipantType.STATISTICIAN,
                          ParticipantType.METHODOLOGIST, ParticipantType.ETHICIST]:
            analysis = session.analyses.get(agent_type.value, {})
            severity = analysis.get("severity", "UNKNOWN")
            summary = analysis.get("raw_response", "No analysis")[:500]
            analyses_summary += f"\n{self.AGENT_NAMES[agent_type]} ({severity}):\n{summary}\n"

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

        # Parse the verdict
        verdict = self._parse_verdict(verdict_response)

        # Store verdict in session
        session.verdict = verdict

        # Record in conversation
        import time
        session.messages.append(ConversationMessage(
            participant=ParticipantType.HUMAN,
            content="[Verdict Requested]",
            timestamp=time.time()
        ))

        # Store to Mem0 (long-term memory) and Neo (blockchain)
        await self._store_verdict_to_backends(session_id, verdict, session)

        return verdict

    async def _store_verdict_to_backends(
        self,
        session_id: str,
        verdict: Dict[str, Any],
        session: TribunalSession
    ) -> None:
        """Store verdict to Mem0 and Neo blockchain (best-effort, non-blocking)."""
        paper_title = session.paper_metadata.get("title", "Untitled Paper")

        # Build full verdict data for storage
        verdict_data = {
            "tribunal_id": session_id,
            "paper_title": paper_title,
            "verdict_score": verdict.get("score", 50),
            "decision": verdict.get("decision", "UNKNOWN"),
            "verdict": verdict,
            "critical_issues": [
                {"title": issue, "severity": "CONCERN"}
                for issue in verdict.get("critical_issues", [])
            ],
            "debate_rounds": len([m for m in session.messages if m.participant == ParticipantType.HUMAN]),
        }

        # Store to Mem0 (best-effort)
        try:
            from ..memory.tribunal_memory import TribunalMemory
            memory = TribunalMemory()
            mem0_result = await memory.store_verdict_memory(verdict_data, paper_title)
            logger.info(f"✅ Verdict stored to Mem0: {mem0_result}")
            verdict["mem0_stored"] = True
        except Exception as e:
            logger.warning(f"⚠️ Failed to store verdict to Mem0: {e}")
            verdict["mem0_stored"] = False
            verdict["mem0_error"] = str(e)

        # Store to Neo blockchain (best-effort)
        try:
            from ..neo.neo_client import store_verdict
            neo_tx_hash = await store_verdict(
                paper_content=session.paper_text[:5000],  # Limit content for hashing
                verdict_score=verdict.get("score", 50),
                aioz_verdict_key="",  # No AIOZ for now
                aioz_audio_key="",
                tribunal_id=session_id
            )
            logger.info(f"✅ Verdict stored to Neo blockchain: {neo_tx_hash}")
            verdict["neo_tx_hash"] = neo_tx_hash
        except Exception as e:
            logger.warning(f"⚠️ Failed to store verdict to Neo: {e}")
            verdict["neo_tx_hash"] = None
            verdict["neo_error"] = str(e)

    def _parse_verdict(self, response: str) -> Dict[str, Any]:
        """Parse the verdict response into structured format."""
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
                # Remove numbering like "1. " or "- "
                issue = line.lstrip("0123456789.-) ").strip()
                if issue:
                    verdict["critical_issues"].append(issue)
            elif current_section == "summary" and line and not line.startswith("CRITICAL"):
                verdict["summary"] += " " + line

        return verdict

    def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Get the current state of a session for the frontend."""
        session = self.sessions.get(session_id)
        if not session:
            return None

        return {
            "session_id": session_id,
            "paper_title": session.paper_metadata.get("title", "Untitled"),
            "analyses": {
                k: {
                    "severity": v.get("severity", "UNKNOWN"),
                    "agent": self.AGENT_NAMES.get(ParticipantType(k), k)
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
