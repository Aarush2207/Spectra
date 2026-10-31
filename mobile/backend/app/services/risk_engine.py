from typing import List, Dict, Any, Optional
from ..schemas.analysis import (
    CommonAnalysisResponse,
    EvidenceItem,
    SuspiciousUrlItem,
    AnalysisMethods
)

class RiskEngine:
    """
    Unified multi-layered risk decision engine.
    Integrates Rule-based heuristics, Gemini contextual AI reasoning,
    OCR extraction, and Passive URL inspection.
    """

    @staticmethod
    def evaluate(
        rule_findings: Optional[Dict[str, Any]] = None,
        gemini_findings: Optional[Dict[str, Any]] = None,
        url_findings: Optional[List[Dict[str, Any]]] = None,
        extracted_text: Optional[str] = None,
        methods: Optional[AnalysisMethods] = None
    ) -> CommonAnalysisResponse:
        evidence_list: List[EvidenceItem] = []
        url_items: List[SuspiciousUrlItem] = []
        recommendations_set: List[str] = []
        total_score = 0
        methods_used = methods or AnalysisMethods()

        is_advisory = False

        # 1. Process Rule-Based Findings
        if rule_findings:
            methods_used.rule_based = True
            is_advisory = rule_findings.get("is_advisory", False)
            if not is_advisory:
                total_score += rule_findings.get("score_delta", 0)
                for ev in rule_findings.get("evidence", []):
                    evidence_list.append(ev)
                for rec in rule_findings.get("recommendations", []):
                    if rec not in recommendations_set:
                        recommendations_set.append(rec)

        # 2. Process Passive URL Findings
        if url_findings:
            methods_used.passive_url_inspection = True
            for uf in url_findings:
                u_url = uf.get("url", "")
                u_risk = uf.get("risk", "SAFE")
                u_reason = uf.get("reason", "")
                u_score = uf.get("score_delta", 0)

                url_items.append(SuspiciousUrlItem(
                    url=u_url,
                    risk=u_risk,
                    reason=u_reason
                ))

                if u_risk == "HIGH":
                    total_score = max(total_score, max(65, u_score))
                elif u_risk == "SUSPICIOUS":
                    total_score = max(total_score, max(35, u_score))

                for ev in uf.get("evidence", []):
                    evidence_list.append(ev)

        # 3. Process Gemini AI Findings
        gemini_score = None
        if gemini_findings and isinstance(gemini_findings, dict):
            methods_used.gemini_ai = True
            gemini_score = gemini_findings.get("risk_score")
            
            # Incorporate Gemini evidence
            for ev_dict in gemini_findings.get("evidence", []):
                phrase = ev_dict.get("phrase", "")
                reason = ev_dict.get("reason", "")
                sev = ev_dict.get("severity", "HIGH").upper()
                if phrase and not any(e.phrase.lower() == phrase.lower() for e in evidence_list):
                    evidence_list.append(EvidenceItem(
                        phrase=phrase,
                        reason=reason,
                        severity=sev if sev in ("HIGH", "MEDIUM", "LOW") else "HIGH"
                    ))

            for rec in gemini_findings.get("recommendations", []):
                if rec and rec not in recommendations_set:
                    recommendations_set.append(rec)

        # 4. Score Fusion
        # If Gemini returned a score, fuse with deterministic rules
        if gemini_score is not None:
            if is_advisory:
                # Advisory message: damp score heavily unless explicit scam indicators found
                final_score = min(20, gemini_score)
            else:
                # Weighted blend: max of rule score and blend of AI + rules
                blend = int((gemini_score * 0.6) + (min(total_score, 100) * 0.4))
                final_score = max(blend, min(total_score, 95))
        else:
            final_score = min(total_score, 100)

        # 5. Determine Risk Level
        # 0–29: LOW, 30–59: SUSPICIOUS, 60–100: HIGH
        if is_advisory:
            risk_level = "LOW"
            final_score = min(final_score, 15)
        elif final_score >= 60:
            risk_level = "HIGH"
        elif final_score >= 30:
            risk_level = "SUSPICIOUS"
        else:
            risk_level = "LOW"

        # 6. Determine Confidence
        if methods_used.gemini_ai and methods_used.rule_based:
            confidence = "HIGH"
        elif methods_used.gemini_ai or methods_used.rule_based or methods_used.passive_url_inspection:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # 7. Generate Summary
        if gemini_findings and gemini_findings.get("summary"):
            summary = gemini_findings["summary"]
        elif is_advisory:
            summary = "This message appears to be a legitimate security notice or advisory. Always remain vigilant."
        elif risk_level == "HIGH":
            high_count = sum(1 for e in evidence_list if e.severity == "HIGH")
            summary = f"High risk detected. Identified {high_count or len(evidence_list)} severe scam or credential theft indicators."
        elif risk_level == "SUSPICIOUS":
            summary = "Suspicious patterns identified. Exercise caution and verify independently before proceeding."
        else:
            summary = "No immediate scam or phishing indicators were found in this content."

        # Default recommendations if empty
        if not recommendations_set:
            if risk_level == "HIGH":
                recommendations_set = [
                    "Do not share any OTP, PIN, password, or banking information.",
                    "Do not click on links or install software requested by this message.",
                    "Verify the sender's identity through official public telephone channels."
                ]
            elif risk_level == "SUSPICIOUS":
                recommendations_set = [
                    "Verify with the relevant bank or organization using their verified official website.",
                    "Never enter login credentials on unverified third-party pages.",
                    "Report suspicious messages to your service provider."
                ]
            else:
                recommendations_set = [
                    "Content appears routine. Continue practicing general digital safety.",
                    "Remember that official institutions will never ask for your passwords or OTPs."
                ]

        # Deduplicate evidence
        unique_evidence: List[EvidenceItem] = []
        seen_phrases = set()
        for e in evidence_list:
            norm = e.phrase.lower().strip()
            if norm not in seen_phrases:
                seen_phrases.add(norm)
                unique_evidence.append(e)

        return CommonAnalysisResponse(
            risk_level=risk_level,
            risk_score=final_score,
            confidence=confidence,
            summary=summary,
            extracted_text=extracted_text,
            evidence=unique_evidence,
            urls=url_items,
            recommendations=recommendations_set[:4],
            analysis_methods=methods_used
        )
