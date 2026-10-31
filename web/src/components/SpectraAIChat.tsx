import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  RotateCcw, 
  Copy, 
  Check, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  Loader2, 
  X, 
  ArrowRight,
  Info,
  CheckCircle2,
  FileText,
  Bookmark,
  Share2,
  RefreshCw,
  Bot
} from 'lucide-react';
import { AnalysisResult, RiskLevel, EvidenceItem } from '../types/index';
import { ChatMessage, ChatSession } from '../types/auth';
import { analyzeMessage, extractUrls, inspectUrl } from '../lib/detectionEngine';
import { extractTextFromImage } from '../lib/ocrService';
import { authService } from '../lib/authService';
import {
  sendAIChatMessage,
  buildScannerContext,
  buildFallbackResponse,
  AIConversationMessage,
  AIStructuredResponse,
  AIRiskLevel,
} from '../lib/aiService';

import { RobotState } from '../types/robot';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  validateTextInput, 
  validateImageFileInput, 
  validateOcrExtraction 
} from '../lib/inputValidation';

interface SpectraAIChatProps {
  initialTransferredResult?: AnalysisResult | null;
  onClearTransferredResult?: () => void;
  onOpenInScanner?: (result: AnalysisResult) => void;
  onRobotStateChange?: (state: RobotState) => void;
}

const SUGGESTED_PROMPTS = [
  {
    title: 'Analyse a suspicious message',
    description: 'Verify bank SMS with suspension threats',
    prompt: 'Someone sent me this message: "CHASE ALERT: Your account access will be terminated within 2 hours due to unauthorized logins. Verify your identity immediately: https://chase-security-login.xyz/verify"'
  },
  {
    title: 'Check a suspicious URL',
    description: 'Inspect shortener or lookalike link',
    prompt: 'Can you check if this URL is safe: https://paypal.com.account-update.xyz/login'
  },
  {
    title: 'Explain how phishing works',
    description: 'Learn social engineering patterns',
    prompt: 'Explain how modern phishing and psychological manipulation tactics work, and what red flags I should always watch for.'
  },
  {
    title: 'Is this job offer legitimate?',
    description: 'Check remote check-cashing scheme',
    prompt: 'I got this remote job offer: "Congratulations! You are hired as a Remote Assistant ($45/hr). We will mail you a $3,000 cashier check for home office supplies. Deposit it and wire the rest to our vendor." Is this a scam?'
  }
];

