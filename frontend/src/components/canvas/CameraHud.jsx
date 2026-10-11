import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function CameraHud({ onChange }) {
  const last = useRef("");

  useFrame(({ camera }) => {
    const distance = camera.position.length();
    const zoom = (4.2 / distance).toFixed(2);
    const tilt = ((Math.asin(camera.position.y / distance) * 180) / Math.PI).toFixed(1);
    const payload = `${zoom}|${tilt}`;
    if (payload !== last.current) {
      last.current = payload;
      onChange?.({ zoom, tilt });
    }
  });

  return null;
}
