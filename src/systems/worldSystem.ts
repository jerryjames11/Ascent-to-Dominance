// World Layer — Sec 10. National power stats + AI-run nations. AI nations are drawn from the
// same SAMPLE_COUNTRIES pool the player could have played (Phase 1's representative set); the
// full 190-country pass (Sec 19) is explicitly deferred to a design/data pass, not Claude Code.
import type { CountrySchema } from "../types/country";
import type { AiNation, LeaderArchetype, NationalPowerStats } from "../types/world";
import type { Appointee } from "../types/cabinet";
import type { LiveGrid } from "./gridSystem";
import { Rng } from "./rng";
import { generateName } from "./nameGen";
import { SAMPLE_COUNTRIES } from "../data/sample-countries";

const COUNTRY_BASELINE_STATS: Record<string, NationalPowerStats> = {
  US: { economy: 85, military: 95, diplomacy: 70, stability: 80, innovation: 90 },
  UK: { economy: 75, military: 55, diplomacy: 80, stability: 82, innovation: 78 },
  FR: { economy: 72, military: 60, diplomacy: 75, stability: 75, innovation: 75 },
  DE: { economy: 88, military: 40, diplomacy: 72, stability: 85, innovation: 88 },
  JP: { economy: 80, military: 35, diplomacy: 65, stability: 83, innovation: 92 },
};

function baselineFor(countryId: string): NationalPowerStats {
  return COUNTRY_BASELINE_STATS[countryId] ?? { economy: 60, military: 50, diplomacy: 55, stability: 60, innovation: 55 };
}

const ARCHETYPES: LeaderArchetype[] = ["builder", "warhawk", "isolationist", "ideologue-exporter", "survivalist"];

function nationalIdeologyBaseline(countryId: string) {
  const baselines: Record<string, { economic: number; social: number; foreignPolicy: number }> = {
    US: { economic: 5, social: 0, foreignPolicy: 10 },
    UK: { economic: -5, social: -5, foreignPolicy: 0 },
    FR: { economic: -5, social: 0, foreignPolicy: -5 },
    DE: { economic: 0, social: -5, foreignPolicy: -15 },
    JP: { economic: 10, social: 15, foreignPolicy: -5 },
  };
  return baselines[countryId] ?? { economic: 0, social: 0, foreignPolicy: 0 };
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function generateAiNations(playerCountryId: string, seed: string): AiNation[] {
  const rng = new Rng(`${seed}-world-nations`);
  return SAMPLE_COUNTRIES.filter((c) => c.id !== playerCountryId).map((c) => {
    const baseline = baselineFor(c.id);
    const ideologyBase = nationalIdeologyBaseline(c.id);
    return {
      id: c.id,
      name: c.name,
      leaderName: generateName(c.id, rng),
      archetype: ARCHETYPES[rng.int(0, ARCHETYPES.length - 1)],
      ideology: {
        economic: clampSigned(ideologyBase.economic + rng.range(-15, 15)),
        social: clampSigned(ideologyBase.social + rng.range(-15, 15)),
        foreignPolicy: clampSigned(ideologyBase.foreignPolicy + rng.range(-15, 15)),
      },
      stats: {
        economy: clamp100(baseline.economy + rng.range(-8, 8)),
        military: clamp100(baseline.military + rng.range(-8, 8)),
        diplomacy: clamp100(baseline.diplomacy + rng.range(-8, 8)),
        stability: clamp100(baseline.stability + rng.range(-8, 8)),
        innovation: clamp100(baseline.innovation + rng.range(-8, 8)),
      },
      domesticApproval: rng.int(40, 70),
    };
  });
}

function clampSigned(v: number): number {
  return Math.max(-100, Math.min(100, v));
}

export function computePlayerNationalStats(country: CountrySchema, grid: LiveGrid, billsPassedByIssue: Record<string, number>, cabinet: Appointee[]): NationalPowerStats {
  const baseline = baselineFor(country.id);
  const nationalApproval = grid.aggregateApproval();
  const strengthFor = (portfolioId: string) => {
    const a = cabinet.find((x) => x.portfolioId === portfolioId);
    return a ? (a.competence / 100) * (a.loyalty / 100) : 0;
  };

  const economyBills = (billsPassedByIssue.economy ?? 0) + (billsPassedByIssue.taxes ?? 0);
  const educationBills = (billsPassedByIssue.education ?? 0) + (billsPassedByIssue.healthcare ?? 0);

  return {
    economy: clamp100(baseline.economy * 0.55 + nationalApproval * 0.25 + Math.min(15, economyBills * 2) + strengthFor("treasury") * 10),
    military: clamp100(baseline.military * 0.7 + strengthFor("defense-interior") * 25),
    diplomacy: clamp100(baseline.diplomacy * 0.6 + strengthFor("foreign-minister") * 25 + nationalApproval * 0.1),
    stability: clamp100(country.baselineInstitutionalStrength * 0.4 + nationalApproval * 0.5),
    innovation: clamp100(baseline.innovation * 0.6 + Math.min(20, educationBills * 2.5) + strengthFor("health-education") * 15),
  };
}

/** Sec 14 world-leader formula, coarse/periodic: leader archetype, relative power standing,
 *  domestic pressure, opportunity triggers. Evolves the nation's own stats/approval and returns
 *  a tension nudge (their own agency, independent of the player's diplomatic actions). */
export function tickAiNation(nation: AiNation, playerStats: NationalPowerStats, currentTension: number, rng: Rng): { tensionNudge: number } {
  const domesticPressure = 100 - nation.domesticApproval;
  const nationPower = nation.stats.economy + nation.stats.military + nation.stats.diplomacy;
  const playerPower = playerStats.economy + playerStats.military + playerStats.diplomacy;
  const relativeStrength = nationPower - playerPower; // positive = they're stronger

  let tensionNudge = 0;
  let economyDrift = rng.range(-1, 1.5);
  let militaryDrift = rng.range(-1, 1);
  let diplomacyDrift = rng.range(-1, 1);
  let stabilityDrift = rng.range(-1, 1);

  switch (nation.archetype) {
    case "builder":
      economyDrift += 0.8;
      stabilityDrift += 0.4;
      tensionNudge -= 0.3;
      break;
    case "warhawk":
      militaryDrift += 1;
      if (domesticPressure > 50 && rng.chance(0.3)) tensionNudge += 2.5; // foreign adventurism to rally support
      else if (relativeStrength > 40 && rng.chance(0.2)) tensionNudge += 1.5; // confidence from strength
      break;
    case "isolationist":
      stabilityDrift += 0.6;
      diplomacyDrift -= 0.3;
      tensionNudge -= 0.6; // de-escalates readily unless provoked
      break;
    case "ideologue-exporter":
      diplomacyDrift += 0.8;
      if (rng.chance(0.15)) tensionNudge += 1; // ideological friction
      break;
    case "survivalist":
      // corrupt/erratic: stats stagnate or decay, unpredictable tension swings
      economyDrift -= 0.5;
      if (domesticPressure > 60 && rng.chance(0.25)) tensionNudge += 2;
      break;
  }

  nation.stats.economy = clamp100(nation.stats.economy + economyDrift);
  nation.stats.military = clamp100(nation.stats.military + militaryDrift);
  nation.stats.diplomacy = clamp100(nation.stats.diplomacy + diplomacyDrift);
  nation.stats.stability = clamp100(nation.stats.stability + stabilityDrift);
  nation.domesticApproval = clamp100(nation.domesticApproval + (economyDrift + stabilityDrift) * 1.5 + rng.range(-2, 2));

  void currentTension;
  return { tensionNudge };
}
