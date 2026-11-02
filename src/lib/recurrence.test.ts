/**
 * Tests for recurring-event helpers.
 */

import { describe, it, expect } from "vitest";
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

  it("keeps weekly dates stable across a DST change", () => {
    // US clocks spring forward on 2026-03-08
    const dates = generateRecurringDates("2026-03-01", "weekly", 3);

    expect(dates).toEqual(["2026-03-01", "2026-03-08", "2026-03-15"]);
  });
});
