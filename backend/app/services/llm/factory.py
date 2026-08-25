from typing import Optional
from app.core.config import settings_manager
from app.services.llm.base import BaseLLMProvider
from app.services.llm.local_llm import LocalLLMProvider
from app.services.llm.openai_llm import OpenAILLMProvider
from app.services.llm.mock_llm import MockLLMProvider
from app.services.llm.gemini_llm import GeminiLLMProvider


def get_llm_provider(override_provider: Optional[str] = None) -> BaseLLMProvider:
    """Factory to return the currently configured LLM inference provider."""
    current = settings_manager.current
    provider_type = (override_provider or current.llm_provider or "local").lower()

    if provider_type == "gemini":
        return GeminiLLMProvider(
            api_key=current.llm_api_key or current.gemini_api_key,
            model=current.llm_model_name or current.gemini_model_name,
        )
    if provider_type in ("openai", "ollama", "vllm"):
        return OpenAILLMProvider(
            server_url=current.llm_server_url,
            api_key=current.llm_api_key,
            model=current.llm_model_name,
        )
    if provider_type == "mock":
        return MockLLMProvider()
    return LocalLLMProvider(server_url=current.llm_server_url)
