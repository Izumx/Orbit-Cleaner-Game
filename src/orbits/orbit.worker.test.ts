import { describe, it, expect } from 'vitest';
import * as satellite from 'satellite.js';
import { computePositions } from './propagate';

// The worker rebuilds satrecs from TLE lines, then calls computePositions.
// This test locks the contract the worker relies on.
describe('worker compute contract', () => {
  it('rebuilds satrecs from lines and produces positions', () => {
    const l1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005';
    const l2 = '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05';
    const satrecs = [satellite.twoline2satrec(l1, l2)];
    const buf = computePositions(satrecs, new Date(1704110400000));
    expect(buf.length).toBe(3);
    expect(Number.isFinite(buf[0])).toBe(true);
  });
});
