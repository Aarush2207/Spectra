export type RiskLevel = 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';

export type EvidenceCategory = 
  | 'URGENCY'
  | 'CREDENTIALS'
  | 'FINANCIAL'
  | 'IMPERSONATION'
  | 'SUSPICIOUS_LINK'
  | 'CHANNEL_HOP'
  | 'ANOMALY'
  | 'SOCIAL_ENGINEERING';

export type EvidenceSource = 
  | 'DETERMINISTIC_RULE' 
  | 'PASSIVE_URL_ANALYSIS' 
  | 'COGNITIVE_HEURISTIC' 
  | 'LLM_SEMANTIC_ANALYSIS';

export interface EvidenceItem {
  id: string;
  phrase: string;
  category: EvidenceCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  source: EvidenceSource;
  startIndex?: number;
  endIndex?: number;
}

export interface UrlFinding {
  rawUrl: string;
  protocol: string;
  hostname: string;
  domain: string;
  tld: string;
  port?: string;
  isHttps: boolean;
  isShortener: boolean;
  isIpAddress: boolean;
  hasPunycode: boolean;
  hasHomoglyphs: boolean;
  hasUnusualPort: boolean;
  hasMisleadingSubdomain: boolean;
  suspiciousTld: boolean;
  impersonatedBrand?: string;
  entropyScore: number;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
}

export interface CognitiveTactic {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detected: boolean;
  rationale?: string;
}

export interface ExecutionTiming {
  engineMs: number;
  ocrMs?: number;
  totalPipelineMs: number;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  inputType: 'text' | 'image' | 'url';
  inputContent: string;
  rawImagePreview?: string;
  ocrConfidence?: number;
  ocrExtractedText?: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100
  confidence: number; // 0 - 100 certainty
  summary: string;
  evidence: EvidenceItem[];
  urlFindings: UrlFinding[];
  cognitiveTactics: CognitiveTactic[];
  recommendations: string[];
  limitations: string[];
  timing: ExecutionTiming;
  executionTimeMs: number; // Legacy alias for backward compatibility
  analysisEngineMode: 'OFFLINE_HYBRID' | 'LLM_AUGMENTED';
}

export type BenchmarkCategory = 
  | 'Legitimate Communication'
  | 'Phishing & Credential Theft'
  | 'Financial & Investment Fraud'
  | 'Authority Impersonation'
  | 'Fake Recruitment'
  | 'Delivery & Courier Phishing'
  | 'Social Engineering & Extortion';

export interface BenchmarkCase {
  id: string;
  title: string;
  category: BenchmarkCategory;
  inputType: 'text' | 'image' | 'url';
  content: string;
  groundTruthRisk: RiskLevel;
  groundTruthBinary: 'LEGITIMATE' | 'SCAM';
  expectedScoreRange: [number, number];
  description: string;
  sourceType: 'SYNTHETIC_BENCHMARK' | 'REPORTED_PATTERN';
}

export interface BenchmarkReport {
  totalCases: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  specificity: number;
  avgLatencyMs: number;
  results: Array<{
    caseId: string;
    title: string;
    category: BenchmarkCategory;
    groundTruthRisk: RiskLevel;
    groundTruthBinary: 'LEGITIMATE' | 'SCAM';
    predictedRisk: RiskLevel;
    predictedBinary: 'LEGITIMATE' | 'SCAM';
    score: number;
    matched: boolean;
    latencyMs: number;
  }>;
}
