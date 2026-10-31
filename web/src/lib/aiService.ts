/**
 * Spectra AI Service — Client layer for the spectra-ai-chat Supabase Edge Function.
 *
 * All AI API keys are stored exclusively in Supabase Edge Function Secrets.
 * This client never exposes API keys or internal credentials.
 */

import { supabase } from './supabase';
import { AnalysisResult } from '../types/index';
import { authService } from './authService';

// ---------------------------------------------------------------------------
// Standard Error Codes
// ---------------------------------------------------------------------------
export type AIErrorCode =
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_AUTHENTICATION_ERROR'
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_INVALID_RESPONSE'
  | 'AI_TIMEOUT';

export class AIServiceError extends Error {
  errorCode: AIErrorCode | string;
  status?: number;
  isPermanent: boolean;

  constructor(
    message: string,
    errorCode: AIErrorCode | string = 'AI_PROVIDER_ERROR',
    status?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.errorCode = errorCode;
    this.status = status;

    // Permanent errors should NOT be retried
    this.isPermanent =
      errorCode === 'AI_CONFIGURATION_ERROR' ||
      errorCode === 'AI_AUTHENTICATION_ERROR' ||
      errorCode === 'AI_RATE_LIMITED' ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 429;
  }
}

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIEvidenceItem {
  indicator: string;
  explanation: string;
}

export type AIRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export interface AIStructuredResponse {
  reply: string;
  riskLevel: AIRiskLevel;
  keyIndicators: string[];
  recommendations: string[];
  evidence: AIEvidenceItem[];
  disclaimer: string;
}

export interface AIChatResponse {
  success: boolean;
  reply: string;
  riskLevel: AIRiskLevel;
  keyIndicators: string[];
  recommendations: string[];
  evidence: AIEvidenceItem[];
  disclaimer: string;
  model: string;
  provider: string;
  data: AIStructuredResponse; // For backward compatibility with existing code
}

// ---------------------------------------------------------------------------
// Scanner Context Builder
// ---------------------------------------------------------------------------
export function buildScannerContext(result: AnalysisResult): Record<string, unknown> {
  return {
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    confidence: result.confidence,
    summary: result.summary,
    inputContent: result.inputContent?.slice(0, 3000),
    inputType: result.inputType,
    evidence: result.evidence.map((ev) => ({
      category: ev.category,
      severity: ev.severity,
      phrase: ev.phrase,
      explanation: ev.explanation,
      source: ev.source,
    })),
    urlFindings: result.urlFindings.map((u) => ({
      rawUrl: u.rawUrl,
      riskRating: u.riskRating,
      hostname: u.hostname,
      domain: u.domain,
      isShortener: u.isShortener,
      impersonatedBrand: u.impersonatedBrand,
      reasons: u.reasons,
    })),
    cognitiveTactics: result.cognitiveTactics
      .filter((t) => t.detected)
      .map((t) => ({
        name: t.name,
        rationale: t.rationale,
      })),
    recommendations: result.recommendations,
    ocrConfidence: result.ocrConfidence,
    analysisEngineMode: result.analysisEngineMode,
  };
}

// ---------------------------------------------------------------------------
// Main Chat Invocation Function
// ---------------------------------------------------------------------------
const MAX_RETRIES = 1; // Only retry transient network failures once
const RETRY_DELAY_MS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a message to the Spectra AI Edge Function.
 *
 * @param message - The user's query or text to evaluate
 * @param conversationHistory - Previous conversation context
 * @param scannerContext - Optional detection engine analysis findings
 * @param signal - Optional AbortSignal for user cancellation
 */
