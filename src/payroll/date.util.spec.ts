import {
  getDefaultPayDateForMonth,
  getDefaultPayDateForPeriodDate,
} from './date.util';

describe('payroll date policy (10th of next month)', () => {
  it('returns 10th of next month for a given year/month', () => {
    const d = getDefaultPayDateForMonth(2025, 10); // Nov 2025 (0-based)
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11); // December
    expect(d.getDate()).toBe(10);
  });

  it('handles December rollover to next year', () => {
    const d = getDefaultPayDateForMonth(2025, 11); // Dec 2025
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(10);
  });

  it('computes from period date (any day within the month)', () => {
    const periodDate = new Date(2025, 6, 31); // July 31, 2025
    const d = getDefaultPayDateForPeriodDate(periodDate);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7); // August
    expect(d.getDate()).toBe(10);
  });
});
