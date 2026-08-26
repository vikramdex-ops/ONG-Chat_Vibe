from contextvars import ContextVar
from typing import Optional

_user_api_key: ContextVar[Optional[str]] = ContextVar("user_api_key", default=None)
_user_model: ContextVar[Optional[str]] = ContextVar("user_model", default=None)
_user_provider: ContextVar[Optional[str]] = ContextVar("user_provider", default=None)


def set_request_llm(api_key: Optional[str], model: Optional[str] = None, provider: Optional[str] = None):
    key_token = _user_api_key.set((api_key or "").strip() or None)
    model_token = _user_model.set((model or "").strip() or None)
    provider_token = _user_provider.set((provider or "").strip().lower() or None)
    return key_token, model_token, provider_token


def reset_request_llm(tokens) -> None:
    key_token, model_token, provider_token = tokens
    _user_api_key.reset(key_token)
    _user_model.reset(model_token)
    _user_provider.reset(provider_token)


def request_api_key() -> Optional[str]:
    return _user_api_key.get()


def request_model() -> Optional[str]:
    return _user_model.get()


def request_provider() -> Optional[str]:
    return _user_provider.get()
