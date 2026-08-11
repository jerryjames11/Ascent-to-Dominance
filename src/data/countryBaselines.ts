// Shared per-country ideology baseline — was duplicated across gridSystem.ts, legislatorGen.ts,
// and worldSystem.ts; consolidated here so adding a country only requires one edit.
import type { IdeologyPosition } from "../types/grid";

export const NATIONAL_IDEOLOGY_BASELINE: Record<string, IdeologyPosition> = {
  US: { economic: 5, social: 0, foreignPolicy: 10 },
  UK: { economic: -5, social: -5, foreignPolicy: 0 },
  FR: { economic: -5, social: 0, foreignPolicy: -5 },
  DE: { economic: 0, social: -5, foreignPolicy: -15 },
  JP: { economic: 10, social: 15, foreignPolicy: -5 },
  SA: { economic: 20, social: 55, foreignPolicy: 20 },
  CN: { economic: -10, social: 35, foreignPolicy: 15 },
  BR: { economic: 5, social: 10, foreignPolicy: 0 },
  IN: { economic: 10, social: 20, foreignPolicy: 5 },
  NG: { economic: 5, social: 30, foreignPolicy: 5 },
  MX: { economic: -5, social: 5, foreignPolicy: -5 },
  KR: { economic: 5, social: 5, foreignPolicy: 15 },
  ID: { economic: 0, social: 25, foreignPolicy: 0 },
  CA: { economic: -5, social: -10, foreignPolicy: -5 },
  ES: { economic: -10, social: -5, foreignPolicy: -10 },
  SE: { economic: -15, social: -15, foreignPolicy: -15 },
  PL: { economic: 0, social: 20, foreignPolicy: 5 },
  VN: { economic: -15, social: 20, foreignPolicy: -5 },
};

export function nationalIdeologyBaseline(countryId: string): IdeologyPosition {
  return NATIONAL_IDEOLOGY_BASELINE[countryId] ?? { economic: 0, social: 0, foreignPolicy: 0 };
}
