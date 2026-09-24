import React from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { SpinChip } from '../components/common/SpinChip';
import { MIN_HISTORY_REQUIRED } from '../utils/candidateEngine';
import { Sliders, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';

export const PredictionCenterPage: React.FC = () => {
  const { currentPrediction, algorithmWeights, updateWeights, spins } = useRouletteStore();

  const top18 = currentPrediction?.candidateScores.slice(0, 18) || [];

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#232D3F] pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#D4AF37]" /> Prediction Center Engine
          </h2>
          <p className="text-xs text-slate-400">
            Configure algorithm scoring parameters to generate exactly 18 distinct candidates
          </p>
        </div>
      </div>

      {/* Weight Controls Sliders */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#D4AF37]" /> Algorithm Scoring Parameters
          </h3>
          <span className="text-xs text-slate-400">Adjust weights to tune deterministic model</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-xs text-slate-300">
          <div>
            <div className="flex justify-between mb-1">
              <span>Frequency Weight</span>
              <span className="font-bold text-emerald-400">{algorithmWeights.frequency}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmWeights.frequency}
              onChange={(e) => updateWeights({ frequency: parseInt(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Recency Weight</span>
              <span className="font-bold text-sky-400">{algorithmWeights.recency}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmWeights.recency}
              onChange={(e) => updateWeights({ recency: parseInt(e.target.value) })}
              className="w-full accent-sky-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Transition Weight</span>
              <span className="font-bold text-amber-400">{algorithmWeights.transition}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmWeights.transition}
              onChange={(e) => updateWeights({ transition: parseInt(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Wheel Sector Weight</span>
              <span className="font-bold text-purple-400">{algorithmWeights.sector}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmWeights.sector}
              onChange={(e) => updateWeights({ sector: parseInt(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Opposite Sector Weight</span>
              <span className="font-bold text-rose-400">{algorithmWeights.opposite}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={algorithmWeights.opposite}
              onChange={(e) => updateWeights({ opposite: parseInt(e.target.value) })}
              className="w-full accent-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Generated 18 Candidates List */}
      {currentPrediction ? (
        <>
          <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span>Top 18 Distinct Candidate Numbers Selected</span>
              <span className="text-xs text-[#D4AF37] font-mono">18 / 18 Generated</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {top18.map((c) => (
                <div key={c.number} className="flex flex-col items-center bg-[#080B12] p-3 rounded-xl border border-[#232D3F] space-y-2">
                  <SpinChip number={c.number} size="md" isCandidate score={c.totalScore} rank={c.rank} />
                  <span className="text-[10px] text-slate-400 text-center line-clamp-1">{c.explanation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Predictions Detailed List */}
          <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#D4AF37]" /> Category Candidate Forecasts & Rationale
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#232D3F] bg-[#080B12] p-4 space-y-2">
                <span className="text-xs text-slate-400">Red / Black Forecast</span>
                <div className="text-lg font-black text-[#D4AF37]">
                  {currentPrediction.categoryCandidates.redBlack.candidate} ({currentPrediction.categoryCandidates.redBlack.confidence}%)
                </div>
                <p className="text-xs text-slate-300">
                  {currentPrediction.categoryCandidates.redBlack.explanation}
                </p>
              </div>

              <div className="rounded-xl border border-[#232D3F] bg-[#080B12] p-4 space-y-2">
                <span className="text-xs text-slate-400">Dozen Forecast</span>
                <div className="text-lg font-black text-[#D4AF37]">
                  {currentPrediction.categoryCandidates.dozen.candidate} ({currentPrediction.categoryCandidates.dozen.confidence}%)
                </div>
                <p className="text-xs text-slate-300">
                  {currentPrediction.categoryCandidates.dozen.explanation}
                </p>
              </div>

              <div className="rounded-xl border border-[#232D3F] bg-[#080B12] p-4 space-y-2">
                <span className="text-xs text-slate-400">Column Forecast</span>
                <div className="text-lg font-black text-[#D4AF37]">
                  {currentPrediction.categoryCandidates.column.candidate} ({currentPrediction.categoryCandidates.column.confidence}%)
                </div>
                <p className="text-xs text-slate-300">
                  {currentPrediction.categoryCandidates.column.explanation}
                </p>
              </div>

              <div className="rounded-xl border border-[#232D3F] bg-[#080B12] p-4 space-y-2">
                <span className="text-xs text-slate-400">Odd / Even Forecast</span>
                <div className="text-lg font-black text-[#D4AF37]">
                  {currentPrediction.categoryCandidates.oddEven.candidate} ({currentPrediction.categoryCandidates.oddEven.confidence}%)
                </div>
                <p className="text-xs text-slate-300">
                  {currentPrediction.categoryCandidates.oddEven.explanation}
                </p>
              </div>

              <div className="rounded-xl border border-[#232D3F] bg-[#080B12] p-4 space-y-2">
                <span className="text-xs text-slate-400">High / Low Forecast</span>
                <div className="text-lg font-black text-[#D4AF37]">
                  {currentPrediction.categoryCandidates.highLow.candidate} ({currentPrediction.categoryCandidates.highLow.confidence}%)
                </div>
                <p className="text-xs text-slate-300">
                  {currentPrediction.categoryCandidates.highLow.explanation}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-[#161D29] p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-[#D4AF37] mx-auto opacity-80" />
          <h4 className="text-sm font-bold text-slate-200">
            Insufficient Spin History for Candidate Generation
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Minimum <span className="text-[#D4AF37] font-bold">{MIN_HISTORY_REQUIRED} confirmed spins</span> required in active session history to calculate deterministic scores (Currently {spins.length}/{MIN_HISTORY_REQUIRED} logged).
          </p>
        </div>
      )}
    </div>
  );
};
