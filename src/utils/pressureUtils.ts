/**
 * Pressure Utilities
 * Pure helper functions for pressure data analysis.
 */

import type { PressureData } from '../types';

/**
 * Sum the four main pressure sensors (front + rear).
 */
export function sumMainPressure(data: PressureData): number {
  return data.frontLeft + data.frontRight + data.rearLeft + data.rearRight;
}

/**
 * Compute front-to-rear pressure ratio.
 * Returns front / (front + rear), defaulting to 1 if total is 0.
 */
export function frontRearRatio(data: PressureData): number {
  const front = data.frontLeft + data.frontRight;
  const rear = data.rearLeft + data.rearRight;
  if (front + rear === 0) return 1;
  return front / (front + rear);
}

/**
 * Compute left-to-right pressure ratio.
 * Returns left / (left + right), defaulting to 0.5 if total is 0.
 */
export function lateralRatio(data: PressureData): number {
  const left = data.frontLeft + data.rearLeft;
  const right = data.frontRight + data.rearRight;
  if (left + right === 0) return 0.5;
  return left / (left + right);
}
