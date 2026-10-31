import re
import ipaddress
from urllib.parse import urlparse, parse_qs, unquote
from typing import List, Dict, Any, Optional, Tuple
from ..schemas.analysis import SuspiciousUrlItem, EvidenceItem

# Multi-level TLDs
KNOWN_MULTI_TLDS = {
    "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in",
    "co.uk", "org.uk", "me.uk", "ltd.uk",
    "com.au", "net.au", "org.au", "edu.au",
    "co.nz", "net.nz", "org.nz",
    "com.br", "net.br", "org.br",
    "co.za", "net.za", "org.za",
    "com.sg", "edu.sg", "gov.sg",
}

# Suspicious / High-Abuse TLDs frequently used in fast-flux phishing
SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "buzz", "work", "click",
    "rest", "icu", "link", "surf", "cam", "fit", "live", "club", "online",
    "site", "vip", "monster", "cfd", "sbs", "quest", "beauty", "hair",
    "skin", "makeup", "mom", "country", "stream", "download", "racing"
}

# URL shorteners that obscure destinations
URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly",
    "rb.gy", "ow.ly", "buff.ly", "adf.ly", "bit.do", "tiny.cc",
    "shorturl.at", "bl.ink", "rebrand.ly", "v.gd"
}

# High-profile brand targets for impersonation detection
PROTECTED_BRANDS = {
    "sbi": {"legit_domains": ["sbi.co.in", "onlinesbi.sbi", "onlinesbi.com", "statebankofindia.com"], "name": "State Bank of India (SBI)"},
    "hdfc": {"legit_domains": ["hdfcbank.com", "hdfc.com"], "name": "HDFC Bank"},
    "icici": {"legit_domains": ["icicibank.com", "icicidirect.com"], "name": "ICICI Bank"},
    "axis": {"legit_domains": ["axisbank.com"], "name": "Axis Bank"},
    "paytm": {"legit_domains": ["paytm.com", "paytmbank.com"], "name": "Paytm"},
    "phonepe": {"legit_domains": ["phonepe.com"], "name": "PhonePe"},
    "google": {"legit_domains": ["google.com", "google.co.in", "gmail.com", "accounts.google.com"], "name": "Google"},
    "amazon": {"legit_domains": ["amazon.com", "amazon.in", "amzn.to"], "name": "Amazon"},
    "microsoft": {"legit_domains": ["microsoft.com", "live.com", "outlook.com", "office.com"], "name": "Microsoft"},
    "apple": {"legit_domains": ["apple.com", "icloud.com"], "name": "Apple"},
    "paypal": {"legit_domains": ["paypal.com"], "name": "PayPal"},
    "whatsapp": {"legit_domains": ["whatsapp.com", "wa.me"], "name": "WhatsApp"},
    "instagram": {"legit_domains": ["instagram.com"], "name": "Instagram"},
    "netflix": {"legit_domains": ["netflix.com"], "name": "Netflix"},
}

# Sensitive credential / login keywords in path
SUSPICIOUS_PATH_KEYWORDS = [
    "login", "signin", "verify", "verification", "secure", "update",
    "kyc", "pan", "aadhaar", "banking", "authenticate", "account-recovery",
    "confirm", "wallet", "claim", "reward", "recharge", "free-recharge"
]

