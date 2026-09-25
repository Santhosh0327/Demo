import { describe, it, expect } from 'vitest';
import { runInstantAnalysisPipeline } from '../utils/analysisPipeline';
import { resolvePrediction, computeTrackingMetrics } from '../utils/tracking';
import { generateExperimentalCandidates } from '../utils/candidateEngineLab';
import { SpinItem, CandidatePrediction } from '../types/roulette';

describe('Instant Live Analysis Workspace Requirements', () => {
  it('preserves consecutive identical winning numbers', () => {
    const spins: SpinItem[] = [
      { id: 'spin_1', sessionId: 's1', number: '17', timestamp: 1000, source: 'manual' },
      { id: 'spin_2', sessionId: 's1', number: '17', timestamp: 2000, source: 'manual' },
      { id: 'spin_3', sessionId: 's1', number: '17', timestamp: 3000, source: 'ocr_upload' },
    ];

    const res = runInstantAnalysisPipeline(spins, 'European', []);
    expect(res.totalSpins).toBe(3);
    expect(res.categoryAnalysis.totalSpins).toBe(3);
    expect(res.categoryAnalysis.categories.find((c) => c.categoryKey === 'black')?.observedCount).toBe(3);
  });

  it('correctly handles European (18/37) and American (18/38) theoretical baselines', () => {
    const spins: SpinItem[] = [
      { id: 'spin_1', sessionId: 's1', number: '1', timestamp: 1000, source: 'manual' },
    ];

    const euRes = runInstantAnalysisPipeline(spins, 'European', []);
    const usRes = runInstantAnalysisPipeline(spins, 'American', []);

    expect(euRes.trackingMetrics.numberFairBaseline).toBeCloseTo(48.6, 1);
    expect(usRes.trackingMetrics.numberFairBaseline).toBeCloseTo(47.4, 1);

    expect(euRes.categoryAnalysis.categories.find((c) => c.categoryKey === 'red')?.theoreticalPercentage).toBeCloseTo(48.65, 1);
    expect(usRes.categoryAnalysis.categories.find((c) => c.categoryKey === 'red')?.theoreticalPercentage).toBeCloseTo(47.37, 1);
  });

  it('verifies zero look-ahead bias in performance tracking', () => {
    // Generate pre-spin candidate snapshot for spin 1 (empty history)
    const spinsBeforeSpin1: SpinItem[] = [];
    const candidatesForSpin1 = generateExperimentalCandidates(spinsBeforeSpin1.map((s) => s.number), {
      method: 'frequency',
      minSpinsRequired: 0,
      historyCutoff: 50,
      wheelType: 'European',
    });

    const mockPrediction: CandidatePrediction = {
      id: 'pred_1',
      sessionId: 's1',
      timestamp: 1000,
      spinIndex: 1,
      candidateNumbers: candidatesForSpin1.selectedNumbers,
      candidateScores: [],
      categoryCandidates: {
        redBlack: { categoryType: 'RedBlack', candidate: 'Red', confidence: 50, explanation: '' },
        dozen: { categoryType: 'Dozen', candidate: '1st', confidence: 33, explanation: '' },
        column: { categoryType: 'Column', candidate: '1st', confidence: 33, explanation: '' },
        oddEven: { categoryType: 'OddEven', candidate: 'Odd', confidence: 50, explanation: '' },
        highLow: { categoryType: 'HighLow', candidate: 'High', confidence: 50, explanation: '' },
      },
      weightsUsed: { frequency: 20, recency: 20, transition: 20, sector: 20, opposite: 20 },
    };

    // Actual Spin 1 arrives: Number 17 (Black, Odd, Low, 2nd Dozen, 2nd Column)
    const resolvedSpin1 = resolvePrediction(mockPrediction, '17', 'spin_1');

    expect(resolvedSpin1.resolvedActualNumber).toBe('17');
    expect(resolvedSpin1.resolvedSpinId).toBe('spin_1');

    const metrics = computeTrackingMetrics([resolvedSpin1], 'European');
    expect(metrics.totalPredictions).toBe(1);
    expect(metrics.performanceHistory.length).toBe(1);
    expect(metrics.performanceHistory[0].actualNumber).toBe('17');
  });

  it('handles empty history without fabricated outputs', () => {
    const res = runInstantAnalysisPipeline([], 'European', []);

    expect(res.totalSpins).toBe(0);
    expect(res.status).toBe('insufficient_history');
    expect(res.mainCandidateSnapshot.selectedNumbers.length).toBe(0);
  });

  it('generates all 8 candidate strategy sets side-by-side when history exists', () => {
    const spins: SpinItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: `spin_${i}`,
      sessionId: 's1',
      number: ((i % 36) + 1).toString(),
      timestamp: 1000 + i * 1000,
      source: 'manual',
    }));

    const res = runInstantAnalysisPipeline(spins, 'European', []);
    const methods = Object.keys(res.allCandidateMethods);

    expect(methods.length).toBe(8);
    expect(res.allCandidateMethods.frequency.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.recency.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.transition.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.wheel_neighbour.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.opposite_pocket.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.sector.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.bayesian.selectedNumbers.length).toBe(18);
    expect(res.allCandidateMethods.weighted_ensemble.selectedNumbers.length).toBe(18);
  });
});
