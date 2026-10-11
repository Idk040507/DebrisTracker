/**
 * Computes 3D position and orbit path coordinates directly from OMM JSON key-value properties.
 * Replaces line 1 and line 2 TLE string character offset parsing.
 */

export function ommToPosition(omm, scale = 1 / 6371) {
  if (!omm) return [0, 0, 0];

  const inc = (Number(omm.INCLINATION || 0) * Math.PI) / 180;
  const raan = (Number(omm.RA_OF_ASC_NODE || 0) * Math.PI) / 180;
  const argP = (Number(omm.ARG_OF_PERICENTER || 0) * Math.PI) / 180;
  const meanAnomaly = (Number(omm.MEAN_ANOMALY || 0) * Math.PI) / 180;
  
  let ecc = Number(omm.ECCENTRICITY ?? 0.001);
  if (!Number.isFinite(ecc) || ecc < 0 || ecc >= 0.95) {
    ecc = 0.001;
  }

  // Semi-major axis (a) in km computed from Mean Motion (revolutions/day) if not present
  let meanMotion = Number(omm.MEAN_MOTION ?? 15.0);
  if (!Number.isFinite(meanMotion) || meanMotion <= 0) {
    meanMotion = 15.0;
  }
  const periodSec = (24 * 3600) / meanMotion;
  const mu = 398600.4418; // Earth Gravitational Parameter (km^3 / s^2)
  let a = omm.SEMIMAJOR_AXIS ? Number(omm.SEMIMAJOR_AXIS) : Math.cbrt(mu * Math.pow(periodSec / (2 * Math.PI), 2));
  if (!Number.isFinite(a) || a < 6400 || a > 50000) {
    a = 6800;
  }

  // Radius in orbital plane
  const denom = 1 + ecc * Math.cos(meanAnomaly);
  const r = denom > 0.01 ? (a * (1 - ecc * ecc)) / denom : a;
  const xOrb = r * Math.cos(meanAnomaly + argP);
  const yOrb = r * Math.sin(meanAnomaly + argP);

  // Transform 3D coordinates using RAAN and Inclination
  const x = (Math.cos(raan) * xOrb - Math.sin(raan) * Math.cos(inc) * yOrb) * scale;
  const y = (Math.sin(raan) * xOrb + Math.cos(raan) * Math.cos(inc) * yOrb) * scale;
  const z = Math.sin(inc) * yOrb * scale;

  return [
    Number.isFinite(x) ? x : 1.2,
    Number.isFinite(z) ? z : 0.2,
    Number.isFinite(-y) ? -y : -1.2,
  ];
}

export function ommToOrbitPoints(omm, numPoints = 96, scale = 1 / 6371) {
  if (!omm) return [];
  const points = [];
  for (let i = 0; i < numPoints; i += 1) {
    const angle = (i / numPoints) * 360;
    const pointOmm = { ...omm, MEAN_ANOMALY: angle };
    points.push(ommToPosition(pointOmm, scale));
  }
  return points;
}

export function kmToScene(position, scale = 1 / 6371) {
  if (!position) return [0, 0, 0];
  return [position.x * scale, position.z * scale, -position.y * scale];
}
