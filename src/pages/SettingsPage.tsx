import React from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { DEFAULT_WEIGHTS } from '../utils/candidateEngine';
import { Settings, RefreshCcw, Database, Sliders } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    wheelType,
    setWheelType,
    windowSize,
    setWindowSize,
    algorithmWeights,
    updateWeights,
    clearSessionSpins,
    showToast,
  } = useRouletteStore();

  const handleResetWeights = () => {
    updateWeights(DEFAULT_WEIGHTS);
    showToast('Reset algorithm weights to defaults', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-[#232D3F] pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#D4AF37]" /> Application Settings & Configuration
          </h2>
          <p className="text-xs text-slate-400">
            Tune statistical parameters, active wheel rules, and session persistence
          </p>
        </div>
      </div>

      {/* Wheel Variant Selection */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100">Wheel Layout Variant</h3>
        <p className="text-xs text-slate-400">
          Switching wheel variant adjusts pocket order, opposite calculations (Offsets 18/19 vs 19), and fair baseline denominators (37 vs 38).
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => setWheelType('European')}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${
              wheelType === 'European'
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] font-bold shadow-lg'
                : 'border-[#232D3F] bg-[#080B12] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-sm font-extrabold">European Roulette (0)</div>
            <div className="text-xs font-normal mt-1 opacity-80">
              37 Pockets (0, 1–36). Baseline 18/37 = 48.65%. Opposite offsets 18 & 19.
            </div>
          </button>

          <button
            onClick={() => setWheelType('American')}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${
              wheelType === 'American'
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] font-bold shadow-lg'
                : 'border-[#232D3F] bg-[#080B12] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-sm font-extrabold">American Roulette (00)</div>
            <div className="text-xs font-normal mt-1 opacity-80">
              38 Pockets (0, 00, 1–36). Baseline 18/38 = 47.37%. Exact opposite offset 19.
            </div>
          </button>
        </div>
      </div>

      {/* Rolling Window Size Setting */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Rolling Analysis Window Size</h3>
          <span className="text-xs font-black text-[#D4AF37] bg-[#080B12] px-3 py-1 rounded-lg border border-[#232D3F]">
            {windowSize} Latest Spins
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Determines the number of recent consecutive spins evaluated by deterministic pattern models (Default: 50).
        </p>

        <input
          type="range"
          min="10"
          max="200"
          step="5"
          value={windowSize}
          onChange={(e) => setWindowSize(parseInt(e.target.value))}
          className="w-full accent-[#D4AF37]"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>10 (Short-term)</span>
          <span>50 (Standard)</span>
          <span>200 (Long-term)</span>
        </div>
      </div>

      {/* Reset Controls */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Database className="h-4 w-4 text-rose-400" /> Database & Defaults Reset
        </h3>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleResetWeights}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700"
          >
            <Sliders className="h-4 w-4 text-amber-400" /> Reset Score Weights to Defaults
          </button>

          <button
            onClick={() => clearSessionSpins(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/60 text-xs font-semibold text-rose-300 border border-rose-800 hover:bg-rose-900"
          >
            <RefreshCcw className="h-4 w-4" /> Clear Active Session Database
          </button>
        </div>
      </div>
    </div>
  );
};
