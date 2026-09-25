import React, { useState } from 'react';
import { CandidateMethodId, CandidateSnapshotRecord } from '../../utils/candidateEngineLab';
import { SpinChip } from '../common/SpinChip';
import { ChevronDown, ChevronUp, Layers, Sparkles } from 'lucide-react';

interface ExperimentalCandidateMethodsGroupProps {
  allMethods: Record<CandidateMethodId, CandidateSnapshotRecord>;
}

const METHOD_DETAILS: Record<CandidateMethodId, { name: string; tag: string; description: string }> = {
  frequency: {
    name: '1. Frequency-Based 18-Set',
    tag: 'Frequency Rank',
    description: 'Selects top 18 numbers with the highest historical count in current session cutoff.',
  },
  recency: {
    name: '2. Recency-Based 18-Set',
    tag: 'Recency Rank',
    description: 'Selects the 18 numbers that occurred most recently in chronological history.',
  },
  transition: {
    name: '3. Transition-Based 18-Set',
    tag: 'Markov 1st Order',
    description: 'Selects top 18 numbers with highest transition count following last winning spin.',
  },
  wheel_neighbour: {
    name: '4. Wheel-Neighbour-Based 18-Set',
    tag: 'Physical Radius',
    description: 'Selects 18 pockets adjacent to last winning pocket on physical wheel track.',
  },
  opposite_pocket: {
    name: '5. Opposite-Pocket-Based 18-Set',
    tag: 'Diametric Sector',
    description: 'Selects 18 pockets centered around exact diametrically opposite wheel pocket.',
  },
  sector: {
    name: '6. Sector-Based 18-Set',
    tag: 'French / Quadrants',
    description: 'Selects top 18 pockets from Voisins du Zéro (EU) or wheel quadrants (US).',
  },
  bayesian: {
    name: '7. Bayesian-Smoothed 18-Set',
    tag: 'Laplace Prior (alpha=1)',
    description: 'Selects top 18 numbers ranked by Laplace-smoothed posterior probabilities.',
  },
  weighted_ensemble: {
    name: '8. Configurable Weighted Ensemble 18-Set',
    tag: 'Ensemble Combination',
    description: 'Blends Frequency, Recency, Transition, Wheel Physics and Bayesian scores into unified set.',
  },
};

export const ExperimentalCandidateMethodsGroup: React.FC<ExperimentalCandidateMethodsGroupProps> = ({
  allMethods,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const methodKeys: CandidateMethodId[] = [
    'frequency',
    'recency',
    'transition',
    'wheel_neighbour',
    'opposite_pocket',
    'sector',
    'bayesian',
    'weighted_ensemble',
  ];

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              5. All 8 Experimental Candidate Methods (Side-by-Side)
            </h3>
            <p className="text-[11px] text-slate-400">
              Separately calculated 18-number candidate sets for each mathematical strategy method
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            8 Strategy Sets
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-400">
            Each candidate strategy outputs exactly 18 distinct numbers derived from historical session data.
            Diagnostic methods (Chi-Square, Entropy, Runs Test) perform mathematical testing without forcing 18-number candidate picks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methodKeys.map((key) => {
              const info = METHOD_DETAILS[key];
              const snapshot = allMethods[key];
              const numbers = snapshot?.selectedNumbers || [];

              return (
                <div
                  key={key}
                  className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs">{info.name}</h4>
                      <p className="text-[10px] text-slate-400">{info.description}</p>
                    </div>
                    <span className="rounded bg-amber-500/10 text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/20 shrink-0">
                      {info.tag}
                    </span>
                  </div>

                  {numbers.length === 18 ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {numbers.map((n, idx) => (
                        <SpinChip key={`${key}_${n}_${idx}`} number={n} size="sm" />
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] italic text-slate-500 py-2">
                      Insufficient history cutoff for {info.name}.
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#232D3F]/50">
                    <span>Sample Size: {snapshot?.historyCutoff || 0} spins</span>
                    <span>18 Distinct Pockets</span>
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
