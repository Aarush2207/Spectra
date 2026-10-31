from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class EvidenceItem(BaseModel):
    phrase: str
    reason: str
    severity: str = "HIGH"  # HIGH, MEDIUM, LOW

class SuspiciousUrlItem(BaseModel):
    url: str
    risk: str = "SUSPICIOUS"  # SAFE, SUSPICIOUS, HIGH
    reason: str

class AnalysisMethods(BaseModel):
    rule_based: bool = False
    gemini_ai: bool = False
    ocr: bool = False
    passive_url_inspection: bool = False

class CommonAnalysisResponse(BaseModel):
    risk_level: str = "UNKNOWN"  # LOW, SUSPICIOUS, HIGH, UNKNOWN
    risk_score: int = 0          # 0-100
    confidence: str = "LOW"      # HIGH, MEDIUM, LOW
    summary: str = ""
    extracted_text: Optional[str] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)
    urls: List[SuspiciousUrlItem] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    analysis_methods: AnalysisMethods = Field(default_factory=AnalysisMethods)

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., description="Message text to analyze for scams or phishing")

class UrlAnalysisRequest(BaseModel):
    url: str = Field(..., description="URL to passively inspect")
