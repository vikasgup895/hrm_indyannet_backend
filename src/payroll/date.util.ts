// Utility functions for payroll date policies

/**
 * Return the default pay date for a payroll period defined by year and month.
 * Policy: 10th of the following month.
 * @param year Full year (e.g., 2025)
 * @param month Zero-based month (0=Jan ... 11=Dec) representing the period's month
 */
export function getDefaultPayDateForMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 10);
}

/**
 * Return the default pay date for a payroll period given any date within the period.
 * Policy: 10th of the following month.
 */
export function getDefaultPayDateForPeriodDate(periodDate: Date): Date {
  const y = periodDate.getFullYear();
  const m = periodDate.getMonth();
  return getDefaultPayDateForMonth(y, m);
}
