import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .routes import health, text, image, url

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("spectra.main")

app = FastAPI(
    title=settings.APP_NAME,
    description="Unified Multimodal AI Scam & Phishing Detection API powered by OpenRouter AI, Passive URL Inspection, and Heuristic Rule Engines.",
    version=settings.VERSION
)

# CORS Middleware (supports Flutter, React, Android Emulator 10.0.2.2, and local LAN)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(text.router)
app.include_router(image.router)
app.include_router(url.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "endpoints": [
            "/api/health",
            "/api/analyze/text",
            "/api/analyze/image",
            "/api/analyze/url"
        ]
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred while processing the scan. Please try again."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
