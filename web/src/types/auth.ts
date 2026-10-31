import { AnalysisResult } from './index';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isGuest?: boolean;
}

export interface SignUpResult {
  user: User;
  emailConfirmationRequired: boolean;
}

export interface SavedAnalysis {
  id: string;
  userId: string;
  savedAt: string;
  title: string;
  summary: string;
  riskLevel: 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  inputType: 'text' | 'image' | 'url';
  result: AnalysisResult;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'spectra';
  text: string;
  timestamp: string;
  inputType?: 'text' | 'image' | 'url';
  imagePreview?: string;
  analysisResult?: AnalysisResult;
  isStreaming?: boolean;
  isError?: boolean;
  errorCode?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
