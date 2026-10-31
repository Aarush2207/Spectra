/**
 * SPECTRA — Intelligent URL Validation Layer
 *
 * Validates URLs before dispatching to the intelligence pipeline.
 * Protects against SSRF, unsupported protocols, malformed inputs,
 * while safely accepting shortened, suspicious, and lookalike domains.
 */

export type UrlValidationReasonCode =
  | 'EMPTY_INPUT'
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'INVALID_HOSTNAME';

export interface UrlValidationResult {
  valid: boolean;
  inputType: 'url';
  normalizedUrl?: string;
  hostname?: string;
  isShortener?: boolean;
  isPunycode?: boolean;
  isIpAddress?: boolean;
  reasonCode?: UrlValidationReasonCode;
  message?: string;
  suggestion?: string;
}

// Common URL shortener services
const KNOWN_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'rb.gy',
  'bl.ink',
  'tiny.cc',
  's.id',
  'v.gd',
]);

// Private and dangerous IP ranges (SSRF protection)
function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, a, b, c, d] = ipv4Match.map(Number);
    if ([a, b, c, d].some((octet) => octet < 0 || octet > 255)) return true;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback/localhost)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local / AWS/GCP Metadata!)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;
  }

  // Localhost aliases & IPv6 loopback
  const lower = ip.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a candidate URL string.
 */
export function validateUrl(rawInput: string): UrlValidationResult {
  const trimmed = (rawInput || '').trim();

  if (!trimmed) {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'EMPTY_INPUT',
      message: 'No web address provided to analyze.',
      suggestion: 'Please enter a complete HTTP or HTTPS URL to inspect.',
    };
  }

  // Reject dangerous pseudo-protocols before parsing
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('view-source:')
  ) {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'UNSUPPORTED_PROTOCOL',
      message: 'Unsupported or unsafe URL protocol.',
      suggestion: 'Only web addresses using HTTP or HTTPS are supported.',
    };
  }

  // Check if protocol is present; if not, test with https:// prefix
  let candidate = trimmed;
  const hasProtocol = /^https?:\/\//i.test(candidate);
  if (!hasProtocol) {
    // If it starts with other protocol like ftp://, ws://
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(candidate)) {
      return {
        valid: false,
        inputType: 'url',
        reasonCode: 'UNSUPPORTED_PROTOCOL',
        message: 'Unsupported URL protocol. Only HTTP and HTTPS are permitted.',
        suggestion: 'Please provide a standard web URL beginning with http:// or https://.',
      };
    }
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'INVALID_URL',
      message: "This doesn't appear to be a valid web address.",
      suggestion: 'Please verify the URL structure (e.g., https://example.com/path).',
    };
  }

  // Verify protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'UNSUPPORTED_PROTOCOL',
      message: `Protocol "${parsed.protocol}" is not supported.`,
      suggestion: 'Only HTTP and HTTPS links can be safely inspected.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Validate hostname exists and is not empty
  if (!hostname) {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'INVALID_HOSTNAME',
      message: 'The submitted URL has an empty or invalid domain name.',
      suggestion: 'Ensure the link includes a full domain name (e.g. domain.com).',
    };
  }

  // SSRF & Private IP Protection
  if (isPrivateOrReservedIp(hostname)) {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'INVALID_HOSTNAME',
      message: 'Internal, localhost, and private network addresses cannot be inspected for security.',
      suggestion: 'Enter a public website URL that is accessible on the open web.',
    };
  }

  // Hostname must contain at least one dot (e.g. example.com) or be a public IP
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (!isIp && !hostname.includes('.')) {
    return {
      valid: false,
      inputType: 'url',
      reasonCode: 'INVALID_HOSTNAME',
      message: "The domain name doesn't have a valid top-level domain extension.",
      suggestion: 'Please include the complete domain (e.g. website.com or link.org).',
    };
  }

  // Check top-level domain if not IP
  if (!isIp) {
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2 && !tld.startsWith('xn--')) {
      return {
        valid: false,
        inputType: 'url',
        reasonCode: 'INVALID_HOSTNAME',
        message: 'The web address has an unrecognized top-level domain.',
        suggestion: 'Verify the spelling of the domain extension.',
      };
    }
  }

  const isShortener = KNOWN_SHORTENERS.has(hostname);
  const isPunycode = hostname.includes('xn--');

  return {
    valid: true,
    inputType: 'url',
    normalizedUrl: parsed.href,
    hostname,
    isShortener,
    isPunycode,
    isIpAddress: isIp,
  };
}
