// Legacy / Endgame Scoring — Sec 15. Multi-dimensional axes (never a single number), a headline
// archetype computed from axis positions, and a templated historian-style narrative built purely
// from data the game already tracked — no new systems, just summarization (per spec).
import type { CountrySchema } from "../types/country";
import type { PlayerCharacter, ProfileState } from "../types/player";
import type { NationalPowerStats, WarLegacyTag, AiNation } from "../types/world";
import type { CareerEndingReason } from "../types/authoritarian";
import type { OfficeHeld } from "../state/gameStore";
import { SAMPLE_COUNTRIES } from "../data/sample-countries";
import { neutralInheritedStats } from "./worldSystem";
import { getTrait } from "../data/traits";

export interface LegacyAxes {
  domestic: number; // country stats left behind vs inherited baseline
  globalStanding: number; // final World rankings position
  democraticIntegrity: number; // Statesman <-> Strongman <-> Overthrown spectrum
  promiseIntegrity: number; // Promise Ledger fulfillment
  politicalSkill: number; // elections/bills won vs lost
  personalReputation: number; // traits, scandals, relationship health
}

export type HeadlineArchetype =
  | "Statesman"
  | "Reformer"
  | "Strongman"
  | "Kingmaker"
  | "Warlord"
  | "Technocrat"
  | "Populist"
  | "Fallen";

const ARCHETYPE_TRAIT_ID: Record<HeadlineArchetype, string> = {
  Statesman: "legacy-statesman",
  Reformer: "legacy-reformer",
  Strongman: "legacy-strongman",
  Kingmaker: "legacy-kingmaker",
  Warlord: "legacy-warlord",
  Technocrat: "legacy-technocrat",
  Populist: "legacy-populist",
  Fallen: "legacy-fallen",
};

export interface LegacyInput {
  player: PlayerCharacter;
  country: CountrySchema;
  profile: ProfileState;
  officeHistory: OfficeHeld[];
  endingReason: CareerEndingReason;
  finalStats: NationalPowerStats;
  aiNations: AiNation[];
  institutionalStrength: number;
  authoritarianActionsTaken: number;
  warLegacyTags: WarLegacyTag[];
  finalWeek: number;
}

