from groq import Groq, BadRequestError
from app.config import settings
import logging

logger = logging.getLogger(__name__)

client = Groq(api_key=settings.GROQ_API_KEY)


def ask_groq(prompt: str) -> str:
    """Ask the Groq API and return a string response.

    Raises RuntimeError if the API is unavailable or returns an error.
    """
    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

    except BadRequestError as bre:
        # Known API errors (e.g. organization restricted)
        logger.error("Groq BadRequestError: %s", bre)
        raise RuntimeError(f"Groq API error: {bre}")
    except Exception as e:
        logger.exception("Unexpected error calling Groq")
        raise RuntimeError("Groq service unavailable") from e
