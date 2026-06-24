import * as satellite from 'satellite.js';
import { EARTH_RADIUS_KM, SCALE_KM_TO_SCENE } from '../config/constants';

interface Eci { x: number; y: number; z: number }

export function eciToScene(eci: Eci): [number, number, number] {
  const z = -eci.y * SCALE_KM_TO_SCENE;
  return [
    eci.x * SCALE_KM_TO_SCENE,
    eci.z * SCALE_KM_TO_SCENE,
    Object.is(z, -0) ? 0 : z,
  ];
}

export function altitudeKm(eci: Eci): number {
  return Math.sqrt(eci.x * eci.x + eci.y * eci.y + eci.z * eci.z) - EARTH_RADIUS_KM;
}

export function computePositions(satrecs: unknown[], date: Date): Float32Array {
  const out = new Float32Array(satrecs.length * 3);
  for (let i = 0; i < satrecs.length; i++) {
    let pos: Eci | false = false;
    try {
      const pv = satellite.propagate(satrecs[i] as satellite.SatRec, date);
      pos = pv && pv.position ? (pv.position as Eci) : false;
    } catch {
      pos = false;
    }
    if (pos && Number.isFinite(pos.x)) {
      const [x, y, z] = eciToScene(pos);
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    } else {
      out[i * 3] = NaN; out[i * 3 + 1] = NaN; out[i * 3 + 2] = NaN;
    }
  }
  return out;
}
