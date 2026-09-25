import React, { useState } from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import {
  formatCurrency,
  formatCurrencyNeutral,
  calculateCoveredReturn,
  isPnlConfigured,
  CURRENCY_SYMBOLS,
} from '../../utils/pnlCalculator';
import { EvaluationTargetFilter, PayoutFormat, PnlConfig } from '../../types/roulette';
import { getPocketColor } from '../../utils/rouletteRules';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const FILTER_LABELS: Record<EvaluationTargetFilter, string> = {
  top18: 'Top 18 Shortlist',
  all: 'All Union Pockets',
  min2: '≥ 2 Theories',
  min4: '≥ 4 Theories',
  all_applicable: 'All Applicable Theories',
};

export const PnlDashboardPanel: React.FC = () => {
  const {
    pnlConfig,
    updatePnlConfig,
    latestSnapshot,
    performanceStats,
    evaluationTargetFilter,
  } = useRouletteStore();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form string states for financial configuration
  const [formGameName, setFormGameName] = useState<string>(pnlConfig.gameName || '');
  const [formCurrency, setFormCurrency] = useState<string>(pnlConfig.currency || 'INR');
  const [formBankroll, setFormBankroll] = useState<string>(
    pnlConfig.startingBankroll !== undefined ? String(pnlConfig.startingBankroll) : ''
  );
  const [formPayoutFormat, setFormPayoutFormat] = useState<PayoutFormat>(
    pnlConfig.payoutFormat || 'total_return'
  );
  const [formPayoutValue, setFormPayoutValue] = useState<string>(
    pnlConfig.payoutValue !== undefined ? String(pnlConfig.payoutValue) : ''
  );
  const [formStakePerNumber, setFormStakePerNumber] = useState<string>(
    pnlConfig.stakePerNumber !== undefined ? String(pnlConfig.stakePerNumber) : ''
  );
  const [formTotalBudget, setFormTotalBudget] = useState<string>(
    pnlConfig.totalStakeBudget !== undefined ? String(pnlConfig.totalStakeBudget) : ''
  );

  const configured = isPnlConfigured(pnlConfig);
  const activePnlData = latestSnapshot?.pnlData;
  const pnlSummary = performanceStats.pnlSummary;

  const currency = pnlConfig.currency || 'INR';
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const activeFilterLabel = FILTER_LABELS[evaluationTargetFilter] || evaluationTargetFilter;

  // Active P&L Metrics from current snapshot
  const coveredCount = activePnlData ? activePnlData.coveredCount : 0;
  const stakePerNumber = activePnlData ? activePnlData.stakePerNumber : (pnlConfig.stakePerNumber || 0);
  const totalStake = activePnlData ? activePnlData.totalStake : 0;
  const possibleReturn = activePnlData ? activePnlData.possibleCoveredReturn : 0;
  const possibleNetProfit = activePnlData ? activePnlData.possibleNetProfit : 0;
  const possibleNetLoss = activePnlData ? activePnlData.possibleNetLoss : 0;
  const isCoverageAvailable = activePnlData ? activePnlData.isCoverageAvailable : false;
  const coveredNumbers = activePnlData?.coveredNumbers || [];

  const cumulativePnl = pnlSummary?.cumulativePnl ?? 0;
  const currentBankroll = pnlSummary?.currentBankroll ?? (pnlConfig.startingBankroll || 0);
  const latestRealizedPnl = pnlSummary?.latestRealizedPnl ?? null;
  const totalEvaluatedSpins = pnlSummary?.totalPnlSpins ?? 0;

  const handleOpenConfig = () => {
    setFormGameName(pnlConfig.gameName || '');
    setFormCurrency(pnlConfig.currency || 'INR');
    setFormBankroll(pnlConfig.startingBankroll !== undefined ? String(pnlConfig.startingBankroll) : '');
    setFormPayoutFormat(pnlConfig.payoutFormat || 'total_return');
    setFormPayoutValue(pnlConfig.payoutValue !== undefined ? String(pnlConfig.payoutValue) : '');
    setFormStakePerNumber(pnlConfig.stakePerNumber !== undefined ? String(pnlConfig.stakePerNumber) : '');
    setFormTotalBudget(pnlConfig.totalStakeBudget !== undefined ? String(pnlConfig.totalStakeBudget) : '');
    setValidationError(null);
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    const bankrollNum = Number(formBankroll);
    const payoutNum = Number(formPayoutValue);
    const stakeNum = formStakePerNumber ? Number(formStakePerNumber) : 0;
    const budgetNum = formTotalBudget ? Number(formTotalBudget) : undefined;

    // Validate inputs
    if (!formBankroll.trim() || isNaN(bankrollNum) || bankrollNum <= 0) {
      setValidationError('Please enter a valid starting tracking balance greater than 0.');
      return;
    }
    if (!formPayoutValue.trim() || isNaN(payoutNum) || payoutNum <= 0) {
      setValidationError('Please enter a valid payout multiplier greater than 0.');
      return;
    }
    if ((!formStakePerNumber.trim() || isNaN(stakeNum) || stakeNum <= 0) && (!budgetNum || budgetNum <= 0)) {
      setValidationError('Please enter a valid stake per number or total stake budget.');
      return;
    }

    const updatedConfig: PnlConfig = {
      ...pnlConfig,
      gameName: formGameName.trim() || 'Roulette',
      currency: formCurrency,
      startingBankroll: bankrollNum,
      payoutFormat: formPayoutFormat,
      payoutValue: payoutNum,
      stakePerNumber: stakeNum > 0 ? stakeNum : undefined,
      totalStakeBudget: budgetNum && budgetNum > 0 ? budgetNum : undefined,
      pnlTrackingEnabled: true,
      isConfigured: true,
    };

    await updatePnlConfig(updatedConfig);
    setShowConfigModal(false);
  };

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-gradient-to-b from-[#10151F] to-[#0D1219] p-5 shadow-xl space-y-4">
      {/* ── Header Row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232D3F] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-100 uppercase tracking-wide">
                HYPOTHETICAL PROFIT &amp; LOSS CALCULATOR
              </h3>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                  configured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {configured ? 'TRACKING ACTIVE' : 'SETUP REQUIRED'}
              </span>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                Coverage Source: Current Prediction Selection
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {configured ? (
                <>
                  Following Prediction Selection:{' '}
                  <strong className="text-[#D4AF37]">{activeFilterLabel}</strong> ·{' '}
                  <strong className="text-slate-100">{coveredCount} Pockets</strong>
                  <span className="text-slate-500"> • </span>
                  Rule: <strong className="text-slate-200">{pnlConfig.gameName || 'Roulette'}</strong> •{' '}
                  {pnlConfig.payoutValue}
                  {pnlConfig.payoutFormat === 'total_return' ? '× Total Return' : ':1 Net Winnings'} • Stake{' '}
                  {symbol}
                  {stakePerNumber}/pocket • Start:{' '}
                  {formatCurrencyNeutral(pnlConfig.startingBankroll || 0, currency)}
                </>
              ) : (
                'Configure P{"&"}L Rules to activate hypothetical tracking using your selected prediction candidates.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenConfig}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#161D29] hover:bg-slate-800 text-xs font-bold text-amber-400 border border-[#232D3F] hover:border-amber-500/40 transition-all shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{configured ? 'Edit Financial Rules' : 'Configure P{"&"}L Rules'}</span>
        </button>
      </div>

      {/* ── Unconfigured Setup Invitation Banner ── */}
      {!configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-100">Configure P{"&"}L Rules</h4>
              <p className="text-xs text-slate-300">
                Enter your starting balance, payout multiplier, payout format, and stake per pocket to activate hypothetical P{"&"}L tracking for your active prediction selection.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenConfig}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-amber-400 shadow-md transition-all"
          >
            Configure P{"&"}L Rules Now
          </button>
        </div>
      )}

      {/* Coverage Warning Banner when 0 candidates */}
      {configured && (!isCoverageAvailable || coveredCount === 0) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs font-bold text-amber-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            No candidate numbers available for current prediction filter ({activeFilterLabel}). Select a different prediction filter tab to resume tracking.
          </span>
        </div>
      )}

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Stake */}
        <div className="rounded-xl bg-[#161D29] p-3 border border-[#232D3F]">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            Total Stake
          </span>
          <span className="text-sm font-black text-amber-400">
            {configured ? formatCurrencyNeutral(totalStake, currency) : 'Not configured'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {configured ? `${symbol}${stakePerNumber} × ${coveredCount} pockets` : 'N × Stake'}
          </span>
        </div>

        {/* 2. Possible Return */}
        <div className="rounded-xl bg-[#161D29] p-3 border border-[#232D3F]">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            Possible Return
          </span>
          <span className="text-sm font-black text-slate-100">
            {configured ? formatCurrencyNeutral(possibleReturn, currency) : 'Not configured'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {configured
              ? `${pnlConfig.payoutValue}${pnlConfig.payoutFormat === 'total_return' ? '× Total Return' : ':1 Net Winnings'}`
              : 'If covered pocket hits'}
          </span>
        </div>

        {/* 3. Possible Net Profit / Loss if Covered */}
        <div
          className={`rounded-xl p-3 border ${
            !configured
              ? 'bg-[#161D29] border-[#232D3F]'
              : possibleNetProfit >= 0
              ? 'bg-emerald-950/10 border-emerald-500/30'
              : 'bg-rose-950/10 border-rose-500/30'
          }`}
        >
          <span
            className={`text-[10px] block font-bold uppercase tracking-wider ${
              !configured
                ? 'text-slate-400'
                : possibleNetProfit >= 0
                ? 'text-emerald-400/80'
                : 'text-rose-400/80'
            }`}
          >
            {!configured
              ? 'Possible Net Profit / Loss'
              : possibleNetProfit >= 0
              ? 'Possible Net Profit'
              : 'Possible Net Loss (Covered)'}
          </span>
          <span
            className={`text-sm font-black ${
              !configured
                ? 'text-slate-400'
                : possibleNetProfit >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {configured ? formatCurrency(possibleNetProfit, currency) : 'Not configured'}
          </span>
          <span className="text-[10px] text-slate-500 block">If covered pocket hits</span>
        </div>

        {/* 4. Possible Loss if Uncovered */}
        <div className="rounded-xl bg-[#161D29] p-3 border border-rose-500/30 bg-rose-950/10">
          <span className="text-[10px] text-rose-400/80 block font-bold uppercase tracking-wider">
            Possible Loss if Uncovered
          </span>
          <span className="text-sm font-black text-rose-400">
            {configured ? formatCurrency(possibleNetLoss, currency) : 'Not configured'}
          </span>
          <span className="text-[10px] text-slate-500 block">If uncovered pocket hits</span>
        </div>

        {/* 5. Cumulative Hypothetical P&L */}
        <div
          className={`rounded-xl p-3 border ${
            !configured || totalEvaluatedSpins === 0
              ? 'bg-[#161D29] border-[#232D3F]'
              : cumulativePnl > 0
              ? 'bg-emerald-950/30 border-emerald-500/50'
              : cumulativePnl < 0
              ? 'bg-rose-950/30 border-rose-500/50'
              : 'bg-[#161D29] border-[#232D3F]'
          }`}
        >
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            Cumulative Hypothetical P&amp;L
          </span>
          <span
            className={`text-sm font-black ${
              !configured || totalEvaluatedSpins === 0
                ? 'text-slate-400'
                : cumulativePnl > 0
                ? 'text-emerald-400'
                : cumulativePnl < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {configured
              ? totalEvaluatedSpins > 0
                ? formatCurrency(cumulativePnl, currency)
                : 'Not evaluated'
              : 'Not configured'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {totalEvaluatedSpins > 0 ? `Over ${totalEvaluatedSpins} evaluated spin${totalEvaluatedSpins !== 1 ? 's' : ''}` : 'Awaiting predictions'}
          </span>
        </div>

        {/* 6. Hypothetical Tracking Balance */}
        <div className="rounded-xl bg-[#161D29] p-3 border border-[#D4AF37]/30">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            Hypothetical Tracking Balance
          </span>
          <span className="text-sm font-black text-slate-100">
            {configured ? formatCurrencyNeutral(currentBankroll, currency) : 'Not configured'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {configured
              ? `Start: ${formatCurrencyNeutral(pnlConfig.startingBankroll || 0, currency)}`
              : 'Setup required'}
          </span>
        </div>
      </div>

      {/* ── Exact Pockets Tracked Display ── */}
      {configured && (
        <div className="rounded-xl bg-[#080B12] p-3.5 border border-[#232D3F] space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#D4AF37]" />
              Exact Pockets Tracked for P&amp;L ({coveredCount} Numbers from {activeFilterLabel}):
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Total Stake: {formatCurrencyNeutral(totalStake, currency)}
            </span>
          </div>

          {coveredNumbers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {coveredNumbers.map((num) => {
                const color = getPocketColor(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-black font-mono border ${
                      color === 'red'
                        ? 'bg-rose-950/80 text-rose-200 border-rose-700/60'
                        : color === 'black'
                        ? 'bg-slate-900 text-slate-200 border-slate-700'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    }`}
                  >
                    {num}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-amber-400/90 font-mono py-1 italic">
              No candidate numbers available for current prediction filter ({activeFilterLabel}).
            </div>
          )}
        </div>
      )}

      {/* ── Latest Realized Result Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#080B12] p-3 rounded-xl border border-[#232D3F]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Latest Realized Spin P&amp;L:</span>
          {!configured ? (
            <span className="text-slate-500 italic">Not configured</span>
          ) : latestRealizedPnl === null ? (
            <span className="text-slate-500 italic">No evaluated spins yet</span>
          ) : latestRealizedPnl > 0 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-black bg-emerald-950 text-emerald-300 border border-emerald-500/50">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              {formatCurrency(latestRealizedPnl, currency)}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-black bg-rose-950 text-rose-300 border border-rose-500/50">
              <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-400" />
              {formatCurrency(latestRealizedPnl, currency)}
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-500 italic">
          Hypothetical analytical tracking — no real bets placed
        </span>
      </div>

      {/* ── Financial Configuration Drawer / Modal ── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#161D29] border border-[#D4AF37]/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#D4AF37]" />
                Configure Financial Rules
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {validationError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs font-bold text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {/* Game Name & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Game Name</label>
                  <input
                    type="text"
                    value={formGameName}
                    onChange={(e) => setFormGameName(e.target.value)}
                    placeholder="e.g. European VIP Roulette"
                    className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </div>

              {/* Starting Bankroll & Stake Per Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    Starting Tracking Balance ({CURRENCY_SYMBOLS[formCurrency] || '₹'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formBankroll}
                    onChange={(e) => setFormBankroll(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    Stake Per Number ({CURRENCY_SYMBOLS[formCurrency] || '₹'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formStakePerNumber}
                    onChange={(e) => setFormStakePerNumber(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Payout Format & Payout Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Payout Format</label>
                  <select
                    value={formPayoutFormat}
                    onChange={(e) => setFormPayoutFormat(e.target.value as PayoutFormat)}
                    className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="total_return">X× Total Return (stake included)</option>
                    <option value="net_winnings">X:1 Net Winnings (+ stake returned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Payout Multiplier (X)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={formPayoutValue}
                    onChange={(e) => setFormPayoutValue(e.target.value)}
                    placeholder="e.g. 36 or 20"
                    className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Optional Total Budget */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Optional Total Stake Budget ({CURRENCY_SYMBOLS[formCurrency] || '₹'})
                </label>
                <input
                  type="number"
                  min="1"
                  value={formTotalBudget}
                  onChange={(e) => setFormTotalBudget(e.target.value)}
                  placeholder="e.g. 1800 (optional)"
                  className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-3 py-2 text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#080B12] border border-[#232D3F] text-[11px] text-slate-400">
                Candidate coverage count is automatically set by your active prediction panel selection (<strong className="text-[#D4AF37]">{activeFilterLabel}</strong>).
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#232D3F]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-slate-950 bg-[#D4AF37] hover:bg-amber-400 shadow-md"
                >
                  Save Financial Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

