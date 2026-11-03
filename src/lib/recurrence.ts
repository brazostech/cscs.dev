/**
 * Generate a unique series ID for recurring events.
 * Exported for testing.
 */
export function generateSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Number of days in a month. `month` is 1-12. */
function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one. UTC avoids any
  // local-timezone or DST influence.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Calculate future dates based on recurrence pattern.
 * Exported for testing.
 *
 * Dates are pure calendar dates (YYYY-MM-DD), so the maths is done on the
 * year/month/day numbers and in UTC. Nothing depends on the local timezone or
 * DST. The event's time of day is a separate form field, copied unchanged onto
 * every occurrence by the caller.
 *
 * Monthly: every occurrence is computed from the original start date (start
 * month + i), with the day clamped to the last day of that month. Jan 31 gives
 * Jan 31, Feb 28 (29 in a leap year), Mar 31, Apr 30. It never chains from the
 * previous occurrence.
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
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);

  for (let i = 0; i < count; i++) {
    let year = startYear;
    let month = startMonth;
    let day = startDay;

    switch (pattern) {
      case "weekly":
      case "biweekly": {
        const date = new Date(
          Date.UTC(
            startYear,
            startMonth - 1,
            startDay + i * (pattern === "weekly" ? 7 : 14),
          ),
        );
        year = date.getUTCFullYear();
        month = date.getUTCMonth() + 1;
        day = date.getUTCDate();
        break;
      }
      case "monthly": {
        const monthIndex = startMonth - 1 + i;
        year = startYear + Math.floor(monthIndex / 12);
        month = (monthIndex % 12) + 1;
        day = Math.min(startDay, daysInMonth(year, month));
        break;
      }
    }

    dates.push(`${pad(year, 4)}-${pad(month)}-${pad(day)}`);
  }

  return dates;
}
