import { describe, expect, it } from "vitest";
import { buildRequests, mapBatchResponse, normaliseRange, percentChange } from "./map";

const row = (dimensions: string[], metrics: string[]) => ({
  dimensionValues: dimensions.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value })),
});

const response = {
  reports: [
    { rows: [row(["date_range_0"], ["1240", "1612", "0.584", "96.4"]), row(["date_range_1"], ["1000", "1400", "0.500", "80"])] },
    { rows: [row(["20260901"], ["40"]), row(["20260902"], ["55"])] },
    { rows: [row(["mobile"], ["980"]), row(["desktop"], ["240"]), row(["tablet"], ["0"])] },
    { rows: [row(["Ramanathapuram"], ["410"]), row(["(not set)"], ["30"])] },
    { rows: [row(["/fleet/swift-dzire?utm_source=google&utm_medium=cpc&utm_campaign=long"], ["220"])] },
  ],
};

describe("mapBatchResponse", () => {
  const data = mapBatchResponse(response);

  it("reads the current period totals and converts the engagement fraction to a percentage", () => {
    expect(data.totals).toEqual({ visitors: 1240, sessions: 1612, engagementRate: 58, avgEngagementSeconds: 96 });
  });

  it("compares against the previous date range", () => {
    expect(data.deltas).toEqual({ visitors: 24, sessions: 15, engagementRate: 16, avgEngagementSeconds: 20 });
  });

  it("formats GA compact dates as ISO days", () => {
    expect(data.trend).toEqual([{ label: "2026-09-01", value: 40 }, { label: "2026-09-02", value: 55 }]);
  });

  it("drops zero-value rows from rankings", () => {
    expect(data.devices).toEqual([{ label: "mobile", value: 980 }, { label: "desktop", value: 240 }]);
  });

  it("relabels (not set) dimensions", () => {
    expect(data.cities).toEqual([{ label: "Ramanathapuram", value: 410 }, { label: "Unknown", value: 30 }]);
  });

  it("truncates long landing page paths", () => {
    expect(data.landingPages[0].label).toHaveLength(34);
    expect(data.landingPages[0].label.endsWith("…")).toBe(true);
  });

  it("falls back to row order when GA omits the dateRange dimension", () => {
    const positional = { reports: [{ rows: [row([], ["10", "12", "0.4", "30"]), row([], ["5", "6", "0.2", "15"])] }] };
    expect(mapBatchResponse(positional).deltas.visitors).toBe(100);
  });

  it("returns empty structures for an empty response", () => {
    const empty = mapBatchResponse({});
    expect(empty.totals).toEqual({ visitors: 0, sessions: 0, engagementRate: 0, avgEngagementSeconds: 0 });
    expect(empty.trend).toEqual([]);
    expect(empty.deltas.visitors).toBe(0);
  });
});

describe("percentChange", () => {
  it("treats growth from zero as +100%", () => expect(percentChange(9, 0)).toBe(100));
  it("treats zero to zero as flat", () => expect(percentChange(0, 0)).toBe(0));
  it("reports decline as negative", () => expect(percentChange(50, 100)).toBe(-50));
});

describe("normaliseRange", () => {
  it("accepts the supported windows", () => expect(normaliseRange("7")).toBe(7));
  it("defaults anything else to 28 days", () => {
    expect(normaliseRange("365")).toBe(28);
    expect(normaliseRange(undefined)).toBe(28);
    expect(normaliseRange(["7", "90"])).toBe(28);
  });
});

describe("buildRequests", () => {
  const requests = buildRequests(7);

  it("asks for exactly five reports, the GA4 batch limit", () => expect(requests).toHaveLength(5));

  it("pairs the current window with the window immediately before it", () => {
    expect(requests[0].dateRanges).toEqual([
      { startDate: "7daysAgo", endDate: "today" },
      { startDate: "14daysAgo", endDate: "8daysAgo" },
    ]);
  });
});
