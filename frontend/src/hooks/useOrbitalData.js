import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../utils/api.js";
import { catalogStats, normalizeObject } from "../utils/catalog.js";

export function useOrbitalData(category = "all") {
  const [objects, setObjects] = useState([]);
  const [timeScale, setTimeScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [live, setLive] = useState(false);
  const [feedSource, setFeedSource] = useState("celestrak");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    const groups = category === "all" ? "active,stations,debris" : category;
    try {
      const response = await api.get("/api/conjunctions/catalog", { params: { groups } });
      const raw = response.data.objects || [];
      setObjects(raw.map(normalizeObject));
      setFeedSource(response.data.source || "celestrak");
      setLastSync(new Date());
      setLive(raw.length > 0);
    } catch {
      setObjects([]);
      setLive(false);
      setFeedSource("none");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const stats = useMemo(() => catalogStats(objects), [objects]);

  return { objects, timeScale, setTimeScale, loading, lastSync, live, refresh: fetchCatalog, stats, feedSource };
}
