import re
from urllib.parse import urlparse
from fastapi import HTTPException
from ..config import settings

URL_REGEX = re.compile(
    r'(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s]*)?',
    re.IGNORECASE
)

def validate_text_input(text: str) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(cleaned) < settings.MIN_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text too short. Minimum {settings.MIN_TEXT_LENGTH} characters required."
        )
    if len(cleaned) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text too long. Maximum {settings.MAX_TEXT_LENGTH} characters allowed."
        )
    return cleaned

def validate_url_input(raw_url: str) -> str:
    cleaned = (raw_url or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    if " " in cleaned:
        raise HTTPException(status_code=400, detail="Invalid URL format: spaces are not allowed.")
    if "." not in cleaned:
        raise HTTPException(status_code=400, detail="Invalid URL format: missing domain extension.")
    
    # Prepend scheme if missing for parsing
    test_url = cleaned if cleaned.startswith(("http://", "https://", "ftp://")) else f"http://{cleaned}"
    try:
        parsed = urlparse(test_url)
        if not parsed.netloc or "." not in parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid hostname or domain in URL.")
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed URL structure.")
    return cleaned

def validate_image_file(filename: str, file_size: int, content_type: str = "") -> None:
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required.")
    
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '.{ext}'. Allowed: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    if file_size <= 0:
        raise HTTPException(status_code=400, detail="Image file is empty.")
    if file_size > settings.MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds limit of {settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)} MB."
        )
