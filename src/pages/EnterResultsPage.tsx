import React, { useEffect, useMemo, useState } from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { ManualEntry } from '../components/entry/ManualEntry';
import { OcrUploadEntry } from '../components/entry/OcrUploadEntry';
import { CopyPasteEntry } from '../components/entry/CopyPasteEntry';
import { ScreenCaptureEntry } from '../components/entry/ScreenCaptureEntry';
import { PipelineHeader } from '../components/liveAnalysis/PipelineHeader';
import { RecentSpinsBar } from '../components/liveAnalysis/RecentSpinsBar';
import { PredictionActivationBar } from '../components/liveAnalysis/PredictionActivationBar';
import { ConsolidatedTheoryPanel } from '../components/liveAnalysis/ConsolidatedTheoryPanel';
import { PnlDashboardPanel } from '../components/liveAnalysis/PnlDashboardPanel';
import { NumberAnalysisGroup } from '../components/liveAnalysis/NumberAnalysisGroup';
import { PhysicalWheelGroup } from '../components/liveAnalysis/PhysicalWheelGroup';
import { CategoryAnalysisGroup } from '../components/liveAnalysis/CategoryAnalysisGroup';
import { ProbabilityStatisticsGroup } from '../components/liveAnalysis/ProbabilityStatisticsGroup';
import { AsyncHeavyAnalysisGroup } from '../components/liveAnalysis/AsyncHeavyAnalysisGroup';
import { VerifiedPerformanceGroup } from '../components/liveAnalysis/VerifiedPerformanceGroup';
import {
  HeavyAsyncAnalysisResults,
  runInstantAnalysisPipeline,
  runHeavyAsyncAnalysis,
} from '../utils/analysisPipeline';
import { PlusCircle, FileText, Clipboard, Monitor } from 'lucide-react';

export const EnterResultsPage: React.FC = () => {
  const { spins, wheelType, predictions } = useRouletteStore();

  const [activeTab, setActiveTab] = useState<'manual' | 'ocr' | 'copypaste' | 'screenshare'>('manual');

  const [heavyResults, setHeavyResults] = useState<HeavyAsyncAnalysisResults>({
    timestamp: Date.now(),
    calculationId: 0,
    status: 'idle',
  });

  const tabs = [
    { id: 'manual', label: 'Manual Keypad', icon: PlusCircle },
    { id: 'ocr', label: 'Screenshot OCR', icon: FileText },
    { id: 'copypaste', label: 'Copy-Paste Import', icon: Clipboard },
    { id: 'screenshare', label: 'Screen Share OCR', icon: Monitor },
  ];

  // Instant automatic recalculation whenever spins, wheelType, predictions change.
  // activeMethod is no longer used for the main panel — the consolidated panel uses all methods.
  const instantAnalysis = useMemo(() => {
    return runInstantAnalysisPipeline(spins, wheelType, predictions, 'weighted_ensemble', 100);
  }, [spins, wheelType, predictions]);

  // Run heavy calculations (Monte Carlo & Bootstrap) asynchronously
  useEffect(() => {
    if (spins.length === 0) return;

    const cleanup = runHeavyAsyncAnalysis(spins, wheelType, predictions, (res) => {
      setHeavyResults(res);
    });

    return () => {
      cleanup();
    };
  }, [spins, wheelType, predictions]);

  const spinNumbers = useMemo(() => spins.map((s) => s.number), [spins]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── SECTION A: INPUT CONTROLS ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-[#232D3F] bg-[#0D1219] p-1.5 gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#161D29] text-[#D4AF37] border border-[#D4AF37]/30 shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content */}
        <div className="p-5">
          {activeTab === 'manual' && <ManualEntry />}
          {activeTab === 'ocr' && <OcrUploadEntry />}
          {activeTab === 'copypaste' && <CopyPasteEntry />}
          {activeTab === 'screenshare' && <ScreenCaptureEntry />}
        </div>
      </div>

      {/* ── SECTION B: LIVE ANALYSIS WORKSPACE ────────────────────────────────── */}
      <div className="space-y-5">

        {/* Calculation status + wheel selector + session controls */}
        <PipelineHeader
          calculationDurationMs={instantAnalysis.calculationDurationMs}
          historyCutoff={instantAnalysis.historyCutoff}
          heavyStatus={heavyResults.status}
        />

        {/* Recent confirmed spins + total count */}
        <RecentSpinsBar />

        {/* Prediction engine activation bar & lifecycle status */}
        <PredictionActivationBar />

        {/* ── MAIN OUTPUT: Consolidated theory-union panel ─────────────────────
            Replaces the old MainCandidatePanel + ExperimentalCandidateMethodsGroup.
            All 8 strategy calculations remain unchanged; this panel consolidates
            their outputs into a single deduplicated grid with agreement badges.
         */}
        <ConsolidatedTheoryPanel
          allMethods={instantAnalysis.allCandidateMethods}
          wheelType={wheelType}
          totalSpins={spins.length}
          calculationDurationMs={instantAnalysis.calculationDurationMs}
        />

        {/* ── P&L CALCULATOR & TRACKING PANEL ─────────────────────────────────────── */}
        <PnlDashboardPanel />

        {/* ── SUPPORTING ANALYSIS GROUPS ──────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Frequency + Bayesian smoothed number analysis */}
          <NumberAnalysisGroup
            spins={spinNumbers}
            wheelType={wheelType}
            bayesianSmoothed={instantAnalysis.bayesianSmoothed}
          />

          {/* Physical wheel analysis: circular stats, KDE, sector */}
          <PhysicalWheelGroup
            spins={spinNumbers}
            wheelType={wheelType}
            circularStats={instantAnalysis.circularStats}
            wheelDistances={instantAnalysis.wheelDistances}
            circularKDE={instantAnalysis.circularKDE}
            sectorAnalysis={instantAnalysis.sectorAnalysis}
          />

          {/* Category analysis: Red/Black, Dozens, Columns, Odd/Even, High/Low */}
          <CategoryAnalysisGroup categoryMath={instantAnalysis.categoryAnalysis} />

          {/* Statistical diagnostics: Chi-Square, Entropy, Runs Test, Autocorrelation */}
          <ProbabilityStatisticsGroup
            totalSpins={spins.length}
            chiSquare={instantAnalysis.chiSquare}
            entropy={instantAnalysis.entropy}
            runsTest={instantAnalysis.runsTest}
            autocorrelation={instantAnalysis.autocorrelation}
          />

          {/* Heavy async calculations: Monte Carlo + Bootstrap CI */}
          <AsyncHeavyAnalysisGroup heavyResults={heavyResults} />

          {/* Verified strategy performance history */}
          <VerifiedPerformanceGroup metrics={instantAnalysis.trackingMetrics} wheelType={wheelType} />
        </div>
      </div>
    </div>
  );
};
