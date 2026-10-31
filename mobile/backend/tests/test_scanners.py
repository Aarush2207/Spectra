import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.text_analyzer import TextAnalyzer
from app.services.url_analyzer import UrlAnalyzer
from app.services.risk_engine import RiskEngine

def test_text_scenarios():
    analyzer = TextAnalyzer()
    print("\n--- RUNNING TEXT SCENARIOS ---")

    test_cases = [
        # (Input text, expected_high_risk, expected_advisory, description)
        ("Share your OTP immediately or your account will be blocked.", True, False, "Fake OTP theft with urgency"),
        ("Never share your OTP with anyone under any circumstances.", False, True, "Legitimate OTP safety warning"),
        ("Congratulations! You have won KBC lottery of ₹25,00,000. Claim your prize now.", True, False, "Fake lottery prize scam"),
        ("Pay delivery fee immediately to release your parcel held at customs.", True, False, "Fake courier fee scam"),
        ("Your parcel will arrive tomorrow between 2 PM and 5 PM.", False, False, "Normal delivery notification"),
        ("Part-time job: earn ₹5000 daily by liking videos. Pay registration fee to start.", True, False, "Fake job registration fee scam"),
        ("We would like to invite you for an interview for the Software Engineer role on Monday.", False, False, "Legitimate job invitation"),
        ("Your SBI account KYC has expired. Complete your KYC update immediately or card will be blocked.", True, False, "Fake KYC bank threat"),
        ("Hey, are you free this evening for coffee?", False, False, "Normal conversation"),
        ("Turant paise bhejo warna account block ho jayega aur police complaint hogi.", True, False, "Hinglish phishing threat"),
    ]

    passed = 0
    for text, should_be_high, should_be_adv, desc in test_cases:
        res = analyzer.analyze(text)
        is_adv = res["is_advisory"]
        score = res["score_delta"]
        is_high = score >= 50

        # Evaluate risk engine response
        eval_res = RiskEngine.evaluate(rule_findings=res)

        if should_be_adv:
            assert is_adv, f"Failed: Expected advisory for '{desc}'"
            assert eval_res.risk_level == "LOW", f"Failed: Advisory must be LOW risk, got {eval_res.risk_level}"
        elif should_be_high:
            assert eval_res.risk_level == "HIGH", f"Failed: Expected HIGH risk for '{desc}', got {eval_res.risk_level} (score: {eval_res.risk_score})"
        else:
            assert eval_res.risk_level != "HIGH", f"Failed: Legitimate content must NOT be HIGH risk for '{desc}', got {eval_res.risk_level}"

        print(f"  [PASS] {desc} -> Risk: {eval_res.risk_level} (Score: {eval_res.risk_score}, Advisory: {is_adv})")
        passed += 1

    print(f"Text scenarios passed: {passed}/{len(test_cases)}")

def test_url_scenarios():
    analyzer = UrlAnalyzer()
    print("\n--- RUNNING URL SCENARIOS ---")

    test_cases = [
        # (url, expected_risk, description)
        ("https://www.google.com/search?q=flutter", "SAFE", "Normal HTTPS URL"),
        ("http://192.168.1.1/login", "HIGH", "IP-based URL with login path"),
        ("http://paypal-security-update.xyz/verify", "HIGH", "Lookalike brand domain with suspicious TLD"),
        ("https://secure-login.buzz/account", "HIGH", "Suspicious TLD (.buzz) with credential path"),
        ("http://login.verify.update.security.sbi.evil.com/auth", "HIGH", "Excessive subdomains with bank spoofing"),
        ("https://bit.ly/3xYz9AB", "SUSPICIOUS", "Shortened URL concealing destination"),
        ("http://xn--80ak6aa92e.com", "HIGH", "Punycode / Homoglyph domain"),
        ("not_a_valid_url", "SUSPICIOUS", "Malformed URL structure"),
        ("https://example.com/checkout?token=secret123&otp=9988", "HIGH", "Suspicious credential query parameter"),
        ("https://accounts.google.com/signin", "SAFE", "Legitimate Google sign-in URL"),
    ]

    passed = 0
    for url, exp_risk, desc in test_cases:
        res = analyzer.inspect_url(url)
        risk = res["risk"]
        eval_res = RiskEngine.evaluate(url_findings=[res])

        if exp_risk == "SAFE":
            assert eval_res.risk_level == "LOW", f"Failed: Expected SAFE/LOW for '{desc}', got {eval_res.risk_level}"
        elif exp_risk == "HIGH":
            assert eval_res.risk_level == "HIGH", f"Failed: Expected HIGH for '{desc}', got {eval_res.risk_level}"
        else:
            assert eval_res.risk_level in ("SUSPICIOUS", "HIGH"), f"Failed: Expected suspicious for '{desc}', got {eval_res.risk_level}"

        print(f"  [PASS] {desc} -> Inspection: {risk}, Engine: {eval_res.risk_level} (Score: {eval_res.risk_score})")
        passed += 1

    print(f"URL scenarios passed: {passed}/{len(test_cases)}")

if __name__ == "__main__":
    test_text_scenarios()
    test_url_scenarios()
    print("\nALL SCANNER SCENARIOS PASSED SUCCESSFULLY!")
