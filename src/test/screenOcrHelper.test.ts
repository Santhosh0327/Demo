import { describe, it, expect } from 'vitest';
import {
  calculateVideoCropCoordinates,
  getVideoRenderBounds,
  containerCropToVideoCrop,
  parseOcrWordsToSequence,
  detectNewSpinsFromHistoryRows,
} from '../utils/screenOcrHelper';

// ── Mock HTMLVideoElement factory ──────────────────────────────────────────────
function makeVideo(
  clientWidth: number,
  clientHeight: number,
  videoWidth: number,
  videoHeight: number
): HTMLVideoElement {
  return {
    clientWidth,
    clientHeight,
    videoWidth,
    videoHeight,
    readyState: 4,
  } as unknown as HTMLVideoElement;
}

// ── getVideoRenderBounds tests ─────────────────────────────────────────────────
describe('getVideoRenderBounds', () => {
  it('computes correct letterbox offsets for wide source video in square container', () => {
    // 1920×1080 source in 640×640 container → letterboxed (black bars top & bottom)
    const v = makeVideo(640, 640, 1920, 1080);
    const b = getVideoRenderBounds(v);
    expect(b.renderW).toBeCloseTo(640);
    expect(b.renderH).toBeCloseTo(360);
    expect(b.renderX).toBeCloseTo(0);
    expect(b.renderY).toBeCloseTo(140); // (640 - 360) / 2
    expect(b.scaleX).toBeCloseTo(1920 / 640);
    expect(b.scaleY).toBeCloseTo(1080 / 360);
  });

  it('computes correct pillarbox offsets for portrait source in wide container', () => {
    // 720×1280 source in 1280×720 container → pillarboxed (black bars left & right)
    const v = makeVideo(1280, 720, 720, 1280);
    const b = getVideoRenderBounds(v);
    expect(b.renderH).toBeCloseTo(720);
    expect(b.renderW).toBeCloseTo(720 * (720 / 1280));
    expect(b.renderX).toBeCloseTo((1280 - b.renderW) / 2);
    expect(b.renderY).toBeCloseTo(0);
  });
});

// ── calculateVideoCropCoordinates tests ───────────────────────────────────────
describe('calculateVideoCropCoordinates', () => {
  it('maps crop percentages to correct source video pixel coordinates (letterboxed)', () => {
    // 1920×1080 video in 640×360 container (1:1 no letterbox)
    const v = makeVideo(640, 360, 1920, 1080);
    const cropBox = { x: 0, y: 0, width: 100, height: 100 };
    const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(v, cropBox);
    expect(cropX).toBe(0);
    expect(cropY).toBe(0);
    expect(cropW).toBe(1920);
    expect(cropH).toBe(1080);
  });

  it('correctly maps a 50%-width top-row crop in letterboxed video', () => {
    // 1920×1080 source in 640×640 container → black bars top/bottom, renderH=360, renderY=140
    const v = makeVideo(640, 640, 1920, 1080);
    // Crop starting at 0% y of rendered video area, full width, top 30% of rendered video
    const cropBox = { x: 10, y: 0, width: 80, height: 30 };
    const { cropX, cropY, cropW, cropH } = calculateVideoCropCoordinates(v, cropBox);
    // rendered video: x=0, y=140, w=640, h=360 within container
    // crop x: 10% of renderW=640 → 64px → *scaleX(1920/640=3)=192
    expect(cropX).toBe(Math.round(64 * 3));
    // crop y: 0% of renderH=360 → 0 → *scaleY(1080/360=3)=0
    expect(cropY).toBe(0);
    // crop w: 80% of renderW=640 → 512 → *3=1536
    expect(cropW).toBe(Math.round(512 * 3));
    // crop h: 30% of renderH=360 → 108 → *3=324
    expect(cropH).toBe(Math.round(108 * 3));
  });
});

