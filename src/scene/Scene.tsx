import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Starfield } from './Starfield';
import { Earth } from './Earth';
import { DebrisField } from './DebrisField';
import { SelectedMarker } from './SelectedMarker';
import { useGame } from '../game/store';
import type { DebrisObject } from '../data/types';

interface Props {
  objects: DebrisObject[];
}

export function Scene({ objects }: Props) {
  const positionsRef = useRef<Float32Array | null>(null);
  const caught = useGame((s) => s.caught);
  const selectedIndex = useGame((s) => s.selectedIndex);
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
      <DebrisField
        objects={objects}
        caught={caught}
        onSelect={(index) => useGame.getState().select(index)}
        onPositions={(p) => { positionsRef.current = p; }}
      />
      <SelectedMarker index={selectedIndex} positionsRef={positionsRef} />
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
