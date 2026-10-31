from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from typing import Optional
from ..schemas.analysis import CommonAnalysisResponse, AnalysisMethods
from ..utils.validators import validate_image_file
from ..services.ocr_service import OcrService
from ..services.text_analyzer import TextAnalyzer
from ..services.url_analyzer import UrlAnalyzer
from ..services.gemini_service import GeminiService
from ..services.risk_engine import RiskEngine
from ..services.supabase_service import BackendSupabaseService

router = APIRouter(tags=["Image Analysis"])

ocr_service = OcrService()
text_analyzer = TextAnalyzer()
url_analyzer = UrlAnalyzer()
gemini_service = GeminiService()
supabase_service = BackendSupabaseService()

@router.post("/api/analyze/image", response_model=CommonAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    # 1. Read bytes & validate
    image_bytes = await file.read()
    validate_image_file(file.filename or "upload.png", len(image_bytes), file.content_type or "")

    extracted_text = None
    ocr_engine = "none"

    # 2. Local OCR attempt
    local_text, engine = ocr_service.extract_text(image_bytes)
    if local_text and local_text.strip():
        extracted_text = local_text.strip()
        ocr_engine = engine

    # 3. Multimodal Gemini Vision if text wasn't extracted locally or for deeper vision reasoning
    gemini_findings = None
    if gemini_service.is_configured:
        mime = file.content_type or "image/jpeg"
        # If we already have OCR text, we can analyze the text directly or run multimodal
        if not extracted_text:
            multimodal_result = gemini_service.analyze_image_multimodal(image_bytes, mime_type=mime)
            if multimodal_result:
                extracted_text = multimodal_result.get("extracted_text") or None
                gemini_findings = multimodal_result
                ocr_engine = "gemini_multimodal"
        else:
            # We already have OCR text; perform contextual text analysis
            gemini_findings = gemini_service.analyze_text(extracted_text, extra_context="Extracted from image screenshot OCR.")

    # 4. Analyze extracted text (if any found)
    rule_findings = None
    url_findings = []
    if extracted_text and extracted_text.strip():
        rule_findings = text_analyzer.analyze(extracted_text)
        found_urls = url_analyzer.extract_urls(extracted_text)
        url_findings = [url_analyzer.inspect_url(u) for u in found_urls]

    # 5. Risk Engine Synthesis
    methods = AnalysisMethods(
        rule_based=bool(rule_findings),
        gemini_ai=bool(gemini_findings),
        ocr=bool(extracted_text),
        passive_url_inspection=bool(url_findings)
    )

    final_result = RiskEngine.evaluate(
        rule_findings=rule_findings,
        gemini_findings=gemini_findings,
        url_findings=url_findings,
        extracted_text=extracted_text,
        methods=methods
    )

    # If no text was found anywhere in the screenshot
    if not extracted_text and not final_result.evidence:
        final_result.summary = "No readable text or scam indicators detected in this screenshot."
        final_result.risk_level = "LOW"
        final_result.risk_score = 5
        final_result.confidence = "LOW"

    # 6. Optional Authenticated Persistence
    user = supabase_service.verify_token(authorization)
    if user and user.get("id"):
        try:
            supabase_service.save_scan(
                user_id=user["id"],
                result=final_result,
                scan_type="screenshot",
                auth_token=authorization.split("Bearer ", 1)[1] if authorization else None
            )
        except Exception:
            pass

    return final_result
