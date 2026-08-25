from typing import Optional
from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.local_llm import LocalLLMProvider
from app.services.llm.openai_llm import OpenAILLMProvider
from app.services.llm.mock_llm import MockLLMProvider


def get_llm_provider(override_provider: Optional[str] = None) -> BaseLLMProvider:
    """Factory to return configured LLM inference provider."""
    provider_type = (override_provider or settings.llm_provider).lower()
    
    if provider_type == "openai" or provider_type == "ollama" or provider_type == "vllm":
        return OpenAILLMProvider()
    elif provider_type == "mock":
        return MockLLMProvider()
    else:
        # Default is local FastAPI / llama.cpp
        return LocalLLMProvider()
