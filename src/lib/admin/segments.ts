export type Segment = "loyal" | "repeat" | "customer" | "hot_lead" | "dormant" | "new";

export type SegmentStats = {
  completed_booking_count: number;
  booking_count: number;
  enquiry_count: number;
  last_seen_at: string;
};

export function deriveSegments(stats: SegmentStats, now = new Date()): Segment[] {
  const segments: Segment[] = [];
  if (stats.completed_booking_count >= 3) segments.push("loyal");
  else if (stats.completed_booking_count === 2) segments.push("repeat");
  else if (stats.completed_booking_count === 1) segments.push("customer");
  else if (stats.enquiry_count >= 2 && stats.booking_count === 0) segments.push("hot_lead");
  else segments.push("new");

  const dormantBoundary = new Date(now);
  dormantBoundary.setUTCDate(dormantBoundary.getUTCDate() - 90);
  if (stats.booking_count >= 1 && new Date(stats.last_seen_at) < dormantBoundary) segments.push("dormant");
  return segments;
}

export const segmentLabels: Record<Segment, string> = {
  loyal: "Loyal", repeat: "Repeat", customer: "Customer", hot_lead: "Hot lead", dormant: "Dormant", new: "New",
};
