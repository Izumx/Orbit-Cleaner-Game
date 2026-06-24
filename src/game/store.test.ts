import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, kesslerIndex } from './store';

describe('game store', () => {
  beforeEach(() => {
    useGame.setState({ score: 0, caught: new Set(), selectedIndex: null, totalObjects: 0 });
  });

  it('catching adds points and marks caught', () => {
    useGame.getState().setTotal(10);
    useGame.getState().catchObject('abc', 50);
    expect(useGame.getState().score).toBe(50);
    expect(useGame.getState().caught.has('abc')).toBe(true);
  });

  it('catching is idempotent per id', () => {
    useGame.getState().setTotal(10);
    useGame.getState().catchObject('abc', 50);
    useGame.getState().catchObject('abc', 50);
    expect(useGame.getState().score).toBe(50);
  });

  it('kesslerIndex drops as objects are cleaned', () => {
    useGame.getState().setTotal(4);
    expect(kesslerIndex(useGame.getState())).toBe(100);
    useGame.getState().catchObject('a', 10);
    expect(kesslerIndex(useGame.getState())).toBe(75);
  });
});