export interface LegacyReport {
  axes: LegacyAxes;
  archetype: HeadlineArchetype;
  archetypeTraitId: string;
  narrative: string[]; // historian-style paragraphs, sober register (Sec 20)
  dominancePathsLed: string[];
  untriedCountries: string[]; // replayability hook (Sec 15)
  electionsWon: number;
  electionsLost: number;
  billsPassed: number;
  billsFailed: number;
  highestTier: number;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function countTimeline(profile: ProfileState, type: string): number {
  return profile.careerTimeline.filter((e) => e.type === type).length;
}

export function computeLegacy(input: LegacyInput): LegacyReport {
  const { player, country, profile, officeHistory, endingReason, finalStats, aiNations, institutionalStrength, authoritarianActionsTaken, warLegacyTags, finalWeek } = input;

  const electionsWon = countTimeline(profile, "election-won");
  const electionsLost = countTimeline(profile, "election-lost");
  const billsPassed = countTimeline(profile, "bill-passed");
  const billsFailed = countTimeline(profile, "bill-failed");
  const highestTier = officeHistory.reduce((m, o) => Math.max(m, o.tier), 0);
  const warsWon = warLegacyTags.filter((t) => t.label === "Won the War").length;
  const warsFought = warLegacyTags.length;

  // --- Axes ---
  const inherited = neutralInheritedStats(country);
  const statKeys: (keyof NationalPowerStats)[] = ["economy", "military", "diplomacy", "stability", "innovation"];
  const avgDelta = statKeys.reduce((s, k) => s + (finalStats[k] - inherited[k]), 0) / statKeys.length;
  const domestic = clamp(50 + avgDelta * 2);

  const dominanceKeys: (keyof NationalPowerStats)[] = ["economy", "military", "diplomacy", "innovation"];
  const dominanceLabels: Record<string, string> = {
    economy: "Economic Hegemon",
    military: "Military Superpower",
    diplomacy: "Diplomatic Leader",
    innovation: "Ideological Exporter",
  };
  const dominancePathsLed =
    aiNations.length > 0
      ? dominanceKeys.filter((k) => aiNations.every((n) => finalStats[k] >= n.stats[k])).map((k) => dominanceLabels[k])
      : [];
  const globalStanding = aiNations.length > 0 ? clamp(30 + dominancePathsLed.length * 17.5 + (highestTier >= 4 ? 10 : 0)) : clamp(highestTier * 8);

  let democraticIntegrity = clamp((institutionalStrength / Math.max(1, country.baselineInstitutionalStrength)) * 70 - authoritarianActionsTaken * 5);
  if (profile.earnedTraitIds.includes("peaceful-transition")) democraticIntegrity = clamp(democraticIntegrity + 15);
  if (profile.earnedTraitIds.includes("restored-the-republic")) democraticIntegrity = clamp(democraticIntegrity + 10);
  if (endingReason === "exiled") democraticIntegrity = Math.min(democraticIntegrity, 15);
  if (endingReason === "imprisoned") democraticIntegrity = Math.min(democraticIntegrity, 8);

  const resolvedPromises = profile.promiseLedger.filter((p) => p.status !== "pending");
  const promiseScore = resolvedPromises.reduce((s, p) => s + (p.status === "fulfilled" ? 1 : p.status === "compromised" ? 0.6 : 0), 0);
  const promiseIntegrity = resolvedPromises.length > 0 ? clamp((promiseScore / resolvedPromises.length) * 100) : 50;

  const totalElections = electionsWon + electionsLost;
  const totalBills = billsPassed + billsFailed;
  const politicalSkill = clamp(
    (totalElections > 0 ? (electionsWon / totalElections) * 45 : 15) + (totalBills > 0 ? (billsPassed / totalBills) * 30 : 10) + highestTier * 6
  );

  const positiveTraits = profile.earnedTraitIds.filter((id) => getTrait(id) && !getTrait(id)!.negative).length;
  const negativeTraits = profile.earnedTraitIds.filter((id) => getTrait(id)?.negative).length;
  const personalReputation = clamp(profile.authenticity * 0.45 + (100 - profile.corruptionScore) * 0.3 + positiveTraits * 4 - negativeTraits * 5);

  const axes: LegacyAxes = { domestic, globalStanding, democraticIntegrity, promiseIntegrity, politicalSkill, personalReputation };

  // --- Headline archetype (priority cascade over the axes, Sec 15) ---
  let archetype: HeadlineArchetype;
  if (endingReason === "exiled" || endingReason === "imprisoned") archetype = "Fallen";
  else if (democraticIntegrity < 35 && warsWon >= 1) archetype = "Warlord";
  else if (democraticIntegrity < 35) archetype = "Strongman";
  else if (highestTier >= 4 && democraticIntegrity >= 65 && promiseIntegrity >= 55) archetype = "Statesman";
  else if (player.backstoryId === "academic" && billsPassed >= 3) archetype = "Technocrat";
  else if (billsPassed >= 5 && democraticIntegrity >= 50) archetype = "Reformer";
  else if (highestTier < 4 && electionsWon >= 3) archetype = "Kingmaker";
  else if (profile.authenticity >= 65) archetype = "Populist";
  else if (billsPassed >= 1) archetype = "Reformer";
  else archetype = "Populist";

  // --- Narrative (templated, restrained register per Sec 20) ---
  const years = Math.max(1, Math.round(finalWeek / 52));
  const yearsPhrase = years === 1 ? "a year" : `${years} years`;
  const offices = [...new Set(officeHistory.map((o) => o.title))];
  const lastOffice = offices[offices.length - 1];
  const isElectoral = country.progressionMode === "electoral-persuasion";

  const narrative: string[] = [];

  const endingLine: Record<CareerEndingReason, string> = {
    retired: `${player.name} left public life in ${country.name} after ${yearsPhrase}, on their own terms.`,
    "term-limit-out": `${player.name}'s career in ${country.name} ended where the constitution said it would, ${yearsPhrase} after it began.`,
    exiled: `${player.name}'s career in ${country.name} ended abroad, in exile, after the military moved against the government.`,
    imprisoned: `${player.name}'s career in ${country.name} ended in a courtroom run by the new regime.`,
  };
  narrative.push(endingLine[endingReason]);

  if (offices.length > 0) {
    const contests = isElectoral
      ? `${electionsWon} election${electionsWon === 1 ? "" : "s"} won${electionsLost > 0 ? `, ${electionsLost} lost` : ""}`
      : `${electionsWon} internal contest${electionsWon === 1 ? "" : "s"} won${electionsLost > 0 ? `, ${electionsLost} lost` : ""}`;
    const arc = offices.length > 1 ? `The climb ran from ${offices[0]} to ${lastOffice}` : `The career began and ended as ${lastOffice}`;
    narrative.push(`${arc}: ${contests}, ${billsPassed} measure${billsPassed === 1 ? "" : "s"} carried${billsFailed > 0 ? ` and ${billsFailed} defeated` : ""}.`);
  } else {
    narrative.push(`The career ended before any office was won — a candidacy, not an administration.`);
  }

  if (authoritarianActionsTaken === 0) {
    narrative.push(`The institutions were left as they were found. No emergency powers, no postponed votes, no packed courts.`);
  } else if (democraticIntegrity >= 50) {
    narrative.push(
      `There were moments of drift — ${authoritarianActionsTaken} of them, by the record — but the institutions held, and some of the damage was walked back.`
    );
  } else {
    narrative.push(
      `The record shows ${authoritarianActionsTaken} authoritarian actions and an Institutional Strength of ${Math.round(institutionalStrength)} at the end. Historians will not need to argue about what kind of government this was.`
    );
  }

  if (warsFought > 0) {
    const tagSummary = warLegacyTags.map((t) => t.label).join(", ");
    narrative.push(`Abroad: ${warsFought} war${warsFought === 1 ? "" : "s"} (${tagSummary}).`);
  } else if (dominancePathsLed.length > 0) {
    narrative.push(`Abroad, ${country.name} ended the era leading the world as ${dominancePathsLed.join(" and ")} — without a shot fired.`);
  }

  const closingLine: Record<HeadlineArchetype, string> = {
    Statesman: `The obituaries will use the word statesman, and for once it will be accurate.`,
    Reformer: `What survives is the legislation. That was the point.`,
    Strongman: `Power was held. What it cost is the epitaph.`,
    Kingmaker: `Never the crown — always the hand that placed it.`,
    Warlord: `The maps changed. So did the graveyards.`,
    Technocrat: `Competence, applied consistently, turned out to be a governing philosophy.`,
    Populist: `The crowd came first, last, and always.`,
    Fallen: `The fall will be studied longer than the rise.`,
  };
  narrative.push(closingLine[archetype]);

  const untriedCountries = SAMPLE_COUNTRIES.filter((c) => c.id !== country.id).map((c) => c.name);

  return {
    axes,
    archetype,
    archetypeTraitId: ARCHETYPE_TRAIT_ID[archetype],
    narrative,
    dominancePathsLed,
    untriedCountries,
    electionsWon,
    electionsLost,
    billsPassed,
    billsFailed,
    highestTier,
  };
}
