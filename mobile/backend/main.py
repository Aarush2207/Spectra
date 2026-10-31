import os
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models import TextAnalyzeRequest, UrlAnalyzeRequest, AnalyzeResponse, EvidenceItem, UrlRiskItem
from services.gemini_service import GeminiService
from services.url_inspector import UrlInspector

app = FastAPI(
    title="Spectra Scam Detection API",
    description="Intelligent AI-powered multimodal scam detection engine using Gemini AI & Passive URL Inspection",
    version="1.0.0"
)

# Enable CORS for Flutter app (including web / emulator)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gemini = GeminiService()

@app.get("/")
def root():
    return {
        "app": "Spectra Scam Detection API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": ["/api/health", "/api/analyze/text", "/api/analyze/image"]
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "gemini_configured": bool(gemini.api_key),
        "service": "Spectra AI Detection Engine"
    }

@app.post("/api/analyze/text", response_model=AnalyzeResponse)
async def analyze_text(request: TextAnalyzeRequest):
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")

    # 1. Passive URL inspection
    extracted_urls = UrlInspector.extract_urls(text)
    url_findings = [UrlInspector.inspect(u) for u in extracted_urls]

    # 2. AI contextual analysis via Gemini
    ai_result = gemini.analyze_text(text)

    # 3. Elevate risk if high-risk URLs are present
    risk_level = ai_result["risk_level"]
    risk_score = ai_result.get("risk_score", 50)
    has_high_url = any(u.risk == "HIGH" for u in url_findings)
    has_suspicious_url = any(u.risk == "SUSPICIOUS" for u in url_findings)

    if has_high_url:
        risk_level = "HIGH"
        risk_score = max(risk_score or 0, 85)
    elif has_suspicious_url and risk_level == "LOW":
        risk_level = "SUSPICIOUS"
        risk_score = max(risk_score or 0, 60)

    evidence_items = [
        EvidenceItem(phrase=e["phrase"], reason=e["reason"], severity=e["severity"])
        for e in ai_result.get("evidence", [])
    ]

    return AnalyzeResponse(
        risk_level=risk_level,
        risk_score=risk_score,
        confidence=ai_result.get("confidence", "MEDIUM"),
        summary=ai_result.get("summary", "Analysis completed."),
        evidence=evidence_items,
        urls=url_findings,
        recommendations=ai_result.get("recommendations", [])
    )

@app.post("/api/analyze/image", response_model=AnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    # Validate file format
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    content_type = file.content_type or "image/jpeg"
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload JPEG, PNG, or WebP screenshot."
        )

    # Read image contents (max 10MB)
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit.")

    # Multimodal OCR + Scam Analysis via Gemini Vision
    ai_result = gemini.analyze_image(image_bytes, mime_type=content_type)

    evidence_items = [
        EvidenceItem(phrase=e["phrase"], reason=e["reason"], severity=e["severity"])
        for e in ai_result.get("evidence", [])
    ]

    # Look for URLs mentioned in evidence phrases or summary
    urls_found = []
    for text_sample in [ai_result.get("summary", "")] + [e["phrase"] for e in ai_result.get("evidence", [])]:
        for u in UrlInspector.extract_urls(text_sample):
            if not any(item.url == u for item in urls_found):
                urls_found.append(UrlInspector.inspect(u))

    return AnalyzeResponse(
        risk_level=ai_result.get("risk_level", "SUSPICIOUS"),
        risk_score=ai_result.get("risk_score", 65),
        confidence=ai_result.get("confidence", "MEDIUM"),
        summary=ai_result.get("summary", "Screenshot analysis completed."),
        evidence=evidence_items,
        urls=urls_found,
        recommendations=ai_result.get("recommendations", [])
    )

@app.post("/api/analyze/url", response_model=AnalyzeResponse)
async def analyze_url(request: UrlAnalyzeRequest):
    url = (request.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")

    # Normalize the URL
    if not url.startswith(('http://', 'https://', 'ftp://')):
        url = 'http://' + url

    # 1. Passive URL inspection
    url_finding = UrlInspector.inspect(url)

    # 2. AI contextual analysis of the URL via Gemini
    ai_prompt = (
        f"Analyze this URL for potential scam, phishing, or security risk. "
        f"Inspect the domain, path, and structure. URL: {url}"
    )
    ai_result = gemini.analyze_text(ai_prompt)

    # 3. Merge URL inspection with AI results
    risk_level = ai_result["risk_level"]
    risk_score = ai_result.get("risk_score", 50)

    if url_finding.risk == "HIGH":
        risk_level = "HIGH"
        risk_score = max(risk_score or 0, 85)
    elif url_finding.risk == "SUSPICIOUS" and risk_level == "LOW":
        risk_level = "SUSPICIOUS"
        risk_score = max(risk_score or 0, 60)

    evidence_items = [
        EvidenceItem(phrase=e["phrase"], reason=e["reason"], severity=e["severity"])
        for e in ai_result.get("evidence", [])
    ]

    return AnalyzeResponse(
        risk_level=risk_level,
        risk_score=risk_score,
        confidence=ai_result.get("confidence", "MEDIUM"),
        summary=ai_result.get("summary", "URL analysis completed."),
        evidence=evidence_items,
        urls=[url_finding],
        recommendations=ai_result.get("recommendations", [
            "Do not click or visit suspicious URLs.",
            "Verify the URL by visiting the official website directly.",
            "Check for HTTPS and valid certificates before entering credentials.",
        ])
    )

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
