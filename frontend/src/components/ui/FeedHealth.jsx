import { Shield } from "lucide-react";
import SpotlightCard from "../../reactbits/SpotlightCard.jsx";
import CountUp from "../../reactbits/CountUp.jsx";
import DecryptedText from "../../reactbits/DecryptedText.jsx";
import HudCorners from "./HudCorners.jsx";

export default function FeedHealth({ live, lastSync, tracked, loading, source = "celestrak" }) {
  const health = live ? 98.7 : loading ? 41.2 : 12.4;
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
          <DecryptedText text="Feed health" animateOn="view" speed={30} className="text-[var(--hud-cyan)]" />
        </div>
        <p className="font-mono text-5xl font-semibold tracking-tight text-[var(--hud-cyan)] drop-shadow-[0_0_18px_rgba(0,242,255,0.45)]">
          <CountUp to={health} duration={1.6} />%
        </p>
        <div className="mt-3 h-[3px] overflow-hidden bg-white/10">
          <div className="h-full bg-[var(--hud-cyan)] shadow-[0_0_12px_#00f2ff]" style={{ width: `${health}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
          <div>
            <p>Last sync</p>
            <p className="mt-1 text-slate-200">{stamp}</p>
          </div>
          <div>
            <p>Propagator</p>
            <p className="mt-1 text-slate-200">
              {tracked || 0} / 35
            </p>
          </div>
          <div>
            <p>Element source</p>
            <p className="mt-1 text-slate-200">{source === "spacetrack" ? "Space-Track GP" : source === "mixed" ? "CelesTrak + Space-Track" : source === "none" ? "No downlink" : "CelesTrak"}</p>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
