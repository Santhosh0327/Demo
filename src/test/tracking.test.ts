import { describe, it, expect } from 'vitest';
import { resolvePrediction, computeTrackingMetrics } from '../utils/tracking';
import { CandidatePrediction } from '../types/roulette';

describe('Prediction Resolution & Baseline Tracking', () => {
  const samplePred: CandidatePrediction = {
    id: 'p1',
    sessionId: 's1',
    timestamp: 1000,
    spinIndex: 1,
    candidateNumbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
    candidateScores: [],
    categoryCandidates: {
      redBlack: { categoryType: 'RedBlack', candidate: 'Red', confidence: 60, explanation: '' },
      dozen: { categoryType: 'Dozen', candidate: '1st Dozen', confidence: 60, explanation: '' },
      column: { categoryType: 'Column', candidate: '1st Column', confidence: 60, explanation: '' },
      oddEven: { categoryType: 'OddEven', candidate: 'Odd', confidence: 60, explanation: '' },
      highLow: { categoryType: 'HighLow', candidate: 'Low', confidence: 60, explanation: '' },
    },
    weightsUsed: { frequency: 25, recency: 20, transition: 25, sector: 15, opposite: 15 },
  };

  it('correctly resolves a HIT when actual number is in top 18 candidates', () => {
    const resolved = resolvePrediction(samplePred, '7', 'spin_7');
    expect(resolved.hitNumber).toBe(true);
    expect(resolved.hitRedBlack).toBe(true); // 7 is Red
    expect(resolved.hitDozen).toBe(true); // 7 is 1st dozen
    expect(resolved.hitColumn).toBe(true); // 7 is 1st column
    expect(resolved.hitOddEven).toBe(true); // 7 is Odd
    expect(resolved.hitHighLow).toBe(true); // 7 is Low
  });

  it('correctly resolves a MISS when actual number is outside top 18 candidates', () => {
    const resolved = resolvePrediction(samplePred, '36', 'spin_36');
    expect(resolved.hitNumber).toBe(false);
  });

  it('computes European fair baseline (48.6%) correctly', () => {
    const resolvedHits = resolvePrediction(samplePred, '1', 'spin_1');
    const metrics = computeTrackingMetrics([resolvedHits], 'European');
    expect(metrics.numberFairBaseline).toBeCloseTo(48.6, 0);
    expect(metrics.numberHitRate).toBe(100);
  });

  it('computes American fair baseline (47.4%) correctly', () => {
    const resolvedHits = resolvePrediction(samplePred, '1', 'spin_1');
    const metrics = computeTrackingMetrics([resolvedHits], 'American');
    expect(metrics.numberFairBaseline).toBeCloseTo(47.4, 0);
  });
});
