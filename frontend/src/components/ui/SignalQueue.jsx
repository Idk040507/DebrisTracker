import { useState } from "react";
import { Zap } from "lucide-react";
import DecryptedText from "../../reactbits/DecryptedText.jsx";
import SpotlightCard from "../../reactbits/SpotlightCard.jsx";
import HudCorners from "./HudCorners.jsx";
import { signalBars } from "../../utils/catalog.js";

function formatPc(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Pc n/a";
  return `Pc ${number !== 0 && Math.abs(number) < 0.001 ? number.toExponential(2) : number.toFixed(3)}`;
}

export default function SignalQueue({ objects, cdmObjects = [], cdmError = false, cdmLoading = false, selected, onSelect }) {
  const [search, setSearch] = useState("");
  const hasCdms = cdmObjects.length > 0;
  const sourceRows = hasCdms ? cdmObjects : objects.slice(0, 8);
  const normalizedSearch = search.trim().toLowerCase();
  const rows = sourceRows.filter((item) =>
    `${item.id} ${item.name} ${item.conjunction_name || ""}`.toLowerCase().includes(normalizedSearch),
  );

  return (
    <SpotlightCard
      className="hud-panel hud-corners h-full min-h-[180px] p-4"
      spotlightColor="rgba(0, 242, 255, 0.12)"
    >
      <HudCorners />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--hud-cyan)]">
          <Zap className="h-3.5 w-3.5" />
          <DecryptedText text={hasCdms ? "CDM signal queue" : "Signal queue"} animateOn="view" speed={30} className="text-[var(--hud-cyan)]" />
          {hasCdms ? <span className="ml-auto font-mono text-[9px] tracking-normal text-slate-500">{cdmObjects.length} MATCHES</span> : null}
        </div>
        {hasCdms ? (
          <input
            aria-label="Search CDM objects by name or NORAD ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search CDM name or NORAD ID"
            className="mb-2 w-full border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-[var(--hud-cyan)]/60"
          />
        ) : null}
        <div className="scrollbar-hud min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          {rows.length === 0 ? (
            <p className="text-xs leading-5 text-slate-500">
              {hasCdms
                ? "No CDM objects match that search."
                : objects.length
                  ? "No catalog objects to show."
                  : cdmLoading
                    ? "Loading the rate-limited CDM feed…"
                  : cdmError
                    ? "Catalog is offline and the CDM feed could not be loaded. Check the backend and refresh."
                    : "No catalog objects loaded and no CDM matches are available. Refresh to retry the feeds."}
            </p>
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
                    <p className="truncate font-mono text-[10px] text-slate-500">
                      {hasCdms
                        ? `NORAD ${item.id} · ${formatPc(item.pc)}${item.tca ? ` · TCA ${String(item.tca).replace("T", " ").replace("Z", " UTC")}` : ""}`
                        : `NORAD ${item.id} — ${item.orbitClass}`}
                    </p>
                    {hasCdms && item.conjunction_name ? (
                      <p className="truncate font-mono text-[9px] text-slate-600">vs {item.conjunction_name}</p>
                    ) : null}
                  </div>
                  {hasCdms ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--hud-amber)]">CDM</span>
                  ) : item.elevated ? (
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
