import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from '../common/SpinChip';
import {
  calculateVideoCropCoordinates,
  preprocessCanvasForOcr,
  parseOcrWordsToSequence,
  getVideoRenderBounds,
  detectNewSpinsFromHistoryRows,
} from '../../utils/screenOcrHelper';
import { getPocketColor } from '../../utils/rouletteRules';
import {
  Monitor,
  Play,
  Square,
  Crop,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eye,
  Layers,
  X,
  RefreshCw,
  ShieldAlert,
  Info,
  Radio,
  MousePointer,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PipelineStatus =
  | 'idle'
  | 'sharing_active'
  | 'crop_calibrated'
  | 'scanning'
  | 'awaiting_confirmation'
  | 'history_imported'
  | 'monitoring_active'
  | 'monitoring_uncertain'
  | 'ocr_failed'
  | 'error';

interface CropBoxPct {
  x: number;      // % of rendered video area
  y: number;
  width: number;
  height: number;
}

interface OcrWordConfidence {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number };
}

// ─── Status Label Mapping ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: 'Screen Share Inactive',
  sharing_active: 'Screen Sharing Active',
  crop_calibrated: 'Crop Calibrated',
  scanning: 'OCR Scan Running...',
  awaiting_confirmation: 'Sequence Awaiting Confirmation',
  history_imported: 'History Imported',
  monitoring_active: 'Live Monitoring Active',
  monitoring_uncertain: 'Tracking Uncertain – Review Required',
  ocr_failed: 'OCR Failed / Low Confidence',
  error: 'Error',
};

