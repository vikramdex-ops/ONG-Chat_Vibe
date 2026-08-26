import asyncio
import sys
from pathlib import Path

import pytest

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.gemini_models import DEFAULT_GEMINI_MODEL, normalize_gemini_model
from app.services.llm.factory import get_llm_provider
from app.services.llm.gemini_llm import GeminiLLMProvider


def test_factory_gemini_provider():
    provider = get_llm_provider("gemini")
    assert isinstance(provider, GeminiLLMProvider)


def test_gemini_health_without_key():
    provider = GeminiLLMProvider(api_key="", model="gemini-2.5-flash")
    health = asyncio.run(provider.check_health())
    assert health["status"] == "disconnected"
    assert "key" in health["error"].lower()


def test_gemini_generate_requires_key():
    provider = GeminiLLMProvider(api_key="", model="gemini-2.5-flash")
    with pytest.raises(RuntimeError, match="API Key"):
        asyncio.run(provider.generate("What is API 650?"))


def test_gemini_model_prefix_normalized():
    provider = GeminiLLMProvider(api_key="demo", model="models/gemini-3.6-flash")
    assert provider.model == "gemini-3.6-flash"
    assert "gemini-3.6-flash:generateContent" in provider._get_url("generateContent")


def test_retired_gemini_models_remap():
    assert normalize_gemini_model("gemini-2.5-flash") == DEFAULT_GEMINI_MODEL
    assert normalize_gemini_model("models/gemini-2.5-pro") == DEFAULT_GEMINI_MODEL
    assert normalize_gemini_model("gemini-3.7-flash") == "gemini-3.7-flash"
