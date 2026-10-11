import { Zap } from "lucide-react";
import DecryptedText from "../../reactbits/DecryptedText.jsx";
import SpotlightCard from "../../reactbits/SpotlightCard.jsx";
import HudCorners from "./HudCorners.jsx";
import { signalBars } from "../../utils/catalog.js";

export default function SignalQueue({ objects, selected, onSelect }) {
  const rows = objects.slice(0, 8);

  return (
    <SpotlightCard
      className="hud-panel hud-corners h-full min-h-[180px] p-4"
      spotlightColor="rgba(0, 242, 255, 0.12)"
    >
      <HudCorners />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--hud-cyan)]">
          <Zap className="h-3.5 w-3.5" />
          <DecryptedText text="Signal queue" animateOn="view" speed={30} className="text-[var(--hud-cyan)]" />
        </div>
        <div className="scrollbar-hud flex-1 space-y-2 overflow-auto pr-1">
          {rows.length === 0 ? (
            <p className="text-xs text-slate-500">Awaiting catalog downlink.</p>
          ) : (
            rows.map((item, index) => {
              const active = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`flex w-full items-center gap-3 border px-2 py-2 text-left ${
                    active
                      ? "border-[var(--hud-amber)]/70 bg-[var(--hud-amber)]/5"
                      : "border-white/5 hover:border-[var(--hud-line)]"
                  }`}
                >
                  <span className="font-mono text-[10px] text-slate-500">{String(index + 1).padStart(2, "0")}</span>
                  <div className="flex h-4 items-end gap-px">
                    {signalBars(item.id).map((on, bar) => (
                      <span
                        key={bar}
                        className={`w-[3px] ${on ? "bg-[var(--hud-cyan)]" : "bg-white/15"}`}
                        style={{ height: `${40 + bar * 12}%` }}
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{item.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      NORAD {item.id} — {item.orbitClass}
                    </p>
                  </div>
                  {item.elevated ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--hud-amber)]">
                      Elevated <Zap className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Nominal</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
