import { describe, it, expect } from 'vitest';
import { categorizeObject } from './categorize';

describe('categorizeObject', () => {
  it('flags debris from DEB suffix', () => {
    expect(categorizeObject('COSMOS 2251 DEB')).toBe('debris');
    expect(categorizeObject('FENGYUN 1C DEB')).toBe('debris');
  });
  it('flags rocket bodies', () => {
    expect(categorizeObject('SL-16 R/B')).toBe('rocket');
    expect(categorizeObject('ATLAS 5 CENTAUR R/B')).toBe('rocket');
  });
  it('defaults to satellite', () => {
    expect(categorizeObject('ISS (ZARYA)')).toBe('satellite');
    expect(categorizeObject('STARLINK-1234')).toBe('satellite');
  });
});
