/**
 * Unit tests for llmSummary.ts
 * Tests prepareSummaryData() and summarizeRunWithLLM()
 */

import { prepareSummaryData, summarizeRunWithLLM } from '../llmSummary';
import type { RunResult, TripSummaryRequest } from '../../types';

describe('llmSummary', () => {
  describe('prepareSummaryData', () => {
    it('should aggregate issues by type and compute totals', () => {
      const run: RunResult = {
        id: 'run-1',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        turnCount: 12,
        score: 72,
        issues: [
          { type: 'skidding', severity: 'medium', frequency: 5, tip: 'Reduce skidding' },
          { type: 'skidding', severity: 'high', frequency: 3, tip: 'More edge' },
          { type: 'back_seat', severity: 'low', frequency: 2, tip: 'Sit back' },
        ],
        dominantIssue: 'skidding',
      };

      const result = prepareSummaryData(run);

      // Skidding should aggregate: frequency = 5+3 = 8, maxSeverity = high
      const skiddingEntry = result.issueSummary.find(i => i.type === 'skidding');
      expect(skiddingEntry).toBeDefined();
      expect(skiddingEntry!.frequency).toBe(8);
      expect(skiddingEntry!.maxSeverity).toBe('high');

      // Back seat: frequency = 2, maxSeverity = low
      const backSeatEntry = result.issueSummary.find(i => i.type === 'back_seat');
      expect(backSeatEntry).toBeDefined();
      expect(backSeatEntry!.frequency).toBe(2);
      expect(backSeatEntry!.maxSeverity).toBe('low');
    });

    it('should derive skiddingRatio and carvingRatio from skidding issues', () => {
      const run: RunResult = {
        id: 'run-2',
        startTime: 1000,
        endTime: 60000,
        duration: 30,
        turnCount: 5,
        score: 60,
        issues: [
          { type: 'skidding', severity: 'high', frequency: 4, tip: 'Tip' },
          { type: 'back_seat', severity: 'medium', frequency: 6, tip: 'Tip' },
        ],
        dominantIssue: 'back_seat',
      };

      const result = prepareSummaryData(run);

      const total = 4 + 6; // 10
      expect(result.skillAssessment.skiddingRatio).toBe(0.4);
      expect(result.skillAssessment.carvingRatio).toBe(0.6);
    });

    it('should compute 100% carving when no skidding issues', () => {
      const run: RunResult = {
        id: 'run-3',
        startTime: 1000,
        endTime: 30000,
        duration: 20,
        turnCount: 8,
        score: 90,
        issues: [
          { type: 'weight_imbalance', severity: 'low', frequency: 1, tip: 'Tip' },
        ],
        dominantIssue: null,
      };

      const result = prepareSummaryData(run);

      expect(result.skillAssessment.skiddingRatio).toBe(0);
      expect(result.skillAssessment.carvingRatio).toBe(1);
    });

    it('should compute balanceScore with deductions for weight_imbalance', () => {
      const run: RunResult = {
        id: 'run-4',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        turnCount: 10,
        score: 55,
        issues: [
          { type: 'weight_imbalance', severity: 'high', frequency: 3, tip: 'Tip' },
          { type: 'back_seat', severity: 'medium', frequency: 2, tip: 'Tip' },
        ],
        dominantIssue: 'weight_imbalance',
      };

      const result = prepareSummaryData(run);

      // 100 - (3 * 5) = 85
      expect(result.skillAssessment.balanceScore).toBe(85);
    });

    it('should floor balanceScore at 0', () => {
      const run: RunResult = {
        id: 'run-5',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        turnCount: 3,
        score: 30,
        issues: [
          { type: 'weight_imbalance', severity: 'high', frequency: 50, tip: 'Tip' },
        ],
        dominantIssue: 'weight_imbalance',
      };

      const result = prepareSummaryData(run);

      // 100 - (50 * 5) = -150 → clamped to 0
      expect(result.skillAssessment.balanceScore).toBe(0);
    });

    it('should sort improvementAreas by severity then frequency', () => {
      const run: RunResult = {
        id: 'run-6',
        startTime: 1000,
        endTime: 60000,
        duration: 45,
        turnCount: 7,
        score: 50,
        issues: [
          { type: 'skidding', severity: 'medium', frequency: 2, tip: 'Tip' },
          { type: 'back_seat', severity: 'high', frequency: 1, tip: 'Tip' },
          { type: 'forward_pressure', severity: 'high', frequency: 5, tip: 'Tip' },
        ],
        dominantIssue: 'forward_pressure',
      };

      const result = prepareSummaryData(run);

      // high severity first (sorted by frequency desc within same severity)
      // forward_pressure(5) before back_seat(1), then skidding(medium)
      expect(result.improvementAreas).toEqual([
        'forward_pressure',
        'back_seat',
        'skidding',
      ]);
    });

    it('should exclude low-severity issues from improvementAreas', () => {
      const run: RunResult = {
        id: 'run-7',
        startTime: 1000,
        endTime: 60000,
        duration: 45,
        turnCount: 7,
        score: 80,
        issues: [
          { type: 'skidding', severity: 'low', frequency: 3, tip: 'Tip' },
        ],
        dominantIssue: null,
      };

      const result = prepareSummaryData(run);

      expect(result.improvementAreas).toEqual([]);
    });

    it('should return empty improvementAreas for perfect run', () => {
      const run: RunResult = {
        id: 'run-8',
        startTime: 1000,
        endTime: 60000,
        duration: 60,
        turnCount: 15,
        score: 100,
        issues: [],
        dominantIssue: null,
      };

      const result = prepareSummaryData(run);

      expect(result.improvementAreas).toEqual([]);
      expect(result.issueSummary).toEqual([]);
      expect(result.skillAssessment.skiddingRatio).toBe(0);
      expect(result.skillAssessment.carvingRatio).toBe(1);
      expect(result.skillAssessment.balanceScore).toBe(100);
    });

    it('should preserve run metadata fields', () => {
      const run: RunResult = {
        id: 'run-9',
        startTime: 1700000000000,
        endTime: 1700000060000,
        duration: 60,
        turnCount: 20,
        score: 88,
        issues: [
          { type: 'back_seat', severity: 'low', frequency: 1, tip: 'Tip' },
        ],
        dominantIssue: 'back_seat',
      };

      const result = prepareSummaryData(run);

      expect(result.runId).toBe('run-9');
      expect(result.startTime).toBe(1700000000000);
      expect(result.endTime).toBe(1700000060000);
      expect(result.duration).toBe(60);
      expect(result.score).toBe(88);
      expect(result.turnCount).toBe(20);
    });

    it('should initialize pressureStats to zeros', () => {
      const run: RunResult = {
        id: 'run-10',
        startTime: 1000,
        endTime: 30000,
        duration: 20,
        turnCount: 5,
        score: 75,
        issues: [],
        dominantIssue: null,
      };

      const result = prepareSummaryData(run);

      expect(result.pressureStats.avgFrontLeft).toBe(0);
      expect(result.pressureStats.avgFrontRight).toBe(0);
      expect(result.pressureStats.avgMiddle).toBe(0);
      expect(result.pressureStats.avgRearLeft).toBe(0);
      expect(result.pressureStats.avgRearRight).toBe(0);
      expect(result.pressureStats.avgOverall).toBe(0);
    });
  });

  describe('summarizeRunWithLLM', () => {
    it('should generate summary with correct score tier for excellent score', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-1',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 90,
        turnCount: 15,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 0.9, skiddingRatio: 0.1, balanceScore: 95 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.runId).toBe('run-1');
      expect(result.summary).toContain('90');
      expect(result.summary).toContain('excellent');
      expect(result.generatedAt).toBeGreaterThan(0);
      expect(Array.isArray(result.keyInsights)).toBe(true);
    });

    it('should generate summary with correct score tier for good score', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-2',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 70,
        turnCount: 10,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 0.6, skiddingRatio: 0.4, balanceScore: 75 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.summary).toContain('70');
      expect(result.summary).toContain('good');
    });

    it('should generate summary with correct score tier for fair score', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-3',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 50,
        turnCount: 8,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 0.3, skiddingRatio: 0.7, balanceScore: 60 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.summary).toContain('50');
      expect(result.summary).toContain('fair');
    });

    it('should generate summary with correct score tier for needs_work score', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-4',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 30,
        turnCount: 5,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 0.1, skiddingRatio: 0.9, balanceScore: 40 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.summary).toContain('30');
      expect(result.summary).toContain('needs work');
    });

    it('should include improvement areas in summary when present', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-5',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 65,
        turnCount: 10,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [
          { type: 'back_seat', frequency: 5, maxSeverity: 'high', timestamps: [] },
          { type: 'skidding', frequency: 3, maxSeverity: 'medium', timestamps: [] },
        ],
        skillAssessment: { carvingRatio: 0.5, skiddingRatio: 0.5, balanceScore: 80 },
        improvementAreas: ['back_seat', 'skidding'],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.summary).toContain('Back Seat');
      expect(result.summary).toContain('Skidding');
      expect(result.summary).toContain('Key improvement areas');
    });

    it('should include no-major-issues message for perfect runs', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-6',
        startTime: 1000,
        endTime: 60000,
        duration: 60,
        score: 100,
        turnCount: 20,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 1, skiddingRatio: 0, balanceScore: 100 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.summary).toContain('no major issues detected');
    });

    it('should generate low-carving insight when carvingRatio < 50%', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-7',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 50,
        turnCount: 10,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [
          { type: 'skidding', frequency: 6, maxSeverity: 'high', timestamps: [] },
        ],
        skillAssessment: { carvingRatio: 0.3, skiddingRatio: 0.7, balanceScore: 80 },
        improvementAreas: ['skidding'],
      };

      const result = await summarizeRunWithLLM(data);

      const lowCarvingInsight = result.keyInsights.find(i => i.includes('carving'));
      expect(lowCarvingInsight).toBeDefined();
      expect(lowCarvingInsight).toContain('30%');
    });

    it('should generate excellent-carving insight when carvingRatio >= 80%', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-8',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 90,
        turnCount: 15,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 0.9, skiddingRatio: 0.1, balanceScore: 95 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      const excellentInsight = result.keyInsights.find(i => i.includes('Excellent'));
      expect(excellentInsight).toBeDefined();
    });

    it('should generate balance insight when balanceScore < 70', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-9',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 60,
        turnCount: 10,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [
          { type: 'weight_imbalance', frequency: 4, maxSeverity: 'high', timestamps: [] },
        ],
        skillAssessment: { carvingRatio: 0.6, skiddingRatio: 0.4, balanceScore: 60 },
        improvementAreas: ['weight_imbalance'],
      };

      const result = await summarizeRunWithLLM(data);

      const balanceInsight = result.keyInsights.find(i => i.includes('Balance'));
      expect(balanceInsight).toBeDefined();
      expect(balanceInsight).toContain('60/100');
    });

    it('should identify most frequent issue in key insights', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-10',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 65,
        turnCount: 12,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [
          { type: 'back_seat', frequency: 2, maxSeverity: 'low', timestamps: [] },
          { type: 'skidding', frequency: 7, maxSeverity: 'medium', timestamps: [] },
          { type: 'forward_pressure', frequency: 3, maxSeverity: 'high', timestamps: [] },
        ],
        skillAssessment: { carvingRatio: 0.5, skiddingRatio: 0.5, balanceScore: 85 },
        improvementAreas: ['skidding'],
      };

      const result = await summarizeRunWithLLM(data);

      const topIssueInsight = result.keyInsights.find(i => i.includes('most frequent'));
      expect(topIssueInsight).toBeDefined();
      expect(topIssueInsight).toContain('Skidding');
      expect(topIssueInsight).toContain('7');
    });

    it('should include fallback insight for clean runs with no specific findings', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-11',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 85,
        turnCount: 15,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [
          { type: 'skidding', frequency: 1, maxSeverity: 'low', timestamps: [] },
        ],
        skillAssessment: { carvingRatio: 0.8, skiddingRatio: 0.2, balanceScore: 95 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      // Should have excellent carving insight AND fallback
      expect(result.keyInsights.length).toBeGreaterThan(0);
    });

    it('should include turn count in summary', async () => {
      const data: TripSummaryRequest = {
        runId: 'run-12',
        startTime: 1000,
        endTime: 60000,
        duration: 55,
        score: 75,
        turnCount: 18,
        pressureStats: {
          avgFrontLeft: 0, avgFrontRight: 0, avgMiddle: 0,
          avgRearLeft: 0, avgRearRight: 0, avgOverall: 0,
        },
        issueSummary: [],
        skillAssessment: { carvingRatio: 0.8, skiddingRatio: 0.2, balanceScore: 90 },
        improvementAreas: [],
      };

      const result = await summarizeRunWithLLM(data);

      expect(result.summary).toContain('18 turns');
    });
  });
});
