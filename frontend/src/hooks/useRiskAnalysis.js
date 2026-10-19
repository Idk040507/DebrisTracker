import { useCallback, useEffect, useState } from "react";
import { api } from "../utils/api.js";

export function useRiskAnalysis(selected) {
  const [briefing, setBriefing] = useState("");
  const [shap, setShap] = useState([]);
  const [score, setScore] = useState(null);
  const [predictionSource, setPredictionSource] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);

  const scoreObject = useCallback(async (object) => {
    if (!object) return;
    setLoading(true);
    setBriefing("");
    try {
      const { data } = await api.post("/api/conjunctions/score", { object });
      setShap(data.shap || []);
      setScore(data.prediction?.risk_score ?? null);
      setPredictionSource(data.prediction?.source ?? null);
      setFeatures(data.features || null);
    } catch (error) {
      setBriefing(error.message || "Scoring failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const analyze = useCallback(async (object) => {
    const target = object || selected;
    if (!target) return;
    setLoading(true);
    try {
      const { data } = await api.post("/api/explain/briefing", {
        object: target,
        context: {
          name: target.name,
          id: target.id,
          norad: target.NORAD_CAT_ID ?? target.id,
          orbitClass: target.orbitClass,
          inclination: target.inclination,
          periapsis: target.periapsis,
        },
      });
      setBriefing(data.briefing || "");
      setShap(data.shap || []);
      setScore(data.prediction?.risk_score ?? null);
      setPredictionSource(data.prediction?.source ?? null);
      setFeatures(data.features || null);
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || "Analysis failed";
      setBriefing(msg);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    setBriefing("");
    setShap([]);
    setScore(null);
    setPredictionSource(null);
    setFeatures(null);
    if (selected) {
      scoreObject(selected);
    }
  }, [selected?.id, scoreObject]);

  return { briefing, shap, score, predictionSource, features, analyze, loading };
}
