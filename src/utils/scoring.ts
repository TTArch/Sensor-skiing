/**
 * Run Scoring System
 * Calculates run scores, identifies dominant issues, and generates summaries.
 */

import { PressureData, SkiIssue, IssueType, RunResult } from '../types';
import { sumMainPressure, frontRearRatio, lateralRatio } from './pressureUtils';

/** Penalty points per severity level per occurrence */
const SEVERITY_PENALTY: Record<string, number> = {
  low: 3,
  medium: 7,
  high: 12,
};

/** Issue frequency weight: repeated occurrences get diminishing returns */
const FREQUENCY_WEIGHT_FLOOR = 0.4; // floor multiplier for frequent issues

/**
 * Compute the penalty contribution of a single issue.
 * Caps frequency contribution so a single issue type dominating
 * doesn't drive the score to zero unrealistically.
 */
function issuePenalty(issue: SkiIssue): number {
  const base = SEVERITY_PENALTY[issue.severity] ?? 3;
  const freqFactor = FREQUENCY_WEIGHT_FLOOR + (1 - FREQUENCY_WEIGHT_FLOOR) / Math.sqrt(issue.frequency);
  return base * freqFactor;
}

/**
 * Calculate overall run score (0–100) from a list of issues.
 * Higher score = better skiing technique.
 */
export function calculateRunScore(issues: SkiIssue[]): number {
  if (issues.length === 0) return 100;

  const totalPenalty = issues.reduce((sum, issue) => sum + issuePenalty(issue), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
  return score;
}

/**
 * Find the most frequent issue type in a list.
 * Returns null if the list is empty.
 */
export function findDominantIssue(issues: SkiIssue[]): IssueType | null {
  if (issues.length === 0) return null;

  const frequencyMap: Partial<Record<IssueType, number>> = {};
  for (const issue of issues) {
    frequencyMap[issue.type] = (frequencyMap[issue.type] ?? 0) + issue.frequency;
  }

  let dominant: IssueType | null = null;
  let maxFreq = 0;
  for (const [type, freq] of Object.entries(frequencyMap) as [IssueType, number][]) {
    if (freq > maxFreq) {
      maxFreq = freq;
      dominant = type;
    }
  }

  return dominant;
}

/**
 * Categorise score into a performance tier.
 */
export function scoreTier(score: number): 'excellent' | 'good' | 'fair' | 'needs_work' {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'fair';
  return 'needs_work';
}

/**
 * Tier label with emoji-free description.
 */
export function tierLabel(tier: ReturnType<typeof scoreTier>): string {
  switch (tier) {
    case 'excellent': return 'Excellent — clean technique';
    case 'good': return 'Good — minor refinements needed';
    case 'fair': return 'Fair — focus on the key issues';
    case 'needs_work': return 'Needs work — prioritise corrections';
  }
}

/**
 * Generate a short human-readable summary of run quality from pressure statistics.
 */
export function pressureSummary(
  pressureHistory: PressureData[]
): { avgPressure: number; avgFrontRear: number; avgLateral: number } {
  if (pressureHistory.length === 0) {
    return { avgPressure: 0, avgFrontRear: 0.5, avgLateral: 0.5 };
  }

  let totalPressure = 0;
  let totalFrontRear = 0;
  let totalLateral = 0;

  for (const p of pressureHistory) {
    totalPressure += sumMainPressure(p);
    totalFrontRear += frontRearRatio(p);
    totalLateral += lateralRatio(p);
  }

  const n = pressureHistory.length;
  return {
    avgPressure: totalPressure / n,
    avgFrontRear: totalFrontRear / n,
    avgLateral: totalLateral / n,
  };
}

/**
 * Build a complete RunResult object from raw run data.
 */
export function buildRunResult(params: {
  id: string;
  startTime: number;
  endTime: number;
  turnCount: number;
  issues: SkiIssue[];
  pressureHistory?: PressureData[];
}): RunResult {
  const { id, startTime, endTime, turnCount, issues, pressureHistory = [] } = params;

  const duration = Math.round((endTime - startTime) / 1000);
  const score = calculateRunScore(issues);
  const dominantIssue = findDominantIssue(issues);
  const tier = scoreTier(score);

  const summary = pressureSummary(pressureHistory);

  return {
    id,
    startTime,
    endTime,
    duration,
    turnCount,
    score,
    issues,
    dominantIssue,
  };
}

/**
 * Rank issues by severity for display priority.
 * Returns issues sorted: high first, then medium, then low.
 */
export function rankIssuesBySeverity(issues: SkiIssue[]): SkiIssue[] {
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...issues].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
}

/**
 * Rank issues by frequency for display priority.
 */
export function rankIssuesByFrequency(issues: SkiIssue[]): SkiIssue[] {
  return [...issues].sort((a, b) => b.frequency - a.frequency);
}

/**
 * Compute a pressure efficiency metric: how close the average pressure
 * is to ideal carving range. Ideal = not too high (skidding) not too low (not enough grip).
 * Returns 0-1, where 1 is optimal.
 */
export function pressureEfficiency(pressureHistory: PressureData[]): number {
  if (pressureHistory.length === 0) return 0;

  const IDEAL_AVG = 250; // sweet spot for good grip without skidding
  let totalDeviation = 0;

  for (const p of pressureHistory) {
    const avg = sumMainPressure(p);
    totalDeviation += Math.abs(avg - IDEAL_AVG);
  }

  const avgDeviation = totalDeviation / pressureHistory.length;
  // Normalise: 0 deviation = 1, deviation of 200+ = 0
  const efficiency = Math.max(0, Math.min(1, 1 - avgDeviation / 200));
  return parseFloat(efficiency.toFixed(3));
}
