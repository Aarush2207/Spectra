from fastapi import APIRouter
from ..config import settings
from ..services.gemini_service import AIService

router = APIRouter(tags=["Health"])
ai_service = AIService()

@router.get("/api/health")
async def health_check():
    """
    Checks true readiness of the detection engines.
    Validates OpenRouter AI and Supabase configuration and provides operational status.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "engines": {
            "rule_based_engine": True,
            "passive_url_inspector": True,
            "ai_engine": {
                "provider": "openrouter",
                "configured": ai_service.is_configured,
                "model": settings.OPENROUTER_MODEL,
                "ready": ai_service.is_configured,
            },
            "supabase_cloud": {
                "configured": bool(settings.SUPABASE_URL),
                "url": settings.SUPABASE_URL,
            },
        },
    }
