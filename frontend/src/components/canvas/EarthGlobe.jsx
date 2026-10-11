import { useTexture } from "@react-three/drei";

export default function EarthGlobe() {
  const [dayMap, bumpMap] = useTexture([
    "/textures/earth_daymap.jpg",
    "/textures/earth_bumpmap.jpg",
  ]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={dayMap} bumpMap={bumpMap} bumpScale={0.05} roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh scale={1.03}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}
