import re
from typing import Dict, List, Any, Tuple
from ..schemas.analysis import EvidenceItem

# Polarity guards: phrases indicating security advice / legitimate notifications
ADVISORY_PATTERNS = [
    r'\bnever share (?:your )?(?:otp|pin|password|cvv)\b',
    r'\bdo not share (?:your )?(?:otp|pin|password|cvv)\b',
    r'\bdon\'?t share (?:your )?(?:otp|pin|password|cvv)\b',
    r'\bnever disclose\b',
    r'\bbeware of\b',
    r'\bdo not click on suspicious\b',
    r'\bsecurity alert:?\s+we will never ask\b',
    r'\bbank never asks for\b',
    r'\bkisiko bhi otp na batayein\b',
    r'\botp kisi ke saath share na karein\b',
]

SCAM_RULE_CATEGORIES = [
    {
        "id": "CREDENTIAL_THEFT",
        "name": "OTP & Password Solicitation",
        "severity": "HIGH",
        "weight": 40,
        "patterns": [
            r'\b(?:share|send|provide|tell|enter|verify)\s+(?:your\s+)?(?:otp|one[- ]time password|pin|cvv|netbanking password)\b',
            r'\botp\s+(?:share|batao|bhejo|diye|de do)\b',
            r'\benter (?:your )?(?:atm pin|mpin|upi pin)\b',
            r'\binput (?:your )?(?:otp|secret code)\b',
        ],
        "reason": "Direct request for confidential authentication credentials (OTP/PIN/password)",
        "recommendation": "Never share your OTP, PIN, or netbanking password with anyone under any circumstances. Official institutions will never ask for them."
    },
    {
        "id": "URGENT_BLOCK_THREAT",
        "name": "Account Suspension / Block Threat",
        "severity": "HIGH",
        "weight": 30,
        "patterns": [
            r'\b(?:account|card|access|service|sim|atm) (?:will be |has been )?(?:blocked|suspended|deactivated|closed|frozen)\b',
            r'\baccount (?:band|block|suspend) ho jayega\b',
            r'\bcard (?:band|block) ho jayega\b',
            r'\baccess (?:will be )?restricted\b',
            r'\bpan (?:card )?(?:has been |will be )?delinked\b',
        ],
        "reason": "Manufactured urgency threatening account deactivation or card blocking",
        "recommendation": "Do not panic or rush into actions. Contact your bank directly through their verified official hotline or branch."
    },
    {
        "id": "FAKE_KYC_UPDATE",
        "name": "Fake KYC / Verification Scam",
        "severity": "HIGH",
        "weight": 35,
        "patterns": [
            r'\b(?:update|complete|verify)\s+(?:your\s+)?kyc\b',
            r'\bkyc (?:expired|suspended|incomplete|pending|karo)\b',
            r'\blink (?:your )?aadhaar (?:with |to )?pan immediately\b',
            r'\bkyc update nahi kiya toh\b',
            r'\bdocument re[- ]verification required\b',
        ],
        "reason": "Urgent prompt to perform unverified KYC or document submission",
        "recommendation": "Bank KYC updates are only performed through official banking apps, verified web portals, or in-person at bank branches."
    },
    {
        "id": "LOTTERY_PRIZE_SCAM",
        "name": "Lottery & Prize Fraud",
        "severity": "HIGH",
        "weight": 35,
        "patterns": [
            r'\bcongratulations!?\s+you (?:have )?won\b',
            r'\b(?:kbc|lottery|lucky draw|cash prize)\s+(?:winner|won|reward|of)\b',
            r'\bselected for (?:a )?cash prize\b',
            r'\baapne jita hai\b',
        ],
        "reason": "Unsolicited reward or lottery claim intended to elicit advance payment or identity documents",
        "recommendation": "Legitimate lotteries do not ask for advance processing fees or credit card details to release prize money."
    },
    {
        "id": "PRIZE_CLAIM_ACTION",
        "name": "Prize Claim Directive",
        "severity": "HIGH",
        "weight": 30,
        "patterns": [
            r'\bclaim (?:your )?(?:prize|reward|amount|cash|car|iphone|money)\b',
            r'\bcall\s+\+?\d+\s+to claim\b',
            r'\bclick here to claim\b',
        ],
        "reason": "Urgent prompt directing user to claim an unsolicited prize or reward",
        "recommendation": "Do not contact numbers or links associated with unsolicited prize notices."
    },
    {
        "id": "DELIVERY_FEE_SCAM",
        "name": "Courier & Parcel Delivery Fee Scam",
        "severity": "HIGH",
        "weight": 35,
        "patterns": [
            r'\b(?:pay|deposit)\s+(?:a\s+)?(?:delivery|customs?|processing|courier)\s+fee\b',
            r'\bpay (?:rs\.?|inr|₹|\$)\s*\d+\s+to release\b',
            r'\bunpaid customs duty\b',
        ],
        "reason": "Demand for an upfront payment to release or redeliver an alleged parcel",
        "recommendation": "Verify tracking numbers directly on official courier websites (e.g., India Post, Blue Dart, FedEx). Never pay unknown redelivery fees."
    },
    {
        "id": "PARCEL_HOLD_THREAT",
        "name": "Parcel Withholding Threat",
        "severity": "MEDIUM",
        "weight": 25,
        "patterns": [
            r'\bparcel (?:is )?(?:on hold|held|stuck|cannot be delivered)\b',
            r'\bpackage suspended\b',
            r'\bshipment returned to warehouse\b',
        ],
        "reason": "False claim that a package is held to pressure the recipient into paying or providing personal information",
        "recommendation": "Official courier services do not withhold parcels pending payment via informal SMS or messaging apps."
    },
    {
        "id": "JOB_TASK_SCAM",
        "name": "Social Media Task / Like Scam",
        "severity": "HIGH",
        "weight": 35,
        "patterns": [
            r'\bearn (?:rs\.?|inr|₹)\s*\d+[-–]\d+\s+daily (?:by )?(?:liking|watching|subscribing|tasks?)\b',
            r'\bpart[- ]time job.*(?:liking|watching|telegram)\b',
            r'\bghar baithe paise kamayein\b',
        ],
        "reason": "Deceptive task scam promising unrealistic daily returns for social media engagements",
        "recommendation": "Task scams lure victims with easy money for liking videos before demanding escalating deposits. Do not engage."
    },
    {
        "id": "ADVANCE_FEE_DEMAND",
        "name": "Advance Fee / Deposit Demand",
        "severity": "HIGH",
        "weight": 35,
        "patterns": [
            r'\bpay (?:a\s+)?(?:registration|training|security|kit|processing)\s+fee\b',
            r'\badvance deposit required\b',
            r'\bsecurity deposit to start\b',
        ],
        "reason": "Demand for upfront payment or deposit to activate a job, task, or claim",
        "recommendation": "Legitimate organizations never charge applicants registration fees or security deposits."
    },
    {
        "id": "REMOTE_ACCESS_SCAM",
        "name": "Remote Access & Malicious App Scam",
        "severity": "HIGH",
        "weight": 40,
        "patterns": [
            r'\binstall (?:anydesk|teamviewer|quicksupport|rustdesk|zoho assist)\b',
            r'\bdownload (?:and install )?(?:this )?(?:\.apk|app|file) to (?:resolve|claim|unblock)\b',
            r'\bsupport app download karo\b',
            r'\bscreen share app\b',
        ],
        "reason": "Instructions to install remote desktop or unverified APK software granting full device takeover",
        "recommendation": "Never install remote access software (AnyDesk, TeamViewer) or unknown APK files upon instructions from unknown callers or messages."
    },
    {
        "id": "THREAT_LEGAL_PRESSURE",
        "name": "Legal Threat & Government Impersonation",
        "severity": "HIGH",
        "weight": 30,
        "patterns": [
            r'\b(?:police|cbi|rbi|income tax|court|cyber cell)\s+(?:complaint|case|inquiry|notice|warrant|action)\b',
            r'\bpolice complaint hogi\b',
            r'\barrest warrant (?:will be )?issued\b',
            r'\blegal action (?:will be taken|initiated)\b',
            r'\bpay fine immediately or face arrest\b',
        ],
        "reason": "Coercive legal threats falsely claiming law enforcement or government agency action",
        "recommendation": "Law enforcement agencies and the RBI do not issue arrest warrants or demand fine payments via SMS or WhatsApp messages."
    },
    {
        "id": "MANUFACTURED_URGENCY",
        "name": "Manufactured Time Urgency",
        "severity": "MEDIUM",
        "weight": 20,
        "patterns": [
            r'\bwithin (?:10|15|20|30|60)\s+minutes\b',
            r'\bwithin (?:1|2|4|12|24)\s+hours\b',
            r'\bimmediately\b',
            r'\btoday only|last chance\b',
            r'\bturant (?:karein|bhejo|click karo|paise)\b',
            r'\bwarna\b',
        ],
        "reason": "High-pressure urgency tactics designed to bypass critical reasoning",
        "recommendation": "Take a breath. Legitimate matters can always wait for independent verification through official channels."
    }
]

