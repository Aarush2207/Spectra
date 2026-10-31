import base64
import json
import logging
from typing import Dict, Any, Optional, List
import requests
from ..config import settings
from ..schemas.analysis import EvidenceItem, SuspiciousUrlItem

logger = logging.getLogger("spectra.ai")

SYSTEM_PROMPT = """You are Spectra AI, an elite cybersecurity and phishing detection engine.
Analyze the user-submitted message, screenshot text, or URL for fraud, phishing, financial extortion, OTP theft, digital impersonation, and psychological manipulation.

CRITICAL INSTRUCTIONS:
1. Do not flag messages as scams based on keywords alone. Context and intent matter!
   - "Never share your OTP with anyone" is a legitimate security warning (LOW risk).
   - "Share your OTP immediately or your account will be blocked" is a severe scam (HIGH risk).
   - "Your parcel will arrive tomorrow" is a routine notification (LOW risk).
   - "Pay a processing fee immediately to release your parcel" is a courier scam (HIGH risk).
   - "Your bank account has been credited with ₹500" is alone insufficient to identify a scam (LOW risk).
2. Support English and Hinglish (e.g., "turant paise bhejo", "account band ho jayega", "otp share karo").
3. Output strictly valid JSON matching this exact structure:
{
  "risk_level": "LOW" | "SUSPICIOUS" | "HIGH",
  "risk_score": <integer between 0 and 100>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<1-2 sentence concise executive assessment in plain language>",
  "evidence": [
    {
      "phrase": "<exact suspicious excerpt>",
      "reason": "<why this phrase is dangerous>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "recommendations": [
    "<actionable safety advice #1>",
    "<actionable safety advice #2>"
  ]
}
"""

class OpenRouterAIService:
    """
    AI contextual analysis powered by OpenRouter API (OpenAI-compatible).
    Supports Vision-Language multimodal analysis and text reasoning.
    Never fabricates a fake AI success when the service is unreachable.
    """

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY.strip()
        self.base_url = settings.OPENROUTER_BASE_URL.rstrip('/')
        self.default_model = settings.OPENROUTER_MODEL
        self.timeout = settings.REQUEST_TIMEOUT_SECONDS

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _candidate_models(self) -> List[str]:
        models = [self.default_model]
        for fallback in [
            "google/gemini-2.0-flash-exp:free",
            "nvidia/nemotron-3.5-super-vl:free",
            "meta-llama/llama-3.2-11b-vision-instruct:free",
            "mistralai/mistral-7b-instruct:free",
        ]:
            if fallback not in models:
                models.append(fallback)
        return models

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://spectra.app",
            "X-Title": "Spectra Scam Detection",
        }

    def _post_chat(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_configured:
            return None

        url = f"{self.base_url}/chat/completions"
        try:
            resp = requests.post(
                url,
                headers=self._headers(),
                json=payload,
                timeout=10,  # Strict 10-second timeout to prevent frontend timeout
            )
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices")
                if choices and len(choices) > 0:
                    content = choices[0].get("message", {}).get("content", "")
                    return self._parse_json(content)
            else:
                logger.warning(
                    f"OpenRouter API returned {resp.status_code}: {resp.text[:200]}"
                )
        except requests.exceptions.Timeout:
            logger.warning(f"OpenRouter call timed out after 10s for model {payload.get('model')}")
        except Exception as e:
            logger.warning(f"OpenRouter API request failed: {e}")

        return None

    def analyze_text(self, text: str, extra_context: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Calls OpenRouter chat completions with strict JSON output instructions.
        Returns parsed dict or None if unconfigured/quota/error.
        """
        if not self.is_configured:
            return None

        user_content = ""
        if extra_context:
            user_content += f"CONTEXT/PRELIMINARY FINDINGS:\n{extra_context}\n\n"
        user_content += f"CONTENT TO ANALYZE:\n\"\"\"\n{text}\n\"\"\"\n\nRespond ONLY with valid JSON matching the schema:"

        for model in self._candidate_models()[:2]:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.1,
                "max_tokens": 800,
            }
            result = self._post_chat(payload)
            if result:
                return result

        return None

    def analyze_image_multimodal(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[Dict[str, Any]]:
        """
        Multimodal analysis: extracts OCR text and performs contextual reasoning in one pass.
        Returns parsed dict with optional 'extracted_text', or None if unavailable.
        """
        if not self.is_configured:
            return None

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"

        task_instructions = f"""{SYSTEM_PROMPT}

TASK:
1. Extract ALL visible text from this screenshot accurately. Do not invent text.
2. Analyze the extracted text for phishing, bank impersonation, fake receipts, or OTP theft.
3. Respond ONLY with valid JSON:
{{
  "extracted_text": "<verbatim extracted OCR text>",
  "risk_level": "LOW" | "SUSPICIOUS" | "HIGH",
  "risk_score": <0-100>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<plain language summary>",
  "evidence": [
    {{
      "phrase": "<suspicious phrase>",
      "reason": "<reason>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }}
  ],
  "recommendations": [
    "<recommendation>"
  ]
}}
"""
        for model in self._candidate_models()[:3]:
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": task_instructions},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    },
                ],
                "temperature": 0.1,
                "max_tokens": 1000,
            }
            result = self._post_chat(payload)
            if result:
                return result

        return None

    def analyze_url_context(self, url: str, lexical_summary: str) -> Optional[Dict[str, Any]]:
        """
        Contextual reasoning on passive URL findings.
        CRITICAL: Does NOT visit the URL.
        """
        if not self.is_configured:
            return None

        prompt = f"""{SYSTEM_PROMPT}

PASSIVE URL STRUCTURAL FINDINGS:
URL: {url}
LEXICAL FINDINGS:
{lexical_summary}

Analyze the likelihood that this URL is a phishing, credential harvesting, or brand impersonation link based on its structure and domain naming.
Do NOT attempt to visit or navigate to the URL.

Respond strictly in JSON:
{{
  "risk_level": "LOW" | "SUSPICIOUS" | "HIGH",
  "risk_score": <0-100>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<assessment of domain risk>",
  "evidence": [
    {{
      "phrase": "<suspicious element or domain>",
      "reason": "<explanation>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }}
  ],
  "recommendations": [
    "<actionable guidance>"
  ]
}}
"""
        for model in self._candidate_models()[:2]:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 800,
            }
            result = self._post_chat(payload)
            if result:
                return result

        return None

    def _parse_json(self, raw_text: str) -> Optional[Dict[str, Any]]:
        cleaned = raw_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()

        # Find first '{' and last '}'
        first_brace = cleaned.find('{')
        last_brace = cleaned.rfind('}')
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            cleaned = cleaned[first_brace : last_brace + 1]

        try:
            data = json.loads(cleaned)
            if isinstance(data, dict) and "risk_level" in data:
                return data
        except Exception as e:
            logger.warning(f"Failed to parse AI JSON output: {e} | Raw: {raw_text[:200]}")
        return None

# Alias for backwards compatibility with existing route imports
GeminiService = OpenRouterAIService
AIService = OpenRouterAIService
