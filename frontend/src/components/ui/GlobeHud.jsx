import ShinyText from "../../reactbits/ShinyText.jsx";
import DecryptedText from "../../reactbits/DecryptedText.jsx";

export default function GlobeHud({ camera, selected, timeScale }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--hud-cyan)]">
      {/* Top Left Title */}
      <div className="absolute left-4 top-3 flex items-center gap-2">
        <span className="h-2 w-0.5 bg-[var(--hud-cyan)]" />
        <DecryptedText
          text="Orbital field / globe"
          animateOn="view"
          speed={30}
          className="text-[var(--hud-cyan)]"
        />
      </div>

      {/* Top Center Target Acquisition Banner */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 flex items-center gap-2 border border-[var(--hud-line)] bg-[#05080a]/80 px-3 py-1.5 rounded backdrop-blur-md">
        <span
          className={`h-2 w-2 rounded-full ${
            selected
              ? "bg-[var(--hud-amber)] shadow-[0_0_10px_#ffa500] animate-pulse"
              : "bg-[var(--hud-cyan)] shadow-[0_0_8px_#00f2ff]"
          }`}
        />
        <span className={selected ? "text-[var(--hud-amber)] font-semibold" : "text-slate-300"}>
          {selected ? (
            <ShinyText text={`TARGET LOCKED: ${selected.name || `OBJECT ${selected.id || ''}`}`} color="#ffa500" shineColor="#ffffff" speed={3} />
          ) : (
            "CLICK ANY DEBRIS POINT TO LOCK TELEMETRY"
          )}
        </span>
      </div>

      {/* Right Altitude Scale */}
      <div className="absolute right-6 top-14 flex h-36 flex-col justify-between text-right text-[9px] text-slate-400">
        <span className="text-[var(--hud-cyan)] font-semibold">ALT / KM</span>
        <span>1200</span>
        <span>800</span>
        <span>400</span>
      </div>

      {/* Tactical Center Crosshair Reticles (Corner Ticks) */}
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 border border-cyan-500/10 pointer-events-none rounded-full">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-px bg-[var(--hud-cyan)]/50" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-px bg-[var(--hud-cyan)]/50" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-px bg-[var(--hud-cyan)]/50" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-px bg-[var(--hud-cyan)]/50" />
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-[9px] text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-[var(--hud-cyan)] shadow-[0_0_6px_#00f2ff]" /> Tracker object
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-[var(--hud-amber)] shadow-[0_0_6px_#ffa500]" /> Acquired target
        </span>
      </div>

      {/* Bottom Right Controls & Metrics */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 text-[9px] text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/5">
        {timeScale && <span className="text-[var(--hud-cyan)] font-semibold">TIME ×{timeScale}</span>}
        {timeScale && <span className="text-slate-600">|</span>}
        <span>TILT {camera.tilt}°</span>
        <span className="text-slate-600">|</span>
        <span>ZOOM {camera.zoom}X</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">DRAG TO ROTATE</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">SCROLL TO ZOOM</span>
      </div>
    </div>
  );
}
