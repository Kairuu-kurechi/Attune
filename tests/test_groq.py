import asyncio
import sys
from pathlib import Path

# Allow this test to run directly with: python tests/test_groq.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from services.llm_service import get_completion


async def main():
    print("Testing Attune's LLM connection...")

    # Simple test: ask the model to classify a question
    question = "Why is my learning rate causing the model to bounce around the minimum?"

    system_prompt = (
        "You are an expert teaching assistant. "
        "Classify the user's question into exactly one of these categories: "
        "DIRECT_ANSWER, HINT, COUNTER_QUESTION, or DEFER_TO_SPEAKER. "
        "Output ONLY the category name."
    )

    result = await get_completion(question, system_prompt)

    print(f"Question: {question}")
    print(f"Routed as: {result}")


if __name__ == "__main__":
    asyncio.run(main())
