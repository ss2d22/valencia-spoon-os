from typing import TypedDict, Optional, List, Dict, Any


class TribunalState(TypedDict):
    paper_text: str
    paper_metadata: Dict[str, Any]
    skeptic_analysis: Optional[Dict[str, Any]]
    statistician_analysis: Optional[Dict[str, Any]]
    methodologist_analysis: Optional[Dict[str, Any]]
    ethicist_analysis: Optional[Dict[str, Any]]
    debate_rounds: List[Dict[str, Any]]
    current_round: int
    audio_segments: List[bytes]
    verdict: Optional[Dict[str, Any]]
    verdict_score: int
    critical_issues: List[Dict[str, Any]]
    neo_tx_hash: Optional[str]
    aioz_verdict_key: Optional[str]
    aioz_audio_key: Optional[str]
