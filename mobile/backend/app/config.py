import os
from pathlib import Path
from dotenv import load_dotenv

# Locate .env in backend root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    # App
    APP_NAME: str = "Spectra Scam Detection API"
    VERSION: str = "1.0.0"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1")

    # OpenRouter AI
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-super-vl:free")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    # Optional Fallbacks
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://lelmcuezksfeblhfrcmy.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

    # Limits & Timeouts
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "10000"))
    MIN_TEXT_LENGTH: int = int(os.getenv("MIN_TEXT_LENGTH", "5"))
    MAX_IMAGE_SIZE_BYTES: int = int(os.getenv("MAX_IMAGE_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB
    ALLOWED_IMAGE_EXTENSIONS: set = {"jpg", "jpeg", "png", "webp", "bmp"}
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

    # CORS
    CORS_ORIGINS: list = ["*"]

settings = Settings()
