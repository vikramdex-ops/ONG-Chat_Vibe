import json
from typing import AsyncGenerator, Dict, Any, Optional, List
import httpx
from app.services.llm.base import BaseLLMProvider
from app.core.config import settings
from app.core.logging_service import app_logger


class LocalLLMProvider(BaseLLMProvider):
    """Integrates with the existing SQA-O&G FastAPI / llama.cpp server at POST /generate."""

    def __init__(self, server_url: Optional[str] = None):
        self.server_url = (server_url or settings.llm_server_url).rstrip("/")

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> str:
        url = f"{self.server_url}/generate"
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop or settings.llm_stop_strings
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                # Check different response formats
                if isinstance(data, dict):
                    if "text" in data:
                        return data["text"].strip()
                    elif "response" in data:
                        return data["response"].strip()
                    elif "content" in data:
                        return data["content"].strip()
                    elif "answer" in data:
                        return data["answer"].strip()
                    elif "choices" in data and len(data["choices"]) > 0:
                        choice = data["choices"][0]
                        if isinstance(choice, dict):
                            return choice.get("text", choice.get("message", {}).get("content", "")).strip()
                elif isinstance(data, str):
                    return data.strip()

                return str(data)
            except httpx.HTTPStatusError as e:
                app_logger.error("LocalLLM", f"HTTP Error {e.response.status_code} calling {url}: {e.response.text}")
                raise RuntimeError(f"LLM Server HTTP Error: {e.response.status_code}")
            except Exception as e:
                app_logger.error("LocalLLM", f"Connection error to {url}: {e}")
                raise RuntimeError(f"Could not connect to LLM server at {self.server_url}. Please ensure it is running.")

    async def stream_generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        url = f"{self.server_url}/generate"
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop or settings.llm_stop_strings,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        # Fallback to non-streaming
                        full_text = await self.generate(prompt, max_tokens, temperature, stop)
                        yield full_text
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data:"):
                            line_content = line[5:].strip()
                            if line_content == "[DONE]":
                                break
                            try:
                                chunk_data = json.loads(line_content)
                                if isinstance(chunk_data, dict):
                                    token = chunk_data.get("text", chunk_data.get("token", chunk_data.get("content", "")))
                                    if token:
                                        yield token
                                elif isinstance(chunk_data, str):
                                    yield chunk_data
                            except json.JSONDecodeError:
                                yield line_content
            except Exception as e:
                app_logger.warning("LocalLLM", f"Streaming failed ({e}), attempting non-streaming fallback...")
                full_text = await self.generate(prompt, max_tokens, temperature, stop)
                yield full_text

    async def check_health(self) -> Dict[str, Any]:
        """Check LLM server health by probing /docs or /health or root with short timeout."""
        endpoints = [f"{self.server_url}/docs", f"{self.server_url}/health", f"{self.server_url}/"]
        async with httpx.AsyncClient(timeout=3.0) as client:
            for ep in endpoints:
                try:
                    res = await client.get(ep)
                    if res.status_code < 500:
                        return {"status": "connected", "url": self.server_url, "endpoint": ep}
                except Exception:
                    continue
        return {"status": "disconnected", "url": self.server_url, "error": "Cannot connect to LLM server"}
