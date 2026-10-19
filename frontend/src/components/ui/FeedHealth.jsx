import { Shield } from "lucide-react";
import SpotlightCard from "../../reactbits/SpotlightCard.jsx";
import DecryptedText from "../../reactbits/DecryptedText.jsx";
import HudCorners from "./HudCorners.jsx";

export default function FeedHealth({ live, lastSync, tracked, cdmTracked = 0, loading, source = "celestrak" }) {
  const status = loading ? "SYNCING" : live ? "CATALOG ONLINE" : cdmTracked > 0 ? "CDM ONLY" : "OFFLINE";
  const statusColor = live || cdmTracked > 0 ? "text-[var(--hud-cyan)]" : "text-amber-400";
  const progressWidth = loading ? "55%" : live || cdmTracked > 0 ? "100%" : "0%";
  const stamp = lastSync
    ? `${lastSync.toISOString().slice(11, 19)}${String(lastSync.getMilliseconds()).padStart(3, "0")}`
    : "--:--:---";

  return (
    <SpotlightCard
      className="hud-panel hud-corners h-full min-h-[180px] p-4"
      spotlightColor="rgba(0, 242, 255, 0.1)"
    >
      <HudCorners />
      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--hud-cyan)]">
          <Shield className="h-3.5 w-3.5" />
          <DecryptedText text="Feed status" animateOn="view" speed={30} className="text-[var(--hud-cyan)]" />
        </div>
        <p className={`font-mono text-3xl font-semibold tracking-tight ${statusColor}`}>
          {status}
        </p>
        <div className="mt-3 h-[3px] overflow-hidden bg-white/10">
          <div
            className={`h-full transition-[width] duration-500 ${live || cdmTracked > 0 ? "bg-[var(--hud-cyan)] shadow-[0_0_12px_#00f2ff]" : "bg-amber-500"}`}
            style={{ width: progressWidth }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
          <div>
            <p>Last fetch</p>
            <p className="mt-1 text-slate-200">{stamp}</p>
          </div>
          <div>
            <p>Catalog objects</p>
            <p className="mt-1 text-slate-200">{tracked || 0}</p>
          </div>
          <div>
            <p>CDM objects</p>
            <p className="mt-1 text-slate-200">{cdmTracked}</p>
          </div>
        </div>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Catalog source: {source === "spacetrack" ? "Space-Track GP" : source === "mixed" ? "CelesTrak + Space-Track" : source === "none" ? "Unavailable" : "CelesTrak"}
        </p>
      </div>
    </SpotlightCard>
  );
}
