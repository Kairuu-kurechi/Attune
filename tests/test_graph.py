import asyncio
import sys
import os
import traceback

print("--- SCRIPT STARTED ---", flush=True)

# Add root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from services.llm_service import get_completion
    from services.causal_graph import CausalGraph

    print("--- IMPORTS SUCCESSFUL ---", flush=True)
except Exception as e:
    print(f"--- IMPORT ERROR: {e} ---", flush=True)
    traceback.print_exc()
    sys.exit(1)


async def main():
    print("Testing Attune's Causal Graph Extraction...", flush=True)

    transcript_chunk = """
    Today we are talking about Gradient Descent. Gradient descent is an optimization algorithm 
    used to minimize the loss function. The loss function measures how wrong the model is. 
    To update the model, we use the learning rate. The learning rate determines the step size. 
    If the learning rate is too high, the model will overshoot the minimum. 
    """

    system_prompt = """
    You are an expert knowledge engineer. Your job is to extract concepts and their relationships from a transcript chunk.
    Rules:
    1. Extract the main technical concepts.
    2. Identify how they relate to each other.
    3. Valid relationships are: "depends_on", "is_part_of", "optimizes", "controls", "causes".
    4. Output ONLY a valid JSON array. No markdown, no extra text.
    Format:
    [
        {"source": "concept A", "relationship": "depends_on", "target": "concept B"}
    ]
    """

    prompt = f"Transcript Chunk:\n{transcript_chunk}\n\nExtract the JSON:"

    print("Agent is reading transcript and extracting relationships...", flush=True)

    try:
        raw_response = await get_completion(prompt, system_prompt)
        print("\n--- RAW LLM OUTPUT ---", flush=True)
        print(raw_response, flush=True)
        print("-----------------------", flush=True)
    except Exception as e:
        print(f"LLM Call Failed: {e}", flush=True)
        return

    graph = CausalGraph()
    graph.add_relationships(raw_response)
    graph.print_graph()


if __name__ == "__main__":
    try:
        asyncio.run(main())
        print("--- SCRIPT FINISHED ---", flush=True)
    except Exception as e:
        print(f"\n--- RUNTIME ERROR: {e} ---", flush=True)
        traceback.print_exc()
