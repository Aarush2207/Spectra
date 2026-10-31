# Spectra Scam Detection Backend API

Unified Python FastAPI backend providing multimodal scam detection, passive URL inspection, and OCR parsing for Spectra.

## Features
- **Text Scam Detection**: Rule-based heuristic analysis (OTP/password theft, fake KYC, lottery scams, job scams, courier fees) + Google Gemini AI contextual evaluation.
- **Multimodal OCR Image Scanner**: Extracts text from screenshots via OCR & Gemini Vision without permanent storage.
- **Passive URL Inspection**: Static lexical analysis of domain structures, brand spoofing (SBI, HDFC, PayPal, etc.), Punycode, IP hosts, and suspicious TLDs. **Never opens or visits submitted URLs.**
- **Unified Risk Engine**: Common 0-100 score calibrated into LOW (0-29), SUSPICIOUS (30-59), and HIGH (60-100) risk levels.
- **Supabase Cloud Sync**: Token verification and persistence to existing database tables.

---

## Getting Started

### 1. Requirements
- Python 3.10+
- Pip

### 2. Setup Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
SUPABASE_URL=https://lelmcuezksfeblhfrcmy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
HOST=0.0.0.0
PORT=8000
```

### 4. Run Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation will be available at:
`http://localhost:8000/docs`

---

## Endpoints
- `GET /api/health` - Health readiness check
- `POST /api/analyze/text` - Text scam analysis
- `POST /api/analyze/image` - Multipart screenshot OCR & multimodal scam analysis
- `POST /api/analyze/url` - Passive structural inspection of URLs (Zero external navigation)
