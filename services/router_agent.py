"""Question routing and priority scoring for Attune."""

from __future__ import annotations

from typing import Final, Literal, TypedDict, cast

from . import llm_service
from .causal_graph import CausalGraph


RoutingMode = Literal[
    "DIRECT_ANSWER", "HINT", "COUNTER_QUESTION", "DEFER_TO_SPEAKER"
]


class RoutingResult(TypedDict):
    """The router's decision for one audience question."""

    question: str
    routing_mode: RoutingMode
    priority_score: int
    reasoning: str


VALID_MODES: Final[frozenset[str]] = frozenset(
    {"DIRECT_ANSWER", "HINT", "COUNTER_QUESTION", "DEFER_TO_SPEAKER"}
)
PRIORITY_BY_MODE: Final[dict[RoutingMode, int]] = {
    "DEFER_TO_SPEAKER": 90,
    "COUNTER_QUESTION": 60,
    "HINT": 45,
    "DIRECT_ANSWER": 30,
}

SYSTEM_PROMPT: Final[str] = """You are Attune, a real-time audience-question router for a speaker.
Classify the audience question into exactly one routing mode:
- DIRECT_ANSWER: it can be answered clearly from the supplied context.
- HINT: a small nudge helps the audience member reason it out.
- COUNTER_QUESTION: ask a clarifying or reflective question first.
- DEFER_TO_SPEAKER: it requires the speaker's intent, judgment, or a decision outside the context.

Return only one mode name, with no explanation or punctuation."""


def _normalise_mode(completion: str) -> RoutingMode:
    """Convert an LLM completion to a safe, supported routing mode."""
    candidate = completion.strip().upper().splitlines()[0] if completion.strip() else ""
    if candidate in VALID_MODES:
        return cast(RoutingMode, candidate)
    return "COUNTER_QUESTION"


async def process_question(
    question: str,
    transcript_context: str,
    causal_graph: CausalGraph,
) -> RoutingResult:
    """Classify a question and return its routing decision and priority score.

    The graph is accepted now to preserve the agent boundary for later graph-aware
    scoring. Its current state is supplied to the classifier as a small signal.
    """
    graph_node_count = causal_graph.graph.number_of_nodes()
    graph_edge_count = causal_graph.graph.number_of_edges()
    prompt = (
        f"Transcript context:\n{transcript_context}\n\n"
        f"Knowledge graph summary: {graph_node_count} concepts, "
        f"{graph_edge_count} relationships.\n\n"
        f"Audience question: {question}"
    )
    completion = await llm_service.get_completion(prompt, SYSTEM_PROMPT)
    routing_mode = _normalise_mode(completion)
    priority_score = PRIORITY_BY_MODE[routing_mode]

    reasoning = (
        f"Classified as {routing_mode}; the sprint heuristic assigns "
        f"this mode a priority of {priority_score}."
    )
    return {
        "question": question,
        "routing_mode": routing_mode,
        "priority_score": priority_score,
        "reasoning": reasoning,
    }
