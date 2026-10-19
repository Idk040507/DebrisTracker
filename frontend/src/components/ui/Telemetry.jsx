import { Radar } from "lucide-react";
import SpotlightCard from "../../reactbits/SpotlightCard.jsx";
import ElectricBorder from "../../reactbits/ElectricBorder.jsx";
import ShinyText from "../../reactbits/ShinyText.jsx";
import DecryptedText from "../../reactbits/DecryptedText.jsx";
import ShapChart from "./ShapChart.jsx";

function formatProbability(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number !== 0 && Math.abs(number) < 0.001 ? number.toExponential(3) : number.toFixed(6);
}

export default function Telemetry({
  selected,
  tracked,
  live,
  briefing,
  shap,
  score,
  predictionSource,
  features,
  loading,
  onAnalyze,
}) {
  const hasCdmPc =
    features?.feature_source === "spacetrack-cdm" &&
    features.pc !== null &&
    features.pc !== undefined &&
    Number.isFinite(Number(features.pc));
  const estimateLabel =
    predictionSource === "xgboost"
      ? "XGBoost estimate"
      : predictionSource === "heuristic"
        ? "Heuristic estimate"
        : "Risk estimate";

  return (
    <aside className="relative z-20 flex w-[320px] flex-col border-l border-[var(--hud-line)]">
      <SpotlightCard className="flex h-full flex-col bg-[#05080a]/80 p-5" spotlightColor="rgba(0, 242, 255, 0.08)">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--hud-cyan)]">
          <DecryptedText text="Live telemetry" animateOn="view" speed={30} className="text-[var(--hud-cyan)]" />
          <span className="h-px flex-1 bg-[var(--hud-line)]" />
        </div>

        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-2 py-4">
            <h3 className="mb-6 font-mono text-sm font-semibold tracking-[0.2em] text-slate-200 uppercase">
              <DecryptedText text="Awaiting acquisition" animateOn="view" speed={40} />
            </h3>

            {/* Glowing Tactical Radar Scope Container */}
            <div className="relative flex items-center justify-center my-4">
              <ElectricBorder
                color="#00f2ff"
                speed={1}
                chaos={0.06}
                borderRadius={100}
                className="p-1"
              >
                <div className="relative grid h-32 w-32 place-items-center rounded-full bg-[#020d14] border border-[var(--hud-line)] shadow-[0_0_20px_rgba(0,242,255,0.15)] overflow-hidden">
                  {/* Concentric Radar Grid Rings */}
                  <div className="absolute inset-2 rounded-full border border-[var(--hud-cyan)]/20 pointer-events-none" />
                  <div className="absolute inset-6 rounded-full border border-[var(--hud-cyan)]/15 pointer-events-none" />
                  <div className="absolute inset-10 rounded-full border border-[var(--hud-cyan)]/10 pointer-events-none" />
                  {/* Crosshairs */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-full w-px bg-[var(--hud-cyan)]/20" />
                    <div className="w-full h-px bg-[var(--hud-cyan)]/20 absolute" />
                  </div>
                  {/* Animated Radar Sweep */}
                  <div className="radar-sweep absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(0,242,255,0.35)_360deg)] rounded-full pointer-events-none" />
                  <Radar className="h-8 w-8 text-[var(--hud-cyan)] relative z-10 animate-pulse" />
                </div>
              </ElectricBorder>
            </div>

            <p className="mt-6 max-w-[240px] font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-slate-400">
              Select a signal on the globe. Click any amber or cyan point to lock onto its current position, orbit
              class, and propagated telemetry.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex-1 overflow-auto pr-1">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--hud-cyan)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--hud-amber)] shadow-[0_0_8px_#ffa500] animate-ping" />
              Acquired lock
            </div>
            <h3 className="mt-1 text-lg font-bold text-white tracking-wide">
              <DecryptedText text={selected.name} animateOn="view" speed={25} />
            </h3>

            <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
              <div className="bg-white/5 p-2 rounded border border-white/5">
                Norad ID
                <p className="mt-1 text-slate-100 font-semibold">{selected.id}</p>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                Orbit Class
                <p className={`mt-1 font-semibold ${selected.elevated ? "text-[var(--hud-amber)]" : "text-[var(--hud-cyan)]"}`}>
                  {selected.orbitClass}
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                Inclination
                <p className="mt-1 text-slate-100 font-semibold">
                  {Number.isFinite(Number(selected.inclination)) ? `${Number(selected.inclination).toFixed(2)}°` : "—"}
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                Periapsis
                <p className="mt-1 text-slate-100 font-semibold">{selected.periapsis ? `${Math.round(selected.periapsis)} km` : "—"}</p>
              </div>
            </dl>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 font-mono text-xs text-slate-300 bg-black/40 p-2.5 rounded border border-[var(--hud-line)]">
                <span>{estimateLabel}</span>
                <span className="font-bold text-[var(--hud-amber)]">{formatProbability(score)}</span>
              </div>
              {hasCdmPc ? (
                <div className="bg-[var(--hud-cyan)]/5 p-2.5 rounded border border-[var(--hud-cyan)]/30">
                  <div className="flex items-center justify-between gap-2 font-mono text-xs text-slate-200">
                    <span>CDM-reported Pc</span>
                    <span className="font-bold text-[var(--hud-cyan)]">{formatProbability(features.pc)}</span>
                  </div>
                  <p className="mt-1 font-mono text-[9px] leading-4 text-slate-500">
                    Reported by Space-Track; separate from the model estimate.
                  </p>
                </div>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {features?.feature_source === "spacetrack-cdm"
                ? `Space-Track CDM${features?.cdm_id ? ` · ${features.cdm_id}` : ""}${features?.conjunction_name ? ` vs ${features.conjunction_name}` : ""}`
                : features?.feature_source
                  ? "Modeled close approach · no actual CDM"
                  : "Awaiting score"}
            </p>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="mt-3 w-full border border-[var(--hud-cyan)] bg-[var(--hud-cyan)]/15 hover:bg-[var(--hud-cyan)]/25 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--hud-cyan)] transition-all disabled:opacity-60 rounded cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[var(--hud-cyan)] animate-ping" />
                  Generating AI Briefing…
                </>
              ) : (
                "Run ML + Gemini Briefing"
              )}
            </button>

            <ShapChart items={shap} />

            {briefing ? (
              <div className="mt-3 max-h-48 overflow-auto text-xs leading-5 text-slate-200 bg-black/60 p-3 rounded border border-[var(--hud-cyan)]/30 font-mono shadow-[0_0_12px_rgba(0,242,255,0.08)]">
                <div className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-[var(--hud-cyan)] font-semibold border-b border-white/10 pb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--hud-cyan)] shadow-[0_0_6px_#00f2ff]" />
                  Gemini Operator Briefing
                </div>
                <div className="whitespace-pre-wrap">{briefing}</div>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-[var(--hud-line)] pt-4 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="text-slate-300 font-semibold">{tracked} tracked</span>
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-500"}`} />
            <ShinyText text="LIVE FEED" color="#34d399" shineColor="#ffffff" speed={3} className="text-[10px]" />
          </span>
        </div>
      </SpotlightCard>
    </aside>
  );
}
