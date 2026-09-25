import React, { useState } from 'react';
import { Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { WheelType } from '../../types/roulette';
import { calculateCategoryMath, ZeroRule } from '../../utils/categoryLab';

interface Module4Props {
  spins: string[];
  wheelType: WheelType;
}

export const Module4Category: React.FC<Module4Props> = ({ spins, wheelType }) => {
  const [sampleWindow, setSampleWindow] = useState<number>(100);
  const [zeroRule, setZeroRule] = useState<ZeroRule>('standard');

  const activeSpins = spins.slice(-sampleWindow);
  const catMath = calculateCategoryMath(activeSpins, wheelType, zeroRule);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#D4AF37]" />
              Betting-Category Mathematics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Theoretical vs observed probabilities, Wilson score 95% confidence intervals, streaks, and French zero rules (La Partage &amp; En Prison).
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] px-3 py-1.5 rounded-xl border border-[#232D3F] text-xs">
            <span className="text-slate-400">Zero Rule Mode:</span>
            <span className="font-mono font-bold text-[#D4AF37]">
              {zeroRule === 'standard' ? 'Standard Rules' : zeroRule === 'la_partage' ? 'La Partage (50% Refund)' : 'En Prison (Hold Stake)'}
            </span>
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
              1:1 Even Money Zero Rule Mechanic
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#080B12] p-1 rounded-lg border border-[#232D3F]">
              {(['standard', 'la_partage', 'en_prison'] as ZeroRule[]).map((rule) => (
                <button
                  key={rule}
                  onClick={() => setZeroRule(rule)}
                  className={`py-1 text-[11px] rounded font-semibold transition-colors ${
                    zeroRule === rule
                      ? 'bg-[#D4AF37] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {rule === 'standard' ? 'Standard' : rule === 'la_partage' ? 'La Partage' : 'En Prison'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: Categories & Wilson Score CIs */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-200 mb-4">
          Category Distribution, Wilson 95% CIs &amp; Streaks
        </h3>
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-[#232D3F] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Group</th>
              <th className="py-2.5 px-3 font-mono">Hits / Total</th>
              <th className="py-2.5 px-3 font-mono">Observed %</th>
              <th className="py-2.5 px-3 font-mono">Theoretical %</th>
              <th className="py-2.5 px-3 font-mono">Diff %</th>
              <th className="py-2.5 px-3 font-mono">Wilson 95% CI</th>
              <th className="py-2.5 px-3 font-mono">Max Streak</th>
              <th className="py-2.5 px-3 font-mono">Current Streak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232D3F]/50 text-xs font-mono">
            {catMath.categories.map((cat) => (
              <tr key={cat.categoryKey} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-100 font-sans">{cat.categoryName}</td>
                <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">{cat.group}</td>
                <td className="py-2.5 px-3 text-slate-300">
                  {cat.observedCount} / {catMath.totalSpins}
                </td>
                <td className="py-2.5 px-3 font-bold text-[#D4AF37]">
                  {cat.observedPercentage.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  {cat.theoreticalPercentage.toFixed(2)}%
                </td>
                <td className="py-2.5 px-3 font-semibold">
                  <span
                    className={
                      cat.differencePercentage > 0
                        ? 'text-emerald-400'
                        : cat.differencePercentage < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }
                  >
                    {cat.differencePercentage > 0 ? '+' : ''}
                    {cat.differencePercentage.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  [{cat.wilsonLowerCI.toFixed(1)}%, {cat.wilsonUpperCI.toFixed(1)}%]
                </td>
                <td className="py-2.5 px-3 text-slate-300">{cat.maxStreak}</td>
                <td className="py-2.5 px-3 font-bold text-amber-400">{cat.currentStreak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Even Money Transition Table */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-3">
          Red / Black / Zero 1st-Order Transition Counts
        </h3>
        <div className="grid grid-cols-3 gap-3 font-mono text-xs">
          {Object.entries(catMath.transitionMatrix1To1).map(([prevCat, nextObj]) => (
            <div key={prevCat} className="bg-[#080B12] border border-[#232D3F] rounded-xl p-3">
              <span className="font-bold text-[#D4AF37] block mb-2 font-sans">
                From {prevCat} &rarr;
              </span>
              <div className="space-y-1 text-slate-300">
                {Object.entries(nextObj).map(([nextCat, count]) => (
                  <div key={nextCat} className="flex justify-between">
                    <span>{nextCat}:</span>
                    <span className="font-bold text-slate-100">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
