import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const eventSchema = z.object({
  sessionId: z.string().min(8).max(100),
  name: z.enum(["page_view", "whatsapp_click", "call_click", "fleet_card_view", "booking_started", "booking_dates_selected", "booking_submitted"]),
  path: z.string().max(500).optional(), carSlug: z.string().max(100).optional(), referrer: z.string().max(1000).optional(),
  utmSource: z.string().max(200).optional(), utmMedium: z.string().max(200).optional(), utmCampaign: z.string().max(200).optional(),
});
const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(20) });

export async function POST(request: Request) {
  try {
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    // booking_submitted is written server-side by the booking action so the
    // client cannot inflate the conversion count.
    const rows = body.data.events.filter((event) => event.name !== "booking_submitted").map((event) => ({
      session_id: event.sessionId, name: event.name, path: event.path || null, car_slug: event.carSlug || null,
      referrer: event.referrer || null, utm_source: event.utmSource || null, utm_medium: event.utmMedium || null, utm_campaign: event.utmCampaign || null,
    }));
    if (!rows.length) return NextResponse.json({ ok: true });
    const { error } = await getSupabaseAdmin().from("events").insert(rows);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics write failed", error);
    return NextResponse.json({ error: "Unable to record event" }, { status: 500 });
  }
}
