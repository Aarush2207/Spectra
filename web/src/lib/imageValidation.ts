/**
 * SPECTRA — Intelligent Screenshot & Image Validation Layer
 *
 * Pre-OCR: Validates file format, size, dimensions, and image decodability.
 * Post-OCR: Validates text length, OCR confidence, readability, and communication relevance.
 */

import { validateText } from './textValidation';

export type ImageValidationReasonCode =
  | 'UNSUPPORTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'CORRUPTED_IMAGE'
  | 'NO_TEXT_DETECTED'
  | 'LOW_OCR_CONFIDENCE'
  | 'IRRELEVANT_IMAGE'
  | 'VALIDATION_SERVICE_ERROR';

export interface ImageFileValidationResult {
  valid: boolean;
  inputType: 'image';
  reasonCode?: ImageValidationReasonCode;
  message?: string;
  suggestion?: string;
  fileDetails?: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
}

export interface OcrValidationResult {
  valid: boolean;
  inputType: 'image';
  reasonCode?: ImageValidationReasonCode;
  message?: string;
  suggestion?: string;
  extractedText?: string;
  confidence?: number;
  isLowConfidenceWarning?: boolean;
}

// Supported MIME types
const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MIN_IMAGE_DIMENSION = 40; // Pixels

// Communication / Screenshot context keywords
const COMMUNICATION_CONTEXT_PATTERNS = [
  // Messaging Apps & UI cues
  /\b(?:whatsapp|telegram|signal|imessage|messenger|wechat|sms|mms)\b/i,
  /\b(?:today|yesterday|unread|delivered|read|sent|typing)\b/i,
  /\b(?:\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i, // Timestamps like 10:42 AM or 14:30
  /\b(?:inbox|subject|from:|to:|forwarded|reply)\b/i, // Email headers

  // Notifications & Transactions
  /\b(?:notification|alert|update|status|notice)\b/i,
  /\b(?:transaction|debited|credited|transferred|ref(?:\.|\s*no)?)\b/i,
  /\b(?:otp|code|verification|passcode|pin)\b/i,
  /\b(?:balance|account|card|bank|wallet|upi|paytm|gpay|phonepe)\b/i,

  // Offers, Security & Scam signals
  /\b(?:dear\s+customer|urgent|action\s+required|suspended|blocked|congratulations|winner|hiring|salary)\b/i,
  /\b(?:click|link|tap|http|https|www|\.com|\.in|\.org|\.net)\b/i,
];

/**
 * Validates the uploaded image file before initiating expensive neural OCR.
 */
export async function validateImageFile(file: File): Promise<ImageFileValidationResult> {
  if (!file) {
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'CORRUPTED_IMAGE',
      message: 'No file was provided for upload.',
      suggestion: 'Please select an image file to upload.',
    };
  }

  // 1. MIME Type / Extension check
  const mimeType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();
  const hasValidExt = /\.(png|jpe?g|webp)$/i.test(fileName);

  if (!SUPPORTED_MIME_TYPES.has(mimeType) && !hasValidExt) {
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'UNSUPPORTED_FILE',
      message: `Unsupported file format (${mimeType || 'unknown'}).`,
      suggestion: 'Please upload a screenshot in PNG, JPG, JPEG, or WEBP format.',
      fileDetails: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    };
  }

  // 2. File size check
  if (file.size <= 0) {
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'CORRUPTED_IMAGE',
      message: 'The uploaded image file is empty or corrupted (0 bytes).',
      suggestion: 'Please upload a valid, non-empty screenshot.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'FILE_TOO_LARGE',
      message: `The image file is too large (${sizeMb} MB). Maximum permitted size is 15 MB.`,
      suggestion: 'Please compress or crop the screenshot before uploading.',
      fileDetails: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    };
  }

  // 3. Image decodability & Dimension check (browser environment)
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Image failed to decode'));
        };
        img.src = url;
      });

      if (dimensions.width < MIN_IMAGE_DIMENSION || dimensions.height < MIN_IMAGE_DIMENSION) {
        return {
          valid: false,
          inputType: 'image',
          reasonCode: 'CORRUPTED_IMAGE',
          message: `Image resolution is too low (${dimensions.width}×${dimensions.height}px) for text recognition.`,
          suggestion: 'Please upload a higher-resolution screenshot where text is clearly readable.',
          fileDetails: {
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type,
            width: dimensions.width,
            height: dimensions.height,
          },
        };
      }

      return {
        valid: true,
        inputType: 'image',
        fileDetails: {
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          width: dimensions.width,
          height: dimensions.height,
        },
      };
    } catch {
      return {
        valid: false,
        inputType: 'image',
        reasonCode: 'CORRUPTED_IMAGE',
        message: 'Unable to decode this image. The file may be damaged or not a valid image.',
        suggestion: 'Please re-save the screenshot or upload a different file.',
      };
    }
  }

  // Fallback for non-browser / test environments
  return {
    valid: true,
    inputType: 'image',
    fileDetails: {
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
    },
  };
}

