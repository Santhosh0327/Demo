import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Cpu, Save, Shield, Sliders } from 'lucide-react';
import { WheelType } from '../../types/roulette';
import {
  CANDIDATE_ENGINE_DISCLAIMER,
  CandidateMethodId,
  generateExperimentalCandidates,
  LAB_MODEL_VERSION,
} from '../../utils/candidateEngineLab';
import { getPocketColor } from '../../utils/rouletteRules';

interface Module5Props {
  spins: string[];
  wheelType: WheelType;
  sessionId?: string;
}

export const Module5CandidateEngine: React.FC<Module5Props> = ({
  spins,
  wheelType,
  sessionId = 'active_session',
}) => {
  const [method, setMethod] = useState<CandidateMethodId>('frequency');
  const [minSpins, setMinSpins] = useState<number>(10);
  const [historyCutoff, setHistoryCutoff] = useState<number>(50);
  const [priorAlpha, setPriorAlpha] = useState<number>(1.0);
  const [neighbourRadius, setNeighbourRadius] = useState<number>(8);

  const [ensembleWeights, setEnsembleWeights] = useState({
    frequency: 20,
    recency: 20,
    transition: 20,
    neighbour: 15,
    opposite: 10,
    sector: 5,
    bayesian: 10,
  });

  const snapshot = generateExperimentalCandidates(
    spins,
    {
      method,
      minSpinsRequired: minSpins,
      historyCutoff,
      wheelType,
      priorAlpha,
      neighbourRadius,
      ensembleWeights,
    },
    sessionId
  );

  const handleSaveSnapshot = () => {
    alert(
      `Snapshot Saved Successfully!\n\nID: ${snapshot.id}\nMethod: ${snapshot.method}\nCutoff: ${snapshot.historyCutoff} spins\nSelected 18 Numbers: ${snapshot.selectedNumbers.join(
        ', '
      )}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[#D4AF37]" />
              Experimental 18-Number Candidate Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Interchangeable mathematical selection algorithms that output exactly 18 distinct candidate numbers with deterministic tie-breaking.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] px-3 py-1.5 rounded-xl border border-[#232D3F] text-xs">
            <span className="text-slate-400">Model Version:</span>
            <span className="font-mono font-bold text-[#D4AF37]">{LAB_MODEL_VERSION}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Candidate Selection Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as CandidateMethodId)}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-100 p-2.5 font-semibold"
            >
              <option value="frequency">1. Frequency-Based Selection</option>
              <option value="recency">2. Recency-Based Selection</option>
              <option value="transition">3. Transition-Based Selection</option>
              <option value="wheel_neighbour">4. Wheel-Neighbour Selection</option>
              <option value="opposite_pocket">5. Opposite-Pocket Selection</option>
              <option value="sector">6. Sector-Based Selection</option>
              <option value="bayesian">7. Bayesian-Smoothed Selection</option>
              <option value="weighted_ensemble">8. Configurable Weighted Ensemble</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>History Cutoff Window</span>
              <span className="text-[#D4AF37] font-mono font-bold">{historyCutoff} spins</span>
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={historyCutoff}
              onChange={(e) => setHistoryCutoff(Number(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>Min Spins Requirement</span>
              <span className="text-[#D4AF37] font-mono font-bold">{minSpins} spins</span>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={minSpins}
              onChange={(e) => setMinSpins(Number(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>
        </div>

        {/* Ensemble Weight Sliders if method === 'weighted_ensemble' */}
        {method === 'weighted_ensemble' && (
          <div className="mt-4 pt-4 border-t border-[#232D3F]">
            <span className="text-xs font-bold text-slate-300 block mb-2">
              Ensemble Sub-Model Weights
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {Object.keys(ensembleWeights).map((key) => (
                <div key={key}>
                  <label className="text-slate-400 capitalize flex justify-between">
                    <span>{key}</span>
                    <span className="font-mono text-[#D4AF37]">
                      {(ensembleWeights as any)[key]}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={(ensembleWeights as any)[key]}
                    onChange={(e) =>
                      setEnsembleWeights({
                        ...ensembleWeights,
                        [key]: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Safety Disclaimer */}
      <div className="bg-[#080B12] border border-[#232D3F] rounded-2xl p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-indigo-300 block mb-0.5">
            Model Probability &amp; Edge Disclaimer
          </span>
          <p className="text-slate-400 leading-relaxed">{CANDIDATE_ENGINE_DISCLAIMER}</p>
        </div>
      </div>

      {/* Results Display */}
      {!snapshot.isSufficientData ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center text-xs text-amber-300">
          <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <span className="font-bold text-sm block mb-1">Insufficient Session History</span>
          Current window contains {snapshot.historyCutoff} spins. Minimum requirement for{' '}
          {snapshot.method} selection is {minSpins} spins. Candidate numbers are withheld.
        </div>
      ) : (
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Selected 18 Candidate Numbers (Method: {snapshot.method})
            </h3>
            <button
              onClick={handleSaveSnapshot}
              className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Save className="h-3.5 w-3.5" /> Save Candidate Snapshot
            </button>
          </div>

          {/* Grid of 18 numbers */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {snapshot.selectedNumbers.map((num, idx) => {
              const color = getPocketColor(num);
              return (
                <div
                  key={`${num}_${idx}`}
                  className="bg-[#080B12] border border-[#232D3F] rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-[10px] text-slate-500 font-mono">Rank #{idx + 1}</span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm font-mono shadow ${
                      color === 'red'
                        ? 'bg-red-600 text-white'
                        : color === 'black'
                        ? 'bg-slate-800 text-white border border-slate-600'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {num}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
