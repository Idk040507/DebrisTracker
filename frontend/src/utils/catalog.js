import { ommToPosition, ommToOrbitPoints } from "./orbitMath.js";

export function normalizeObject(record, index = 0) {
  const id = String(record.NORAD_CAT_ID ?? record.id ?? record.OBJECT_ID ?? index);
  const name = record.OBJECT_NAME ?? record.name ?? `OBJECT ${id}`;
  const inclination = Number(record.INCLINATION ?? 0);
  const eccentricity = Number(record.ECCENTRICITY ?? 0);
  const periapsis = Number(record.PERIAPSIS ?? record.PERIGEE ?? 0);
  const apoapsis = Number(record.APOAPSIS ?? 0);
  const meanMotion = Number(record.MEAN_MOTION ?? 0);

  const polar = inclination >= 75;
  const elevated = periapsis > 0 ? periapsis < 450 : meanMotion > 14.5;
  const orbitClass = polar ? "POLAR" : inclination < 15 ? "EQUATORIAL" : "INCLINED";

  const computedPos = ommToPosition(record);
  const computedPath = ommToOrbitPoints(record);

  return {
    ...record,
    id,
    name,
    inclination,
    eccentricity,
    periapsis,
    apoapsis,
    meanMotion,
    polar,
    elevated,
    orbitClass,
    position: computedPos,
    path: computedPath,
    group: record.CELESTRAK_GROUP ?? record.group ?? "catalog",
    dataSource: record.DATA_SOURCE ?? record.dataSource ?? "celestrak",
  };
}

export function catalogStats(objects = []) {
  return {
    tracked: objects.length,
    polar: objects.filter((item) => item.polar).length,
    elevated: objects.filter((item) => item.elevated).length,
  };
}

export function signalBars(seed) {
  const n = 3 + (Number(seed) % 5);
  return Array.from({ length: 5 }, (_, i) => i < n);
}
