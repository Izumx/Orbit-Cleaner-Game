import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DebrisObject } from '../data/types';
import { CATEGORY_COLORS } from '../config/constants';
import { useOrbits } from '../orbits/useOrbits';

function makeSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Props {
  objects: DebrisObject[];
  caught: Set<string>;
  onSelect: (index: number) => void;
}

export function DebrisField({ objects, caught, onSelect }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions } = useOrbits(objects, 60);
  const sprite = useMemo(makeSprite, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(objects.length * 3);
    objects.forEach((o, i) => {
      const [r, g, b] = CATEGORY_COLORS[o.category];
      arr[i * 3] = r; arr[i * 3 + 1] = g; arr[i * 3 + 2] = b;
    });
    return arr;
  }, [objects]);

  // Static geometry buffers; positions filled per-frame from worker output.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(objects.length * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [objects.length, colors]);

  useEffect(() => () => geom.dispose(), [geom]);
  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame(() => {
    if (!positions || !pointsRef.current) return;
    const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const dst = attr.array as Float32Array;
    for (let i = 0; i < objects.length; i++) {
      const hidden = caught.has(objects[i].id) || Number.isNaN(positions[i * 3]);
      if (hidden) {
        dst[i * 3] = dst[i * 3 + 1] = dst[i * 3 + 2] = 1e6; // park far away
      } else {
        dst[i * 3] = positions[i * 3];
        dst[i * 3 + 1] = positions[i * 3 + 1];
        dst[i * 3 + 2] = positions[i * 3 + 2];
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geom}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.index !== undefined) onSelect(e.index);
      }}
    >
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        map={sprite}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
