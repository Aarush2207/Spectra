/**
 * SPECTRA — Intelligent Text Input Validation Layer
 *
 * Verifies that text submitted to the scanner or AI assistant contains
 * sufficient linguistic or security-related signals to analyze.
 * Distinguishes meaningfulness from safety.
 */

export type TextValidationReasonCode =
  | 'EMPTY_INPUT'
  | 'INPUT_TOO_SHORT'
  | 'MEANINGLESS_TEXT';

export interface TextValidationResult {
  valid: boolean;
  inputType: 'text';
  cleanedText?: string;
  wordCount?: number;
  detectedLanguage?: 'devanagari' | 'latin' | 'cjk' | 'arabic' | 'cyrillic' | 'other';
  containsTechnicalIndicators?: boolean;
  containsSuspiciousTokens?: boolean;
  reasonCode?: TextValidationReasonCode;
  message?: string;
  suggestion?: string;
}

// Common keyboard mash row sequences
const KEYBOARD_MASH_SEQUENCES = [
  'asdfghjkl',
  'qwertyuiop',
  'zxcvbnm',
  'lkjhgfdsa',
  'poiuytrewq',
  'mnbvcxz',
  'qazwsx',
  'edcrfv',
  'tgbyhn',
  'ujmik',
  'olp',
  '1234567890',
  '0987654321',
  'abcdefgh',
  'hgfedcba',
];

// Common security, banking, urgency & communication keywords (English & Hinglish)
const SECURITY_AND_COMMUNICATION_TOKENS = new Set([
  // Banking & Financial
  'bank', 'account', 'card', 'debit', 'credit', 'payment', 'transfer', 'wire',
  'funds', 'money', 'balance', 'withdraw', 'deposit', 'check', 'cheque', 'atm',
  'branch', 'statement', 'refund', 'charge', 'invoice', 'bill', 'due', 'loan',
  'emi', 'crypto', 'wallet', 'bitcoin', 'usdt', 'binance',

  // Indian Payment & Hinglish tokens
  'otp', 'upi', 'pin', 'pan', 'aadhaar', 'kyc', 'paytm', 'gpay', 'phonepe',
  'paisa', 'paise', 'bhai', 'khata', 'bhejo', 'bheja', 'bhej', 'karo', 'turant',
  'mujhe', 'apna', 'de', 'do', 'dena', 'lelo', 'batana',
  'inam', 'yojna', 'namaste', 'shukriya', 'jaldi', 'naukri', 'gadi', 'rupay',
  'rupee', 'rupees', 'rs', 'inr', 'order', 'shipped',

  // Urgency & Psychological pressure
  'urgent', 'immediately', 'suspended', 'blocked', 'frozen', 'expired',
  'terminated', 'action', 'required', 'warning', 'alert', 'notice', 'critical',
  'emergency', 'deadline', 'hours', 'minutes', 'today', 'confirm', 'verify',
  'validate', 'unlock', 'restore', 'unauthorized', 'fraud', 'breach', 'locked',

  // Delivery & Courier
  'delivery', 'package', 'courier', 'shipment', 'parcel', 'tracking', 'address',
  'usps', 'fedex', 'dhl', 'ups', 'customs', 'failed', 'reschedule', 'post',

  // Job & Recruitment
  'job', 'hiring', 'interview', 'salary', 'hr', 'recruiter', 'telegram',
  'whatsapp', 'daily', 'income', 'work', 'part-time', 'full-time', 'bonus',

  // Prizes, Rewards & Offers
  'winner', 'won', 'lottery', 'prize', 'gift', 'voucher', 'cashback', 'reward',
  'claim', 'selected', 'congratulations', 'lucky', 'special', 'free', 'discount',

  // Conversational questions & safety queries
  'scam', 'phishing', 'smishing', 'legit', 'legitimate', 'fake', 'real', 'safe',
  'why', 'how', 'what', 'who', 'when', 'explain', 'check', 'investigate', 'help',
  'call', 'contact', 'customer', 'support', 'service', 'agent', 'executive',
  'password', 'login', 'link', 'click', 'url', 'site', 'website', 'domain'
]);

/**
 * Checks if a string has non-trivial character entropy.
 * Extremely low entropy implies repeating characters (e.g. "aaaaaaaaaaaa").
 */
