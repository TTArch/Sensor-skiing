/**
 * Real-time pressure visualization for ski coach
 * Shows foot-shaped outlines with pressure heatmap circles
 * PERFORMANCE: Updates at 20Hz, only re-renders on significant changes
 * 5-sensor layout: 2 front (left/right), 1 middle (center), 2 rear (left/right)
 */
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse, Circle, Line } from 'react-native-svg';
import type { PressureData, CenterOfPressure } from '../types';
import { getPressureColor, getPressureRadius } from '../utils/theme';

interface PressureVizProps {
  pressure: PressureData;
  centerOfPressure: CenterOfPressure;
}

// Custom comparator for React.memo - only re-render if pressure changes >5
function pressureChangedSignificantly(
  prev: PressureData,
  next: PressureData
): boolean {
  const threshold = 5;
  return (
    Math.abs(prev.frontLeft - next.frontLeft) > threshold ||
    Math.abs(prev.frontRight - next.frontRight) > threshold ||
    Math.abs(prev.middle - next.middle) > threshold ||
    Math.abs(prev.rearLeft - next.rearLeft) > threshold ||
    Math.abs(prev.rearRight - next.rearRight) > threshold
  );
}

const PressureViz = memo<PressureVizProps>(
  ({ pressure, centerOfPressure }) => {
    // Foot dimensions
    const footWidth = 80;
    const footHeight = 180;
    const leftFootX = 100;
    const rightFootX = 220;
    const footY = 100;

    // Sensor positions relative to foot center (normalized -0.5 to 0.5)
    const sensorPositions = {
      frontLeft: { x: -0.3, y: -0.35 },
      frontRight: { x: 0.3, y: -0.35 },
      middle: { x: 0, y: 0 },
      rearLeft: { x: -0.25, y: 0.35 },
      rearRight: { x: 0.25, y: 0.35 },
    };

    // Calculate sensor positions in SVG coordinates
    const getSensorCoords = (
      footX: number,
      pos: { x: number; y: number }
    ) => ({
      x: footX + pos.x * footWidth,
      y: footY + pos.y * footHeight,
    });

    // Sensor data for each foot
    const leftSensors = [
      { key: 'frontLeft', data: pressure.frontLeft, pos: sensorPositions.frontLeft },
      { key: 'middle', data: pressure.middle, pos: sensorPositions.middle },
      { key: 'rearLeft', data: pressure.rearLeft, pos: sensorPositions.rearLeft },
    ];

    const rightSensors = [
      { key: 'frontRight', data: pressure.frontRight, pos: sensorPositions.frontRight },
      { key: 'middle', data: pressure.middle, pos: sensorPositions.middle },
      { key: 'rearRight', data: pressure.rearRight, pos: sensorPositions.rearRight },
    ];

    // Center of pressure crosshair
    const copX = 160 + (centerOfPressure.x - 0.5) * footWidth * 2;
    const copY = footY + (centerOfPressure.y - 0.5) * footHeight;

    return (
      <View style={styles.container}>
        <Svg width={320} height={220} viewBox="0 0 320 220">
          {/* Left foot outline */}
          <Ellipse
            cx={leftFootX}
            cy={footY}
            rx={footWidth / 2}
            ry={footHeight / 2}
            stroke="#444"
            strokeWidth={2}
            fill="transparent"
          />
          {/* Left foot label */}
          <Ellipse
            cx={leftFootX}
            cy={footY + footHeight / 2 + 20}
            rx={footWidth / 2}
            ry={15}
            stroke="#333"
            strokeWidth={1}
            fill="transparent"
          />

          {/* Right foot outline */}
          <Ellipse
            cx={rightFootX}
            cy={footY}
            rx={footWidth / 2}
            ry={footHeight / 2}
            stroke="#444"
            strokeWidth={2}
            fill="transparent"
          />
          {/* Right foot label */}
          <Ellipse
            cx={rightFootX}
            cy={footY + footHeight / 2 + 20}
            rx={footWidth / 2}
            ry={15}
            stroke="#333"
            strokeWidth={1}
            fill="transparent"
          />

          {/* Left foot sensors */}
          {leftSensors.map(({ key, data, pos }) => {
            const coords = getSensorCoords(leftFootX, pos);
            return (
              <Circle
                key={key}
                cx={coords.x}
                cy={coords.y}
                r={getPressureRadius(data)}
                fill={getPressureColor(data)}
                opacity={0.8}
              />
            );
          })}

          {/* Right foot sensors */}
          {rightSensors.map(({ key, data, pos }) => {
            const coords = getSensorCoords(rightFootX, pos);
            return (
              <Circle
                key={key}
                cx={coords.x}
                cy={coords.y}
                r={getPressureRadius(data)}
                fill={getPressureColor(data)}
                opacity={0.8}
              />
            );
          })}

          {/* Center of pressure crosshair */}
          <Line
            x1={copX - 8}
            y1={copY}
            x2={copX + 8}
            y2={copY}
            stroke="#00E5FF"
            strokeWidth={2}
          />
          <Line
            x1={copX}
            y1={copY - 8}
            x2={copX}
            y2={copY + 8}
            stroke="#00E5FF"
            strokeWidth={2}
          />
          <Circle
            cx={copX}
            cy={copY}
            r={4}
            fill="#00E5FF"
          />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return !pressureChangedSignificantly(prevProps.pressure, nextProps.pressure);
  }
);

PressureViz.displayName = 'PressureViz';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0F',
  },
});

export default PressureViz;
