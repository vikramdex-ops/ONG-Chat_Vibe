from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, Optional, List


class BaseLLMProvider(ABC):
    """Abstract interface for LLM inference providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> str:
        """Generate full completion for the given prompt."""
        pass

    @abstractmethod
    async def stream_generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream completion tokens asynchronously."""
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Check provider connectivity and status."""
        pass
