import json
from typing import AsyncGenerator, Dict, Any, Optional, List
import httpx
from app.services.llm.base import BaseLLMProvider
from app.core.config import settings
from app.core.logging_service import app_logger


class OpenAILLMProvider(BaseLLMProvider):
    """Integrates with standard OpenAI-compatible endpoints (Ollama, vLLM, OpenAI, OpenRouter, etc.)."""

    def __init__(self, server_url: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None):
        self.server_url = (server_url or settings.llm_server_url).rstrip("/")
        self.api_key = api_key or settings.llm_api_key or "sk-no-key"
        self.model = model or settings.llm_model_name or "gpt-3.5-turbo"

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> str:
        url = f"{self.server_url}/v1/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop or settings.llm_stop_strings
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                res = await client.post(url, json=payload, headers=self._get_headers())
                res.raise_for_status()
                data = res.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
                return ""
            except Exception as e:
                app_logger.error("OpenAILLM", f"Error generating completion from {url}: {e}")
                raise RuntimeError(f"LLM Provider error: {e}")

    async def stream_generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        url = f"{self.server_url}/v1/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop or settings.llm_stop_strings,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=payload, headers=self._get_headers()) as response:
                if response.status_code != 200:
                    text = await self.generate(prompt, max_tokens, temperature, stop)
                    yield text
                    return

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                yield token
                    except Exception:
                        continue

    async def check_health(self) -> Dict[str, Any]:
        url = f"{self.server_url}/v1/models"
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                res = await client.get(url, headers=self._get_headers())
                if res.status_code < 500:
                    return {"status": "connected", "url": self.server_url, "provider": "openai_compatible"}
            except Exception:
                pass
        return {"status": "disconnected", "url": self.server_url, "error": "Cannot reach OpenAI endpoint"}
