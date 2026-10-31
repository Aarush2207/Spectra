import { User, SavedAnalysis, ChatSession } from '../types/auth';
import { AnalysisResult, RiskLevel } from '../types/index';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY_CURRENT_USER = 'spectra_current_user';
const STORAGE_KEY_LOCAL_SAVED = 'spectra_saved_analyses_local';
const STORAGE_KEY_CHAT_SESSIONS = 'spectra_chat_sessions';
const STORAGE_KEY_WELCOME_SEEN = 'spectra_welcome_seen';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class AuthService {
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.initSession();
  }

  private async initSession() {
    // 1. Try restoring from local cached state for instant render
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch {
      this.currentUser = null;
    }

    // 2. Connect to Supabase Auth state
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          this.currentUser = this.mapSupabaseUser(session.user);
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(this.currentUser));
          this.notify();
        } else if (this.currentUser && !this.currentUser.isGuest) {
          // If Supabase has no session and local wasn't a guest, clean up
          this.currentUser = null;
          localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          this.notify();
        }

        // Listen for live auth state changes (token refresh, login, logout)
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            this.currentUser = this.mapSupabaseUser(session.user);
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(this.currentUser));
          } else if (!this.currentUser?.isGuest) {
            this.currentUser = null;
            localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          }
          this.notify();
        });
      } catch (err) {
        console.warn('Supabase session init fallback:', err);
      }
    }

    this.isInitialized = true;
    this.notify();
  }

  private mapSupabaseUser(sbUser: any): User {
    const displayName = 
      sbUser.user_metadata?.display_name || 
      sbUser.user_metadata?.name || 
      sbUser.email?.split('@')[0] || 
      'Analyst';

    return {
      id: sbUser.id,
      name: displayName,
      email: sbUser.email || '',
      createdAt: sbUser.created_at || new Date().toISOString(),
      isGuest: false
    };
  }

  public subscribe(listener: (user: User | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUser && !this.currentUser.isGuest;
  }

  public isGuest(): boolean {
    return !!this.currentUser?.isGuest;
  }

  public hasSeenWelcome(): boolean {
    // Authenticated users with active accounts do not need the prompt
    if (this.isAuthenticated()) return true;
    // Allow prompt to show every time someone enters or refreshes the site
    return false;
  }

  public markWelcomeSeen() {
    // Dismissed for current interactions without blocking fresh reloads
    sessionStorage.setItem('spectra_welcome_dismissed', 'true');
  }

  public continueAsGuest(): User {
    const guestUser: User = {
      id: `guest-${generateId()}`,
      name: 'Guest Analyst',
      email: 'guest@session.local',
      createdAt: new Date().toISOString(),
      isGuest: true
    };
    this.currentUser = guestUser;
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(guestUser));
    this.markWelcomeSeen();
    this.notify();
    return guestUser;
  }

  public async signUp(name: string, email: string, password: string): Promise<{ user: User; emailConfirmationRequired: boolean }> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('Please provide your full name.');
    }
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      throw new Error('Please provide a valid email address.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          display_name: trimmedName
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Registration completed, but no user record was returned.');
    }

    // Supabase returns identities: [] if user already exists
    if (data.user.identities && data.user.identities.length === 0) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    const emailConfirmationRequired = !data.session;

    const user: User = {
      id: data.user.id,
      name: trimmedName,
      email: trimmedEmail,
      createdAt: data.user.created_at || new Date().toISOString(),
      isGuest: false
    };

    if (!emailConfirmationRequired) {
      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      this.markWelcomeSeen();
      this.notify();
    }

    return { user, emailConfirmationRequired };
  }

  public async signIn(email: string, password: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email inbox to confirm your account before signing in.');
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Authentication succeeded but user profile was not found.');
    }

    // Attempt to load display_name from public.profiles
    let displayName = data.user.user_metadata?.display_name || data.user.user_metadata?.name;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.display_name) {
        displayName = profile.display_name;
      }
    } catch {
      // Ignore if profiles table is not yet accessible
    }

    const user: User = {
      id: data.user.id,
      name: displayName || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      createdAt: data.user.created_at || new Date().toISOString(),
      isGuest: false
    };

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    this.markWelcomeSeen();
    this.notify();
    return user;
  }

  public async signOut() {
    try {
      if (isSupabaseConfigured && this.isAuthenticated()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      // Return visitor to guest mode
      this.continueAsGuest();
    }
  }

  public async resetPassword(email: string): Promise<string> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) throw new Error('Please enter your email.');

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw new Error(error.message);
    }
    return `Password reset instructions have been dispatched to ${trimmedEmail}.`;
  }

  // --- SUPABASE SCANS PERSISTENCE & SYNC ---

  public async saveAnalysis(result: AnalysisResult): Promise<SavedAnalysis> {
    const user = this.currentUser || this.continueAsGuest();
    const isAuth = this.isAuthenticated();

    // Map Risk Level to match Supabase Check Constraint: ('LOW', 'SUSPICIOUS', 'HIGH', 'UNKNOWN')
    let dbRiskLevel: 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'UNKNOWN' = 'LOW';
    if (result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH') {
      dbRiskLevel = 'HIGH';
    } else if (result.riskLevel === 'SUSPICIOUS') {
      dbRiskLevel = 'SUSPICIOUS';
    } else if (result.riskLevel === 'LOW') {
      dbRiskLevel = 'LOW';
    } else {
      dbRiskLevel = 'UNKNOWN';
    }

    // Map Confidence: ('HIGH', 'MEDIUM', 'LOW')
    let dbConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (result.confidence >= 75) dbConfidence = 'HIGH';
    else if (result.confidence >= 45) dbConfidence = 'MEDIUM';
    else dbConfidence = 'LOW';

    let remoteScanId = `save-${generateId()}`;

    // 1. If authenticated, persist to Supabase tables: scans, scan_evidence, scan_urls, scan_recommendations
    if (isAuth && isSupabaseConfigured) {
      try {
        const { data: scanRow, error: scanErr } = await supabase
          .from('scans')
          .insert({
            user_id: user.id,
            scan_type: result.inputType === 'image' ? 'screenshot' : 'text',
            risk_level: dbRiskLevel,
            risk_score: result.riskScore,
            confidence: dbConfidence,
            summary: result.summary,
            message_preview: result.inputContent.slice(0, 300),
            ocr_used: result.inputType === 'image',
            rule_analysis_used: true,
            ai_analysis_used: result.analysisEngineMode === 'LLM_AUGMENTED',
            url_analysis_used: result.urlFindings.length > 0
          })
          .select('id')
          .single();

        if (!scanErr && scanRow?.id) {
          remoteScanId = scanRow.id;

          // Insert evidence items
          if (result.evidence.length > 0) {
            const evidenceRows = result.evidence.map((ev) => ({
              scan_id: scanRow.id,
              phrase: ev.phrase || '',
              reason: ev.explanation || '',
              severity: ev.severity === 'critical' ? 'HIGH' : (ev.severity.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW')
            }));
            await supabase.from('scan_evidence').insert(evidenceRows);
          }

          // Insert URL findings
          if (result.urlFindings.length > 0) {
            const urlRows = result.urlFindings.map((u) => ({
              scan_id: scanRow.id,
              url: u.rawUrl,
              risk: u.riskRating === 'HIGH' ? 'HIGH' : (u.riskRating === 'MEDIUM' ? 'SUSPICIOUS' : 'SAFE'),
              reason: u.reasons.join('; ')
            }));
            await supabase.from('scan_urls').insert(urlRows);
          }

          // Insert recommendations
          if (result.recommendations.length > 0) {
            const recRows = result.recommendations.map((rec) => ({
              scan_id: scanRow.id,
              recommendation: rec
            }));
            await supabase.from('scan_recommendations').insert(recRows);
          }
        }
      } catch (e) {
        console.error('Failed to sync scan to Supabase:', e);
      }
    }

    // 2. Also cache locally for instant access & guest sessions
    const newRecord: SavedAnalysis = {
      id: remoteScanId,
      userId: user.id,
      savedAt: new Date().toISOString(),
      title: result.inputContent.slice(0, 60) + (result.inputContent.length > 60 ? '...' : ''),
      summary: result.summary,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      inputType: result.inputType,
      result
    };

    const localAll: SavedAnalysis[] = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SAVED) || '[]');
    localAll.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY_LOCAL_SAVED, JSON.stringify(localAll));

    return newRecord;
  }

  public async fetchSavedAnalyses(): Promise<SavedAnalysis[]> {
    if (!this.currentUser) return [];

    // If authenticated, fetch from Supabase
    if (this.isAuthenticated() && isSupabaseConfigured) {
      try {
        const { data: scans, error } = await supabase
          .from('scans')
          .select(`
            id,
            user_id,
            created_at,
            scan_type,
            risk_level,
            risk_score,
            confidence,
            summary,
            message_preview,
            ocr_used,
            scan_evidence (phrase, reason, severity),
            scan_urls (url, risk, reason),
            scan_recommendations (recommendation)
          `)
          .eq('user_id', this.currentUser.id)
          .order('created_at', { ascending: false });

        if (!error && scans && scans.length > 0) {
          return scans.map((row: any) => {
            const mappedResult: AnalysisResult = {
              id: row.id,
              timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              inputType: row.scan_type === 'screenshot' ? 'image' : 'text',
              inputContent: row.message_preview || 'Scanned Content',
              riskLevel: row.risk_level as RiskLevel,
              riskScore: row.risk_score || 0,
              confidence: row.confidence === 'HIGH' ? 95 : (row.confidence === 'MEDIUM' ? 70 : 45),
              summary: row.summary,
              evidence: (row.scan_evidence || []).map((e: any, idx: number) => ({
                id: `ev-${idx}`,
                phrase: e.phrase,
                category: 'ANOMALY',
                severity: (e.severity?.toLowerCase() || 'medium') as any,
                explanation: e.reason,
                source: 'DETERMINISTIC_RULE'
              })),
              urlFindings: (row.scan_urls || []).map((u: any) => ({
                rawUrl: u.url,
                protocol: 'https',
                hostname: u.url.replace(/^https?:\/\//, '').split('/')[0],
                domain: u.url,
                tld: '',
                isHttps: true,
                isShortener: false,
                isIpAddress: false,
                hasPunycode: false,
                hasHomoglyphs: false,
                hasUnusualPort: false,
                hasMisleadingSubdomain: false,
                suspiciousTld: false,
                entropyScore: 0,
                riskRating: u.risk === 'HIGH' ? 'HIGH' : (u.risk === 'SUSPICIOUS' ? 'MEDIUM' : 'LOW'),
                reasons: [u.reason]
              })),
              cognitiveTactics: [],
              recommendations: (row.scan_recommendations || []).map((r: any) => r.recommendation),
              limitations: ['Stored in Supabase encrypted cloud intelligence vault.'],
              timing: { engineMs: 12, totalPipelineMs: 12 },
              executionTimeMs: 12,
              analysisEngineMode: 'OFFLINE_HYBRID'
            };

            return {
              id: row.id,
              userId: row.user_id,
              savedAt: row.created_at,
              title: row.message_preview?.slice(0, 60) || 'Spectra Threat Scan',
              summary: row.summary,
              riskLevel: row.risk_level,
              riskScore: row.risk_score || 0,
              inputType: row.scan_type === 'screenshot' ? 'image' : 'text',
              result: mappedResult
            };
          });
        }
      } catch (err) {
        console.warn('Failed to fetch scans from Supabase, falling back to local cache:', err);
      }
    }

    // Fallback to local storage
    try {
      const all: SavedAnalysis[] = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SAVED) || '[]');
      return all.filter((a) => a.userId === this.currentUser?.id);
    } catch {
      return [];
    }
  }

  public getSavedAnalyses(): SavedAnalysis[] {
    try {
      const all: SavedAnalysis[] = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SAVED) || '[]');
      if (!this.currentUser) return [];
      return all.filter((a) => a.userId === this.currentUser?.id);
    } catch {
      return [];
    }
  }

  public async deleteSavedAnalysis(id: string) {
    if (this.isAuthenticated() && isSupabaseConfigured) {
      try {
        await supabase.from('scans').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete scan from Supabase:', e);
      }
    }

    try {
      const all: SavedAnalysis[] = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SAVED) || '[]');
      const filtered = all.filter((a) => a.id !== id);
      localStorage.setItem(STORAGE_KEY_LOCAL_SAVED, JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  }

  // --- CHAT SESSIONS ---
  public getChatSessions(): ChatSession[] {
    try {
      const all: ChatSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT_SESSIONS) || '[]');
      if (!this.currentUser) return [];
      return all.filter((s) => s.userId === this.currentUser?.id);
    } catch {
      return [];
    }
  }

  public saveChatSession(session: ChatSession) {
    try {
      const all: ChatSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT_SESSIONS) || '[]');
      const index = all.findIndex((s) => s.id === session.id);
      if (index >= 0) {
        all[index] = session;
      } else {
        all.unshift(session);
      }
      localStorage.setItem(STORAGE_KEY_CHAT_SESSIONS, JSON.stringify(all));
    } catch (e) {
      console.error(e);
    }
  }

  public deleteChatSession(id: string) {
    try {
      const all: ChatSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT_SESSIONS) || '[]');
      const filtered = all.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY_CHAT_SESSIONS, JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  }
}

export const authService = new AuthService();
