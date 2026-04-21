/**
 * Design tokens for Ski Coach MVP
 * Near-black background, high contrast text, cyan accent
 */

// Background colors
export const colors = {
  background: '#0A0A0F',
  cardBackground: '#1A1A2E',
  primary: '#00E5FF', // Cyan accent
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  warning: '#FF9800',
  danger: '#FF3D00',
  success: '#00E676',
  connected: '#00E676',
  disconnected: '#FF3D00',
  simulated: '#FF9800',
} as const;

// Font sizes optimized for glancing
export const fontSize = {
  title: 32,
  score: 64,
  body: 18,
  label: 14,
  timer: 28,
  coaching: 24,
} as const;

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Border radius
export const borderRadius = {
  card: 16,
  button: 30,
} as const;

// Touch targets
export const touchTarget = {
  minimum: 56,
  button: 80,
  heroButton: 120,
} as const;

// Pressure color interpolation
export const pressureColors = {
  light: '#00E676', // 0-30
  medium: '#FF9800', // 30-60
  heavy: '#FF3D00', // 60-100
} as const;

// Get pressure color based on value (0-100)
export function getPressureColor(pressure: number): string {
  if (pressure < 30) return pressureColors.light;
  if (pressure < 60) return pressureColors.medium;
  return pressureColors.heavy;
}

// Map pressure to radius (8-20px range)
export function getPressureRadius(pressure: number): number {
  return 8 + (pressure / 100) * 12;
}
