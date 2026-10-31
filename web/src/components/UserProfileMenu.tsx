import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  Bookmark, 
  MessageSquare, 
  ShieldCheck, 
  ChevronDown, 
  Trash2, 
  ExternalLink,
  Clock,
  Sparkles,
  X,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { authService } from '../lib/authService';
import { User, SavedAnalysis, ChatSession } from '../types/auth';
import { AnalysisResult } from '../types/index';

interface UserProfileMenuProps {
  onOpenAuth: (mode?: 'welcome' | 'signin' | 'signup') => void;
  onLoadSavedAnalysis?: (result: AnalysisResult) => void;
  onOpenChatSession?: (session: ChatSession) => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onOpenAuth,
  onLoadSavedAnalysis,
  onOpenChatSession,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'account' | 'saved' | 'history'>('none');
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openSavedModal = async () => {
    setActiveModal('saved');
    setIsDropdownOpen(false);
    const data = await authService.fetchSavedAnalyses();
    setSavedAnalyses(data);
  };

  const openHistoryModal = () => {
    setChatSessions(authService.getChatSessions());
    setActiveModal('history');
    setIsDropdownOpen(false);
  };

  const openAccountModal = () => {
    setActiveModal('account');
    setIsDropdownOpen(false);
  };

  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await authService.deleteSavedAnalysis(id);
    const data = await authService.fetchSavedAnalyses();
    setSavedAnalyses(data);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    authService.deleteChatSession(id);
    setChatSessions(authService.getChatSessions());
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-[#fef3f2] text-[#d92d20] border-[#d92d20]/30';
      case 'SUSPICIOUS':
        return 'bg-[#fffaeb] text-[#f79009] border-[#f79009]/30';
      default:
        return 'bg-[#ecfdf3] text-[#12b76a] border-[#12b76a]/30';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      {currentUser && !currentUser.isGuest ? (
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white shadow-sm transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-[#8055e8] text-white flex items-center justify-center font-bold text-[11px]">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:inline-block max-w-[120px] truncate">{currentUser.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/60" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {currentUser?.isGuest && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-white/60 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f79009]" />
              Guest Session
            </span>
          )}
          <button
            onClick={() => onOpenAuth('signin')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all border border-transparent hover:border-white/10"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => onOpenAuth('signup')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8055e8] hover:bg-[#6c3dd9] text-white text-xs font-semibold shadow-spectra-violet transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>
      )}

      {/* DROPDOWN MENU */}
      {isDropdownOpen && currentUser && !currentUser.isGuest && (
        <div className="absolute right-0 mt-2 w-64 bg-[#0b0b10] rounded-2xl border border-white/15 shadow-2xl py-2 z-50 animate-fade-in text-xs font-sans text-white">
          {/* User Header */}
          <div className="px-4 py-2.5 border-b border-white/10">
            <span className="font-bold text-white block truncate">{currentUser.name}</span>
            <span className="text-[11px] text-white/60 truncate block font-mono">{currentUser.email}</span>
          </div>

          <div className="py-1">
            <button
              onClick={openAccountModal}
              className="w-full px-4 py-2 text-left text-white/90 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-[#8055e8]" />
              <span>My Account</span>
            </button>

            <button
              onClick={openSavedModal}
              className="w-full px-4 py-2 text-left text-white/90 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
            >
              <Bookmark className="w-4 h-4 text-[#8055e8]" />
              <span>Saved Analyses</span>
            </button>

            <button
              onClick={openHistoryModal}
              className="w-full px-4 py-2 text-left text-white/90 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-[#8055e8]" />
              <span>Chat History</span>
            </button>
          </div>

          <div className="pt-1 border-t border-white/10">
            <button
              onClick={() => {
                authService.signOut();
                setIsDropdownOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-[#ff8077] hover:bg-white/5 flex items-center gap-2.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: MY ACCOUNT */}
      {activeModal === 'account' && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-md">
          <div className="bg-[#0b0b10] rounded-3xl border border-white/15 shadow-2xl p-6 sm:p-8 max-w-md w-full relative text-white">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#8055e8]/20 text-[#b9abff] flex items-center justify-center font-bold text-lg border border-[#8055e8]/30">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">{currentUser.name}</h3>
                <span className="text-xs text-white/60 font-mono">{currentUser.email}</span>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Account Type</span>
                <span className="font-bold text-[#34d399]">Verified Analyst</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Member Since</span>
                <span className="text-white">
                  {new Date(currentUser.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Security Core</span>
                <span className="text-[#b9abff] font-bold">Spectra V7 Client Isolation</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Cloud Storage</span>
                <span className="text-[#34d399] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12b76a]" />
                  Supabase Connected
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/60">Project Endpoint</span>
                <span className="text-white/60 font-mono text-[11px]">lelmcuezksfeblhfrcmy</span>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setActiveModal('none')}
                className="px-5 py-2 rounded-full bg-[#8055e8] text-white text-xs font-semibold hover:bg-[#6c3dd9] transition-colors shadow-spectra-violet"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAVED ANALYSES */}
      {activeModal === 'saved' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-md">
          <div className="bg-[#0b0b10] rounded-3xl border border-white/15 shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col relative text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#8055e8]" />
                <div>
                  <h3 className="text-lg font-bold text-white font-sans">Saved Scam Analyses</h3>
                  <span className="text-[10px] text-[#34d399] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#12b76a]" />
                    Synced with Supabase (public.scans)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {savedAnalyses.length === 0 ? (
                <div className="text-center py-12 text-white/60 space-y-2">
                  <Bookmark className="w-10 h-10 text-white/30 mx-auto stroke-1" />
                  <p className="text-xs font-medium">No saved analyses found in this account.</p>
                  <p className="text-[11px] text-white/40">
                    You can save any scan result directly from the Multimodal Scanner or Spectra AI.
                  </p>
                </div>
              ) : (
                savedAnalyses.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onLoadSavedAnalysis?.(item.result);
                      setActiveModal('none');
                    }}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#8055e8]/50 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getRiskBadge(item.riskLevel)}`}>
                          {item.riskLevel} ({item.riskScore}/100)
                        </span>
                        <span className="text-[10px] text-white/50 font-mono">
                          {new Date(item.savedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#b9abff] transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-white/60 line-clamp-1">
                        {item.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteSaved(item.id, e)}
                        className="p-2 rounded-xl text-white/40 hover:text-[#ff8077] hover:bg-white/10 transition-colors"
                        title="Delete from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold text-[#b9abff] group-hover:translate-x-0.5 transition-transform">
                        Load →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHAT HISTORY */}
      {activeModal === 'history' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-md">
          <div className="bg-[#0b0b10] rounded-3xl border border-white/15 shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col relative text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#8055e8]" />
                <h3 className="text-lg font-bold text-white font-sans">Conversation History</h3>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {chatSessions.length === 0 ? (
                <div className="text-center py-12 text-white/60 space-y-2">
                  <MessageSquare className="w-10 h-10 text-white/30 mx-auto stroke-1" />
                  <p className="text-xs font-medium">No past conversations recorded.</p>
                  <p className="text-[11px] text-white/40">
                    Your dialogues with Spectra AI will automatically save to this account.
                  </p>
                </div>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onOpenChatSession?.(session);
                      setActiveModal('none');
                    }}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#8055e8]/50 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 max-w-[80%]">
                      <span className="text-[10px] text-white/50 font-mono">
                        {new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {session.messages.length} messages
                      </span>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#b9abff] transition-colors truncate">
                        {session.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteHistory(session.id, e)}
                        className="p-2 rounded-xl text-white/40 hover:text-[#ff8077] hover:bg-white/10 transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold text-[#b9abff] group-hover:translate-x-0.5 transition-transform">
                        Open →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
