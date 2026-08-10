// Coup Mechanics / Overthrow Failure State — Sec 13.
import type { CoupChoice, CoupOutcome } from "../types/authoritarian";
import type { CountrySchema } from "../types/country";
import { Rng } from "./rng";

const COUP_CEILING_BASELINE_LOYALTY: Record<CountrySchema["baselineCoupRiskCeiling"], number> = {
  "near-zero": 90,
  low: 80,
  moderate: 65,
  high: 50,
  structural: 35,
};

const COUP_CEILING_WEEKLY_CHANCE_MULT: Record<CountrySchema["baselineCoupRiskCeiling"], number> = {
  "near-zero": 0.15,
  low: 0.5,
  moderate: 1,
  high: 1.6,
  structural: 2.2,
};

export function militaryLoyaltyBaseline(country: CountrySchema, militaryLoyaltySeed = 0): number {
  return Math.max(0, Math.min(100, COUP_CEILING_BASELINE_LOYALTY[country.baselineCoupRiskCeiling] + militaryLoyaltySeed));
}

export interface CoupInputs {
  militaryLoyalty: number; // 0-100, primary driver (inverse)
  institutionalStrength: number; // 0-100, remaining
  eliteApproval: number; // 0-100, distinct from mass approval
  economicCrisisSeverity: number; // 0-100, higher = worse
  recentAuthoritarianSpike: number; // 0-100, decays over time
  externalEncouragement: number; // 0-100, hostile foreign nudge
}

/** Multi-factor, visible Coup Probability gauge — Sec 13. */
export function computeCoupProbability(inputs: CoupInputs): number {
  const loyaltyFactor = (100 - inputs.militaryLoyalty) * 0.45;
  const institutionalFactor = (100 - inputs.institutionalStrength) * 0.2;
  const eliteFactor = (100 - inputs.eliteApproval) * 0.15;
  const economicFactor = inputs.economicCrisisSeverity * 0.1;
  const spikeFactor = inputs.recentAuthoritarianSpike * 0.15;
  const externalFactor = inputs.externalEncouragement * 0.08;
  return Math.max(0, Math.min(100, loyaltyFactor + institutionalFactor + eliteFactor + economicFactor + spikeFactor + externalFactor));
}

export function weeklyCoupChance(coupProbability: number, country: CountrySchema): number {
  return (coupProbability / 100) * 0.04 * COUP_CEILING_WEEKLY_CHANCE_MULT[country.baselineCoupRiskCeiling];
}

export function resolveCoupAttempt(loyalFraction: number, popularApproval: number, choice: CoupChoice, rng: Rng): CoupOutcome {
  let successChance = (1 - loyalFraction) * 0.7 + (1 - popularApproval / 100) * 0.2;
  if (choice === "rally-loyal-forces") successChance -= 0.15;
  if (choice === "negotiate") successChance -= 0.05;
  if (choice === "flee") successChance += 0.1;
  successChance = Math.max(0.05, Math.min(0.95, successChance));

  if (!rng.chance(successChance)) return "fails";
  // Coup succeeds — severity depends on how it happened.
  if (choice === "flee") return "exile";
  const worseChance = loyalFraction < 0.15 ? 0.5 : 0.25;
  return rng.chance(worseChance) ? "worse" : "exile";
}
