import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Bot, Layers, ShieldCheck, Menu, X, LogIn } from 'lucide-react';
import { authService } from '../lib/authService';
import { User, SavedAnalysis, ChatSession } from '../types/auth';
import { AnalysisResult } from '../types';
import { UserProfileMenu } from './UserProfileMenu';

interface CinematicHeroProps {
  onScanClick: () => void;
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
  onAboutClick: () => void;
  onSignInClick: () => void;
  onSignUpClick: () => void;
  onLoadSavedAnalysis?: (result: AnalysisResult) => void;
  onOpenChatSession?: (session: ChatSession) => void;
  isShattered?: boolean;
  onToggleShatter?: () => void;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  onScanClick,
  onExploreClick,
  onHowItWorksClick,
  onAboutClick,
  onSignInClick,
  onSignUpClick,
  onLoadSavedAnalysis,
  onOpenChatSession,
  isShattered = false,
  onToggleShatter,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = authService.subscribe((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#050507] text-white select-none overflow-hidden flex flex-col justify-between">
      
      {/* 1. ATMOSPHERIC BACKGROUND LIGHTING */}
      {/* Centered Soft Violet Radial Glow behind Nova */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-80"
        style={{
          background: 'radial-gradient(circle 700px at 50% 46%, rgba(128, 85, 232, 0.24) 0%, rgba(86, 51, 183, 0.08) 40%, rgba(5, 5, 7, 0) 75%)'
        }}
      />

      {/* Subtle floor ambient illumination line */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-52 pointer-events-none z-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(128, 85, 232, 0.16) 0%, rgba(5, 5, 7, 0) 70%)'
        }}
      />

      {/* 2. MINIMAL FLOATING DARK NAVIGATION */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b10]/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 lg:px-10 py-3.5 flex items-center justify-between"
      >
        {/* Brand Logo & V7 CORE Badge */}
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-tighter text-xl text-white font-sans">
            SPECTRA
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest font-mono text-[#b9abff] bg-[#8055e8]/15 px-2.5 py-0.5 rounded-full border border-[#8055e8]/30 font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8055e8] animate-pulse" />
            <span>V7 CORE</span>
          </span>
        </div>

        {/* Desktop Navigation Actions */}
        {/* Order: Spectra AI, How It Works, About, Sign In, Sign Up, Scan a Message */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          <button
            onClick={onExploreClick}
            className="text-xs lg:text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-[#8055e8]" />
            <span>Spectra AI</span>
          </button>

          <button
            onClick={onHowItWorksClick}
            className="text-xs lg:text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            How It Works
          </button>

          <button
            onClick={onAboutClick}
            className="text-xs lg:text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            About
          </button>

          {/* 3D Glass Shard Control */}
          {onToggleShatter && (
            <button
              onClick={onToggleShatter}
              className={`hidden xl:inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-all ${
                isShattered
                  ? 'bg-[#8055e8] text-white border-[#8055e8]'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/15'
              }`}
              title="Trigger Facet glass shatter & reassembly physics"
            >
              <Layers className="w-3.5 h-3.5 text-[#b9abff]" />
              <span>{isShattered ? 'Reassemble Shards' : 'Shatter Glass'}</span>
            </button>
          )}

          {/* Authentication Actions or Profile Menu */}
          {currentUser && !currentUser.isGuest ? (
            <UserProfileMenu
              onOpenAuth={(mode) => {
                if (mode === 'signup') onSignUpClick();
                else onSignInClick();
              }}
              onLoadSavedAnalysis={onLoadSavedAnalysis}
              onOpenChatSession={onOpenChatSession}
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onSignInClick}
                className="text-xs lg:text-sm font-medium text-white/80 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white/5 border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-white/60" />
                <span>Sign In</span>
              </button>

              <button
                onClick={onSignUpClick}
                className="bg-[#8055e8] hover:bg-[#6c3dd9] text-white text-xs lg:text-sm font-semibold px-4 lg:px-5 py-2 rounded-full shadow-spectra-violet transition-all duration-200 flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          {/* Primary CTA in Nav: Scan a Message */}
          <button
            onClick={onScanClick}
            className="bg-white hover:bg-white/90 text-[#050507] text-xs lg:text-sm font-semibold px-4 lg:px-5 py-2 rounded-full shadow-lg transition-all duration-200 flex items-center gap-1.5 active:scale-95 ml-1"
          >
            <span>Scan a Message</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {currentUser && !currentUser.isGuest ? (
            <div className="w-7 h-7 rounded-full bg-[#8055e8] text-white flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button
              onClick={onSignUpClick}
              className="bg-[#8055e8] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
            >
              Sign Up
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </motion.header>

      {/* MOBILE NAVIGATION DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#0b0b10]/95 backdrop-blur-xl border-b border-white/15 p-5 md:hidden flex flex-col gap-3.5 shadow-2xl"
          >
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onExploreClick();
              }}
              className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-sm font-medium text-white flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-[#8055e8]" />
              <span>Spectra AI</span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onHowItWorksClick();
              }}
              className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-sm font-medium text-white/80 hover:text-white"
            >
              How It Works
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onAboutClick();
              }}
              className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-sm font-medium text-white/80 hover:text-white"
            >
              About
            </button>

            <div className="pt-2 border-t border-white/10 flex flex-col gap-2.5">
              {currentUser && !currentUser.isGuest ? (
                <div className="py-2 px-3 text-xs text-white/60">
                  Signed in as <span className="text-white font-semibold">{currentUser.name}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignInClick();
                    }}
                    className="w-full py-2.5 rounded-full border border-white/15 text-xs font-semibold text-white text-center hover:bg-white/5"
                  >
                    Sign In
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignUpClick();
                    }}
                    className="w-full py-2.5 rounded-full bg-[#8055e8] text-xs font-semibold text-white text-center shadow-spectra-violet"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onScanClick();
                }}
                className="w-full py-3 rounded-full bg-white text-[#050507] text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <span>SCAN A MESSAGE →</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. HERO COMPOSITION: BALANCED TWO-COLUMN ON DESKTOP, STACKED ON MOBILE */}
      <div className="relative w-full flex-1 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-20 sm:pt-24 pb-4 sm:pb-6 z-20 flex flex-col justify-between">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center my-auto min-h-[380px]">
          
          {/* LEFT COLUMN: Editorial Typography, Supporting Copy & Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 sm:space-y-5 pointer-events-auto z-30"
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/70 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#8055e8] animate-pulse" />
              <span className="tracking-widest uppercase text-[10px] sm:text-[11px] font-semibold">MULTIMODAL SCAM INTELLIGENCE</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans leading-[1.08] select-none">
              SEE BEYOND.<br className="hidden sm:inline" />{' '}
              <span className="text-white/45 font-light">THE MESSAGE.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-xs sm:text-sm lg:text-base text-white/65 max-w-xl font-normal leading-relaxed">
              One message can hide a thousand threats. Spectra reveals psychological manipulation, 
              spoofed infrastructure, and hidden signals before you trust the sender.
            </p>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 w-full sm:w-auto">
              <button
                onClick={onScanClick}
                className="w-full sm:w-auto bg-[#8055e8] hover:bg-[#6c3dd9] text-white text-xs sm:text-sm lg:text-base font-semibold px-6 sm:px-8 py-3 rounded-full shadow-spectra-violet transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-95 group uppercase tracking-wide"
              >
                <Sparkles className="w-4 h-4 text-[#e6deff] group-hover:rotate-12 transition-transform" />
                <span>SCAN A MESSAGE →</span>
              </button>

              <button
                onClick={onExploreClick}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm lg:text-base font-semibold px-6 sm:px-7 py-3 rounded-full border border-white/15 shadow-sm transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm uppercase tracking-wide"
              >
                <Bot className="w-4 h-4 text-[#b9abff]" />
                <span>EXPLORE SPECTRA AI</span>
              </button>
            </div>

            {/* Restrained Laboratory Telemetry */}
            <div className="pt-2.5 border-t border-white/10 hidden sm:flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-[11px] sm:text-xs font-mono text-white/45 w-full">
              <span className="flex items-center gap-1.5 text-white/70">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8055e8]" />
                <span>Zero SSRF Outbound</span>
              </span>
              <span>•</span>
              <span className="text-[#b9abff]">Heuristic OCR Engine</span>
              <span>•</span>
              <span>Live AI Companion</span>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Visual Stage for Centered Nova 3D Character & Glass Architecture */}
          <div className="lg:col-span-6 h-64 sm:h-72 lg:h-[440px] flex items-center justify-center relative pointer-events-none mt-2 lg:mt-0">
            {/* Subtle technical status tag in the 3D showcase arena */}
            <div className="absolute bottom-1 text-center text-[10px] tracking-widest font-mono text-white/30 uppercase">
              NOVA AI COMPANION • OBSIDIAN FACET SHIELDS ACTIVE
            </div>
          </div>

        </div>

        {/* 4. BOTTOM TELEMETRY BAR */}
        <div className="w-full max-w-7xl mx-auto pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-white/45 pointer-events-auto">
          <div>
            "Clarity in a world of suspicious signals. Understand what you're looking at before you act."
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-white/70">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8055e8]" />
              <span>Zero SSRF Outbound</span>
            </span>
            <span>•</span>
            <span className="text-[#b9abff]">Black-Stage Security Lab</span>
          </div>
        </div>

      </div>

    </div>
  );
};
