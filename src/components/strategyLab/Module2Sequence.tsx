import React, { useState } from 'react';
import { Clock, History, Info, Repeat } from 'lucide-react';
import { WheelType } from '../../types/roulette';
import { getAllWheelNumbers, getPocketColor } from '../../utils/rouletteRules';

interface Module2Props {
  spins: string[];
  wheelType: WheelType;
}

export const Module2Sequence: React.FC<Module2Props> = ({ spins, wheelType }) => {
  const [sampleWindow, setSampleWindow] = useState<number>(100);
  const [filterPocket, setFilterPocket] = useState<string>('all');

  const activeSpins = spins.slice(-sampleWindow);
  const totalSpins = activeSpins.length;
  const allNumbers = getAllWheelNumbers(wheelType);

  // Transition matrix
  const transitionMatrix: Record<string, Record<string, number>> = {};
  allNumbers.forEach((p) => {
    transitionMatrix[p] = {};
    allNumbers.forEach((n) => {
      transitionMatrix[p][n] = 0;
    });
  });

  for (let i = 0; i < activeSpins.length - 1; i++) {
    const prev = activeSpins[i];
    const next = activeSpins[i + 1];
    if (transitionMatrix[prev] && transitionMatrix[prev][next] !== undefined) {
      transitionMatrix[prev][next]++;
    }
  }

  // Consecutive repeats check
  const pairs: Record<string, number> = {};
  const triples: Record<string, number> = {};

  for (let i = 1; i < activeSpins.length; i++) {
    if (activeSpins[i] === activeSpins[i - 1]) {
      const num = activeSpins[i];
      pairs[num] = (pairs[num] || 0) + 1;
    }
    if (i >= 2 && activeSpins[i] === activeSpins[i - 1] && activeSpins[i - 1] === activeSpins[i - 2]) {
      const num = activeSpins[i];
      triples[num] = (triples[num] || 0) + 1;
    }
  }

  // Cold duration / Absence map
  const absenceMap: Record<string, number> = {};
  allNumbers.forEach((n) => (absenceMap[n] = totalSpins));
  activeSpins.forEach((n, idx) => {
    absenceMap[n] = totalSpins - 1 - idx;
  });

  const coldestNumbers = [...allNumbers]
    .map((n) => ({ number: n, absentSpins: absenceMap[n] }))
    .sort((a, b) => b.absentSpins - a.absentSpins)
    .slice(0, 8);

  const topTransitions: { prev: string; next: string; count: number }[] = [];
  allNumbers.forEach((p) => {
    allNumbers.forEach((n) => {
      const count = transitionMatrix[p][n];
      if (count > 0) {
        topTransitions.push({ prev: p, next: n, count });
      }
    });
  });
  topTransitions.sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <History className="h-5 w-5 text-[#D4AF37]" />
              Historical Number & Sequence Analysis
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Analyze first-order Markov transition matrices, repeat pairs, triples, and duration of absence across session history.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] px-3 py-1.5 rounded-xl border border-[#232D3F] text-xs">
            <span className="text-slate-400">Active Window:</span>
            <span className="font-mono font-bold text-[#D4AF37]">{totalSpins} spins</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>Sample Window (Spins)</span>
              <span className="text-[#D4AF37] font-mono font-bold">{sampleWindow}</span>
            </label>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={sampleWindow}
              onChange={(e) => setSampleWindow(Number(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Focus Transition Target Number
            </label>
            <select
              value={filterPocket}
              onChange={(e) => setFilterPocket(e.target.value)}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-200 p-2 font-mono"
            >
              <option value="all">All Numbers (Full Matrix)</option>
              {allNumbers.map((n) => (
                <option key={n} value={n}>
                  Number {n} ({getPocketColor(n).toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top Transition Pairs & Coldest Numbers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Frequent Transitions */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl md:col-span-2">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4 text-[#D4AF37]" />
            Top Transition Pairs (Spin N &rarr; Spin N+1)
          </h3>
          {topTransitions.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">
              No transition data available for current window.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {topTransitions.slice(0, 12).map((t, idx) => (
                <div
                  key={`${t.prev}->${t.next}_${idx}`}
                  className="bg-[#080B12] border border-[#232D3F] rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        getPocketColor(t.prev) === 'red'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : getPocketColor(t.prev) === 'black'
                          ? 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {t.prev}
                    </span>
                    <span className="text-slate-500">&rarr;</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        getPocketColor(t.next) === 'red'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : getPocketColor(t.next) === 'black'
                          ? 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {t.next}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">
                    {t.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coldest Absence Duration */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#D4AF37]" />
            Longest Absent Numbers
          </h3>
          <div className="space-y-1.5">
            {coldestNumbers.map((item) => (
              <div
                key={item.number}
                className="bg-[#080B12] border border-[#232D3F] rounded-xl p-2 flex items-center justify-between text-xs"
              >
                <span className="font-mono font-bold text-slate-200 flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      getPocketColor(item.number) === 'red'
                        ? 'bg-red-600 text-white'
                        : getPocketColor(item.number) === 'black'
                        ? 'bg-slate-800 text-white border border-slate-600'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {item.number}
                  </span>
                  Pocket {item.number}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Absent <strong className="text-amber-400">{item.absentSpins}</strong> spins
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Repeating Pairs & Triples */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-3">
          Back-to-Back Pocket Repetitions (Pairs &amp; Triples)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#080B12] border border-[#232D3F] rounded-xl p-3">
            <span className="text-xs font-bold text-slate-300 block mb-2">
              Back-to-Back Pairs (Same Number Consecutive Spins)
            </span>
            {Object.keys(pairs).length === 0 ? (
              <span className="text-xs text-slate-500">No repeated pairs in current window.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(pairs).map(([num, count]) => (
                  <span
                    key={num}
                    className="bg-[#10151F] border border-[#232D3F] px-2.5 py-1 rounded-lg text-xs font-mono text-slate-200"
                  >
                    Number <strong className="text-[#D4AF37]">{num}</strong>: {count}x
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#080B12] border border-[#232D3F] rounded-xl p-3">
            <span className="text-xs font-bold text-slate-300 block mb-2">
              Triple Repetitions (3x Same Number Consecutive)
            </span>
            {Object.keys(triples).length === 0 ? (
              <span className="text-xs text-slate-500">No triple repetitions observed.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(triples).map(([num, count]) => (
                  <span
                    key={num}
                    className="bg-[#10151F] border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-mono text-amber-300"
                  >
                    Number <strong>{num}</strong>: {count}x
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
