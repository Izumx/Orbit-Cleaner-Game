import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props { index: number | null; positionsRef: React.MutableRefObject<Float32Array | null>; }

export function SelectedMarker({ index, positionsRef }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = positionsRef.current;
    if (ref.current && index !== null && p && !Number.isNaN(p[index * 3])) {
      ref.current.visible = true;
      ref.current.position.set(p[index * 3], p[index * 3 + 1], p[index * 3 + 2]);
    } else if (ref.current) {
      ref.current.visible = false;
    }
  });
  return (
    <mesh ref={ref} visible={false}>
      <ringGeometry args={[0.06, 0.09, 32]} />
      <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
  );
}
