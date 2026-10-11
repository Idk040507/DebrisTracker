import { Database, Eye, Globe2, Layers, Search, SlidersHorizontal } from "lucide-react";

const ITEMS = [
  { id: "all", icon: Search, label: "Catalog" },
  { id: "active", icon: Globe2, label: "Active" },
  { id: "stations", icon: Database, label: "Stations" },
  { id: "debris", icon: Layers, label: "Debris" },
];

export default function SideRail({ category, onChange, onToggleTelemetry, telemetryOpen }) {
  return (
    <aside className="relative z-20 flex w-16 flex-col items-center gap-3 border-r border-[var(--hud-line)] py-5 bg-[#05080a]/90 backdrop-blur-md">
      <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--hud-cyan)] font-bold">SYS</p>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = category === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onChange(item.id)}
            className={`relative grid h-10 w-10 place-items-center border rounded transition-all cursor-pointer ${
              active
                ? "border-[var(--hud-cyan)] text-[var(--hud-cyan)] bg-[var(--hud-cyan)]/10 shadow-[0_0_12px_rgba(0,242,255,0.35)]"
                : "border-white/10 text-slate-400 hover:border-[var(--hud-line)] hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {active && <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-[var(--hud-cyan)] rounded-r shadow-[0_0_8px_#00f2ff]" />}
          </button>
        );
      })}
      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          title="Propagation scale"
          className="grid h-10 w-10 place-items-center border border-white/10 text-slate-400 rounded hover:border-[var(--hud-line)] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Telemetry Drawer"
          onClick={onToggleTelemetry}
          className={`grid h-10 w-10 place-items-center border rounded transition-all cursor-pointer ${
            telemetryOpen
              ? "border-[var(--hud-cyan)] text-[var(--hud-cyan)] bg-[var(--hud-cyan)]/10 shadow-[0_0_10px_rgba(0,242,255,0.25)]"
              : "border-white/10 text-slate-400 hover:border-[var(--hud-line)] hover:text-white hover:bg-white/5"
          }`}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
