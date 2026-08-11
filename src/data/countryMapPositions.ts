// Approximate map positions for the country picker — equirectangular (lon/lat), not precise
// borders. Used to place a marker per playable country on a stylized world map.
export interface CountryMapPosition {
  id: string;
  lon: number;
  lat: number;
  continent: "north-america" | "south-america" | "europe" | "africa" | "asia" | "middle-east";
}

export const COUNTRY_MAP_POSITIONS: CountryMapPosition[] = [
  { id: "US", lon: -97, lat: 39, continent: "north-america" },
  { id: "CA", lon: -96, lat: 56, continent: "north-america" },
  { id: "MX", lon: -102, lat: 23, continent: "north-america" },
  { id: "BR", lon: -51, lat: -12, continent: "south-america" },
  { id: "UK", lon: -2, lat: 54, continent: "europe" },
  { id: "FR", lon: 2, lat: 46.5, continent: "europe" },
  { id: "DE", lon: 10.5, lat: 51, continent: "europe" },
  { id: "ES", lon: -3.7, lat: 40, continent: "europe" },
  { id: "SE", lon: 16, lat: 62, continent: "europe" },
  { id: "PL", lon: 19.5, lat: 52, continent: "europe" },
  { id: "NG", lon: 8, lat: 9.5, continent: "africa" },
  { id: "SA", lon: 45, lat: 24, continent: "middle-east" },
  { id: "IN", lon: 79, lat: 21, continent: "asia" },
  { id: "CN", lon: 104, lat: 35, continent: "asia" },
  { id: "VN", lon: 106, lat: 16, continent: "asia" },
  { id: "ID", lon: 118, lat: -2, continent: "asia" },
  { id: "KR", lon: 127.8, lat: 36.5, continent: "asia" },
  { id: "JP", lon: 138, lat: 36.5, continent: "asia" },
];

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;

export function projectToMap(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

export const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