function getEntropy(str: string): number {
  const map = new Map<string, number>();
  for (const ch of str) {
    map.set(ch, (map.get(ch) || 0) + 1);
  }
  let entropy = 0;
  const len = str.length;
  for (const count of map.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Validates text content submitted by a user for analysis.
 */
export function validateText(rawInput: string): TextValidationResult {
  const trimmed = (rawInput || '').trim();

  // 1. Empty Check
  if (!trimmed) {
    return {
      valid: false,
      inputType: 'text',
      reasonCode: 'EMPTY_INPUT',
      message: 'Nothing to analyze yet.',
      suggestion: 'Please paste a suspicious SMS, email, WhatsApp message, or question.',
    };
  }

  // 2. Technical Indicators Detection (Always meaningful if present!)
  const hasUrl = /https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i.test(trimmed);
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(trimmed);
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/.test(trimmed);
  const hasCurrencyOrNumbers = /[$€£₹]\s*\d+|\b\d+\s*(?:rs|inr|usd|eur|gbp)\b|\b\d{4,8}\b/i.test(trimmed);

  const containsTechnical = hasUrl || hasEmail || hasPhone || hasCurrencyOrNumbers;

  // 3. Script / Language Detection
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed); // Hindi, Sanskrit, Marathi
  const hasCjk = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(trimmed); // Chinese, Japanese, Korean
  const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
  const hasCyrillic = /[\u0400-\u04FF]/.test(trimmed);

  let detectedLanguage: TextValidationResult['detectedLanguage'] = 'latin';
  if (hasDevanagari) detectedLanguage = 'devanagari';
  else if (hasCjk) detectedLanguage = 'cjk';
  else if (hasArabic) detectedLanguage = 'arabic';
  else if (hasCyrillic) detectedLanguage = 'cyrillic';

  // 4. Symbol, Punctuation, and Emoji Only Check
  // Strips unicode punctuation, symbols, whitespace
  const strippedOfSymbols = trimmed.replace(/[\s\p{P}\p{S}\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]+/gu, '');
  if (!strippedOfSymbols && !containsTechnical) {
    return {
      valid: false,
      inputType: 'text',
      reasonCode: 'MEANINGLESS_TEXT',
      message: 'This message contains only punctuation, emojis, or symbols.',
      suggestion: 'Please provide the written text of the communication or notice.',
    };
  }

  // 5. Length Check
  // Single characters without technical indicators are too short
  if (trimmed.length < 2 && !containsTechnical && !hasDevanagari && !hasCjk) {
    return {
      valid: false,
      inputType: 'text',
      reasonCode: 'INPUT_TOO_SHORT',
      message: 'The submitted message is too short to extract meaningful threat signals.',
      suggestion: 'Please paste the full text of the message, alert, or offer.',
    };
  }

  // For 2-3 character inputs, ensure they represent recognizable words or communication
  if (trimmed.length <= 3 && !containsTechnical && !hasDevanagari && !hasCjk) {
    const uppercase = trimmed.toUpperCase();
    const allowedShortWords = new Set([
      'HI', 'HEY', 'HELO', 'OK', 'NO', 'YES', 'BYE',
      'OTP', 'PIN', 'UPI', 'KYC', 'PAN', 'SMS', 'IRS', 'ATM',
      'URL', 'APP', 'NET', 'WEB', 'PAY', 'BUY', 'TAX', 'WIN',
      'JOB', 'SOS', 'HR', 'AD', 'AI', 'CV', 'ID', 'DO', 'GO',
      'ME', 'MY', 'WE', 'HE', 'TO', 'IN', 'ON', 'AT', 'IS', 'AM', 'AS', 'IF', 'OR', 'SO'
    ]);
    if (!allowedShortWords.has(uppercase)) {
      // If it contains at least one vowel and is not a keyboard mash, accept
      const hasVowel = /[aeiouy]/i.test(trimmed);
      if (!hasVowel) {
        return {
          valid: false,
          inputType: 'text',
          reasonCode: 'MEANINGLESS_TEXT',
          message: 'The submitted input contains no recognizable words or communicative content.',
          suggestion: 'Please paste the message or question you would like to analyze.',
        };
      }
    }
  }

  // 6. Character Repetition Check (e.g., "aaaaaaaaaaaa", "1111111111")
  if (trimmed.length >= 6) {
    const charMap = new Map<string, number>();
    for (const c of trimmed.toLowerCase()) {
      if (/[a-z0-9]/.test(c)) {
        charMap.set(c, (charMap.get(c) || 0) + 1);
      }
    }
    const alphanumericCount = Array.from(charMap.values()).reduce((a, b) => a + b, 0);
    if (alphanumericCount > 0) {
      const maxCharCount = Math.max(...Array.from(charMap.values()));
      // If 80%+ of all letters is the same single character
      if (maxCharCount / alphanumericCount > 0.8 && !containsTechnical) {
        return {
          valid: false,
          inputType: 'text',
          reasonCode: 'MEANINGLESS_TEXT',
          message: 'The text appears to consist of repeated characters without communicative content.',
          suggestion: 'Please paste an actual communication, notification, or suspicious link.',
        };
      }
    }
  }

  // 7. Keyboard Row Mash Detection (e.g. "asdfghjkl", "qwertyuiop")
  const normalizedLower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const seq of KEYBOARD_MASH_SEQUENCES) {
    if (normalizedLower === seq || (normalizedLower.length >= 8 && seq.includes(normalizedLower))) {
      return {
        valid: false,
        inputType: 'text',
        reasonCode: 'MEANINGLESS_TEXT',
        message: "This doesn't appear to contain meaningful communication (keyboard pattern detected).",
        suggestion: 'Please paste the actual message or email you would like evaluated.',
      };
    }
  }

  // 8. Word-Level Lexical & Semantic Analysis
  // Tokenize into words
  const words = trimmed.toLowerCase().split(/[\s,.;:!?()[\]{}"'\\/]+/).filter(Boolean);
  let matchedSecurityTokenCount = 0;

  for (const word of words) {
    if (SECURITY_AND_COMMUNICATION_TOKENS.has(word)) {
      matchedSecurityTokenCount++;
    }
  }

  // 9. Consonant Mash / Gibberish Detection (For Latin text without technical indicators)
  if (detectedLanguage === 'latin' && !containsTechnical && words.length <= 3) {
    // Check for excessive consonant clusters without vowels
    // English words rarely have 5+ consecutive consonants unless synthetic or mash
    const hasConsonantMash = /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(trimmed);
    if (hasConsonantMash) {
      return {
        valid: false,
        inputType: 'text',
        reasonCode: 'MEANINGLESS_TEXT',
        message: "This text contains random unpronounceable characters with no discernible meaning.",
        suggestion: 'Please provide real communication text, SMS content, or an email excerpt.',
      };
    }

    // Check vowel ratio in pure letters
    const lettersOnly = trimmed.toLowerCase().replace(/[^a-z]/g, '');
    if (lettersOnly.length >= 8) {
      const vowels = lettersOnly.replace(/[^aeiou]/g, '');
      const vowelRatio = vowels.length / lettersOnly.length;
      // Normal languages have ~25-50% vowels. Under 10% on an 8+ letter string indicates gibberish
      if (vowelRatio < 0.10 && matchedSecurityTokenCount === 0) {
        return {
          valid: false,
          inputType: 'text',
          reasonCode: 'MEANINGLESS_TEXT',
          message: "This text doesn't resemble natural language communication.",
          suggestion: 'Please enter a genuine message, SMS, email, or suspicious query.',
        };
      }
    }
  }

  // 10. Low-Entropy Random Pattern Check
  if (trimmed.length > 20 && !containsTechnical && !hasDevanagari && !hasCjk) {
    const entropy = getEntropy(trimmed.toLowerCase());
    // Normal natural text has entropy > 3.0. Random repeated noise is < 1.8
    if (entropy < 1.8 && matchedSecurityTokenCount === 0) {
      return {
        valid: false,
        inputType: 'text',
        reasonCode: 'MEANINGLESS_TEXT',
        message: 'The text exhibits an unnatural repetitive pattern.',
        suggestion: 'Please provide genuine communication content for analysis.',
      };
    }
  }

  // Passed all validation checks!
  return {
    valid: true,
    inputType: 'text',
    cleanedText: trimmed,
    wordCount: words.length,
    detectedLanguage,
    containsTechnicalIndicators: containsTechnical,
    containsSuspiciousTokens: matchedSecurityTokenCount > 0,
  };
}
