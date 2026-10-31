from fastapi import APIRouter, Header, Depends
from typing import Optional
from ..schemas.analysis import TextAnalysisRequest, CommonAnalysisResponse, AnalysisMethods
from ..utils.validators import validate_text_input
from ..services.text_analyzer import TextAnalyzer
from ..services.url_analyzer import UrlAnalyzer
from ..services.gemini_service import GeminiService
from ..services.risk_engine import RiskEngine
from ..services.supabase_service import BackendSupabaseService

router = APIRouter(tags=["Text Analysis"])

text_analyzer = TextAnalyzer()
url_analyzer = UrlAnalyzer()
gemini_service = GeminiService()
supabase_service = BackendSupabaseService()

@router.post("/api/analyze/text", response_model=CommonAnalysisResponse)
async def analyze_text(
    request: TextAnalysisRequest,
    authorization: Optional[str] = Header(None)
):
    # 1. Input validation
    clean_text = validate_text_input(request.text)

    # 2. Rule-based detection
    rule_findings = text_analyzer.analyze(clean_text)

    # 3. Extract and passively inspect any embedded URLs
    extracted_urls = url_analyzer.extract_urls(clean_text)
    url_findings = [url_analyzer.inspect_url(u) for u in extracted_urls]

    # 4. Contextual Gemini AI analysis
    gemini_findings = None
    if gemini_service.is_configured:
        context_hints = []
        if rule_findings.get("matched_categories"):
            context_hints.append(f"Rule triggers: {', '.join(rule_findings['matched_categories'])}")
        if url_findings:
            context_hints.append(f"Embedded URLs: {len(url_findings)} found (riskiest: {max(u['risk'] for u in url_findings)})")
        
        hint_str = " | ".join(context_hints) if context_hints else "No deterministic rules matched."
        gemini_findings = gemini_service.analyze_text(clean_text, extra_context=hint_str)

    # 5. Risk Engine Synthesis
    methods = AnalysisMethods(
        rule_based=True,
        gemini_ai=bool(gemini_findings),
        ocr=False,
        passive_url_inspection=bool(url_findings)
    )

    final_result = RiskEngine.evaluate(
        rule_findings=rule_findings,
        gemini_findings=gemini_findings,
        url_findings=url_findings,
        extracted_text=None,
        methods=methods
    )

    # 6. Optional Authenticated Persistence
    user = supabase_service.verify_token(authorization)
    if user and user.get("id"):
        try:
            supabase_service.save_scan(
                user_id=user["id"],
                result=final_result,
                scan_type="text",
                auth_token=authorization.split("Bearer ", 1)[1] if authorization else None
            )
        except Exception:
            pass  # Do not drop completed analysis if saving fails

    return final_result
