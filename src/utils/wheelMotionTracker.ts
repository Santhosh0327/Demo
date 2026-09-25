export interface MotionCalibrationConfig {
  centerXRatio: number; // 0-100%, default 50
  centerYRatio: number; // 0-100%, default 50
  radiusRatio: number; // 10-50%, default 45
  innerRadiusRatio: number; // 10-80% of outer radius, default 40
  tiltRatio: number; // Y-axis perspective compression (0.5 to 1.5), default 1.0
  minLuminance: number; // 0-255 brightness threshold, default 200
  minBlobSize: number; // min pixel count for ball, default 3
  maxBlobSize: number; // max pixel count for ball, default 300
}

export const DEFAULT_MOTION_CALIBRATION: MotionCalibrationConfig = {
  centerXRatio: 50,
  centerYRatio: 50,
  radiusRatio: 45,
  innerRadiusRatio: 40,
  tiltRatio: 1.0,
  minLuminance: 200,
  minBlobSize: 3,
  maxBlobSize: 300,
};

export interface BallTrajectoryPoint {
  x: number;
  y: number;
  angleDeg: number;
  timestamp: number;
  speedDegPerSec: number;
}

export interface MotionMetrics {
  timestamp: number;
  deltaSec: number;
  isStreamActive: boolean;
  isTrackingAvailable: boolean;
  trackingStatus: 'tracking' | 'low_confidence' | 'paused' | 'stream_interrupted' | 'calibration_mode';
  confidencePercentage: number; // 0 to 100
  warningMessage?: string;

  // Ball Physics
  ballTracked: boolean;
  ballAngleDeg: number; // 0 to 360
  ballSpeedDegPerSec: number; // deg/s
  ballRevPerSec: number; // rev/s
  ballDecelerationDegPerSec2: number; // deg/s^2
  ballDirection: 'CW' | 'CCW' | 'STATIONARY';
  ballTrajectory: BallTrajectoryPoint[];

  // Wheel Rotor Physics
  wheelTracked: boolean;
  wheelAngleDeg: number; // 0 to 360
  wheelSpeedDegPerSec: number; // deg/s
  wheelRpm: number; // RPM
  wheelDirection: 'CW' | 'CCW' | 'STATIONARY';

  // Relative Motion
  relativeSpeedDegPerSec: number; // signed ball - wheel speed
  relativeDirection: 'CW' | 'CCW' | 'SAME_SPEED';

  // Geometry
  centerPixelX: number;
  centerPixelY: number;
  outerRadiusPixel: number;
  innerRadiusPixel: number;
}

/**
 * Normalizes an angle difference handling 360 degree wraparound correctly
 * returns delta in [-180, +180]
 */
