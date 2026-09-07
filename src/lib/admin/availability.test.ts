import { describe, expect, it } from "vitest";
import { layoutCalendarBars, rangesOverlap, utilisationPercentage } from "./availability";

describe("rangesOverlap", () => {
  it("detects overlapping handover timestamps", () => {
    expect(rangesOverlap("2026-09-10T09:00:00+05:30", "2026-09-10T18:00:00+05:30", "2026-09-10T12:00:00+05:30", "2026-09-10T20:00:00+05:30")).toBe(true);
  });

  it("allows a same-day turnaround at the exact boundary", () => {
    expect(rangesOverlap("2026-09-10T09:00:00+05:30", "2026-09-10T11:00:00+05:30", "2026-09-10T11:00:00+05:30", "2026-09-10T17:00:00+05:30")).toBe(false);
  });

  it("supports a single-day rental with different times", () => {
    expect(rangesOverlap("2026-09-10T09:00:00+05:30", "2026-09-10T18:00:00+05:30", "2026-09-11T09:00:00+05:30", "2026-09-11T18:00:00+05:30")).toBe(false);
  });
});

describe("utilisationPercentage", () => {
  it("clips intervals to the reporting window", () => {
    expect(utilisationPercentage([
      { startAt: "2026-09-09T00:00:00Z", endAt: "2026-09-11T00:00:00Z" },
      { startAt: "2026-09-13T00:00:00Z", endAt: "2026-09-15T00:00:00Z" },
    ], "2026-09-10T00:00:00Z", "2026-09-14T00:00:00Z")).toBe(50);
  });

  it("merges overlaps so utilisation never double-counts time", () => {
    expect(utilisationPercentage([
      { startAt: "2026-09-10T00:00:00Z", endAt: "2026-09-13T00:00:00Z" },
      { startAt: "2026-09-12T00:00:00Z", endAt: "2026-09-14T00:00:00Z" },
    ], "2026-09-10T00:00:00Z", "2026-09-14T00:00:00Z")).toBe(100);
  });
});

describe("layoutCalendarBars", () => {
  it("positions and clips bars inside the visible day columns", () => {
    const [bar] = layoutCalendarBars([{ id: "booking-1", startAt: "2026-09-09T12:00:00Z", endAt: "2026-09-13T12:00:00Z" }], "2026-09-10T00:00:00Z", 3);
    expect(bar).toMatchObject({ startColumn: 1, span: 3, startsBeforeWindow: true, endsAfterWindow: true });
  });

  it("omits bars outside the calendar window", () => {
    expect(layoutCalendarBars([{ id: "booking-1", startAt: "2026-09-01T00:00:00Z", endAt: "2026-09-02T00:00:00Z" }], "2026-09-10T00:00:00Z", 14)).toEqual([]);
  });
});
