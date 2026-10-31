import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Info, 
  FileText, 
  Sparkles,
  Download,
  Terminal,
  RotateCcw,
  Clock,
  Cpu,
  Bookmark
} from 'lucide-react';
import { AnalysisResult, RiskLevel, EvidenceItem } from '../types/index';
import { authService } from '../lib/authService';

interface AnalysisResultsProps {
  result: AnalysisResult;
  onReset: () => void;
  onDiscussWithAi?: (result: AnalysisResult) => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, onReset, onDiscussWithAi }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const handleCopyReport = () => {
    const reportText = `SPECTRA SCAM INTELLIGENCE BRIEFING
Status: ${result.riskLevel} (${result.riskScore}/100)
Certainty: ${result.confidence}%
Analyzed Input: ${result.inputContent}

Pipeline Latency: Engine: ${result.timing?.engineMs || result.executionTimeMs}ms${result.timing?.ocrMs ? `, OCR: ${result.timing.ocrMs}ms` : ''} (Total: ${result.timing?.totalPipelineMs || result.executionTimeMs}ms)
Engine Mode: ${result.analysisEngineMode}

Summary:
${result.summary}

Evidence Detected:
${result.evidence.map(e => `- [${e.source}] [${e.category}] "${e.phrase}": ${e.explanation}`).join('\n')}

URL Findings:
${result.urlFindings.map(u => `- ${u.rawUrl} (${u.riskRating}): ${u.reasons.join('; ')}`).join('\n')}

Cognitive Tactics Detected:
${result.cognitiveTactics.filter(t => t.detected).map(t => `- ${t.name}: ${t.description}`).join('\n')}

Recommended Next Steps:
${result.recommendations.map(r => `• ${r}`).join('\n')}

Timestamp: ${result.timestamp}
Integrity Disclaimer: ${result.limitations[0]}`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `spectra-analysis-${result.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Badge visual config based on RiskLevel
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-[#fef3f2]',
          border: 'border-[#d92d20]/30',
          text: 'text-[#d92d20]',
          icon: <ShieldAlert className="w-5 h-5 text-[#d92d20]" />,
          label: 'CRITICAL RISK',
          desc: 'Immediate severe manipulation, extortion, or credential theft vectors confirmed.'
        };
      case 'HIGH':
        return {
          bg: 'bg-[#fef3f2]',
          border: 'border-[#d92d20]/30',
          text: 'text-[#d92d20]',
          icon: <ShieldAlert className="w-5 h-5 text-[#d92d20]" />,
          label: 'HIGH RISK',
          desc: 'Strong social engineering, spoofing, or fraudulent diversion vectors detected.'
        };
      case 'SUSPICIOUS':
        return {
          bg: 'bg-[#fffaeb]',
          border: 'border-[#f79009]/30',
          text: 'text-[#f79009]',
          icon: <AlertTriangle className="w-5 h-5 text-[#f79009]" />,
          label: 'SUSPICIOUS (MEDIUM)',
          desc: 'Ambiguous indicators, masked links, or unsolicited contact requiring caution.'
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-[#ecfdf3]',
          border: 'border-[#12b76a]/30',
          text: 'text-[#12b76a]',
          icon: <ShieldCheck className="w-5 h-5 text-[#12b76a]" />,
          label: 'LOW RISK',
          desc: 'No overt manipulation or fraudulent infrastructure detected. Standard vigilance applies.'
        };
    }
  };

  const riskBadge = getRiskBadge(result.riskLevel);

  // Robust Highlighter: Finds exact character spans that exist in the original input string
  const renderHighlightedMessage = () => {
    const rawText = result.inputContent || '';
    if (!rawText.trim()) {
      return <span className="text-[#a9a9a6] italic">No content</span>;
    }

    if (!result.evidence.length) {
      return <span>{rawText}</span>;
    }

    // Collect matched spans from evidence that actually exist in rawText
    interface MatchSpan {
      start: number;
      end: number;
      evidence: EvidenceItem;
    }

    const matches: MatchSpan[] = [];
    const lowerText = rawText.toLowerCase();

    for (const item of result.evidence) {
      if (!item.phrase || item.phrase.trim().length === 0) continue;
      const lowerPhrase = item.phrase.toLowerCase();
      let searchIndex = 0;

      while ((searchIndex = lowerText.indexOf(lowerPhrase, searchIndex)) !== -1) {
        const start = searchIndex;
        const end = searchIndex + item.phrase.length;

        // Check for overlaps with already registered spans
        const overlaps = matches.some(m => (start >= m.start && start < m.end) || (end > m.start && end <= m.end));
        if (!overlaps) {
          matches.push({ start, end, evidence: item });
        }
        searchIndex += Math.max(1, item.phrase.length);
      }
    }

    // If no matching phrases in original text (e.g. normalized url was different), render raw text
    if (matches.length === 0) {
      return <span>{rawText}</span>;
    }

    // Sort spans in ascending order
    matches.sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((span, idx) => {
      // Preceding non-highlighted segment
      if (span.start > lastIndex) {
        elements.push(
          <span key={`text-pre-${idx}`}>
            {rawText.slice(lastIndex, span.start)}
          </span>
        );
      }

      // Highlighted segment
      const isSelected = selectedEvidenceId === span.evidence.id;
      const isCritical = span.evidence.severity === 'critical' || span.evidence.severity === 'high';

      elements.push(
        <mark
          key={`mark-${span.evidence.id}-${idx}`}
          onClick={() => setSelectedEvidenceId(isSelected ? null : span.evidence.id)}
          className={`cursor-pointer px-1.5 py-0.5 rounded font-medium transition-all ${
            isCritical
              ? isSelected 
                ? 'bg-[#d92d20] text-white ring-2 ring-[#d92d20]/50' 
                : 'bg-[#fef3f2] text-[#d92d20] border-b-2 border-[#d92d20] hover:bg-[#d92d20]/15'
              : isSelected
                ? 'bg-[#f79009] text-white ring-2 ring-[#f79009]/50'
                : 'bg-[#fffaeb] text-[#b54708] border-b-2 border-[#f79009] hover:bg-[#fffaeb]'
          }`}
          title={`Click to focus evidence: ${span.evidence.explanation}`}
        >
          {rawText.slice(span.start, span.end)}
        </mark>
      );

      lastIndex = span.end;
    });

    // Trailing non-highlighted segment
    if (lastIndex < rawText.length) {
      elements.push(
        <span key="text-trailing">
          {rawText.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in select-none">
      
      {/* 1. TOP HEADER & RISK SCORE BANNER */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-spectra-card bg-white ${riskBadge.border}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#a9a9a6]/30">
          
          {/* Risk Level Badge & Description */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${riskBadge.bg} border ${riskBadge.border}`}>
              {riskBadge.icon}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-xl sm:text-2xl font-extrabold tracking-tight font-sans ${riskBadge.text}`}>
                  {riskBadge.label}
                </span>
                <span className="text-xs font-mono text-[#555555] bg-[#f2f2f1] px-2.5 py-0.5 rounded-full border border-[#a9a9a6]/30 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#8055e8]" />
                  <span>{result.timing?.totalPipelineMs || result.executionTimeMs}ms Pipeline</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#555555] mt-1 max-w-xl">
                {riskBadge.desc}
              </p>
            </div>
          </div>

          {/* DUAL GAUGES: RISK SCORE vs CONFIDENCE RATING */}
          <div className="flex items-center gap-4 sm:gap-6 self-stretch sm:self-auto bg-[#fbfbfa] p-3 rounded-2xl border border-[#a9a9a6]/30">
            {/* Risk Score */}
            <div className="text-center px-2">
              <span className="text-[10px] font-mono text-[#555555] uppercase block tracking-wider">
                Risk Score
              </span>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className={`text-3xl font-extrabold tracking-tighter ${riskBadge.text}`}>
                  {result.riskScore}
                </span>
                <span className="text-xs font-mono text-[#a9a9a6]">/100</span>
              </div>
            </div>

            <div className="w-[1px] h-10 bg-[#a9a9a6]/30" />

            {/* Model Confidence */}
            <div className="text-center px-2">
              <span className="text-[10px] font-mono text-[#555555] uppercase block tracking-wider">
                Certainty
              </span>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-3xl font-extrabold tracking-tighter text-[#1d1d1d]">
                  {result.confidence}
                </span>
                <span className="text-xs font-mono text-[#8055e8]">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Plain-Language Summary */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[#555555] block mb-1">
              Executive Plain-Language Intelligence Summary
            </span>
            <p className="text-base sm:text-lg font-medium text-[#1d1d1d] font-sans leading-relaxed">
              "{result.summary}"
            </p>
          </div>

          {/* Engine Mode Badge */}
          <div className="flex-shrink-0 bg-[#f2f2f1] px-3 py-1.5 rounded-xl border border-[#a9a9a6]/35 text-[11px] font-mono text-[#555555] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#8055e8]" />
            <span>Deterministic Heuristic & Passive URL Engine</span>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE EVIDENCE HIGHLIGHTER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8055e8]" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1d] font-mono">
              Observed Content with Verified In-Text Threat Spans
            </h4>
          </div>
          <span className="text-xs font-mono text-[#555555]">
            {result.evidence.length} signals identified
          </span>
        </div>

        {/* Highlighted text container */}
        <div className="p-5 rounded-2xl bg-[#fbfbfa] border border-[#a9a9a6]/35 text-sm sm:text-base font-sans text-[#1d1d1d] leading-relaxed whitespace-pre-wrap">
          {renderHighlightedMessage()}
        </div>

        {/* Screenshot Thumbnail if analyzed via image */}
        {result.rawImagePreview && (
          <div className="flex items-center gap-4 p-3 bg-[#f2f2f1] rounded-xl border border-[#a9a9a6]/30 text-xs">
            <img src={result.rawImagePreview} alt="Screenshot preview" className="w-16 h-12 object-cover rounded border" />
            <div>
              <span className="font-semibold text-[#1d1d1d] block">Source: Optical Screenshot</span>
              <span className="text-[#555555]">
                OCR Confidence: {result.ocrConfidence ? `${Math.round(result.ocrConfidence)}%` : 'Direct Text'} 
                {result.timing?.ocrMs && ` • OCR Latency: ${result.timing.ocrMs}ms`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. EVIDENCE BREAKDOWN & SOCIAL ENGINEERING TACTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Direct Evidentiary Findings with Source Transparency */}
        <div className="p-6 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1d] font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8055e8]" />
              Evidentiary Findings
            </h4>
            <span className="text-[11px] font-mono text-[#555555]">Clearly Labeled Source</span>
          </div>

          <div className="space-y-3">
            {result.evidence.length > 0 ? (
              result.evidence.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    selectedEvidenceId === item.id 
                      ? 'border-[#8055e8] bg-[#8055e8]/5 ring-2 ring-[#8055e8]/20' 
                      : 'border-[#a9a9a6]/30 bg-[#fbfbfa]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-white border text-[#555555]">
                        {item.category}
                      </span>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#f2f2f1] text-[#8055e8] border border-[#a9a9a6]/30">
                        {item.source === 'DETERMINISTIC_RULE' ? 'Deterministic Rule' : 'Passive URL Inspector'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono uppercase font-bold ${
                      item.severity === 'critical' ? 'text-[#d92d20]' : item.severity === 'high' ? 'text-[#d92d20]' : 'text-[#f79009]'
                    }`}>
                      {item.severity} severity
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#1d1d1d] font-sans">
                    "{item.phrase}"
                  </p>
                  <p className="text-xs text-[#555555] mt-1 font-sans">
                    {item.explanation}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#555555] bg-[#fbfbfa] rounded-2xl border border-dashed border-[#a9a9a6]/40">
                <CheckCircle2 className="w-8 h-8 text-[#12b76a] mx-auto mb-2" />
                No overt phishing, credential demands, or extortion phrases detected.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cognitive Manipulation Matrix */}
        <div className="p-6 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1d] font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8055e8]" />
              Cognitive Manipulation Matrix
            </h4>
            <span className="text-[11px] font-mono text-[#555555]">Behavioral Profiler</span>
          </div>

          <div className="space-y-2.5">
            {result.cognitiveTactics.map((tactic) => (
              <div
                key={tactic.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  tactic.detected 
                    ? 'bg-[#fef3f2] border-[#d92d20]/25' 
                    : 'bg-[#fbfbfa] border-[#a9a9a6]/20 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${tactic.detected ? 'text-[#d92d20]' : 'text-[#1d1d1d]'}`}>
                      {tactic.name}
                    </span>
                    {tactic.detected && (
                      <span className="text-[9px] font-mono uppercase bg-[#d92d20] text-white px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#555555] mt-0.5">
                    {tactic.description}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {tactic.detected ? (
                    <AlertTriangle className="w-4 h-4 text-[#d92d20]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#a9a9a6]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* URL Intelligence Section if URL present */}
          {result.urlFindings.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#555555] block mb-2">
                Safe Passive URL Infrastructure Findings:
              </span>
              {result.urlFindings.map((finding, idx) => (
                <div key={idx} className="p-3 bg-[#fbfbfa] rounded-xl border border-[#a9a9a6]/30 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#1d1d1d] font-bold truncate max-w-[240px]">{finding.hostname}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      finding.riskRating === 'HIGH' ? 'bg-[#d92d20]/10 text-[#d92d20]' : 'bg-[#12b76a]/10 text-[#12b76a]'
                    }`}>
                      {finding.riskRating} LINK RISK
                    </span>
                  </div>
                  <p className="text-[#555555] text-[11px] font-sans">{finding.reasons.join('. ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. RECOMMENDED NEXT STEPS & TRANSPARENCY NOTICE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card space-y-6">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1d] font-mono mb-3">
            Recommended Action Playbook
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-[#fbfbfa] rounded-2xl border border-[#a9a9a6]/30 flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-[#8055e8]/10 text-[#8055e8] flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-[#1d1d1d] font-medium leading-relaxed font-sans">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Granular Pipeline Latency & Transparency */}
        <div className="p-4 bg-[#f2f2f1] rounded-2xl border border-[#a9a9a6]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#555555]">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#8055e8] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#1d1d1d] block">
                Audited Integrity & Latency Telemetry
              </span>
              <p>
                Engine Latency: <span className="font-mono font-bold text-[#1d1d1d]">{result.timing?.engineMs || result.executionTimeMs}ms</span>
                {result.timing?.ocrMs ? ` • OCR Duration: ${result.timing.ocrMs}ms` : ''} 
                {` • Total Pipeline: ${result.timing?.totalPipelineMs || result.executionTimeMs}ms`}.
                Zero external URL requests were executed during this inspection.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#a9a9a6]/30">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onReset}
              className="bg-[#1d1d1d] hover:bg-[#555555] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Analyse Another</span>
            </button>

            {onDiscussWithAi && (
              <button
                onClick={() => onDiscussWithAi(result)}
                className="bg-[#8055e8] hover:bg-[#5633b7] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-spectra-violet active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Discuss this analysis with Spectra AI</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                authService.saveAnalysis(result);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="bg-white hover:bg-[#f2f2f1] text-[#1d1d1d] px-3.5 py-2 rounded-full border border-[#a9a9a6]/40 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-[#12b76a]" /> : <Bookmark className="w-3.5 h-3.5 text-[#8055e8]" />}
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="bg-white hover:bg-[#f2f2f1] text-[#1d1d1d] px-3.5 py-2 rounded-full border border-[#a9a9a6]/40 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#12b76a]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="bg-white hover:bg-[#f2f2f1] text-[#1d1d1d] px-3.5 py-2 rounded-full border border-[#a9a9a6]/40 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
