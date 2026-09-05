import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, detail, icon: Icon, color = "#dcebe7", ink = "#0d665d" }: { label: string; value: string; detail: React.ReactNode; icon: LucideIcon; color?: string; ink?: string }) {
  return <article className="admin-metric" style={{ "--metric-color": color, "--metric-ink": ink } as React.CSSProperties}><span className="admin-metric-icon"><Icon size={18} /></span><span className="admin-metric-label">{label}</span><strong className="admin-metric-value">{value}</strong><span className="admin-metric-detail">{detail}</span></article>;
}
