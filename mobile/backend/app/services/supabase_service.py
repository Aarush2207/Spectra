import logging
from typing import Optional, Dict, Any, List
import requests
from ..config import settings
from ..schemas.analysis import CommonAnalysisResponse

logger = logging.getLogger("spectra.supabase")

class BackendSupabaseService:
    """Handles secure token verification and scan persistence via Supabase REST API."""

    def __init__(self):
        self.url = settings.SUPABASE_URL.rstrip('/')
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.anon_key = settings.SUPABASE_ANON_KEY

    def verify_token(self, auth_header: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Verifies client Supabase JWT token with Supabase Auth endpoint.
        Returns user object dict or None if invalid/expired.
        Never trusts client-supplied user ID without verification.
        """
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split("Bearer ", 1)[1].strip()
        if not token:
            return None

        verify_url = f"{self.url}/auth/v1/user"
        headers = {
            "apikey": self.anon_key or self.service_role_key,
            "Authorization": f"Bearer {token}"
        }

        try:
            resp = requests.get(verify_url, headers=headers, timeout=5)
            if resp.status_code == 200:
                return resp.json()
            else:
                logger.warning(f"Supabase token verification rejected: {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error connecting to Supabase Auth: {e}")
            return None

    def save_scan(
        self,
        user_id: str,
        result: CommonAnalysisResponse,
        scan_type: str,
        auth_token: Optional[str] = None
    ) -> Optional[str]:
        """
        Saves scan result to existing Supabase tables (`scans`, `scan_evidence`, `scan_urls`, `scan_recommendations`).
        scan_type must be strictly: 'text', 'screenshot', or 'url'.
        """
        valid_scan_types = {"text", "screenshot", "url"}
        normalized_type = scan_type.lower() if scan_type.lower() in valid_scan_types else "text"

        key_to_use = self.service_role_key or self.anon_key
        headers = {
            "apikey": key_to_use,
            "Authorization": f"Bearer {auth_token}" if auth_token else f"Bearer {key_to_use}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # 1. Insert into `scans` matching exact table schema:
        # id, user_id, scan_type, risk_level, risk_score, confidence, summary,
        # message_preview, ocr_used, rule_analysis_used, ai_analysis_used, url_analysis_used
        preview = (
            result.extracted_text[:150]
            if result.extracted_text
            else (result.summary[:150] if result.summary else None)
        )
        scan_payload = {
            "user_id": user_id,
            "scan_type": normalized_type,
            "risk_level": result.risk_level,
            "risk_score": result.risk_score,
            "confidence": result.confidence,
            "summary": result.summary,
            "message_preview": preview,
            "ocr_used": bool(getattr(result.analysis_methods, 'ocr', False)),
            "rule_analysis_used": bool(getattr(result.analysis_methods, 'rule_based', True)),
            "ai_analysis_used": bool(getattr(result.analysis_methods, 'gemini_ai', False)),
            "url_analysis_used": bool(getattr(result.analysis_methods, 'passive_url_inspection', False) or len(result.urls) > 0),
        }

        try:
            scans_url = f"{self.url}/rest/v1/scans"
            resp = requests.post(scans_url, headers=headers, json=scan_payload, timeout=8)
            if resp.status_code not in (200, 201):
                logger.error(f"Failed to insert scan into Supabase: {resp.status_code} {resp.text}")
                return None

            inserted = resp.json()
            if not inserted or not isinstance(inserted, list):
                return None
            scan_id = inserted[0].get("id")

            # 2. Insert Evidence
            if result.evidence and scan_id:
                evidence_payload = [
                    {
                        "scan_id": scan_id,
                        "phrase": e.phrase,
                        "reason": e.reason,
                        "severity": e.severity
                    }
                    for e in result.evidence
                ]
                requests.post(f"{self.url}/rest/v1/scan_evidence", headers=headers, json=evidence_payload, timeout=5)

            # 3. Insert URLs
            if result.urls and scan_id:
                urls_payload = [
                    {
                        "scan_id": scan_id,
                        "url": u.url,
                        "risk": u.risk,
                        "reason": u.reason
                    }
                    for u in result.urls
                ]
                requests.post(f"{self.url}/rest/v1/scan_urls", headers=headers, json=urls_payload, timeout=5)

            # 4. Insert Recommendations
            if result.recommendations and scan_id:
                recs_payload = [
                    {
                        "scan_id": scan_id,
                        "recommendation": r
                    }
                    for r in result.recommendations
                ]
                requests.post(f"{self.url}/rest/v1/scan_recommendations", headers=headers, json=recs_payload, timeout=5)

            return scan_id
        except Exception as e:
            logger.error(f"Exception saving scan to Supabase: {e}")
            return None
