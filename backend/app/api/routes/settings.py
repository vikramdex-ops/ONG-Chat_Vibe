from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings_manager, AppSettings, GEMINI_API_BASE
from app.core.logging_service import app_logger
from app.services.llm.gemini_llm import GeminiLLMProvider

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class TestLLMRequest(BaseModel):
    url: str = ""
    provider: str = "local"
    api_key: str = ""
    model: Optional[str] = None


def _public_settings(current: AppSettings) -> AppSettings:
    data = current.model_copy(deep=True)
    if not settings_manager.store_llm_keys():
        data.llm_api_key = None
        data.gemini_api_key = None
    return data


@router.get("", response_model=AppSettings)
async def get_settings():
    return _public_settings(settings_manager.current)


@router.put("", response_model=AppSettings)
async def update_settings(new_settings: AppSettings):
    try:
        updated = settings_manager.save_settings(new_settings)
        app_logger.success("Settings", "Application configuration updated successfully.")
        return _public_settings(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        app_logger.error("Settings", f"Failed to save settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings.")


@router.post("/test-llm")
async def test_llm_connection(req: TestLLMRequest):
    provider = (req.provider or "local").lower()

    if provider == "gemini":
        if not req.api_key.strip():
            return {
                "success": False,
                "status": "disconnected",
                "message": "Gemini API key is required. Click “Get Free API Key” and paste it here.",
            }
        gemini = GeminiLLMProvider(
            api_key=req.api_key.strip(),
            model=req.model or "gemini-2.5-flash",
        )
        health = await gemini.check_health()
        status = health.get("status", "disconnected")
        if status == "connected":
            return {
                "success": True,
                "status": "connected",
                "endpoint": GEMINI_API_BASE,
                "message": f"Connected to Google Gemini ({health.get('model', req.model or 'gemini-2.5-flash')})",
            }
        return {
            "success": False,
            "status": status,
            "message": health.get("error", "Could not reach Google Gemini API."),
        }

    if provider == "mock":
        return {
            "success": True,
            "status": "connected",
            "endpoint": "mock://internal",
            "message": "Internal mock engine is ready (offline / test mode).",
        }

    url = (req.url or "").strip().rstrip("/")
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    endpoints = [f"{url}/docs", f"{url}/health", f"{url}/", f"{url}/v1/models"]
    async with httpx.AsyncClient(timeout=4.0) as client:
        for ep in endpoints:
            try:
                headers = {}
                if req.api_key:
                    headers["Authorization"] = f"Bearer {req.api_key}"
                res = await client.get(ep, headers=headers)
                if res.status_code < 500:
                    return {
                        "success": True,
                        "status": "connected",
                        "endpoint": ep,
                        "status_code": res.status_code,
                        "message": f"Successfully connected to {ep}",
                    }
            except Exception:
                continue

    return {
        "success": False,
        "status": "disconnected",
        "message": f"Could not reach server at {url}. Ensure server is running and accessible.",
    }
