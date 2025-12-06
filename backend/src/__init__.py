from .graph import get_compiled_graph, TribunalState
from .agents import (
    SkepticAgent,
    StatisticianAgent,
    MethodologistAgent,
    EthicistAgent,
)

__version__ = "1.0.0"

__all__ = [
    "get_compiled_graph",
    "TribunalState",
    "SkepticAgent",
    "StatisticianAgent",
    "MethodologistAgent",
    "EthicistAgent",
]
