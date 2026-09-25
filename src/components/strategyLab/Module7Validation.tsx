import React, { useState } from 'react';
import { Award, CheckCircle2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { WheelType } from '../../types/roulette';
import {
  CandidateMethodId,
  generateExperimentalCandidates,
} from '../../utils/candidateEngineLab';
import { calculateBootstrapProportionCI } from '../../utils/mathLab';

interface Module7Props {
  spins: string[];
  wheelType: WheelType;
}

export const Module7Validation: React.FC<Module7Props> = ({ spins, wheelType }) => {
  const [trainWindow, setTrainWindow] = useState<number>(30);

  const baselineRate = wheelType === 'European' ? (18 / 37) * 100 : (18 / 38) * 100;

  // Walk-forward evaluation across session history
  const candidateMethods: CandidateMethodId[] = [
    'frequency',
    'recency',
    'transition',
    'wheel_neighbour',
    'opposite_pocket',
    'sector',
    'bayesian',
  ];

  const evalResults = candidateMethods.map((method) => {
    const hitsSequence: boolean[] = [];
    const walkForwardData: { spinIndex: number; actual: string; hit: boolean; cumulativeHitRate: number }[] = [];

    let totalEvaluated = 0;
    let hitCount = 0;

    for (let i = trainWindow; i < spins.length; i++) {
      const historySlice = spins.slice(0, i);
      const targetSpin = spins[i];

      const snap = generateExperimentalCandidates(historySlice, {
        method,
        minSpinsRequired: trainWindow,
        historyCutoff: trainWindow,
        wheelType,
      });

      if (snap.isSufficientData && snap.selectedNumbers.length === 18) {
        const isHit = snap.selectedNumbers.includes(targetSpin);
        totalEvaluated++;
        if (isHit) hitCount++;
        hitsSequence.push(isHit);

        walkForwardData.push({
          spinIndex: i,
          actual: targetSpin,
          hit: isHit,
          cumulativeHitRate: parseFloat(((hitCount / totalEvaluated) * 100).toFixed(2)),
        });
      }
    }

    const hitRate = totalEvaluated > 0 ? (hitCount / totalEvaluated) * 100 : 0;
    const bootstrapCI = calculateBootstrapProportionCI(hitsSequence, 500, 0.95);

    return {
      method,
      totalEvaluated,
      hitCount,
      hitRate,
      baselineRate,
      diffFromBaseline: hitRate - baselineRate,
      ciLower: bootstrapCI.lowerCI * 100,
      ciUpper: bootstrapCI.upperCI * 100,
      walkForwardData,
    };
  });

  // Chart data for top candidate methods over forward spins
  const maxSpinsCount = spins.length - trainWindow;
  const chartPoints: any[] = [];
  for (let idx = 0; idx < maxSpinsCount; idx++) {
    const pt: any = {
      spinNumber: trainWindow + idx + 1,
      Baseline: parseFloat(baselineRate.toFixed(2)),
    };
    evalResults.forEach((res) => {
      if (res.walkForwardData[idx]) {
        pt[res.method] = res.walkForwardData[idx].cumulativeHitRate;
      }
    });
    chartPoints.push(pt);
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-[#D4AF37]" />
              Statistical Validation &amp; Walk-Forward Performance
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates out-of-sample forward prediction performance against theoretical fair-wheel baseline ({baselineRate.toFixed(2)}%) using bootstrap 95% confidence intervals.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] px-3 py-1.5 rounded-xl border border-[#232D3F] text-xs">
            <span className="text-slate-400">Fair Baseline:</span>
            <span className="font-mono font-bold text-[#D4AF37]">{baselineRate.toFixed(2)}% (18/{wheelType === 'European' ? 37 : 38})</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1 flex justify-between">
            <span>Walk-Forward Training Window Size</span>
            <span className="text-[#D4AF37] font-mono font-bold">{trainWindow} spins</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={trainWindow}
            onChange={(e) => setTrainWindow(Number(e.target.value))}
            className="w-full accent-[#D4AF37]"
          />
        </div>
      </div>

      {/* Main Validation Table */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-200 mb-4">
          Walk-Forward Strategy Performance &amp; Bootstrap 95% Confidence Intervals
        </h3>
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-[#232D3F] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Selection Method</th>
              <th className="py-2.5 px-3 font-mono">Forward Spins</th>
              <th className="py-2.5 px-3 font-mono">18-Num Hits</th>
              <th className="py-2.5 px-3 font-mono">Hit Rate %</th>
              <th className="py-2.5 px-3 font-mono">Fair Baseline %</th>
              <th className="py-2.5 px-3 font-mono">Diff vs Baseline</th>
              <th className="py-2.5 px-3 font-mono">Bootstrap 95% CI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232D3F]/50 text-xs font-mono">
            {evalResults.map((r) => (
              <tr key={r.method} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-100 font-sans capitalize">
                  {r.method.replace('_', ' ')}
                </td>
                <td className="py-2.5 px-3 text-slate-300">{r.totalEvaluated}</td>
                <td className="py-2.5 px-3 text-slate-300">{r.hitCount}</td>
                <td className="py-2.5 px-3 font-bold text-[#D4AF37]">{r.hitRate.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-slate-400">{r.baselineRate.toFixed(2)}%</td>
                <td className="py-2.5 px-3 font-semibold">
                  <span className={r.diffFromBaseline >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {r.diffFromBaseline >= 0 ? '+' : ''}
                    {r.diffFromBaseline.toFixed(2)}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  [{r.ciLower.toFixed(1)}%, {r.ciUpper.toFixed(1)}%]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Walk-Forward Hit Rate Trajectory Chart */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-4">
          Cumulative Out-of-Sample Hit Rate (%) vs Fair Baseline ({baselineRate.toFixed(2)}%)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
              <XAxis dataKey="spinNumber" stroke="#64748B" fontSize={10} />
              <YAxis stroke="#64748B" fontSize={10} domain={[30, 70]} />
              <Tooltip contentStyle={{ backgroundColor: '#080B12', borderColor: '#232D3F', borderRadius: '12px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="Baseline" stroke="#D4AF37" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="frequency" name="Frequency" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="recency" name="Recency" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bayesian" name="Bayesian" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
