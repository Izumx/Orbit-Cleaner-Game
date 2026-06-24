import { create } from 'zustand';

interface GameState {
  score: number;
  caught: Set<string>;
  selectedIndex: number | null;
  totalObjects: number;
  setTotal: (n: number) => void;
  select: (index: number | null) => void;
  catchObject: (id: string, points: number) => void;
}

const PERSIST_KEY = 'orbitclean.progress.v1';

function loadScore(): number {
  try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}').score ?? 0; }
  catch { return 0; }
}

export const useGame = create<GameState>((set, get) => ({
  score: loadScore(),
  caught: new Set<string>(),
  selectedIndex: null,
  totalObjects: 0,
  setTotal: (n) => set({ totalObjects: n }),
  select: (index) => set({ selectedIndex: index }),
  catchObject: (id, points) => {
    if (get().caught.has(id)) return;
    const caught = new Set(get().caught);
    caught.add(id);
    const score = get().score + points;
    set({ caught, score });
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify({ score })); } catch { /* ignore */ }
  },
}));

export function kesslerIndex(s: { caught: Set<string>; totalObjects: number }): number {
  if (s.totalObjects === 0) return 100;
  return Math.round((100 * (s.totalObjects - s.caught.size)) / s.totalObjects);
}
