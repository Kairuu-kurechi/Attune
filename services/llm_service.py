import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables from .env
load_dotenv()

# Initialize the client with Groq's OpenAI-compatible endpoint
client = AsyncOpenAI(
    api_key=os.getenv("LLM_API_KEY"),
    base_url=os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1"),
)


async def get_completion(
    prompt: str, system_prompt: str = "You are a helpful assistant."
) -> str:
    """
    Sends a prompt to the configured LLM provider and returns the response text.
    """
    try:
        response = await client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "llama-3.1-8b-instant"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,  # Lower temperature for more deterministic agentic routing
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"ERROR: {str(e)}"
