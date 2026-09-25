import React, { useState } from 'react';
import {
  Award,
  Banknote,
  BarChart2,
  Compass,
  Cpu,
  FlaskConical,
  History,
  Info,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Module1Probability } from '../components/strategyLab/Module1Probability';
import { Module2Sequence } from '../components/strategyLab/Module2Sequence';
import { Module3Wheel } from '../components/strategyLab/Module3Wheel';
import { Module4Category } from '../components/strategyLab/Module4Category';
import { Module5CandidateEngine } from '../components/strategyLab/Module5CandidateEngine';
import { Module6Simulator } from '../components/strategyLab/Module6Simulator';
import { Module7Validation } from '../components/strategyLab/Module7Validation';
import { useRouletteStore } from '../store/useRouletteStore';

export type LabTabId =
  | 'probability'
  | 'sequence'
  | 'wheel'
  | 'category'
  | 'candidate_engine'
  | 'simulator'
  | 'validation';

export const StrategyLabPage: React.FC = () => {
  const { spins, wheelType, activeSessionId } = useRouletteStore();
  const [activeTab, setActiveTab] = useState<LabTabId>('probability');

  const spinNumbers = spins.map((s) => s.number);

  const tabs = [
    { id: 'probability', label: '1. Probability & Stats', icon: BarChart2 },
    { id: 'sequence', label: '2. Sequence Analysis', icon: History },
    { id: 'wheel', label: '3. Wheel Math', icon: Compass },
    { id: 'category', label: '4. Category Math', icon: Layers },
    { id: 'candidate_engine', label: '5. 18-Number Engine', icon: Cpu },
    { id: 'simulator', label: '6. Strategy Simulator', icon: Banknote },
    { id: 'validation', label: '7. Validation & Baseline', icon: Award },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-100 tracking-wide">
                  GLOBAL MATHEMATICAL STRATEGY LAB
                </h1>
                <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/30 uppercase font-mono">
                  PRO INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Modular roulette analysis laboratory. Evaluates goodness-of-fit distributions, circular physical wheel mechanics, 18-number selection engines, and 12 virtual betting systems using confirmed actual session history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-[#080B12] p-3 rounded-xl border border-[#232D3F] text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Active Wheel</span>
              <span className="font-mono font-bold text-slate-200">{wheelType} Roulette</span>
            </div>
            <div className="h-6 w-[1px] bg-[#232D3F]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Confirmed History</span>
              <span className="font-mono font-bold text-[#D4AF37]">{spins.length} Spins</span>
            </div>
          </div>
        </div>

        {/* Global Math Disclaimer Bar */}
        <div className="mt-4 pt-3 border-t border-[#232D3F]/60 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-300">Data Integrity Guaranteed:</strong> Only confirmed actual session spins are evaluated in live history. Monte Carlo simulations are strictly isolated in separate baseline datasets.
          </span>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#232D3F]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LabTabId)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border-b-2 ${
                isActive
                  ? 'bg-[#10151F] text-[#D4AF37] border-[#D4AF37] shadow-lg font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Render */}
      <div className="mt-6">
        {activeTab === 'probability' && (
          <Module1Probability spins={spinNumbers} wheelType={wheelType} />
        )}
        {activeTab === 'sequence' && (
          <Module2Sequence spins={spinNumbers} wheelType={wheelType} />
        )}
        {activeTab === 'wheel' && (
          <Module3Wheel spins={spinNumbers} wheelType={wheelType} />
        )}
        {activeTab === 'category' && (
          <Module4Category spins={spinNumbers} wheelType={wheelType} />
        )}
        {activeTab === 'candidate_engine' && (
          <Module5CandidateEngine
            spins={spinNumbers}
            wheelType={wheelType}
            sessionId={activeSessionId || 'main'}
          />
        )}
        {activeTab === 'simulator' && (
          <Module6Simulator spins={spinNumbers} wheelType={wheelType} />
        )}
        {activeTab === 'validation' && (
          <Module7Validation spins={spinNumbers} wheelType={wheelType} />
        )}
      </div>
    </div>
  );
};

export default StrategyLabPage;
