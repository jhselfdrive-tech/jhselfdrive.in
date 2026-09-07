export function AreaChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  if (!data.length) return <div className="admin-empty">No visitor data for this range yet.</div>;
  const width = 720; const top = 24; const bottom = 176; const left = 34; const right = width - 14;
  const max = Math.max(...data.map((item) => item.value), 1);
  const pointX = (index: number) => (data.length === 1 ? (left + right) / 2 : left + (index * (right - left)) / (data.length - 1));
  const pointY = (value: number) => bottom - (value / max) * (bottom - top);
  const line = data.map((item, index) => `${index ? "L" : "M"}${pointX(index).toFixed(1)} ${pointY(item.value).toFixed(1)}`).join(" ");
  const area = `${line} L${pointX(data.length - 1).toFixed(1)} ${bottom} L${pointX(0).toFixed(1)} ${bottom} Z`;
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const formatDay = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return <svg className="admin-chart" viewBox={`0 0 ${width} 210`} role="img" aria-label={label}><defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d665d" stopOpacity=".28" /><stop offset="1" stopColor="#0d665d" stopOpacity="0" /></linearGradient></defs>{[0, 1, 2, 3].map((row) => { const y = top + row * ((bottom - top) / 3); return <g key={row}><line className="admin-chart-grid" x1={left} x2={right} y1={y} y2={y} /><text className="admin-chart-label" x={left - 6} y={y + 3} textAnchor="end">{Math.round(max - (row * max) / 3)}</text></g>; })}<path d={area} fill="url(#areaGradient)" /><path className="admin-chart-line" d={line} />{data.length <= 31 ? data.map((item, index) => <circle className="admin-chart-dot" key={item.label} cx={pointX(index)} cy={pointY(item.value)} r="3" />) : null}{data.map((item, index) => (index % labelStep && index !== data.length - 1 ? null : <text className="admin-chart-label" key={item.label} x={pointX(index)} y="197" textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}>{formatDay(item.label)}</text>))}</svg>;
}
