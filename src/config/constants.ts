export const EARTH_RADIUS_KM = 6371;
export const SCENE_EARTH_RADIUS = 2;
export const SCALE_KM_TO_SCENE = SCENE_EARTH_RADIUS / EARTH_RADIUS_KM;

export const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  satellite: [0.4, 0.8, 1.0], // cyan
  rocket: [1.0, 0.7, 0.2],    // orange
  debris: [1.0, 0.3, 0.3],    // red
};

// CelesTrak GP groups (CORS-enabled, TLE format). Combined > 10k objects.
export const CELESTRAK_GROUPS = [
  'active',
  'cosmos-2251-debris',
  'iridium-33-debris',
  'fengyun-1c-debris',
  'cosmos-1408-debris',
];

export const celestrakUrl = (group: string) =>
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;

export const TLE_CACHE_KEY = 'orbitclean.tle.v1';
export const TLE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