export async function sendAIChatMessage(
  message: string,
  conversationHistory: AIConversationMessage[] = [],
  scannerContext?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<AIChatResponse> {
  const trimmed = message.trim();
  if (!trimmed && !scannerContext) {
    throw new AIServiceError('Please enter a message or provide content to analyze.', 'AI_INVALID_RESPONSE', 400);
  }
  if (trimmed.length > 10_000) {
    throw new AIServiceError('Message exceeds maximum limit of 10,000 characters.', 'AI_INVALID_RESPONSE', 400);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      throw new AIServiceError('Request was cancelled.', 'AI_TIMEOUT');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Attach user JWT token if logged in
      if (authService.isAuthenticated()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        } catch {
          // Guest fallback
        }
      }

      const payload: Record<string, unknown> = {
        message: trimmed,
        conversationHistory: conversationHistory.slice(-20),
      };

      if (scannerContext) {
        payload.scannerContext = scannerContext;
      }

      // Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('spectra-ai-chat', {
        body: payload,
        headers,
      });

      // Handle Supabase client errors (e.g., 404 function not found, 500 error)
      if (error) {
        const errorMsg = error.message || 'Edge Function invocation failed';
        
        // Detect 404 Function Not Found
        if (
          errorMsg.toLowerCase().includes('not found') || 
          errorMsg.toLowerCase().includes('failed to send a request to the edge function') ||
          (error as any)?.context?.status === 404
        ) {
          throw new AIServiceError(
            "The 'spectra-ai-chat' Supabase Edge Function is not yet deployed on your Supabase project (lelmcuezksfeblhfrcmy). Deploy it using 'npx supabase functions deploy spectra-ai-chat' or configure Edge Function secrets in the Supabase Dashboard.",
            'AI_CONFIGURATION_ERROR',
            404
          );
        }

        // Try extracting JSON body from context if available
        let extractedErrorCode: AIErrorCode = 'AI_PROVIDER_ERROR';
        let extractedMessage = errorMsg;

        try {
          // @ts-ignore
          if (error.context && typeof error.context.json === 'function') {
            // @ts-ignore
            const errJson = await error.context.json();
            if (errJson?.errorCode) extractedErrorCode = errJson.errorCode;
            if (errJson?.error) extractedMessage = errJson.error;
          }
        } catch {
          // ignore
        }

        throw new AIServiceError(extractedMessage, extractedErrorCode);
      }

      // Check if Edge Function returned an error payload
      if (!data) {
        throw new AIServiceError('Empty response received from Spectra AI service.', 'AI_INVALID_RESPONSE', 502);
      }

      if (data.success === false) {
        const code = (data.errorCode as AIErrorCode) || 'AI_PROVIDER_ERROR';
        throw new AIServiceError(data.error || 'AI service returned an error.', code);
      }

      // Normalize response
      const rawReply = data.reply || data.data?.reply || '';
      const rawRisk = data.riskLevel || data.data?.riskLevel || 'low';
      const cleanRisk = String(rawRisk).toLowerCase() as AIRiskLevel;

      const structured: AIStructuredResponse = {
        reply: rawReply,
        riskLevel: cleanRisk,
        keyIndicators: Array.isArray(data.keyIndicators)
          ? data.keyIndicators
          : Array.isArray(data.data?.keyIndicators)
          ? data.data.keyIndicators
          : [],
        recommendations: Array.isArray(data.recommendations)
          ? data.recommendations
          : Array.isArray(data.data?.recommendations)
          ? data.data.recommendations
          : [],
        evidence: Array.isArray(data.evidence)
          ? data.evidence
          : Array.isArray(data.data?.evidence)
          ? data.data.evidence
          : [],
        disclaimer: data.disclaimer || data.data?.disclaimer || 'AI-generated security guidance.',
      };

      return {
        success: true,
        reply: structured.reply,
        riskLevel: structured.riskLevel,
        keyIndicators: structured.keyIndicators,
        recommendations: structured.recommendations,
        evidence: structured.evidence,
        disclaimer: structured.disclaimer,
        model: data.model || 'gemini-2.0-flash',
        provider: data.provider || 'gemini',
        data: structured,
      };
    } catch (err: unknown) {
      const error = err as Error;
      lastError = error;

      // Do not retry permanent errors or aborts
      if (error instanceof AIServiceError && error.isPermanent) {
        throw error;
      }

      if (
        error.message.includes('cancelled') ||
        error.message.includes('not configured') ||
        error.message.includes('not yet deployed') ||
        error.message.includes('Rate limit')
      ) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
    }
  }

  throw lastError || new AIServiceError('Failed to receive response from Spectra AI after retries.', 'AI_PROVIDER_ERROR');
}

// ---------------------------------------------------------------------------
// Fallback helper for backward compatibility
// ---------------------------------------------------------------------------
export function buildFallbackResponse(detectionResult?: AnalysisResult): AIStructuredResponse {
  if (detectionResult) {
    return {
      reply: `Deterministic engine analysis completed.\n\n**Risk Level: ${detectionResult.riskLevel}** (Score: ${detectionResult.riskScore}/100)\n\n${detectionResult.summary}`,
      riskLevel: detectionResult.riskLevel === 'CRITICAL' ? 'critical' : detectionResult.riskLevel === 'HIGH' ? 'high' : detectionResult.riskLevel === 'SUSPICIOUS' ? 'medium' : 'low',
      keyIndicators: detectionResult.evidence.map((ev) => `[${ev.category}] ${ev.phrase}`),
      recommendations: detectionResult.recommendations,
      evidence: detectionResult.evidence.map((ev) => ({
        indicator: ev.phrase,
        explanation: ev.explanation,
      })),
      disclaimer: 'This response is based on the local deterministic detection engine.',
    };
  }

  return {
    reply: 'AI service is currently unreachable. Please check your Supabase Edge Function deployment or retry.',
    riskLevel: 'unknown',
    keyIndicators: [],
    recommendations: ['Retry your query in a few moments.'],
    evidence: [],
    disclaimer: 'AI service unreachable.',
  };
}
