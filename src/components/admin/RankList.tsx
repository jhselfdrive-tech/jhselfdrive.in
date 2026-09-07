export function RankList({ items, emptyText, accent, capitalize }: { items: { label: string; value: number }[]; emptyText: string; accent?: string; capitalize?: boolean }) {
  if (!items.length) return <div className="admin-empty">{emptyText}</div>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return <div className="admin-ranking">{items.map((item) => <div className="admin-rank-row" key={item.label}><span style={capitalize ? { textTransform: "capitalize" } : undefined} title={item.label}>{item.label}</span><div className="admin-rank-track"><div className="admin-rank-fill" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: accent }} /></div><strong>{item.value.toLocaleString("en-IN")}</strong></div>)}</div>;
}
