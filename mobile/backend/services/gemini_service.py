import json
import os
import re
import base64
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

SYSTEM_PROMPT = """
You are Spectra AI, a specialized cybersecurity scam and phishing detection engine.
Analyze the user's input text (or screenshot) for signs of:
1. Phishing attempts & credential harvesting
2. Artificial urgency & manufactured panic
3. Impersonation of trusted authorities, banks, government, or services
4. Unsolicited offers, lottery scams, cryptocurrency fraud
5. Requests for sensitive data (OTP, password, PIN, banking details)
6. Suspicious links or deceptive redirects

CRITICAL INSTRUCTIONS:
- You MUST output valid, raw JSON only. Do not include markdown codeblocks or extra text.
- Follow this exact JSON schema:
{
  "risk_level": "LOW" | "SUSPICIOUS" | "HIGH",
  "risk_score": <integer from 0 to 100>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<2-3 sentence clear explanation>",
  "evidence": [
    {
      "phrase": "<exact or near exact phrase from message>",
      "reason": "<specific threat reason e.g. Manufactured urgency, Impersonation>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "recommendations": [
    "<actionable safety tip 1>",
    "<actionable safety tip 2>"
  ]
}
- If evidence is insufficient, mark risk_level as "LOW" or "SUSPICIOUS" with appropriate confidence. Never label a message 100% safe.
"""

class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        # Primary and fallback model names
        self.models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyzes suspicious text message using Gemini API."""
        if not self.api_key:
            return self._heuristic_fallback(text, "Gemini API key is not configured on backend.")

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\n\nAnalyze this suspicious message:\n\"\"\"{text}\"\"\""}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        return self._call_gemini(payload, text)

    def analyze_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """Analyzes screenshot using Gemini Multimodal Vision API."""
        if not self.api_key:
            return self._heuristic_fallback("Screenshot image", "Gemini API key is not configured on backend.")

        base64_data = base64.b64encode(image_bytes).decode('utf-8')
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\n\nPerform OCR text extraction on this screenshot and analyze it for scams or threats."},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        return self._call_gemini(payload, "Screenshot OCR Analysis")

    def _call_gemini(self, payload: dict, original_input: str) -> Dict[str, Any]:
        for model in self.models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=25) as response:
                    raw_body = response.read().decode('utf-8')
                    res_json = json.loads(raw_body)
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text_out = parts[0].get("text", "")
                            # Parse JSON output from model
                            cleaned = re.sub(r'^```json\s*', '', text_out.strip())
                            cleaned = re.sub(r'```$', '', cleaned.strip())
                            data = json.loads(cleaned)
                            return self._validate_and_normalize(data)
            except urllib.error.HTTPError as e:
                err_content = e.read().decode('utf-8') if e.fp else str(e)
                print(f"[GeminiService] HTTP Error {e.code} on model {model}: {err_content}")
                continue
            except Exception as e:
                print(f"[GeminiService] Error on model {model}: {e}")
                continue

        # If all model attempts fail, use rule-based fallback
        return self._heuristic_fallback(original_input, "AI analysis service is temporarily unavailable.")

    def _validate_and_normalize(self, data: dict) -> Dict[str, Any]:
        """Ensures all expected keys are present and conform to type rules."""
        risk_level = str(data.get("risk_level", "SUSPICIOUS")).upper()
        if risk_level not in ["LOW", "SUSPICIOUS", "HIGH", "UNKNOWN"]:
            risk_level = "SUSPICIOUS"

        risk_score = data.get("risk_score")
        if risk_score is not None:
            try:
                risk_score = max(0, min(100, int(risk_score)))
            except (ValueError, TypeError):
                risk_score = 50

        confidence = str(data.get("confidence", "MEDIUM")).upper()
        if confidence not in ["HIGH", "MEDIUM", "LOW"]:
            confidence = "MEDIUM"

        summary = data.get("summary") or "Analysis completed by Spectra AI engine."

        raw_evidence = data.get("evidence", [])
        evidence = []
        if isinstance(raw_evidence, list):
            for e in raw_evidence:
                if isinstance(e, dict):
                    sev = str(e.get("severity", "MEDIUM")).upper()
                    if sev not in ["HIGH", "MEDIUM", "LOW"]:
                        sev = "MEDIUM"
                    evidence.append({
                        "phrase": str(e.get("phrase", "")),
                        "reason": str(e.get("reason", "Suspicious phrase detected")),
                        "severity": sev
                    })

        raw_recs = data.get("recommendations", [])
        recommendations = []
        if isinstance(raw_recs, list):
            recommendations = [str(r) for r in raw_recs if r]

        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "confidence": confidence,
            "summary": summary,
            "evidence": evidence,
            "recommendations": recommendations or [
                "Do not click any unverified links.",
                "Never share OTPs, passwords, or personal credentials.",
                "Verify message authenticity with the official service provider."
            ]
        }

    def _heuristic_fallback(self, text: str, reason: str) -> Dict[str, Any]:
        """Heuristic rule-based detection when remote API is unreachable."""
        lower = text.lower()
        evidence = []
        risk_level = "LOW"
        risk_score = 15

        high_risk_words = [
            ("otp", "Sensitive credential solicitation"),
            ("password", "Credential harvesting indicator"),
            ("account blocked", "Manufactured panic / urgency"),
            ("debit card", "Financial credential request"),
            ("lottery won", "Lottery / advance fee fraud pattern"),
            ("kyc expired", "KYC / banking impersonation"),
            ("arrest warrant", "Coercive legal threat impersonation")
        ]

        suspicious_words = [
            ("urgent", "Artificial urgency"),
            ("immediately", "Time pressure tactic"),
            ("click here", "Unsolicited link prompt"),
            ("verify now", "Call to action prompt"),
            ("congratulations", "Unsolicited reward pattern")
        ]

        for word, desc in high_risk_words:
            if word in lower:
                evidence.append({"phrase": word, "reason": desc, "severity": "HIGH"})
                risk_level = "HIGH"
                risk_score = max(risk_score, 88)

        for word, desc in suspicious_words:
            if word in lower:
                evidence.append({"phrase": word, "reason": desc, "severity": "MEDIUM"})
                if risk_level != "HIGH":
                    risk_level = "SUSPICIOUS"
                    risk_score = max(risk_score, 55)

        summary = (
            f"Rule-based detection identified {len(evidence)} threat indicator(s). ({reason})"
            if evidence else
            f"No prominent threat patterns detected by rule inspection. ({reason})"
        )

        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "confidence": "MEDIUM",
            "summary": summary,
            "evidence": evidence,
            "recommendations": [
                "Verify any urgent claims through official customer service channels.",
                "Never share PINs, OTPs, or passwords under any circumstances.",
                "Do not open suspicious links or attachments."
            ]
        }
