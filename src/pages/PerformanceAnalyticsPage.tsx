import React from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { computeTrackingMetrics } from '../utils/tracking';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, ShieldCheck, Target, Award, Percent, AlertCircle } from 'lucide-react';

export const PerformanceAnalyticsPage: React.FC = () => {
  const { predictions, wheelType } = useRouletteStore();
  const metrics = computeTrackingMetrics(predictions, wheelType);

  const hasData = metrics.totalPredictions > 0;

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#232D3F] pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#D4AF37]" /> Performance Tracking & Baseline Comparison
          </h2>
          <p className="text-xs text-slate-400">
            Evaluating immutable pre-spin snapshots against actual results vs Fair {wheelType} Wheel Baselines
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Resolved Predictions</span>
            <Target className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-slate-100">{metrics.totalPredictions}</div>
          <div className="text-[10px] text-slate-400">Total verified snapshot spins</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>18 Candidates Hit Rate</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {hasData ? `${metrics.numberHitRate}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {hasData ? (
              <>Observed Hits: <span className="font-bold text-slate-200">{metrics.numberHits}</span> / {metrics.totalPredictions}</>
            ) : (
              <span>No verified predictions yet</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fair Wheel Baseline</span>
            <Percent className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-[#D4AF37]">
            {metrics.numberFairBaseline}%
          </div>
          <div className="text-[10px] text-slate-400">
            Theoretical {wheelType} Baseline (18/{wheelType === 'European' ? 37 : 38})
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Baseline Variance</span>
            <ShieldCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className={`text-2xl font-black ${
            hasData && metrics.numberHitRate >= metrics.numberFairBaseline ? 'text-emerald-400' : 'text-[#D4AF37]'
          }`}>
            {hasData
              ? `${metrics.numberHitRate - metrics.numberFairBaseline > 0 ? '+' : ''}${(metrics.numberHitRate - metrics.numberFairBaseline).toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {hasData ? 'Empirical difference' : 'Awaiting spin resolution'}
          </div>
        </div>
      </div>

      {/* Cumulative Accuracy Line Chart */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100">
          Cumulative Hit Rate (%) vs Fair Wheel Baseline Timeline
        </h3>
        {!hasData ? (
          <div className="py-12 text-center space-y-2 bg-[#080B12] rounded-xl border border-[#232D3F]">
            <AlertCircle className="h-6 w-6 text-slate-500 mx-auto" />
            <p className="text-xs italic text-slate-400">
              No resolved prediction snapshots yet. Log spins after pre-spin candidate snapshots are generated to track accuracy.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={metrics.performanceHistory} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="spinIndex" stroke="#64748B" fontSize={10} tickLine={false} label={{ value: 'Spin Sequence', position: 'insideBottom', offset: -5, fill: '#64748B', fontSize: 10 }} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#10151F', borderColor: '#232D3F', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="cumulativeHitRate"
                  name="Observed 18-Candidate Hit Rate (%)"
                  stroke="#D4AF37"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#D4AF37' }}
                />
                <Line
                  type="monotone"
                  dataKey="baselineRate"
                  name={`Fair ${wheelType} Baseline (${metrics.numberFairBaseline}%)`}
                  stroke="#64748B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Performance Breakdown Grid */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100">
          Category Forecast Performance Breakdown
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#080B12] p-4 rounded-xl border border-[#232D3F] space-y-1">
            <span className="text-xs text-slate-400">Red / Black</span>
            <div className="text-xl font-extrabold text-[#D4AF37]">
              {hasData ? `${metrics.categoryMetrics.redBlack.rate}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500">
              Hits: {metrics.categoryMetrics.redBlack.hits} / {metrics.categoryMetrics.redBlack.total} (Baseline: {metrics.categoryMetrics.redBlack.baseline}%)
            </div>
          </div>

          <div className="bg-[#080B12] p-4 rounded-xl border border-[#232D3F] space-y-1">
            <span className="text-xs text-slate-400">Dozens (1st/2nd/3rd)</span>
            <div className="text-xl font-extrabold text-[#D4AF37]">
              {hasData ? `${metrics.categoryMetrics.dozen.rate}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500">
              Hits: {metrics.categoryMetrics.dozen.hits} / {metrics.categoryMetrics.dozen.total} (Baseline: {metrics.categoryMetrics.dozen.baseline}%)
            </div>
          </div>

          <div className="bg-[#080B12] p-4 rounded-xl border border-[#232D3F] space-y-1">
            <span className="text-xs text-slate-400">Columns (1st/2nd/3rd)</span>
            <div className="text-xl font-extrabold text-[#D4AF37]">
              {hasData ? `${metrics.categoryMetrics.column.rate}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500">
              Hits: {metrics.categoryMetrics.column.hits} / {metrics.categoryMetrics.column.total} (Baseline: {metrics.categoryMetrics.column.baseline}%)
            </div>
          </div>

          <div className="bg-[#080B12] p-4 rounded-xl border border-[#232D3F] space-y-1">
            <span className="text-xs text-slate-400">Odd / Even</span>
            <div className="text-xl font-extrabold text-[#D4AF37]">
              {hasData ? `${metrics.categoryMetrics.oddEven.rate}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500">
              Hits: {metrics.categoryMetrics.oddEven.hits} / {metrics.categoryMetrics.oddEven.total} (Baseline: {metrics.categoryMetrics.oddEven.baseline}%)
            </div>
          </div>

          <div className="bg-[#080B12] p-4 rounded-xl border border-[#232D3F] space-y-1">
            <span className="text-xs text-slate-400">High / Low</span>
            <div className="text-xl font-extrabold text-[#D4AF37]">
              {hasData ? `${metrics.categoryMetrics.highLow.rate}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500">
              Hits: {metrics.categoryMetrics.highLow.hits} / {metrics.categoryMetrics.highLow.total} (Baseline: {metrics.categoryMetrics.highLow.baseline}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
