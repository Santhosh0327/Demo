import React, { useState } from 'react';
import { CategoryMathResult, ZeroRule, calculateEvenMoneyZeroPayout } from '../../utils/categoryLab';
import { ChevronDown, ChevronUp, Layers, Percent, ShieldCheck } from 'lucide-react';

interface CategoryAnalysisGroupProps {
  categoryMath: CategoryMathResult;
}

export const CategoryAnalysisGroup: React.FC<CategoryAnalysisGroupProps> = ({ categoryMath }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [zeroRule, setZeroRule] = useState<ZeroRule>('standard');

  const { categories, totalSpins } = categoryMath;

  const evenMoney = categories.filter((c) => c.group === '1:1 Even Money');
  const dozensCols = categories.filter((c) => c.group === '2:1 Dozens & Columns');
  const zeros = categories.filter((c) => c.group === 'Zeros');

  // Sample Zero Rule Payout calculation demonstration
  const sampleStake = 100;
  const standardRes = calculateEvenMoneyZeroPayout(false, true, sampleStake, 'standard');
  const laPartageRes = calculateEvenMoneyZeroPayout(false, true, sampleStake, 'la_partage');
  const enPrisonRes = calculateEvenMoneyZeroPayout(false, true, sampleStake, 'en_prison');

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              3. Category Analysis & Zero Rules Module
            </h3>
            <p className="text-[11px] text-slate-400">
              Red/Black, Odd/Even, High/Low, Dozens, Columns, Zeros, Wilson 95% CIs & Zero Rules (La Partage / En Prison)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            1:1 & 2:1 Bets
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-6">
          {/* Zero Rule Selector Header */}
          <div className="flex items-center justify-between bg-[#161D29] p-3 rounded-xl border border-[#232D3F] text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-slate-200">Zero Rules Payout Mechanics:</span>
            </div>
            <div className="flex rounded-lg bg-[#080B12] p-1 border border-[#232D3F]">
              <button
                onClick={() => setZeroRule('standard')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                  zeroRule === 'standard' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400'
                }`}
              >
                Standard (Full Loss)
              </button>
              <button
                onClick={() => setZeroRule('la_partage')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                  zeroRule === 'la_partage' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400'
                }`}
              >
                La Partage (50% Refund)
              </button>
              <button
                onClick={() => setZeroRule('en_prison')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                  zeroRule === 'en_prison' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400'
                }`}
              >
                En Prison (Held 1 Spin)
              </button>
            </div>
          </div>

          {/* 1:1 Even Money Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              1:1 Even Money Categories (Red/Black, Odd/Even, High/Low)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#232D3F] text-slate-400 uppercase text-[10px] font-bold bg-[#161D29]">
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Hits / Total</th>
                    <th className="p-2.5">Observed %</th>
                    <th className="p-2.5">Theoretical %</th>
                    <th className="p-2.5">Difference</th>
                    <th className="p-2.5">Wilson 95% CI</th>
                    <th className="p-2.5">Current / Max Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232D3F]/40 text-slate-200">
                  {evenMoney.map((c) => (
                    <tr key={c.categoryKey} className="hover:bg-[#161D29]/50">
                      <td className="p-2.5 font-bold text-amber-300">{c.categoryName}</td>
                      <td className="p-2.5">
                        {c.observedCount} / {totalSpins}
                      </td>
                      <td className="p-2.5 font-bold text-slate-100">{c.observedPercentage.toFixed(1)}%</td>
                      <td className="p-2.5 text-slate-400">{c.theoreticalPercentage.toFixed(1)}%</td>
                      <td
                        className={`p-2.5 font-bold ${
                          c.differencePercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {c.differencePercentage >= 0 ? '+' : ''}
                        {c.differencePercentage.toFixed(1)}%
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-300">
                        [{c.wilsonLowerCI.toFixed(1)}% - {c.wilsonUpperCI.toFixed(1)}%]
                      </td>
                      <td className="p-2.5 text-slate-300">
                        <span className="font-bold text-amber-400">{c.currentStreak}</span> / {c.maxStreak}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2:1 Dozens & Columns Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              2:1 Dozens & Columns Categories
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dozensCols.map((c) => (
                <div key={c.categoryKey} className="rounded-xl bg-[#161D29] border border-[#232D3F] p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>{c.categoryName}</span>
                    <span className="text-amber-300">{c.observedCount} hits</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-100">
                    {c.observedPercentage.toFixed(1)}%{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      (Theo: {c.theoreticalPercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Streak: Current <strong className="text-amber-400">{c.currentStreak}</strong> (Max {c.maxStreak})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zero Summary */}
          <div className="rounded-xl bg-[#080B12] border border-[#232D3F] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {zeros.map((z) => (
              <div key={z.categoryKey} className="flex items-center gap-3">
                <span className="font-bold text-emerald-400">{z.categoryName}:</span>
                <span className="text-slate-200 font-bold">{z.observedCount} hits ({z.observedPercentage.toFixed(1)}%)</span>
                <span className="text-slate-400 text-[11px]">(Theo: {z.theoreticalPercentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
