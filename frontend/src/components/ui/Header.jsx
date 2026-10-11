import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import ShinyText from "../../reactbits/ShinyText.jsx";
import DecryptedText from "../../reactbits/DecryptedText.jsx";

function formatUtc(date) {
  return date.toISOString().slice(11, 19);
}

export default function Header({ live, onRefresh, loading }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="pointer-events-none relative z-20 flex items-center justify-between border-b border-[var(--hud-line)] px-5 py-3 bg-[#05080a]/90 backdrop-blur-md">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[var(--hud-cyan)]">
          <DecryptedText text="Orbital object monitoring" animateOn="view" speed={40} className="text-[var(--hud-cyan)]" />
        </p>
        <h1 className="text-xl font-extrabold tracking-[0.18em] text-white">
          <DecryptedText text="DEBRISTRACKER" animateOn="view" speed={25} className="text-white" />
        </h1>
      </div>

      <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em]">
        <div className="flex items-center gap-2 text-[var(--hud-cyan)]">
          <span className="hud-scan h-1.5 w-1.5 rounded-full bg-[var(--hud-cyan)] shadow-[0_0_8px_#00f2ff]" />
          <ShinyText text="SYSTEM NOMINAL" color="#00f2ff" shineColor="#ffffff" speed={3} className="text-[11px]" />
        </div>
        <span className="text-slate-300">UTC {formatUtc(now)}</span>
      </div>

      <div className="pointer-events-auto flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.18em]">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[var(--hud-cyan)] shadow-[0_0_8px_#00f2ff]" : "bg-amber-500"}`}
          />
          <ShinyText
            text={live ? "CELESTRAK LIVE" : "CELESTRAK OFFLINE"}
            color={live ? "#00f2ff" : "#ffa500"}
            shineColor="#ffffff"
            speed={4}
            className="text-[11px]"
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 border border-[var(--hud-line)] px-3 py-1.5 text-slate-200 hover:border-[var(--hud-cyan)] hover:text-[var(--hud-cyan)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </header>
  );
}
