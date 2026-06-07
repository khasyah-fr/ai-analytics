import { describe, it, expect } from 'vitest';
import { fitLinearTrend, fitMovingAverage, fitHoltWinters } from './forecast.js';

describe('Forecasting Math Utilities', () => {
  
  describe('fitMovingAverage', () => {
    it('should correctly average the last 3 months and project a flat line', () => {
      // Mock history where the last 3 values are 10, 20, 30 (Avg = 20)
      const history = [100, 100, 100, 10, 20, 30];
      const horizon = 2;

      const result = fitMovingAverage(history, horizon, 3);

      // Expect a flat forecast of 20 for both months
      expect(result.forecast).toEqual([20, 20]);
      expect(result.params.window_avg).toBe(20);
      expect(result.params.history_len).toBe(6);
    });

    it('should handle empty or low data historical bounds gracefully without negatives', () => {
      const history = [0, 0, 0];
      const result = fitMovingAverage(history, 1, 3);
      
      expect(result.forecast).toEqual([0]);
    });
  });

  describe('fitLinearTrend', () => {
    it('should fit a perfect upward diagonal line and project future steps', () => {
      // Perfect linear line: y = 2x + 10
      // x = [0, 1, 2, 3], y = [10, 12, 14, 16]
      const history = [10, 12, 14, 16];
      const horizon = 2; 

      const result = fitLinearTrend(history, horizon);

      // Next x positions are 4 and 5
      // Expected y for x=4: 2(4) + 10 = 18
      // Expected y for x=5: 2(5) + 10 = 20
      expect(result.forecast[0]).toBeCloseTo(18, 2);
      expect(result.forecast[1]).toBeCloseTo(20, 2);
      
      // Check regression parameters
      expect(result.params.slope).toBe(2);
      expect(result.params.intercept).toBe(10);
      expect(result.params.r2).toBe(1); // Perfect fit line linear correlation
    });

    it('should clip negative linear trend projections to zero', () => {
      // Sharp downward trend line: y = -10x + 50
      const history = [50, 40, 30, 20]; // x = 0,1,2,3
      const horizon = 3; // x = 4 (y=10), x = 5 (y=0), x = 6 (y=-10 -> clip to 0)

      const result = fitLinearTrend(history, horizon);

      expect(result.forecast[0]).toBeCloseTo(10, 2);
      expect(result.forecast[1]).toBeCloseTo(0, 2);
      expect(result.forecast[2]).toBe(0); // Lower bound check
    });
  });

  describe('fitHoltWinters', () => {
    it('should capture cyclic patterns and reproduce peak intervals next year', () => {
      // 12 months with clear cyclical peak in summer (index 5 & 6)
      const history = [10, 12, 15, 20, 40, 100, 95, 30, 18, 14, 11, 9];
      const horizon = 7; // Forecast through next year's July peak

      const result = fitHoltWinters(history, horizon, 0.2, 0.1, 0.3);

      // Verify execution metadata returned safely
      expect((result.params as any).alpha).toBe(0.2);
      expect(result.params.history_len).toBe(12);

      // Verify that next year's summer forecast maps higher than next year's winter baseline
      const Jan2026 = result.forecast[0];
      const Jun2026 = result.forecast[5];
      const Jul2026 = result.forecast[6];

      expect(Jun2026).toBeGreaterThan(Jan2026);
      expect(Jul2026).toBeGreaterThan(Jan2026);
    });

    it('should smoothly downgrade back to linear trend if historical periods are insufficient', () => {
      // Holt winters requires a minimum window of 12 for month cycles
      const incompleteHistory = [10, 20, 30, 40]; 
      const result = fitHoltWinters(incompleteHistory, 2);

      // Should seamlessly leverage fitLinearTrend underlying logic 
      expect(result.params).toHaveProperty('r2');
      expect(result.forecast[0]).toBeCloseTo(50, 1);
    });
  });
});