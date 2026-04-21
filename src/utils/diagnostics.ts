/**
 * Ski Issue Diagnostics
 * Pure functions to analyse pressure data and detect skiing technique issues.
 */

import { PressureData, SkiIssue, IssueType, Severity } from '../types';

/** Configuration thresholds for issue detection */
export interface DiagnosticThresholds {
  backSeatRearRatio: number;
  forwardFrontRatio: number;
  lateralImbalance: number;
  skiddingPressureMin: number;
  weightImbalanceRatio: number;
  poorAngulationMiddleThreshold: number;
}

export const DEFAULT_THRESHOLDS: DiagnosticThresholds = {
  backSeatRearRatio: 0.6,        // rear fraction must exceed this
  forwardFrontRatio: 0.6,       // front fraction must exceed this
  lateralImbalance: 0.35,       // left/right fraction deviation
  skiddingPressureMin: 300,     // total of 4 sensors (0-400)
  weightImbalanceRatio: 1.4,   // heavy side / light side
  poorAngulationMiddleThreshold: 15, // middle sensor minimum for angulation check
};

/** Coaching tips for each issue type */
const ISSUE_TIPS: Record<IssueType, string> = {
  back_seat:
    'You are sitting back. Drive your shins forward against your boots and keep your weight centred over the balls of your feet.',
  forward_pressure:
    'You are too far forward. Let your boots support you — lean back slightly and let your legs absorb the terrain.',
  upper_body_rotation:
    'Watch your upper-body rotation. Rotate your body into the turn with your skis, not against them.',
  poor_angulation:
    'Work on your angulation. Keep your ankles, knees and hips bent and centred over your skis through the turn.',
  skidding:
    'You are skidding through the turn. Increase your edging to let the skis carve cleanly.',
  weight_imbalance:
    'Weight imbalance detected. Focus on loading your outside ski through the turn.',
};

/**
 * Compute severity based on how far a value exceeds its threshold.
 */
function computeSeverity(excess: number): Severity {
  if (excess < 1.2) return 'low';
  if (excess < 1.6) return 'medium';
  return 'high';
}

// ---------------------------------------------------------------------------
// Individual issue detectors
// ---------------------------------------------------------------------------

/**
 * Detect back_seat — excessive rear pressure compared to front.
 * Returns null if no issue detected.
 */
