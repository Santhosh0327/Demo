import { isValidRouletteNumber } from './casinoScores';

export interface CropRect {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

/**
 * Calculates exact video frame coordinates taking into account object-contain letterboxing/pillarboxing.
 */
export function calculateVideoCropCoordinates(
  video: HTMLVideoElement,
  cropBox: { x: number; y: number; width: number; height: number }
): CropRect {
  const containerW = video.clientWidth;
  const containerH = video.clientHeight;
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;

  if (containerW === 0 || containerH === 0 || videoW === 0 || videoH === 0) {
    return { cropX: 0, cropY: 0, cropW: videoW, cropH: videoH };
  }

  // Account for object-contain aspect ratio scaling
  const containerRatio = containerW / containerH;
  const videoRatio = videoW / videoH;

  let renderW = containerW;
  let renderH = containerH;
  let offsetX = 0;
  let offsetY = 0;

  if (containerRatio > videoRatio) {
    // Pillarboxing (black bars left/right)
    renderW = containerH * videoRatio;
    offsetX = (containerW - renderW) / 2;
  } else {
    // Letterboxing (black bars top/bottom)
    renderH = containerW / videoRatio;
    offsetY = (containerH - renderH) / 2;
  }

  // Calculate UI crop rect relative to container
  const realX = (cropBox.x / 100) * containerW;
  const realY = (cropBox.y / 100) * containerH;
  const realW = (cropBox.width / 100) * containerW;
  const realH = (cropBox.height / 100) * containerH;

  // Map to video frame pixels
  const frameX = Math.max(0, ((realX - offsetX) / renderW) * videoW);
  const frameY = Math.max(0, ((realY - offsetY) / renderH) * videoH);
  const frameW = Math.min(videoW - frameX, (realW / renderW) * videoW);
  const frameH = Math.min(videoH - frameY, (realH / renderH) * videoH);

  return {
    cropX: Math.round(frameX),
    cropY: Math.round(frameY),
    cropW: Math.round(frameW),
    cropH: Math.round(frameH),
  };
}

/**
 * High-contrast image binarization to enhance text recognition on dark/red/black roulette tiles.
 */
export function preprocessCanvasForOcr(ctx: CanvasRenderingContext2D, width: number, height: number) {
  if (width <= 0 || height <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Luminance grayscale conversion
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // High contrast binarization
    const threshold = 140;
    const v = gray > threshold ? 255 : 0;

    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Filter out non-winning-tile text (RTP, %, $, BET, GAME, long numbers) and sort spatially left-to-right.
 */
export function parseOcrWordsToSequence(
  words: { text: string; bbox: { x0: number; y0: number } }[],
  wheelType: 'European' | 'American' = 'European'
): string[] {
  // Sort left-to-right by horizontal coordinate (x0)
  const sortedWords = [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const results: string[] = [];

  for (const item of sortedWords) {
    const raw = item.text.trim();
    // Reject keywords / symbols
    if (
      raw.includes('%') ||
      raw.includes('$') ||
      raw.toLowerCase().includes('rtp') ||
      raw.toLowerCase().includes('bet') ||
      raw.toLowerCase().includes('game') ||
      raw.toLowerCase().includes('spins') ||
      raw.toLowerCase().includes('x') ||
      raw.length > 2
    ) {
      continue;
    }

    const clean = raw.replace(/[^0-9]/g, '');
    if (isValidRouletteNumber(clean, wheelType)) {
      results.push(clean);
    }
  }

  return results;
}
