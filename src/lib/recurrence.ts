/**
 * Generate a unique series ID for recurring events.
 * Exported for testing.
 */
export function generateSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate future dates based on recurrence pattern.
 * Exported for testing.
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param pattern - Recurrence pattern: 'weekly', 'biweekly', or 'monthly'
 * @param count - Number of occurrences to generate
 * @returns Array of dates in YYYY-MM-DD format
 */
export function generateRecurringDates(
  startDate: string,
  pattern: string,
  count: number,
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");

  for (let i = 0; i < count; i++) {
    const date = new Date(start);

    switch (pattern) {
      case "weekly":
        date.setDate(start.getDate() + i * 7);
        break;
      case "biweekly":
        date.setDate(start.getDate() + i * 14);
        break;
      case "monthly":
        date.setMonth(start.getMonth() + i);
        break;
    }

    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}
