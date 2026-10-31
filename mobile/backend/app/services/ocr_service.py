import io
import logging
from typing import Optional, Tuple
from PIL import Image, ImageOps, ImageEnhance

logger = logging.getLogger("spectra.ocr")

class OcrService:
    """Extracts text from screenshots with multiple fallback engines."""

    def __init__(self):
        self._tesseract_available = False
        self._easyocr_available = False
        self._init_ocr_engines()

    def _init_ocr_engines(self):
        # Try pytesseract
        try:
            import pytesseract
            self._pytesseract = pytesseract
            self._tesseract_available = True
        except ImportError:
            self._tesseract_available = False

        # Try easyocr
        try:
            import easyocr
            self._easyocr_reader = easyocr.Reader(['en'], gpu=False)
            self._easyocr_available = True
        except Exception:
            self._easyocr_available = False

    def preprocess_image(self, image_bytes: bytes) -> Image.Image:
        """Loads and enhances image contrast for cleaner OCR extraction."""
        img = Image.open(io.BytesIO(image_bytes))
        # Convert RGBA to RGB
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        # Enhance contrast slightly
        enhancer = ImageEnhance.Contrast(img)
        enhanced = enhancer.enhance(1.4)
        return enhanced

    def extract_text(self, image_bytes: bytes) -> Tuple[Optional[str], str]:
        """
        Attempts local OCR first (Tesseract / EasyOCR).
        Returns (extracted_text, engine_used).
        If no local OCR engine installed, returns (None, 'none') allowing Gemini Vision to handle OCR.
        """
        try:
            img = self.preprocess_image(image_bytes)
        except Exception as e:
            logger.error(f"Corrupted or invalid image data: {e}")
            return None, "invalid_image"

        # 1. Try pytesseract if available
        if self._tesseract_available:
            try:
                text = self._pytesseract.image_to_string(img).strip()
                if text:
                    return text, "tesseract"
            except Exception as e:
                logger.warning(f"Tesseract OCR failed: {e}")

        # 2. Try easyocr if available
        if self._easyocr_available:
            try:
                # Save to bytes for easyocr
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG")
                results = self._easyocr_reader.readtext(buffer.getvalue(), detail=0)
                text = " ".join(results).strip()
                if text:
                    return text, "easyocr"
            except Exception as e:
                logger.warning(f"EasyOCR failed: {e}")

        return None, "gemini_multimodal"
