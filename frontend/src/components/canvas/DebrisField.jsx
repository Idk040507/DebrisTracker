import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYAN = new THREE.Color("#00f2ff");
const AMBER = new THREE.Color("#ffa500");
const WHITE = new THREE.Color("#e2e8f0");

export default function DebrisField({ objects = [], selectedId, onSelect }) {
  const mesh = useRef();
  const count = Math.min(objects.length || 400, 800);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { positions, colors } = useMemo(() => {
    const nextPositions = [];
    const nextColors = [];
    for (let i = 0; i < count; i += 1) {
      const obj = objects[i];
      if (obj?.position) {
        nextPositions.push(obj.position);
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.18 + Math.random() * 0.55;
        nextPositions.push([
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        ]);
      }
      const color = obj?.elevated ? AMBER : CYAN;
      nextColors.push(color.r, color.g, color.b);
    }
    return { positions: nextPositions, colors: new Float32Array(nextColors) };
  }, [objects, count]);

  useFrame(() => {
    if (!mesh.current) return;
    positions.forEach((pos, i) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(objects[i]?.id === selectedId ? 0.016 : 0.007);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      const color = objects[i]?.id === selectedId ? WHITE : objects[i]?.elevated ? AMBER : CYAN;
      mesh.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[null, null, count]}
      onClick={(event) => {
        event.stopPropagation();
        const index = event.instanceId;
        onSelect?.(objects[index] || { id: index, name: `Object ${index}` });
      }}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  );
}
