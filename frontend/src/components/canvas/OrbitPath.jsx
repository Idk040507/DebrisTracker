import { useMemo } from "react";
import * as THREE from "three";
import { ommToOrbitPoints } from "../../utils/orbitMath.js";

export default function OrbitPath({ object }) {
  const lineGeometry = useMemo(() => {
    let rawPoints = object?.path;
    if (!rawPoints?.length && object?.INCLINATION !== undefined) {
      rawPoints = ommToOrbitPoints(object);
    }

    const validVectors = [];
    if (Array.isArray(rawPoints)) {
      for (const pt of rawPoints) {
        if (
          Array.isArray(pt) &&
          pt.length === 3 &&
          Number.isFinite(pt[0]) &&
          Number.isFinite(pt[1]) &&
          Number.isFinite(pt[2])
        ) {
          validVectors.push(new THREE.Vector3(pt[0], pt[1], pt[2]));
        }
      }
    }

    if (validVectors.length < 3) {
      const radius = 1.35;
      for (let i = 0; i < 96; i += 1) {
        const t = (i / 96) * Math.PI * 2;
        validVectors.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t * 0.15) * 0.2, Math.sin(t) * radius));
      }
    }

    return new THREE.BufferGeometry().setFromPoints(validVectors);
  }, [object]);

  return (
    <lineLoop geometry={lineGeometry}>
      <lineBasicMaterial color="#00f2ff" transparent opacity={0.8} />
    </lineLoop>
  );
}
