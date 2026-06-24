import * as satellite from 'satellite.js';
import type { DebrisObject } from './types';
import { categorizeObject } from './categorize';
import {
  CELESTRAK_GROUPS,
  celestrakUrl,
  TLE_CACHE_KEY,
  TLE_CACHE_TTL_MS,
} from '../config/constants';

export function parseTLE(raw: string): DebrisObject[] {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const out: DebrisObject[] = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 3) {
    const name = lines[i]?.trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1?.startsWith('1 ') || !l2?.startsWith('2 ')) continue;
    const id = l1.substring(2, 7).trim();
    let satrec: unknown;
    try {
      satrec = satellite.twoline2satrec(l1, l2);
    } catch {
      continue;
    }
    out.push({ id, name, line1: l1, line2: l2, category: categorizeObject(name), satrec });
  }
  return out;
}

function dedupe(objs: DebrisObject[]): DebrisObject[] {
  const seen = new Set<string>();
  return objs.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}

export async function fetchTLEs(): Promise<DebrisObject[]> {
  const cached = readCache();
  if (cached) return dedupe(parseTLE(cached));

  const texts = await Promise.all(
    CELESTRAK_GROUPS.map((g) =>
      fetch(celestrakUrl(g))
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => '')
    )
  );
  const raw = texts.join('\n');
  if (raw.trim()) writeCache(raw);
  return dedupe(parseTLE(raw));
}

function readCache(): string | null {
  try {
    const item = localStorage.getItem(TLE_CACHE_KEY);
    if (!item) return null;
    const { ts, raw } = JSON.parse(item);
    if (Date.now() - ts > TLE_CACHE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeCache(raw: string): void {
  try {
    localStorage.setItem(TLE_CACHE_KEY, JSON.stringify({ ts: Date.now(), raw }));
  } catch {
    /* quota — ignore */
  }
}
