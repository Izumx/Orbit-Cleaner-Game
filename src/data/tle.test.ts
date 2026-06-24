import { describe, it, expect } from 'vitest';
import { parseTLE } from './tle';

const SAMPLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005
2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05
COSMOS 2251 DEB
1 34427U 93036SX  24001.50000000  .00000500  00000-0  20000-3 0  9991
2 34427  74.0000 100.0000 0010000  50.0000 310.0000 14.20000000    03`;

describe('parseTLE', () => {
  it('parses each 3-line block into an object', () => {
    const objs = parseTLE(SAMPLE);
    expect(objs).toHaveLength(2);
    expect(objs[0].name).toBe('ISS (ZARYA)');
    expect(objs[0].id).toBe('25544');
    expect(objs[0].category).toBe('satellite');
    expect(objs[1].category).toBe('debris');
    expect(objs[0].satrec).toBeTruthy();
  });
  it('skips malformed trailing lines', () => {
    const objs = parseTLE(SAMPLE + '\nINCOMPLETE NAME\n1 99999U');
    expect(objs).toHaveLength(2);
  });
});
