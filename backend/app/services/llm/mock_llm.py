import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, List
from app.services.llm.base import BaseLLMProvider


class MockLLMProvider(BaseLLMProvider):
    """High-fidelity standalone LLM provider for testing and offline development."""

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> str:
        # Extract question and context from prompt if possible
        if "No relevant context found" in prompt or "CONTEXT:\n\nUSER QUESTION" in prompt or "Based on the following context:\n\n\n\n---" in prompt:
            return "The provided context does not contain the necessary information to answer this question."

        return (
            "Based on the retrieved Oil & Gas standard specifications in the knowledge base:\n\n"
            "- Hydrostatic testing must be conducted according to the standard pressure and hold-time requirements.\n"
            "- All welded joints, connections, and structural seams must be inspected for leaks or deformation during the test.\n"
            "- Test liquid must meet temperature limitations to prevent brittle fracture.\n\n"
            "*(Refer to the specific document sections and pages shown in the source context panel below for full clause definitions.)*"
        )

    async def stream_generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.6,
        stop: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        full_text = await self.generate(prompt, max_tokens, temperature, stop)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.02)

    async def check_health(self) -> Dict[str, Any]:
        return {"status": "connected", "url": "mock://internal", "provider": "mock"}