class TextAnalyzer:
    """Deterministic rule-based linguistic and threat analyzer for scam detection."""

    def __init__(self):
        self._compiled_advisories = [re.compile(p, re.IGNORECASE) for p in ADVISORY_PATTERNS]
        self._compiled_rules = []
        for cat in SCAM_RULE_CATEGORIES:
            compiled_patterns = [re.compile(p, re.IGNORECASE) for p in cat["patterns"]]
            self._compiled_rules.append({
                "id": cat["id"],
                "name": cat["name"],
                "severity": cat["severity"],
                "weight": cat["weight"],
                "reason": cat["reason"],
                "recommendation": cat["recommendation"],
                "patterns": compiled_patterns
            })

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyzes the message text.
        Returns:
            - is_advisory: bool
            - evidence: List[EvidenceItem]
            - score_delta: int
            - recommendations: List[str]
            - matched_categories: List[str]
        """
        text_lower = text.lower().strip()

        # Check if the text is primarily a safety advisory / warning
        is_advisory = False
        for p in self._compiled_advisories:
            if p.search(text_lower):
                is_advisory = True
                break

        evidence: List[EvidenceItem] = []
        recommendations: List[str] = []
        matched_categories: List[str] = []
        total_score = 0

        # If it is an advisory message ("Never share your OTP with anyone"),
        # do not trigger false-positive credential theft alerts
        if is_advisory:
            has_threat = any(re.search(r'\b(?:or your account will be blocked|pay immediately)\b', text_lower) for _ in [1])
            if not has_threat:
                return {
                    "is_advisory": True,
                    "evidence": [],
                    "score_delta": 0,
                    "recommendations": ["Message appears to be a legitimate safety advisory. Stay vigilant."],
                    "matched_categories": ["SAFETY_ADVISORY"]
                }

        # Match against scam rule categories
        for rule in self._compiled_rules:
            matched_phrase = None
            for pattern in rule["patterns"]:
                match = pattern.search(text)
                if match:
                    matched_phrase = match.group(0)
                    break
            
            if matched_phrase:
                evidence.append(EvidenceItem(
                    phrase=matched_phrase,
                    reason=rule["reason"],
                    severity=rule["severity"]
                ))
                matched_categories.append(rule["id"])
                total_score += rule["weight"]
                if rule["recommendation"] not in recommendations:
                    recommendations.append(rule["recommendation"])

        return {
            "is_advisory": False,
            "evidence": evidence,
            "score_delta": total_score,
            "recommendations": recommendations,
            "matched_categories": matched_categories
        }
