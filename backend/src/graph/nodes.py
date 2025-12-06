import asyncio
from typing import Dict, Any

from .state import TribunalState
from ..agents import SkepticAgent, StatisticianAgent, MethodologistAgent, EthicistAgent


async def parse_paper_node(state: TribunalState) -> Dict[str, Any]:
    paper_text = state["paper_text"]
    metadata = state.get("paper_metadata", {})

    if not metadata.get("title"):
        lines = paper_text.strip().split('\n')
        metadata["title"] = lines[0] if lines else "Untitled Paper"

    return {
        "paper_metadata": metadata,
        "current_round": 0,
        "debate_rounds": [],
        "audio_segments": [],
        "critical_issues": [],
    }


async def skeptic_analysis_node(state: TribunalState) -> Dict[str, Any]:
    agent = SkepticAgent()
    analysis = await agent.analyze_paper(state["paper_text"], state["paper_metadata"])
    return {"skeptic_analysis": analysis}


async def statistician_analysis_node(state: TribunalState) -> Dict[str, Any]:
    agent = StatisticianAgent()
    analysis = await agent.analyze_paper(state["paper_text"], state["paper_metadata"])
    return {"statistician_analysis": analysis}


async def methodologist_analysis_node(state: TribunalState) -> Dict[str, Any]:
    agent = MethodologistAgent()
    analysis = await agent.analyze_paper(state["paper_text"], state["paper_metadata"])
    return {"methodologist_analysis": analysis}


async def ethicist_analysis_node(state: TribunalState) -> Dict[str, Any]:
    agent = EthicistAgent()
    analysis = await agent.analyze_paper(state["paper_text"], state["paper_metadata"])
    return {"ethicist_analysis": analysis}


async def debate_round_node(state: TribunalState) -> Dict[str, Any]:
    current_round = state.get("current_round", 0) + 1

    analyses = {
        "skeptic": state.get("skeptic_analysis", {}).get("raw_response", ""),
        "statistician": state.get("statistician_analysis", {}).get("raw_response", ""),
        "methodologist": state.get("methodologist_analysis", {}).get("raw_response", ""),
        "ethicist": state.get("ethicist_analysis", {}).get("raw_response", ""),
    }

    previous_rounds = state.get("debate_rounds", [])

    agents = [
        ("skeptic", SkepticAgent()),
        ("statistician", StatisticianAgent()),
        ("methodologist", MethodologistAgent()),
        ("ethicist", EthicistAgent()),
    ]

    round_statements = []
    for agent_key, agent in agents:
        own_analysis = state.get(f"{agent_key}_analysis", {})
        response = await agent.respond_to_others(
            own_analysis,
            {k: v for k, v in analyses.items() if k != agent_key},
            previous_rounds
        )
        round_statements.append({
            "agent": agent.role_name,
            "text": response,
            "round": current_round
        })

    new_debate_rounds = previous_rounds + [round_statements]

    return {
        "current_round": current_round,
        "debate_rounds": new_debate_rounds,
    }


