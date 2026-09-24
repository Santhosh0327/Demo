import React, { useRef, useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from '../common/SpinChip';
import {
  calculateVideoCropCoordinates,
  preprocessCanvasForOcr,
  parseOcrWordsToSequence,
} from '../../utils/screenOcrHelper';
import { filterDuplicateSpinEvents } from '../../utils/casinoScores';
import { getPocketColor } from '../../utils/rouletteRules';
import {
  Monitor,
  Play,
  Square,
  RefreshCw,
  Crop,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sliders,
  Eye,
  Layers,
  X,
  Plus,
} from 'lucide-react';

export const ScreenCaptureEntry: React.FC = () => {
  const { spins, wheelType, addSpin, deleteSpin, importSpinsBatch, showToast } = useRouletteStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Statuses
  const [statusState, setStatusState] = useState<
    | 'idle'
    | 'sharing_active'
    | 'region_selected'
    | 'scanning'
    | 'awaiting_confirmation'
    | 'monitoring_active'
    | 'paused'
    | 'error'
  >('idle');

  // Crop Region (percentages 0-100 relative to video container)
  const [cropBox, setCropBox] = useState({ x: 10, y: 35, width: 80, height: 30 });

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [detectedSequence, setDetectedSequence] = useState<string[]>([]);
  const [editableSequence, setEditableSequence] = useState<string[]>([]);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const [newNumberInput, setNewNumberInput] = useState('');

  // Scanning & De-duplication Memory
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);
  const [lastConfirmedTime, setLastConfirmedTime] = useState<number | null>(null);
  const [newlyImportedCount, setNewlyImportedCount] = useState(0);

  const workerRef = useRef<any>(null);

  // Initialize Tesseract worker
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const worker = await createWorker('eng');
        if (isMounted) workerRef.current = worker;
      } catch (e) {
        console.error('Tesseract Worker Init Error:', e);
      }
    })();

    return () => {
      isMounted = false;
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsCapturing(true);
      setStatusState('sharing_active');
      showToast('Screen sharing started. Adjust crop box over Latest Spins row.', 'info');

      mediaStream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
    } catch (err) {
      console.error('Screen capture error:', err);
      setStatusState('error');
      showToast('Screen share permission denied or cancelled', 'error');
    }
  };

  const stopScreenCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setIsMonitoring(false);
    setStatusState('idle');
    showToast('Screen capture stopped', 'info');
  };

  // Live Cropped Region Preview Drawing Loop
  useEffect(() => {
    if (!isCapturing) return;

    const previewInterval = setInterval(() => {
      if (!videoRef.current || !previewCanvasRef.current) return;
      const video = videoRef.current;
      const previewCanvas = previewCanvasRef.current;
      const pctx = previewCanvas.getContext('2d');
      if (!pctx || video.videoWidth === 0) return;

      const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);
      if (cropW <= 0 || cropH <= 0) return;

      previewCanvas.width = cropW;
      previewCanvas.height = cropH;

      pctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }, 150);

    return () => clearInterval(previewInterval);
  }, [isCapturing, cropBox]);

  // Execute Single High-Precision Scan for Initial Confirmation
  const handleScanSequenceForConfirmation = async () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current) {
      showToast('OCR engine not ready or screen share inactive', 'error');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return;

    setStatusState('scanning');

    const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);
    canvas.width = cropW;
    canvas.height = cropH;

    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const snapshotUrl = canvas.toDataURL('image/png');

    preprocessCanvasForOcr(ctx, cropW, cropH);

    try {
      const res = await workerRef.current.recognize(canvas);
      const words = res.data.words || [];

      const parsedSequence = parseOcrWordsToSequence(
        words.map((w: any) => ({ text: w.text, bbox: w.bbox })),
        wheelType
      );

      setSnapshotDataUrl(snapshotUrl);
      setDetectedSequence(parsedSequence);
      setEditableSequence(parsedSequence);
      setIsConfirmModalOpen(true);
      setStatusState('awaiting_confirmation');
      setLastScannedTime(Date.now());
    } catch (err) {
      console.error('OCR scan failed:', err);
      setStatusState('error');
      showToast('OCR scan failed to recognize numbers. Adjust crop area.', 'error');
    }
  };

  // User Confirms the Extracted Sequence
  const handleConfirmImport = async () => {
    if (editableSequence.length === 0) {
      setIsConfirmModalOpen(false);
      return;
    }

    const newUnique = filterDuplicateSpinEvents(spins, editableSequence);

    if (newUnique.length > 0) {
      await importSpinsBatch(newUnique, 'screen_capture');
      setNewlyImportedCount((prev) => prev + newUnique.length);
      setLastConfirmedTime(Date.now());
      showToast(`Confirmed & imported ${newUnique.length} new OCR spins to active session!`, 'success');
    } else {
      showToast('All scanned numbers already exist in history. No duplicates added.', 'info');
    }

    setIsConfirmModalOpen(false);
    setStatusState(isMonitoring ? 'monitoring_active' : 'region_selected');
  };

  // Toggle Continuous Monitoring
  const toggleMonitoring = () => {
    if (!isMonitoring) {
      setIsMonitoring(true);
      setStatusState('monitoring_active');
      showToast('Live OCR Monitoring Started', 'success');
    } else {
      setIsMonitoring(false);
      setStatusState('region_selected');
      showToast('Live OCR Monitoring Stopped', 'info');
    }
  };

  // Continuous Background Monitoring Loop
  useEffect(() => {
    if (!isCapturing || !isMonitoring) return;

    const monitorInterval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !workerRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || video.videoWidth === 0) return;

      const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);
      canvas.width = cropW;
      canvas.height = cropH;

      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      preprocessCanvasForOcr(ctx, cropW, cropH);

      try {
        const res = await workerRef.current.recognize(canvas);
        const words = res.data.words || [];

        const liveSeq = parseOcrWordsToSequence(
          words.map((w: any) => ({ text: w.text, bbox: w.bbox })),
          wheelType
        );

        setLastScannedTime(Date.now());

        if (liveSeq.length > 0) {
          const currentSpins = useRouletteStore.getState().spins;
          const newOnly = filterDuplicateSpinEvents(currentSpins, liveSeq);

          if (newOnly.length > 0) {
            for (const num of newOnly) {
              await addSpin(num, 'screen_capture');
            }
            setNewlyImportedCount((prev) => prev + newOnly.length);
            setLastConfirmedTime(Date.now());
            showToast(`Live OCR Detected New Spin: ${newOnly[newOnly.length - 1]}`, 'success');
          }
        }
      } catch (err) {
        // silent retry
      }
    }, 3000);

    return () => clearInterval(monitorInterval);
  }, [isCapturing, isMonitoring, cropBox, wheelType, addSpin, spins, showToast]);

  // Filter OCR spins in session for user review/deletion
  const ocrSpins = spins.filter((s) => s.source === 'screen_capture');

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-[#D4AF37]" /> Live Screen Share OCR Capture
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select the exact Latest Spins tile row from CasinoScores. Crop Math automatically compensates for resolution scaling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isCapturing ? (
              <button
                onClick={startScreenCapture}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-md transition-all"
              >
                <Play className="h-4 w-4 fill-current" /> Start Screen Share
              </button>
            ) : (
              <button
                onClick={stopScreenCapture}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
              >
                <Square className="h-4 w-4 fill-current" /> Stop Screen Share
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080B12] rounded-xl border border-[#232D3F] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                statusState === 'monitoring_active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : statusState === 'sharing_active' || statusState === 'region_selected'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : statusState === 'scanning'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {statusState.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>Last Scan: {lastScannedTime ? new Date(lastScannedTime).toLocaleTimeString() : 'Never'}</span>
            <span>Imported This Session: <strong className="text-[#D4AF37]">{newlyImportedCount}</strong></span>
          </div>
        </div>

        {/* Video Frame & Crop Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Video View (8 cols) */}
          <div className="lg:col-span-8 relative rounded-2xl border border-[#232D3F] bg-[#080B12] overflow-hidden min-h-[320px] flex items-center justify-center">
            <video ref={videoRef} className="w-full max-h-[400px] object-contain" muted />
            <canvas ref={canvasRef} className="hidden" />

            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <Monitor className="h-12 w-12 text-slate-600" />
                <span>Screen sharing is inactive. Click "Start Screen Share" above.</span>
              </div>
            )}

            {/* Interactive Crop Box Overlay */}
            {isCapturing && (
              <div
                className="absolute border-2 border-[#D4AF37] bg-amber-500/10 shadow-[0_0_20px_rgba(212,175,55,0.4)] pointer-events-none"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                }}
              >
                <span className="absolute top-1 left-2 text-[10px] font-bold text-[#D4AF37] bg-slate-950/90 px-2 py-0.5 rounded border border-[#D4AF37]/50 shadow">
                  OCR Region (Winning Numbers Tile Row)
                </span>
              </div>
            )}
          </div>

          {/* Real-time Cropped Zoom Preview & Sliders (4 cols) */}
          <div className="lg:col-span-4 bg-[#080B12] p-4 rounded-2xl border border-[#232D3F] space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-[#D4AF37]" /> Live Cropped Region Preview
              </label>
              <div className="rounded-xl border border-[#232D3F] bg-[#10151F] h-28 flex items-center justify-center overflow-hidden p-1">
                {isCapturing ? (
                  <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[11px] text-slate-500 italic">No crop active</span>
                )}
              </div>
            </div>

            {/* Range Controls */}
            {isCapturing && (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono">X Position ({cropBox.x}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={cropBox.x}
                    onChange={(e) => setCropBox({ ...cropBox, x: parseInt(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono">Y Position ({cropBox.y}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={cropBox.y}
                    onChange={(e) => setCropBox({ ...cropBox, y: parseInt(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono">Width ({cropBox.width}%)</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={cropBox.width}
                    onChange={(e) => setCropBox({ ...cropBox, width: parseInt(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono">Height ({cropBox.height}%)</label>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={cropBox.height}
                    onChange={(e) => setCropBox({ ...cropBox, height: parseInt(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isCapturing && (
              <div className="space-y-2 pt-2 border-t border-[#232D3F]">
                <button
                  onClick={handleScanSequenceForConfirmation}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Crop className="h-4 w-4 text-[#D4AF37]" /> Scan & Preview Sequence
                </button>

                {!isMonitoring ? (
                  <button
                    onClick={toggleMonitoring}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-4 w-4 fill-current" /> Start Live OCR Monitoring
                  </button>
                ) : (
                  <button
                    onClick={toggleMonitoring}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    <Square className="h-4 w-4 fill-current" /> Stop Live Monitoring
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Cleanup Section for OCR Imported Spins */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#D4AF37]" /> Review & Clean OCR Imported Spins ({ocrSpins.length})
            </h4>
            <p className="text-xs text-slate-400">
              Inspect and remove any incorrectly detected OCR spins from your active session.
            </p>
          </div>
        </div>

        {ocrSpins.length === 0 ? (
          <p className="text-xs text-slate-500 italic bg-[#080B12] p-4 rounded-xl border border-[#232D3F] text-center">
            No OCR spins currently imported in active session.
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto py-2 max-w-full">
            {ocrSpins.map((spin, idx) => (
              <div
                key={spin.id}
                className="flex items-center gap-2 bg-[#080B12] p-2 rounded-xl border border-[#232D3F] shrink-0"
              >
                <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                <SpinChip number={spin.number} size="sm" />
                <button
                  onClick={() => deleteSpin(spin.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remove incorrect OCR spin"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#232D3F]">
              <h3 className="text-base font-bold text-slate-100">Confirm OCR Extracted Sequence</h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {snapshotDataUrl && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Cropped Source Image:</label>
                <img
                  src={snapshotDataUrl}
                  alt="Cropped OCR Source"
                  className="w-full h-20 object-contain rounded-xl border border-[#232D3F] bg-[#080B12]"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Detected Sequence ({editableSequence.length} numbers):
              </label>

              <div className="bg-[#080B12] p-3 rounded-xl border border-[#232D3F] flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {editableSequence.length === 0 ? (
                  <p className="text-xs text-amber-400 italic">No numbers detected in region.</p>
                ) : (
                  editableSequence.map((num, idx) => (
                    <div
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-bold text-xs text-white border ${
                        getPocketColor(num) === 'red'
                          ? 'bg-red-600 border-red-500'
                          : getPocketColor(num) === 'black'
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-emerald-600 border-emerald-500'
                      }`}
                    >
                      <span>{num}</span>
                      <button
                        onClick={() => setEditableSequence(editableSequence.filter((_, i) => i !== idx))}
                        className="hover:text-slate-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232D3F]">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={editableSequence.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm & Import ({editableSequence.length} Spins)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
