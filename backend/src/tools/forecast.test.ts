import { describe, it, expect } from 'vitest';
import { fitLinearTrend, fitMovingAverage } from './forecast.ts';

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
});