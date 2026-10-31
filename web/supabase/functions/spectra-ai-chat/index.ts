// Supabase Edge Function: spectra-ai-chat
// Securely proxies AI chat requests to Nemotron (OpenRouter), Google Gemini, or OpenAI.
// All provider API keys remain server-side exclusively in Supabase Secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

// ---------------------------------------------------------------------------
// Environment Helper (Supports Deno and Node for testing)
// ---------------------------------------------------------------------------
function getEnv(key: string): string | undefined {
  try {
    // @ts-ignore: Deno global
    if (typeof Deno !== "undefined" && Deno.env) {
      // @ts-ignore
      return Deno.env.get(key);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== "undefined" && process.env) {
      return process.env[key];
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Standard Error Codes
// ---------------------------------------------------------------------------
export type AIErrorCode =
  | "AI_CONFIGURATION_ERROR"
  | "AI_AUTHENTICATION_ERROR"
  | "AI_RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_RESPONSE"
  | "AI_TIMEOUT";

// ---------------------------------------------------------------------------
// CORS Headers
// ---------------------------------------------------------------------------
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Rate Limiter (In-Memory per isolate)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

// ---------------------------------------------------------------------------
// Response Builders
// ---------------------------------------------------------------------------
export function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  errorCode: AIErrorCode = "AI_PROVIDER_ERROR",
  details?: Record<string, unknown>
): Response {
  return jsonResponse(
    {
      success: false,
      error: message,
      errorCode,
      ...(details ? { details } : {}),
    },
    status
  );
}

// ---------------------------------------------------------------------------
// Specialist System Prompt
// ---------------------------------------------------------------------------
export const SYSTEM_PROMPT = `You are Spectra Intelligence, a specialised cybersecurity AI assistant focused exclusively on scam detection, digital fraud prevention, and social engineering analysis.

CORE EXPERTISE:
- Phishing & smishing identification (SMS, email, messaging apps)
- Banking, UPI, OTP, and wire-transfer fraud recognition
- Impersonation of legitimate institutions (banks, government, couriers, employers)
- Fake job offers, lottery/prize scams, crypto investment schemes
- Malicious urgency, intimidation, and coercive psychological manipulation
- Suspicious domain and URL evaluation (structure, typosquatting, shorteners)

RESPONSE FORMAT:
You MUST respond with a valid JSON object matching this exact schema:
{
  "reply": "<Comprehensive security advice, technical breakdown, or conversational answer in clear markdown>",
  "riskLevel": "low" | "medium" | "high" | "critical" | "unknown",
  "keyIndicators": ["<Specific suspicious pattern, urgency cue, or safety observation>"],
  "recommendations": ["<Actionable, concrete step the user should take right now>"],
  "evidence": [
    {
      "indicator": "<Extracted suspicious phrase, domain, or pattern>",
      "explanation": "<Why this indicator suggests risk or safety>"
    }
  ],
  "disclaimer": "AI-generated security guidance. Verify through official channels before acting."
}

GUIDELINES:
1. RISK LEVELS:
   - "low": Legitimate communication or general educational query. No scam indicators.
   - "medium": Suspicious or ambiguous elements present. Exercise caution.
   - "high": High-probability scam; classic phishing, deceptive branding, or urgent demand.
   - "critical": Definitive scam actively attempting credential harvesting, funds transfer, or OTP theft.
   - "unknown": Ambiguous or insufficient context to determine safety.

2. CONVERSATIONAL & EDUCATIONAL QUESTIONS:
   - If the user asks a general question (e.g., "What is phishing?", "How do UPI scams work?"), provide a clear, helpful, well-structured educational answer in the "reply" field.
   - Set "riskLevel" to "low".
   - Keep "keyIndicators" and "evidence" concise or empty if no specific message is being evaluated.
   - Provide preventative security best practices in "recommendations".

3. DETECTION ENGINE INTEGRATION:
   - When "DETECTION ENGINE FINDINGS" are included in the prompt, treat them as deterministic baseline evidence.
   - Build upon those findings, citing confirmed threat indicators.
   - Never contradict deterministic technical evidence without justification.

4. SAFETY & INTEGRITY:
   - Never fabricate URL reputation or verify external databases you cannot reach.
   - Never instruct users to click suspicious links or reply to suspicious senders.`;

// ---------------------------------------------------------------------------
// Conversation Message Interface
// ---------------------------------------------------------------------------
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Provider & Model Resolution Helper
// Handles Nemotron, OpenRouter, Gemini, and OpenAI transparently
// ---------------------------------------------------------------------------
export function resolveProviderAndModel(
  rawModel: string,
  apiKey: string,
  rawBaseUrl?: string
): { provider: "openrouter" | "openai" | "gemini"; model: string; baseUrl?: string } {
  let model = (rawModel || "").trim();
  const lowerModel = model.toLowerCase();
  const isOpenRouterKey = apiKey.startsWith("sk-or-");
  const isNemotron = lowerModel.includes("nemotron");

  let provider: "openrouter" | "openai" | "gemini";
  let baseUrl = rawBaseUrl;

  if (isOpenRouterKey || isNemotron || rawBaseUrl?.includes("openrouter")) {
    provider = "openrouter";
    if (!baseUrl) {
      baseUrl = "https://openrouter.ai/api/v1";
    }
  } else if (
    model.startsWith("gpt-") ||
    model.startsWith("o1-") ||
    model.startsWith("o3-") ||
    rawBaseUrl?.includes("openai.com")
  ) {
    provider = "openai";
    if (!baseUrl) {
      baseUrl = "https://api.openai.com/v1";
    }
  } else {
    // Default: Gemini
    provider = "gemini";
    if (!model) {
      model = "gemini-2.0-flash";
    }
  }

  // Model ID Normalization:
  // Handles names like "Nemotron 3.5 Super VL (free)" -> "nvidia/nemotron-3.5-super-vl:free"
  if (isNemotron) {
    if (lowerModel.includes("lightning")) {
      model = "nvidia/nemotron-3.5-lightning:free";
    } else if (lowerModel.includes("safety")) {
      model = "nvidia/nemotron-3.5-content-safety:free";
    } else {
      model = "nvidia/nemotron-3.5-super-vl:free";
    }
  } else if (provider === "gemini") {
    model = model.replace(/^models\//i, "");
  }

  return { provider, model, baseUrl };
}

// ---------------------------------------------------------------------------
// Gemini Payload Builder (with strict alternation sanitization)
// ---------------------------------------------------------------------------
export function formatGeminiContents(
  messages: ConversationMessage[],
  currentMessage: string
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    const text = (msg.content || "").trim();
    if (!text) continue;

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  while (contents.length > 0 && contents[0].role === "model") {
    contents.shift();
  }

  const userText = currentMessage.trim();
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts[0].text += `\n\n${userText}`;
  } else {
    contents.push({ role: "user", parts: [{ text: userText }] });
  }

  return contents;
}

export function buildGeminiPayload(
  messages: ConversationMessage[],
  currentMessage: string,
  systemPrompt: string,
  model: string
) {
  const cleanModel = model.replace(/^models\//i, "");
  const contents = formatGeminiContents(messages, currentMessage);

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`,
    body: {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// OpenAI / OpenRouter Payload Builder
// ---------------------------------------------------------------------------
export function buildOpenAIPayload(
  messages: ConversationMessage[],
  currentMessage: string,
  systemPrompt: string,
  model: string,
  baseUrl?: string
) {
  const formattedMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const m of messages) {
    const text = (m.content || "").trim();
    if (!text) continue;
    formattedMessages.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: text,
    });
  }

  formattedMessages.push({
    role: "user",
    content: currentMessage.trim(),
  });

  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : "https://api.openai.com/v1";

  return {
    url: `${base}/chat/completions`,
    body: {
      model,
      messages: formattedMessages,
      temperature: 0.2,
      max_tokens: 4096,
    },
  };
}

// ---------------------------------------------------------------------------
// Robust JSON Extraction (strips Markdown code fences & handles partial JSON)
// ---------------------------------------------------------------------------
export function extractJsonPayload(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // 2. Strip Markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  // 3. Search for outermost { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  // 4. Handle partially streamed or unclosed JSON with "reply": "..."
  const replyMatch = trimmed.match(/"reply"\s*:\s*"([\s\S]*)/i);
  if (replyMatch && replyMatch[1]) {
    let cleanReply = replyMatch[1];
    const nextKeyIndex = cleanReply.search(/",\s*"[a-zA-Z0-9_]+"\s*:/);
    if (nextKeyIndex !== -1) {
      cleanReply = cleanReply.substring(0, nextKeyIndex);
    } else {
      cleanReply = cleanReply.replace(/"\s*,?\s*\}?\s*$/, "");
    }
    cleanReply = cleanReply.replace(/\\n/g, "\n").replace(/\\"/g, '"');
    if (cleanReply.trim()) {
      return {
        reply: cleanReply.trim(),
        riskLevel: "low",
        keyIndicators: [],
        recommendations: ["Always double-check sender details through verified channels."],
        evidence: [],
        disclaimer: "AI-generated security guidance. Verify through official channels before acting.",
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Response Normalization to Expected Schema
// ---------------------------------------------------------------------------
export function normalizeRiskLevel(val: unknown): "low" | "medium" | "high" | "critical" | "unknown" {
  if (typeof val !== "string") return "unknown";
  const lower = val.toLowerCase().trim();
  if (lower === "low") return "low";
  if (lower === "medium" || lower === "suspicious") return "medium";
  if (lower === "high") return "high";
  if (lower === "critical") return "critical";
  return "unknown";
}

export function buildSafeAIResponse(
  rawParsed: Record<string, unknown> | null,
  rawText: string,
  model: string,
  provider: string
) {
  if (rawParsed && typeof rawParsed === "object") {
    const reply = typeof rawParsed.reply === "string" && rawParsed.reply.trim()
      ? rawParsed.reply.trim()
      : rawText.trim() || "No detailed advisory provided.";

    const riskLevel = normalizeRiskLevel(rawParsed.riskLevel);
    const keyIndicators = Array.isArray(rawParsed.keyIndicators)
      ? rawParsed.keyIndicators.filter((x): x is string => typeof x === "string")
      : [];
    const recommendations = Array.isArray(rawParsed.recommendations)
      ? rawParsed.recommendations.filter((x): x is string => typeof x === "string")
      : [];
    const evidence = Array.isArray(rawParsed.evidence)
      ? rawParsed.evidence.filter((x): x is { indicator: string; explanation: string } => 
          Boolean(x && typeof x.indicator === "string" && typeof x.explanation === "string")
        )
      : [];
    const disclaimer = typeof rawParsed.disclaimer === "string" && rawParsed.disclaimer.trim()
      ? rawParsed.disclaimer.trim()
      : "AI-generated security guidance. Verify through official channels before acting.";

    const dataObj = {
      reply,
      riskLevel,
      keyIndicators,
      recommendations,
      evidence,
      disclaimer,
    };

    return {
      success: true,
      ...dataObj,
      data: dataObj, // Backward compatibility with existing frontend
      model,
      provider,
    };
  }

  // Model produced raw text instead of JSON: Wrap cleanly so user still gets answer
  const fallbackReply = rawText.trim() || "I evaluated your inquiry. No immediate scam indicators detected.";
  const dataObj = {
    reply: fallbackReply,
    riskLevel: "low" as const,
    keyIndicators: [],
    recommendations: ["Always double-check sender details through verified channels."],
    evidence: [],
    disclaimer: "AI-generated security guidance. Verify through official channels before acting.",
  };

  return {
    success: true,
    ...dataObj,
    data: dataObj,
    model,
    provider,
  };
}

// ---------------------------------------------------------------------------
// Main Edge Function Handler
// ---------------------------------------------------------------------------
export async function handleRequest(req: Request): Promise<Response> {
  const startTime = Date.now();

  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405, "AI_INVALID_RESPONSE");
  }

  // 2. Parse Request JSON
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.error("[Spectra-AI] Request JSON parse failed");
    return errorResponse("Invalid JSON request body.", 400, "AI_INVALID_RESPONSE");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationHistory = Array.isArray(body.conversationHistory)
    ? (body.conversationHistory as ConversationMessage[])
    : [];
  const scannerContext = body.scannerContext && typeof body.scannerContext === "object"
    ? (body.scannerContext as Record<string, unknown>)
    : undefined;

  if (!message && !scannerContext) {
    return errorResponse("Message or scanner context is required.", 400, "AI_INVALID_RESPONSE");
  }

  if (message.length > 10_000) {
    return errorResponse("Message exceeds maximum length of 10,000 characters.", 400, "AI_INVALID_RESPONSE");
  }

  if (conversationHistory.length > 50) {
    return errorResponse("Conversation history exceeds maximum of 50 messages.", 400, "AI_INVALID_RESPONSE");
  }

  // 3. User Identification & Rate Limiting
  const authHeader = req.headers.get("authorization") || "";
  let userId = "guest";

  if (authHeader.startsWith("Bearer ")) {
    try {
      const supabaseUrl = getEnv("SUPABASE_URL") || "";
      const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.id) {
          userId = user.id;
        }
      }
    } catch {
      // Diagnostic log without tokens
      console.warn("[Spectra-AI] Auth token verification skipped or failed, proceeding as guest");
    }
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "unknown-ip";
  const rateLimitKey = userId !== "guest" ? `user:${userId}` : `ip:${clientIp}`;

  if (!checkRateLimit(rateLimitKey)) {
    console.warn(`[Spectra-AI] Rate limit exceeded for ${userId !== "guest" ? "user" : "guest"}`);
    return errorResponse(
      "Rate limit exceeded. Please wait a moment before sending more messages.",
      429,
      "AI_RATE_LIMITED"
    );
  }

  // 4. Retrieve AI Configuration
  const apiKey = getEnv("AI_API_KEY") || 
                 getEnv("OPENROUTER_API_KEY") || 
                 getEnv("OPENAI_API_KEY") || 
                 getEnv("GEMINI_API_KEY");
  const rawModel = getEnv("AI_MODEL") || "Nemotron 3.5 Super VL (free)";
  const rawBaseUrl = getEnv("AI_BASE_URL") || getEnv("OPENAI_BASE_URL");

  if (!apiKey) {
    console.error("[Spectra-AI] AI_API_KEY is not configured in environment/secrets");
    return errorResponse(
      "AI provider API key is not configured in Supabase Edge Function Secrets. Please set AI_API_KEY.",
      503,
      "AI_CONFIGURATION_ERROR",
      { hint: "Run 'npx supabase secrets set AI_API_KEY=...' or set it in the Supabase Dashboard." }
    );
  }

  // Resolve Provider, Model, and BaseUrl
  const { provider, model, baseUrl } = resolveProviderAndModel(rawModel, apiKey, rawBaseUrl);
  console.log(`[Spectra-AI] Invoking provider='${provider}', model='${model}', user='${userId === "guest" ? "guest" : "authenticated"}'`);

  // 5. Build Enriched Prompt with Detection Engine Context
  let enrichedUserMessage = message;
  if (scannerContext) {
    const parts: string[] = [];
    parts.push("\n\n--- DETECTION ENGINE FINDINGS (Deterministic Security Analysis) ---");
    if (scannerContext.riskLevel) parts.push(`Risk Level: ${scannerContext.riskLevel}`);
    if (scannerContext.riskScore !== undefined) parts.push(`Risk Score: ${scannerContext.riskScore}/100`);
    if (scannerContext.confidence !== undefined) parts.push(`Certainty: ${scannerContext.confidence}%`);
    if (scannerContext.summary) parts.push(`Summary: ${scannerContext.summary}`);

    const evidenceList = scannerContext.evidence as Array<Record<string, unknown>> | undefined;
    if (evidenceList && evidenceList.length > 0) {
      parts.push("Technical Indicators Detected:");
      for (const ev of evidenceList) {
        parts.push(`  - [${ev.category || "GENERAL"}] "${ev.phrase || ""}": ${ev.explanation || ""}`);
      }
    }

    const urlFindings = scannerContext.urlFindings as Array<Record<string, unknown>> | undefined;
    if (urlFindings && urlFindings.length > 0) {
      parts.push("URL Findings:");
      for (const u of urlFindings) {
        const reasons = Array.isArray(u.reasons) ? u.reasons.join("; ") : "";
        parts.push(`  - URL: ${u.rawUrl} (Rating: ${u.riskRating}) ${reasons}`);
      }
    }

    const cognitiveTactics = scannerContext.cognitiveTactics as Array<Record<string, unknown>> | undefined;
    if (cognitiveTactics && cognitiveTactics.length > 0) {
      parts.push("Cognitive Manipulation Tactics:");
      for (const t of cognitiveTactics) {
        parts.push(`  - ${t.name}: ${t.rationale}`);
      }
    }

    if (scannerContext.inputContent) {
      parts.push(`\nAnalyzed Text Excerpt:\n"${String(scannerContext.inputContent).slice(0, 2000)}"`);
    }

    parts.push("--- END DETECTION ENGINE FINDINGS ---");
    enrichedUserMessage = (message || "Please analyze these threat findings and provide detailed security guidance.") + parts.join("\n");
  }

  // 6. Build Provider Request
  let requestUrl: string;
  let requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
  let requestBody: Record<string, unknown>;

  if (provider === "openrouter" || provider === "openai") {
    const payload = buildOpenAIPayload(
      conversationHistory.slice(-20),
      enrichedUserMessage,
      SYSTEM_PROMPT,
      model,
      baseUrl
    );
    requestUrl = payload.url;
    requestBody = payload.body;
    requestHeaders["Authorization"] = `Bearer ${apiKey}`;
    if (provider === "openrouter") {
      requestHeaders["HTTP-Referer"] = "https://spectra.security";
      requestHeaders["X-Title"] = "Spectra AI Scam Intelligence";
    }
  } else {
    // Gemini
    const payload = buildGeminiPayload(
      conversationHistory.slice(-20),
      enrichedUserMessage,
      SYSTEM_PROMPT,
      model
    );
    requestUrl = `${payload.url}?key=${apiKey}`;
    requestBody = payload.body;
  }

  // 7. Execute AI Provider Request with 30s Timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  let rawText = "";

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[Spectra-AI] Provider HTTP status: ${response.status} (elapsed: ${Date.now() - startTime}ms)`);

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error(`[Spectra-AI] Provider returned HTTP ${response.status}:`, errText);

      if (response.status === 401 || response.status === 403) {
        return errorResponse(
          "AI provider authentication failed. Please check the AI_API_KEY secret in Supabase.",
          503,
          "AI_AUTHENTICATION_ERROR"
        );
      }
      if (response.status === 429) {
        return errorResponse(
          "AI provider rate limit reached or quota exhausted. Please try again in a few moments.",
          429,
          "AI_RATE_LIMITED"
        );
      }
      if (response.status === 404) {
        return errorResponse(
          `AI model '${model}' was not found by the provider. Please verify the AI_MODEL configuration.`,
          502,
          "AI_CONFIGURATION_ERROR"
        );
      }

      return errorResponse(
        `AI provider encountered an error (HTTP ${response.status}). Please try again later.`,
        502,
        "AI_PROVIDER_ERROR"
      );
    }

    const responseJson = await response.json();

    if (provider === "openrouter" || provider === "openai") {
      const choices = responseJson.choices as Array<Record<string, unknown>> | undefined;
      const messageObj = choices?.[0]?.message as Record<string, unknown> | undefined;
      rawText = typeof messageObj?.content === "string" ? messageObj.content : "";
    } else {
      // Gemini
      const candidates = responseJson.candidates as Array<Record<string, unknown>> | undefined;
      const contentObj = candidates?.[0]?.content as Record<string, unknown> | undefined;
      const parts = contentObj?.parts as Array<Record<string, unknown>> | undefined;
      rawText = typeof parts?.[0]?.text === "string" ? (parts[0].text as string) : "";
    }
  } catch (fetchErr: unknown) {
    clearTimeout(timeoutId);
    const err = fetchErr as Error;
    if (err.name === "AbortError") {
      console.error("[Spectra-AI] Provider request timed out (30s)");
      return errorResponse(
        "AI provider request timed out. Please try again with a shorter message.",
        504,
        "AI_TIMEOUT"
      );
    }
    console.error("[Spectra-AI] Network or fetch error:", err.message);
    return errorResponse(
      "Failed to connect to the AI service provider.",
      502,
      "AI_PROVIDER_ERROR"
    );
  }

  if (!rawText.trim()) {
    console.error("[Spectra-AI] Provider returned an empty response");
    return errorResponse(
      "AI provider returned an empty response. Please try rephrasing your message.",
      502,
      "AI_INVALID_RESPONSE"
    );
  }

  // 8. Parse JSON and Normalize Response
  const parsed = extractJsonPayload(rawText);
  if (!parsed) {
    console.warn("[Spectra-AI] Response was not valid JSON, returning formatted plain text fallback");
  }

  const finalResponse = buildSafeAIResponse(parsed, rawText, model, provider);
  return jsonResponse(finalResponse);
}

// ---------------------------------------------------------------------------
// Deno Entrypoint
// ---------------------------------------------------------------------------
// @ts-ignore
if (typeof Deno !== "undefined" && Deno.serve) {
  // @ts-ignore
  Deno.serve(handleRequest);
}
