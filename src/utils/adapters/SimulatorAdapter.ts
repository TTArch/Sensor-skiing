/**
 * Simulator Adapter
 * Self-contained pressure sensor simulator producing 0.5Hz frames.
 * Generates realistic skiing pressure patterns with Gaussian noise.
 */

import type { SensorAdapter, RawSensorFrame, PressureData } from '../../types';

const FRAME_INTERVAL_MS = 500; // 0.5Hz

const NOISE_VARIANCE = 3;

interface SkiState {
  name: string;
  pressure: PressureData;
  transitionDuration: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const SKIING_STATES: SkiState[] = [
  { name: 'flat_run',      pressure: { frontLeft: 52, frontRight: 52, middle: 45, rearLeft: 48, rearRight: 48 }, transitionDuration: 3000 },
  { name: 'forward',       pressure: { frontLeft: 72, frontRight: 72, middle: 35, rearLeft: 28, rearRight: 28 }, transitionDuration: 2500 },
  { name: 'back_seat',     pressure: { frontLeft: 30, frontRight: 30, middle: 40, rearLeft: 78, rearRight: 78 }, transitionDuration: 2500 },
  { name: 'left_turn',     pressure: { frontLeft: 68, frontRight: 38, middle: 50, rearLeft: 62, rearRight: 42 }, transitionDuration: 2000 },
  { name: 'right_turn',    pressure: { frontLeft: 38, frontRight: 68, middle: 50, rearLeft: 42, rearRight: 62 }, transitionDuration: 2000 },
  { name: 'skidding',      pressure: { frontLeft: 58, frontRight: 58, middle: 30, rearLeft: 68, rearRight: 68 }, transitionDuration: 2000 },
  { name: 'carving_left',  pressure: { frontLeft: 75, frontRight: 30, middle: 60, rearLeft: 65, rearRight: 25 }, transitionDuration: 2000 },
  { name: 'carving_right', pressure: { frontLeft: 30, frontRight: 75, middle: 60, rearLeft: 25, rearRight: 65 }, transitionDuration: 2000 },
];

export class SimulatorAdapter implements SensorAdapter {
  private frameCallback: ((frame: RawSensorFrame) => void) | null = null;
  private _isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Simulation state
  private stateIndex = 0;
  private nextStateIndex = 1;
  private stateElapsedMs = 0;
  private lastTimestamp = 0;
  private currentPressure: PressureData = { frontLeft: 50, frontRight: 50, middle: 45, rearLeft: 50, rearRight: 50 };

  readonly mode: 'simulated' = 'simulated';

  get isRunning(): boolean {
    return this._isRunning;
  }

  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.lastTimestamp = Date.now();
    this.intervalId = setInterval(() => this.tick(), FRAME_INTERVAL_MS);
  }

  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onFrame(cb: (frame: RawSensorFrame) => void): () => void {
    this.frameCallback = cb;
    return () => {
      this.frameCallback = null;
    };
  }

  private tick(): void {
    const now = Date.now();
    const deltaMs = now - this.lastTimestamp;
    this.lastTimestamp = now;

    this.stateElapsedMs += deltaMs;
    const currentState = SKIING_STATES[this.stateIndex];
    const nextState = SKIING_STATES[this.nextStateIndex];

    if (this.stateElapsedMs >= currentState.transitionDuration) {
      this.stateElapsedMs = 0;
      this.stateIndex = this.nextStateIndex;
      this.nextStateIndex = (this.nextStateIndex + 1) % SKIING_STATES.length;
    }

    const progress = Math.min(this.stateElapsedMs / currentState.transitionDuration, 1);
    const eased = easeInOutCubic(progress);

    this.currentPressure = this.interpolate(currentState.pressure, nextState.pressure, eased);
    const noisy = this.applyNoise(this.currentPressure);

    if (this.frameCallback) {
      this.frameCallback({ pressure: noisy, timestamp: now });
    }
  }

  private interpolate(from: PressureData, to: PressureData, t: number): PressureData {
    return {
      frontLeft:  from.frontLeft  + (to.frontLeft  - from.frontLeft)  * t,
      frontRight: from.frontRight + (to.frontRight - from.frontRight) * t,
      middle:    from.middle     + (to.middle     - from.middle)     * t,
      rearLeft:  from.rearLeft   + (to.rearLeft   - from.rearLeft)   * t,
      rearRight: from.rearRight  + (to.rearRight  - from.rearRight)  * t,
    };
  }

  private applyNoise(base: PressureData): PressureData {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    return {
      frontLeft:  clamp(base.frontLeft  + this.gaussian()),
      frontRight: clamp(base.frontRight + this.gaussian()),
      middle:    clamp(base.middle    + this.gaussian() * 0.8),
      rearLeft:  clamp(base.rearLeft  + this.gaussian()),
      rearRight: clamp(base.rearRight + this.gaussian()),
    };
  }

  private gaussian(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * NOISE_VARIANCE;
  }
}
