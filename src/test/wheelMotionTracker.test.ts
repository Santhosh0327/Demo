import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOTION_CALIBRATION,
  wrapAngleDelta,
  WheelMotionTracker,
} from '../utils/wheelMotionTracker';

describe('WheelMotionTracker Computer-Vision Physics Tests', () => {
  it('correctly handles angular wraparound across 360 degrees', () => {
    // 350 -> 10 deg (moving clockwise by 20 deg)
    expect(wrapAngleDelta(10, 350)).toBe(20);

    // 10 -> 350 deg (moving counter-clockwise by -20 deg)
    expect(wrapAngleDelta(350, 10)).toBe(-20);

    // 180 -> 180 (no movement)
    expect(wrapAngleDelta(180, 180)).toBe(0);

    // 359 -> 1 deg (moving CW by 2 deg)
    expect(wrapAngleDelta(1, 359)).toBe(2);
  });

  it('initializes and updates calibration parameters correctly', () => {
    const tracker = new WheelMotionTracker(DEFAULT_MOTION_CALIBRATION);
    expect(tracker.getCalibration().centerXRatio).toBe(50);

    tracker.updateCalibration({ centerXRatio: 55, tiltRatio: 0.9 });
    const updated = tracker.getCalibration();
    expect(updated.centerXRatio).toBe(55);
    expect(updated.tiltRatio).toBe(0.9);
  });

  it('resets tracking trajectory and state on demand', () => {
    const tracker = new WheelMotionTracker();
    tracker.reset();
    const cal = tracker.getCalibration();
    expect(cal.radiusRatio).toBe(45);
  });
});
