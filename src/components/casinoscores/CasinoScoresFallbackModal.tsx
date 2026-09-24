import React, { useState } from 'react';
import { DiscoveredGame } from '../../types/casinoscores';
import { parseCasinoScoresNumbers, isUrl, matchGameFromUrl } from '../../utils/casinoScores';
import { useCasinoScoresStore } from '../../store/useCasinoScoresStore';
import { ShieldAlert, FileText, X, Globe, Link as LinkIcon, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';

interface FallbackModalProps {
  isOpen: boolean;
  selectedGame: DiscoveredGame | null;
  onConnectGameUrl: (url: string) => Promise<void>;
  onExtractedParsed: (numbers: string[]) => void;
  onClose: () => void;
}

export const CasinoScoresFallbackModal: React.FC<FallbackModalProps> = ({
  isOpen,
  selectedGame,
  onConnectGameUrl,
  onExtractedParsed,
  onClose,
}) => {
  const { connectionState, errorMessage } = useCasinoScoresStore();
  const [activeTab, setActiveTab] = useState<'game_url' | 'copy_paste' | 'extension_info'>('game_url');
  const [gameUrlInput, setGameUrlInput] = useState('');
  const [pastedResultsText, setPastedResultsText] = useState('');
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);
  const [resultsErrorMsg, setResultsErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConnecting = connectionState === 'connecting';

  const handleConnectUrl = async () => {
    const cleanUrl = gameUrlInput.trim();
    if (!cleanUrl) {
      setLocalUrlError('Please enter a CasinoScores game URL.');
      return;
    }

    if (!isUrl(cleanUrl)) {
      setLocalUrlError('Please enter a valid website URL (e.g. https://www.casino.org/casinoscores/lightning-roulette/).');
      return;
    }

    setLocalUrlError(null);
    await onConnectGameUrl(cleanUrl);
  };

  const handleParsePastedResults = () => {
    const cleanText = pastedResultsText.trim();
    if (!cleanText) {
      setResultsErrorMsg('Please paste actual roulette numbers or spin history text.');
      return;
    }

    if (isUrl(cleanText)) {
      setResultsErrorMsg(
        'You entered a website URL. Please use the "Connect Game URL" tab to connect directly to this game URL.'
      );
      return;
    }

    const { numbers } = parseCasinoScoresNumbers(cleanText, selectedGame?.wheelType || 'European');
    if (numbers.length === 0) {
      setResultsErrorMsg('No valid roulette numbers found in pasted text. Ensure you paste spin numbers (e.g. 17, 34, 0, 22).');
      return;
    }

    setResultsErrorMsg(null);
    onExtractedParsed(numbers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232D3F]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">CasinoScores Connection & Import</h3>
              <p className="text-xs text-slate-400">
                Connect via Website URL or paste manual result history.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-[#161D29] p-1 border border-[#232D3F]">
          <button
            onClick={() => setActiveTab('game_url')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'game_url'
                ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Connect Game URL
          </button>
          <button
            onClick={() => setActiveTab('copy_paste')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'copy_paste'
                ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manual Result Import
          </button>
          <button
            onClick={() => setActiveTab('extension_info')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'extension_info'
                ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Extension Setup
          </button>
        </div>

        {/* Tab 1: Connect Game URL */}
        {activeTab === 'game_url' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Enter an official CasinoScores live game URL to connect:
            </p>

            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={gameUrlInput}
                disabled={isConnecting}
                onChange={(e) => setGameUrlInput(e.target.value)}
                placeholder="https://www.casino.org/casinoscores/lightning-roulette/"
                className="w-full bg-[#080B12] border border-[#232D3F] rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
              />
            </div>

            {(localUrlError || errorMessage) && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{localUrlError || errorMessage}</span>
                </div>
                {errorMessage && errorMessage.includes('casinoorg-india.com') && (
                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                    <span>Try official stream:</span>
                    <a
                      href="https://www.casino.org/casinoscores/lightning-roulette/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4AF37] hover:underline font-bold flex items-center gap-1"
                    >
                      Open Result Stream Page <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConnectUrl}
                disabled={isConnecting || !gameUrlInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to Source...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Connect Game URL
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Result Import */}
        {activeTab === 'copy_paste' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Paste actual winning numbers or spin sequence (e.g. <code className="text-[#D4AF37]">17, 34, 0, 22, 15</code>):
            </p>

            <textarea
              rows={4}
              value={pastedResultsText}
              onChange={(e) => setPastedResultsText(e.target.value)}
              placeholder="Paste spin numbers or results text here (e.g. 17, 34, 0, 22, 15)..."
              className="w-full bg-[#080B12] border border-[#232D3F] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
            />

            {resultsErrorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{resultsErrorMsg}</span>
              </div>
            )}

            <button
              onClick={handleParsePastedResults}
              className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Parse & Preview Results
            </button>
          </div>
        )}

        {/* Tab 3: Extension Setup */}
        {activeTab === 'extension_info' && (
          <div className="space-y-3 text-xs text-slate-300">
            <p>
              To enable automatic reading of visible results from live CasinoScores pages:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-slate-400 bg-[#080B12] p-4 rounded-xl border border-[#232D3F]">
              <li>Open Chrome extensions: <code className="text-[#D4AF37]">chrome://extensions</code></li>
              <li>Turn on <span className="text-slate-200 font-bold">Developer mode</span> in top right.</li>
              <li>Click <span className="text-slate-200 font-bold">Load unpacked</span>.</li>
              <li>Select path: <code className="text-[#D4AF37]">public/extension</code> inside Demo workspace.</li>
            </ol>
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Connected extension bridges visible results directly to your Load History button!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
