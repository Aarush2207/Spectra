import React, { useState } from 'react';
import { 
  Award, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Layers, 
  ShieldCheck, 
  ShieldAlert, 
  Filter,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import { BENCHMARK_DATASET, runBenchmarkSuite } from '../lib/benchmarkData';
import { BenchmarkReport, BenchmarkCase } from '../types/index';

interface BenchmarkSuiteProps {
  onSelectCaseForAnalysis?: (c: BenchmarkCase) => void;
}

export const BenchmarkSuite: React.FC<BenchmarkSuiteProps> = ({ onSelectCaseForAnalysis }) => {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const handleRunSuite = () => {
    setIsRunning(true);
    requestAnimationFrame(() => {
      // Execute live benchmark suite dynamically without hardcoded numbers
      const rep = runBenchmarkSuite();
      setReport(rep);
      setIsRunning(false);
    });
  };

  const categories = [
    'ALL', 
    'Legitimate Communication',
    'Phishing & Credential Theft', 
    'Financial & Investment Fraud', 
    'Authority Impersonation', 
    'Fake Recruitment', 
    'Delivery & Courier Phishing', 
    'Social Engineering & Extortion'
  ];

  const filteredCases = filterCategory === 'ALL'
    ? BENCHMARK_DATASET
    : BENCHMARK_DATASET.filter(c => c.category === filterCategory);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 select-none animate-fade-in">
      
      {/* 1. SUITE HEADER & SUMMARY */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#8055e8]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#555555]">
              Empirical Benchmark Evaluation ({BENCHMARK_DATASET.length} Test Vectors)
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-[#1d1d1d] font-sans">
            Curated Scam & Legitimate Detection Benchmark
          </h3>
          <p className="text-xs sm:text-sm text-[#555555] max-w-2xl mt-1 leading-relaxed">
            Rigorous evaluation across 65 diverse test cases including authentic transactional messages, 
            banking phishing, executive impersonation, investment fraud, courier smishing, and social engineering.
            Metrics are computed dynamically on execution.
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={isRunning}
          className="bg-[#1d1d1d] hover:bg-[#8055e8] text-white px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-spectra-violet active:scale-95 flex-shrink-0"
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running Live Evaluation...' : 'Execute Live 65-Case Benchmark'}</span>
        </button>
      </div>

      {/* 2. STATISTICAL METRICS SCORECARD (Computed dynamically upon execution) */}
      {report && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Main 7 Key Performance Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">Accuracy</span>
              <span className="text-2xl font-extrabold text-[#12b76a] font-sans">{report.accuracy}%</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">Precision</span>
              <span className="text-2xl font-extrabold text-[#8055e8] font-sans">{report.precision}%</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">Recall</span>
              <span className="text-2xl font-extrabold text-[#8055e8] font-sans">{report.recall}%</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">F1-Score</span>
              <span className="text-2xl font-extrabold text-[#1d1d1d] font-sans">{report.f1Score}%</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">False Pos. Rate</span>
              <span className="text-2xl font-extrabold text-[#12b76a] font-sans">{report.falsePositiveRate}%</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">False Neg. Rate</span>
              <span className="text-2xl font-extrabold text-[#f79009] font-sans">{report.falseNegativeRate}%</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white p-3.5 rounded-2xl border border-[#a9a9a6]/35 shadow-sm text-center">
              <span className="text-[10px] font-mono uppercase text-[#555555] block">Avg Latency</span>
              <span className="text-2xl font-extrabold text-[#555555] font-sans">{report.avgLatencyMs}ms</span>
            </div>
          </div>

          {/* CONFUSION MATRIX CARD */}
          <div className="p-6 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#555555] mb-4 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#8055e8]" />
              Audited 2×2 Confusion Matrix Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-[#ecfdf3] border border-[#12b76a]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#12b76a] uppercase">True Positives (TP)</span>
                  <span className="text-lg font-extrabold text-[#12b76a]">{report.truePositives}</span>
                </div>
                <p className="text-[#555555] font-sans text-[11px]">
                  Confirmed scams correctly classified as Suspicious, High, or Critical risk.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#ecfdf3] border border-[#12b76a]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#12b76a] uppercase">True Negatives (TN)</span>
                  <span className="text-lg font-extrabold text-[#12b76a]">{report.trueNegatives}</span>
                </div>
                <p className="text-[#555555] font-sans text-[11px]">
                  Legitimate transactional or personal messages correctly classified as Low risk.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fffaeb] border border-[#f79009]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#b54708] uppercase">False Positives (FP)</span>
                  <span className="text-lg font-extrabold text-[#b54708]">{report.falsePositives}</span>
                </div>
                <p className="text-[#555555] font-sans text-[11px]">
                  Legitimate messages mistakenly flagged as scams (False Alarm rate: {report.falsePositiveRate}%).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fef3f2] border border-[#d92d20]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#d92d20] uppercase">False Negatives (FN)</span>
                  <span className="text-lg font-extrabold text-[#d92d20]">{report.falseNegatives}</span>
                </div>
                <p className="text-[#555555] font-sans text-[11px]">
                  Scam messages mistakenly marked as Low risk (Missed Threat rate: {report.falseNegativeRate}%).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEST CASES REPOSITORY & CATEGORY FILTER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#a9a9a6]/35 shadow-spectra-card space-y-6">
        
        {/* Category Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#a9a9a6]/30 pb-4">
          <span className="text-xs font-mono uppercase text-[#555555] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#8055e8]" />
            Filter by Domain ({filteredCases.length} Cases):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  filterCategory === cat
                    ? 'bg-[#1d1d1d] text-white border-[#1d1d1d]'
                    : 'bg-[#f2f2f1] text-[#555555] border-transparent hover:border-[#a9a9a6]/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dataset Table / Cards */}
        <div className="space-y-3">
          {filteredCases.map((c) => {
            const evalResult = report?.results.find(r => r.caseId === c.id);
            const isScam = c.groundTruthBinary === 'SCAM';

            return (
              <div 
                key={c.id} 
                className="p-4 rounded-2xl bg-[#fbfbfa] border border-[#a9a9a6]/30 hover:border-[#8055e8]/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#555555] bg-white px-2 py-0.5 rounded border border-[#a9a9a6]/30">
                      {c.category}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#8055e8] bg-[#8055e8]/10 px-1.5 py-0.5 rounded">
                      {c.sourceType === 'REPORTED_PATTERN' ? 'Reported Phishing Pattern' : 'Synthetic Benchmark'}
                    </span>
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                      isScam ? 'bg-[#fef3f2] text-[#d92d20] border border-[#d92d20]/30' : 'bg-[#ecfdf3] text-[#12b76a] border border-[#12b76a]/30'
                    }`}>
                      Ground Truth: {c.groundTruthRisk} ({c.groundTruthBinary})
                    </span>

                    {evalResult && (
                      <span className={`text-[10px] font-mono uppercase font-bold flex items-center gap-1 ${
                        evalResult.matched ? 'text-[#12b76a]' : 'text-[#d92d20]'
                      }`}>
                        {evalResult.matched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        Predicted: {evalResult.predictedRisk} ({evalResult.score}/100) • {evalResult.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <h5 className="text-sm font-bold text-[#1d1d1d] font-sans">
                    {c.title}
                  </h5>

                  <p className="text-xs text-[#555555] font-sans line-clamp-2">
                    "{c.content}"
                  </p>
                </div>

                {onSelectCaseForAnalysis && (
                  <button
                    onClick={() => onSelectCaseForAnalysis(c)}
                    className="flex-shrink-0 bg-white hover:bg-[#8055e8] hover:text-white text-[#1d1d1d] border border-[#a9a9a6]/40 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Load this case into the Multimodal Scanner"
                  >
                    <span>Load Case</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* 4. METHODOLOGY, DATASET DISCLOSURE & LIMITATIONS */}
      <div className="p-6 rounded-3xl bg-[#fbfbfa] border border-[#a9a9a6]/30 shadow-sm space-y-3 text-xs text-[#555555]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#8055e8]" />
          <h4 className="font-bold text-[#1d1d1d] font-sans text-xs uppercase tracking-wider">
            Evaluation Integrity & Methodological Scope
          </h4>
        </div>
        <p className="leading-relaxed">
          This 65-case test harness represents a curated development and regression benchmark spanning 20 authentic communications and 45 categorized threat vectors (phishing, smishing, executive spoofing, fake employment, advance fee fraud, and extortion).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
          <div className="p-3 bg-white rounded-xl border border-[#a9a9a6]/25">
            <span className="font-bold text-[#1d1d1d] block mb-1">Regression Suite vs. Real-World Efficacy</span>
            <span>While scoring on this curated suite verifies rule calibration, it is not an independent proof of 100% real-world accuracy against novel zero-day pretexts.</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#a9a9a6]/25">
            <span className="font-bold text-[#1d1d1d] block mb-1">Dynamic Telemetry</span>
            <span>All statistical indicators (Accuracy, Precision, Recall, F1, FPR, FNR, Specificity) are computed dynamically upon runtime execution, with zero hardcoded values.</span>
          </div>
        </div>
      </div>

    </div>
  );
};
