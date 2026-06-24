import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Starfield } from './Starfield';
import { Earth } from './Earth';
import { DebrisField } from './DebrisField';
import type { DebrisObject } from '../data/types';

interface Props {
  objects: DebrisObject[];
  onSelect: (index: number) => void;
}

export function Scene({ objects, onSelect }: Props) {
  const caught = useMemo(() => new Set<string>(), []);
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 50 }}
      dpr={[1, 2]}
      raycaster={{ params: { Points: { threshold: 0.06 } } as unknown as THREE.RaycasterParameters }}
    >
      <color attach="background" args={['#01020a']} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} />
      <Starfield />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      <DebrisField objects={objects} caught={caught} onSelect={onSelect} />
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={3}
        maxDistance={20}
      />
    </Canvas>
  );
}
