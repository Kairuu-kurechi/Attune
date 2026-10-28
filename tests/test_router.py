"""Smoke tests for safe Attune question routing."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from services.router_agent import process_question


async def run_router_demo() -> dict[str, object]:
    """Route a mock question where the optional root cause is absent."""
    with patch(
        "services.router_agent.llm_service.get_completion",
        new=AsyncMock(
            return_value=(
                "I will evaluate the graph first.\n```json\n"
                '{"routing_mode":"HINT","priority_score":65,'
                '"reasoning":"The learning rate controls training stability in the graph."}'
                "\n```"
            )
        ),
    ):
        result = await process_question(
            question="Why does my model bounce around the minimum?",
            transcript_context="The learning rate determines step size.",
            causal_graph_edges=[
                {
                    "source": "learning rate",
                    "relationship": "controls",
                    "target": "training stability",
                }
            ],
        )

    print(result)
    return result


def test_process_question_defaults_missing_root_cause() -> None:
    """A valid LLM response without root_cause_concept remains safe to broadcast."""
    result = asyncio.run(run_router_demo())

    assert result["routing_mode"] == "HINT"
    assert result["priority_score"] == 65
    assert result["root_cause_concept"] == "unknown"


if __name__ == "__main__":
    asyncio.run(run_router_demo())
