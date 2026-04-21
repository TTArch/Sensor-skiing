/**
 * LLM Summary Utilities
 * Aggregates run data into a structured format for LLM summarization.
 * Provides a mock implementation that can be replaced with real LLM calls.
 */

import type { RunResult, TripSummaryRequest, LLMSummaryResult, IssueType } from '../types';

/**
 * Aggregate pressure data from a run into summary request format.
 * Currently uses issue data to derive skill assessments since raw pressure
 * history is not persisted with RunResult. When pressure history is added
 * to RunResult, this function can compute real pressure statistics.
 *
 * DECISION: Initialize pressure stats to 0 and derive skill assessment
 * from issue frequency — pressure history not yet stored in RunResult.
 * This interface is ready for real pressure data integration.
 */
export function prepareSummaryData(run: RunResult): TripSummaryRequest {
  // Aggregate issues by type
  const issueMap = new Map<IssueType, { frequency: number; maxSeverity: 'low' | 'medium' | 'high'; timestamps: number[] }>();

  for (const issue of run.issues) {
    const existing = issueMap.get(issue.type);
    if (existing) {
      existing.frequency += issue.frequency;
      const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
      if ((severityOrder[issue.severity] ?? 0) > (severityOrder[existing.maxSeverity] ?? 0)) {
        existing.maxSeverity = issue.severity;
      }
    } else {
      issueMap.set(issue.type, {
        frequency: issue.frequency,
        maxSeverity: issue.severity,
        timestamps: [],
      });
    }
  }

  const issueSummary = Array.from(issueMap.entries()).map(([type, data]) => ({
    type,
    frequency: data.frequency,
    maxSeverity: data.maxSeverity,
    timestamps: data.timestamps,
  }));

  // Derive skill assessment from issue data
  // DECISION: skidding and carving are inferred from issue profile.
  // Real implementation would use pressure history analysis.
  const totalIssueCount = run.issues.reduce((sum, i) => sum + i.frequency, 0);
  const skiddingIssues = issueMap.get('skidding');
  const skiddingRatio = skiddingIssues
    ? skiddingIssues.frequency / Math.max(totalIssueCount, 1)
    : 0;

  const carvingRatio = 1 - skiddingRatio;

  // Balance score: deduct for weight_imbalance issues
  const balanceIssues = issueMap.get('weight_imbalance');
  const balanceDeduction = balanceIssues ? balanceIssues.frequency * 5 : 0;
  const balanceScore = Math.max(0, Math.min(100, 100 - balanceDeduction));

  // Top improvement areas: high-severity issues sorted by frequency
  const improvementAreas = [...issueMap.entries()]
    .filter(([, data]) => data.maxSeverity === 'high' || data.maxSeverity === 'medium')
    .sort((a, b) => {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sevDiff = (severityOrder[a[1].maxSeverity] ?? 3) - (severityOrder[b[1].maxSeverity] ?? 3);
      if (sevDiff !== 0) return sevDiff;
      return b[1].frequency - a[1].frequency;
    })
    .map(([type]) => type);

  return {
    runId: run.id,
    startTime: run.startTime,
    endTime: run.endTime,
    duration: run.duration,
    score: run.score,
    turnCount: run.turnCount,
    pressureStats: {
      avgFrontLeft: 0,
      avgFrontRight: 0,
      avgMiddle: 0,
      avgRearLeft: 0,
      avgRearRight: 0,
      avgOverall: 0,
    },
    issueSummary,
    skillAssessment: {
      carvingRatio: Math.round(carvingRatio * 100) / 100,
      skiddingRatio: Math.round(skiddingRatio * 100) / 100,
      balanceScore,
    },
    improvementAreas,
  };
}

/**
 * Generate an LLM summary from aggregated run data.
 * Mock implementation — generates a structured text summary from the data.
 * Real implementation would call an LLM API (e.g., Anthropic, OpenAI).
 *
 * DECISION: Use a template-based mock summary that mirrors what an LLM would
 * produce. The interface is identical so swapping to a real LLM call requires
 * only changing this function body.
 */
export async function summarizeRunWithLLM(
  data: TripSummaryRequest
): Promise<LLMSummaryResult> {
  // Simulate async LLM call latency
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));

  const { score, turnCount, skillAssessment, issueSummary, improvementAreas } = data;

  // Build summary text
  const scoreTier =
    score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 45 ? 'fair' : 'needs_work';

  const carvingPct = Math.round(skillAssessment.carvingRatio * 100);
  const skiddingPct = Math.round(skillAssessment.skiddingRatio * 100);

  let summary = `Run Score: ${score}/100 (${scoreTier.replace('_', ' ')}). `;
  summary += `${turnCount} turns detected with ${carvingPct}% clean carving and ${skiddingPct}% skidding. `;
  summary += `Balance score: ${skillAssessment.balanceScore}/100. `;

  if (improvementAreas.length > 0) {
    const areaLabels = improvementAreas.map(formatIssueLabel);
    summary += `Key improvement areas: ${areaLabels.join(', ')}.`;
  } else {
    summary += 'Great technique — no major issues detected.';
  }

  // Build key insights
  const keyInsights: string[] = [];

  if (carvingPct < 50) {
    keyInsights.push(`Only ${carvingPct}% carving — focus on edge pressure to reduce skidding.`);
  } else if (carvingPct >= 80) {
    keyInsights.push(`Excellent carving at ${carvingPct}% — maintaining clean edge technique.`);
  }

  if (skillAssessment.balanceScore < 70) {
    keyInsights.push(`Balance score of ${skillAssessment.balanceScore}/100 — work on centered stance.`);
  }

  if (issueSummary.length > 0) {
    const topIssue = issueSummary.reduce((prev, curr) =>
      curr.frequency > prev.frequency ? curr : prev
    );
    keyInsights.push(`${formatIssueLabel(topIssue.type)} was the most frequent issue (${topIssue.frequency} occurrences).`);
  }

  if (keyInsights.length === 0) {
    keyInsights.push('Solid overall performance with consistent technique.');
  }

  return {
    runId: data.runId,
    summary,
    generatedAt: Date.now(),
    keyInsights,
  };
}

/**
 * Format an IssueType enum value into a human-readable label.
 */
function formatIssueLabel(type: IssueType): string {
  const labels: Record<IssueType, string> = {
    back_seat: 'Back Seat',
    forward_pressure: 'Forward Pressure',
    upper_body_rotation: 'Upper Body Rotation',
    poor_angulation: 'Poor Angulation',
    skidding: 'Skidding',
    weight_imbalance: 'Weight Imbalance',
  };
  return labels[type] ?? type;
}
