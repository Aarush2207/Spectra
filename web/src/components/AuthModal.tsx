import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  X,
  KeyRound,
  Shield,
  Layers
} from 'lucide-react';
import { authService } from '../lib/authService';

export type AuthModalMode = 'welcome' | 'signin' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'welcome'
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  // Sync mode whenever modal is opened with an explicit initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setEmailConfirmationRequired(false);
    }
  }, [isOpen, initialMode]);

  // Lock background scroll while modal is active & listen to Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = getPasswordStrength(password);

  const getStrengthLabel = (s: number) => {
    if (s <= 25) return { label: 'Weak', color: 'bg-[#d92d20]' };
    if (s <= 50) return { label: 'Moderate', color: 'bg-[#f79009]' };
    if (s <= 75) return { label: 'Good', color: 'bg-[#8055e8]' };
    return { label: 'Strong', color: 'bg-[#12b76a]' };
  };

  const handleClose = () => {
    if (isLoading) return;
    authService.markWelcomeSeen();
    onClose();
  };

  const handleContinueAsGuest = () => {
    authService.continueAsGuest();
    onClose();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await authService.signIn(email, password);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.signUp(name, email, password);
      if (result.emailConfirmationRequired) {
        setEmailConfirmationRequired(true);
        setSuccessMessage(`Account registered for ${email}. Please check your email inbox to verify your account before logging in.`);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const msg = await authService.resetPassword(email);
      setSuccessMessage(msg);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Ambient Dark Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isLoading) handleClose();
          }}
          className="fixed inset-0 bg-[#050507]/80 backdrop-blur-md"
        />

        {/* Modal Window: Smoked Obsidian Glass */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[490px] bg-[#0b0b10]/95 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl shadow-black/80 overflow-hidden z-10 flex flex-col my-auto select-none text-white"
        >
          {/* Subtle Ambient Violet Glow Header */}
          <div className="absolute -top-24 -left-24 w-56 h-56 bg-[#8055e8]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-[#8055e8]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10 disabled:opacity-40"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Main Content Area */}
          <div className="p-7 sm:p-9 relative z-10 space-y-6">
            
            {/* 1. BRAND HEADER */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#8055e8] flex items-center justify-center shadow-spectra-violet text-white flex-shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-xl text-white font-sans leading-none">
                    SPECTRA
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-[#b9abff] bg-[#8055e8]/20 px-2 py-0.5 rounded border border-[#8055e8]/40 uppercase font-bold">
                    V7 CORE
                  </span>
                </div>
                <span className="text-[11px] text-white/60 font-sans mt-0.5 block">
                  AI Scam Intelligence & Threat Platform
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-[#d92d20]/15 border border-[#d92d20]/40 rounded-2xl flex items-start gap-2.5 text-xs text-[#ff8077] animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#ff8077]" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 bg-[#12b76a]/15 border border-[#12b76a]/40 rounded-2xl flex items-start gap-2.5 text-xs text-[#34d399] animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#34d399]" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW A: FIRST-VISIT WELCOME SCREEN                  */}
            {/* ==================================================== */}
            {mode === 'welcome' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight leading-tight">
                    Welcome to Spectra.
                  </h2>
                  <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                    See beyond suspicious signals. Protect yourself with intelligent scam detection, screenshot OCR, and grounded AI explanations.
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full bg-[#8055e8] hover:bg-[#6c3dd9] text-white py-3.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-spectra-violet flex items-center justify-center gap-2 active:scale-95 group"
                  >
                    <span>Create Your Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-full text-xs sm:text-sm font-semibold border border-white/15 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Sign In</span>
                  </button>
                </div>

                {/* Continue as Guest */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleContinueAsGuest}
                    className="text-xs text-white/60 hover:text-white underline underline-offset-4 font-medium transition-colors"
                  >
                    Continue as Guest
                  </button>
                </div>

                {/* Security Statement */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] font-mono text-white/50">
                  <Shield className="w-3.5 h-3.5 text-[#8055e8]" />
                  <span>Your scans. Your privacy. Your control.</span>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW B: SIGN UP (CREATE SPECTRA ACCOUNT)            */}
            {/* ==================================================== */}
            {mode === 'signup' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                    Create Your Account
                  </h3>
                  <p className="text-xs text-white/65 mt-1">
                    Sign up to sync your threat scans and intelligence across devices.
                  </p>
                </div>

                {emailConfirmationRequired ? (
                  <div className="space-y-4 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setEmailConfirmationRequired(false);
                        setSuccessMessage(null);
                      }}
                      className="w-full bg-[#8055e8] hover:bg-[#6c3dd9] text-white py-3 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div>
                      <label className="text-xs font-semibold text-white/90 block mb-1 font-sans">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Dr. Jordan Vance"
                          className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/90 block mb-1 font-sans">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="analyst@domain.com"
                          className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/90 block mb-1 font-sans">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${strength}%` }}
                              className={`h-full transition-all duration-300 ${getStrengthLabel(strength).color}`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-white/60">
                            {getStrengthLabel(strength).label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/90 block mb-1 font-sans">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 bg-[#8055e8] hover:bg-[#6c3dd9] text-white py-3.5 rounded-full text-xs font-bold transition-all shadow-spectra-violet flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <span>{isLoading ? 'Creating Account...' : 'Create Spectra Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* Switch to Sign In */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/60">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-[#b9abff] hover:text-white hover:underline"
                  >
                    Sign In →
                  </button>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW C: SIGN IN                                     */}
            {/* ==================================================== */}
            {mode === 'signin' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                    Sign In to Spectra
                  </h3>
                  <p className="text-xs text-white/65 mt-1">
                    Access your cloud-synced scam analyses and chat dialogues.
                  </p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white/90 block mb-1.5 font-sans">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="analyst@domain.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white/90 font-sans">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] text-[#b9abff] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-[#8055e8] hover:bg-[#6c3dd9] text-white py-3.5 rounded-full text-xs font-bold transition-all shadow-spectra-violet flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Spectra'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Switch to Sign Up & Continue as Guest */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/60">Don't have an account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-[#b9abff] hover:text-white hover:underline"
                  >
                    Sign Up →
                  </button>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW D: FORGOT PASSWORD                             */}
            {/* ==================================================== */}
            {mode === 'forgot' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                    Reset Password
                  </h3>
                  <p className="text-xs text-white/65 mt-1">
                    Enter your email to receive recovery instructions from Supabase Auth.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white/90 block mb-1.5 font-sans">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="analyst@domain.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-[#8055e8] focus:bg-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-white/35"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#8055e8] hover:bg-[#6c3dd9] text-white py-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-spectra-violet"
                  >
                    <span>{isLoading ? 'Sending...' : 'Send Recovery Instructions'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full text-center text-xs text-[#b9abff] hover:underline pt-1 block"
                  >
                    ← Return to Sign In
                  </button>
                </form>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
