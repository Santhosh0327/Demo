import { isValidRouletteNumber } from './casinoScores';

export interface CropRect {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

/**
 * Returns the computed render bounds of an object-contain video element
 * relative to the video element's own client rect.
 * Accounts for letterboxing (black bars top/bottom) and pillarboxing (black bars left/right).
 */
export function getVideoRenderBounds(video: HTMLVideoElement): {
  renderX: number; // px offset from element left edge to rendered video start
  renderY: number; // px offset from element top edge to rendered video start
  renderW: number; // actual rendered width in px
  renderH: number; // actual rendered height in px
  scaleX: number;  // source pixel per rendered px (horizontal)
  scaleY: number;  // source pixel per rendered px (vertical)
} {
  const containerW = video.clientWidth;
  const containerH = video.clientHeight;
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;

  if (containerW === 0 || containerH === 0 || videoW === 0 || videoH === 0) {
    return { renderX: 0, renderY: 0, renderW: containerW, renderH: containerH, scaleX: 1, scaleY: 1 };
  }

  const containerRatio = containerW / containerH;
  const videoRatio = videoW / videoH;

  let renderW: number;
  let renderH: number;
  let renderX = 0;
  let renderY = 0;

  if (containerRatio > videoRatio) {
    // Pillarboxing: black bars left & right
    renderH = containerH;
    renderW = containerH * videoRatio;
    renderX = (containerW - renderW) / 2;
  } else {
    // Letterboxing: black bars top & bottom
    renderW = containerW;
    renderH = containerW / videoRatio;
    renderY = (containerH - renderH) / 2;
  }

  return {
    renderX,
    renderY,
    renderW,
    renderH,
    scaleX: videoW / renderW,
    scaleY: videoH / renderH,
  };
}

/**
 * Converts a cropBox expressed as percentages of the RENDERED VIDEO AREA
 * (not the container) into exact source-video pixel coordinates.
 *
 * @param video - The HTMLVideoElement (must have videoWidth/videoHeight loaded).
 * @param cropBox - { x, y, width, height } as percentages 0–100 of the rendered video area.
 */
export function calculateVideoCropCoordinates(
  video: HTMLVideoElement,
  cropBox: { x: number; y: number; width: number; height: number }
): CropRect {
  const { renderW, renderH, scaleX, scaleY } = getVideoRenderBounds(video);

  if (renderW <= 0 || renderH <= 0) {
    return { cropX: 0, cropY: 0, cropW: video.videoWidth, cropH: video.videoHeight };
  }

  // cropBox percentages are relative to the rendered video area (0-100)
  const pxX = (cropBox.x / 100) * renderW;
  const pxY = (cropBox.y / 100) * renderH;
  const pxW = (cropBox.width / 100) * renderW;
  const pxH = (cropBox.height / 100) * renderH;

  const cropX = Math.max(0, Math.round(pxX * scaleX));
  const cropY = Math.max(0, Math.round(pxY * scaleY));
  const cropW = Math.min(video.videoWidth - cropX, Math.round(pxW * scaleX));
  const cropH = Math.min(video.videoHeight - cropY, Math.round(pxH * scaleY));

  console.debug('[ScreenOCR] Crop coordinates:', {
    sourceVideoDims: `${video.videoWidth}x${video.videoHeight}`,
    renderedVideoDims: `${Math.round(renderW)}x${Math.round(renderH)}`,
    scaleX: scaleX.toFixed(3),
    scaleY: scaleY.toFixed(3),
    cropBoxPct: cropBox,
    cropPixels: { cropX, cropY, cropW, cropH },
  });

  return { cropX, cropY, cropW, cropH };
}

/**
 * Converts an overlay div-relative crop box (percentages of the container div)
 * back into percentages of the rendered video area, compensating for letterboxing.
 * Use this when the overlay is positioned on the container div rather than the video render area.
 *
 * @param video - The HTMLVideoElement.
 * @param containerCropBox - cropBox percentages relative to the container div (0-100).
 */
export function containerCropToVideoCrop(
  video: HTMLVideoElement,
  containerCropBox: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const containerW = video.clientWidth;
  const containerH = video.clientHeight;
  const { renderX, renderY, renderW, renderH } = getVideoRenderBounds(video);

  if (containerW === 0 || containerH === 0 || renderW === 0 || renderH === 0) {
    return containerCropBox;
  }

  // Convert container-relative pct → container px
  const cxPx = (containerCropBox.x / 100) * containerW;
  const cyPx = (containerCropBox.y / 100) * containerH;
  const cwPx = (containerCropBox.width / 100) * containerW;
  const chPx = (containerCropBox.height / 100) * containerH;

  // Convert to render-area-relative pct (clamped to render area)
  const vxPct = Math.max(0, ((cxPx - renderX) / renderW) * 100);
  const vyPct = Math.max(0, ((cyPx - renderY) / renderH) * 100);
  const vwPct = Math.max(0, (cwPx / renderW) * 100);
  const vhPct = Math.max(0, (chPx / renderH) * 100);

  return { x: vxPct, y: vyPct, width: vwPct, height: vhPct };
}

/**
 * High-contrast preprocessing for OCR.
 * Uses adaptive-threshold-friendly approach: scales up the canvas for better OCR resolution,
 * then converts to high-contrast grayscale binarization.
 */
export function preprocessCanvasForOcr(ctx: CanvasRenderingContext2D, width: number, height: number) {
  if (width <= 0 || height <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Compute mean luminance for adaptive thresholding
  let totalLum = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const meanLum = totalLum / (data.length / 4);
  // Use a threshold between mean and 200 (never lower than 80 to handle very dark tiles)
  const threshold = Math.max(80, Math.min(200, meanLum * 1.2));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // For roulette tiles: white text on red/black/green tiles
    // Invert so text becomes black on white for better Tesseract accuracy
    const v = gray > threshold ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }

  ctx.putImageData(imgData, 0, 0);
}

export interface OcrWordResult {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

/**
 * Filter OCR words and sort spatially left-to-right to produce
 * an ordered winning-number sequence from a roulette history row.
 *
 * Rejects: multipliers (e.g. "12x"), RTP%, timestamps, dealer IDs,
 *          labels (BET, GAME, SPINS, etc.), and numbers outside 0-36 / 00.
 *
 * Preserves legitimate consecutive identical numbers (e.g. 28, 28).
 */
export function parseOcrWordsToSequence(
  words: { text: string; bbox: { x0: number; y0: number } }[],
  wheelType: 'European' | 'American' = 'European'
): string[] {
  // Sort left-to-right by horizontal position of word start
  const sortedWords = [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const results: string[] = [];

  for (const item of sortedWords) {
    const raw = item.text.trim();
    if (!raw) continue;

    // Reject known non-number patterns
    if (
      raw.includes('%') ||
      raw.includes('$') ||
      raw.includes('€') ||
      raw.includes('£') ||
      raw.includes(':') || // timestamps
      raw.includes('/') ||
      raw.includes('.') ||
      /[xX×]/.test(raw) || // multipliers like 12x
      raw.toLowerCase() === 'rtp' ||
      raw.toLowerCase() === 'bet' ||
      raw.toLowerCase() === 'game' ||
      raw.toLowerCase() === 'spins' ||
      raw.toLowerCase() === 'spin' ||
      raw.toLowerCase() === 'live' ||
      raw.toLowerCase() === 'no' ||
      raw.length > 3 // 3 allows "00" and "0" and "1"-"36" with possible OCR artifacts
    ) {
      continue;
    }

    // Strip non-digit characters (OCR often adds periods, commas, etc.)
    const clean = raw.replace(/[^0-9]/g, '');

    // Validate as roulette number
    if (clean && isValidRouletteNumber(clean, wheelType)) {
      results.push(clean);
    }
  }

  console.debug('[ScreenOCR] OCR raw words:', sortedWords.map((w) => w.text).join(' | '));
  console.debug('[ScreenOCR] Parsed roulette sequence:', results.join(', '));

  return results;
}

/**
 * Compares a new observed spin row to the last confirmed row to identify
 * only genuinely new spins. Preserves consecutive identical numbers.
 *
 * Strategy:
 * - CasinoScores shows newest-first (leftmost = most recent).
 * - Find the longest suffix of lastConfirmedRow that matches a prefix of newRow.
 * - Numbers before that match position in newRow are new spins.
 * - If no overlap found with confidence, returns null (request manual review).
 *
 * @param lastConfirmedRow Ordered sequence from last confirmed scan (left-to-right as displayed).
 * @param newRow Ordered sequence from current scan (left-to-right as displayed).
 * @returns New spin numbers in chronological order (oldest new first), or null if ambiguous.
 */
export function detectNewSpinsFromHistoryRows(
  lastConfirmedRow: string[],
  newRow: string[]
): string[] | null {
  if (lastConfirmedRow.length === 0) return null; // First scan - needs full confirmation
  if (newRow.length === 0) return null;

  // Try to find the overlap: the end of newRow should match the start of lastConfirmedRow
  // (since newest-first display: new results appear at the left, old results shift right)
  const maxOverlap = Math.min(lastConfirmedRow.length, newRow.length);

  for (let overlapLen = maxOverlap; overlapLen >= 1; overlapLen--) {
    const newRowSuffix = newRow.slice(newRow.length - overlapLen);
    const lastRowPrefix = lastConfirmedRow.slice(0, overlapLen);

    const matches = newRowSuffix.every((n, i) => n === lastRowPrefix[i]);
    if (matches) {
      // New spins are the prefix of newRow before the overlap (newest-first → reverse for chronological)
      const newSpins = newRow.slice(0, newRow.length - overlapLen);
      if (newSpins.length === 0) return []; // No new spins since last scan
      // Reverse to oldest-first (chronological import order)
      return [...newSpins].reverse();
    }
  }

  // No confident overlap found
  console.warn('[ScreenOCR] No confident overlap between lastConfirmedRow and newRow. Manual review required.', {
    lastConfirmedRow,
    newRow,
  });
  return null; // Signal: pause auto-import, request review
}
