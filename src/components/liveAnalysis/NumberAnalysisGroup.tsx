import React, { useState } from 'react';
import { WheelType } from '../../types/roulette';
import { getAllWheelNumbers } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';
import { ChevronDown, ChevronUp, Hash, Flame, Snowflake, ArrowRightLeft, Sparkles, BarChart2 } from 'lucide-react';

interface NumberAnalysisGroupProps {
  spins: string[];
  wheelType: WheelType;
  bayesianSmoothed: Record<string, { count: number; rawProbability: number; posteriorProbability: number }>;
}

export const NumberAnalysisGroup: React.FC<NumberAnalysisGroupProps> = ({
  spins,
  wheelType,
  bayesianSmoothed,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'freq' | 'gap' | 'repeats' | 'transitions' | 'bayesian'>('freq');

  const allNumbers = getAllWheelNumbers(wheelType);
  const N = spins.length;

  // Calculate Frequency & Recency Map
  const freqMap: Record<string, number> = {};
  const lastSeenMap: Record<string, number> = {};

  allNumbers.forEach((n) => {
    freqMap[n] = 0;
    lastSeenMap[n] = -1; // -1 means never seen
  });

  spins.forEach((n, idx) => {
    if (freqMap[n] !== undefined) {
      freqMap[n]++;
      lastSeenMap[n] = idx;
    }
  });

  // Hot (highest count) & Cold (lowest count / longest unseen)
  const sortedByFreq = [...allNumbers].sort((a, b) => freqMap[b] - freqMap[a]);
  const hotNumbers = sortedByFreq.slice(0, 6);
  const coldNumbers = sortedByFreq.slice(-6).reverse();

  // Gap & Recency Table data
  const gapData = allNumbers.map((n) => {
    const lastIdx = lastSeenMap[n];
    const spinsSince = lastIdx === -1 ? N : N - 1 - lastIdx;
    return {
      number: n,
      count: freqMap[n],
      spinsSince,
      percentage: N > 0 ? ((freqMap[n] / N) * 100).toFixed(1) : '0.0',
    };
  });

  // Repeats & Sequences
  let repeatPairsCount = 0;
  let repeatTriplesCount = 0;
  const repeatCounts: Record<string, number> = {};

  for (let i = 0; i < spins.length - 1; i++) {
    if (spins[i] === spins[i + 1]) {
      repeatPairsCount++;
      repeatCounts[spins[i]] = (repeatCounts[spins[i]] || 0) + 1;
      if (i < spins.length - 2 && spins[i + 1] === spins[i + 2]) {
        repeatTriplesCount++;
      }
    }
  }

  // Transition Matrix (top 8 transitions)
  const transitionMatrix: Record<string, Record<string, number>> = {};
  for (let i = 0; i < spins.length - 1; i++) {
    const current = spins[i];
    const next = spins[i + 1];
    if (!transitionMatrix[current]) transitionMatrix[current] = {};
    transitionMatrix[current][next] = (transitionMatrix[current][next] || 0) + 1;
  }

  const lastSpin = spins[spins.length - 1];

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              1. Number Analysis Module
            </h3>
            <p className="text-[11px] text-slate-400">
              Hot/Cold Frequencies, Recency & Gaps, Repeats, Transition Matrices & Bayesian Smoothing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {allNumbers.length} Pockets
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5">
          {/* Module Sub-tabs */}
          <div className="flex border-b border-[#232D3F] gap-2 pb-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('freq')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'freq' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" /> Hot & Cold Frequency
            </button>
            <button
              onClick={() => setActiveTab('gap')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'gap' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="h-3.5 w-3.5" /> Gap & Recency
            </button>
            <button
              onClick={() => setActiveTab('repeats')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'repeats' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Repeats & Sequences
            </button>
            <button
              onClick={() => setActiveTab('transitions')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'transitions' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Transition Matrix
            </button>
            <button
              onClick={() => setActiveTab('bayesian')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'bayesian' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Bayesian Smoothing
            </button>
          </div>

          {/* Sub-tab 1: Hot & Cold Frequency */}
          {activeTab === 'freq' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hot Numbers */}
              <div className="rounded-xl border border-[#232D3F] bg-[#161D29] p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                  <Flame className="h-4 w-4" /> Top Hot Numbers
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {hotNumbers.map((n) => (
                    <div key={n} className="flex items-center justify-between p-2 rounded-lg bg-[#080B12] border border-[#232D3F]">
                      <SpinChip number={n} size="sm" />
                      <div className="text-right">
                        <div className="text-xs font-bold text-amber-300">{freqMap[n]} hits</div>
                        <div className="text-[10px] text-slate-400">
                          {N > 0 ? ((freqMap[n] / N) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cold Numbers */}
              <div className="rounded-xl border border-[#232D3F] bg-[#161D29] p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase">
                  <Snowflake className="h-4 w-4" /> Coldest / Longest Unseen
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {coldNumbers.map((n) => {
                    const lastIdx = lastSeenMap[n];
                    const spinsAgo = lastIdx === -1 ? 'Never' : `${N - 1 - lastIdx} ago`;
                    return (
                      <div key={n} className="flex items-center justify-between p-2 rounded-lg bg-[#080B12] border border-[#232D3F]">
                        <SpinChip number={n} size="sm" />
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-300">{freqMap[n]} hits</div>
                          <div className="text-[10px] text-blue-400">{spinsAgo}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Gap & Recency */}
          {activeTab === 'gap' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#232D3F] text-slate-400 uppercase text-[10px] font-bold bg-[#161D29]">
                    <th className="p-2">Number</th>
                    <th className="p-2">Observed Count</th>
                    <th className="p-2">Observed %</th>
                    <th className="p-2">Spins Since Last Hit (Gap)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232D3F]/40 text-slate-200">
                  {gapData.slice(0, 12).map((item) => (
                    <tr key={item.number} className="hover:bg-[#161D29]/50">
                      <td className="p-2">
                        <SpinChip number={item.number} size="sm" />
                      </td>
                      <td className="p-2 font-bold">{item.count}</td>
                      <td className="p-2">{item.percentage}%</td>
                      <td className="p-2 font-mono font-bold text-amber-300">{item.spinsSince} spins</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 3: Repeats & Sequences */}
          {activeTab === 'repeats' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-2">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Consecutive Back-to-Back Repeats</span>
                <span className="text-2xl font-black text-amber-400">{repeatPairsCount}</span>
                <p className="text-[11px] text-slate-400">Total 2-spin identical pairs observed in history.</p>
              </div>

              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-2">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Triple Consecutive Repeats</span>
                <span className="text-2xl font-black text-purple-400">{repeatTriplesCount}</span>
                <p className="text-[11px] text-slate-400">Total 3-spin identical sequence hits.</p>
              </div>
            </div>
          )}

          {/* Sub-tab 4: Transition Matrix */}
          {activeTab === 'transitions' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Transitions following last winning spin (<strong className="text-amber-300">Number {lastSpin || 'N/A'}</strong>):
              </p>
              {lastSpin && transitionMatrix[lastSpin] ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(transitionMatrix[lastSpin])
                    .sort((a, b) => b[1] - a[1])
                    .map(([nextNum, count]) => (
                      <div key={nextNum} className="flex items-center justify-between p-2 rounded-xl bg-[#161D29] border border-[#232D3F]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">{lastSpin}</span>
                          <span className="text-amber-400">→</span>
                          <SpinChip number={nextNum} size="sm" />
                        </div>
                        <span className="font-bold text-amber-300">{count}x</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No transitions recorded following number {lastSpin || 'N/A'} in history.</p>
              )}
            </div>
          )}

          {/* Sub-tab 5: Bayesian Smoothing */}
          {activeTab === 'bayesian' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Dirichlet-Multinomial posterior probabilities with Laplace uniform prior (&alpha; = 1.0):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {allNumbers.slice(0, 12).map((num) => {
                  const info = bayesianSmoothed[num] || { count: 0, rawProbability: 0, posteriorProbability: 0 };
                  return (
                    <div key={num} className="p-2 rounded-xl bg-[#161D29] border border-[#232D3F] space-y-1">
                      <div className="flex items-center justify-between">
                        <SpinChip number={num} size="sm" />
                        <span className="text-[10px] text-slate-400">{info.count} hits</span>
                      </div>
                      <div className="text-[11px] font-bold text-amber-300">
                        P_post: {(info.posteriorProbability * 100).toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
