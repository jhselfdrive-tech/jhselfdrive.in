export type GaRow = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
export type GaReport = { rows?: GaRow[]; rowCount?: number };
export type GaBatchResponse = { reports?: GaReport[] };

export type RankItem = { label: string; value: number };
export type TrafficTotals = { visitors: number; sessions: number; engagementRate: number; avgEngagementSeconds: number };
export type TrafficData = {
  totals: TrafficTotals;
  deltas: { visitors: number; sessions: number; engagementRate: number; avgEngagementSeconds: number };
  trend: { label: string; value: number }[];
  devices: RankItem[];
  cities: RankItem[];
  landingPages: RankItem[];
};

export const RANGE_OPTIONS = [7, 28, 90] as const;

export function normaliseRange(value: unknown) {
  const days = Number(value);
  return (RANGE_OPTIONS as readonly number[]).includes(days) ? days : 28;
}

export function percentChange(current: number, previous: number) {
  if (previous) return Math.round(((current - previous) / previous) * 100);
  return current ? 100 : 0;
}

function toNumber(value?: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export function buildRequests(days: number) {
  const currentRange = { startDate: `${days}daysAgo`, endDate: "today" };
  const rank = (dimension: string, metric: string, limit: number) => ({
    dateRanges: [currentRange], dimensions: [{ name: dimension }], metrics: [{ name: metric }],
    orderBys: [{ desc: true, metric: { metricName: metric } }], limit,
  });
  return [
    {
      dateRanges: [currentRange, { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "engagementRate" }, { name: "averageSessionDuration" }],
    },
    {
      dateRanges: [currentRange], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }], limit: 100,
    },
    rank("deviceCategory", "activeUsers", 5),
    rank("city", "activeUsers", 6),
    rank("landingPagePlusQueryString", "sessions", 6),
  ];
}

function readTotals(report: GaReport | undefined, index: number): TrafficTotals {
  const rows = report?.rows || [];
  const row = rows.find((item) => item.dimensionValues?.[0]?.value === `date_range_${index}`) || rows[index];
  const metric = (position: number) => toNumber(row?.metricValues?.[position]?.value);
  return { visitors: metric(0), sessions: metric(1), engagementRate: Math.round(metric(2) * 100), avgEngagementSeconds: Math.round(metric(3)) };
}

function readRank(report: GaReport | undefined, format?: (label: string) => string): RankItem[] {
  return (report?.rows || [])
    .map((row) => {
      const raw = row.dimensionValues?.[0]?.value || "";
      const label = raw && raw !== "(not set)" ? raw : "Unknown";
      return { label: format ? format(label) : label, value: toNumber(row.metricValues?.[0]?.value) };
    })
    .filter((item) => item.value > 0);
}

export function mapBatchResponse(response: GaBatchResponse): TrafficData {
  const reports = response.reports || [];
  const totals = readTotals(reports[0], 0);
  const previous = readTotals(reports[0], 1);
  return {
    totals,
    deltas: {
      visitors: percentChange(totals.visitors, previous.visitors),
      sessions: percentChange(totals.sessions, previous.sessions),
      engagementRate: percentChange(totals.engagementRate, previous.engagementRate),
      avgEngagementSeconds: percentChange(totals.avgEngagementSeconds, previous.avgEngagementSeconds),
    },
    trend: (reports[1]?.rows || []).map((row) => {
      const raw = row.dimensionValues?.[0]?.value || "";
      return { label: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, value: toNumber(row.metricValues?.[0]?.value) };
    }),
    devices: readRank(reports[2]),
    cities: readRank(reports[3]),
    landingPages: readRank(reports[4], (label) => (label.length > 34 ? `${label.slice(0, 33)}…` : label)),
  };
}
