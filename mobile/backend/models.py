from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class EvidenceItem(BaseModel):
    phrase: str
    reason: str
    severity: Literal["HIGH", "MEDIUM", "LOW"]

class UrlRiskItem(BaseModel):
    url: str
    risk: Literal["SAFE", "SUSPICIOUS", "HIGH"]
    reason: str

class TextAnalyzeRequest(BaseModel):
    text: str

class UrlAnalyzeRequest(BaseModel):
    url: str

class AnalyzeResponse(BaseModel):
    risk_level: Literal["LOW", "SUSPICIOUS", "HIGH", "UNKNOWN"]
    risk_score: Optional[int] = Field(None, ge=0, le=100)
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    summary: str
    evidence: List[EvidenceItem] = []
    urls: List[UrlRiskItem] = []
    recommendations: List[str] = []
