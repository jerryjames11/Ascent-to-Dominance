// Poll layer — Sec 8: player only ever observes the grid through noisy, lagged, tier-biased polls.
import type { PollResult } from "../types/grid";
import type { LiveGrid } from "./gridSystem";
import { Rng } from "./rng";

export type PollsterTier = "low" | "mid" | "high";

const TIER_CONFIG: Record<PollsterTier, { noiseStdev: number; confidenceBand: number; lagWeeks: number; cost: number }> = {
  low: { noiseStdev: 8, confidenceBand: 10, lagWeeks: 2, cost: 0 },
  mid: { noiseStdev: 4, confidenceBand: 6, lagWeeks: 1, cost: 4000 },
  high: { noiseStdev: 2, confidenceBand: 3, lagWeeks: 0, cost: 12000 },
};

export function pollCost(tier: PollsterTier): number {
  return TIER_CONFIG[tier].cost;
}

function gaussian(rng: Rng, stdev: number): number {
  const u1 = Math.max(rng.float(), 1e-9);
  const u2 = rng.float();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stdev;
}

/** Commission a poll across the given regions. Returns one PollResult per region, plus a scope-wide
 *  aggregate under regionId "__scope__" when more than one region is in play. */
export function commissionPoll(
  grid: LiveGrid,
  regionIds: string[],
  currentWeek: number,
  tier: PollsterTier,
  seed: string
): PollResult[] {
  const rng = new Rng(`${seed}-poll-${currentWeek}-${tier}`);
  const cfg = TIER_CONFIG[tier];
  const results: PollResult[] = regionIds.map((regionId) => {
    const trueApproval = grid.aggregateApproval(regionId);
    const noisy = trueApproval + gaussian(rng, cfg.noiseStdev);
    return {
      regionId,
      reportedApproval: Math.max(0, Math.min(100, Math.round(noisy * 10) / 10)),
      confidenceBand: cfg.confidenceBand,
      pollsterTier: tier,
      sampledAtWeek: Math.max(0, currentWeek - cfg.lagWeeks),
    };
  });

  if (regionIds.length > 1) {
    const cells = grid.getCellsInScope(regionIds);
    let total = 0;
    let weight = 0;
    for (const c of cells) {
      total += c.persuasion * c.populationWeight;
      weight += c.populationWeight;
    }
    const trueApproval = weight === 0 ? 0 : total / weight;
    const noisy = trueApproval + gaussian(rng, cfg.noiseStdev * 0.7); // aggregate polls are a bit more stable
    results.push({
      regionId: "__scope__",
      reportedApproval: Math.max(0, Math.min(100, Math.round(noisy * 10) / 10)),
      confidenceBand: cfg.confidenceBand * 0.8,
      pollsterTier: tier,
      sampledAtWeek: Math.max(0, currentWeek - cfg.lagWeeks),
    });
  }

  return results;
}
