import DecryptedText from "../../reactbits/DecryptedText.jsx";
import CountUp from "../../reactbits/CountUp.jsx";
import SpotlightCard from "../../reactbits/SpotlightCard.jsx";

export default function HeroStrip({ stats }) {
  return (
    <div className="flex items-start justify-between gap-6 px-1 pb-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-slate-400">
          <span className="mr-2 inline-block w-8 border-t border-[var(--hud-cyan)] align-middle" />
          Orbital situational awareness / 01
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          <DecryptedText
            text="Acquire the next object."
            animateOn="view"
            sequential
            speed={28}
            className="text-white"
            encryptedClassName="text-[var(--hud-cyan)]"
          />
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Track low-Earth debris with propagated position vectors from the latest public NORAD element sets.
        </p>
      </div>
      <div className="flex gap-4 font-mono">
        {[
          { label: "Tracked", value: stats.tracked, accent: false },
          { label: "Polar paths", value: stats.polar, accent: false },
          { label: "Elevated", value: stats.elevated, accent: true },
        ].map((item) => (
          <SpotlightCard
            key={item.label}
            className="border border-[var(--hud-line)]/50 bg-[#050a0e]/60 px-4 py-2 rounded text-right min-w-[100px]"
            spotlightColor={item.accent ? "rgba(255, 165, 0, 0.15)" : "rgba(0, 242, 255, 0.15)"}
          >
            <p
              className={`text-[10px] uppercase tracking-[0.28em] ${item.accent ? "text-[var(--hud-amber)]" : "text-[var(--hud-cyan)]"}`}
            >
              {item.label}
            </p>
            <p className={`text-2xl font-bold ${item.accent ? "text-[var(--hud-amber)] drop-shadow-[0_0_10px_rgba(255,165,0,0.3)]" : "text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.3)]"}`}>
              <CountUp key={item.value} to={item.value} duration={1.2} />
            </p>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
