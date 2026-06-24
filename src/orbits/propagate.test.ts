import { describe, it, expect } from 'vitest';
import * as satellite from 'satellite.js';
import { computePositions, eciToScene, altitudeKm } from './propagate';
import { SCALE_KM_TO_SCENE } from '../config/constants';

const ISS_L1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005';
const ISS_L2 = '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05';

describe('propagate', () => {
  it('maps ECI km to scaled Y-up scene coords', () => {
    expect(eciToScene({ x: 6371, y: 0, z: 0 })).toEqual([
      6371 * SCALE_KM_TO_SCENE, 0, 0,
    ]);
    // ECI z (north) becomes scene y
    expect(eciToScene({ x: 0, y: 0, z: 6371 })[1]).toBeCloseTo(2, 5);
  });

  it('places ISS at low-earth-orbit altitude', () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const pv = satellite.propagate(satrec, new Date(Date.UTC(2024, 0, 1, 12)));
    const alt = altitudeKm(pv.position as any);
    expect(alt).toBeGreaterThan(300);
    expect(alt).toBeLessThan(500);
  });

  it('computePositions returns 3 floats per object', () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const buf = computePositions([satrec, satrec], new Date(Date.UTC(2024, 0, 1, 12)));
    expect(buf.length).toBe(6);
    expect(Number.isNaN(buf[0])).toBe(false);
  });
});
