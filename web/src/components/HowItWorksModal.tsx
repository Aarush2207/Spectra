import React from 'react';
import { X, ShieldCheck, Cpu, Layers, Terminal, Lock, CheckCircle2 } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-[#a9a9a6]/40 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#a9a9a6]/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8055e8]" />
            <h3 className="text-xl font-extrabold text-[#1d1d1d] font-sans">
              Spectra Multi-Method Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f2f2f1] text-[#555555] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 pt-4 text-xs sm:text-sm text-[#555555]">
          <p className="leading-relaxed">
            Conventional scam detection either relies on simplistic keyword matching or queries opaque LLM chatbots 
            prone to hallucinations and fabricated certainty. Spectra deploys a <strong>hybrid, multi-vector intelligence pipeline</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Layer 1 */}
            <div className="p-4 rounded-2xl bg-[#fbfbfa] border border-[#a9a9a6]/35 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#8055e8]/10 text-[#8055e8] flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-[#1d1d1d] font-sans">Deterministic Heuristics</h4>
              <p className="text-xs text-[#555555]">
                Strict pattern matching for urgency windows, authority impersonation, credential harvesting, and payment coercion.
              </p>
            </div>

            {/* Layer 2 */}
            <div className="p-4 rounded-2xl bg-[#fbfbfa] border border-[#a9a9a6]/35 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#8055e8]/10 text-[#8055e8] flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-[#1d1d1d] font-sans">Passive URL Intelligence</h4>
              <p className="text-xs text-[#555555]">
                Structural decomposition, Punycode/homoglyph checks, Shannon entropy, shortener detection, and lookalike domain verification.
              </p>
            </div>

            {/* Layer 3 */}
            <div className="p-4 rounded-2xl bg-[#fbfbfa] border border-[#a9a9a6]/35 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#8055e8]/10 text-[#8055e8] flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-[#1d1d1d] font-sans">Cognitive Profiler</h4>
              <p className="text-xs text-[#555555]">
                Extracts the underlying social engineering mechanism: artificial deadlines, peer isolation, or unverified payment channels.
              </p>
            </div>

          </div>

          {/* Safety Guarantees */}
          <div className="p-4 rounded-2xl bg-[#f2f2f1] border border-[#a9a9a6]/30 space-y-2">
            <h4 className="font-bold text-[#1d1d1d] font-sans flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#8055e8]" />
              Strict Passive Isolation Principles
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12b76a]" />
                <span><strong>No outbound requests:</strong> Target URLs are parsed strictly offline. Zero risk of SSRF or tracking beacon triggers.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12b76a]" />
                <span><strong>Zero credential retention:</strong> Spectra never stores or logs submitted passwords, phone numbers, or tokens.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12b76a]" />
                <span><strong>Honest uncertainty:</strong> When evidence is scarce, confidence drops transparently rather than guessing.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#a9a9a6]/30 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#1d1d1d] hover:bg-[#8055e8] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-colors"
          >
            Close Architecture Brief
          </button>
        </div>

      </div>
    </div>
  );
};
