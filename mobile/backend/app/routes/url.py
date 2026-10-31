from fastapi import APIRouter, Header
from typing import Optional
from ..schemas.analysis import UrlAnalysisRequest, CommonAnalysisResponse, AnalysisMethods
from ..utils.validators import validate_url_input
from ..services.url_analyzer import UrlAnalyzer
from ..services.gemini_service import GeminiService
from ..services.risk_engine import RiskEngine
from ..services.supabase_service import BackendSupabaseService

router = APIRouter(tags=["URL Analysis"])

url_analyzer = UrlAnalyzer()
gemini_service = GeminiService()
supabase_service = BackendSupabaseService()

@router.post("/api/analyze/url", response_model=CommonAnalysisResponse)
async def analyze_url(
    request: UrlAnalysisRequest,
    authorization: Optional[str] = Header(None)
):
    # 1. Validate URL syntax
    clean_url = validate_url_input(request.url)

    # 2. Passive lexical and structural inspection (ZERO external visits)
    inspection_result = url_analyzer.inspect_url(clean_url)

    # 3. Contextual Gemini AI analysis on passive findings
    gemini_findings = None
    if gemini_service.is_configured:
        summary_for_ai = (
            f"Risk: {inspection_result['risk']}\n"
            f"Primary Reason: {inspection_result['reason']}\n"
            f"Flags: {', '.join(inspection_result['details'].get('flags', []))}\n"
            f"Registrable Domain: {inspection_result['details'].get('registrable_domain')}\n"
            f"TLD: {inspection_result['details'].get('tld')}"
        )
        gemini_findings = gemini_service.analyze_url_context(clean_url, summary_for_ai)

    # 4. Risk Engine Synthesis
    methods = AnalysisMethods(
        rule_based=True,
        gemini_ai=bool(gemini_findings),
        ocr=False,
        passive_url_inspection=True
    )

    final_result = RiskEngine.evaluate(
        rule_findings=None,
        gemini_findings=gemini_findings,
        url_findings=[inspection_result],
        extracted_text=None,
        methods=methods
    )

    # Add passive safety disclaimer to recommendations
    if UrlAnalyzer.DISCLAIMER not in final_result.recommendations:
        final_result.recommendations.append(UrlAnalyzer.DISCLAIMER)

    # 5. Optional Authenticated Persistence
    user = supabase_service.verify_token(authorization)
    if user and user.get("id"):
        try:
            supabase_service.save_scan(
                user_id=user["id"],
                result=final_result,
                scan_type="url",
                auth_token=authorization.split("Bearer ", 1)[1] if authorization else None
            )
        except Exception:
            pass

    return final_result
