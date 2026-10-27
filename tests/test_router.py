"""Smoke test for the Attune question router."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Allow this test to run directly with: python tests/test_router.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from services.router_agent import process_question


async def run_router_demo() -> dict[str, object]:
    """Run the router with mocked graph edges and an LLM JSON response."""
    question = "Why did the speaker choose this learning rate?"
    transcript_context = "The speaker explained learning-rate tuning."
    causal_graph_edges: list[object] = [
        {
            "source": "learning rate",
            "relationship": "controls",
            "target": "training stability",
        }
    ]

    with patch(
        "services.router_agent.llm_service.get_completion",
        new=AsyncMock(
            return_value=(
                '{"routing_mode":"DEFER_TO_SPEAKER","priority_score":90,'
                '"reasoning":"The learning-rate-to-training-stability edge makes this speaker-specific choice high priority."}'
            )
        ),
    ):
        result = await process_question(
            question=question,
            transcript_context=transcript_context,
            causal_graph_edges=causal_graph_edges,
        )

    print(result)
    return result


def test_process_question() -> None:
    """The router parses the mocked LLM decision and priority."""
    result = asyncio.run(run_router_demo())

    assert result["routing_mode"] == "DEFER_TO_SPEAKER"
    assert result["priority_score"] == 90
    assert "learning-rate-to-training-stability" in result["reasoning"]


if __name__ == "__main__":
    asyncio.run(run_router_demo())
