export type EventName = "page_view" | "whatsapp_click" | "call_click" | "fleet_card_view" | "enquiry_started" | "enquiry_submitted";
type EventProps = { carSlug?: string; path?: string };

function sessionId() {
  const key = "jh_session_id";
  let value = window.sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    window.sessionStorage.setItem(key, value);
  }
  return value;
}

export function getSessionId() {
  return typeof window === "undefined" ? "server" : sessionId();
}

export function track(name: EventName, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const payload = {
    sessionId: sessionId(), name, path: props.path || window.location.pathname, carSlug: props.carSlug,
    referrer: document.referrer || undefined, utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined, utmCampaign: params.get("utm_campaign") || undefined,
  };
  window.gtag?.("event", name, { car_slug: props.carSlug, event_source: "website" });
  const analyticsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!analyticsUrl || analyticsUrl.includes("your-project")) return;
  fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: [payload] }), keepalive: true }).catch(() => undefined);
}

export function trackOnce(name: EventName, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  const key = `jh_once_${name}`;
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  track(name, props);
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
