import re
from urllib.parse import urlparse
from typing import List
from models import UrlRiskItem

# URL detection pattern
URL_REGEX = re.compile(
    r'(?:(?:https?|ftp)://|www\.)[^\s/$.?#].[^\s]*',
    re.IGNORECASE
)

SUSPICIOUS_TLDS = {
    'xyz', 'top', 'click', 'win', 'tk', 'ml', 'ga', 'cf', 'gq', 'buzz',
    'club', 'work', 'date', 'racing', 'download', 'review', 'country',
    'kim', 'cricket', 'science', 'party', 'gdn', 'mom', 'loan'
}

POPULAR_BRANDS = [
    'paypal', 'google', 'apple', 'microsoft', 'netflix', 'amazon',
    'chase', 'wellsfargo', 'bankofamerica', 'citibank', 'facebook',
    'instagram', 'whatsapp', 'telegram', 'binance', 'coinbase', 'sbi',
    'hdfc', 'icici', 'axis', 'paytm'
]

IP_REGEX = re.compile(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')

class UrlInspector:
    """
    PASSIVE URL Inspector.
    CRITICAL SECURITY RULE:
    Never makes outbound network connections, never pings, and never navigates to URLs.
    Purely inspects lexical and structural indicators.
    """

    @staticmethod
    def extract_urls(text: str) -> List[str]:
        raw_urls = URL_REGEX.findall(text)
        cleaned = []
        for u in raw_urls:
            # Strip trailing punctuation often caught in regex
            u = u.rstrip('.,;:?!"\')]>')
            if not u.startswith(('http://', 'https://')):
                u = 'http://' + u
            if u not in cleaned:
                cleaned.append(u)
        return cleaned

    @classmethod
    def inspect(cls, url: str) -> UrlRiskItem:
        parsed = urlparse(url)
        hostname = (parsed.hostname or '').lower()
        reasons = []
        risk_level = "SAFE"

        # 1. IP address hostname check
        if IP_REGEX.match(hostname):
            reasons.append("Uses raw IP address instead of domain name")
            risk_level = "HIGH"

        # 2. Scheme check (HTTP vs HTTPS)
        if parsed.scheme == 'http':
            reasons.append("Unencrypted connection (HTTP)")
            if risk_level != "HIGH":
                risk_level = "SUSPICIOUS"

        # 3. Suspicious TLD check
        tld = hostname.split('.')[-1] if '.' in hostname else ''
        if tld in SUSPICIOUS_TLDS:
            reasons.append(f"Uses high-risk top-level domain (.{tld}) commonly associated with spam")
            risk_level = "HIGH"

        # 4. Brand impersonation in domain/subdomain
        parts = hostname.split('.')
        subdomains = parts[:-2] if len(parts) > 2 else []
        main_domain = parts[-2] if len(parts) >= 2 else hostname

        for brand in POPULAR_BRANDS:
            if brand in hostname:
                # Brand is present, but is it the actual brand domain?
                is_official = (main_domain == brand)
                if not is_official:
                    reasons.append(f"Possible brand spoofing/impersonation of '{brand}'")
                    risk_level = "HIGH"

        # 5. Excessive subdomains
        if len(subdomains) >= 3:
            reasons.append("Excessive subdomain depth often used in obfuscation")
            if risk_level != "HIGH":
                risk_level = "SUSPICIOUS"

        # 6. Sensitive keywords in path/query
        path_query = (parsed.path + ' ' + parsed.query).lower()
        for kw in ['verify', 'login', 'update', 'account', 'banking', 'secure', 'password', 'otp', 'claim']:
            if kw in path_query:
                reasons.append(f"Path contains sensitive action keyword: '{kw}'")
                if risk_level == "SAFE":
                    risk_level = "SUSPICIOUS"
                break

        # 7. @ symbol in URL (credential injection)
        if '@' in url:
            reasons.append("URL contains '@' symbol, which can redirect user unexpectedly")
            risk_level = "HIGH"

        reason_text = "; ".join(reasons) if reasons else "No obvious domain anomalies detected passively."
        return UrlRiskItem(
            url=url,
            risk=risk_level,
            reason=reason_text
        )
