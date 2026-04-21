/**
 * BLE Sensor Adapter
 * Self-contained adapter for real BLE pressure sensors.
 *
 * In this MVP, BLE connectivity is stubbed out. When real hardware is
 * integrated, implement the BLE subscription logic here using
 * react-native-ble-plx or expo-bluetooth.
 */

import type { SensorAdapter, RawSensorFrame } from '../../types';

export class BleSensorAdapter implements SensorAdapter {
  private frameCallback: ((frame: RawSensorFrame) => void) | null = null;
  private _isRunning = false;

  readonly mode: 'ble' = 'ble';

  get isRunning(): boolean {
    return this._isRunning;
  }

  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    // TODO: Initialize BLE subscription here.
    // Example (with react-native-ble-plx):
    //   this.subscription = bleManager.startNotification(...)
    // For now this is a no-op — use SimulatorAdapter for testing.
  }

  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;
    // TODO: Cancel BLE subscription
  }

  onFrame(cb: (frame: RawSensorFrame) => void): () => void {
    this.frameCallback = cb;
    return () => {
      this.frameCallback = null;
    };
  }
}
