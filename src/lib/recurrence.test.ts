/**
 * Tests for recurring-event helpers.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateRecurringDates, generateSeriesId } from "./recurrence";

describe("generateSeriesId", () => {
  it("generates unique IDs with series_ prefix", () => {
    const id1 = generateSeriesId();
    const id2 = generateSeriesId();

    expect(id1).toMatch(/^series_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^series_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe("generateRecurringDates", () => {
  it("generates weekly dates with 7-day intervals", () => {
    const dates = generateRecurringDates("2026-01-01", "weekly", 4);

    expect(dates).toEqual([
      "2026-01-01",
      "2026-01-08",
      "2026-01-15",
      "2026-01-22",
    ]);
  });

  it("generates biweekly dates with 14-day intervals", () => {
    const dates = generateRecurringDates("2026-01-01", "biweekly", 4);

    expect(dates).toEqual([
      "2026-01-01",
      "2026-01-15",
      "2026-01-29",
      "2026-02-12",
    ]);
  });

  it("generates monthly dates correctly", () => {
    const dates = generateRecurringDates("2026-01-15", "monthly", 4);

    expect(dates).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ]);
  });

  it("handles month boundary crossings for weekly pattern", () => {
    const dates = generateRecurringDates("2026-01-29", "weekly", 3);

    expect(dates).toEqual(["2026-01-29", "2026-02-05", "2026-02-12"]);
  });

  it("handles year boundary crossings", () => {
    const dates = generateRecurringDates("2026-12-15", "monthly", 3);

    expect(dates).toEqual(["2026-12-15", "2027-01-15", "2027-02-15"]);
  });

  it("generates single date when count is 1", () => {
    const dates = generateRecurringDates("2026-01-01", "weekly", 1);

    expect(dates).toEqual(["2026-01-01"]);
  });

  describe("across a DST change", () => {
    // Use a real DST zone so the test does not depend on the CI machine's
    // timezone (CI runs in UTC), and restore it so other test files are
    // unaffected.
    const originalTz = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = "America/Chicago";
    });

    afterEach(() => {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    });

    it("keeps weekly dates on the same weekday when clocks fall back", () => {
      // US clocks fall back on 2026-11-01; adding 7 * 24h of milliseconds in
      // local time would land on 2026-10-31 23:00 and give the wrong date.
      const dates = generateRecurringDates("2026-10-25", "weekly", 4);

      expect(dates).toEqual([
        "2026-10-25",
        "2026-11-01",
        "2026-11-08",
        "2026-11-15",
      ]);
    });
  });

  describe("monthly clamping", () => {
    it("clamps a day-31 start to the end of shorter months", () => {
      const dates = generateRecurringDates("2026-01-31", "monthly", 4);

      expect(dates).toEqual([
        "2026-01-31",
        "2026-02-28",
        "2026-03-31",
        "2026-04-30",
      ]);
    });

    it("clamps a day-30 start to Feb 28 and returns to 30 afterwards", () => {
      const dates = generateRecurringDates("2026-01-30", "monthly", 3);

      expect(dates).toEqual(["2026-01-30", "2026-02-28", "2026-03-30"]);
    });

    it("clamps a day-29 start to Feb 28 in a non-leap year", () => {
      const dates = generateRecurringDates("2026-01-29", "monthly", 3);

      expect(dates).toEqual(["2026-01-29", "2026-02-28", "2026-03-29"]);
    });

    it("keeps day 29 in February of a leap year", () => {
      const dates = generateRecurringDates("2028-01-29", "monthly", 3);

      expect(dates).toEqual(["2028-01-29", "2028-02-29", "2028-03-29"]);
    });

    it("clamps day 31 to Feb 29 in a leap year", () => {
      const dates = generateRecurringDates("2028-01-31", "monthly", 3);

      expect(dates).toEqual(["2028-01-31", "2028-02-29", "2028-03-31"]);
    });

    it("clamps day 30 to Feb 29 in a leap year", () => {
      const dates = generateRecurringDates("2028-01-30", "monthly", 2);

      expect(dates).toEqual(["2028-01-30", "2028-02-29"]);
    });

    it("computes each date from the start date, not the previous one", () => {
      // Chaining from Feb 28 would give Mar 28; Mar 31 and May 31 prove it does not.
      const dates = generateRecurringDates("2026-01-31", "monthly", 5);

      expect(dates).toEqual([
        "2026-01-31",
        "2026-02-28",
        "2026-03-31",
        "2026-04-30",
        "2026-05-31",
      ]);
    });

    it("clamps across a year boundary", () => {
      const dates = generateRecurringDates("2026-10-31", "monthly", 5);

      expect(dates).toEqual([
        "2026-10-31",
        "2026-11-30",
        "2026-12-31",
        "2027-01-31",
        "2027-02-28",
      ]);
    });

    it("clamps to Feb 29 when a series from a non-leap year reaches a leap year", () => {
      const dates = generateRecurringDates("2027-12-31", "monthly", 3);

      expect(dates).toEqual(["2027-12-31", "2028-01-31", "2028-02-29"]);
    });

    it("spans more than twelve months without drifting", () => {
      const dates = generateRecurringDates("2026-01-31", "monthly", 14);

      expect(dates[1]).toBe("2026-02-28");
      expect(dates[12]).toBe("2027-01-31");
      expect(dates[13]).toBe("2027-02-28");
    });
  });
});
