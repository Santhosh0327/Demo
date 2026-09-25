import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  applyMultipleTestingCorrection,
  AutocorrelationResult,
  calculateAutocorrelation,
  calculateBayesianSmoothedProbabilities,
  calculateChiSquareTest,
  calculateRunsTest,
  calculateShannonEntropy,
} from '../../utils/mathLab';
import { getAllWheelNumbers, getPocketColor } from '../../utils/rouletteRules';

interface Module1Props {
  spins: string[];
  wheelType: WheelType;
}

export const Module1Probability: React.FC<Module1Props> = ({ spins, wheelType }) => {
  const [sampleWindow, setSampleWindow] = useState<number>(100);
  const [alphaPrior, setAlphaPrior] = useState<number>(1.0);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);

  const activeSpins = spins.slice(-sampleWindow);
  const totalSpins = activeSpins.length;
  const allNumbers = getAllWheelNumbers(wheelType);
  const K = allNumbers.length;

  // Frequencies
  const frequencies: Record<string, number> = {};
  allNumbers.forEach((n) => (frequencies[n] = 0));
  activeSpins.forEach((n) => {
    if (frequencies[n] !== undefined) frequencies[n]++;
  });

  // Chi-Square Test
  const chiSquareRes = calculateChiSquareTest(frequencies, wheelType, totalSpins);

  // Shannon Entropy
  const entropyRes = calculateShannonEntropy(frequencies, wheelType, totalSpins);

  // Bayesian Dirichlet Smoothing
  const bayesianRes = calculateBayesianSmoothedProbabilities(
    frequencies,
    wheelType,
    totalSpins,
    alphaPrior
  );

  // Runs Test on Red/Black binary sequence
  const redBlackSequence: (0 | 1)[] = activeSpins
    .filter((n) => getPocketColor(n) !== 'green')
    .map((n) => (getPocketColor(n) === 'red' ? 1 : 0));
  const runsRes = calculateRunsTest(redBlackSequence);

  // Autocorrelation at Lags 1..10
  const numericSeries = activeSpins.map((n) => {
    if (n === '0') return 0;
    if (n === '00') return 37;
    return parseInt(n, 10);
  });
  const autocorrRes = calculateAutocorrelation(numericSeries, 10);

  // Multiple testing correction (FDR & Bonferroni) on pocket deviations
  const rawDeviations = allNumbers.map((num) => {
    const obs = frequencies[num] || 0;
    const exp = totalSpins / K;
    const diff = Math.abs(obs - exp);
    // Simple 1-DOF chi-square approx for raw p-value
    const chi1 = exp > 0 ? (diff * diff) / exp : 0;
    const pVal = Math.exp(-0.5 * chi1);
    return { id: num, rawPValue: Math.min(1, Math.max(0.0001, pVal)) };
  });
  const fdrRes = applyMultipleTestingCorrection(rawDeviations, 0.05);

  // Chart data: Frequency vs Expected
  const chartData = allNumbers.map((num) => {
    const obs = frequencies[num] || 0;
    const exp = totalSpins / K;
    const bayes = bayesianRes[num].posteriorProbability * totalSpins;
    return {
      number: num,
      Observed: obs,
      Expected: parseFloat(exp.toFixed(2)),
      BayesianPosterior: parseFloat(bayes.toFixed(2)),
      color: getPocketColor(num) === 'red' ? '#EF4444' : getPocketColor(num) === 'black' ? '#1E293B' : '#10B981',
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Card */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#232D3F] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-[#D4AF37]" />
              Probability & Distribution Analysis
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Rigorous goodness-of-fit tests, Shannon entropy, Bayesian Dirichlet smoothing, runs test, and multiple-testing corrections.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] px-3 py-1.5 rounded-xl border border-[#232D3F] text-xs">
            <span className="text-slate-400">Sample Size N:</span>
            <span className="font-mono font-bold text-[#D4AF37]">{totalSpins} spins</span>
          </div>
        </div>

        {/* Configurable Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>Bayesian Dirichlet Prior (&alpha;)</span>
              <span className="text-[#D4AF37] font-mono font-bold">{alphaPrior}</span>
            </label>
            <select
              value={alphaPrior}
              onChange={(e) => setAlphaPrior(Number(e.target.value))}
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-lg text-xs text-slate-200 p-2 font-mono"
            >
              <option value="1.0">1.0 (Laplace Uniform Prior)</option>
              <option value="0.5">0.5 (Jeffreys Prior)</option>
              <option value={parseFloat((1 / K).toFixed(4))}>
                {`1/${K}`} (Perks Non-informative Prior)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Confidence Interval Level
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#080B12] p-1 rounded-lg border border-[#232D3F]">
              {[0.90, 0.95, 0.99].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setConfidenceLevel(lvl)}
                  className={`py-1 text-xs rounded font-mono font-semibold transition-colors ${
                    confidenceLevel === lvl
                      ? 'bg-[#D4AF37] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {(lvl * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insufficient Sample Warning if N < 185 */}
      {!chiSquareRes.isSufficientSample && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-300 block mb-0.5">
              Sample Size Notice (N = {totalSpins} / Recommended Min N = {chiSquareRes.minRequiredSample})
            </span>
            <p className="text-amber-200/80 leading-relaxed">
              Standard Chi-Square goodness-of-fit test requires an expected count $E_i \ge 5$ per pocket (N &ge; {chiSquareRes.minRequiredSample} for {wheelType} roulette). Statistical significance claims are suppressed when sample size requirements are not met.
            </p>
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Chi-Square Metric */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Chi-Square (&chi;&sup2;)
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {chiSquareRes.chiSquare.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>df = {chiSquareRes.degreesOfFreedom}</span>
            <span>p = {chiSquareRes.pValue.toFixed(4)}</span>
          </div>
          <div className="mt-2 text-[10px]">
            {chiSquareRes.isStatisticallySignificant ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Significant Deviation (p &lt; 0.05)
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Uniform Distribution (p &ge; 0.05)
              </span>
            )}
          </div>
        </div>

        {/* Shannon Entropy */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Shannon Entropy H(X)
          </span>
          <div className="text-2xl font-bold font-mono text-[#D4AF37] mt-1">
            {entropyRes.shannonEntropy.toFixed(3)}{' '}
            <span className="text-xs text-slate-400 font-sans">bits</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Max H = {entropyRes.maxPossibleEntropy.toFixed(3)}</span>
            <span>{entropyRes.uniformityPercentage.toFixed(1)}% Uniform</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5">
            <div
              className="bg-[#D4AF37] h-1.5 rounded-full"
              style={{ width: `${entropyRes.uniformityPercentage}%` }}
            />
          </div>
        </div>

        {/* Runs Test */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Wald-Wolfowitz Runs Test
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {runsRes.observedRuns}{' '}
            <span className="text-xs text-slate-400 font-sans">runs</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Exp = {runsRes.expectedRuns.toFixed(1)}</span>
            <span>Z = {runsRes.zScore.toFixed(2)}</span>
          </div>
          <div className="mt-2 text-[10px]">
            {runsRes.isIndependentAtAlpha05 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Independent Sequence
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Non-Random Clustering
              </span>
            )}
          </div>
        </div>

        {/* FDR Multiple Testing */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            FDR Significant Pockets
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {fdrRes.filter((r) => r.isSignificantFDR).length}{' '}
            <span className="text-xs text-slate-400 font-sans">/ {K}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Benjamini-Hochberg Q=0.05</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Prevents false positives across {K} simultaneous hypothesis tests.
          </div>
        </div>
      </div>

      {/* Main Visualization: Frequency vs Theoretical Expected */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Observed Pocket Frequencies vs Theoretical Fair Baseline</span>
          <span className="text-xs font-mono text-[#D4AF37]">
            Expected = {(totalSpins / K).toFixed(2)} hits / pocket
          </span>
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
              <XAxis
                dataKey="number"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                interval={0}
              />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#080B12',
                  borderColor: '#232D3F',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Observed" name="Observed Hits" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expected" name="Theoretical Fair Expected" fill="#D4AF37" opacity={0.5} radius={[4, 4, 0, 0]} />
              <Bar dataKey="BayesianPosterior" name="Bayesian Posterior Mean" fill="#8B5CF6" opacity={0.4} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Autocorrelation Chart & Mathematical Methodology Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Autocorrelation Plot */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
            Serial Autocorrelation (Lags 1 to 10)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Tests whether previous spin values linearly correlate with subsequent spins (Ljung-Box independence baseline).
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={autocorrRes} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
                <XAxis dataKey="lag" stroke="#64748B" fontSize={10} label={{ value: 'Lag k', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 10 }} />
                <YAxis stroke="#64748B" fontSize={10} domain={[-0.5, 0.5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#080B12',
                    borderColor: '#232D3F',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="autocorrelation" name="Autocorrelation r_k" fill="#10B981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calculation & Methodology Explanation */}
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#D4AF37]" />
            Mathematical Methodology & Limitations
          </h3>
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
              <p className="font-mono text-[11px] text-[#D4AF37] my-1 font-semibold">
                &chi;&sup2; = &Sigma; (O_i - E_i)&sup2; / E_i, df = K - 1
              </p>
              Evaluates deviation from uniform distribution E_i = N/K.
            </div>
            <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
              <span className="font-bold text-[#D4AF37] block mb-0.5">Bayesian Dirichlet-Multinomial</span>
              <p className="font-mono text-[11px] text-[#D4AF37] my-1 font-semibold">
                p_i = (O_i + &alpha;_i) / (N + &Sigma;&alpha;_k)
              </p>
              Prevents zero-frequency overfitting by smoothing raw counts with prior $\alpha$.
            </div>
            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 text-amber-200">
              <span className="font-bold text-amber-300 block mb-0.5">Important Disclaimer</span>
              Fair roulette spins are independent under standard physics. Statistical complexity and historical associations do not establish next-spin predictability or overcome the house edge.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
