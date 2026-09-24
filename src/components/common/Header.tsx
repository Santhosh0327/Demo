import React, { useState } from 'react';
import { RotateCcw, Plus, Layers, ShieldCheck, Edit3 } from 'lucide-react';
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
  } = useRouletteStore();

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
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
        </div>
      </div>

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
