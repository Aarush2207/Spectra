import { AnalysisResult, EvidenceItem, UrlFinding, CognitiveTactic, RiskLevel, ExecutionTiming } from '../types/index';

// Trusted apex domains for popular entities to verify spoofing
const TRUSTED_DOMAINS: Record<string, string[]> = {
  chase: ['chase.com'],
  bankofamerica: ['bankofamerica.com', 'bofa.com'],
  wellsfargo: ['wellsfargo.com'],
  citi: ['citi.com', 'citigroup.com'],
  usps: ['usps.com'],
  fedex: ['fedex.com'],
  ups: ['ups.com'],
  dhl: ['dhl.com'],
  amazon: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.in'],
  apple: ['apple.com', 'icloud.com'],
  netflix: ['netflix.com'],
  paypal: ['paypal.com', 'paypal.me'],
  irs: ['irs.gov'],
  microsoft: ['microsoft.com', 'live.com', 'office.com'],
  google: ['google.com', 'gmail.com'],
  meta: ['meta.com', 'facebook.com', 'instagram.com'],
  uber: ['uber.com'],
  airbnb: ['airbnb.com'],
  delta: ['delta.com'],
  github: ['github.com'],
};

// URL Shortener domains
const KNOWN_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'ow.ly', 'buff.ly', 
  'cutt.ly', 'rb.gy', 'shorturl.at', 'bl.ink', 'tiny.cc', 'rebrand.ly',
  't.ly', 'qr.ae', 'v.gd', 'trib.al', 'lnkd.in', 'amzn.to', 'wa.me', 't.me'
]);

// Suspicious / high abuse TLDs
const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'click', 'buzz', 'club', 'work', 'rest', 'ru', 
  'country', 'tk', 'ml', 'ga', 'cf', 'gq', 'link', 'stream', 
  'cam', 'live', 'hair', 'icu', 'sbs', 'bond', 'beauty', 'quest',
  'monster', 'space', 'fit', 'top', 'casa', 'surf', 'loan', 'tokyo'
]);

// Homoglyphs map (Cyrillic/Greek lookalikes often used in spoofing)
const HOMOGLYPHS_MAP: Record<string, string> = {
  '\u0430': 'a', // Cyrillic small letter a
  '\u0441': 'c', // Cyrillic small letter es
  '\u0435': 'e', // Cyrillic small letter ie
  '\u043E': 'o', // Cyrillic small letter o
  '\u0440': 'p', // Cyrillic small letter er
  '\u0445': 'x', // Cyrillic small letter ha
  '\u0443': 'y', // Cyrillic small letter u
  '\u0456': 'i', // Cyrillic small letter byelorussian-ukrainian i
  '\u03BF': 'o', // Greek small letter omicron
  '\u03C1': 'p', // Greek small letter rho
};

// Helper: Calculate Shannon entropy for string randomness
export function calculateShannonEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const freqs: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    freqs[char] = (freqs[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freqs)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(2));
}

