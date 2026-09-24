import React, { useEffect, useState } from 'react';
import { useCasinoScoresStore } from '../store/useCasinoScoresStore';
import { useRouletteStore } from '../store/useRouletteStore';
import { ImportPreviewModal } from '../components/casinoscores/ImportPreviewModal';
import { CasinoScoresFallbackModal } from '../components/casinoscores/CasinoScoresFallbackModal';
import {
  Globe,
  Radio,
  Search,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Zap,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { getPocketColor } from '../utils/rouletteRules';

export const CasinoScoresConnectPage: React.FC = () => {
  const {
    discoveredGames,
    unsupportedGames,
    selectedGameId,
    providerFilter,
    searchQuery,
    activeFilters,
    isDiscovering,
    connectionState,
    monitoringState,
    lastSyncTime,
    lastConfirmedResult,
    importedCount,
    errorMessage,
    extensionInstalled,
    previewPayload,
    isPreviewOpen,
    isFallbackModalOpen,
    initializeCasinoScores,
    discoverGames,
    selectGame,
    connectGameUrl,
    setProviderFilter,
    setSearchQuery,
    applyFilter,
    handleLoadHistoryClick,
    processRawExtractedNumbers,
    confirmImport,
    cancelPreview,
    closeFallbackModal,
    startMonitoring,
    stopMonitoring,
    clearError,
  } = useCasinoScoresStore();

  const { spins, createSession, activeSessionId, sessions } = useRouletteStore();
  const [topUrlInput, setTopUrlInput] = useState('');

  useEffect(() => {
    initializeCasinoScores();
  }, []);

  const selectedGame = discoveredGames.find((g) => g.id === selectedGameId);

  const availableProviders = Array.from(
    new Set(discoveredGames.map((g) => g.provider).filter(Boolean))
  ) as string[];

  const filteredGames = discoveredGames.filter((game) => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      providerFilter === 'all' || (game.provider && game.provider === providerFilter);
    return matchesSearch && matchesProvider;
  });

  const handleCreateDedicatedSession = async () => {
    if (!selectedGame) return;
    const sessionName = `CasinoScores - ${selectedGame.name}`;
    await createSession(sessionName, selectedGame.wheelType);
  };

  const handleTopConnectUrl = async () => {
    if (topUrlInput.trim()) {
      await connectGameUrl(topUrlInput.trim());
      setTopUrlInput('');
    }
  };

  const isConnecting = connectionState === 'connecting';
  const isMonitoringActive = monitoringState === 'active';

  const getConnectionBadge = (state: string) => {
    switch (state) {
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </span>
        );
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" />
            Connection Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold uppercase tracking-wider">
            <Globe className="h-3.5 w-3.5" />
            Disconnected
          </span>
        );
    }
  };

  const getMonitoringBadge = (state: string) => {
    switch (state) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Monitoring Active
          </span>
        );
      case 'starting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Starting...
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-slate-500 border border-slate-700 text-xs font-bold uppercase tracking-wider">
            Monitoring Idle
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#10151F] p-6 rounded-2xl border border-[#232D3F]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">CasinoScores Connect</h1>
          </div>
          <p className="text-xs text-slate-400">
            Integrate live roulette streams, connect website URLs, detect filters & monitor results.
          </p>
        </div>

        {/* Action Controls & Separate Connection / Monitoring Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => discoverGames()}
            disabled={isDiscovering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161D29] text-slate-200 hover:text-white border border-[#232D3F] hover:border-[#D4AF37]/50 transition-all font-semibold text-xs shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isDiscovering ? 'animate-spin text-[#D4AF37]' : ''}`} />
            {isDiscovering ? 'Scanning Catalog...' : 'Discover Games'}
          </button>

          {getConnectionBadge(connectionState)}
          {getMonitoringBadge(monitoringState)}
        </div>
      </div>

      {/* Website Game URL Connection Bar */}
      <div className="bg-[#161D29] p-4 rounded-2xl border border-[#232D3F] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-[#D4AF37]" />
            Connect CasinoScores Game URL
          </h2>
          <span className="text-[10px] text-slate-400">Validate origin & match game table</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Paste CasinoScores game URL (e.g. https://www.casino.org/casinoscores/lightning-roulette/)..."
              value={topUrlInput}
              disabled={isConnecting}
              onChange={(e) => setTopUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTopConnectUrl()}
              className="w-full bg-[#10151F] border border-[#232D3F] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleTopConnectUrl}
            disabled={isConnecting || !topUrlInput.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Game URL'
            )}
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#161D29] p-4 rounded-xl border border-[#232D3F]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Discovered Games</span>
          <div className="text-xl font-black text-slate-100 mt-1">{discoveredGames.length}</div>
        </div>

        <div className="bg-[#161D29] p-4 rounded-xl border border-[#232D3F]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Imported Results</span>
          <div className="text-xl font-black text-[#D4AF37] mt-1">{importedCount}</div>
        </div>

        <div className="bg-[#161D29] p-4 rounded-xl border border-[#232D3F]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Latest Confirmed Result</span>
          <div className="flex items-center gap-2 mt-1">
            {lastConfirmedResult !== null ? (
              <span
                className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-extrabold text-sm text-white shadow-md ${
                  getPocketColor(lastConfirmedResult) === 'red'
                    ? 'bg-red-600'
                    : getPocketColor(lastConfirmedResult) === 'black'
                    ? 'bg-slate-950 border border-slate-700'
                    : 'bg-emerald-600'
                }`}
              >
                {lastConfirmedResult}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">No spin yet</span>
            )}
          </div>
        </div>

        <div className="bg-[#161D29] p-4 rounded-xl border border-[#232D3F]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Last Sync Time</span>
          <div className="text-sm font-semibold text-slate-300 mt-1 font-mono">
            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-amber-950/30 border border-amber-500/40 p-4 rounded-2xl flex items-start justify-between gap-3 text-amber-300 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold text-amber-200">Notice: </span>
              {errorMessage}
            </div>
          </div>
          <button onClick={clearError} className="text-amber-400 hover:text-amber-200 font-bold px-2 py-0.5">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Discovered Games (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#10151F] p-5 rounded-2xl border border-[#232D3F] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#D4AF37]" />
                Accessible Games ({filteredGames.length})
              </h2>
            </div>

            {/* Search & Provider Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search roulette games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161D29] border border-[#232D3F] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>

              {availableProviders.length > 0 && (
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="bg-[#161D29] border border-[#232D3F] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]/50"
                >
                  <option value="all">All Providers</option>
                  {availableProviders.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Game List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredGames.length === 0 ? (
                <div className="p-8 text-center bg-[#161D29]/40 rounded-xl border border-[#232D3F]">
                  <ShieldAlert className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No accessible roulette games discovered.</p>
                </div>
              ) : (
                filteredGames.map((game) => {
                  const isSelected = game.id === selectedGameId;
                  return (
                    <div
                      key={game.id}
                      onClick={() => selectGame(game.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#161D29] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                          : 'bg-[#161D29]/60 border-[#232D3F] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">{game.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {game.provider && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                                {game.provider}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                game.wheelType === 'American'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {game.wheelType} ({game.wheelType === 'American' ? '38 Pockets' : '37 Pockets'})
                            </span>
                          </div>
                        </div>

                        {isSelected && <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-ping" />}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                        <span>Provider: {game.provider || 'Live Stream'}</span>
                        {isSelected ? getConnectionBadge(connectionState) : <span className="text-slate-500">Click to Select</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {unsupportedGames.length > 0 && (
              <div className="p-3 bg-[#080B12] rounded-xl border border-[#232D3F] text-[10px] text-slate-400">
                <span className="font-bold text-slate-300">Non-Roulette Titles Excluded: </span>
                {unsupportedGames.length} titles (e.g. slots, Crazy Time, Baccarat) filtered out per requirements.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Game Workspace & Filter Control (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedGame ? (
            <div className="bg-[#10151F] p-6 rounded-2xl border border-[#232D3F] space-y-6">
              {/* Selected Game Title Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#232D3F]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-100">{selectedGame.name}</h2>
                    <a
                      href={selectedGame.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-[#D4AF37] transition-colors"
                      title="Open CasinoScores Source URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Source: <span className="font-mono text-slate-300">{selectedGame.sourceWebsite}</span> | Wheel:{' '}
                    <span className="text-[#D4AF37] font-semibold">{selectedGame.wheelType} Roulette</span>
                  </p>
                </div>

                <button
                  onClick={handleCreateDedicatedSession}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  Create Dedicated Session
                </button>
              </div>

              {/* Verified Filters Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#D4AF37]" />
                  Verified Supported History Filters
                </h3>

                {selectedGame.supportedFilters.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No custom pagination filters required for this table. Standard live result stream active.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#161D29] p-4 rounded-xl border border-[#232D3F]">
                    {selectedGame.supportedFilters.map((flt) => {
                      const currentGameFilters = activeFilters[selectedGame.id] || {};
                      const currentValue = currentGameFilters[flt.id] || flt.defaultValue;

                      return (
                        <div key={flt.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-300">{flt.name}</label>
                            {flt.isVerified && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                                Verified
                              </span>
                            )}
                          </div>
                          <select
                            value={currentValue}
                            onChange={(e) => applyFilter(selectedGame.id, flt.id, e.target.value)}
                            className="w-full bg-[#10151F] border border-[#232D3F] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                          >
                            {flt.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Operational Action Controls */}
              <div className="p-4 bg-[#161D29]/60 rounded-xl border border-[#232D3F] space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Sync & Live Monitoring Controls
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleLoadHistoryClick}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold text-xs shadow-md transition-all"
                  >
                    <Layers className="h-4 w-4" />
                    Load History
                  </button>

                  {!isMonitoringActive ? (
                    <button
                      onClick={() => startMonitoring()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Start Monitoring
                    </button>
                  ) : (
                    <button
                      onClick={() => stopMonitoring()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-md transition-all animate-pulse"
                    >
                      <Square className="h-4 w-4 fill-current" />
                      Stop Monitoring
                    </button>
                  )}
                </div>
              </div>

              {/* Active Session Info */}
              <div className="p-4 bg-[#161D29] rounded-xl border border-[#232D3F] flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Current Dashboard Session: </span>
                  <span className="font-bold text-[#D4AF37]">
                    {sessions.find((s) => s.id === activeSessionId)?.name || 'Main Session'}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2">({spins.length} Total Spins)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#10151F] p-12 rounded-2xl border border-[#232D3F] text-center space-y-3">
              <Sparkles className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Select a Roulette Table</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Choose a discovered roulette game from the left panel to load history and start monitoring.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Preview Modal */}
      <ImportPreviewModal
        isOpen={isPreviewOpen}
        previewPayload={previewPayload}
        onConfirm={confirmImport}
        onCancel={cancelPreview}
      />

      {/* Fallback Permission Options Modal */}
      <CasinoScoresFallbackModal
        isOpen={isFallbackModalOpen}
        selectedGame={selectedGame || null}
        onConnectGameUrl={connectGameUrl}
        onExtractedParsed={(numbers) => processRawExtractedNumbers(numbers, 'manual_fallback')}
        onClose={closeFallbackModal}
      />
    </div>
  );
};
