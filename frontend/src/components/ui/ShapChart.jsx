function formatShap(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number !== 0 && Math.abs(number) < 0.001) return number.toExponential(2);
  return number.toFixed(3);
}

export default function ShapChart({ items = [] }) {
  if (!items.length) {
    return <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">SHAP drivers pending analysis.</p>;
  }

  const magnitudes = items.map((item) => {
    const value = Number(item.shap);
    return Number.isFinite(value) ? Math.abs(value) : 0;
  });
  const max = Math.max(...magnitudes);

  return (
    <div className="mt-4 space-y-2">
      {items.map((item, index) => {
        const value = Number(item.shap);
        const magnitude = magnitudes[index];
        const width = `${max > 0 ? (magnitude / max) * 100 : 0}%`;
        const positive = Number.isFinite(value) && value >= 0;
        return (
          <div key={item.feature}>
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <span>{item.feature}</span>
              <span>{formatShap(item.shap)}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-white/10">
              <div className={`h-full ${positive ? "bg-rose-400" : "bg-[var(--hud-cyan)]"}`} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
