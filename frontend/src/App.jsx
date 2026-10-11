import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useState } from "react";
import EarthGlobe from "./components/canvas/EarthGlobe.jsx";
import DebrisField from "./components/canvas/DebrisField.jsx";
import OrbitPath from "./components/canvas/OrbitPath.jsx";
import CameraHud from "./components/canvas/CameraHud.jsx";
import Header from "./components/ui/Header.jsx";
import SideRail from "./components/ui/SideRail.jsx";
import HeroStrip from "./components/ui/HeroStrip.jsx";
import GlobeHud from "./components/ui/GlobeHud.jsx";
import SignalQueue from "./components/ui/SignalQueue.jsx";
import FeedHealth from "./components/ui/FeedHealth.jsx";
import Telemetry from "./components/ui/Telemetry.jsx";
import ClickSpark from "./reactbits/ClickSpark.jsx";
import Noise from "./reactbits/Noise.jsx";
import { useOrbitalData } from "./hooks/useOrbitalData.js";
import { useRiskAnalysis } from "./hooks/useRiskAnalysis.js";

export default function App() {
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(null);
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [camera, setCamera] = useState({ zoom: "1.00", tilt: "23.4" });
  const { objects, timeScale, setTimeScale, loading, lastSync, live, refresh, stats, feedSource } = useOrbitalData(category);
  const { briefing, shap, score, features, analyze, loading: analyzing } = useRiskAnalysis(selected);

  return (
    <ClickSpark sparkColor="#00f2ff" sparkCount={10} sparkRadius={22} duration={450}>
      <div className="hud-grid relative flex h-full min-h-0 w-full flex-col overflow-hidden text-slate-100">
        <Noise patternAlpha={8} patternRefreshInterval={4} />
        <Header live={live} onRefresh={refresh} loading={loading} />

        <div className="relative flex min-h-0 flex-1">
          <SideRail
            category={category}
            onChange={setCategory}
            telemetryOpen={telemetryOpen}
            onToggleTelemetry={() => setTelemetryOpen((open) => !open)}
          />

          <main className="relative flex min-w-0 flex-1 flex-col px-5 py-4">
            <HeroStrip stats={stats} />

            <section className="hud-panel hud-corners relative min-h-[300px] flex-1 overflow-hidden">
              <span className="hud-corner-bl" />
              <span className="hud-corner-br" />
              <Canvas camera={{ position: [0, 0.9, 4.2], fov: 45 }}>
                <color attach="background" args={["#02060a"]} />
                <ambientLight intensity={0.22} />
                <directionalLight position={[5, 3, 5]} intensity={1.25} />
                <Stars radius={90} depth={50} count={5000} factor={3} fade />
                <EarthGlobe />
                <DebrisField objects={objects} selectedId={selected?.id} onSelect={setSelected} />
                {selected ? <OrbitPath object={selected} /> : null}
                <CameraHud onChange={setCamera} />
                <OrbitControls enablePan={false} minDistance={2.2} maxDistance={10} />
              </Canvas>
              <GlobeHud camera={camera} selected={selected} timeScale={timeScale} />
            </section>

            <div className="mt-3 grid h-[200px] min-h-[180px] grid-cols-2 gap-3">
              <SignalQueue objects={objects} selected={selected} onSelect={setSelected} />
              <FeedHealth live={live} lastSync={lastSync} tracked={stats.tracked} loading={loading} source={feedSource} />
            </div>
          </main>

          {telemetryOpen ? (
            <Telemetry
              selected={selected}
              tracked={stats.tracked}
              live={live}
              briefing={briefing}
              shap={shap}
              score={score}
              features={features}
              loading={analyzing}
              onAnalyze={() => analyze(selected)}
            />
          ) : null}
        </div>

        <footer className="relative z-20 flex items-center justify-between border-t border-[var(--hud-line)] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <span>DebrisTracker / Nomad debris event console</span>
          <span>Filter: fragments — LEO — public OP data</span>
          <label className="pointer-events-auto flex items-center gap-2 text-slate-400">
            Prop
            <input
              className="hud-range w-24"
              type="range"
              min="1"
              max="60"
              value={timeScale}
              onChange={(event) => setTimeScale(Number(event.target.value))}
            />
          </label>
          <span className="flex items-center gap-2 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Data link {live ? "stable" : "degraded"}
          </span>
        </footer>
      </div>
    </ClickSpark>
  );
}