/**
 * Validates the extracted text and confidence scores after OCR completes.
 * Ensures that irrelevant images (landscapes, memes, blank screens) are rejected
 * while readable communication, SMS, WhatsApp, and alerts are accepted.
 */
export function validateOcrResult(
  extractedText: string,
  confidence: number | null
): OcrValidationResult {
  const trimmed = (extractedText || '').trim();

  // 1. Completely blank / no text detected
  if (!trimmed) {
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'NO_TEXT_DETECTED',
      message: 'No readable text was detected in this screenshot.',
      suggestion: 'Try uploading a screenshot of a conversation, email, or notification with visible text.',
    };
  }

  // 2. Low OCR Confidence with partial text
  // If confidence is very low (< 35) and text is short, prompt user to enter text manually
  if (confidence !== null && confidence < 35 && trimmed.length < 50) {
    // Check if we have strong scam keywords despite low confidence
    const hasStrongSignals = COMMUNICATION_CONTEXT_PATTERNS.some((p) => p.test(trimmed));
    if (!hasStrongSignals) {
      return {
        valid: false,
        inputType: 'image',
        reasonCode: 'LOW_OCR_CONFIDENCE',
        message: 'The text in this screenshot is difficult to read. Upload a clearer image or paste the message manually.',
        suggestion: 'Upload a clearer image or switch to manual text input to paste the message.',
        extractedText: trimmed,
        confidence,
        isLowConfidenceWarning: true,
      };
    }
  }

  // 3. Delegate to Text Validation Layer for meaningfulness & gibberish detection
  const textValidation = validateText(trimmed);

  if (!textValidation.valid) {
    // Distinguish between pure gibberish and irrelevant image
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'IRRELEVANT_IMAGE',
      message: "We couldn't identify relevant communication in this image.",
      suggestion: 'Try uploading a screenshot of a conversation, email, or notification.',
      extractedText: trimmed,
      confidence: confidence ?? undefined,
    };
  }

  // 4. Communication Context Check:
  // Is this screenshot related to communications, messaging, emails, bank notifications, job offers, or websites?
  // If the text is very long (>= 15 words) or contains technical indicators (URLs, emails, phone numbers, money), accept it.
  const wordCount = (textValidation.wordCount || trimmed.split(/\s+/).length);
  const hasTechnical = textValidation.containsTechnicalIndicators;
  const hasSuspiciousTokens = textValidation.containsSuspiciousTokens;
  const matchesCommunicationContext = COMMUNICATION_CONTEXT_PATTERNS.some((p) => p.test(trimmed));

  if (!hasTechnical && !hasSuspiciousTokens && !matchesCommunicationContext && wordCount < 5) {
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'IRRELEVANT_IMAGE',
      message: "We couldn't identify relevant communication in this image. Try uploading a screenshot of a conversation, email, or notification.",
      suggestion: 'Upload a screenshot of an SMS, WhatsApp chat, email, or transaction alert.',
      extractedText: trimmed,
      confidence: confidence ?? undefined,
    };
  }

  return {
    valid: true,
    inputType: 'image',
    extractedText: trimmed,
    confidence: confidence ?? undefined,
  };
}
