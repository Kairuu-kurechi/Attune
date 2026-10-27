"""LLM-driven question routing and priority scoring for Attune."""

from __future__ import annotations

import json
from typing import Final, Literal, TypedDict, cast

from . import llm_service


RoutingMode = Literal[
    "DIRECT_ANSWER", "HINT", "COUNTER_QUESTION", "DEFER_TO_SPEAKER"
]


class RoutingResult(TypedDict):
    """A validated decision produced by the attention router."""

    routing_mode: RoutingMode
    priority_score: int
    reasoning: str
    root_cause_concept: str


VALID_MODES: Final[frozenset[str]] = frozenset(
    {"DIRECT_ANSWER", "HINT", "COUNTER_QUESTION", "DEFER_TO_SPEAKER"}
)
REQUIRED_KEYS: Final[frozenset[str]] = frozenset(
    {"routing_mode", "priority_score", "reasoning"}
)
ALLOWED_KEYS: Final[frozenset[str]] = REQUIRED_KEYS | {"root_cause_concept"}

SYSTEM_PROMPT: Final[str] = """You are an Agentic Attention Router for a live workshop.
Use the transcript and causal graph edges to return ONLY a valid JSON object with these
keys: routing_mode, priority_score, reasoning, root_cause_concept.

routing_mode must be one of DIRECT_ANSWER, HINT, COUNTER_QUESTION, or DEFER_TO_SPEAKER.
priority_score must be an integer from 0 to 100 based on urgency and confusion: above 80
for confusion about a core concept and below 40 for a basic definition. reasoning must be
one sentence that references the supplied causal graph edges. root_cause_concept must be
the most relevant graph concept in lowercase (for example, "learning rate"), or "unknown"."""

FALLBACK_RESULT: Final[RoutingResult] = {
    "routing_mode": "DEFER_TO_SPEAKER",
    "priority_score": 50,
    "reasoning": "The routing response was invalid, so the question was deferred while the causal graph edges are reviewed.",
    "root_cause_concept": "unknown",
}


def _fallback_with_log(error: object) -> RoutingResult:
    """Log malformed model output and return a response safe for WebSocket clients."""
    print(f"Router JSON parsing failed: {error}")
    return FALLBACK_RESULT.copy()


def _parse_routing_result(completion: str) -> RoutingResult:
    """Parse and validate the model response without allowing malformed JSON to escape."""
    try:
        json_start = completion.index("{")
        parsed, _ = json.JSONDecoder().raw_decode(completion[json_start:])
    except (AttributeError, ValueError, json.JSONDecodeError) as error:
        return _fallback_with_log(error)

    if not isinstance(parsed, dict):
        return _fallback_with_log("response JSON was not an object")
    if not REQUIRED_KEYS.issubset(parsed) or not set(parsed).issubset(ALLOWED_KEYS):
        return _fallback_with_log("response JSON had invalid keys")

    routing_mode = parsed.get("routing_mode")
    priority_score = parsed.get("priority_score")
    reasoning = parsed.get("reasoning")
    root_cause_concept = parsed.get("root_cause_concept", "unknown")
    if (
        not isinstance(routing_mode, str)
        or routing_mode not in VALID_MODES
        or type(priority_score) is not int
        or not 0 <= priority_score <= 100
        or not isinstance(reasoning, str)
        or not reasoning.strip()
    ):
        return _fallback_with_log("response JSON contained invalid routing values")

    root_cause = (
        root_cause_concept.strip().lower()
        if isinstance(root_cause_concept, str) and root_cause_concept.strip()
        else "unknown"
    )
    return {
        "routing_mode": cast(RoutingMode, routing_mode),
        "priority_score": priority_score,
        "reasoning": reasoning.strip(),
        "root_cause_concept": root_cause,
    }


async def process_question(
    question: str,
    transcript_context: str,
    causal_graph_edges: list[object],
) -> RoutingResult:
    """Route one audience question, always returning a safe result on LLM failure."""
    prompt = (
        f"Transcript context:\n{transcript_context}\n\n"
        f"Causal graph edges:\n{json.dumps(causal_graph_edges, default=str)}\n\n"
        f"Audience question: {question}"
    )
    try:
        completion = await llm_service.get_completion(prompt, SYSTEM_PROMPT)
        return _parse_routing_result(completion)
    except Exception as error:
        return _fallback_with_log(error)