async def synthesize_verdict_node(state: TribunalState) -> Dict[str, Any]:
    severities = []
    all_concerns = []

    for agent_key in ["skeptic", "statistician", "methodologist", "ethicist"]:
        analysis = state.get(f"{agent_key}_analysis", {})
        if analysis:
            severities.append(analysis.get("severity", "UNKNOWN"))
            all_concerns.extend(analysis.get("concerns", []))

    severity_scores = {
        "FATAL_FLAW": 0,
        "SERIOUS_CONCERN": 40,
        "MINOR_ISSUE": 70,
        "ACCEPTABLE": 90,
        "UNKNOWN": 50,
    }

    if severities:
        avg_score = sum(severity_scores.get(s, 50) for s in severities) / len(severities)
    else:
        avg_score = 50

    if avg_score < 25:
        overall_verdict = "REJECT - Critical flaws identified"
    elif avg_score < 50:
        overall_verdict = "MAJOR REVISION - Significant concerns require addressing"
    elif avg_score < 75:
        overall_verdict = "MINOR REVISION - Some issues to address"
    else:
        overall_verdict = "ACCEPT - Paper meets scientific standards"

    critical_issues = [
        {
            "title": c.get("title", "Unnamed concern"),
            "severity": c.get("severity", "UNKNOWN"),
            "evidence": c.get("evidence", ""),
        }
        for c in all_concerns
        if c.get("severity") in ["FATAL_FLAW", "SERIOUS_CONCERN"]
    ]

    verdict = {
        "summary": overall_verdict,
        "score": int(avg_score),
        "severities": severities,
        "total_concerns": len(all_concerns),
        "critical_concerns": len(critical_issues),
        "debate_rounds": len(state.get("debate_rounds", [])),
    }

    return {
        "verdict": verdict,
        "verdict_score": int(avg_score),
        "critical_issues": critical_issues[:10],
    }


async def generate_audio_node(state: TribunalState) -> Dict[str, Any]:
    from ..tools.elevenlabs_voice import TribunalVoiceSynthesizer

    synthesizer = TribunalVoiceSynthesizer()

    paper_title = state.get("paper_metadata", {}).get("title", "this paper")
    intro = f"Welcome to the Adversarial Science Tribunal. Today we are reviewing {paper_title}. Let the debate begin."

    verdict = state.get("verdict", {})
    verdict_text = f"The tribunal has reached a verdict. With a score of {verdict.get('score', 0)} out of 100, the decision is: {verdict.get('summary', 'No verdict')}."

    try:
        audio = await synthesizer.synthesize_full_tribunal(
            intro=intro,
            debate_rounds=state.get("debate_rounds", []),
            verdict=verdict_text
        )
        return {"audio_segments": [audio]}
    except Exception as e:
        print(f"audio failed: {e}")
        return {"audio_segments": []}


async def store_verdict_node(state: TribunalState) -> Dict[str, Any]:
    import uuid
    import hashlib
    from ..storage.aioz_storage import AIOZVerdictStorage
    from ..memory.tribunal_memory import TribunalMemory

    tribunal_id = str(uuid.uuid4())

    verdict_data = {
        "tribunal_id": tribunal_id,
        "paper_metadata": state.get("paper_metadata", {}),
        "verdict": state.get("verdict", {}),
        "verdict_score": state.get("verdict_score", 0),
        "critical_issues": state.get("critical_issues", []),
        "debate_rounds": len(state.get("debate_rounds", [])),
        "analyses": {
            "skeptic": state.get("skeptic_analysis", {}),
            "statistician": state.get("statistician_analysis", {}),
            "methodologist": state.get("methodologist_analysis", {}),
            "ethicist": state.get("ethicist_analysis", {}),
        }
    }

    result = {
        "neo_tx_hash": None,
        "aioz_verdict_key": None,
        "aioz_audio_key": None,
    }

    try:
        storage = AIOZVerdictStorage()
        verdict_key = await storage.store_verdict(verdict_data, tribunal_id)
        result["aioz_verdict_key"] = verdict_key

        audio_segments = state.get("audio_segments", [])
        if audio_segments and audio_segments[0]:
            audio_key = await storage.store_audio(audio_segments[0], tribunal_id)
            result["aioz_audio_key"] = audio_key
    except Exception as e:
        print(f"aioz failed: {e}")

    try:
        memory = TribunalMemory()
        paper_title = state.get("paper_metadata", {}).get("title", "Unknown Paper")
        await memory.store_verdict_memory(verdict_data, paper_title)
    except Exception as e:
        print(f"mem0 failed: {e}")

    paper_hash = hashlib.sha256(state["paper_text"].encode()).hexdigest()
    result["neo_tx_hash"] = f"0x{paper_hash[:64]}"

    return result
