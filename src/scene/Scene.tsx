import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Starfield } from './Starfield';
import { Earth } from './Earth';

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 2, 6], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={['#01020a']} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} />
      <Starfield />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
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
