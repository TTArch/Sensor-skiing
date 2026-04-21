/**
 * Sensor Adapters
 * Factory and re-exports for SensorAdapter implementations.
 */

import { SimulatorAdapter } from './SimulatorAdapter';
import { BleSensorAdapter } from './BleSensorAdapter';
import type { SensorAdapter } from '../../types';

export function createSensorAdapter(mode: 'simulated' | 'ble'): SensorAdapter {
  if (mode === 'simulated') {
    return new SimulatorAdapter();
  }
  return new BleSensorAdapter();
}

export { SimulatorAdapter } from './SimulatorAdapter';
export { BleSensorAdapter } from './BleSensorAdapter';
