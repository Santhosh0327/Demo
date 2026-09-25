import React, { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  DollarSign,
  Play,
  RotateCcw,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { WheelType } from '../../types/roulette';
import { ZeroRule } from '../../utils/categoryLab';
import {
  BettingSystemId,
  MonteCarloSummaryResult,
  runMonteCarloSimulations,
  runSingleSimulation,
  SingleSimulationResult,
  TargetBetType,
} from '../../utils/simulatorLab';

interface Module6Props {
  spins: string[];
  wheelType: WheelType;
}

export const Module6Simulator: React.FC<Module6Props> = ({ spins, wheelType }) => {
  const [simMode, setSimMode] = useState<'actual' | 'monte_carlo'>('actual');
  const [systemId, setSystemId] = useState<BettingSystemId>('martingale');
  const [targetBetType, setTargetBetType] = useState<TargetBetType>('red_black');
  const [targetCategory, setTargetCategory] = useState<string>('Red');

  const [initialBankroll, setInitialBankroll] = useState<number>(1000);
  const [baseUnit, setBaseUnit] = useState<number>(10);
  const [minBet, setMinBet] = useState<number>(1);
  const [maxBet, setMaxBet] = useState<number>(500);
  const [zeroRule, setZeroRule] = useState<ZeroRule>('standard');

  const [mcNumSimulations, setMcNumSimulations] = useState<number>(50);
  const [mcSpinsPerSim, setMcSpinsPerSim] = useState<number>(100);

  const custom18Numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
  const customSectorNumbers = ['22', '18', '29', '7', '28', '12', '35', '3', '26', '0', '32', '15'];

  const simParams = {
    systemId,
    targetBetType,
    initialBankroll,
    baseUnit,
    minBet,
    maxBet,
    wheelType,
    zeroRule,
    targetCategory,
    custom18Numbers,
    customSectorNumbers,
  };

  const actualSimResult: SingleSimulationResult = runSingleSimulation(spins, simParams);
  const mcResult: MonteCarloSummaryResult = runMonteCarloSimulations(
    simParams,
    mcNumSimulations,
    mcSpinsPerSim
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-[#D4AF37]" />
              Virtual Betting-System Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Educational simulation of 12 classic betting strategies, staking progressions, table limits, drawdown metrics, and zero rules.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#080B12] p-1 rounded-xl border border-[#232D3F]">
            <button
              onClick={() => setSimMode('actual')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                simMode === 'actual'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Actual Session History ({spins.length} Spins)
            </button>
            <button
              onClick={() => setSimMode('monte_carlo')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                simMode === 'monte_carlo'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Synthetic Monte Carlo
            </button>
          </div>
        </div>

        {/* Configurable Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Betting Strategy
            </label>
            <select
              value={systemId}
              onChange={(e) => setSystemId(e.target.value as BettingSystemId)}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-100 p-2 font-semibold"
            >
              <option value="flat">1. Flat Betting</option>
              <option value="martingale">2. Martingale System</option>
              <option value="reverse_martingale">3. Reverse Martingale (Paroli)</option>
              <option value="fibonacci">4. Fibonacci Sequence</option>
              <option value="dalembert">5. D'Alembert System</option>
              <option value="reverse_dalembert">6. Reverse D'Alembert</option>
              <option value="labouchere">7. Labouchere System</option>
              <option value="reverse_labouchere">8. Reverse Labouchere</option>
              <option value="oscars_grind">9. Oscar's Grind</option>
              <option value="system_1326">10. 1-3-2-6 System</option>
              <option value="fixed_18_numbers">11. Fixed 18-Number Coverage</option>
              <option value="sector_coverage">12. Wheel Sector Coverage</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Initial Bankroll ($)
            </label>
            <input
              type="number"
              min="100"
              max="50000"
              step="100"
              value={initialBankroll}
              onChange={(e) => setInitialBankroll(Number(e.target.value))}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-100 p-2 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Base Unit ($)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              step="5"
              value={baseUnit}
              onChange={(e) => setBaseUnit(Number(e.target.value))}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-100 p-2 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Max Bet Limit ($)
            </label>
            <input
              type="number"
              min="10"
              max="10000"
              step="50"
              value={maxBet}
              onChange={(e) => setMaxBet(Number(e.target.value))}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-100 p-2 font-mono"
            />
          </div>
        </div>

        {/* Monte Carlo Parameters if in Monte Carlo Mode */}
        {simMode === 'monte_carlo' && (
          <div className="mt-4 pt-4 border-t border-[#232D3F] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex justify-between">
                <span>Number of Monte Carlo Sessions</span>
                <span className="text-[#D4AF37] font-mono">{mcNumSimulations}</span>
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={mcNumSimulations}
                onChange={(e) => setMcNumSimulations(Number(e.target.value))}
                className="w-full accent-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex justify-between">
                <span>Spins per Session</span>
                <span className="text-[#D4AF37] font-mono">{mcSpinsPerSim}</span>
              </label>
              <input
                type="range"
                min="20"
                max="500"
                step="20"
                value={mcSpinsPerSim}
                onChange={(e) => setMcSpinsPerSim(Number(e.target.value))}
                className="w-full accent-[#D4AF37]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Prominent Educational Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-300 block mb-0.5">
            Strict Real-Money Disclaimer &amp; Negative Expectation Notice
          </span>
          <p className="text-amber-200/80 leading-relaxed">
            Never connect these simulations to real-money betting controls. Staking progressions (Martingale, Fibonacci, Labouchere, etc.) cannot mathematically overcome the house edge. Over long sample sizes, expected total return remains strictly negative: $-\frac{1}{37} \approx -2.70\%$ for European roulette.
          </p>
        </div>
      </div>

      {/* Actual History Simulation Results */}
      {simMode === 'actual' ? (
        <div className="space-y-6">
          {/* Performance Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Final Bankroll
              </span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                ${actualSimResult.finalBankroll.toFixed(2)}
              </div>
              <div className="text-xs mt-1 font-semibold flex items-center gap-1">
                {actualSimResult.netReturn >= 0 ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> +${actualSimResult.netReturn.toFixed(2)} ({actualSimResult.roiPercentage.toFixed(1)}% ROI)
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-0.5">
                    <TrendingDown className="h-3.5 w-3.5" /> -${Math.abs(actualSimResult.netReturn).toFixed(2)} ({actualSimResult.roiPercentage.toFixed(1)}% ROI)
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Total Wagered Volume
              </span>
              <div className="text-2xl font-bold font-mono text-[#D4AF37] mt-1">
                ${actualSimResult.totalWagered.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Across {actualSimResult.totalSpins} spins
              </div>
            </div>

            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Maximum Drawdown
              </span>
              <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                ${actualSimResult.maxDrawdownAmount.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {actualSimResult.maxDrawdownPercentage.toFixed(1)}% of peak bankroll
              </div>
            </div>

            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Win Rate %
              </span>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                {actualSimResult.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {actualSimResult.wins} Wins / {actualSimResult.losses} Losses
              </div>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
              <span>Bankroll Equity Curve Trajectory</span>
              <span className="text-xs font-mono text-[#D4AF37]">
                Peak = ${actualSimResult.peakBankroll.toFixed(2)}
              </span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={actualSimResult.equityCurve} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
                  <XAxis dataKey="spinIndex" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#080B12', borderColor: '#232D3F', borderRadius: '12px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="bankroll" name="Bankroll ($)" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#bankrollGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Monte Carlo Summary Results */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Bankrupt Risk Rate (%)
              </span>
              <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                {mcResult.bankruptcyRate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Exhausted $0 in {mcResult.numSimulations} runs
              </div>
            </div>

            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Average Final Bankroll
              </span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                ${mcResult.averageFinalBankroll.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Median: ${mcResult.medianFinalBankroll.toFixed(2)}
              </div>
            </div>

            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Best Case Outcome
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                ${mcResult.bestFinalBankroll.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Worst Case: ${mcResult.worstFinalBankroll.toFixed(2)}
              </div>
            </div>

            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Avg Drawdown %
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {mcResult.averageMaxDrawdownPct.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Across synthetic runs
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