export function wrapAngleDelta(currentDeg: number, previousDeg: number): number {
  let delta = (currentDeg - previousDeg) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

/**
 * Motion tracker class that maintains temporal state across video frames
 */
export class WheelMotionTracker {
  private calibration: MotionCalibrationConfig;
  private prevTimestamp: number | null = null;

  // Ball state
  private prevBallAngle: number | null = null;
  private prevBallSpeed: number = 0;
  private ballTrajectory: BallTrajectoryPoint[] = [];
  private untrackedBallFrames: number = 0;

  // Wheel rotor state
  private prevWheelProfile: number[] | null = null;
  private prevWheelAngle: number = 0;
  private prevWheelSpeed: number = 0;

  // Frame diff freeze detection
  private prevImageData: Uint8ClampedArray | null = null;

  constructor(calibration: MotionCalibrationConfig = DEFAULT_MOTION_CALIBRATION) {
    this.calibration = { ...calibration };
  }

  public updateCalibration(newCalibration: Partial<MotionCalibrationConfig>): void {
    this.calibration = { ...this.calibration, ...newCalibration };
  }

  public getCalibration(): MotionCalibrationConfig {
    return { ...this.calibration };
  }

  public reset(): void {
    this.prevTimestamp = null;
    this.prevBallAngle = null;
    this.prevBallSpeed = 0;
    this.ballTrajectory = [];
    this.untrackedBallFrames = 0;
    this.prevWheelProfile = null;
    this.prevWheelAngle = 0;
    this.prevWheelSpeed = 0;
    this.prevImageData = null;
  }

  /**
   * Processes a video frame canvas context and returns real-time motion metrics
   */
  public processFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number = performance.now()
  ): MotionMetrics {
    const cal = this.calibration;

    // Center & Radius geometry
    const cx = (width * cal.centerXRatio) / 100;
    const cy = (height * cal.centerYRatio) / 100;
    const rOut = (Math.min(width, height) * cal.radiusRatio) / 100;
    const rIn = (rOut * cal.innerRadiusRatio) / 100;
    const tilt = cal.tiltRatio > 0 ? cal.tiltRatio : 1.0;

    // Time delta calculation
    let deltaSec = 0;
    if (this.prevTimestamp !== null) {
      deltaSec = (timestamp - this.prevTimestamp) / 1000;
    }
    this.prevTimestamp = timestamp;

    // Stream Interruption & Frame Freeze Check
    if (width === 0 || height === 0) {
      return this.createUnavailableMetrics(cx, cy, rOut, rIn, 'Video stream width/height is zero');
    }

    if (deltaSec > 0.5) {
      // Large timestamp gap (drop/pause) -> reset motion state
      this.reset();
      this.prevTimestamp = timestamp;
      return this.createUnavailableMetrics(cx, cy, rOut, rIn, 'Frame drop or stream pause detected');
    }

    if (deltaSec <= 0) {
      deltaSec = 1 / 30; // fallback default ~33ms if timestamp non-increasing
    }

    // Get pixel buffer
    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch (e) {
      return this.createUnavailableMetrics(cx, cy, rOut, rIn, 'Cannot access video canvas pixel data');
    }

    const data = imageData.data;

    // Frame Freeze / Static Stream Check (pixel diff)
    let totalPixelDiff = 0;
    if (this.prevImageData && this.prevImageData.length === data.length) {
      const step = 16; // sample every 4th pixel
      for (let i = 0; i < data.length; i += step) {
        totalPixelDiff += Math.abs(data[i] - this.prevImageData[i]);
      }
    }
    this.prevImageData = new Uint8ClampedArray(data);

    // If stream is completely frozen (diff ~ 0)
    if (totalPixelDiff < 100 && this.prevImageData !== null) {
      return {
        timestamp,
        deltaSec,
        isStreamActive: true,
        isTrackingAvailable: false,
        trackingStatus: 'paused',
        confidencePercentage: 0,
        warningMessage: 'Video stream frozen or paused',
        ballTracked: false,
        ballAngleDeg: 0,
        ballSpeedDegPerSec: 0,
        ballRevPerSec: 0,
        ballDecelerationDegPerSec2: 0,
        ballDirection: 'STATIONARY',
        ballTrajectory: this.ballTrajectory,
        wheelTracked: false,
        wheelAngleDeg: 0,
        wheelSpeedDegPerSec: 0,
        wheelRpm: 0,
        wheelDirection: 'STATIONARY',
        relativeSpeedDegPerSec: 0,
        relativeDirection: 'SAME_SPEED',
        centerPixelX: cx,
        centerPixelY: cy,
        outerRadiusPixel: rOut,
        innerRadiusPixel: rIn,
      };
    }

    // 1. Wheel Rotor Profile Sampling & Angular Speed
    const rotorRadius = rOut * 0.65;
    const numSamples = 180; // 2 deg per sample
    const currentWheelProfile: number[] = new Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const phi = (2 * Math.PI * i) / numSamples;
      const px = Math.round(cx + rotorRadius * Math.cos(phi));
      const py = Math.round(cy + rotorRadius * Math.sin(phi) * tilt);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const pIdx = (py * width + px) * 4;
        // Grayscale intensity
        currentWheelProfile[i] = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];
      } else {
        currentWheelProfile[i] = 0;
      }
    }

    let wheelSpeedDegPerSec = 0;
    let wheelAngleDeg = this.prevWheelAngle;
    let wheelTracked = false;

    if (this.prevWheelProfile) {
      // Find shift delta in [-10, +10] steps (-20 deg to +20 deg)
      let bestShift = 0;
      let minSsd = Infinity;

      for (let shift = -10; shift <= 10; shift++) {
        let ssd = 0;
        for (let i = 0; i < numSamples; i++) {
          const shiftedIdx = (i + shift + numSamples) % numSamples;
          const diff = currentWheelProfile[i] - this.prevWheelProfile[shiftedIdx];
          ssd += diff * diff;
        }
        if (ssd < minSsd) {
          minSsd = ssd;
          bestShift = shift;
        }
      }

      const deltaWheelDeg = bestShift * 2; // 2 deg per step
      wheelSpeedDegPerSec = deltaWheelDeg / deltaSec;
      wheelAngleDeg = (this.prevWheelAngle + deltaWheelDeg + 360) % 360;
      wheelTracked = true;
    }
    this.prevWheelProfile = currentWheelProfile;
    this.prevWheelAngle = wheelAngleDeg;

    const wheelRpm = (Math.abs(wheelSpeedDegPerSec) / 360) * 60;
    const wheelDir: 'CW' | 'CCW' | 'STATIONARY' =
      wheelSpeedDegPerSec > 1.5 ? 'CW' : wheelSpeedDegPerSec < -1.5 ? 'CCW' : 'STATIONARY';

    // 2. Ball Detection in Annular Region
    let bestBallX = -1;
    let bestBallY = -1;
    let maxLuma = 0;
    let candidateCount = 0;

    // Scan annular region
    const minR2 = rIn * rIn;
    const maxR2 = rOut * rOut;

    for (let y = Math.max(0, Math.floor(cy - rOut * tilt)); y <= Math.min(height - 1, Math.ceil(cy + rOut * tilt)); y += 2) {
      const dy = (y - cy) / tilt;
      for (let x = Math.max(0, Math.floor(cx - rOut)); x <= Math.min(width - 1, Math.ceil(cx + rOut)); x += 2) {
        const dx = x - cx;
        const dist2 = dx * dx + dy * dy;
        if (dist2 >= minR2 && dist2 <= maxR2) {
          const pIdx = (y * width + x) * 4;
          const luma = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];
          if (luma >= cal.minLuminance) {
            candidateCount++;
            if (luma > maxLuma) {
              maxLuma = luma;
              bestBallX = x;
              bestBallY = y;
            }
          }
        }
      }
    }

    let ballTracked = false;
    let ballAngleDeg = 0;
    let ballSpeedDegPerSec = 0;
    let ballDecel = 0;

    if (bestBallX !== -1 && bestBallY !== -1) {
      this.untrackedBallFrames = 0;
      ballTracked = true;

      // Ball polar angle relative to center
      const rawAngleRad = Math.atan2((bestBallY - cy) / tilt, bestBallX - cx);
      let angleDeg = (rawAngleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      ballAngleDeg = angleDeg;

      if (this.prevBallAngle !== null) {
        const deltaAngle = wrapAngleDelta(ballAngleDeg, this.prevBallAngle);
        ballSpeedDegPerSec = deltaAngle / deltaSec;

        if (deltaSec > 0 && this.prevBallSpeed !== 0) {
          ballDecel = (Math.abs(ballSpeedDegPerSec) - Math.abs(this.prevBallSpeed)) / deltaSec;
        }
      }

      this.prevBallAngle = ballAngleDeg;
      this.prevBallSpeed = ballSpeedDegPerSec;

      // Append point to trajectory
      this.ballTrajectory.push({
        x: bestBallX,
        y: bestBallY,
        angleDeg: ballAngleDeg,
        timestamp,
        speedDegPerSec: ballSpeedDegPerSec,
      });
      if (this.ballTrajectory.length > 30) {
        this.ballTrajectory.shift();
      }
    } else {
      this.untrackedBallFrames++;
      if (this.untrackedBallFrames > 5) {
        ballTracked = false;
        this.prevBallAngle = null;
        this.prevBallSpeed = 0;
      }
    }

    const ballRevPerSec = Math.abs(ballSpeedDegPerSec) / 360;
    const ballDir: 'CW' | 'CCW' | 'STATIONARY' =
      ballSpeedDegPerSec > 2.0 ? 'CW' : ballSpeedDegPerSec < -2.0 ? 'CCW' : 'STATIONARY';

    // 3. Signed Relative Speed
    const relativeSpeedDegPerSec = ballSpeedDegPerSec - wheelSpeedDegPerSec;
    const relDir: 'CW' | 'CCW' | 'SAME_SPEED' =
      relativeSpeedDegPerSec > 2.0 ? 'CW' : relativeSpeedDegPerSec < -2.0 ? 'CCW' : 'SAME_SPEED';

    // 4. Quality & Confidence Score
    let confidence = 0;
    if (ballTracked && wheelTracked) {
      confidence = Math.min(100, Math.round(50 + (maxLuma / 255) * 50));
    } else if (wheelTracked) {
      confidence = 40;
    }

    const isAvailable = confidence >= 30;
    const status = isAvailable ? 'tracking' : 'low_confidence';

    let warningMessage: string | undefined;
    if (!ballTracked) {
      warningMessage = 'Ball position untracked or below contrast threshold';
    }

    return {
      timestamp,
      deltaSec,
      isStreamActive: true,
      isTrackingAvailable: isAvailable,
      trackingStatus: status,
      confidencePercentage: confidence,
      warningMessage,

      ballTracked,
      ballAngleDeg,
      ballSpeedDegPerSec,
      ballRevPerSec,
      ballDecelerationDegPerSec2: ballDecel,
      ballDirection: ballDir,
      ballTrajectory: [...this.ballTrajectory],

      wheelTracked,
      wheelAngleDeg,
      wheelSpeedDegPerSec,
      wheelRpm,
      wheelDirection: wheelDir,

      relativeSpeedDegPerSec,
      relativeDirection: relDir,

      centerPixelX: cx,
      centerPixelY: cy,
      outerRadiusPixel: rOut,
      innerRadiusPixel: rIn,
    };
  }

  private createUnavailableMetrics(
    cx: number,
    cy: number,
    rOut: number,
    rIn: number,
    warning: string
  ): MotionMetrics {
    return {
      timestamp: performance.now(),
      deltaSec: 0,
      isStreamActive: false,
      isTrackingAvailable: false,
      trackingStatus: 'paused',
      confidencePercentage: 0,
      warningMessage: warning,
      ballTracked: false,
      ballAngleDeg: 0,
      ballSpeedDegPerSec: 0,
      ballRevPerSec: 0,
      ballDecelerationDegPerSec2: 0,
      ballDirection: 'STATIONARY',
      ballTrajectory: [],
      wheelTracked: false,
      wheelAngleDeg: 0,
      wheelSpeedDegPerSec: 0,
      wheelRpm: 0,
      wheelDirection: 'STATIONARY',
      relativeSpeedDegPerSec: 0,
      relativeDirection: 'SAME_SPEED',
      centerPixelX: cx,
      centerPixelY: cy,
      outerRadiusPixel: rOut,
      innerRadiusPixel: rIn,
    };
  }
}
