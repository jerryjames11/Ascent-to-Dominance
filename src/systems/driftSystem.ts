// Ideology Drift Tracker — Sec 5. Positions taken and bills sponsored pull current ideology
// toward whatever audience/bill you just backed; the gap from startingIdeology is the drift.
import type { IdeologyPosition } from "../types/grid";

export function nudgeIdeology(current: IdeologyPosition, target: IdeologyPosition, pct: number): IdeologyPosition {
  return {
    economic: current.economic + (target.economic - current.economic) * pct,
    social: current.social + (target.social - current.social) * pct,
    foreignPolicy: current.foreignPolicy + (target.foreignPolicy - current.foreignPolicy) * pct,
  };
}

export function ideologyDistance(a: IdeologyPosition, b: IdeologyPosition): number {
  return Math.sqrt((a.economic - b.economic) ** 2 + (a.social - b.social) ** 2 + (a.foreignPolicy - b.foreignPolicy) ** 2);
}
