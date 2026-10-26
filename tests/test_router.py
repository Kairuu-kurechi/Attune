"""Smoke test for the Attune question router."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Allow this test to run directly with: python tests/test_router.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from services.causal_graph import CausalGraph
from services.router_agent import process_question


async def run_router_demo() -> dict[str, object]:
    """Run the router with a mocked LLM classification and print the result."""
    question = "Why did the speaker choose this learning rate?"
    graph = CausalGraph()
    graph.graph.add_edge("learning rate", "training stability")

    with patch(
        "services.router_agent.llm_service.get_completion",
        new=AsyncMock(return_value="DEFER_TO_SPEAKER"),
    ):
        result = await process_question(
            question=question,
            transcript_context="The speaker explained learning-rate tuning.",
            causal_graph=graph,
        )

    print(result)
    return result


def test_process_question() -> None:
    """The router returns the mocked route and its matching priority."""
    result = asyncio.run(run_router_demo())

    assert result["routing_mode"] == "DEFER_TO_SPEAKER"
    assert result["priority_score"] == 90
    assert result["question"] == "Why did the speaker choose this learning rate?"


if __name__ == "__main__":
    asyncio.run(run_router_demo())