export function detectBackSeat(
  pressure: PressureData,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Omit<SkiIssue, 'frequency'> | null {
  const front = pressure.frontLeft + pressure.frontRight;
  const rear = pressure.rearLeft + pressure.rearRight;
  const total = front + rear;
  if (total === 0) return null;

  const rearFraction = rear / total;
  if (rearFraction < thresholds.backSeatRearRatio) return null;

  const excess = rearFraction / thresholds.backSeatRearRatio;
  return {
    type: 'back_seat',
    severity: computeSeverity(excess),
    tip: ISSUE_TIPS.back_seat,
  };
}

/**
 * Detect forward_pressure — excessive front pressure compared to rear.
 * Returns null if no issue detected.
 */
export function detectForwardPressure(
  pressure: PressureData,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Omit<SkiIssue, 'frequency'> | null {
  const front = pressure.frontLeft + pressure.frontRight;
  const rear = pressure.rearLeft + pressure.rearRight;
  const total = front + rear;
  if (total === 0) return null;

  const frontFraction = front / total;
  if (frontFraction < thresholds.forwardFrontRatio) return null;

  const excess = frontFraction / thresholds.forwardFrontRatio;
  return {
    type: 'forward_pressure',
    severity: computeSeverity(excess),
    tip: ISSUE_TIPS.forward_pressure,
  };
}

/**
 * Detect upper_body_rotation — lateral pressure asymmetry combined with
 * COP lateral deviation suggests the body is rotating away from the turn.
 */
export function detectUpperBodyRotation(
  pressure: PressureData,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Omit<SkiIssue, 'frequency'> | null {
  const frontLeft = pressure.frontLeft;
  const frontRight = pressure.frontRight;
  const rearLeft = pressure.rearLeft;
  const rearRight = pressure.rearRight;

  const leftTotal = frontLeft + rearLeft;
  const rightTotal = frontRight + rearRight;
  const total = leftTotal + rightTotal;
  if (total === 0) return null;

  const leftFraction = leftTotal / total;
  const deviation = Math.abs(leftFraction - 0.5);

  if (deviation < thresholds.lateralImbalance * 0.6) return null;

  // Also check cross-diagonal pattern: one diagonal much higher than the other
  const diagLeft = frontLeft + rearRight;
  const diagRight = frontRight + rearLeft;
  const diagTotal = diagLeft + diagRight;
  if (diagTotal === 0) return null;

  const diagImbalance = Math.abs((diagLeft - diagRight) / diagTotal);
  if (diagImbalance < thresholds.lateralImbalance * 0.5) return null;

  return {
    type: 'upper_body_rotation',
    severity: computeSeverity(diagImbalance / thresholds.lateralImbalance),
    tip: ISSUE_TIPS.upper_body_rotation,
  };
}

/**
 * Detect poor_angulation — low middle pressure and minimal lateral pressure
 * distribution suggests the skier is not angulating properly.
 */
export function detectPoorAngulation(
  pressure: PressureData,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Omit<SkiIssue, 'frequency'> | null {
  const middle = pressure.middle;
  const left = pressure.frontLeft + pressure.rearLeft;
  const right = pressure.frontRight + pressure.rearRight;
  const total = left + right;
  if (total === 0) return null;

  // Low middle pressure suggests collapsed ankles (poor angulation)
  if (middle >= thresholds.poorAngulationMiddleThreshold) return null;

  const lateralSpan = Math.abs(
    (pressure.frontLeft + pressure.rearRight) - (pressure.frontRight + pressure.rearLeft)
  ) / total;

  // Very flat lateral pressure (no angulation) is the indicator
  if (lateralSpan > 0.1) return null;

  const severity: Severity = middle < 5 ? 'high' : 'medium';
  return {
    type: 'poor_angulation',
    severity,
    tip: ISSUE_TIPS.poor_angulation,
  };
}

/**
 * Detect skidding — high total pressure and COP near centre suggests
 * the skis are sliding sideways rather than carving.
 * Skidding = high drag (lots of pressure) but lateral COP near 0.5.
 */
export function detectSkidding(
  pressure: PressureData,
  copX: number,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Omit<SkiIssue, 'frequency'> | null {
  const total =
    pressure.frontLeft + pressure.frontRight + pressure.rearLeft + pressure.rearRight;

  if (total < thresholds.skiddingPressureMin) return null;

  // COP near centre + high pressure = skidding
  const copDeviation = Math.abs(copX - 0.5);
  if (copDeviation > 0.15) return null;

  const severity: Severity =
    total > 360 ? 'high' : total > 320 ? 'medium' : 'low';

  return {
    type: 'skidding',
    severity,
    tip: ISSUE_TIPS.skidding,
  };
}

/**
 * Detect weight_imbalance — one side (left or right) carries significantly
 * more pressure than the other.
 */
export function detectWeightImbalance(
  pressure: PressureData,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Omit<SkiIssue, 'frequency'> | null {
  const left = pressure.frontLeft + pressure.rearLeft;
  const right = pressure.frontRight + pressure.rearRight;
  const total = left + right;
  if (total === 0) return null;

  const heavier = Math.max(left, right);
  const lighter = Math.min(left, right);

  if (heavier === 0) return null;

  const imbalanceRatio = heavier / lighter;
  if (imbalanceRatio < thresholds.weightImbalanceRatio) return null;

  return {
    type: 'weight_imbalance',
    severity: computeSeverity(imbalanceRatio / thresholds.weightImbalanceRatio),
    tip: ISSUE_TIPS.weight_imbalance,
  };
}

// ---------------------------------------------------------------------------
// Aggregate detector
// ---------------------------------------------------------------------------

/**
 * Run all issue detectors on a single pressure frame and return all detected issues.
 */
export function detectAllIssues(
  pressure: PressureData,
  copX: number = 0.5,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): SkiIssue[] {
  const issues: SkiIssue[] = [];

  const detectors = [
    detectBackSeat(pressure, thresholds),
    detectForwardPressure(pressure, thresholds),
    detectUpperBodyRotation(pressure, thresholds),
    detectPoorAngulation(pressure, thresholds),
    detectSkidding(pressure, copX, thresholds),
    detectWeightImbalance(pressure, thresholds),
  ];

  for (const issue of detectors) {
    if (issue !== null) {
      issues.push({ ...issue, frequency: 1 });
    }
  }

  return issues;
}

/**
 * Count occurrences of each issue type in a history of frames.
 * Returns SkiIssue array with frequency counts and max severity per type.
 */
export function analysePressureHistory(
  history: Array<{ pressure: PressureData; copX?: number }>,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): SkiIssue[] {
  const counts: Record<IssueType, { frequency: number; maxSeverity: Severity; tips: string[] }> = {
    back_seat: { frequency: 0, maxSeverity: 'low', tips: [] },
    forward_pressure: { frequency: 0, maxSeverity: 'low', tips: [] },
    upper_body_rotation: { frequency: 0, maxSeverity: 'low', tips: [] },
    poor_angulation: { frequency: 0, maxSeverity: 'low', tips: [] },
    skidding: { frequency: 0, maxSeverity: 'low', tips: [] },
    weight_imbalance: { frequency: 0, maxSeverity: 'low', tips: [] },
  };

  const severityOrder: Severity[] = ['low', 'medium', 'high'];

  for (const frame of history) {
    const issues = detectAllIssues(frame.pressure, frame.copX ?? 0.5, thresholds);
    for (const issue of issues) {
      const entry = counts[issue.type];
      entry.frequency += 1;
      if (severityOrder.indexOf(issue.severity) > severityOrder.indexOf(entry.maxSeverity)) {
        entry.maxSeverity = issue.severity;
      }
      if (!entry.tips.includes(issue.tip)) {
        entry.tips.push(issue.tip);
      }
    }
  }

  const result: SkiIssue[] = [];
  for (const type of Object.keys(counts) as IssueType[]) {
    const entry = counts[type];
    if (entry.frequency > 0) {
      result.push({
        type,
        severity: entry.maxSeverity,
        frequency: entry.frequency,
        tip: entry.tips[0] ?? ISSUE_TIPS[type],
      });
    }
  }

  return result;
}
