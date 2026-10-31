# SPECTRA — AI Scam Intelligence Platform (V4 Core)

> **See Beyond the Message.**  
> Spectra is an AI-powered scam intelligence and threat detection platform that identifies manipulative text messages, screenshot-based phishing, deceptive links, and social-engineering pretexts through multi-vector deterministic heuristics, optical OCR, and conversational AI.

---

## 🌟 Key Features

1. **Multimodal Scam Scanner**
   - **Text Inspection:** Identifies artificial urgency, credential harvesting, authority impersonation, and irreversible financial rails.
   - **Screenshot OCR:** Neural optical character recognition via Tesseract.js with client-side contrast optimization and character extraction.
   - **Safe Passive URL Analysis:** Decomposes links (Punycode, lookalike Cyrillic homoglyphs, brand subdomain spoofing, opaque shorteners, bare IP hosts) with **zero outbound SSRF requests**.
   - **Span-Level Evidence Highlighting:** Exact visual highlighting of manipulative phrases directly in the original message body.

2. **Spectra AI Threat Assistant**
   - Direct connection to the deterministic detection engine (`analyzeMessage`).
   - Generates structured risk classifications (`LOW`, `SUSPICIOUS`, `HIGH`, `CRITICAL`), warning signs, and actionable safety playbooks.
   - Answers general cybersecurity and educational queries conversantly without artificial risk inflation.
   - Bidirectional context transfer: easily discuss scanner results with Spectra AI or open chat results in the detailed scanner.

3. **Supabase Cloud Authentication & Persistence**
   - Complete integration with Supabase Auth (`public.profiles`, `public.scans`, `public.scan_evidence`, `public.scan_urls`, `public.scan_recommendations`).
   - Row-Level Security (RLS) policies guaranteeing personal vault isolation.
   - Seamless Guest Mode allows exploration without mandatory login.
   - First-visit welcome modal with Sign In and Sign Up workflows.

4. **Curated Evaluation Benchmark Suite**
   - 65 curated test vectors covering legitimate transactional notices and diverse threat archetypes (banking phish, delivery smishing, executive spoofing, check-cashing schemes, extortion).
   - Dynamically computes Accuracy, Precision, Recall, F1-Score, False Positive Rate, False Negative Rate, and Latency.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Framer Motion, Lucide Icons
- **Backend / Auth:** Supabase (`@supabase/supabase-js`)
- **Computer Vision / OCR:** Tesseract.js
- **Security:** Web Crypto API, client-isolated passive URL decomposition

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/Aarush2207/Spectra.git
cd Spectra
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://lelmcuezksfeblhfrcmy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_b7fhiEUZlkKjesrPt4qTPA_YdFDUxAo
NEXT_PUBLIC_SUPABASE_URL=https://lelmcuezksfeblhfrcmy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_b7fhiEUZlkKjesrPt4qTPA_YdFDUxAo
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm run preview
```

---

## 🔒 Security & Privacy

Spectra is built on the principle of client-first isolation:
- Unsolicited URLs are parsed offline using lexical grammar analysis; no network ping or HTTP GET is made to suspicious target servers.
- Passwords are never stored in plain text.
- User scans remain private under Row-Level Security policies in Supabase.
