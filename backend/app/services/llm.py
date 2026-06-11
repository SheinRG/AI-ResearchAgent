"""
Async Groq client for cloud LLM inference.
Supports regular generation, streaming, and structured JSON output.
"""

import json
import logging
from typing import AsyncGenerator, Optional

import httpx
from groq import AsyncGroq

from app.config import get_settings

logger = logging.getLogger(__name__)


class GroqClient:
    """Async wrapper around the Groq Python SDK."""

    def __init__(self):
        settings = get_settings()
        self.model = settings.groq_model
        self.timeout = settings.groq_timeout
        self.client = AsyncGroq(
            api_key=settings.groq_api_key,
            timeout=httpx.Timeout(self.timeout),
        )

    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        format_json: bool = False,
        model: Optional[str] = None,
        max_tokens: int = 2048,
    ) -> str:
        """
        Generate a complete response from Groq.

        Args:
            prompt: The user prompt.
            system: Optional system prompt.
            temperature: Sampling temperature.
            format_json: If True, request JSON formatted output.
            model: Override the default model for this call.
            max_tokens: Maximum tokens to generate.

        Returns:
            The full generated text.
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": model or self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if format_json:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except httpx.TimeoutException:
            logger.error("Groq request timed out after %ds", self.timeout)
            raise
        except Exception as e:
            logger.error("Groq request failed: %s", e)
            raise

    async def generate_stream(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        model: Optional[str] = None,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        Stream tokens from Groq one at a time.

        Args:
            prompt: The user prompt.
            system: Optional system prompt.
            temperature: Sampling temperature.
            model: Override the default model for this call.
            max_tokens: Maximum tokens to generate.

        Yields:
            Individual tokens as they're generated.
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = await self.client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield token
        except httpx.TimeoutException:
            logger.error("Groq stream timed out after %ds", self.timeout)
            raise
        except Exception as e:
            logger.error("Groq stream failed: %s", e)
            raise

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.3,
    ) -> dict:
        """
        Generate structured JSON output from Groq.

        Args:
            prompt: The user prompt (should request JSON output).
            system: Optional system prompt.
            temperature: Lower temperature for more deterministic JSON.

        Returns:
            Parsed JSON dictionary.
        """
        raw = await self.generate(
            prompt=prompt,
            system=system,
            temperature=temperature,
            format_json=True,
        )

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from Groq, attempting extraction")
            # Try to extract JSON from the response
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(raw[start:end])
                except json.JSONDecodeError:
                    pass
            logger.error("Could not parse structured output: %s", raw[:200])
            return {}

    async def health_check(self) -> bool:
        """Check if Groq API is reachable and responding."""
        try:
            models = await self.client.models.list()
            available = any(m.id == self.model for m in models.data)
            if not available:
                model_ids = [m.id for m in models.data]
                logger.warning(
                    "Model '%s' not found. Available: %s",
                    self.model,
                    model_ids,
                )
            return True
        except Exception as e:
            logger.error("Groq health check failed: %s", e)
            return False


# Singleton instance
_client: Optional[GroqClient] = None


def get_llm_client() -> GroqClient:
    """Get the singleton Groq client."""
    global _client
    if _client is None:
        _client = GroqClient()
    return _client