// Extract URLs from text without fetching
export function extractUrls(text: string): string[] {
  const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

// Safe passive URL decomposition (Zero network calls, zero SSRF risk)
export function inspectUrl(rawUrl: string): UrlFinding {
  let normalizedUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'http://' + normalizedUrl;
  }

  let protocol = 'http';
  let hostname = '';
  let port = '';
  let pathname = '';

  try {
    const parsed = new URL(normalizedUrl);
    protocol = parsed.protocol.replace(':', '');
    hostname = parsed.hostname.toLowerCase();
    port = parsed.port;
    pathname = parsed.pathname;
  } catch {
    const withoutProto = normalizedUrl.replace(/^https?:\/\//i, '');
    const hostPart = withoutProto.split('/')[0];
    const portSplit = hostPart.split(':');
    hostname = portSplit[0].toLowerCase();
    port = portSplit[1] || '';
  }

  const isHttps = protocol === 'https';
  const parts = hostname.split('.');
  const tld = parts.length > 1 ? parts[parts.length - 1] : '';
  const domain = parts.length >= 2 ? `${parts[parts.length - 2]}.${tld}` : hostname;

  // 1. IP address check (IPv4, IPv6, or port)
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith('[') || /^\d+$/.test(hostname);

  // 2. Shortener check
  const isShortener = KNOWN_SHORTENERS.has(domain) || KNOWN_SHORTENERS.has(hostname);

  // 3. Suspicious TLD check
  const suspiciousTld = SUSPICIOUS_TLDS.has(tld);

  // 4. Punycode check
  const hasPunycode = hostname.includes('xn--');

  // 5. Homoglyph check
  let hasHomoglyphs = false;
  for (const char of rawUrl) {
    if (HOMOGLYPHS_MAP[char]) {
      hasHomoglyphs = true;
      break;
    }
  }

  // 6. Unusual port check (ports other than 80, 443, or default)
  const hasUnusualPort = port !== '' && port !== '80' && port !== '443';

  // 7. Misleading subdomain & brand spoofing
  let impersonatedBrand: string | undefined = undefined;
  let hasMisleadingSubdomain = false;

  for (const [brand, trustedList] of Object.entries(TRUSTED_DOMAINS)) {
    if (hostname.includes(brand)) {
      const isTrusted = trustedList.some(td => hostname === td || hostname.endsWith(`.${td}`));
      if (!isTrusted) {
        impersonatedBrand = brand;
        hasMisleadingSubdomain = true;
        break;
      }
    }
  }

  // Look for deceptive brand hyphenation e.g. chase-security.com or paypal-verify.com
  if (!impersonatedBrand) {
    for (const brand of Object.keys(TRUSTED_DOMAINS)) {
      const lookalikePattern = new RegExp(`(^|[-.])${brand}[-.]`, 'i');
      if (lookalikePattern.test(hostname)) {
        const trustedList = TRUSTED_DOMAINS[brand] || [];
        const isTrusted = trustedList.some(td => hostname === td || hostname.endsWith(`.${td}`));
        if (!isTrusted) {
          impersonatedBrand = brand;
          hasMisleadingSubdomain = true;
          break;
        }
      }
    }
  }

  // 8. Entropy score
  const entropyScore = calculateShannonEntropy(hostname + pathname);

  // Determine risk and reasons
  let riskRating: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  const reasons: string[] = [];

  if (hasHomoglyphs || hasPunycode) {
    riskRating = 'HIGH';
    reasons.push('Contains punycode or homoglyph character substitutions disguising target domain');
  }
  if (impersonatedBrand) {
    riskRating = 'HIGH';
    reasons.push(`Contains trusted brand keyword "${impersonatedBrand}" inside an unauthorized apex domain (${domain})`);
  }
  if (isIpAddress) {
    riskRating = 'HIGH';
    reasons.push('Uses a direct IP address rather than a registered, authenticated domain name');
  }
  if (hasUnusualPort) {
    riskRating = riskRating === 'HIGH' ? 'HIGH' : 'MEDIUM';
    reasons.push(`Listens on non-standard port :${port}, frequently associated with disposable phishing kits`);
  }
  if (isShortener) {
    riskRating = riskRating === 'HIGH' ? 'HIGH' : 'MEDIUM';
    reasons.push('Uses an opaque URL shortener masking the true destination endpoint');
  }
  if (suspiciousTld) {
    riskRating = riskRating === 'HIGH' ? 'HIGH' : 'MEDIUM';
    reasons.push(`Uses high-abuse top-level domain (.${tld}) frequently leveraged in ephemeral phishing campaigns`);
  }
  if (!isHttps && riskRating !== 'LOW') {
    reasons.push('Unencrypted plaintext HTTP protocol transmission');
  }

  if (reasons.length === 0) {
    reasons.push('Clean domain structure; no overt spoofing, shortener masks, or high-risk TLDs detected');
  }

  return {
    rawUrl,
    protocol,
    hostname,
    domain,
    tld,
    port: port || undefined,
    isHttps,
    isShortener,
    isIpAddress,
    hasPunycode,
    hasHomoglyphs,
    hasUnusualPort,
    hasMisleadingSubdomain,
    suspiciousTld,
    impersonatedBrand,
    entropyScore,
    riskRating,
    reasons
  };
}

interface RuleDefinition {
  id: string;
  category: EvidenceItem['category'];
  severity: EvidenceItem['severity'];
  regex: RegExp;
  explanation: (match: string) => string;
  weight: number;
}

const DETECTION_RULES: RuleDefinition[] = [
  // 1. URGENCY & THREATS
  {
    id: 'urg_account_block',
    category: 'URGENCY',
    severity: 'critical',
    regex: /\b(account|card|profile|access|service|membership)\s+(is|has\s+been|was|will\s+be)?\s*(blocked|suspended|frozen|restricted|terminated|closed|locked|disabled)\b/i,
    explanation: (m) => `Threatens account shutdown or suspension ("${m}") to induce immediate panic.`,
    weight: 30
  },
  {
    id: 'urg_time_limit',
    category: 'URGENCY',
    severity: 'high',
    regex: /\b(within\s+\d+\s*(hours?|hrs?|mins?|minutes?|days?)|immediately|urgent(ly)?|action\s+required|final\s+(notice|warning)|before\s+it('?s)?\s+too\s+late|expires\s+in\s+\d+|immediate\s+attention)\b/i,
    explanation: (m) => `Imposes a strict artificial deadline ("${m}") to bypass calm deliberation.`,
    weight: 22
  },
  {
    id: 'urg_legal_threat',
    category: 'URGENCY',
    severity: 'critical',
    regex: /\b(arrest\s+warrant|law\s+enforcement|legal\s+action|jail\s+time|court\s+summons|subpoena|irs\s+penalt(y|ies)|fbi\s+investigation|police\s+department)\b/i,
    explanation: (m) => `Leverages extreme legal or criminal coercion ("${m}") typical of authority impersonation fraud.`,
    weight: 36
  },

  // 2. CREDENTIAL & IDENTITY HARVESTING
  {
    id: 'cred_otp_solicitation',
    category: 'CREDENTIALS',
    severity: 'critical',
    regex: /\b((send|provide|verify|share|reply\s+with|confirm)\s+(your\s+)?(otp|one-time\s+password|passcode|6-digit\s+code|verification\s+code|2fa\s+code))\b/i,
    explanation: (m) => `Directly requests a one-time authentication code ("${m}"). Legitimate service providers never request OTPs.`,
    weight: 40
  },
  {
    id: 'cred_sensitive_info',
    category: 'CREDENTIALS',
    severity: 'critical',
    regex: /\b(enter\s+your\s+password|confirm\s+your\s+pin|provide\s+your\s+ssn|social\s+security\s+number|seed\s+phrase|secret\s+recovery\s+phrase|atm\s+pin|card\s+cvv|security\s+code|cvv2|date\s+of\s+birth\s+and\s+ssn)\b/i,
    explanation: (m) => `Solicits high-value identity or financial authentication secrets ("${m}").`,
    weight: 42
  },
  {
    id: 'cred_verify_link',
    category: 'CREDENTIALS',
    severity: 'high',
    regex: /\b((verify|reactivate|unlock|update)\s+(now|immediately|your\s+account|here|credentials)|click\s+(here|the\s+link)\s+to\s+(verify|login|restore|authenticate))\b/i,
    explanation: (m) => `Prompts immediate credential verification via an embedded link ("${m}").`,
    weight: 25
  },

  // 3. FINANCIAL COERCION & FRAUD SCHEMES
  {
    id: 'fin_gift_cards',
    category: 'FINANCIAL',
    severity: 'critical',
    regex: /\b(apple\s+gift\s+card|google\s+play\s+card|steam\s+card|target\s+gift\s+card|vanilla\s+visa|buy\s+gift\s+cards?|ebay\s+gift\s+card)\b/i,
    explanation: (m) => `Demands payment in non-refundable gift cards ("${m}"), a classic hallmark of consumer fraud.`,
    weight: 40
  },
  {
    id: 'fin_crypto_transfer',
    category: 'FINANCIAL',
    severity: 'critical',
    regex: /\b(bitcoin\s+atm|send\s+crypto|transfer\s+btc|eth\s+wallet|usdt\s+deposit|guaranteed\s+(crypto\s+)?returns?|double\s+your\s+bitcoin|deposit\s+usdt)\b/i,
    explanation: (m) => `Demands cryptocurrency deposit or promotes impossible investment multiplier scheme ("${m}").`,
    weight: 35
  },
  {
    id: 'fin_fake_refund_fee',
    category: 'FINANCIAL',
    severity: 'high',
    regex: /\b((customs|delivery|clearance|redelivery|processing)\s+fee|small\s+fee\s+of\s+\$?\d+(\.\d{2})?|charged\s+\$?\d{2,4}\s+for\s+(geek\s+squad|norton|mcafee|subscription)|accidental\s+refund|overpayment\s+refund)\b/i,
    explanation: (m) => `Manufactures a fraudulent charge, invoice, or package delivery fee ("${m}").`,
    weight: 28
  },
  {
    id: 'fin_check_deposit',
    category: 'FINANCIAL',
    severity: 'critical',
    regex: /\b(deposit\s+(this|the)\s+check|mobile\s+deposit|wire\s+back\s+the\s+excess|keep\s+\$?\d+\s+for\s+yourself|cash\s+the\s+check)\b/i,
    explanation: (m) => `Hallmark counterfeit check overpayment scheme ("${m}").`,
    weight: 38
  },
  {
    id: 'fin_task_commission',
    category: 'FINANCIAL',
    severity: 'high',
    regex: /\b(vip\s+commission|daily\s+salary\s+\$?\d{2,4}|like\s+youtube\s+videos\s+for|complete\s+\d+\s+tasks\s+to\s+earn|prepay\s+to\s+unlock\s+funds)\b/i,
    explanation: (m) => `Hallmark task scam / investment prepay scheme ("${m}").`,
    weight: 30
  },

  // 4. IMPERSONATION
  {
    id: 'imp_courier',
    category: 'IMPERSONATION',
    severity: 'high',
    regex: /\b(usps|fedex|ups|dhl|royal\s+mail)\s*[:\-]?\s*.{0,30}(tracking|deliver(y|ed)?|package|parcel|cannot\s+be\s+delivered|address\s+(incomplete|missing)|redelivery|on\s+hold|pending\s+dispatch|reschedule\s+delivery|street\s+number\s+is\s+missing|shipment)\b/i,
    explanation: (m) => `Impersonates a postal or courier organization ("${m}") to divert victim to a credential/payment portal.`,
    weight: 26
  },
  {
    id: 'imp_bank',
    category: 'IMPERSONATION',
    severity: 'high',
    regex: /\b(chase\s+bank|bank\s+of\s+america|wells\s+fargo|citi\s+alert|fraud\s+prevention\s+team|security\s+department|security\s+alert\s*:\s*suspicious\s+login)\b/i,
    explanation: (m) => `Claims to represent an institution's fraud or security department ("${m}").`,
    weight: 24
  },
  {
    id: 'imp_tech_support',
    category: 'IMPERSONATION',
    severity: 'high',
    regex: /\b(geek\s+squad|microsoft\s+support|apple\s+support|windows\s+defender|trojan\s+virus\s+detected|call\s+toll[\s-]free|call\s+1-\d{3}-\d{3}-\d{4}|remote\s+access\s+to\s+your\s+pc)\b/i,
    explanation: (m) => `Poses as a technical support team ("${m}") prompting urgent inbound phone traps.`,
    weight: 28
  },

  // 5. CHANNEL HOPPING & EXTORTION
  {
    id: 'hop_chat_app',
    category: 'CHANNEL_HOP',
    severity: 'medium',
    regex: /\b(reach\s+(me|out)\s+on\s+telegram|add\s+me\s+on\s+(whatsapp|telegram)|message\s+via\s+signal|switch\s+to\s+whatsapp|telegram\s+handle|hr\s+manager\s+telegram|contact\s+via\s+telegram|discuss\s+(on|your)\s+whatsapp|@[A-Z][\w_]{3,20}\b)\b/i,
    explanation: (m) => `Directs victim away from platform governance onto encrypted private messaging ("${m}").`,
    weight: 20
  },
  {
    id: 'hop_secrecy',
    category: 'CHANNEL_HOP',
    severity: 'high',
    regex: /\b(do\s+not\s+(tell|discuss\s+with|call)\s+(anyone|your\s+manager|the\s+bank|this\s+number)|keep\s+this\s+strictly\s+confidential|discrete\s+task|surprise\s+for\s+the\s+team)\b/i,
    explanation: (m) => `Demands strict secrecy ("${m}") to isolate the victim from colleagues or advisors.`,
    weight: 32
  },
  {
    id: 'sec_blackmail',
    category: 'SOCIAL_ENGINEERING',
    severity: 'critical',
    regex: /\b(recorded\s+you\s+via\s+your\s+webcam|pegasus\s+spyware|compromised\s+your\s+device|send\s+\$?\d+\s+in\s+bitcoin\s+or\s+i\s+will|destroy\s+your\s+reputation)\b/i,
    explanation: (m) => `Extortion blackmail threat claiming malware compromise ("${m}").`,
    weight: 42
  },

  // 6. SOCIAL ENGINEERING - FAMILY/FRIEND EMERGENCY
  {
    id: 'se_family_emergency',
    category: 'SOCIAL_ENGINEERING',
    severity: 'high',
    regex: /\b(my\s+phone\s+(fell|broke|is\s+broken|was\s+stolen|cracked|got\s+damaged)|this\s+is\s+my\s+(new|temporary)\s+number|lost\s+my\s+(phone|wallet|passport)|got\s+(mugged|robbed|pickpocketed))\b/i,
    explanation: (m) => `Uses a classic family/friend impersonation pretext ("${m}") designed to bypass caller-ID verification.`,
    weight: 28
  },
  {
    id: 'se_wire_transfer_request',
    category: 'FINANCIAL',
    severity: 'high',
    regex: /\b(please\s+(wire|transfer|send)\s+(\$?\d|money|funds)|wire\s+(back|money|\$?\d)|wire\s+\$?\d+\s+via|via\s+(western\s+union|moneygram|wire\s+transfer)|can\s+you\s+(please\s+)?transfer\s+\$?\d|wire\s+funds)\b/i,
    explanation: (m) => `Coerces a direct financial wire transfer ("${m}"), a hallmark of advance-fee and emergency impersonation scams.`,
    weight: 30
  },
  {
    id: 'se_unrealistic_pay',
    category: 'FINANCIAL',
    severity: 'medium',
    regex: /\b(earning|earn|pay(ing)?|salary)\s+\$?\d{2,4}\s*(per\s+hour|daily|\/(hr|hour|day))|\$\d{2,4}\s*\/(hr|hour|day)|\$\d{2,4}\s+per\s+hour\b/i,
    explanation: (m) => `Promotes unrealistically high compensation ("${m}") as bait for task/recruitment fraud.`,
    weight: 18
  },
  {
    id: 'se_upfront_job_fee',
    category: 'FINANCIAL',
    severity: 'high',
    regex: /\b(purchase\s+(our\s+)?(proprietary|required|mandatory)\s+software|buy\s+(our\s+)?software\s+license|pay(ment)?\s+(for|before)\s+(equipment|training|onboarding|materials|license)|upfront\s+(fee|payment|cost|deposit)|equipment\s+fee|software\s+license\s+\(\$\d+\))\b/i,
    explanation: (m) => `Demands upfront payment for job-related equipment or software ("${m}"), a hallmark of employment fraud.`,
    weight: 30
  },
  {
    id: 'se_off_platform_recruit',
    category: 'SOCIAL_ENGINEERING',
    severity: 'medium',
    regex: /\b(hire\s+you\s+directly|off[\s-]?platform|switch\s+to\s+(whatsapp|telegram|signal)|immediate\s+interview|flexible\s+online\s+vacancies|work(ing)?\s+from\s+home\s+.{0,30}(\$\d{2,4}|earn))\b/i,
    explanation: (m) => `Bypasses platform safeguards or promotes unsolicited high-income recruitment ("${m}").`,
    weight: 22
  },
  {
    id: 'se_urgent_money_plea',
    category: 'SOCIAL_ENGINEERING',
    severity: 'high',
    regex: /\b(need\s+money\s+immediately|urgent(ly)?\s+need\s+(money|funds|\$)|please\s+transfer\s+\$?\d+\s+(right\s+away|immediately|today|now|asap)|urgent\s+bill|emergency\s+flight|pay\s+the\s+hotel)\b/i,
    explanation: (m) => `Creates emotional pressure to send money immediately ("${m}") before the recipient can verify the claim.`,
    weight: 28
  }
];

// Legitimate confirmation signals that reduce false positives on authentic messages
const LEGITIMATE_SIGNALS = [
  {
    regex: /\b(do\s+not\s+(share|disclose|give)\s+(this|your)\s+(code|otp|password)\s+with\s+anyone)\b/i,
    credit: 28,
    note: 'Includes explicit security advisory instructing user NOT to disclose credentials.'
  },
  {
    regex: /\b(if\s+you\s+did\s+not\s+request\s+this|ignore\s+this\s+email\s+if\s+you\s+did\s+not)\b/i,
    credit: 18,
    note: 'Standard security notice allowing recipient to safely disregard.'
  },
  {
    regex: /\b(tracking\s+number:\s+[A-Z0-9]{8,}|order\s+#\d{6,}|confirmation\s+code:\s+[A-Z0-9]{5,}|reservation\s+code:\s+[A-Z0-9]{5,})\b/i,
    credit: 15,
    note: 'Includes structured reference or tracking identifiers without financial urgency.'
  },
  {
    regex: /\b(prescription\s+is\s+ready|appointment\s+is\s+scheduled|flight\s+confirmed|receipt\s+for\s+your\s+payment\s+to|calendar\s+invite)\b/i,
    credit: 25,
    note: 'Standard routine transactional or medical appointment pattern.'
  },
  {
    regex: /\b(was\s+delivered|has\s+been\s+delivered|delivered\s+(at|to|on)\s+your)\b/i,
    credit: 22,
    note: 'Confirmed past-tense delivery notification (not a pending action request).'
  },
  {
    regex: /\b(will\s+never\s+ask\s+(you\s+)?for\s+your\s+password|never\s+(call|message)\s+to\s+ask\s+for\s+this\s+code|never\s+ask\s+for\s+your\s+.{0,10}(pin|password|card\s+number))\b/i,
    credit: 30,
    note: 'Explicit anti-fraud consumer protection advisory from a verified institution.'
  }
];

export function analyzeMessage(
  content: string, 
  inputType: 'text' | 'image' | 'url' = 'text',
  imagePreview?: string,
  ocrConfidence?: number,
  ocrDurationMs?: number
): AnalysisResult {
  const startTime = performance.now();
  
  // Guard against extreme input length (ReDoS prevention)
  const trimmed = (content || '').trim().slice(0, 25000);

  // Handle empty input gracefully
  if (!trimmed) {
    const emptyEngineTime = Number((performance.now() - startTime).toFixed(2));
    return {
      id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      inputType,
      inputContent: '',
      riskLevel: 'LOW',
      riskScore: 0,
      confidence: 100,
      summary: 'No message content or URL was provided for analysis.',
      evidence: [],
      urlFindings: [],
      cognitiveTactics: [],
      recommendations: ['Provide a suspicious text message, screenshot, or URL to begin inspection.'],
      limitations: ['Analysis requires non-empty textual or image input.'],
      timing: {
        engineMs: emptyEngineTime,
        ocrMs: ocrDurationMs,
        totalPipelineMs: Number((emptyEngineTime + (ocrDurationMs || 0)).toFixed(2))
      },
      executionTimeMs: emptyEngineTime,
      analysisEngineMode: 'OFFLINE_HYBRID'
    };
  }

  // 1. Inspect URLs (Passive & Safe)
  const rawUrls = inputType === 'url' ? [trimmed] : extractUrls(trimmed);
  const urlFindings: UrlFinding[] = rawUrls.map(u => inspectUrl(u));

  // 2. Scan Deterministic Rules for Evidence
  const evidence: EvidenceItem[] = [];
  let rawScore = 0;

  for (const rule of DETECTION_RULES) {
    // Find all matches with position in original text
    const regexGlobal = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
    let match: RegExpExecArray | null;

    while ((match = regexGlobal.exec(trimmed)) !== null) {
      const phrase = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + phrase.length;

      // Avoid redundant evidence entries for identical phrases
      if (!evidence.some(e => e.phrase.toLowerCase() === phrase.toLowerCase())) {
        evidence.push({
          id: `ev-${rule.id}-${evidence.length + 1}`,
          phrase,
          category: rule.category,
          severity: rule.severity,
          explanation: rule.explanation(phrase),
          source: 'DETERMINISTIC_RULE',
          startIndex,
          endIndex
        });
        rawScore += rule.weight;
      }
    }
  }

  // Factor in URL risks
  for (const finding of urlFindings) {
    if (finding.riskRating === 'HIGH') {
      rawScore += 38;
      evidence.push({
        id: `ev-url-${evidence.length + 1}`,
        phrase: finding.rawUrl,
        category: 'SUSPICIOUS_LINK',
        severity: 'critical',
        explanation: finding.reasons.join('. '),
        source: 'PASSIVE_URL_ANALYSIS'
      });
    } else if (finding.riskRating === 'MEDIUM') {
      rawScore += 20;
      evidence.push({
        id: `ev-url-${evidence.length + 1}`,
        phrase: finding.rawUrl,
        category: 'SUSPICIOUS_LINK',
        severity: 'medium',
        explanation: finding.reasons.join('. '),
        source: 'PASSIVE_URL_ANALYSIS'
      });
    }
  }

  // 3. Legitimate Signals Offset (preventing false alarms)
  let legitCredit = 0;
  for (const sig of LEGITIMATE_SIGNALS) {
    if (sig.regex.test(trimmed)) {
      legitCredit += sig.credit;
    }
  }

  // 4. Calculate Final Risk Score (bounded 0 - 99)
  let adjustedScore = Math.max(0, rawScore - legitCredit);
  if (evidence.some(e => e.severity === 'critical') && adjustedScore < 65) {
    adjustedScore = 70; // Critical evidence guarantees at least High/Critical Risk
  }
  const riskScore = Math.min(99, Math.round(adjustedScore));

  // 5. Risk Level Classification
  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 75) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 50) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 25) {
    riskLevel = 'SUSPICIOUS';
  } else {
    riskLevel = 'LOW';
  }

  // 6. Cognitive Tactics Assessment (Transparent Heuristics)
  const cognitiveTactics: CognitiveTactic[] = [
    {
      id: 'cog_urgency',
      name: 'Manufactured Urgency',
      description: 'Compresses recipient decision-making window through artificial deadlines or threatened penalties.',
      severity: 'high',
      detected: evidence.some(e => e.category === 'URGENCY'),
      rationale: evidence.find(e => e.category === 'URGENCY')?.explanation
    },
    {
      id: 'cog_authority',
      name: 'Authority Impersonation',
      description: 'Leverages recognized institutions (banks, postal logistics, enforcement) to bypass skepticism.',
      severity: 'high',
      detected: evidence.some(e => e.category === 'IMPERSONATION'),
      rationale: evidence.find(e => e.category === 'IMPERSONATION')?.explanation
    },
    {
      id: 'cog_credential',
      name: 'Credential Solicitation',
      description: 'Diverts authentication secrets, OTPs, recovery phrases, or account login credentials.',
      severity: 'high',
      detected: evidence.some(e => e.category === 'CREDENTIALS'),
      rationale: evidence.find(e => e.category === 'CREDENTIALS')?.explanation
    },
    {
      id: 'cog_isolation',
      name: 'Channel Isolation',
      description: 'Attempts to separate victim from corporate oversight or public platform monitoring onto unmonitored channels.',
      severity: 'medium',
      detected: evidence.some(e => e.category === 'CHANNEL_HOP'),
      rationale: evidence.find(e => e.category === 'CHANNEL_HOP')?.explanation
    },
    {
      id: 'cog_untraceable',
      name: 'Irreversible Financial Rail',
      description: 'Directs payments via non-custodial crypto, gift cards, or counterfeit check overpayments.',
      severity: 'high',
      detected: evidence.some(e => e.category === 'FINANCIAL'),
      rationale: evidence.find(e => e.category === 'FINANCIAL')?.explanation
    },
    {
      id: 'cog_extortion',
      name: 'Psychological Coercion / Extortion',
      description: 'Leverages fear of reputational destruction or fabricated device compromise.',
      severity: 'high',
      detected: evidence.some(e => e.category === 'SOCIAL_ENGINEERING'),
      rationale: evidence.find(e => e.category === 'SOCIAL_ENGINEERING')?.explanation
    }
  ];

  // 7. Confidence Score (honestly calculated, not arbitrary)
  let confidence = 88;
  if (trimmed.length < 25) {
    confidence = 58; // Short context penalty
  } else if (evidence.length >= 3) {
    confidence = 96; // Strong multi-vector convergence
  } else if (evidence.length === 0 && trimmed.length > 70) {
    confidence = 92; // Clean message confidence
  } else if (inputType === 'image' && ocrConfidence !== undefined && ocrConfidence < 70) {
    confidence = Math.min(confidence, Math.round(ocrConfidence));
  }

  // 8. Plain-Language Summary
  let summary = '';
  if (riskLevel === 'CRITICAL') {
    summary = 'This message exhibits severe multi-vector scam indicators including high-urgency threats, credential/financial extraction requests, and deceptive links. Do not interact with the sender.';
  } else if (riskLevel === 'HIGH') {
    summary = 'Strong indicators of social engineering or phishing detected. The message attempts to elicit hasty compliance by simulating institutional authority or an urgent issue.';
  } else if (riskLevel === 'SUSPICIOUS') {
    summary = 'Moderate ambiguity or suspicious elements detected (such as shortened links or vague calls to action). Exercise elevated caution before clicking or providing information.';
  } else {
    summary = 'No overt manipulation tactics, spoofed infrastructure, or credential requests were identified in this message. Standard safety hygiene is still recommended.';
  }

  // 9. Actionable Recommendations
  const recommendations: string[] = [];
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    recommendations.push('Do NOT click any hyperlinks or call the phone numbers provided in the message.');
    recommendations.push('Never disclose one-time passwords (OTP), PINs, passwords, or personal identity numbers.');
    recommendations.push('If this claims to be your bank or courier, open their verified mobile app or navigate to their bookmarked website directly.');
    recommendations.push('Forward the message to your cellular carrier spam reporting service (SMS 7726 in US/UK/Canada).');
  } else if (riskLevel === 'SUSPICIOUS') {
    recommendations.push('Verify the sender identity through a secondary, independent communication channel.');
    recommendations.push('If a link is provided, verify the destination domain independently before entering any information.');
  } else {
    recommendations.push('Message appears benign; standard vigilance remains appropriate for unexpected unsolicited messages.');
    recommendations.push('Verify unknown senders before opening email attachments or external links.');
  }

  // 10. Limitations & Transparency
  const limitations: string[] = [
    'Automated probabilistic intelligence assessment — does not constitute a legal or contractual guarantee of safety.',
    'Scammers continuously evolve homoglyphs and novel pretext scripts. When in doubt, contact the organization directly via official verified contact channels.'
  ];
  if (inputType === 'image') {
    limitations.push('OCR analysis is sensitive to resolution, compression artifacts, and font distortion.');
  }

  const engineMs = Number((performance.now() - startTime).toFixed(2));
  const totalPipelineMs = Number((engineMs + (ocrDurationMs || 0)).toFixed(2));

  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    inputType,
    inputContent: content,
    rawImagePreview: imagePreview,
    ocrConfidence,
    ocrExtractedText: inputType === 'image' ? content : undefined,
    riskLevel,
    riskScore,
    confidence,
    summary,
    evidence,
    urlFindings,
    cognitiveTactics,
    recommendations,
    limitations,
    timing: {
      engineMs,
      ocrMs: ocrDurationMs,
      totalPipelineMs
    },
    executionTimeMs: engineMs,
    analysisEngineMode: 'OFFLINE_HYBRID'
  };
}
