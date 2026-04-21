/**
 * Type definitions for Ski Coach MVP
 */

// Raw sensor frame from adapter (already normalized 0-100)
export interface RawSensorFrame {
  pressure: PressureData;
  timestamp: number;
}

// Processed frame after signal processing
export interface ProcessedFrame {
  pressure: PressureData;
  centerOfPressure: CenterOfPressure;
  timestamp: number;
  issues: SkiIssue[];
}

// Complete run data accumulated during a run
export interface RunData {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  pressureHistory: ProcessedFrame[];  // ring buffer, max 60 frames (30s)
  turnCount: number;
  aggregatedIssues: SkiIssue[];
  score: number;
}

// Sensor adapter interface
export interface SensorAdapter {
  start(): void;
  stop(): void;
  onFrame(cb: (frame: RawSensorFrame) => void): () => void;
  readonly mode: 'simulated' | 'ble';
  readonly isRunning: boolean;
}

// Connection state for BLE/simulator
export type ConnectionStatus = 'connected' | 'disconnected' | 'simulated';

// Pressure sensor data (0-100 scale for each point)
// 5-sensor layout: 2 front (left/right), 1 middle (center), 2 rear (left/right)
export interface PressureData {
  frontLeft: number;
  frontRight: number;
  middle: number;
  rearLeft: number;
  rearRight: number;
}

// Normalized center of pressure (0-1 range)
export interface CenterOfPressure {
  x: number;
  y: number;
}

// Types of ski issues that can be detected
export type IssueType =
  | 'back_seat'
  | 'forward_pressure'
  | 'upper_body_rotation'
  | 'poor_angulation'
  | 'skidding'
  | 'weight_imbalance';

// Severity levels for issues
export type Severity = 'low' | 'medium' | 'high';

// Individual ski issue with coaching info
export interface SkiIssue {
  type: IssueType;
  severity: Severity;
  frequency: number; // Count of occurrences
  tip: string; // Coaching tip for this issue
}

// Complete run result for history
export interface RunResult {
  id: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  duration: number; // Seconds
  turnCount: number;
  score: number; // 0-100
  issues: SkiIssue[];
  dominantIssue: IssueType | null;
}

// Simulator presets
export type SimulatorPreset = 'mixed_realistic' | 'aggressive' | 'beginner';

// Coaching message from voice coach
export interface CoachingMessage {
  text: string;
  issueType: IssueType | null;
  timestamp: number;
}

// Sensor frame update
export interface SensorFrame {
  pressure: PressureData;
  centerOfPressure: CenterOfPressure;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Data Pipeline interfaces
// ---------------------------------------------------------------------------

/** Raw sensor frame emitted by a SensorAdapter (already normalized 0-100) */
export interface RawSensorFrame {
  pressure: PressureData;
  timestamp: number;
}

/** Processed frame after signal processing (filter + CoP + issue detection) */
export interface ProcessedFrame {
  pressure: PressureData;
  centerOfPressure: CenterOfPressure;
  timestamp: number;
  issues: SkiIssue[];
}

/** Complete run data accumulated during a run (internal, not persisted) */
export interface RunData {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  pressureHistory: ProcessedFrame[]; // ring buffer, max 60 frames (30s at 0.5Hz)
  turnCount: number;
  aggregatedIssues: SkiIssue[];
  score: number;
}

/** Sensor adapter interface — abstracts BLE vs simulated data source */
export interface SensorAdapter {
  start(): void;
  stop(): void;
  onFrame(cb: (frame: RawSensorFrame) => void): () => void;
  readonly mode: 'simulated' | 'ble';
  readonly isRunning: boolean;
}

// BLE device info
export interface DeviceInfo {
  id: string;
  name: string;
  batteryLevel: number | null;
}

// Aggregated trip data for LLM summarization
export interface TripSummaryRequest {
  runId: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  turnCount: number;
  pressureStats: {
    avgFrontLeft: number;
    avgFrontRight: number;
    avgMiddle: number;
    avgRearLeft: number;
    avgRearRight: number;
    avgOverall: number;
  };
  issueSummary: {
    type: IssueType;
    frequency: number;
    maxSeverity: Severity;
    timestamps: number[];
  }[];
  skillAssessment: {
    carvingRatio: number;
    skiddingRatio: number;
    balanceScore: number;
  };
  improvementAreas: IssueType[];
}

// LLM summary result
export interface LLMSummaryResult {
  runId: string;
  summary: string;
  generatedAt: number;
  keyInsights: string[];
}
