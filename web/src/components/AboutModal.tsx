import React from 'react';
import { X, ShieldAlert, Heart, Terminal, Sparkles, Compass } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#a9a9a6]/40 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#a9a9a6]/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8055e8]" />
            <h3 className="text-xl font-extrabold text-[#1d1d1d] font-sans">
              About SPECTRA
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f2f2f1] text-[#555555] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 pt-4 text-xs sm:text-sm text-[#555555] leading-relaxed">
          <p>
            <strong className="text-[#1d1d1d]">SPECTRA</strong> was built for the next generation of cybersecurity intelligence. 
            Scammers have moved far beyond broken grammar and generic lottery emails. 
            Today's attacks weaponize generative AI, targeted impersonation, lookalike domains, and subtle psychological pressure.
          </p>

          <p>
            Spectra acts as a cognitive lens: deconstructing incoming communications into observable signals, 
            verifying domain infrastructure passively, and providing calm, evidence-backed clarity before users take irreversible actions.
          </p>

          <div className="p-4 rounded-2xl bg-[#f2f2f1] border border-[#a9a9a6]/30 space-y-2">
            <div className="flex items-center gap-2 text-[#1d1d1d] font-bold text-xs uppercase tracking-wider font-mono">
              <Compass className="w-4 h-4 text-[#8055e8]" />
              Core Product Pillars
            </div>
            <ul className="space-y-1 text-xs">
              <li><strong>Explainable Evidence:</strong> Never a black-box "trust me". We highlight the exact phrasing and structural triggers.</li>
              <li><strong>Zero Reckless Assertions:</strong> Honest uncertainty scoring when data is ambiguous.</li>
              <li><strong>Complete Safety:</strong> Safe offline link inspection that never exposes users to active malware.</li>
            </ul>
          </div>

          {/* Official Website & Repository */}
          <div className="p-4 rounded-2xl bg-white border border-[#8055e8]/30 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8055e8] font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Official Website & Repository
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8055e8]/10 text-[#8055e8] font-semibold">
                Open Source
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
              <a
                href="https://github.com/Aarush2207/Spectra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-medium text-[#1d1d1d] hover:text-[#8055e8] flex items-center gap-1.5 transition-colors underline underline-offset-2 break-all"
              >
                https://github.com/Aarush2207/Spectra
                <Sparkles className="w-3.5 h-3.5 text-[#8055e8] shrink-0" />
              </a>
              <span className="text-[11px] text-[#555555]">
                v1.0.0 Production Build
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#a9a9a6] pt-1">
            Engineered with React 19, TypeScript, Three.js WebGL Cloth Physics, Tesseract.js Neural OCR, and Tailwind CSS.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#a9a9a6]/30 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#1d1d1d] hover:bg-[#8055e8] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-colors"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
