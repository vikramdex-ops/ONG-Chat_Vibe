from typing import Dict, Any
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings_manager, AppSettings
from app.core.logging_service import app_logger

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class TestLLMRequest(BaseModel):
    url: str
    provider: str = "local"
    api_key: str = ""


@router.get("", response_model=AppSettings)
async def get_settings():
    return settings_manager.current


@router.put("", response_model=AppSettings)
async def update_settings(new_settings: AppSettings):
    try:
        updated = settings_manager.save_settings(new_settings)
        app_logger.success("Settings", "Application configuration updated successfully.")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        app_logger.error("Settings", f"Failed to save settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings.")


@router.post("/test-llm")
async def test_llm_connection(req: TestLLMRequest):
    url = req.url.strip().rstrip("/")
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
                        "message": f"Successfully connected to {ep}"
                    }
            except Exception:
                continue

    return {
        "success": False,
        "status": "disconnected",
        "message": f"Could not reach server at {url}. Ensure server is running and accessible."
    }
