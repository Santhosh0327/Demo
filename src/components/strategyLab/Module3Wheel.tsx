import React, { useState } from 'react';
import { AlertTriangle, Compass, Disc, Info, Target, Zap } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { WheelType } from '../../types/roulette';
import { getWheelSequence } from '../../utils/rouletteRules';
import {
  calculateCircularKDE,
  calculateCircularStats,
  calculateConsecutiveWheelDistanceDistribution,
  calculateSectorAnalysis,
  getExactOppositePockets,
  getWheelDistance,
} from '../../utils/wheelLab';

interface Module3Props {
  spins: string[];
  wheelType: WheelType;
}

export const Module3Wheel: React.FC<Module3Props> = ({ spins, wheelType }) => {
  const [sampleWindow, setSampleWindow] = useState<number>(150);
  const [kdeKappa, setKdeKappa] = useState<number>(4.0);

  const activeSpins = spins.slice(-sampleWindow);
  const totalSpins = activeSpins.length;
  const seq = getWheelSequence(wheelType);

  // Circular Stats & Rayleigh Test
  const circularStats = calculateCircularStats(activeSpins, wheelType);

  // Sector Analysis
  const sectorAnalysis = calculateSectorAnalysis(activeSpins, wheelType);

  // Distance Distribution
  const distDistribution = calculateConsecutiveWheelDistanceDistribution(activeSpins, wheelType);

  // Circular KDE
  const kdeData = calculateCircularKDE(activeSpins, wheelType, kdeKappa);

  // Last spin opposite pockets
  const lastSpin = activeSpins.length > 0 ? activeSpins[activeSpins.length - 1] : '0';
  const oppositePockets = getExactOppositePockets(lastSpin, wheelType);

  // Format distance chart data
  const distChartData = Object.entries(distDistribution.distances).map(([d, count]) => ({
    distance: `Dist ${d}`,
    pocketDistance: Number(d),
    Count: count,
  }));

  // Radar chart data for sector concentration
  const radarData = sectorAnalysis.map((sec) => ({
    sector: sec.name.split(' (')[0],
    ObservedPct: parseFloat(sec.observedPercentage.toFixed(1)),
    ExpectedPct: parseFloat(sec.expectedPercentage.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#D4AF37]" />
              Physical Wheel Mathematics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Circular statistics, Rayleigh uniformity testing, pocket distance distributions, von Mises KDE, and sector bias diagnostics.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] px-3 py-1.5 rounded-xl border border-[#232D3F] text-xs">
            <span className="text-slate-400">Wheel Order:</span>
            <span className="font-mono font-bold text-[#D4AF37]">{wheelType} Roulette ({seq.length} Pockets)</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>Sample Window (Spins)</span>
              <span className="text-[#D4AF37] font-mono font-bold">{sampleWindow}</span>
            </label>
            <input
              type="range"
              min="30"
              max="500"
              step="10"
              value={sampleWindow}
              onChange={(e) => setSampleWindow(Number(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>von Mises KDE Bandwidth (&kappa;)</span>
              <span className="text-[#D4AF37] font-mono font-bold">{kdeKappa}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={kdeKappa}
              onChange={(e) => setKdeKappa(Number(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>
        </div>
      </div>

      {/* Wheel Bias Sample Size Warning (N < 300) */}
      {totalSpins < 300 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-300 block mb-0.5">
              Wheel Bias Exploration Warning (N = {totalSpins} / Minimum N = 300)
            </span>
            <p className="text-amber-200/80 leading-relaxed">
              Physical wheel bias testing requires large sample sizes ($N \ge 300$) to distinguish true mechanical asymmetry from expected random variance. Observed sector deviations in short sessions are exploratory only.
            </p>
          </div>
        </div>
      )}

      {/* Circular Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Resultant Vector R */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Resultant Length Vector (R)
          </span>
          <div className="text-2xl font-bold font-mono text-[#D4AF37] mt-1">
            {circularStats.resultantLengthR.toFixed(4)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            0.0 = perfectly uniform, 1.0 = clustered
          </div>
        </div>

        {/* Circular Mean Angle */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Circular Mean Direction
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {circularStats.meanAngleDeg.toFixed(1)}&deg;
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Mean Pocket:</span>
            <span className="font-bold text-[#D4AF37]">{circularStats.meanPocketNumber}</span>
          </div>
        </div>

        {/* Rayleigh Test Z */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Rayleigh Uniformity (Z)
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {circularStats.rayleighZ.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            p = {circularStats.rayleighPValue.toFixed(4)}
          </div>
        </div>

        {/* Last Spin Opposite Pockets */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Opposite Pocket Pair ({lastSpin})
          </span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1 flex items-center gap-1">
            {oppositePockets.join(' & ')}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {wheelType === 'European' ? '2-pocket opposite definition' : 'Exact opposite pocket'}
          </div>
        </div>
      </div>

      {/* Charts Section: Sector Concentration Radar & Consecutive Distance Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart for Sector Concentration */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-[#D4AF37]" />
            Wheel Sector Concentration (Observed vs Expected)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#232D3F" />
                <PolarAngleAxis dataKey="sector" stroke="#94A3B8" fontSize={10} />
                <PolarRadiusAxis stroke="#64748B" fontSize={10} />
                <Radar name="Observed %" dataKey="ObservedPct" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                <Radar name="Expected %" dataKey="ExpectedPct" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#080B12', borderColor: '#232D3F', borderRadius: '12px', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consecutive Spin Wheel Pocket Distance Distribution */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#D4AF37]" />
            Consecutive Spin Pocket Distance Distribution
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
                <XAxis dataKey="distance" stroke="#64748B" fontSize={10} interval={1} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#080B12', borderColor: '#232D3F', borderRadius: '12px', fontSize: '11px' }} />
                <Bar dataKey="Count" name="Spin Transitions" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* von Mises Circular Kernel Density Estimation Plot */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Circular von Mises Kernel Density Estimation (KDE)</span>
          <span className="text-xs font-mono text-[#D4AF37]">&kappa; = {kdeKappa}</span>
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kdeData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
              <XAxis dataKey="pocket" stroke="#64748B" fontSize={10} interval={0} />
              <YAxis stroke="#64748B" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#080B12', borderColor: '#232D3F', borderRadius: '12px', fontSize: '11px' }} />
              <Line type="monotone" dataKey="normalizedDensity" name="Normalized Density" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