export const SpectraAIChat: React.FC<SpectraAIChatProps> = ({
  initialTransferredResult,
  onClearTransferredResult,
  onOpenInScanner,
  onRobotStateChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [failedMessageText, setFailedMessageText] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string | null>(null);

  // Multimodal image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);

  // Abort controller for cancellable AI requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentSessionIdRef = useRef<string>(`session-${Date.now()}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Handle incoming transferred analysis from ScannerInterface
  useEffect(() => {
    if (initialTransferredResult) {
      const transferredMsg: ChatMessage = {
        id: `msg-transferred-${Date.now()}`,
        sender: 'spectra',
        text: `I've received your analysis briefing from the Multimodal Scanner. Here is the evaluated telemetry for review. You can ask me follow-up questions, request mitigation steps, or ask why specific indicators were flagged.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        inputType: initialTransferredResult.inputType,
        imagePreview: initialTransferredResult.rawImagePreview,
        analysisResult: initialTransferredResult
      };

      setMessages([transferredMsg]);
      onClearTransferredResult?.();
    }
  }, [initialTransferredResult]);

  // Save session to auth history if messages change
  useEffect(() => {
    if (messages.length > 0) {
      const user = authService.getCurrentUser();
      if (user && !user.isGuest) {
        const firstUserMsg = messages.find((m) => m.sender === 'user');
        const title = firstUserMsg ? firstUserMsg.text.slice(0, 45) + '...' : 'Spectra Threat Briefing';
        const session: ChatSession = {
          id: currentSessionIdRef.current,
          userId: user.id,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages
        };
        authService.saveChatSession(session);
      }
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Image exceeds maximum allowed size of 15MB.');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleSaveResult = (res: AnalysisResult) => {
    authService.saveAnalysis(res);
    setSavedAnalysisId(res.id);
    setTimeout(() => setSavedAnalysisId(null), 2500);
  };

  const handleClearChat = () => {
    if (confirm('Clear current Spectra AI conversation?')) {
      setMessages([]);
      currentSessionIdRef.current = `session-${Date.now()}`;
      handleRemoveImage();
    }
  };

  // Build conversation history for the AI from current messages
  const buildConversationHistory = (): AIConversationMessage[] => {
    return messages
      .filter((m) => m.sender === 'user' || m.sender === 'spectra')
      .map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text.slice(0, 4000),
      }));
  };

  // Map AI risk levels to the AnalysisResult-compatible format for the UI
  const mapAIRiskToDisplay = (aiRisk: AIRiskLevel | string): RiskLevel => {
    const r = String(aiRisk || '').toUpperCase();
    switch (r) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM':
      case 'SUSPICIOUS': return 'SUSPICIOUS';
      case 'LOW': return 'LOW';
      default: return 'LOW';
    }
  };

  // Build a display-friendly AnalysisResult from AI structured response + optional engine result
  const buildDisplayResult = (
    aiResponse: AIStructuredResponse,
    engineResult?: AnalysisResult
  ): AnalysisResult => {
    const riskLevelUpper = mapAIRiskToDisplay(aiResponse.riskLevel);

    // If we have engine results, use them as the base and enhance with AI insights
    if (engineResult) {
      return {
        ...engineResult,
        summary: aiResponse.reply || engineResult.summary,
        recommendations: aiResponse.recommendations.length > 0
          ? aiResponse.recommendations
          : engineResult.recommendations,
        analysisEngineMode: 'LLM_AUGMENTED' as const,
      };
    }

    // Pure AI response (no engine result)
    const score = riskLevelUpper === 'CRITICAL' ? 90 : riskLevelUpper === 'HIGH' ? 70 : riskLevelUpper === 'SUSPICIOUS' ? 45 : 10;
    const confidence = riskLevelUpper === 'LOW' ? 85 : 75;

    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      inputType: 'text',
      inputContent: '',
      riskLevel: riskLevelUpper,
      riskScore: score,
      confidence,
      summary: aiResponse.reply,
      evidence: aiResponse.evidence.map((ev, i) => ({
        id: `ai-ev-${i}`,
        phrase: ev.indicator,
        category: 'ANOMALY' as const,
        severity: 'medium' as const,
        explanation: ev.explanation,
        source: 'LLM_SEMANTIC_ANALYSIS' as const,
      })),
      urlFindings: [],
      cognitiveTactics: [],
      recommendations: aiResponse.recommendations,
      limitations: [aiResponse.disclaimer],
      timing: { engineMs: 0, totalPipelineMs: 0 },
      executionTimeMs: 0,
      analysisEngineMode: 'LLM_AUGMENTED',
    };
  };

  // Retry handler for failed messages
  const handleRetry = () => {
    if (failedMessageText) {
      const textToRetry = failedMessageText;
      setFailedMessageText(null);
      // Remove the last error message from the conversation if present
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && (last.isError || last.id.includes('error') || last.text.includes('⚠️'))) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      handleSendMessage(textToRetry);
    }
  };

  // Process and analyze user query
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    const hasImage = !!selectedImage && !!imagePreview;

    if (!text && !hasImage) return;
    if (isProcessing) return; // Prevent duplicate submissions

    setFailedMessageText(null);

    const userMessageId = `msg-${Date.now()}-user`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: text || 'Analyse attached screenshot capture',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      inputType: hasImage ? 'image' : 'text',
      imagePreview: imagePreview || undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);
    onRobotStateChange?.('thinking');

    const capturedImage = selectedImage;
    const capturedPreview = imagePreview;
    handleRemoveImage();

    // Create an abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Branch 1: Multimodal Screenshot Analysis with OCR + AI Enhancement
      if (capturedImage && capturedPreview) {
        // Pre-OCR Image Integrity Validation
        const fileCheck = await validateImageFileInput(capturedImage);
        if (!fileCheck.valid) {
          const valMsg: ChatMessage = {
            id: `msg-${Date.now()}-validation`,
            sender: 'spectra',
            text: `⚠️ **Screenshot Validation Notice** (${fileCheck.reasonCode})\n\n${fileCheck.message}\n\n💡 *${fileCheck.suggestion}*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inputType: 'image',
            imagePreview: capturedPreview,
          };
          setMessages((prev) => [...prev, valMsg]);
          setIsProcessing(false);
          setProcessingStage(null);
          onRobotStateChange?.('idle');
          return;
        }

        setProcessingStage('Extracting text from screenshot via Tesseract OCR...');
        setOcrStatus('Extracting text from screenshot via Tesseract OCR...');
        const ocr = await extractTextFromImage(capturedImage);
        setOcrStatus(null);

        // Post-OCR Meaningfulness Validation
        const ocrCheck = validateOcrExtraction(ocr.text, ocr.confidence);
        if (!ocrCheck.valid) {
          const valMsg: ChatMessage = {
            id: `msg-${Date.now()}-validation`,
            sender: 'spectra',
            text: `⚠️ **Screenshot Validation Notice** (${ocrCheck.reasonCode})\n\n${ocrCheck.message}\n\n💡 *${ocrCheck.suggestion}*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inputType: 'image',
            imagePreview: capturedPreview,
          };
          setMessages((prev) => [...prev, valMsg]);
          setIsProcessing(false);
          setProcessingStage(null);
          onRobotStateChange?.('idle');
          return;
        }

        const extractedText = ocr.text.trim();
        const result = analyzeMessage(
          extractedText,
          'image',
          capturedPreview,
          ocr.confidence,
          ocr.durationMs
        );

        // Enhance with AI interpretation
        setProcessingStage('Consulting Spectra AI for deeper analysis...');
        let aiReply: AIStructuredResponse | null = null;
        try {
          const history = buildConversationHistory();
          const context = buildScannerContext(result);
          const aiResult = await sendAIChatMessage(
            text || `Analyse this screenshot. OCR extracted text: "${extractedText.slice(0, 2000)}"`,
            history,
            context,
            abortControllerRef.current?.signal
          );
          aiReply = aiResult.data || (aiResult as unknown as AIStructuredResponse);
        } catch (aiErr: unknown) {
          const err = aiErr as Error & { errorCode?: string };
          console.error('[Spectra-AI] Screenshot AI enhancement failed:', err);
          setFailedMessageText(text || extractedText);

          // Build message showing deterministic findings, but explicitly stating AI enhancement failed
          const errorIntro = `⚠️ **Spectra AI Enhancement Unavailable** (${err.errorCode || 'AI_PROVIDER_ERROR'})\n\n${err.message}\n\n*The deterministic Spectra Detection Engine completed its local rule-based scan below:*`;
          const spectraMsg: ChatMessage = {
            id: `msg-${Date.now()}-spectra`,
            sender: 'spectra',
            text: errorIntro,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inputType: 'image',
            imagePreview: capturedPreview,
            analysisResult: result,
            isError: true,
            errorCode: err.errorCode,
          };

          setMessages((prev) => [...prev, spectraMsg]);
          setIsProcessing(false);
          setProcessingStage(null);
          onRobotStateChange?.(result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH' ? 'alert' : 'idle');
          return;
        }

        const displayResult = buildDisplayResult(aiReply, result);
        const introText = aiReply.reply || `I processed your screenshot capture using OCR (${ocr.confidence}% confidence) and evaluated the threat signals.`;

        const spectraMsg: ChatMessage = {
          id: `msg-${Date.now()}-spectra`,
          sender: 'spectra',
          text: introText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inputType: 'image',
          imagePreview: capturedPreview,
          analysisResult: displayResult,
        };

        setMessages((prev) => [...prev, spectraMsg]);
        setIsProcessing(false);
        setProcessingStage(null);
        if (displayResult.riskLevel === 'CRITICAL' || displayResult.riskLevel === 'HIGH') {
          onRobotStateChange?.('alert');
          setTimeout(() => onRobotStateChange?.('idle'), 5000);
        } else {
          onRobotStateChange?.('idle');
        }
        return;
      }

      // Branch 2: Text Messages & Queries
      const textValidation = validateTextInput(text);
      if (!textValidation.valid) {
        const valMsg: ChatMessage = {
          id: `msg-${Date.now()}-validation`,
          sender: 'spectra',
          text: `⚠️ **Input Validation Notice** (${textValidation.reasonCode})\n\n${textValidation.message}\n\n💡 *${textValidation.suggestion}*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inputType: 'text',
        };
        setMessages((prev) => [...prev, valMsg]);
        setIsProcessing(false);
        setProcessingStage(null);
        onRobotStateChange?.('idle');
        return;
      }

      const urls = extractUrls(text);
      // Only classify as specific message analysis if there are actual URLs or explicit forwarded message text
      const isAnalyzingSpecificMessage = 
        urls.length > 0 ||
        /(?:someone sent|got this message|received an email|is this (?:a )?scam|urgent:?|dear customer|account.*suspended|verify your (?:identity|account)|click here to)/i.test(text);

      // Check if it's purely a general question or conversational follow-up
      const isGeneralEducational = 
        !urls.length && (
          /^(?:what|why|how|explain|tell me|who|can you|tips|is it safe to)\b/i.test(text) ||
          text.length < 60
        );

      if (isAnalyzingSpecificMessage && !isGeneralEducational) {
        // Run detection engine first as technical baseline
        setProcessingStage('Running Spectra Detection Engine...');
        const inputType = urls.length > 0 && text === urls[0] ? 'url' : 'text';
        const result = analyzeMessage(text, inputType);

        // Enhance with AI
        setProcessingStage('Consulting Spectra AI for deeper analysis...');
        try {
          const history = buildConversationHistory();
          const context = buildScannerContext(result);
          const aiResult = await sendAIChatMessage(
            text,
            history,
            context,
            abortControllerRef.current?.signal
          );
          const aiReply = aiResult.data || (aiResult as unknown as AIStructuredResponse);
          const displayResult = buildDisplayResult(aiReply, result);

          const spectraMsg: ChatMessage = {
            id: `msg-${Date.now()}-spectra`,
            sender: 'spectra',
            text: aiReply.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inputType: 'text',
            analysisResult: displayResult,
          };

          setMessages((prev) => [...prev, spectraMsg]);
          if (displayResult.riskLevel === 'CRITICAL' || displayResult.riskLevel === 'HIGH') {
            onRobotStateChange?.('alert');
            setTimeout(() => onRobotStateChange?.('idle'), 5000);
          } else {
            onRobotStateChange?.('idle');
          }
        } catch (aiErr: unknown) {
          const err = aiErr as Error & { errorCode?: string };
          console.error('[Spectra-AI] Message analysis AI call failed:', err);
          setFailedMessageText(text);

          const errorIntro = `⚠️ **Spectra AI Analysis Unavailable** (${err.errorCode || 'AI_PROVIDER_ERROR'})\n\n${err.message}\n\n*The deterministic Spectra Detection Engine completed its local scan below:*\n\n*(Click **Retry last message** above to retry the AI connection)*`;
          const spectraMsg: ChatMessage = {
            id: `msg-${Date.now()}-spectra`,
            sender: 'spectra',
            text: errorIntro,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inputType: 'text',
            analysisResult: result,
            isError: true,
            errorCode: err.errorCode,
          };

          setMessages((prev) => [...prev, spectraMsg]);
          onRobotStateChange?.(result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH' ? 'alert' : 'idle');
        }
      } else {
        // Conversational / Educational / Follow-up — send directly to AI
        setProcessingStage('Consulting Spectra AI...');
        try {
          const history = buildConversationHistory();
          const aiResult = await sendAIChatMessage(
            text,
            history,
            undefined,
            abortControllerRef.current?.signal
          );
          const aiReply = aiResult.data || (aiResult as unknown as AIStructuredResponse);

          // For educational responses with genuine risk analysis, build a result card
          const hasRiskAnalysis =
            aiReply.riskLevel !== 'low' &&
            aiReply.riskLevel !== 'unknown' &&
            aiReply.evidence.length > 0;

          const spectraMsg: ChatMessage = {
            id: `msg-${Date.now()}-spectra`,
            sender: 'spectra',
            text: aiReply.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            analysisResult: hasRiskAnalysis ? buildDisplayResult(aiReply) : undefined,
          };

          setMessages((prev) => [...prev, spectraMsg]);
          onRobotStateChange?.('idle');
        } catch (aiErr: unknown) {
          const err = aiErr as Error & { errorCode?: string };
          console.error('[Spectra-AI] Conversational AI call failed:', err);
          setFailedMessageText(text);

          const errorMsg: ChatMessage = {
            id: `msg-${Date.now()}-error`,
            sender: 'spectra',
            text: `⚠️ **Spectra AI Service Notice** (${err.errorCode || 'AI_PROVIDER_ERROR'})\n\n${err.message}\n\nPlease ensure your Supabase Edge Function (\`spectra-ai-chat\`) is deployed and configured with \`AI_API_KEY\`, then click **Retry last message** below.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true,
            errorCode: err.errorCode,
          };

          setMessages((prev) => [...prev, errorMsg]);
          onRobotStateChange?.('idle');
        }
      }
    } catch (err: unknown) {
      const error = err as Error & { errorCode?: string };
      console.error('[Spectra-AI] Unexpected chat pipeline error:', error);
      setFailedMessageText(text);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'spectra',
        text: `⚠️ **Unexpected Error:** ${error.message || 'An error occurred while evaluating your input.'}\n\nPlease click **Retry last message** to try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      setProcessingStage(null);
      setOcrStatus(null);
      abortControllerRef.current = null;
    }
  };

  // Educational intelligence response generator
  const generateEducationalReply = (query: string): string => {
    const lower = query.toLowerCase();

    if (lower.includes('phishing') || lower.includes('how phishing works')) {
      return `### How Phishing & Psychological Manipulation Work

Phishing relies primarily on **social engineering** rather than technical vulnerabilities. Attackers manipulate human cognitive biases to bypass rational skepticism:

1. **Manufactured Urgency**: Attackers impose artificial deadlines (e.g., *"account blocked in 2 hours"* or *"unauthorized charge of $840 pending"*). Urgency bypasses critical thinking by triggering panic.
2. **Authority Impersonation**: Criminals pose as trusted institutions (Chase, IRS, USPS, Apple, Microsoft, or internal IT). Victims naturally defer to recognized hierarchy.
3. **Channel Isolation**: Fraudsters attempt to move you from monitored platforms onto unmonitored channels like Telegram, WhatsApp, or unsecured external login forms.
4. **Credential Extraction**: Rather than hacking complex passwords, attackers simply create identical spoofed login portals and ask you to enter your credentials and 2FA OTP.

#### Best Defensive Hygiene:
- **Never rely on incoming links**: Independently type the institution's official URL or use your verified mobile app.
- **OTPs are never shared**: Authentic support representatives never request one-time verification passwords.
- **Inspect apex domains**: Check for lookalike characters, suspicious TLDs (\`.xyz\`, \`.top\`), or subdomains masquerading as brands (\`paypal.com.fraud-site.top\`).`;
    }

    if (lower.includes('url') || lower.includes('link') || lower.includes('domain')) {
      return `### Inspecting Suspicious URLs

Spectra decomposes URLs passively without initiating outbound network requests (avoiding SSRF vulnerabilities):

- **Brand Subdomain Spoofing**: \`https://chase.com.security-verify.xyz\` — the actual apex domain is \`security-verify.xyz\`, NOT Chase.
- **Opaque URL Shorteners**: Shorteners like \`bit.ly\` or \`tinyurl.com\` hide the destination domain from the user until clicked.
- **Homoglyphs & IDN Punycode**: Lookalike characters from Greek or Cyrillic alphabets that mimic Latin letters (e.g., Cyrillic 'а' vs Latin 'a').
- **Non-standard Ports**: URLs appending ports like \`:8080\` or \`:8443\` to bypass enterprise firewall filtering.

Paste any suspicious URL into Spectra AI anytime to inspect its components safely.`;
    }

    return `### Threat Analysis & Advisory

When evaluating unsolicited communications, Spectra checks for three primary threat vectors:
1. **Urgency & Coercion**: Artificial countdowns or threatened legal/financial penalties.
2. **Credential Diversion**: Solicitations for passwords, OTPs, recovery seeds, or payment details.
3. **Deceptive Infrastructure**: Lookalike domains, non-standard web ports, and unmonitored communication hops.

Feel free to paste the exact text of any suspicious email, SMS, or job offer, or upload a screenshot using the attachment button below!`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRiskBadgeConfig = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-[#fef3f2]',
          border: 'border-[#d92d20]/30',
          text: 'text-[#d92d20]',
          icon: <ShieldAlert className="w-4 h-4 text-[#d92d20]" />,
          label: 'CRITICAL RISK'
        };
      case 'HIGH':
        return {
          bg: 'bg-[#fef3f2]',
          border: 'border-[#d92d20]/30',
          text: 'text-[#d92d20]',
          icon: <ShieldAlert className="w-4 h-4 text-[#d92d20]" />,
          label: 'HIGH RISK'
        };
      case 'SUSPICIOUS':
        return {
          bg: 'bg-[#fffaeb]',
          border: 'border-[#f79009]/30',
          text: 'text-[#f79009]',
          icon: <AlertTriangle className="w-4 h-4 text-[#f79009]" />,
          label: 'SUSPICIOUS'
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-[#ecfdf3]',
          border: 'border-[#12b76a]/30',
          text: 'text-[#12b76a]',
          icon: <ShieldCheck className="w-4 h-4 text-[#12b76a]" />,
          label: 'LOW RISK'
        };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[750px] bg-white rounded-3xl border border-[#a9a9a6]/35 shadow-spectra-card overflow-hidden select-none animate-fade-in">
      
      {/* 1. CHAT HEADER */}
      <div className="px-6 py-4 bg-[#fbfbfa] border-b border-[#a9a9a6]/25 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#8055e8] flex items-center justify-center shadow-spectra-violet text-white flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-[#1d1d1d] font-sans">
                Spectra Intelligence
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8055e8]/10 text-[#8055e8] border border-[#8055e8]/20 uppercase">
                AI Assistant
              </span>
            </div>
            <p className="text-xs text-[#555555] font-sans">
              Your AI-powered scam analysis assistant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#555555] bg-white px-3 py-1.5 rounded-full border border-[#a9a9a6]/30">
            <span className="w-2 h-2 rounded-full bg-[#12b76a] animate-pulse" />
            <span className="font-semibold text-[#1d1d1d]">Engine Online</span>
            <span className="text-[#a9a9a6]">•</span>
            <span className="text-[#777777]">Client Isolated</span>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 rounded-full hover:bg-[#f2f2f1] text-[#555555] hover:text-[#1d1d1d] transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CHAT SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#f8f8f7]">
        
        {/* WELCOME SCREEN (When conversation is empty) */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-white border border-[#a9a9a6]/30 shadow-md flex items-center justify-center text-[#8055e8]">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1d] font-sans tracking-tight">
                See beyond the message.
              </h2>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed max-w-lg font-sans">
                Ask Spectra about suspicious messages, phishing attempts, fraudulent offers, or suspicious URLs. 
                I'll help you identify warning signs and understand what to do next.
              </p>
            </div>

            {/* Suggested Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-2">
              {SUGGESTED_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-4 rounded-2xl bg-white hover:bg-[#fbfbfa] border border-[#a9a9a6]/30 hover:border-[#8055e8]/50 shadow-sm transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-[#1d1d1d] group-hover:text-[#8055e8] transition-colors block mb-1 font-sans">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-[#555555] line-clamp-1">
                      {item.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8055e8] mt-3 group-hover:translate-x-1 transition-transform">
                    <span>Try prompt</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-[#777777] pt-2">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#12b76a]" /> Direct Detection Engine Link
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#12b76a]" /> Neural Screenshot OCR
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#12b76a]" /> Zero SSRF Outbound
              </span>
            </div>
          </div>
        )}

        {/* MESSAGES LIST */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const res = msg.analysisResult;
          const badge = res ? getRiskBadgeConfig(res.riskLevel) : null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
                  isUser
                    ? 'bg-[#1d1d1d] text-white rounded-br-none'
                    : 'bg-white text-[#1d1d1d] border border-[#a9a9a6]/30 rounded-bl-none'
                }`}
              >
                {/* Optional Image Attachment Preview in Bubble */}
                {msg.imagePreview && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-white/20 max-w-sm">
                    <img
                      src={msg.imagePreview}
                      alt="Uploaded Screenshot"
                      className="w-full max-h-48 object-cover"
                    />
                  </div>
                )}

                {/* Text Content with Markdown Rendering */}
                <div className="text-xs sm:text-sm font-sans leading-relaxed">
                  <MarkdownRenderer content={msg.text} isUser={isUser} />
                </div>

                {/* STRUCTURED RISK ANALYSIS CARD (When AnalysisResult is attached) */}
                {res && badge && (
                  <div className="mt-4 pt-4 border-t border-[#a9a9a6]/25 space-y-4">
                    {/* Badge & Risk Score */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#fbfbfa] border border-[#a9a9a6]/30">
                      <div className="flex items-center gap-2">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${badge.bg} ${badge.border} ${badge.text}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#1d1d1d]">
                          Score: {res.riskScore}/100
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#555555]">
                        Certainty: {res.confidence}%
                      </span>
                    </div>

                    {/* Warning Signs / Evidence List */}
                    {res.evidence.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1d1d1d] font-mono block">
                          Warning Signs & Matched Indicators:
                        </span>
                        <div className="space-y-1.5">
                          {res.evidence.map((ev, i) => (
                            <div 
                              key={i} 
                              className="p-2.5 bg-[#fbfbfa] rounded-xl border border-[#a9a9a6]/25 text-xs flex items-start gap-2"
                            >
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#8055e8]/10 text-[#8055e8] uppercase flex-shrink-0 mt-0.5">
                                {ev.category}
                              </span>
                              <div>
                                <span className="font-bold text-[#1d1d1d]">"{ev.phrase}"</span>: {' '}
                                <span className="text-[#555555]">{ev.explanation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Why This Matters / Cognitive Rationale */}
                    <div className="space-y-1 bg-[#f8f8f7] p-3 rounded-xl border border-[#a9a9a6]/25">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1d1d1d] font-mono block">
                        Why This Matters:
                      </span>
                      <p className="text-xs text-[#555555] leading-relaxed">
                        {res.summary}
                      </p>
                    </div>

                    {/* Actionable Recommendations */}
                    {res.recommendations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1d1d1d] font-mono block">
                          Recommended Action:
                        </span>
                        <ul className="space-y-1 text-xs text-[#1d1d1d]">
                          {res.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8055e8] flex-shrink-0 mt-1.5" />
                              <span className="font-medium">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions: Save Result & Open in Multimodal Scanner */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#a9a9a6]/20">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveResult(res)}
                          className="px-3 py-1.5 rounded-full bg-white hover:bg-[#f2f2f1] border border-[#a9a9a6]/40 text-[11px] font-medium text-[#1d1d1d] flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          {savedAnalysisId === res.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#12b76a]" />
                              <span>Saved to Profile</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3 h-3 text-[#8055e8]" />
                              <span>Save Analysis</span>
                            </>
                          )}
                        </button>
                      </div>

                      {onOpenInScanner && (
                        <button
                          onClick={() => onOpenInScanner(res)}
                          className="px-3 py-1.5 rounded-full bg-[#1d1d1d] hover:bg-[#8055e8] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>Open in Detailed Scanner</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Footer: Timestamp & Copy */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#777777] px-2">
                <span>{msg.timestamp}</span>
                <span>•</span>
                <button
                  onClick={() => handleCopyMessage(msg.id, msg.text)}
                  className="hover:text-[#1d1d1d] flex items-center gap-1 transition-colors"
                >
                  {copiedMessageId === msg.id ? (
                    <>
                      <Check className="w-3 h-3 text-[#12b76a]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* LOADING / OCR PROCESSING INDICATOR */}
        {isProcessing && (
          <div className="flex flex-col items-start space-y-1 animate-fade-in">
            <div className="bg-white rounded-2xl rounded-bl-none p-4 border border-[#a9a9a6]/30 shadow-sm max-w-sm flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#8055e8] animate-spin flex-shrink-0" />
              <div>
                <span className="text-xs font-semibold text-[#1d1d1d] block">
                  {ocrStatus || processingStage || 'Spectra is evaluating threat signals...'}
                </span>
                <span className="text-[10px] text-[#777777] font-mono">
                  {processingStage?.includes('AI') ? 'AI-augmented analysis via secure Edge Function' : 'Running detection engine & cognitive heuristic matrix'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* RETRY BUTTON (when last message failed) */}
        {failedMessageText && !isProcessing && (
          <div className="flex items-start animate-fade-in">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#fbfbfa] border border-[#f79009]/40 text-[#f79009] text-xs font-semibold shadow-sm transition-all hover:shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry last message
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. MULTIMODAL CHAT INPUT PANEL */}
      <div className="p-4 bg-white border-t border-[#a9a9a6]/25 space-y-3 flex-shrink-0">
        
        {/* Screenshot Attachment Thumbnail Preview */}
        {imagePreview && (
          <div className="flex items-center gap-3 p-2 bg-[#f8f8f7] rounded-2xl border border-[#a9a9a6]/30 w-fit max-w-md animate-fade-in">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/5 flex-shrink-0 border border-[#a9a9a6]/20">
              <img
                src={imagePreview}
                alt="Upload Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs font-sans truncate">
              <span className="font-bold text-[#1d1d1d] block truncate">
                {selectedImage?.name || 'Screenshot'}
              </span>
              <span className="text-[10px] text-[#555555] font-mono">
                {selectedImage ? `${(selectedImage.size / (1024 * 1024)).toFixed(2)} MB • Ready for OCR` : ''}
              </span>
            </div>
            <button
              onClick={handleRemoveImage}
              className="w-6 h-6 rounded-full bg-white hover:bg-[#e4e4e2] text-[#555555] flex items-center justify-center transition-colors flex-shrink-0 ml-2 shadow-sm"
              title="Remove screenshot"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Controls */}
        <div className="flex items-center gap-2">
          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${
              imagePreview
                ? 'bg-[#8055e8]/10 text-[#8055e8] border-[#8055e8]/40'
                : 'bg-[#fbfbfa] hover:bg-[#f2f2f1] text-[#555555] hover:text-[#1d1d1d] border-[#a9a9a6]/35'
            }`}
            title="Attach screenshot for OCR analysis"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => onRobotStateChange?.('listening')}
              onBlur={() => onRobotStateChange?.('idle')}
              onKeyDown={handleKeyDown}
              placeholder={imagePreview ? "Add instructions or press Enter to extract & analyze..." : "Paste a suspicious message, URL, or ask a question (Enter to send, Shift+Enter for newline)..."}
              disabled={isProcessing}
              className="w-full bg-[#fbfbfa] focus:bg-white border border-[#a9a9a6]/40 focus:border-[#8055e8] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#1d1d1d] outline-none transition-all resize-none max-h-32 placeholder:text-[#a9a9a6]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isProcessing || (!inputValue.trim() && !imagePreview)}
            className="p-3 bg-[#1d1d1d] hover:bg-[#8055e8] text-white rounded-2xl shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            title="Send to Spectra"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#777777] font-mono px-1">
          <span className="flex items-center gap-1">
            <Bot className="w-3 h-3" />
            AI-Augmented via Secure Edge Function
          </span>
          <span>Tesseract.js OCR • Zero client-side API keys</span>
        </div>
      </div>

    </div>
  );
};
