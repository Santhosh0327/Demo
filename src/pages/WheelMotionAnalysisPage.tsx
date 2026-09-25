import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Compass,
  Disc,
  Eye,
  Gauge,
  Info,
  Maximize2,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Square,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateVideoCropCoordinates } from '../utils/screenOcrHelper';
import {
  DEFAULT_MOTION_CALIBRATION,
  MotionCalibrationConfig,
  MotionMetrics,
  WheelMotionTracker,
} from '../utils/wheelMotionTracker';

export const WheelMotionAnalysisPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenProcessingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const trackerRef = useRef<WheelMotionTracker | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Wheel Crop Box (percentages relative to video stream)
  const [wheelCropBox, setWheelCropBox] = useState({ x: 15, y: 15, width: 70, height: 70 });

  // Calibration Config
  const [calibration, setCalibration] = useState<MotionCalibrationConfig>({
    ...DEFAULT_MOTION_CALIBRATION,
  });

  const [showCalibrationDrawer, setShowCalibrationDrawer] = useState(false);

  // Live Physics Metrics
  const [metrics, setMetrics] = useState<MotionMetrics | null>(null);
  const [speedHistory, setSpeedHistory] = useState<
    { timeSec: number; ballSpeed: number; wheelSpeed: number; relativeSpeed: number }[]
  >([]);

  // Initialize tracker instance
  useEffect(() => {
    trackerRef.current = new WheelMotionTracker(calibration);
    return () => {
      if (trackerRef.current) trackerRef.current.reset();
    };
  }, []);

  // Sync calibration updates to tracker
  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.updateCalibration(calibration);
    }
  }, [calibration]);

  // Start Screen Capture
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
      setIsAnalyzing(true);

      mediaStream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
    } catch (err) {
      console.error('Screen capture permission error:', err);
    }
  };

  const stopScreenCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setIsAnalyzing(false);
    if (trackerRef.current) trackerRef.current.reset();
    setMetrics(null);
    setSpeedHistory([]);
  };

  // Main Computer-Vision Processing & Overlay Animation Loop
  useEffect(() => {
    if (!isCapturing || !isAnalyzing) return;

    let animFrameId: number;
    let startTime = performance.now();

    const renderFrame = () => {
      const video = videoRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      const hiddenCanvas = hiddenProcessingCanvasRef.current;

      if (video && overlayCanvas && hiddenCanvas && trackerRef.current && video.videoWidth > 0) {
        const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(video, wheelCropBox);

        if (cropW > 0 && cropH > 0) {
          // Prepare hidden canvas for pixel data processing
          hiddenCanvas.width = cropW;
          hiddenCanvas.height = cropH;
          const hctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

          if (hctx) {
            hctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            // Process motion analysis metrics
            const currentMetrics = trackerRef.current.processFrame(
              hctx,
              cropW,
              cropH,
              performance.now()
            );

            setMetrics(currentMetrics);

            // Append to speed chart history if tracking is active
            if (currentMetrics.isTrackingAvailable) {
              const elapsedSec = (performance.now() - startTime) / 1000;
              setSpeedHistory((prev) => {
                const next = [
                  ...prev,
                  {
                    timeSec: parseFloat(elapsedSec.toFixed(1)),
                    ballSpeed: parseFloat(Math.abs(currentMetrics.ballSpeedDegPerSec).toFixed(1)),
                    wheelSpeed: parseFloat(Math.abs(currentMetrics.wheelSpeedDegPerSec).toFixed(1)),
                    relativeSpeed: parseFloat(Math.abs(currentMetrics.relativeSpeedDegPerSec).toFixed(1)),
                  },
                ];
                return next.slice(-40); // keep last 40 data points
              });
            }

            // Draw Visual Overlay
            overlayCanvas.width = cropW;
            overlayCanvas.height = cropH;
            const octx = overlayCanvas.getContext('2d');

            if (octx) {
              // 1. Draw Cropped Video Frame
              octx.drawImage(hiddenCanvas, 0, 0);

              // 2. Draw Center Crosshair
              const { centerPixelX: cx, centerPixelY: cy, outerRadiusPixel: rOut, innerRadiusPixel: rIn } = currentMetrics;

              octx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
              octx.lineWidth = 1.5;
              octx.beginPath();
              octx.moveTo(cx - 15, cy);
              octx.lineTo(cx + 15, cy);
              octx.moveTo(cx, cy - 15);
              octx.lineTo(cx, cy + 15);
              octx.stroke();

              // Center Dot
              octx.fillStyle = '#D4AF37';
              octx.beginPath();
              octx.arc(cx, cy, 3, 0, 2 * Math.PI);
              octx.fill();

              // 3. Draw Outer & Inner Wheel Boundary Circles
              octx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
              octx.setLineDash([4, 4]);
              octx.beginPath();
              octx.ellipse(cx, cy, rOut, rOut * calibration.tiltRatio, 0, 0, 2 * Math.PI);
              octx.stroke();

              octx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
              octx.beginPath();
              octx.ellipse(cx, cy, rIn, rIn * calibration.tiltRatio, 0, 0, 2 * Math.PI);
              octx.stroke();
              octx.setLineDash([]); // reset

              // 4. Draw Ball Trajectory Trail
              if (currentMetrics.ballTrajectory.length > 1) {
                octx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                octx.lineWidth = 2;
                octx.beginPath();
                currentMetrics.ballTrajectory.forEach((pt, idx) => {
                  if (idx === 0) octx.moveTo(pt.x, pt.y);
                  else octx.lineTo(pt.x, pt.y);
                });
                octx.stroke();
              }

              // 5. Draw Detected Ball Marker & Polar Angle Ray
              if (currentMetrics.ballTracked && currentMetrics.ballTrajectory.length > 0) {
                const latestBall = currentMetrics.ballTrajectory[currentMetrics.ballTrajectory.length - 1];

                // Polar Angle Line from center to ball
                octx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                octx.lineWidth = 1;
                octx.beginPath();
                octx.moveTo(cx, cy);
                octx.lineTo(latestBall.x, latestBall.y);
                octx.stroke();

                // Ball Glowing Ring
                octx.fillStyle = '#EF4444';
                octx.beginPath();
                octx.arc(latestBall.x, latestBall.y, 6, 0, 2 * Math.PI);
                octx.fill();

                octx.strokeStyle = '#FFFFFF';
                octx.lineWidth = 2;
                octx.beginPath();
                octx.arc(latestBall.x, latestBall.y, 9, 0, 2 * Math.PI);
                octx.stroke();
              }
            }
          }
        }
      }

      animFrameId = requestAnimationFrame(renderFrame);
    };

    animFrameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animFrameId);
  }, [isCapturing, isAnalyzing, wheelCropBox, calibration]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <Activity className="h-6 w-6 text-[#D4AF37]" />
              LIVE WHEEL MOTION ANALYSIS &amp; KINEMATICS
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Computer-vision tracking for physical wheel center, rotor angular speed, ball position, angular velocity, and relative deceleration using real-time frame timestamps.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCalibrationDrawer(!showCalibrationDrawer)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
            >
              <Sliders className="h-4 w-4 text-[#D4AF37]" />
              {showCalibrationDrawer ? 'Hide Calibration' : 'Calibrate Wheel Geometry'}
            </button>

            {!isCapturing ? (
              <button
                onClick={startScreenCapture}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-md transition-all"
              >
                <Play className="h-4 w-4 fill-current" /> Start Live Stream Motion Analysis
              </button>
            ) : (
              <button
                onClick={stopScreenCapture}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
              >
                <Square className="h-4 w-4 fill-current" /> Stop Stream Analysis
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="mt-4 pt-3 border-t border-[#232D3F]/60 flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>Educational Video Measurement Notice:</strong> Ordinary screen-share video cannot produce exact physical speeds in m/s or guaranteed next-pocket predictions. Measurements are angular ($\theta/s$, rev/s, RPM). Motion data is strictly isolated from live winning history.
          </span>
        </div>
      </div>

      {/* Calibration Drawer (If open) */}
      {showCalibrationDrawer && (
        <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#D4AF37]" /> Wheel Geometry &amp; Vision Calibration
            </h3>
            <button
              onClick={() => setCalibration({ ...DEFAULT_MOTION_CALIBRATION })}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-400 flex justify-between">
                <span>Center X Offset ({calibration.centerXRatio}%)</span>
              </label>
              <input
                type="range"
                min="10"
                max="90"
                value={calibration.centerXRatio}
                onChange={(e) => setCalibration({ ...calibration, centerXRatio: Number(e.target.value) })}
                className="w-full accent-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-slate-400 flex justify-between">
                <span>Center Y Offset ({calibration.centerYRatio}%)</span>
              </label>
              <input
                type="range"
                min="10"
                max="90"
                value={calibration.centerYRatio}
                onChange={(e) => setCalibration({ ...calibration, centerYRatio: Number(e.target.value) })}
                className="w-full accent-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-slate-400 flex justify-between">
                <span>Outer Radius ({calibration.radiusRatio}%)</span>
              </label>
              <input
                type="range"
                min="15"
                max="50"
                value={calibration.radiusRatio}
                onChange={(e) => setCalibration({ ...calibration, radiusRatio: Number(e.target.value) })}
                className="w-full accent-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-slate-400 flex justify-between">
                <span>Perspective Tilt ({calibration.tiltRatio.toFixed(2)})</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={calibration.tiltRatio}
                onChange={(e) => setCalibration({ ...calibration, tiltRatio: Number(e.target.value) })}
                className="w-full accent-[#D4AF37]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Video Stream & Vision Overlay Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video & Live Crop Overlay (7 cols) */}
        <div className="lg:col-span-7 bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#D4AF37]" />
              Computer-Vision Wheel Overlay &amp; Tracking Path
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                metrics?.isTrackingAvailable
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              {metrics?.trackingStatus ? metrics.trackingStatus.replace('_', ' ') : 'Inactive'}
            </span>
          </div>

          <div className="relative rounded-2xl border border-[#232D3F] bg-[#080B12] min-h-[340px] flex items-center justify-center overflow-hidden">
            <video ref={videoRef} className="hidden" muted />
            <canvas ref={hiddenProcessingCanvasRef} className="hidden" />
            <canvas ref={overlayCanvasRef} className="w-full h-full max-h-[380px] object-contain" />

            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <Disc className="h-12 w-12 text-slate-600 animate-spin-slow" />
                <span>Click "Start Live Stream Motion Analysis" to initialize video tracking.</span>
              </div>
            )}
          </div>

          {/* Wheel Crop Controls */}
          {isCapturing && (
            <div className="bg-[#080B12] p-3 rounded-xl border border-[#232D3F] space-y-2 text-xs">
              <span className="font-bold text-slate-300 block mb-1">
                Wheel Crop Region Adjustments (Independent of OCR)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400">X ({wheelCropBox.x}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={wheelCropBox.x}
                    onChange={(e) => setWheelCropBox({ ...wheelCropBox, x: Number(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Y ({wheelCropBox.y}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={wheelCropBox.y}
                    onChange={(e) => setWheelCropBox({ ...wheelCropBox, y: Number(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Width ({wheelCropBox.width}%)</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={wheelCropBox.width}
                    onChange={(e) => setWheelCropBox({ ...wheelCropBox, width: Number(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Height ({wheelCropBox.height}%)</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={wheelCropBox.height}
                    onChange={(e) => setWheelCropBox({ ...wheelCropBox, height: Number(e.target.value) })}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Real-time Gauges & Physics Dashboard (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Status & Confidence Card */}
          <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tracking Confidence
              </span>
              <span className="font-mono text-sm font-bold text-[#D4AF37]">
                {metrics ? `${metrics.confidencePercentage}%` : '0%'}
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (metrics?.confidencePercentage || 0) >= 60
                    ? 'bg-emerald-500'
                    : (metrics?.confidencePercentage || 0) >= 30
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${metrics?.confidencePercentage || 0}%` }}
              />
            </div>

            {metrics?.warningMessage && (
              <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                {metrics.warningMessage}
              </div>
            )}
          </div>

          {/* Real-time Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Ball Speed */}
            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Ball Angular Speed
              </span>
              <div className="text-xl font-extrabold font-mono text-red-400 mt-1">
                {metrics?.ballTracked
                  ? Math.abs(metrics.ballSpeedDegPerSec).toFixed(1)
                  : '0.0'}{' '}
                <span className="text-xs text-slate-400 font-sans">&deg;/s</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex justify-between font-mono">
                <span>{metrics?.ballRevPerSec.toFixed(2) || '0.00'} rev/s</span>
                <span className="font-bold text-slate-200">{metrics?.ballDirection || 'N/A'}</span>
              </div>
            </div>

            {/* Wheel Speed */}
            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Wheel Rotor Speed
              </span>
              <div className="text-xl font-extrabold font-mono text-[#D4AF37] mt-1">
                {metrics?.wheelTracked
                  ? Math.abs(metrics.wheelSpeedDegPerSec).toFixed(1)
                  : '0.0'}{' '}
                <span className="text-xs text-slate-400 font-sans">&deg;/s</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex justify-between font-mono">
                <span>{metrics?.wheelRpm.toFixed(1) || '0.0'} RPM</span>
                <span className="font-bold text-slate-200">{metrics?.wheelDirection || 'N/A'}</span>
              </div>
            </div>

            {/* Relative Speed */}
            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Relative Ball-Wheel Speed
              </span>
              <div className="text-xl font-extrabold font-mono text-indigo-400 mt-1">
                {metrics
                  ? Math.abs(metrics.relativeSpeedDegPerSec).toFixed(1)
                  : '0.0'}{' '}
                <span className="text-xs text-slate-400 font-sans">&deg;/s</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Dir: <strong className="text-slate-200">{metrics?.relativeDirection || 'N/A'}</strong>
              </div>
            </div>

            {/* Ball Deceleration */}
            <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Ball Deceleration
              </span>
              <div className="text-xl font-extrabold font-mono text-amber-400 mt-1">
                {metrics?.ballTracked
                  ? Math.abs(metrics.ballDecelerationDegPerSec2).toFixed(1)
                  : '0.0'}{' '}
                <span className="text-xs text-slate-400 font-sans">&deg;/s&sup2;</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Frictional decay rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Angular Velocity Time-Series Chart */}
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#D4AF37]" />
          Real-Time Angular Velocity Time-Series (&deg;/s)
        </h3>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={speedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232D3F" vertical={false} />
              <XAxis dataKey="timeSec" stroke="#64748B" fontSize={10} label={{ value: 'Elapsed (s)', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 10 }} />
              <YAxis stroke="#64748B" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#080B12', borderColor: '#232D3F', borderRadius: '12px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
              <Line type="monotone" dataKey="ballSpeed" name="Ball Speed (°/s)" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="wheelSpeed" name="Wheel Speed (°/s)" stroke="#D4AF37" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="relativeSpeed" name="Relative Speed (°/s)" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WheelMotionAnalysisPage;
