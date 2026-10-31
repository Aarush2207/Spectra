# SPECTRA — AI Scam Intelligence Platform

> **See Beyond the Message.**  
> Spectra is an AI-powered multimodal scam detection platform that identifies phishing messages, fraudulent links, and digital impersonation using OCR, AI-driven analysis, rule-based detection, and safe passive URL inspection. It provides transparent risk assessments, evidence-based explanations, and actionable security recommendations.

**🌐 Live Platform Website:** [https://spectra-scam.vercel.app/](https://spectra-scam.vercel.app/)  
**💻 GitHub Repository:** [https://github.com/Aarush2207/Spectra](https://github.com/Aarush2207/Spectra)  
**📂 Web Application Source:** [`/web`](https://github.com/Aarush2207/Spectra/tree/main/web)  

---

## 📁 Repository Structure

```
Spectra/
├── backend/       # Backend API services
├── mobile/        # Mobile application (React Native / Flutter)
└── web/           # Spectra Web Application (React, Vite, Tailwind CSS, Supabase Edge Functions)
```

---

## 🌐 Web Application (`web/`)

The web client provides the full interactive Spectra experience:

- **Multimodal Scam Scanner:** Text & screenshot OCR scanning via Tesseract.js with real-time heuristic scoring.
- **Spectra AI Threat Assistant:** Secure AI integration through Supabase Edge Functions running NVIDIA Nemotron 3.5 Super VL via OpenRouter.
- **Zero Client-Side Secret Leakage:** AI API keys and models remain strictly in Supabase Edge Function Secrets.
- **Interactive 3D Nova Robot Experience:** Dynamic Three.js obsidian shards and responsive robot emotional states (`idle`, `thinking`, `alert`).
- **Comprehensive Benchmark Suite:** 65 curated real-world attack vectors with live confusion matrix and performance telemetry.
- **Supabase Cloud Vault:** Syncs scan history, user profiles, and threat logs with Row-Level Security (RLS).

### Quick Start for Web

```bash
cd web
npm install
npm run dev
```

For production builds:
```bash
npm run build
npm run preview
```
