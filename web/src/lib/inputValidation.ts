/**
 * SPECTRA — Centralized Input Validation & Meaningfulness Detection Service
 *
 * Coordinates validation across Text, Image / Screenshot, and URL inputs.
 * Ensures all inputs contain meaningful, analyzable information before
 * invoking detection engines or costly AI provider APIs.
 *
 * IMPORTANT: Distinguishes between meaningfulness and safety.
 * Suspicious, dangerous, and aggressive scam messages are fully meaningful
 * and must be accepted for analysis.
 */

import { validateText, TextValidationResult, TextValidationReasonCode } from './textValidation';
import { 
  validateImageFile, 
  validateOcrResult, 
  ImageFileValidationResult, 
  OcrValidationResult, 
  ImageValidationReasonCode 
} from './imageValidation';
import { validateUrl, UrlValidationResult, UrlValidationReasonCode } from './urlValidation';

export type ValidationInputType = 'text' | 'image' | 'url';

export type ValidationReasonCode =
  | 'EMPTY_INPUT'
  | 'INPUT_TOO_SHORT'
  | 'MEANINGLESS_TEXT'
  | 'UNSUPPORTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'CORRUPTED_IMAGE'
  | 'NO_TEXT_DETECTED'
  | 'LOW_OCR_CONFIDENCE'
  | 'IRRELEVANT_IMAGE'
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'INVALID_HOSTNAME'
  | 'VALIDATION_SERVICE_ERROR';

export interface StandardValidationResult {
  valid: boolean;
  inputType: ValidationInputType;
  reasonCode?: ValidationReasonCode;
  message?: string;
  suggestion?: string;
  // Metadata fields for downstream processing
  metadata?: {
    cleanedText?: string;
    normalizedUrl?: string;
    hostname?: string;
    isShortener?: boolean;
    confidence?: number;
    wordCount?: number;
    detectedLanguage?: string;
    isLowConfidenceWarning?: boolean;
  };
}

/**
 * Validates text input before sending to scanner or AI chat.
 */
export function validateTextInput(rawText: string): StandardValidationResult {
  try {
    const res = validateText(rawText);
    if (!res.valid) {
      return {
        valid: false,
        inputType: 'text',
        reasonCode: res.reasonCode,
        message: res.message || "This doesn't appear to contain meaningful communication. Please provide an SMS, email, message, or other relevant content.",
        suggestion: res.suggestion || 'Paste an SMS, email, WhatsApp message, or suspicious communication.',
      };
    }

    return {
      valid: true,
      inputType: 'text',
      metadata: {
        cleanedText: res.cleanedText,
        wordCount: res.wordCount,
        detectedLanguage: res.detectedLanguage,
      },
    };
  } catch (err) {
    console.error('Validation error in validateTextInput:', err);
    return {
      valid: false,
      inputType: 'text',
      reasonCode: 'VALIDATION_SERVICE_ERROR',
      message: 'Unable to validate the submitted text.',
      suggestion: 'Please try submitting the message again.',
    };
  }
}

/**
 * Validates a URL input before sending to passive URL inspection.
 */
export function validateUrlInput(rawUrl: string): StandardValidationResult {
  try {
    const res = validateUrl(rawUrl);
    if (!res.valid) {
      return {
        valid: false,
        inputType: 'url',
        reasonCode: res.reasonCode,
        message: res.message || "This doesn't appear to be a valid web address.",
        suggestion: res.suggestion || 'Please enter a complete HTTP or HTTPS URL.',
      };
    }

    return {
      valid: true,
      inputType: 'url',
      metadata: {
        normalizedUrl: res.normalizedUrl,
        hostname: res.hostname,
        isShortener: res.isShortener,
      },
    };
  } catch (err) {
    console.error('Validation error in validateUrlInput:', err);
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'VALIDATION_SERVICE_ERROR',
      message: 'Unable to validate the web address.',
      suggestion: 'Please verify the URL structure and try again.',
    };
  }
}

/**
 * Pre-OCR: Validates the image file format and dimensions.
 */
export async function validateImageFileInput(file: File): Promise<StandardValidationResult> {
  try {
    const res = await validateImageFile(file);
    if (!res.valid) {
      return {
        valid: false,
        inputType: 'image',
        reasonCode: res.reasonCode,
        message: res.message,
        suggestion: res.suggestion,
      };
    }

    return {
      valid: true,
      inputType: 'image',
    };
  } catch (err) {
    console.error('Validation error in validateImageFileInput:', err);
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'VALIDATION_SERVICE_ERROR',
      message: 'Failed to inspect image file integrity.',
      suggestion: 'Please re-select or re-upload your screenshot.',
    };
  }
}

/**
 * Post-OCR: Validates the extracted text and confidence scores.
 */
export function validateOcrExtraction(
  extractedText: string,
  confidence: number | null
): StandardValidationResult {
  try {
    const res = validateOcrResult(extractedText, confidence);
    if (!res.valid) {
      return {
        valid: false,
        inputType: 'image',
        reasonCode: res.reasonCode,
        message: res.message,
        suggestion: res.suggestion,
        metadata: {
          cleanedText: res.extractedText,
          confidence: res.confidence,
          isLowConfidenceWarning: res.isLowConfidenceWarning,
        },
      };
    }

    return {
      valid: true,
      inputType: 'image',
      metadata: {
        cleanedText: res.extractedText,
        confidence: res.confidence,
      },
    };
  } catch (err) {
    console.error('Validation error in validateOcrExtraction:', err);
    return {
      valid: false,
      inputType: 'image',
      reasonCode: 'VALIDATION_SERVICE_ERROR',
      message: 'Error validating optical character extraction.',
      suggestion: 'Please try uploading a clearer screenshot.',
    };
  }
}

// Re-export specific modules for direct usage
export * from './textValidation';
export * from './imageValidation';
export * from './urlValidation';
