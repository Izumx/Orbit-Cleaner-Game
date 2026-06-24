import { describe, it, expect } from 'vitest';
import * as satellite from 'satellite.js';
import { generateQuestion } from './questions';
import type { DebrisObject } from '../data/types';

function makeObj(l1: string, l2: string, name: string): DebrisObject {
  return { id: '1', name, line1: l1, line2: l2, category: 'debris', satrec: satellite.twoline2satrec(l1, l2) };
}
const ISS = makeObj(
  '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
  '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05',
  'ISS (ZARYA)'
);

describe('generateQuestion', () => {
  it('returns a well-formed question', () => {
    const q = generateQuestion(ISS, new Date(Date.UTC(2024, 0, 1, 12)));
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThan(q.options.length);
    expect(q.explanation.length).toBeGreaterThan(0);
  });
  it('is deterministic for the same object and time', () => {
    const t = new Date(Date.UTC(2024, 0, 1, 12));
    expect(generateQuestion(ISS, t)).toEqual(generateQuestion(ISS, t));
  });
});
