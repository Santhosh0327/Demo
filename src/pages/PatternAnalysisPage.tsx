import React from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { calculateStatistics } from '../utils/statistics';
import { SpinChip } from '../components/common/SpinChip';
import { getAllWheelNumbers, getPocketColor } from '../utils/rouletteRules';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Flame, Snowflake, RefreshCw, Layers, Zap } from 'lucide-react';

export const PatternAnalysisPage: React.FC = () => {
  const { spins, wheelType, windowSize } = useRouletteStore();
  const stats = calculateStatistics(spins, wheelType, windowSize);
  const allNumbers = getAllWheelNumbers(wheelType);

  const freqChartData = allNumbers.map((num) => ({
    number: num,
    frequency: stats.frequencies[num] || 0,
    color: getPocketColor(num),
  }));

  const lastSpinTransitions = stats.lastSpin && stats.transitions[stats.lastSpin]
    ? Object.entries(stats.transitions[stats.lastSpin]).map(([num, count]) => ({
        number: num,
        count,
      }))
    : [];

  const hasSpins = spins.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#232D3F] pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#D4AF37]" /> Pattern & Statistical Analysis
          </h2>
          <p className="text-xs text-slate-400">
            Rolling window of latest {windowSize} spins (Active Session)
          </p>
        </div>
      </div>

      {/* Hot & Cold Numbers Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hot Numbers */}
        <div className="rounded-2xl border border-rose-500/20 bg-[#161D29] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" /> Hot Numbers (Top 5 Frequent)
            </h3>
            <span className="text-xs text-slate-400">Most frequent in window</span>
          </div>
          {!hasSpins ? (
            <p className="text-xs italic text-slate-500 py-4">No spins logged yet</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {stats.hotNumbers.map((item) => (
                <div key={item.number} className="flex items-center gap-3 bg-[#080B12] p-3 rounded-xl border border-[#232D3F]">
                  <SpinChip number={item.number} size="md" />
                  <div>
                    <div className="text-xs font-black text-[#D4AF37]">{item.count} Hits</div>
                    <div className="text-[10px] text-slate-400">{Math.round(item.percentage)}% Window Share</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cold Numbers */}
        <div className="rounded-2xl border border-sky-500/20 bg-[#161D29] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-sky-400" /> Cold Numbers (Top 5 Due / Absent)
            </h3>
            <span className="text-xs text-slate-400">Longest absent in window</span>
          </div>
          {!hasSpins ? (
            <p className="text-xs italic text-slate-500 py-4">No spins logged yet</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {stats.coldNumbers.map((item) => (
                <div key={item.number} className="flex items-center gap-3 bg-[#080B12] p-3 rounded-xl border border-[#232D3F]">
                  <SpinChip number={item.number} size="md" />
                  <div>
                    <div className="text-xs font-black text-sky-400">
                      {item.lastSeenAgo === 999 ? 'Absent > 50' : `${item.lastSeenAgo} Spins Ago`}
                    </div>
                    <div className="text-[10px] text-slate-400">{item.count} Total Hits</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Streaks & Repeated Sequences Card */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#D4AF37]" /> Streaks & Repeated Sequence Patterns
        </h3>

        {!hasSpins ? (
          <p className="text-xs italic text-slate-500 py-2">No spins logged yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#080B12] p-3.5 rounded-xl border border-[#232D3F] space-y-1">
              <span className="text-slate-400">Max Red Streak</span>
              <div className="text-lg font-black text-red-500">{stats.streaks.maxRedStreak} Consecutive</div>
            </div>
            <div className="bg-[#080B12] p-3.5 rounded-xl border border-[#232D3F] space-y-1">
              <span className="text-slate-400">Max Black Streak</span>
              <div className="text-lg font-black text-slate-300">{stats.streaks.maxBlackStreak} Consecutive</div>
            </div>
            <div className="bg-[#080B12] p-3.5 rounded-xl border border-[#232D3F] space-y-1">
              <span className="text-slate-400">Max Odd Streak</span>
              <div className="text-lg font-black text-amber-400">{stats.streaks.maxOddStreak} Consecutive</div>
            </div>
            <div className="bg-[#080B12] p-3.5 rounded-xl border border-[#232D3F] space-y-1">
              <span className="text-slate-400">Max Even Streak</span>
              <div className="text-lg font-black text-sky-400">{stats.streaks.maxEvenStreak} Consecutive</div>
            </div>
          </div>
        )}
      </div>

      {/* Frequency Distribution Recharts Bar Chart */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100">
          Wheel Number Frequency Distribution (0, 00, 1–36)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={freqChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="number" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#10151F', borderColor: '#232D3F', borderRadius: '12px' }}
                itemStyle={{ color: '#D4AF37', fontSize: '12px' }}
              />
              <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                {freqChartData.map((entry, index) => {
                  let fillColor = '#1E293B';
                  if (entry.color === 'red') fillColor = '#DC2626';
                  if (entry.color === 'green') fillColor = '#15803D';
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Transitions Matrix & Physical Opposite Pockets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Historical Transitions */}
        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-400" /> Historical Transitions after Spin {stats.lastSpin || 'N/A'}
          </h3>
          <p className="text-xs text-slate-400">
            Numbers that historically landed immediately after last spin ({stats.lastSpin || 'N/A'})
          </p>

          <div className="flex flex-wrap gap-3">
            {lastSpinTransitions.length === 0 ? (
              <span className="text-xs italic text-slate-500">
                No historical transitions recorded after spin {stats.lastSpin || 'N/A'} yet
              </span>
            ) : (
              lastSpinTransitions.map((t) => (
                <div key={t.number} className="flex items-center gap-2 bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <SpinChip number={t.number} size="sm" />
                  <span className="text-xs font-bold text-amber-400">{t.count}x Times</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Physical Opposite Pockets */}
        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100">
            Physical Opposite Pocket Hits (Offsets 18/19)
          </h3>
          <p className="text-xs text-slate-400">
            Spins that landed in exact physical opposite pockets of preceding spin
          </p>

          <div className="flex flex-wrap gap-3">
            {stats.oppositePocketHits.length === 0 ? (
              <span className="text-xs italic text-slate-500">
                No opposite pocket consecutive transitions recorded yet
              </span>
            ) : (
              stats.oppositePocketHits.map((opp, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <SpinChip number={opp.target} size="sm" />
                  <span className="text-xs text-slate-500">→</span>
                  <SpinChip number={opp.opposite} size="sm" />
                  <span className="text-xs font-bold text-rose-400">({opp.count}x)</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
