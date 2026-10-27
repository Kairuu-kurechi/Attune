"""Question routing and priority scoring for Attune."""

from __future__ import annotations

import json
from typing import Final, Literal, TypedDict, cast

from . import llm_service


RoutingMode = Literal[
    "DIRECT_ANSWER", "HINT", "COUNTER_QUESTION", "DEFER_TO_SPEAKER"
]


class RoutingResult(TypedDict):
    """The router's decision for one audience question."""

    routing_mode: RoutingMode
    priority_score: int
    reasoning: str


VALID_MODES: Final[frozenset[str]] = frozenset(
    {"DIRECT_ANSWER", "HINT", "COUNTER_QUESTION", "DEFER_TO_SPEAKER"}
)
SYSTEM_PROMPT: Final[str] = """You are an Agentic Attention Router for a live workshop.
Evaluate the student's question using the transcript and causal graph edges. Return ONLY a
valid JSON object with exactly these keys: routing_mode, priority_score, reasoning.

routing_mode must be exactly one of DIRECT_ANSWER, HINT, COUNTER_QUESTION, or
DEFER_TO_SPEAKER. priority_score must be an integer from 0 to 100 based on urgency
and student confusion: use a score above 80 for confusion about a core concept and
below 40 for a basic definition. reasoning must be exactly one sentence explaining
the selected mode and score while referencing the supplied causal graph edges."""

FALLBACK_RESULT: Final[RoutingResult] = {
    "routing_mode": "DEFER_TO_SPEAKER",
    "priority_score": 50,
    "reasoning": "The routing response was invalid, so the question was deferred while the causal graph edges are reviewed.",
}


def _parse_routing_result(completion: str) -> RoutingResult:
    """Validate the JSON-only response expected from the routing model."""
    try:
        json_start = completion.index("{")
        parsed, _ = json.JSONDecoder().raw_decode(completion[json_start:])
    except (ValueError, json.JSONDecodeError):
        return FALLBACK_RESULT.copy()

    if not isinstance(parsed, dict) or set(parsed) != set(RoutingResult.__annotations__):
        return FALLBACK_RESULT.copy()

    routing_mode = parsed.get("routing_mode")
    priority_score = parsed.get("priority_score")
    reasoning = parsed.get("reasoning")
    if (
        not isinstance(routing_mode, str)
        or routing_mode not in VALID_MODES
        or type(priority_score) is not int
        or not 0 <= priority_score <= 100
        or not isinstance(reasoning, str)
        or not reasoning.strip()
    ):
        return FALLBACK_RESULT.copy()

    return {
        "routing_mode": cast(RoutingMode, routing_mode),
        "priority_score": priority_score,
        "reasoning": reasoning.strip(),
    }


async def process_question(
    question: str,
    transcript_context: str,
    causal_graph_edges: list[object],
) -> RoutingResult:
    """Use the LLM to choose a question route and priority from workshop context."""
    prompt = (
        f"Transcript context:\n{transcript_context}\n\n"
        f"Causal graph edges:\n{json.dumps(causal_graph_edges, default=str)}\n\n"
        f"Audience question: {question}"
    )
    completion = await llm_service.get_completion(prompt, SYSTEM_PROMPT)
    return _parse_routing_result(completion)
