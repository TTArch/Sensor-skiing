/**
 * useSensor hook - provides pressure data from a sensor adapter
 * Supports both simulated and BLE modes via SensorAdapter abstraction.
 * Handles both connection management (connect/disconnect) and run lifecycle.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createSensorAdapter } from '../utils/adapters';
import { RunDataManager } from '../utils/RunDataManager';
import { useStore } from '../store';
import type { ProcessedFrame, PressureData, CenterOfPressure, RunData } from '../types';

export interface UseSensorReturn {
  pressure: PressureData;
  centerOfPressure: CenterOfPressure;
  currentFrame: ProcessedFrame | null;
  turnCount: number;
  batteryLevel: number | null;
  startScanning: () => void;
  stopScanning: () => void;
  startRun: () => void;
  endRun: () => RunData;
}

export function useSensor(mode: 'simulated' | 'ble' = 'simulated'): UseSensorReturn {
  const { setConnectionStatus } = useStore();
  const adapter = useRef(createSensorAdapter(mode)).current;
  const manager = useRef(new RunDataManager()).current;

  const [currentFrame, setCurrentFrame] = useState<ProcessedFrame | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [batteryLevel] = useState<number | null>(null);

  useEffect(() => {
    // Subscribe to frames — adapter is lazily started by startRun()
    const unsub = adapter.onFrame((raw) => {
      manager.pushRaw(raw.pressure, raw.timestamp);
      const latest = manager.getLatestFrame();
      if (latest) {
        setCurrentFrame(latest);
        setTurnCount(manager.getTurnCount());
      }
    });
    return unsub;
  }, [adapter, manager]);

  const startScanning = useCallback(() => {
    setConnectionStatus(mode === 'simulated' ? 'simulated' : 'connected');
  }, [mode, setConnectionStatus]);

  const stopScanning = useCallback(() => {
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  const startRun = useCallback(() => {
    manager.reset();
    setCurrentFrame(null);
    setTurnCount(0);
    adapter.start();
  }, [adapter, manager]);

  const endRun = useCallback(() => {
    adapter.stop();
    return manager.buildRunData(Date.now());
  }, [adapter, manager]);

  return {
    pressure:
      currentFrame?.pressure ?? {
        frontLeft: 50,
        frontRight: 50,
        middle: 45,
        rearLeft: 50,
        rearRight: 50,
      },
    centerOfPressure: currentFrame?.centerOfPressure ?? { x: 0.5, y: 0.4 },
    currentFrame,
    turnCount,
    batteryLevel,
    startScanning,
    stopScanning,
    startRun,
    endRun,
  };
}
