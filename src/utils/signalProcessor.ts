/**
 * Signal Processor
 * Low-pass filtering, normalization, center-of-pressure calculation,
 * and turn-event detection from raw pressure sensor data.
 * 5-sensor layout: 2 front (left/right), 1 middle (center), 2 rear (left/right)
 */

import type { CenterOfPressure, PressureData, SensorFrame } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Low-pass filter smoothing factor (0 = no smoothing, 1 = infinite smoothing) */
const FILTER_ALPHA = 0.3;

/**
 * Lateral positions of each sensor pad on the insole (fraction of insole width, 0–1).
 * 0 = inside edge (medial), 1 = outside edge (lateral).
 */
const SENSOR_X: Record<keyof PressureData, number> = {
  frontLeft:  0.2,
  frontRight: 0.8,
  middle:     0.5,
  rearLeft:   0.2,
  rearRight:  0.8,
};

/**
 * Fore-aft positions of each sensor pad (fraction of insole length, 0–1).
 * 0 = toe, 1 = heel.
 */
const SENSOR_Y: Record<keyof PressureData, number> = {
  frontLeft:  0.25,
  frontRight: 0.25,
  middle:     0.50,
  rearLeft:   0.75,
  rearRight:  0.75,
};

/** Minimum pressure reading considered non-zero (filters dead-zone noise) */
const MIN_PRESSURE_THRESHOLD = 2;

/** Turn detection: fraction of total force that must shift laterally to register a turn */
const TURN_LATERAL_THRESHOLD = 0.12;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize raw sensor values (typically 0–255 or 0–1023) to 0–100 scale.
 * Clamps to [0, 100].
 */
export function normalize(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped);
}

/**
 * Normalize an entire PressureData record.
 */
export function normalizePressure(raw: PressureData): PressureData {
  return {
    frontLeft:  normalize(raw.frontLeft),
    frontRight: normalize(raw.frontRight),
    middle:     normalize(raw.middle),
    rearLeft:   normalize(raw.rearLeft),
    rearRight:  normalize(raw.rearRight),
  };
}

// ---------------------------------------------------------------------------
// Low-pass filter
// ---------------------------------------------------------------------------

/** Internal filter state — maintain one per pressure channel */
interface FilterState {
  frontLeft:  number;
  frontRight: number;
  middle:     number;
  rearLeft:   number;
  rearRight:  number;
}

/** Global mutable filter state (acceptable here as the processor is module-scoped) */
const filterState: FilterState = {
  frontLeft:  0,
  frontRight: 0,
  middle:     0,
  rearLeft:   0,
  rearRight:  0,
};

/**
 * Apply a simple exponential moving average (EMA) low-pass filter to pressure data.
 * Returns filtered values; updates internal filter state.
 */
export function applyLowPassFilter(raw: PressureData): PressureData {
  const filter = (prev: number, next: number): number =>
    prev === 0 ? next : prev + FILTER_ALPHA * (next - prev);

  const filtered: PressureData = {
    frontLeft:  filter(filterState.frontLeft,  raw.frontLeft),
    frontRight: filter(filterState.frontRight, raw.frontRight),
    middle:     filter(filterState.middle,     raw.middle),
    rearLeft:   filter(filterState.rearLeft,   raw.rearLeft),
    rearRight:  filter(filterState.rearRight,  raw.rearRight),
  };

  // Persist state
  Object.assign(filterState, filtered);
  return filtered;
}

/** Reset all filter state (call when disconnecting / reconnecting sensor) */
export function resetFilterState(): void {
  filterState.frontLeft  = 0;
  filterState.frontRight = 0;
  filterState.middle     = 0;
  filterState.rearLeft   = 0;
  filterState.rearRight  = 0;
}

// ---------------------------------------------------------------------------
// Center of pressure
// ---------------------------------------------------------------------------

/**
 * Calculate the center of pressure (CoP) from a pressure reading.
 * Returns x, y in [0, 1] range where (0,0) = toe / inside edge and (1,1) = heel / outside edge.
 */
export function calculateCenterOfPressure(pressure: PressureData): CenterOfPressure {
  const keys = Object.keys(SENSOR_X) as (keyof PressureData)[];

  let weightedX = 0;
  let weightedY = 0;
  let totalPressure = 0;

  for (const key of keys) {
    const p = pressure[key];
    if (p < MIN_PRESSURE_THRESHOLD) continue;
    weightedX += p * SENSOR_X[key];
    weightedY += p * SENSOR_Y[key];
    totalPressure += p;
  }

  if (totalPressure < MIN_PRESSURE_THRESHOLD) {
    return { x: 0.5, y: 0.5 }; // neutral center
  }

  return {
    x: weightedX / totalPressure,
    y: weightedY / totalPressure,
  };
}

// ---------------------------------------------------------------------------
// Turn detection
// ---------------------------------------------------------------------------

type TurnDirection = 'left' | 'right' | 'none';

interface TurnDetectionState {
  lastDirection: TurnDirection;
  lateralOffset: number; // positive = right, negative = left
  inTurn: boolean;
}

/** Module-scoped turn state */
const turnState: TurnDetectionState = {
  lastDirection: 'none',
  lateralOffset: 0,
  inTurn: false,
};

/**
 * Detect which direction the skier is turning based on lateral pressure shift.
 *
 * Heuristic:
 *  - When outside-edge pressure (frontLeft / rearLeft) is dominant → right turn (skier leans left).
 *  - When inside-edge pressure (frontRight / rearRight) is dominant → left turn (skier leans right).
 */
export function detectTurnDirection(pressure: PressureData): TurnDirection {
  // Weighted lateral position: 0 = inside edge, 1 = outside edge
  const keys = Object.keys(SENSOR_X) as (keyof PressureData)[];

  let weightedX = 0;
  let total = 0;

  for (const key of keys) {
    const p = pressure[key];
    weightedX += p * SENSOR_X[key];
    total += p;
  }

  if (total < MIN_PRESSURE_THRESHOLD) {
    turnState.inTurn = false;
    return 'none';
  }

  const lateralFraction = weightedX / total; // 0=inside, 1=outside
  turnState.lateralOffset = lateralFraction - 0.5; // deviation from center [-0.5, 0.5]

  if (Math.abs(turnState.lateralOffset) < TURN_LATERAL_THRESHOLD) {
    turnState.inTurn = false;
    turnState.lastDirection = 'none';
    return 'none';
  }

  // Lateral fraction > 0.5 → more pressure on outside edge → right turn
  const direction: TurnDirection = lateralFraction > 0.5 ? 'right' : 'left';
  turnState.lastDirection = direction;
  turnState.inTurn = true;
  return direction;
}

/** Return lateral offset from center (positive = right side, negative = left side) */
export function getLateralOffset(): number {
  return turnState.lateralOffset;
}

/** Reset turn detection state */
export function resetTurnState(): void {
  turnState.lastDirection = 'none';
  turnState.lateralOffset = 0;
  turnState.inTurn = false;
}

// ---------------------------------------------------------------------------
// Frame assembly
// ---------------------------------------------------------------------------

/**
 * Build a complete SensorFrame from raw pressure data by piping it through
 * the full signal chain: normalize → filter → CoP → turn detection.
 */
export function buildSensorFrame(raw: PressureData): SensorFrame {
  const normalized = normalizePressure(raw);
  const filtered   = applyLowPassFilter(normalized);
  const cop        = calculateCenterOfPressure(filtered);

  // Turn direction is also computed during this call (side-effect on turnState)
  detectTurnDirection(filtered);

  return {
    pressure: filtered,
    centerOfPressure: cop,
    timestamp: Date.now(),
  };
}
