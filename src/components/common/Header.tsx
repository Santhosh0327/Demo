import React, { useState } from 'react';
import { RotateCcw, Plus, Layers, ShieldCheck, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from './SpinChip';

export const Header: React.FC = () => {
  const {
    sidebarOpen,
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    renameSession,
    wheelType,
    setWheelType,
    spins,
    undoLastSpin,
    clearSessionSpins,
  } = useRouletteStore();

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [resetPnlOnClear, setResetPnlOnClear] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const recentSpins = spins.slice(-3).reverse();

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    await createSession(newSessionName.trim(), wheelType);
    setNewSessionName('');
    setShowNewSessionModal(false);
  };

  const handleRenameSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId || !renameValue.trim()) return;
    await renameSession(activeSessionId, renameValue.trim());
    setRenameValue('');
    setShowRenameModal(false);
  };

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-[#10151F]/90 backdrop-blur-md border-b border-[#232D3F] flex items-center justify-between px-6 transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-20'
      }`}
    >
      {/* Left section: Session selection & Wheel switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#161D29] border border-[#232D3F] px-3 py-1.5 rounded-xl">
          <Layers className="h-4 w-4 text-[#D4AF37]" />
          <select
            value={activeSessionId || ''}
            onChange={(e) => selectSession(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#10151F] text-slate-100">
                {s.name} ({s.wheelType})
              </option>
            ))}
          </select>

          {activeSession && (
            <button
              onClick={() => {
                setRenameValue(activeSession.name);
                setShowRenameModal(true);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
              title="Rename Active Session"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => setShowNewSessionModal(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-[#D4AF37] hover:bg-slate-800 transition-colors"
            title="Create New Session"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Wheel Type Switcher */}
        <div className="flex bg-[#161D29] p-1 rounded-xl border border-[#232D3F]">
          <button
            onClick={() => setWheelType('European')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              wheelType === 'European'
                ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            European (0)
          </button>
          <button
            onClick={() => setWheelType('American')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              wheelType === 'American'
                ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            American (00)
          </button>
        </div>
      </div>

      {/* Right section: Recent Spins & Quick Undo */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Recent Spins:</span>
          {recentSpins.length === 0 ? (
            <span className="text-xs italic text-slate-500">No spins yet</span>
          ) : (
            <div className="flex items-center gap-1.5">
              {recentSpins.map((spin, idx) => (
                <SpinChip
                  key={spin.id}
                  number={spin.number}
                  size="sm"
                  className={idx === 0 ? 'ring-2 ring-emerald-500/50' : 'opacity-80'}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-[#232D3F]" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#D4AF37] bg-[#161D29] px-2.5 py-1 rounded-lg border border-[#232D3F]">
            Total: {spins.length}
          </span>

          <button
            onClick={undoLastSpin}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Undo Last Spin"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">Undo</span>
          </button>

          <button
            onClick={() => setShowClearConfirmation(true)}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-xs font-bold text-rose-300 border border-rose-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Clear Current Session Data"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline">Clear Session</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Session */}
      {showClearConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#161D29] border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">
                  Clear all data in {activeSession?.name || 'Main Session'}?
                </h3>
                <p className="text-xs text-rose-300/90 font-semibold mt-0.5">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#080B12] p-3.5 rounded-xl border border-[#232D3F]">
              Clearing will permanently remove the current session's spins, candidate sets, mathematical calculations, forward-test evaluations, streaks, and prediction activation state.
            </p>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#080B12] border border-[#232D3F] cursor-pointer text-xs text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={resetPnlOnClear}
                onChange={(e) => setResetPnlOnClear(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-[#D4AF37] focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span>Also reset P&amp;L Calculator configuration (show empty inputs)</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  await clearSessionSpins(resetPnlOnClear);
                  setShowClearConfirmation(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 border border-rose-400 shadow-lg transition-all active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                Clear Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for creating a new session */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#161D29] border border-[#232D3F] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> Create New Session
            </h3>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Session Name</label>
                <input
                  type="text"
                  placeholder="e.g. Evening Live Session"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-amber-400"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for renaming session */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#161D29] border border-[#232D3F] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-400" /> Rename Session
            </h3>
            <form onSubmit={handleRenameSession} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">New Name</label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#D4AF37]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-amber-400"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
