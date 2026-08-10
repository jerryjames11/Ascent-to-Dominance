// War / Conflict Resolution — Sec 11. No tactical combat: a comparative strength formula
// resolves each war-turn, shifting a front/control track until a resolution threshold or
// domestic pressure forces a negotiated peace.
import type { NationalPowerStats, WarState, WarGoalScope, WarLegacyTag } from "../types/world";
import type { LiveGrid } from "./gridSystem";
import { Rng } from "./rng";

/** outcome_pressure = f(relative military strength, economic capacity, terrain/logistics,
 *  alliance support, war-goal scope, morale/domestic stability, random variance) — Sec 11. */
export function resolveWarTurn(playerStats: NationalPowerStats, nationStats: NationalPowerStats, war: WarState, playerApproval: number, rng: Rng): number {
  const militaryRatio = (playerStats.military + 1) / (nationStats.military + 1);
  const militaryPressure = (militaryRatio - 1) * 8;
  const economicCapacity = war.fundingActive ? (playerStats.economy - nationStats.economy) * 0.05 : -3.5;
  const terrainLogistics = rng.range(-2, 2);
  const allianceSupport = 0; // no standing-alliance-in-war depth yet
  const scopeMultiplier = war.goalScope === "total" ? 1.3 : 0.8;
  const moraleFactor = (playerApproval - 50) * 0.08;
  const variance = rng.range(-4, 4);
  return (militaryPressure + economicCapacity + terrainLogistics + allianceSupport + moraleFactor + variance) * scopeMultiplier;
}

/** Casualties and duration erode approval, weighted per-demographic — dove-leaning cells are
 *  more war-skeptical, hawkish cells reward a winning front. */
export function applyWarDomesticImpact(grid: LiveGrid, frontDelta: number, scope: WarGoalScope): void {
  const scopeMult = scope === "total" ? 1.5 : 1;
  for (const cell of grid.grid.cells) {
    const hawkish = cell.ideology.foreignPolicy; // -100 dove .. 100 hawk
    const warWeariness = -0.35 * scopeMult - (Math.max(0, -hawkish) / 100) * 0.6 * scopeMult;
    const winBonus = frontDelta > 0 ? (Math.max(0, hawkish) / 100) * 0.5 : 0;
    grid.adjustPersuasion(cell.regionId, cell.segmentId, warWeariness + winBonus);
  }
}

export function checkWarResolution(war: WarState): "ongoing" | "decisive-win" | "decisive-loss" {
  if (war.front >= 85) return "decisive-win";
  if (war.front <= 15) return "decisive-loss";
  return "ongoing";
}

export function negotiateSettlement(war: WarState, nationId: string): { tag: WarLegacyTag; economyDelta: number } {
  const durationWeeks = war.turns;
  if (war.front >= 60) {
    return {
      tag: { nationId, label: "Won the War", description: `A favorable settlement after ${durationWeeks} weeks — reparations and terms lean your way.` },
      economyDelta: 8,
    };
  }
  if (war.front <= 40) {
    return {
      tag: { nationId, label: "Lost the War", description: `An unfavorable settlement after ${durationWeeks} weeks.` },
      economyDelta: -10,
    };
  }
  if (durationWeeks > 40) {
    return {
      tag: { nationId, label: "Quagmire", description: `A grinding ${durationWeeks}-week stalemate, settled close to where it started.` },
      economyDelta: -4,
    };
  }
  return {
    tag: { nationId, label: "Peacemaker", description: `Negotiated to a close before it dragged on — no clear winner, but no quagmire either.` },
    economyDelta: 1,
  };
}

export function initWar(nationId: string, startedWeek: number, goalScope: WarGoalScope): WarState {
  return { nationId, startedWeek, goalScope, front: 50, casualties: 0, fundingActive: false, turns: 0 };
}
