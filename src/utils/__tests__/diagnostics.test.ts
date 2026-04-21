/**
 * Unit tests for diagnostics.ts
 * Tests back_seat, forward_pressure, weight_imbalance, and other issue detection
 */

import {
  detectBackSeat,
  detectForwardPressure,
  detectWeightImbalance,
  detectUpperBodyRotation,
  detectPoorAngulation,
  detectSkidding,
  detectAllIssues,
  analysePressureHistory,
  DEFAULT_THRESHOLDS,
} from '../diagnostics';

describe('diagnostics', () => {
  describe('detectBackSeat', () => {
    it('should detect back_seat when rear pressure dominates', () => {
      // rear fraction = 160/200 = 0.8 > threshold 0.6
      const pressure = {
        frontLeft: 20,
        frontRight: 20,
        rearLeft: 80,
        rearRight: 80,
        middle: 10,
      };

      const result = detectBackSeat(pressure);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('back_seat');
      expect(result?.severity).toBeDefined();
      expect(result?.tip).toContain('sitting back');
    });

    it('should return null for balanced pressure', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 20,
      };

      const result = detectBackSeat(pressure);

      expect(result).toBeNull();
    });

    it('should return null for front-dominant pressure', () => {
      const pressure = {
        frontLeft: 80,
        frontRight: 80,
        rearLeft: 20,
        rearRight: 20,
        middle: 10,
      };

      const result = detectBackSeat(pressure);

      expect(result).toBeNull();
    });

    it('should return null for zero pressure', () => {
      const pressure = {
        frontLeft: 0,
        frontRight: 0,
        rearLeft: 0,
        rearRight: 0,
        middle: 0,
      };

      const result = detectBackSeat(pressure);

      expect(result).toBeNull();
    });

    it('should detect high severity for extreme back_seat', () => {
      // rear fraction = 190/200 = 0.95, excess = 0.95/0.6 ≈ 1.58 → medium (needs > 1.6 for high)
      // Use extremely dominant rear
      const pressure = {
        frontLeft: 2,
        frontRight: 2,
        rearLeft: 98,
        rearRight: 98,
        middle: 5,
      };

      const result = detectBackSeat(pressure);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('high');
    });
  });

  describe('detectForwardPressure', () => {
    it('should detect forward_pressure when front pressure dominates', () => {
      // front fraction = 160/200 = 0.8 > threshold 0.6
      const pressure = {
        frontLeft: 80,
        frontRight: 80,
        rearLeft: 20,
        rearRight: 20,
        middle: 10,
      };

      const result = detectForwardPressure(pressure);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('forward_pressure');
      expect(result?.tip).toContain('too far forward');
    });

    it('should return null for balanced pressure', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 20,
      };

      const result = detectForwardPressure(pressure);

      expect(result).toBeNull();
    });

    it('should detect high severity for extreme forward pressure', () => {
      // front fraction = 190/200 = 0.95, excess = 0.95/0.6 ≈ 1.58 → medium
      // Need more extreme for high severity (excess > 1.6)
      const pressure = {
        frontLeft: 98,
        frontRight: 98,
        rearLeft: 2,
        rearRight: 2,
        middle: 5,
      };

      const result = detectForwardPressure(pressure);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('high');
    });
  });

  describe('detectWeightImbalance', () => {
    it('should detect weight_imbalance when left is dominant', () => {
      // left = 140, right = 60, ratio = 2.33 > threshold 1.4
      const pressure = {
        frontLeft: 70,
        frontRight: 30,
        rearLeft: 70,
        rearRight: 30,
        middle: 20,
      };

      const result = detectWeightImbalance(pressure);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('weight_imbalance');
      expect(result?.tip).toContain('Weight imbalance');
    });

    it('should detect weight_imbalance when right is dominant', () => {
      const pressure = {
        frontLeft: 30,
        frontRight: 70,
        rearLeft: 30,
        rearRight: 70,
        middle: 20,
      };

      const result = detectWeightImbalance(pressure);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('weight_imbalance');
    });

    it('should return null for balanced weight', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 20,
      };

      const result = detectWeightImbalance(pressure);

      expect(result).toBeNull();
    });

    it('should return null for zero pressure', () => {
      const pressure = {
        frontLeft: 0,
        frontRight: 0,
        rearLeft: 0,
        rearRight: 0,
        middle: 0,
      };

      const result = detectWeightImbalance(pressure);

      expect(result).toBeNull();
    });
  });

  describe('detectUpperBodyRotation', () => {
    it('should detect upper_body_rotation with diagonal imbalance', () => {
      // Use custom thresholds that we know will trigger detection
      const customThresholds = {
        ...DEFAULT_THRESHOLDS,
        lateralImbalance: 0.15, // Much lower threshold
      };

      // This pressure has enough lateral deviation AND diagonal asymmetry
      // leftTotal = 85+75=160, rightTotal = 15+25=40, deviation=0.3 > 0.09 ✓
      // diagLeft=85+25=110, diagRight=15+75=90, diagImbalance=0.1 > 0.075 ✓
      const pressure = {
        frontLeft: 85,
        frontRight: 15,
        rearLeft: 75,
        rearRight: 25,
        middle: 20,
      };

      const result = detectUpperBodyRotation(pressure, customThresholds);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('upper_body_rotation');
    });

    it('should return null for balanced lateral pressure', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 20,
      };

      const result = detectUpperBodyRotation(pressure);

      expect(result).toBeNull();
    });
  });

  describe('detectPoorAngulation', () => {
    it('should detect poor_angulation when arch pressure is low', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 5, // Low arch pressure
      };

      const result = detectPoorAngulation(pressure);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('poor_angulation');
    });

    it('should return null when arch pressure is sufficient', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 20, // Sufficient arch pressure
      };

      const result = detectPoorAngulation(pressure);

      expect(result).toBeNull();
    });

    it('should detect high severity for very low arch pressure', () => {
      const pressure = {
        frontLeft: 50,
        frontRight: 50,
        rearLeft: 50,
        rearRight: 50,
        middle: 2, // Very low
      };

      const result = detectPoorAngulation(pressure);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('high');
    });
  });

  describe('detectSkidding', () => {
    it('should detect skidding with high pressure and centered COP', () => {
      const pressure = {
        frontLeft: 80,
        frontRight: 80,
        rearLeft: 80,
        rearRight: 80,
        middle: 10,
      };

      const result = detectSkidding(pressure, 0.5); // Centered COP

      expect(result).not.toBeNull();
      expect(result?.type).toBe('skidding');
      expect(result?.tip).toContain('skidding');
    });

    it('should return null for low total pressure', () => {
      const pressure = {
        frontLeft: 30,
        frontRight: 30,
        rearLeft: 30,
        rearRight: 30,
        middle: 5,
      };

      const result = detectSkidding(pressure, 0.5);

      expect(result).toBeNull();
    });

    it('should return null when COP is off-center (carving)', () => {
      const pressure = {
        frontLeft: 80,
        frontRight: 80,
        rearLeft: 80,
        rearRight: 80,
        middle: 10,
      };

      const result = detectSkidding(pressure, 0.7); // Off-center COP

      expect(result).toBeNull();
    });
  });

  describe('detectAllIssues', () => {
    it('should detect multiple issues simultaneously', () => {
      // Create pressure that triggers poor_angulation AND skidding
      // poor_angulation: arch < 15 AND lateralSpan <= 0.1
      // skidding: total >= 300 AND copDeviation <= 0.15
      const pressure = {
        frontLeft: 80,
        frontRight: 80,
        rearLeft: 80,
        rearRight: 80,
        middle: 5, // Low arch triggers poor_angulation
      };

      const issues = detectAllIssues(pressure, 0.5); // Centered COP triggers skidding

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.map(i => i.type)).toContain('poor_angulation');
      expect(issues.map(i => i.type)).toContain('skidding');
    });

    it('should return empty array for perfect pressure', () => {
      const pressure = {
        frontLeft: 45,
        frontRight: 45,
        rearLeft: 45,
        rearRight: 45,
        middle: 30,
      };

      const issues = detectAllIssues(pressure, 0.5);

      expect(issues.length).toBe(0);
    });
  });

  describe('analysePressureHistory', () => {
    it('should count issue frequencies over multiple frames', () => {
      const history = [
        { pressure: { frontLeft: 85, frontRight: 85, rearLeft: 20, rearRight: 20, middle: 10 }, copX: 0.6 },
        { pressure: { frontLeft: 80, frontRight: 80, rearLeft: 25, rearRight: 25, middle: 10 }, copX: 0.6 },
        { pressure: { frontLeft: 75, frontRight: 75, rearLeft: 30, rearRight: 30, middle: 10 }, copX: 0.55 },
      ];

      const issues = analysePressureHistory(history);

      const forwardIssue = issues.find(i => i.type === 'forward_pressure');
      expect(forwardIssue).toBeDefined();
      expect(forwardIssue?.frequency).toBe(3);
    });

    it('should track maximum severity across frames', () => {
      // First frame: moderate forward pressure (medium severity likely)
      // Second frame: extreme forward pressure (high severity)
      const history = [
        { pressure: { frontLeft: 70, frontRight: 70, rearLeft: 30, rearRight: 30, middle: 10 }, copX: 0.55 },
        { pressure: { frontLeft: 98, frontRight: 98, rearLeft: 2, rearRight: 2, middle: 5 }, copX: 0.6 },
      ];

      const issues = analysePressureHistory(history);

      const forwardIssue = issues.find(i => i.type === 'forward_pressure');
      expect(forwardIssue?.severity).toBe('high'); // From the extreme frame
    });

    it('should return empty array for clean history', () => {
      const history = [
        { pressure: { frontLeft: 45, frontRight: 45, rearLeft: 45, rearRight: 45, middle: 30 }, copX: 0.5 },
        { pressure: { frontLeft: 50, frontRight: 50, rearLeft: 50, rearRight: 50, middle: 25 }, copX: 0.5 },
      ];

      const issues = analysePressureHistory(history);

      expect(issues.length).toBe(0);
    });
  });
});
