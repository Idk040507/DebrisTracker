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
  const [cdmObjects, setCdmObjects] = useState([]);
  const [cdmError, setCdmError] = useState(false);
  const [cdmLoading, setCdmLoading] = useState(false);

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

  const fetchCdmObjects = useCallback(async () => {
    setCdmLoading(true);
    try {
      const response = await api.get("/api/conjunctions/cdms/objects");
      setCdmObjects(response.data.objects || []);
      setCdmError(["error", "not_configured"].includes(response.data.status?.request_status));
    } catch {
      setCdmObjects([]);
      setCdmError(true);
    } finally {
      setCdmLoading(false);
    }
  }, []);

  const refresh = useCallback(
    () => Promise.all([fetchCatalog(), fetchCdmObjects()]),
    [fetchCatalog, fetchCdmObjects],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => catalogStats(objects), [objects]);

  return {
    objects,
    cdmObjects,
    cdmError,
    cdmLoading,
    timeScale,
    setTimeScale,
    loading,
    lastSync,
    live,
    refresh,
    stats,
    feedSource,
  };
}
