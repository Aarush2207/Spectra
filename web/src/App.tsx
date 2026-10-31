import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Terminal, 
  Award, 
  ArrowRight, 
  ExternalLink,
  Info,
  CheckCircle2,
  Lock,
  RotateCcw,
  Bot,
  User as UserIcon
} from 'lucide-react';
import { CinematicHero } from './components/CinematicHero';
import { Spectra3DScene } from './components/Spectra3DScene';
import { ScannerInterface } from './components/ScannerInterface';
import { AnalysisResults } from './components/AnalysisResults';
import { SpectraAIChat } from './components/SpectraAIChat';
import { BenchmarkSuite } from './components/BenchmarkSuite';
import { HowItWorksModal } from './components/HowItWorksModal';
import { AboutModal } from './components/AboutModal';
import { AuthModal, AuthModalMode } from './components/AuthModal';
import { UserProfileMenu } from './components/UserProfileMenu';
import { AnalysisResult, BenchmarkCase } from './types';
import { ChatSession } from './types/auth';
import { RobotState } from './types/robot';
import { analyzeMessage } from './lib/detectionEngine';
import { authService } from './lib/authService';

export default function App() {
  const [activeView, setActiveView] = useState<'scanner' | 'ai' | 'benchmark'>('scanner');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [transferredToAiResult, setTransferredToAiResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('welcome');
  const [robotState, setRobotState] = useState<RobotState>('idle');
  const [isShattered, setIsShattered] = useState(false);

  const scannerSectionRef = useRef<HTMLDivElement>(null);
  const aiSectionRef = useRef<HTMLDivElement>(null);
  const benchmarkSectionRef = useRef<HTMLDivElement>(null);

  // Trigger auth popup every time someone enters the site or refreshes
  useEffect(() => {
    const checkAndShowAuth = () => {
      if (authService.isAuthenticated()) return;

      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();

      const isLogin = path.includes('/login') || path.includes('/signin') || hash === '#login' || search.includes('login');
      const isSignUp = path.includes('/signup') || hash === '#signup' || search.includes('signup');

      if (isLogin) {
        setAuthModalMode('signin');
        setIsAuthModalOpen(true);
      } else if (isSignUp) {
        setAuthModalMode('signup');
        setIsAuthModalOpen(true);
      } else {
        setAuthModalMode('welcome');
        setIsAuthModalOpen(true);
      }
    };

    // Show promptly on enter / refresh (400ms)
    const timer = setTimeout(checkAndShowAuth, 400);

    // Also support browser back/forward or hash changes (e.g. /login)
    const handleUrlChange = () => checkAndShowAuth();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Update robot state when scanner is processing
  useEffect(() => {
    if (isProcessing) {
      setRobotState('analysing');
    }
  }, [isProcessing]);

  // Update robot state when an alert result is found
  useEffect(() => {
    if (currentResult) {
      if (currentResult.riskLevel === 'CRITICAL' || currentResult.riskLevel === 'HIGH') {
        setRobotState('alert');
        const timer = setTimeout(() => setRobotState('idle'), 5000);
        return () => clearTimeout(timer);
      } else {
        setRobotState('idle');
      }
    }
  }, [currentResult]);

  const scrollToScanner = () => {
    setIsShattered(true);
    setActiveView('scanner');
    setTimeout(() => {
      scannerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  const scrollToAi = () => {
    setIsShattered(true);
    setActiveView('ai');
    setTimeout(() => {
      aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  const scrollToBenchmark = () => {
    setIsShattered(true);
    setActiveView('benchmark');
    setTimeout(() => {
      benchmarkSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  const handleBenchmarkCaseLoad = (testCase: BenchmarkCase) => {
    setIsProcessing(true);
    setActiveView('scanner');
    scrollToScanner();

    setTimeout(() => {
      const result = analyzeMessage(testCase.content, testCase.inputType);
      setCurrentResult(result);
      setIsProcessing(false);
    }, 400);
  };

  const handleDiscussWithAi = (result: AnalysisResult) => {
    setTransferredToAiResult(result);
    setActiveView('ai');
    scrollToAi();
  };

  const handleOpenInScanner = (result: AnalysisResult) => {
    setCurrentResult(result);
    setActiveView('scanner');
    scrollToScanner();
  };

  const handleLoadSavedAnalysis = (result: AnalysisResult) => {
    setCurrentResult(result);
    setActiveView('scanner');
    scrollToScanner();
  };

  const handleOpenChatSession = (_session: ChatSession) => {
    setActiveView('ai');
    scrollToAi();
  };

  return (
    <div className="min-h-screen bg-[#050506] text-white font-sans antialiased selection:bg-[#8055e8] selection:text-white flex flex-col relative">
      
      {/* 3D SIGNATURE SCENE: CENTERED NOVA ROBOT & FACET GLASS SHARDS */}
      <Spectra3DScene
        robotState={robotState}
        isShattered={isShattered}
        activeView={activeView}
      />

      {/* 1. CINEMATIC HERO */}
      <CinematicHero
        onScanClick={scrollToScanner}
        onExploreClick={scrollToAi}
        onHowItWorksClick={() => setIsHowItWorksOpen(true)}
        onAboutClick={() => setIsAboutOpen(true)}
        onSignInClick={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }}
        onSignUpClick={() => {
          setAuthModalMode('signup');
          setIsAuthModalOpen(true);
        }}
        onLoadSavedAnalysis={handleLoadSavedAnalysis}
        onOpenChatSession={handleOpenChatSession}
        isShattered={isShattered}
        onToggleShatter={() => setIsShattered(!isShattered)}
      />

      {/* 2. MAIN WORKSPACE / PRODUCT CONTAINER */}
      <main className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-16 relative z-30">
        
        {/* VIEW NAVIGATION BAR */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-[#0b0b10]/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-xl sticky top-20 z-40">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setActiveView('scanner');
                setIsShattered(false);
              }}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeView === 'scanner'
                  ? 'bg-[#8055e8] text-white shadow-spectra-violet'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#e6deff]" />
              <span>Multimodal Scanner</span>
            </button>

            <button
              onClick={() => {
                setActiveView('ai');
                setIsShattered(true);
              }}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeView === 'ai'
                  ? 'bg-[#8055e8] text-white shadow-spectra-violet'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot className="w-4 h-4 text-[#e6deff]" />
              <span>Spectra AI</span>
            </button>

            <button
              onClick={() => {
                setActiveView('benchmark');
                setIsShattered(true);
              }}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeView === 'benchmark'
                  ? 'bg-[#8055e8] text-white shadow-spectra-violet'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Award className="w-4 h-4 text-[#e6deff]" />
              <span>Evaluation Benchmark</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-white/50 px-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#12b76a]" />
                Engine Online
              </span>
              <span>•</span>
              <span>Zero SSRF Outbound</span>
            </div>

            {/* User Profile / Auth Action */}
            <UserProfileMenu
              onOpenAuth={(mode) => {
                setAuthModalMode(mode || 'signin');
                setIsAuthModalOpen(true);
              }}
              onLoadSavedAnalysis={handleLoadSavedAnalysis}
              onOpenChatSession={handleOpenChatSession}
            />
          </div>
        </div>

        {/* SECTION A: MULTIMODAL SCANNER & RESULTS */}
        {activeView === 'scanner' && (
          <section ref={scannerSectionRef} className="space-y-10 scroll-mt-28">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#b9abff] bg-[#8055e8]/15 px-3 py-1 rounded-full border border-[#8055e8]/30">
                AI Scam Intelligence Engine
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                Deconstruct the Hidden Signals
              </h2>
              <p className="text-sm sm:text-base text-white/60">
                Upload raw text, screenshot captures, or suspicious URLs. Spectra isolates psychological triggers, 
                spoofed infrastructure, and unverified demands.
              </p>
            </div>

            {/* Results or Scanner Interface */}
            {currentResult ? (
              <AnalysisResults
                result={currentResult}
                onReset={() => setCurrentResult(null)}
                onDiscussWithAi={handleDiscussWithAi}
              />
            ) : (
              <ScannerInterface
                onAnalysisComplete={(res) => setCurrentResult(res)}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            )}
          </section>
        )}

        {/* SECTION B: SPECTRA AI CONVERSATIONAL WORKSPACE */}
        {activeView === 'ai' && (
          <section ref={aiSectionRef} className="space-y-6 scroll-mt-28">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#b9abff] bg-[#8055e8]/15 px-3 py-1 rounded-full border border-[#8055e8]/30">
                Spectra Conversational Intelligence
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                Spectra AI Threat Assistant
              </h2>
              <p className="text-sm sm:text-base text-white/60">
                Engage directly with the scam intelligence engine. Paste suspicious messages, upload screenshots 
                for OCR, inspect deceptive links, or explore manipulation mechanics.
              </p>
            </div>

            <SpectraAIChat
              initialTransferredResult={transferredToAiResult}
              onClearTransferredResult={() => setTransferredToAiResult(null)}
              onOpenInScanner={handleOpenInScanner}
              onRobotStateChange={setRobotState}
            />
          </section>
        )}

        {/* SECTION C: CURATED BENCHMARK EVALUATION SUITE */}
        {activeView === 'benchmark' && (
          <section ref={benchmarkSectionRef} className="space-y-6 scroll-mt-28">
            <BenchmarkSuite onSelectCaseForAnalysis={handleBenchmarkCaseLoad} />
          </section>
        )}

        {/* TRUST & PRIVACY BANNER */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0b10] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8055e8]/15 border border-[#8055e8]/30 text-[#b9abff] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-sans">
                Engineered with Zero Compromises on User Privacy
              </h4>
              <p className="text-xs sm:text-sm text-white/55 mt-0.5">
                Target URLs are parsed offline. Extracted text remains in client memory. No personal passwords or OTPs are recorded.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-colors"
            >
              Architecture Spec
            </button>
            <button
              onClick={() => setIsAboutOpen(true)}
              className="text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-colors"
            >
              Ethics & Transparency
            </button>
          </div>
        </div>

      </main>

      {/* 3. FOOTER */}
      <footer className="w-full border-t border-white/10 bg-[#07070a] py-10 px-6 sm:px-12 mt-16 text-xs text-white/50 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-extrabold text-white text-sm tracking-tight font-sans block mb-1">
              SPECTRA
            </span>
            <span>Clarity in a world of suspicious signals. Understand what you're looking at before you act.</span>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsHowItWorksOpen(true)}
              className="hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="hover:text-white transition-colors"
            >
              About
            </button>
            <button 
              onClick={scrollToAi}
              className="hover:text-white transition-colors"
            >
              Spectra AI
            </button>
            <button 
              onClick={scrollToBenchmark}
              className="hover:text-white transition-colors"
            >
              Benchmark Suite
            </button>
            <button 
              onClick={scrollToScanner}
              className="text-[#b9abff] font-bold hover:underline"
            >
              Scan a Message
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/35">
          <div className="flex flex-wrap items-center gap-3">
            <span>© 2026 SPECTRA Intelligence Platform. Built for Hackathon Excellence.</span>
            <span>•</span>
            <a 
              href="https://spectra-scam.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#b9abff] hover:underline"
            >
              spectra-scam.vercel.app
            </a>
            <span>•</span>
            <a 
              href="https://github.com/Aarush2207/Spectra" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-white transition-colors"
            >
              GitHub Source
            </a>
          </div>
          <span>Disclaimer: Automated probabilistic risk assessment, not a guarantee of fraud or authenticity.</span>
        </div>
      </footer>

      {/* MODALS */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

    </div>
  );
}
