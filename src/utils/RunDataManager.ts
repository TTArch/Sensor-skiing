/**
 * Run Data Manager
 * Manages the ring buffer of processed frames and per-run statistics.
 * Coordinates signal processing, issue detection, and run scoring.
 */

import { buildSensorFrame, resetFilterState } from './signalProcessor';
import { detectAllIssues, analysePressureHistory } from './diagnostics';
import { calculateRunScore } from './scoring';
import type { RawSensorFrame, ProcessedFrame, RunData, PressureData } from '../types';

const MAX_FRAMES = 60; // 30s at 0.5Hz

export class RunDataManager {
  private buffer: ProcessedFrame[] = [];
  private turnCount = 0;
  private lastTurnSign = 0;
  private runStartTime = Date.now();

  /**
   * Ingest a raw sensor frame: process it through the signal chain and
   * append a ProcessedFrame to the ring buffer.
   */
  pushRaw(raw: PressureData, timestamp: number): void {
    // 1. buildSensorFrame (normalize + filter + CoP)
    const frame = buildSensorFrame(raw);
    // 2. detectAllIssues
    const issues = detectAllIssues(frame.pressure, frame.centerOfPressure.x);
    // 3. turn detection (sign flip of copX — positive = right turn, negative = left turn)
    const sign = Math.sign(frame.centerOfPressure.x - 0.5);
    if (sign !== 0 && sign !== this.lastTurnSign) {
      this.turnCount++;
    }
    if (sign !== 0) this.lastTurnSign = sign;
    // 4. ring buffer
    if (this.buffer.length >= MAX_FRAMES) {
      this.buffer.shift();
    }
    this.buffer.push({
      pressure: frame.pressure,
      centerOfPressure: frame.centerOfPressure,
      timestamp,
      issues,
    });
  }

  /** Returns the most recent processed frame, or null if the buffer is empty. */
  getLatestFrame(): ProcessedFrame | null {
    return this.buffer[this.buffer.length - 1] ?? null;
  }

  /** Returns the number of turns detected so far in this run. */
  getTurnCount(): number {
    return this.turnCount;
  }

  /**
   * Finalize the current run: aggregate issues across the full pressure history,
   * compute the score, and return a RunData object.
   * Resets filter state and internal counters after building.
   */
  buildRunData(endTime: number): RunData {
    resetFilterState();
    const history = this.buffer.map((f) => ({
      pressure: f.pressure,
      copX: f.centerOfPressure.x,
    }));
    const aggregatedIssues = analysePressureHistory(history);
    const score = calculateRunScore(aggregatedIssues);
    const runData: RunData = {
      id: `run_${this.runStartTime}`,
      startTime: this.runStartTime,
      endTime,
      duration: Math.round((endTime - this.runStartTime) / 1000),
      pressureHistory: [...this.buffer],
      turnCount: this.turnCount,
      aggregatedIssues,
      score,
    };
    return runData;
  }

  /** Reset all state for a new run. */
  reset(): void {
    this.buffer = [];
    this.turnCount = 0;
    this.lastTurnSign = 0;
    this.runStartTime = Date.now();
    resetFilterState();
  }
}
