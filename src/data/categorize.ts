import type { Category } from './types';

export function categorizeObject(name: string): Category {
  const n = name.toUpperCase();
  if (n.includes('DEB') || n.includes('DEBRIS')) return 'debris';
  if (n.includes('R/B') || n.includes('ROCKET')) return 'rocket';
  return 'satellite';
}
