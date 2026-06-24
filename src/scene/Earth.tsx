import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_EARTH_RADIUS } from '../config/constants';

export function Earth() {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [day, night, clouds, bump] = useLoader(THREE.TextureLoader, [
    '/textures/earth-day.jpg',
    '/textures/earth-night.png',
    '/textures/earth-clouds.png',
    '/textures/earth-bump.jpg',
  ]);

  // Day/night blend driven by the directional light direction.
  const surfaceMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: day,
      bumpMap: bump,
      bumpScale: 0.03,
      emissiveMap: night,
      emissive: new THREE.Color(0xffffaa),
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.9,
    });
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float dayAmount = clamp(dot(normalize(vNormal), normalize(directionalLights[0].direction)), 0.0, 1.0);
         totalEmissiveRadiance *= (1.0 - smoothstep(0.0, 0.25, dayAmount));`
      );
    };
    return mat;
  }, [day, night, bump]);

  useFrame((_, dt) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.008;
  });

  return (
    <group>
      <mesh material={surfaceMat}>
        <sphereGeometry args={[SCENE_EARTH_RADIUS, 64, 64]} />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[SCENE_EARTH_RADIUS * 1.01, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <Atmosphere />
    </group>
  );
}

function Atmosphere() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(0x3a86ff) } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 uColor;
          void main() {
            float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
            gl_FragColor = vec4(uColor, 1.0) * intensity;
          }`,
      }),
    []
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[SCENE_EARTH_RADIUS * 1.15, 64, 64]} />
    </mesh>
  );
}
