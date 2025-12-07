from spoon_ai.graph import StateGraph, END
from spoon_ai.graph.builder import (
    DeclarativeGraphBuilder,
    GraphTemplate,
    NodeSpec,
    EdgeSpec,
    ParallelGroupSpec,
)
from spoon_ai.graph.config import GraphConfig, ParallelGroupConfig

from .state import TribunalState
from .nodes import (
    parse_paper_node,
    parallel_analysis_node,
    skeptic_analysis_node,
    statistician_analysis_node,
    methodologist_analysis_node,
    ethicist_analysis_node,
    debate_round_node,
    debate_rounds_node,
    synthesize_verdict_node,
    generate_audio_node,
    store_verdict_node,
)


def route_debate(state: TribunalState) -> str:
    current_round = state.get("current_round", 0)
    print(f"[DEBUG] route_debate: current_round={current_round}")
    if current_round < 3:
        print(f"[DEBUG] route_debate: returning continue_debate")
        return "continue_debate"
    print(f"[DEBUG] route_debate: returning to_verdict")
    return "to_verdict"


def build_tribunal_graph() -> StateGraph:
    graph = StateGraph(TribunalState)

    graph.add_node("parse_paper", parse_paper_node)
    graph.add_node("skeptic_analysis", skeptic_analysis_node)
    graph.add_node("statistician_analysis", statistician_analysis_node)
    graph.add_node("methodologist_analysis", methodologist_analysis_node)
    graph.add_node("ethicist_analysis", ethicist_analysis_node)
    graph.add_node("debate_round", debate_round_node)
    graph.add_node("synthesize_verdict", synthesize_verdict_node)
    graph.add_node("generate_audio", generate_audio_node)
    graph.add_node("store_verdict", store_verdict_node)

    graph.set_entry_point("parse_paper")

    graph.add_edge("parse_paper", "skeptic_analysis")
    graph.add_edge("parse_paper", "statistician_analysis")
    graph.add_edge("parse_paper", "methodologist_analysis")
    graph.add_edge("parse_paper", "ethicist_analysis")

    graph.add_edge("skeptic_analysis", "debate_round")
    graph.add_edge("statistician_analysis", "debate_round")
    graph.add_edge("methodologist_analysis", "debate_round")
    graph.add_edge("ethicist_analysis", "debate_round")

    graph.add_conditional_edges(
        "debate_round",
        route_debate,
        {
            "continue_debate": "debate_round",
            "to_verdict": "synthesize_verdict",
        }
    )

    graph.add_edge("synthesize_verdict", "generate_audio")
    graph.add_edge("generate_audio", "store_verdict")
    graph.add_edge("store_verdict", END)

    return graph


def build_tribunal_graph_declarative() -> StateGraph:
    nodes = [
        NodeSpec("parse_paper", parse_paper_node),
        NodeSpec("skeptic_analysis", skeptic_analysis_node, parallel_group="analysis"),
        NodeSpec("statistician_analysis", statistician_analysis_node, parallel_group="analysis"),
        NodeSpec("methodologist_analysis", methodologist_analysis_node, parallel_group="analysis"),
        NodeSpec("ethicist_analysis", ethicist_analysis_node, parallel_group="analysis"),
        NodeSpec("debate_round", debate_round_node),
        NodeSpec("synthesize_verdict", synthesize_verdict_node),
        NodeSpec("generate_audio", generate_audio_node),
        NodeSpec("store_verdict", store_verdict_node),
    ]

    edges = [
        EdgeSpec("parse_paper", "skeptic_analysis"),
        EdgeSpec("parse_paper", "statistician_analysis"),
        EdgeSpec("parse_paper", "methodologist_analysis"),
        EdgeSpec("parse_paper", "ethicist_analysis"),
        EdgeSpec("skeptic_analysis", "debate_round"),
        EdgeSpec("statistician_analysis", "debate_round"),
        EdgeSpec("methodologist_analysis", "debate_round"),
        EdgeSpec("ethicist_analysis", "debate_round"),
        EdgeSpec("synthesize_verdict", "generate_audio"),
        EdgeSpec("generate_audio", "store_verdict"),
        EdgeSpec("store_verdict", END),
    ]

    parallel_groups = [
        ParallelGroupSpec(
            name="analysis",
            nodes=[
                "skeptic_analysis",
                "statistician_analysis",
                "methodologist_analysis",
                "ethicist_analysis"
            ],
            config=ParallelGroupConfig(
                join_strategy="all",
                timeout=120.0,
                error_strategy="collect_errors",
            )
        )
    ]

    template = GraphTemplate(
        entry_point="parse_paper",
        nodes=nodes,
        edges=edges,
        parallel_groups=parallel_groups,
        config=GraphConfig(max_iterations=50),
    )

    builder = DeclarativeGraphBuilder(TribunalState)
    return builder.build(template)


def build_simple_tribunal_graph() -> StateGraph:
    """
    Simplified graph with linear flow (no loops).

    Flow:
    1. parse_paper
    2. parallel_analysis (runs all 4 agents with asyncio.gather)
    3. debate_rounds (runs all 3 rounds in a single node)
    4. synthesize_verdict
    5. generate_audio
    6. store_verdict
    """
    graph = StateGraph(TribunalState)

    # Add nodes
    graph.add_node("parse_paper", parse_paper_node)
    graph.add_node("parallel_analysis", parallel_analysis_node)
    graph.add_node("debate_rounds", debate_rounds_node)
    graph.add_node("synthesize_verdict", synthesize_verdict_node)
    graph.add_node("generate_audio", generate_audio_node)
    graph.add_node("store_verdict", store_verdict_node)

    # Linear flow - no loops
    graph.set_entry_point("parse_paper")
    graph.add_edge("parse_paper", "parallel_analysis")
    graph.add_edge("parallel_analysis", "debate_rounds")
    graph.add_edge("debate_rounds", "synthesize_verdict")
    graph.add_edge("synthesize_verdict", "generate_audio")
    graph.add_edge("generate_audio", "store_verdict")
    graph.add_edge("store_verdict", END)

    return graph


def get_compiled_graph():
    graph = build_simple_tribunal_graph()
    return graph.compile()