// ── parseOcrWordsToSequence tests ─────────────────────────────────────────────
describe('parseOcrWordsToSequence', () => {
  it('parses a clean left-to-right roulette number row', () => {
    const words = [
      { text: '3', bbox: { x0: 10, y0: 5 } },
      { text: '9', bbox: { x0: 50, y0: 5 } },
      { text: '28', bbox: { x0: 90, y0: 5 } },
      { text: '28', bbox: { x0: 130, y0: 5 } },
      { text: '17', bbox: { x0: 170, y0: 5 } },
    ];
    const result = parseOcrWordsToSequence(words, 'European');
    expect(result).toEqual(['3', '9', '28', '28', '17']);
  });

  it('preserves consecutive identical numbers (no deduplication by value)', () => {
    const words = [
      { text: '7', bbox: { x0: 10, y0: 5 } },
      { text: '7', bbox: { x0: 50, y0: 5 } },
      { text: '7', bbox: { x0: 90, y0: 5 } },
    ];
    const result = parseOcrWordsToSequence(words, 'European');
    expect(result).toEqual(['7', '7', '7']);
  });

  it('filters out multipliers, %, $, timestamps, and labels', () => {
    const words = [
      { text: '12x', bbox: { x0: 5, y0: 5 } },
      { text: '95%', bbox: { x0: 30, y0: 5 } },
      { text: 'RTP', bbox: { x0: 60, y0: 5 } },
      { text: '17', bbox: { x0: 90, y0: 5 } },
      { text: 'LIVE', bbox: { x0: 120, y0: 5 } },
      { text: '14:30', bbox: { x0: 150, y0: 5 } },
    ];
    const result = parseOcrWordsToSequence(words, 'European');
    expect(result).toEqual(['17']);
  });

  it('rejects numbers outside valid roulette range', () => {
    const words = [
      { text: '37', bbox: { x0: 10, y0: 5 } },  // invalid European
      { text: '36', bbox: { x0: 50, y0: 5 } },  // valid
      { text: '0', bbox: { x0: 90, y0: 5 } },   // valid
      { text: '99', bbox: { x0: 130, y0: 5 } }, // invalid
    ];
    const result = parseOcrWordsToSequence(words, 'European');
    expect(result).toEqual(['36', '0']);
  });
});

// ── detectNewSpinsFromHistoryRows tests ───────────────────────────────────────
describe('detectNewSpinsFromHistoryRows', () => {
  it('returns null for first-time scan (no last row)', () => {
    const result = detectNewSpinsFromHistoryRows([], ['17', '3', '9']);
    expect(result).toBeNull();
  });

  it('detects 1 new spin when last row shifts right by 1 (newest-first display)', () => {
    // Display: newest first (leftmost)
    // Last confirmed: [3, 9, 28, 28, 17] (left=newest)
    // New row: [5, 3, 9, 28, 28] (5 is the new spin at left, old shifted right)
    const last = ['3', '9', '28', '28', '17'];
    const curr = ['5', '3', '9', '28', '28'];
    const result = detectNewSpinsFromHistoryRows(last, curr);
    expect(result).not.toBeNull();
    expect(result).toEqual(['5']); // chronological (oldest new first = just 5)
  });

  it('detects 2 new spins correctly', () => {
    const last = ['3', '9', '28'];
    const curr = ['11', '15', '3', '9', '28'];
    const result = detectNewSpinsFromHistoryRows(last, curr);
    expect(result).not.toBeNull();
    // Returns reversed: newest→oldest of new spins = [15, 11] chronological
    expect(result).toEqual(['15', '11']);
  });

  it('returns empty array when no new spins (same row)', () => {
    const last = ['3', '9', '28'];
    const curr = ['3', '9', '28'];
    const result = detectNewSpinsFromHistoryRows(last, curr);
    expect(result).toEqual([]);
  });

  it('preserves consecutive identical numbers in new spin detection', () => {
    // Last: [28, 17, 0], New: [28, 28, 17, 0] — one new 28 was rolled
    const last = ['28', '17', '0'];
    const curr = ['28', '28', '17', '0'];
    const result = detectNewSpinsFromHistoryRows(last, curr);
    expect(result).not.toBeNull();
    expect(result).toEqual(['28']);
  });

  it('returns null for ambiguous non-overlapping sequence', () => {
    const last = ['3', '9', '28'];
    const curr = ['11', '15', '22', '7'];
    const result = detectNewSpinsFromHistoryRows(last, curr);
    expect(result).toBeNull();
  });
});
