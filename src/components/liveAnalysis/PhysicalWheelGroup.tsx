import React, { useState } from 'react';
import { WheelType } from '../../types/roulette';
import {
  CircularStatsResult,
  SectorAnalysisResult,
  WheelDistanceDistribution,
} from '../../utils/wheelLab';
import { getWheelSequence, getWheelNeighbours } from '../../utils/rouletteRules';
import { getExactOppositePockets } from '../../utils/wheelLab';
import { SpinChip } from '../common/SpinChip';
import { Compass, Disc, ChevronDown, ChevronUp, PieChart, Activity } from 'lucide-react';

interface PhysicalWheelGroupProps {
  spins: string[];
  wheelType: WheelType;
  circularStats: CircularStatsResult;
  wheelDistances: WheelDistanceDistribution;
  circularKDE: { pocket: string; index: number; density: number; normalizedDensity: number }[];
  sectorAnalysis: SectorAnalysisResult[];
}

export const PhysicalWheelGroup: React.FC<PhysicalWheelGroupProps> = ({
  spins,
  wheelType,
  circularStats,
  wheelDistances,
  circularKDE,
  sectorAnalysis,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'track' | 'neighbours' | 'sectors' | 'circular'>('track');

  const seq = getWheelSequence(wheelType);
  const lastSpin = spins[spins.length - 1];

  const neighbours = lastSpin ? getWheelNeighbours(lastSpin, wheelType, 4) : [];
  const oppositePockets = lastSpin ? getExactOppositePockets(lastSpin, wheelType) : [];

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              2. Physical Wheel Analysis Module
            </h3>
            <p className="text-[11px] text-slate-400">
              Wheel Order Track, Pocket Neighbours, Opposite Pockets, Sector Concentration & von Mises KDE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {wheelType} Sequence
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5">
          {/* Sub-tabs */}
          <div className="flex border-b border-[#232D3F] gap-2 pb-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('track')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'track' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="h-3.5 w-3.5" /> Wheel Track
            </button>
            <button
              onClick={() => setActiveTab('neighbours')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'neighbours' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="h-3.5 w-3.5" /> Neighbours & Opposites
            </button>
            <button
              onClick={() => setActiveTab('sectors')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'sectors' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieChart className="h-3.5 w-3.5" /> Wheel Sectors
            </button>
            <button
              onClick={() => setActiveTab('circular')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'circular' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" /> Circular KDE & Rayleigh Z
            </button>
          </div>

          {/* Sub-tab 1: Wheel Order Track */}
          {activeTab === 'track' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Exact physical pocket sequence for <strong className="text-slate-200">{wheelType} Roulette</strong> wheel:
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
                {seq.map((num, idx) => {
                  const isLast = num === lastSpin;
                  return (
                    <div
                      key={num}
                      className={`flex flex-col items-center p-1.5 rounded-xl border min-w-[42px] ${
                        isLast
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] scale-110 shadow-lg'
                          : 'bg-[#161D29] border-[#232D3F]'
                      }`}
                    >
                      <SpinChip number={num} size="sm" />
                      <span className="text-[9px] text-slate-400 mt-1 font-mono">#{idx}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Neighbours & Opposites */}
          {activeTab === 'neighbours' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">
                  Wheel Neighbours (Last Win: {lastSpin || 'N/A'})
                </span>
                {lastSpin ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {neighbours.map((n) => (
                      <SpinChip key={n} number={n} size="md" />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No spins logged yet.</p>
                )}
              </div>

              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">
                  Exact Opposite Pockets (Last Win: {lastSpin || 'N/A'})
                </span>
                {lastSpin ? (
                  <div className="flex items-center gap-2">
                    {oppositePockets.map((n) => (
                      <SpinChip key={n} number={n} size="md" />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No spins logged yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 3: Wheel Sectors */}
          {activeTab === 'sectors' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {sectorAnalysis.map((sec) => (
                <div key={sec.sectorId} className="rounded-xl bg-[#161D29] border border-[#232D3F] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{sec.name}</span>
                    <span className="text-[10px] text-slate-400">{sec.pocketCount} pockets</span>
                  </div>
                  <div className="text-lg font-black text-amber-300">
                    {sec.observedHits} hits ({sec.observedPercentage.toFixed(1)}%)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Expected: {sec.expectedHits.toFixed(1)} hits ({sec.expectedPercentage.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-tab 4: Circular KDE & Rayleigh Z */}
          {activeTab === 'circular' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-3 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Mean Direction Angle</span>
                <span className="text-lg font-black text-amber-300">
                  {circularStats.meanAngleDeg.toFixed(1)}&deg; (Pocket {circularStats.meanPocketNumber})
                </span>
              </div>

              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-3 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Resultant Length R</span>
                <span className="text-lg font-black text-emerald-400">
                  {circularStats.resultantLengthR.toFixed(4)}
                </span>
              </div>

              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-3 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Rayleigh Z p-value</span>
                <span className="text-lg font-black text-purple-400">
                  {circularStats.rayleighPValue.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