class UrlAnalyzer:
    """
    Strictly passive lexical and structural inspector.
    CRITICAL: Never opens, connects, resolves, or sends HTTP requests to URLs.
    """

    DISCLAIMER = "Spectra inspects the URL structure without opening or visiting the submitted website."

    @staticmethod
    def extract_urls(text: str) -> List[str]:
        """Extract URLs from text, safely stripped of punctuation."""
        pattern = re.compile(
            r'(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"\'{}|\\^`]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|org|net|in|co\.in|xyz|top|live|online|site|club|app|io|ai|tech|me|info|biz|cc|tv|us|uk|ru|cn)[^\s<>"\'{}|\\^`]*',
            re.IGNORECASE
        )
        matches = pattern.findall(text)
        cleaned = []
        punctuation_strip = ".,;:?!\"')]> \t\r\n"
        for m in matches:
            u = m.strip(punctuation_strip)
            if not u.startswith(("http://", "https://", "ftp://")):
                u = "http://" + u
            if u not in cleaned:
                cleaned.append(u)
        return cleaned

    def parse_domain_parts(self, hostname: str) -> Tuple[str, str, str]:
        """
        Extract (subdomain, registrable_domain, tld).
        E.g., 'login.sbi.co.in' -> ('login', 'sbi.co.in', 'co.in')
        'verify.paypal-update.xyz' -> ('verify', 'paypal-update.xyz', 'xyz')
        """
        host = hostname.lower().strip()
        # Check known multi-level TLDs first
        for multi_tld in KNOWN_MULTI_TLDS:
            if host.endswith("." + multi_tld):
                tld = multi_tld
                prefix = host[:-len(multi_tld)-1]
                parts = prefix.split(".")
                domain_name = parts[-1]
                registrable_domain = f"{domain_name}.{tld}"
                subdomain = ".".join(parts[:-1]) if len(parts) > 1 else ""
                return subdomain, registrable_domain, tld

        # Single level TLD
        parts = host.split(".")
        if len(parts) >= 2:
            tld = parts[-1]
            domain_name = parts[-2]
            registrable_domain = f"{domain_name}.{tld}"
            subdomain = ".".join(parts[:-2]) if len(parts) > 2 else ""
            return subdomain, registrable_domain, tld

        return "", host, ""

    def inspect_url(self, raw_url: str) -> Dict[str, Any]:
        """
        Performs in-depth passive inspection on a single URL.
        Returns:
            - url: clean url
            - risk: 'SAFE' | 'SUSPICIOUS' | 'HIGH'
            - reason: summary explanation
            - evidence: List[EvidenceItem]
            - score_delta: int
            - details: Dict with structural breakdown
        """
        # Ensure scheme for standard parsing
        target_url = raw_url.strip()
        if not target_url.startswith(("http://", "https://", "ftp://")):
            target_url = "http://" + target_url

        try:
            parsed = urlparse(target_url)
        except Exception:
            return {
                "url": raw_url,
                "risk": "SUSPICIOUS",
                "reason": "Malformed URL syntax",
                "evidence": [EvidenceItem(phrase=raw_url, reason="Malformed URL syntax", severity="MEDIUM")],
                "score_delta": 20,
                "details": {"disclaimer": self.DISCLAIMER}
            }

        hostname = (parsed.hostname or "").lower()
        path = unquote(parsed.path or "")
        query = unquote(parsed.query or "")
        scheme = parsed.scheme.lower()
        port = parsed.port

        score = 0
        evidence: List[EvidenceItem] = []
        flags = []

        # 1. IP-based host check
        is_ip = False
        try:
            ipaddress.ip_address(hostname)
            is_ip = True
            score += 35
            flags.append("IP_HOST")
            evidence.append(EvidenceItem(
                phrase=hostname,
                reason="Direct IP address host used instead of registered domain name",
                severity="HIGH"
            ))
        except ValueError:
            pass

        # 2. Punycode / IDN Homoglyph spoofing
        if hostname.startswith("xn--"):
            score += 30
            flags.append("PUNYCODE_DOMAIN")
            evidence.append(EvidenceItem(
                phrase=hostname,
                reason="Punycode encoding detected, commonly used in homoglyph lookalike attacks",
                severity="HIGH"
            ))

        # 2b. Missing TLD / Malformed Host
        if "." not in hostname and not is_ip:
            score += 25
            flags.append("MALFORMED_HOST")
            evidence.append(EvidenceItem(
                phrase=raw_url,
                reason="Invalid or missing domain extension in URL structure",
                severity="MEDIUM"
            ))

        subdomain, registrable_domain, tld = self.parse_domain_parts(hostname)

        # 3. URL Shortener check
        if registrable_domain in URL_SHORTENERS:
            score += 25
            flags.append("URL_SHORTENER")
            evidence.append(EvidenceItem(
                phrase=registrable_domain,
                reason="URL shortener conceals the true landing page destination",
                severity="MEDIUM"
            ))

        # 4. Suspicious / Abused TLD
        if tld in SUSPICIOUS_TLDS:
            score += 25
            flags.append("SUSPICIOUS_TLD")
            evidence.append(EvidenceItem(
                phrase=f".{tld}",
                reason=f"High-risk top-level domain (.{tld}) with disproportionate association with scam campaigns",
                severity="HIGH"
            ))

        # 4b. Sensitive / credential keywords combined with suspicious TLD or IP
        has_sensitive_kw = any(kw in hostname or kw in path.lower() or kw in query.lower() for kw in SUSPICIOUS_PATH_KEYWORDS)
        if has_sensitive_kw and (tld in SUSPICIOUS_TLDS or is_ip):
            score += 30
            flags.append("SENSITIVE_KEYWORD_ON_SUSPICIOUS_TLD")
            evidence.append(EvidenceItem(
                phrase=hostname,
                reason=f"Credential or account security keyword hosted on high-risk domain (.{tld})",
                severity="HIGH"
            ))

        # 5. Excessive subdomains
        subdomain_count = len([s for s in subdomain.split(".") if s])
        if subdomain_count >= 3:
            score += 20
            flags.append("EXCESSIVE_SUBDOMAINS")
            evidence.append(EvidenceItem(
                phrase=subdomain,
                reason=f"Excessive subdomain nesting ({subdomain_count} levels) used to disguise illegitimate domains",
                severity="HIGH"
            ))

        # 6. Brand Impersonation / Typosquatting
        for brand_key, brand_info in PROTECTED_BRANDS.items():
            # Check if brand token is in hostname
            if brand_key in hostname:
                # Is the registrable domain legitimate for this brand?
                is_legit = any(registrable_domain == legit or registrable_domain.endswith("." + legit) for legit in brand_info["legit_domains"])
                if not is_legit:
                    score += 40
                    flags.append("BRAND_IMPERSONATION")
                    evidence.append(EvidenceItem(
                        phrase=hostname,
                        reason=f"Possible brand spoofing targeting {brand_info['name']} under unauthorized domain '{registrable_domain}'",
                        severity="HIGH"
                    ))
                    break

        # 7. Unencrypted HTTP with sensitive actions
        has_sensitive_path = any(kw in path.lower() or kw in query.lower() for kw in SUSPICIOUS_PATH_KEYWORDS)
        if scheme == "http" and (has_sensitive_path or is_ip):
            score += 20
            flags.append("UNENCRYPTED_SENSITIVE_HTTP")
            evidence.append(EvidenceItem(
                phrase=target_url[:60],
                reason="Unencrypted HTTP protocol transmitting sensitive authentication or account keywords",
                severity="HIGH"
            ))

        # 8. Non-standard ports (e.g. :8080, :8888, :4443)
        if port and port not in (80, 443):
            score += 15
            flags.append("NON_STANDARD_PORT")
            evidence.append(EvidenceItem(
                phrase=f":{port}",
                reason=f"Unusual web server port (:{port}) bypasses standard security filters",
                severity="MEDIUM"
            ))

        # 9. Credential leakage tokens in query parameters
        if re.search(r'\b(?:token|session|otp|pwd|password|wallet_key|private_key)=[^\s&]+', query, re.IGNORECASE):
            score += 40
            flags.append("CREDENTIAL_QUERY_PARAM")
            evidence.append(EvidenceItem(
                phrase="credential query parameters",
                reason="Plaintext credential, OTP, or token parameter found in query string",
                severity="HIGH"
            ))

        # Determine risk
        if score >= 50 or "BRAND_IMPERSONATION" in flags or "IP_HOST" in flags or "PUNYCODE_DOMAIN" in flags or "CREDENTIAL_QUERY_PARAM" in flags:
            risk = "HIGH"
            primary_reason = evidence[0].reason if evidence else "Critical phishing indicators identified in URL"
        elif score >= 20:
            risk = "SUSPICIOUS"
            primary_reason = evidence[0].reason if evidence else "Suspicious domain structure detected"
        else:
            risk = "SAFE"
            primary_reason = "Standard domain structure with no prominent phishing anomalies"

        return {
            "url": raw_url,
            "risk": risk,
            "reason": primary_reason,
            "evidence": evidence,
            "score_delta": score,
            "details": {
                "hostname": hostname,
                "registrable_domain": registrable_domain,
                "tld": tld,
                "subdomain": subdomain,
                "scheme": scheme,
                "flags": flags,
                "disclaimer": self.DISCLAIMER
            }
        }