const STATUS_COLORS: Record<PipelineStatus, string> = {
  idle: 'bg-slate-800 text-slate-400 border-slate-700',
  sharing_active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  crop_calibrated: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  scanning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  awaiting_confirmation: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  history_imported: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  monitoring_active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  monitoring_uncertain: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  ocr_failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ScreenCaptureEntry: React.FC = () => {
  const { spins, wheelType, importSpinsBatch, deleteSpin, showToast } = useRouletteStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<any>(null);

  // ── Screen share state ──
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle');

  // ── Pipeline status flags (shown separately) ──
  const [flags, setFlags] = useState({
    screenSharingActive: false,
    cropCalibrated: false,
    ocrScanCompleted: false,
    sequenceAwaitingConfirmation: false,
    historyImported: false,
    liveMonitoringActive: false,
  });

  // ── Diagnostic info ──
  const [diagInfo, setDiagInfo] = useState<{
    videoSrc: string;
    renderDims: string;
    cropPx: string;
    croppedImageDims: string;
    ocrRaw: string;
    parsedSeq: string;
    lastDecision: string;
    errorMsg: string;
  }>({
    videoSrc: '—',
    renderDims: '—',
    cropPx: '—',
    croppedImageDims: '—',
    ocrRaw: '—',
    parsedSeq: '—',
    lastDecision: '—',
    errorMsg: '—',
  });

  // ── Crop box: percentages of the RENDERED VIDEO AREA (not the container div) ──
  const [cropBox, setCropBox] = useState<CropBoxPct>({ x: 5, y: 30, width: 90, height: 25 });
  const [cropCalibrated, setCropCalibrated] = useState(false);

  // ── Drag-to-select state ──
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragMode, setDragMode] = useState(false); // toggle between slider and drag mode

  // ── Confirmation flow ──
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [detectedSequence, setDetectedSequence] = useState<string[]>([]);
  const [editableSequence, setEditableSequence] = useState<string[]>([]);
  const [ocrWordConfidences, setOcrWordConfidences] = useState<OcrWordConfidence[]>([]);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const [newNumberInput, setNewNumberInput] = useState('');
  const [isNewestFirst, setIsNewestFirst] = useState(true); // CasinoScores shows newest-first by default

  // ── De-duplication state ──
  const [lastConfirmedRow, setLastConfirmedRow] = useState<string[]>([]);
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);
  const [lastConfirmedTime, setLastConfirmedTime] = useState<number | null>(null);
  const [newlyImportedCount, setNewlyImportedCount] = useState(0);

  // ── Initialize Tesseract worker ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const worker = await createWorker('eng');
        if (mounted) {
          workerRef.current = worker;
          console.debug('[ScreenOCR] Tesseract worker initialized');
        }
      } catch (e) {
        console.error('[ScreenOCR] Tesseract Worker Init Error:', e);
      }
    })();
    return () => {
      mounted = false;
      workerRef.current?.terminate();
    };
  }, []);

  // ── Start screen capture ──
  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => {
          const v = videoRef.current!;
          const info = `${v.videoWidth}×${v.videoHeight}`;
          setDiagInfo((d) => ({ ...d, videoSrc: info }));
          console.debug('[ScreenOCR] Source video dimensions:', info);
        };
      }

      setIsCapturing(true);
      setPipelineStatus('sharing_active');
      setFlags((f) => ({ ...f, screenSharingActive: true }));
      showToast('Screen sharing started. Drag or use sliders to select the latest-spin row, then click Scan.', 'info');

      mediaStream.getVideoTracks()[0].onended = () => stopScreenCapture();
    } catch (err) {
      console.error('[ScreenOCR] Screen capture error:', err);
      setPipelineStatus('error');
      setDiagInfo((d) => ({ ...d, errorMsg: String(err) }));
      showToast('Screen share permission denied or cancelled', 'error');
    }
  };

  // ── Stop screen capture ──
  const stopScreenCapture = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsCapturing(false);
    setIsMonitoring(false);
    setPipelineStatus('idle');
    setFlags({ screenSharingActive: false, cropCalibrated: false, ocrScanCompleted: false, sequenceAwaitingConfirmation: false, historyImported: false, liveMonitoringActive: false });
    showToast('Screen capture stopped', 'info');
  };

  // ── Compute overlay CSS positioning over the video render area ──
  // The overlay must be positioned relative to the rendered video area (not the container),
  // so we compute the offset of the rendered area within the container.
  const getOverlayStyle = useCallback((): React.CSSProperties => {
    const video = videoRef.current;
    if (!video || !isCapturing) return {};

    const { renderX, renderY, renderW, renderH } = getVideoRenderBounds(video);

    // cropBox is already in % of rendered video area
    const left = renderX + (cropBox.x / 100) * renderW;
    const top = renderY + (cropBox.y / 100) * renderH;
    const width = (cropBox.width / 100) * renderW;
    const height = (cropBox.height / 100) * renderH;

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: dragMode ? 'none' : 'none',
    };
  }, [isCapturing, cropBox, dragMode]);

  // ── Drag-to-select handlers ──
  // Mouse events are on the container div; convert them to video render area percentages.
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragMode || !videoRef.current) return;
    const video = videoRef.current;
    const { renderX, renderY, renderW, renderH } = getVideoRenderBounds(video);
    const containerRect = e.currentTarget.getBoundingClientRect();

    const relX = e.clientX - containerRect.left;
    const relY = e.clientY - containerRect.top;

    // Convert to render-area-relative percentages
    const pctX = Math.max(0, Math.min(100, ((relX - renderX) / renderW) * 100));
    const pctY = Math.max(0, Math.min(100, ((relY - renderY) / renderH) * 100));

    setDragStart({ x: pctX, y: pctY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !videoRef.current) return;
    const video = videoRef.current;
    const { renderX, renderY, renderW, renderH } = getVideoRenderBounds(video);
    const containerRect = e.currentTarget.getBoundingClientRect();

    const relX = e.clientX - containerRect.left;
    const relY = e.clientY - containerRect.top;

    const pctX = Math.max(0, Math.min(100, ((relX - renderX) / renderW) * 100));
    const pctY = Math.max(0, Math.min(100, ((relY - renderY) / renderH) * 100));

    const newBox = {
      x: Math.min(dragStart.x, pctX),
      y: Math.min(dragStart.y, pctY),
      width: Math.abs(pctX - dragStart.x),
      height: Math.abs(pctY - dragStart.y),
    };
    setCropBox(newBox);
  };

  const handleMouseUp = () => {
    if (isDragging && cropBox.width > 2 && cropBox.height > 2) {
      setCropCalibrated(true);
      setPipelineStatus('crop_calibrated');
      setFlags((f) => ({ ...f, cropCalibrated: true }));
      showToast('Crop region calibrated via drag. Click "Scan & Preview Sequence" to OCR.', 'success');
    }
    setIsDragging(false);
    setDragStart(null);
  };

  // ── Live preview drawing loop ──
  // Draws the exact region inside cropBox from the video to the preview canvas.
  useEffect(() => {
    if (!isCapturing) return;

    let animFrame: number;
    const draw = () => {
      const video = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || video.readyState < 2) {
        animFrame = requestAnimationFrame(draw);
        return;
      }

      const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);

      if (cropW <= 0 || cropH <= 0) {
        animFrame = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas to exact cropped source dimensions for 1:1 pixel fidelity
      if (canvas.width !== cropW || canvas.height !== cropH) {
        canvas.width = cropW;
        canvas.height = cropH;
      }

      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      setDiagInfo((d) => {
        const dims = `${cropW}×${cropH}`;
        if (d.croppedImageDims === dims) return d;
        return { ...d, croppedImageDims: dims };
      });

      animFrame = requestAnimationFrame(draw);
    };

    // Throttle to ~10fps for preview to save CPU
    let lastDraw = 0;
    const throttledDraw = () => {
      const now = performance.now();
      if (now - lastDraw > 100) {
        lastDraw = now;
        const video = videoRef.current;
        const canvas = previewCanvasRef.current;
        if (!video || !canvas || video.videoWidth === 0 || video.readyState < 2) {
          animFrame = requestAnimationFrame(throttledDraw);
          return;
        }
        const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);
        if (cropW > 0 && cropH > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (canvas.width !== cropW || canvas.height !== cropH) {
              canvas.width = cropW;
              canvas.height = cropH;
            }
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          }
        }
      }
      animFrame = requestAnimationFrame(throttledDraw);
    };

    animFrame = requestAnimationFrame(throttledDraw);
    return () => cancelAnimationFrame(animFrame);
  }, [isCapturing, cropBox]);

  // Update diagnostic render dims whenever video or crop changes
  useEffect(() => {
    if (!isCapturing || !videoRef.current) return;
    const video = videoRef.current;
    const { renderW, renderH } = getVideoRenderBounds(video);
    const bounds = getVideoRenderBounds(video);
    const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);
    setDiagInfo((d) => ({
      ...d,
      renderDims: `${Math.round(renderW)}×${Math.round(renderH)}`,
      cropPx: `x=${cropX}, y=${cropY}, w=${cropW}, h=${cropH}`,
    }));
  }, [isCapturing, cropBox]);

  // ── Single Scan for Confirmation ──
  const handleScanSequenceForConfirmation = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !workerRef.current) {
      showToast('OCR engine not ready or screen share inactive', 'error');
      return;
    }
    if (video.videoWidth === 0 || video.readyState < 2) {
      showToast('Video stream not ready yet. Wait for the screen to appear.', 'error');
      return;
    }

    setPipelineStatus('scanning');

    const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);

    if (cropW <= 0 || cropH <= 0) {
      showToast('Invalid crop region. Please recalibrate the crop box.', 'error');
      setPipelineStatus(cropCalibrated ? 'crop_calibrated' : 'sharing_active');
      return;
    }

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d')!;

    // Draw original crop first (for snapshot display)
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const snapshotUrl = canvas.toDataURL('image/png');

    // Pre-process for OCR
    preprocessCanvasForOcr(ctx, cropW, cropH);

    console.debug('[ScreenOCR] Starting OCR scan on', cropW, '×', cropH, 'cropped image');

    try {
      const res = await workerRef.current.recognize(canvas);
      const words: any[] = res.data.words || [];

      console.debug('[ScreenOCR] OCR raw words:', words.map((w: any) => `"${w.text}" [conf=${w.confidence?.toFixed(0)}]`).join(', '));

      const rawOcrText = words.map((w: any) => w.text).join(' | ');

      const wordInputs = words.map((w: any) => ({
        text: w.text,
        bbox: w.bbox,
        confidence: w.confidence || 0,
      }));

      const parsedSequence = parseOcrWordsToSequence(
        wordInputs,
        wheelType
      );

      // Capture low-confidence words for display
      const lowConfWords = wordInputs.filter((w) => w.confidence < 60);

      setSnapshotDataUrl(snapshotUrl);
      setDetectedSequence(parsedSequence);
      setEditableSequence(parsedSequence);
      setOcrWordConfidences(lowConfWords);
      setIsConfirmModalOpen(true);
      setPipelineStatus('awaiting_confirmation');
      setLastScannedTime(Date.now());
      setFlags((f) => ({ ...f, ocrScanCompleted: true, sequenceAwaitingConfirmation: true }));

      setDiagInfo((d) => ({
        ...d,
        ocrRaw: rawOcrText.substring(0, 200),
        parsedSeq: parsedSequence.join(', ') || '(none detected)',
        croppedImageDims: `${cropW}×${cropH}`,
        cropPx: `x=${cropX}, y=${cropY}, w=${cropW}, h=${cropH}`,
        errorMsg: '—',
      }));

      if (parsedSequence.length === 0) {
        showToast('No roulette numbers detected in crop area. Check the crop region and try again.', 'error');
        setPipelineStatus('ocr_failed');
        setFlags((f) => ({ ...f, ocrScanCompleted: true, sequenceAwaitingConfirmation: false }));
      }
    } catch (err) {
      console.error('[ScreenOCR] OCR scan failed:', err);
      setPipelineStatus('ocr_failed');
      setDiagInfo((d) => ({ ...d, errorMsg: String(err) }));
      showToast('OCR scan failed. Adjust the crop area to cover only the number tiles.', 'error');
    }
  };

  // ── Confirm & Import ──
  const handleConfirmImport = async () => {
    if (editableSequence.length === 0) {
      setIsConfirmModalOpen(false);
      return;
    }

    // Determine chronological order based on user setting
    // CasinoScores: newest-first (leftmost = most recent)
    // So to import in chronological (oldest-first) order, we reverse if newest-first
    const chronological = isNewestFirst ? [...editableSequence].reverse() : [...editableSequence];

    console.debug('[ScreenOCR] Import decision:', {
      editableSequence,
      isNewestFirst,
      chronological,
      existingSpins: spins.length,
    });

    await importSpinsBatch(chronological, 'screen_capture');
    setNewlyImportedCount((prev) => prev + chronological.length);
    setLastConfirmedTime(Date.now());
    setLastConfirmedRow(editableSequence); // Store display-order row for monitoring de-duplication
    setFlags((f) => ({ ...f, historyImported: true, sequenceAwaitingConfirmation: false }));
    setPipelineStatus(isMonitoring ? 'monitoring_active' : 'history_imported');

    setDiagInfo((d) => ({
      ...d,
      lastDecision: `Imported ${chronological.length} spins (oldest-first): ${chronological.join(', ')}`,
    }));

    showToast(`Imported ${chronological.length} spins into active session`, 'success');
    setIsConfirmModalOpen(false);
  };

  // ── Toggle Monitoring ──
  const toggleMonitoring = () => {
    if (!isMonitoring) {
      if (lastConfirmedRow.length === 0) {
        showToast('Please perform a manual "Scan & Preview Sequence" and confirm import first, then start monitoring.', 'error');
        return;
      }
      setIsMonitoring(true);
      setPipelineStatus('monitoring_active');
      setFlags((f) => ({ ...f, liveMonitoringActive: true }));
      showToast('Live OCR Monitoring started. Checking for new spins every 5s.', 'success');
    } else {
      setIsMonitoring(false);
      setPipelineStatus(cropCalibrated ? 'history_imported' : 'sharing_active');
      setFlags((f) => ({ ...f, liveMonitoringActive: false }));
      showToast('Live OCR Monitoring stopped', 'info');
    }
  };

  // ── Continuous Monitoring Loop ──
  useEffect(() => {
    if (!isCapturing || !isMonitoring) return;

    const monitorInterval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !workerRef.current || video.videoWidth === 0 || video.readyState < 2) return;

      const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, cropBox);
      if (cropW <= 0 || cropH <= 0) return;

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      preprocessCanvasForOcr(ctx, cropW, cropH);

      try {
        const res = await workerRef.current.recognize(canvas);
        const words: any[] = res.data.words || [];

        const liveSeq = parseOcrWordsToSequence(
          words.map((w: any) => ({ text: w.text, bbox: w.bbox })),
          wheelType
        );

        setLastScannedTime(Date.now());

        if (liveSeq.length === 0) return;

        // Compare to last confirmed row to find new spins
        const newSpins = detectNewSpinsFromHistoryRows(lastConfirmedRow, liveSeq);

        if (newSpins === null) {
          // Ambiguous — pause and request review
          console.warn('[ScreenOCR] Monitoring: ambiguous overlap. Pausing auto-import. New row:', liveSeq);
          setPipelineStatus('monitoring_uncertain');
          setFlags((f) => ({ ...f, liveMonitoringActive: false }));
          setIsMonitoring(false);

          // Show manual review confirmation instead
          setDetectedSequence(liveSeq);
          setEditableSequence(liveSeq);
          setSnapshotDataUrl(null);
          setIsConfirmModalOpen(true);
          setFlags((f) => ({ ...f, sequenceAwaitingConfirmation: true }));
          showToast('Monitoring paused: spin sequence is ambiguous. Please review.', 'error');
          setDiagInfo((d) => ({
            ...d,
            lastDecision: 'PAUSED: Ambiguous overlap. Manual review required.',
            parsedSeq: liveSeq.join(', '),
          }));
          return;
        }

        if (newSpins.length === 0) {
          // No new spins since last confirmed scan
          setDiagInfo((d) => ({ ...d, lastDecision: `No new spins detected (last seq: ${liveSeq.join(', ')})` }));
          return;
        }

        // Import new spins in chronological order (already returned oldest-first)
        await importSpinsBatch(newSpins, 'screen_capture');
        setNewlyImportedCount((prev) => prev + newSpins.length);
        setLastConfirmedTime(Date.now());
        setLastConfirmedRow(liveSeq); // Update reference row
        setDiagInfo((d) => ({
          ...d,
          parsedSeq: liveSeq.join(', '),
          lastDecision: `Auto-imported ${newSpins.length} new spin(s): ${newSpins.join(', ')}`,
        }));
        showToast(`Live OCR: New spin detected → ${newSpins[newSpins.length - 1]}`, 'success');
      } catch (err) {
        // Silent retry on monitoring — don't abort, just log
        console.debug('[ScreenOCR] Monitoring scan error (will retry):', err);
      }
    }, 5000);

    return () => clearInterval(monitorInterval);
  }, [isCapturing, isMonitoring, cropBox, wheelType, lastConfirmedRow, importSpinsBatch]);

  // OCR spins from session
  const ocrSpins = spins.filter((s) => s.source === 'screen_capture');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header & Controls ── */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-[#D4AF37]" /> Live Screen Share OCR Capture
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Share your screen, drag to select the latest-spin tile row, then click Scan & Preview Sequence.
              Calibrated crop coordinates are mapped from source video resolution exactly.
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

        {/* ── Pipeline Status Flags (Separate Indicators) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          {[
            { label: 'Screen Sharing Active', ok: flags.screenSharingActive },
            { label: 'Crop Calibrated', ok: flags.cropCalibrated },
            { label: 'OCR Scan Completed', ok: flags.ocrScanCompleted },
            { label: 'Sequence Awaiting Confirmation', ok: flags.sequenceAwaitingConfirmation },
            { label: 'History Imported', ok: flags.historyImported },
            { label: 'Live Monitoring Active', ok: flags.liveMonitoringActive },
          ].map(({ label, ok }) => (
            <div
              key={label}
              className={`flex items-center gap-2 p-2 rounded-lg border ${
                ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800/30 border-slate-700/30 text-slate-500'
              }`}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${ok ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {label}
            </div>
          ))}
        </div>

        {/* ── Current Pipeline Status ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080B12] rounded-xl border border-[#232D3F] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider border ${STATUS_COLORS[pipelineStatus]}`}>
              {STATUS_LABELS[pipelineStatus]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>Last Scan: {lastScannedTime ? new Date(lastScannedTime).toLocaleTimeString() : 'Never'}</span>
            <span>Session Spins via OCR: <strong className="text-[#D4AF37]">{ocrSpins.length}</strong></span>
            <span>This Run: <strong className="text-emerald-400">{newlyImportedCount}</strong></span>
          </div>
        </div>

        {/* ── Video + Crop Overlay + Preview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Main Video View */}
          <div
            ref={videoContainerRef}
            className={`lg:col-span-8 relative rounded-2xl border border-[#232D3F] bg-[#080B12] overflow-hidden min-h-[320px] flex items-center justify-center ${dragMode ? 'cursor-crosshair' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <video
              ref={videoRef}
              className="w-full max-h-[400px] object-contain"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <Monitor className="h-12 w-12 text-slate-600" />
                <span>Screen sharing inactive. Click "Start Screen Share" above.</span>
              </div>
            )}

            {/* Crop Overlay Box — positioned relative to rendered video area */}
            {isCapturing && (
              <div
                className="border-2 border-[#D4AF37] bg-amber-500/10 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                style={getOverlayStyle()}
              >
                <span className="absolute top-1 left-2 text-[10px] font-bold text-[#D4AF37] bg-slate-950/90 px-2 py-0.5 rounded border border-[#D4AF37]/50 shadow whitespace-nowrap">
                  OCR Region — Latest Spin Tile Row
                </span>
              </div>
            )}

            {/* Drag mode hint */}
            {isCapturing && dragMode && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/90 text-amber-400 text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#D4AF37]/40 pointer-events-none">
                Drag to select the spin tile row
              </div>
            )}
          </div>

          {/* Right Panel: Preview + Controls */}
          <div className="lg:col-span-4 bg-[#080B12] p-4 rounded-2xl border border-[#232D3F] space-y-4 flex flex-col">

            {/* Live Cropped Region Preview */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-[#D4AF37]" /> Live Cropped Region Preview
              </label>
              <div className="rounded-xl border border-[#232D3F] bg-[#10151F] h-28 flex items-center justify-center overflow-hidden">
                {isCapturing ? (
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-[11px] text-slate-500 italic">No crop active</span>
                )}
              </div>
              {isCapturing && (
                <p className="text-[10px] text-slate-500 text-center">
                  This shows exactly what OCR will analyze
                </p>
              )}
            </div>

            {/* Crop Mode Toggle */}
            {isCapturing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setDragMode(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${!dragMode ? 'bg-[#D4AF37] text-slate-950 border-transparent' : 'text-slate-400 border-slate-700 hover:text-slate-200'}`}
                >
                  Slider Mode
                </button>
                <button
                  onClick={() => setDragMode(true)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${dragMode ? 'bg-[#D4AF37] text-slate-950 border-transparent' : 'text-slate-400 border-slate-700 hover:text-slate-200'}`}
                >
                  <MousePointer className="h-3 w-3" /> Drag Select
                </button>
              </div>
            )}

            {/* Slider Controls (visible in slider mode) */}
            {isCapturing && !dragMode && (
              <div className="space-y-2 text-xs">
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">
                      {key === 'x' ? 'Left' : key === 'y' ? 'Top' : key === 'width' ? 'Width' : 'Height'} ({cropBox[key].toFixed(0)}% of video)
                    </label>
                    <input
                      type="range"
                      min={key === 'width' ? 5 : key === 'height' ? 3 : 0}
                      max={key === 'x' || key === 'y' ? 90 : 100}
                      value={cropBox[key]}
                      onChange={(e) => {
                        setCropBox((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }));
                        setCropCalibrated(true);
                        setPipelineStatus('crop_calibrated');
                        setFlags((f) => ({ ...f, cropCalibrated: true }));
                      }}
                      className="w-full accent-[#D4AF37] h-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Display order toggle */}
            {isCapturing && (
              <div className="flex items-center gap-2 text-[11px] bg-[#10151F] p-2 rounded-lg border border-[#232D3F]">
                <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="text-slate-400">Tile order:</span>
                <button
                  onClick={() => setIsNewestFirst(!isNewestFirst)}
                  className="font-bold text-amber-300 hover:text-amber-200"
                >
                  {isNewestFirst ? 'Newest Left →' : '← Newest Right'}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            {isCapturing && (
              <div className="space-y-2 pt-2 border-t border-[#232D3F]">
                <button
                  onClick={handleScanSequenceForConfirmation}
                  disabled={pipelineStatus === 'scanning'}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {pipelineStatus === 'scanning' ? (
                    <><RefreshCw className="h-4 w-4 animate-spin text-amber-400" /> Scanning...</>
                  ) : (
                    <><Crop className="h-4 w-4 text-[#D4AF37]" /> Scan &amp; Preview Sequence</>
                  )}
                </button>

                {flags.historyImported && (
                  <>
                    {!isMonitoring ? (
                      <button
                        onClick={toggleMonitoring}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Radio className="h-4 w-4" /> Start Live OCR Monitoring
                      </button>
                    ) : (
                      <button
                        onClick={toggleMonitoring}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <Square className="h-4 w-4 fill-current" /> Stop Live Monitoring
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Diagnostic Log (collapsible) ── */}
        {isCapturing && (
          <details className="rounded-xl border border-[#232D3F] bg-[#080B12] text-[10px] font-mono text-slate-400">
            <summary className="p-3 cursor-pointer hover:text-slate-200 select-none font-bold text-xs text-slate-300">
              Diagnostic Log (click to expand)
            </summary>
            <div className="p-3 space-y-1 border-t border-[#232D3F]">
              <div><span className="text-slate-500">Source Video Dims:</span> {diagInfo.videoSrc}</div>
              <div><span className="text-slate-500">Rendered Preview Dims:</span> {diagInfo.renderDims}</div>
              <div><span className="text-slate-500">Computed Crop Pixels:</span> {diagInfo.cropPx}</div>
              <div><span className="text-slate-500">Cropped Image Dims:</span> {diagInfo.croppedImageDims}</div>
              <div><span className="text-slate-500">OCR Raw Output:</span> {diagInfo.ocrRaw}</div>
              <div><span className="text-slate-500">Parsed Sequence:</span> {diagInfo.parsedSeq}</div>
              <div><span className="text-slate-500">Import Decision:</span> {diagInfo.lastDecision}</div>
              <div><span className="text-slate-500">Error:</span> <span className="text-rose-400">{diagInfo.errorMsg}</span></div>
            </div>
          </details>
        )}
      </div>

      {/* ── Review OCR Spins in Session ── */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#D4AF37]" /> OCR-Imported Spins in Session ({ocrSpins.length})
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Review and remove incorrectly OCR-detected spins. Total session spins: <strong className="text-amber-300">{spins.length}</strong>
          </p>
        </div>

        {ocrSpins.length === 0 ? (
          <p className="text-xs text-slate-500 italic bg-[#080B12] p-4 rounded-xl border border-[#232D3F] text-center">
            No OCR spins currently imported. Use "Scan &amp; Preview Sequence" above.
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto py-2">
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

      {/* ── Confirmation Modal ── */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between pb-3 border-b border-[#232D3F]">
              <h3 className="text-base font-bold text-slate-100">
                {pipelineStatus === 'monitoring_uncertain'
                  ? '⚠️ Monitoring Paused — Sequence Review Required'
                  : 'Confirm OCR-Detected Spin Sequence'}
              </h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cropped Image Preview */}
            {snapshotDataUrl && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">
                  Actual cropped image sent to OCR:
                </label>
                <img
                  src={snapshotDataUrl}
                  alt="Cropped OCR region — actual source pixels"
                  className="w-full h-auto object-contain rounded-xl border border-[#232D3F] bg-[#080B12]"
                />
              </div>
            )}

            {/* Display-Order Toggle */}
            <div className="flex items-center gap-3 text-xs bg-[#080B12] p-3 rounded-xl border border-blue-500/30">
              <Info className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-300 font-bold">Tile display order: </span>
                <button
                  onClick={() => setIsNewestFirst(!isNewestFirst)}
                  className="text-amber-300 font-bold hover:underline"
                >
                  {isNewestFirst ? 'Newest shown first (leftmost) — will import reversed (oldest→newest)' : 'Oldest shown first (leftmost) — will import left-to-right'}
                </button>
              </div>
            </div>

            {/* Detected Numbers (editable) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Detected in visual order ({editableSequence.length} numbers):
              </label>

              <div className="bg-[#080B12] p-3 rounded-xl border border-[#232D3F] flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {editableSequence.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-amber-400 italic">
                    <AlertTriangle className="h-4 w-4" />
                    No roulette numbers detected in crop region. Adjust the crop box and try again.
                  </div>
                ) : (
                  editableSequence.map((num, idx) => (
                    <div
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs text-white border shadow ${
                        getPocketColor(num) === 'red'
                          ? 'bg-red-700 border-red-500'
                          : getPocketColor(num) === 'black'
                          ? 'bg-slate-900 border-slate-600'
                          : 'bg-emerald-700 border-emerald-500'
                      }`}
                    >
                      <span className="text-[10px] text-white/50 font-normal">#{idx + 1}</span>
                      <span>{num}</span>
                      <button
                        onClick={() => setEditableSequence(editableSequence.filter((_, i) => i !== idx))}
                        className="hover:text-rose-300 ml-0.5"
                        title="Remove this number"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Low-confidence warnings */}
              {ocrWordConfidences.length > 0 && (
                <div className="flex items-start gap-2 text-[11px] bg-amber-950/20 border border-amber-500/20 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Low-confidence OCR tiles</strong> (verify these):
                    {ocrWordConfidences.slice(0, 5).map((w, i) => (
                      <span key={i} className="ml-1 text-slate-400">
                        "{w.text}"({Math.round(w.confidence)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add missing number */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add missing number…"
                  value={newNumberInput}
                  onChange={(e) => setNewNumberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNumberInput.trim()) {
                      setEditableSequence([...editableSequence, newNumberInput.trim()]);
                      setNewNumberInput('');
                    }
                  }}
                  className="flex-1 bg-[#080B12] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold"
                />
                <button
                  onClick={() => {
                    if (newNumberInput.trim()) {
                      setEditableSequence([...editableSequence, newNumberInput.trim()]);
                      setNewNumberInput('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-slate-950 text-xs font-bold hover:bg-amber-400"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Import preview */}
            {editableSequence.length > 0 && (
              <div className="rounded-xl bg-[#080B12] border border-emerald-500/20 p-3 text-[11px] text-slate-300">
                <span className="text-emerald-400 font-bold">Chronological import order: </span>
                {(isNewestFirst ? [...editableSequence].reverse() : [...editableSequence]).join(' → ')}
              </div>
            )}

            {/* Safety disclaimer */}
            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-[#080B12] border border-[#232D3F] p-3 rounded-xl">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              Only confirmed visible results are imported. No fabricated or assumed results are added.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232D3F]">
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setPipelineStatus(isCapturing ? (cropCalibrated ? 'crop_calibrated' : 'sharing_active') : 'idle');
                  setFlags((f) => ({ ...f, sequenceAwaitingConfirmation: false }));
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={editableSequence.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Import ({editableSequence.length} Spins)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
