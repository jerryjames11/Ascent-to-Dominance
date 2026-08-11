// Court-intrigue / party-patronage advancement — the light Campaign-analog Sec 19 calls for.
// Same rhythm as the electoral campaign (weekly AP, actions, a rival, a resolution date) but the
// electorate is a handful of power brokers, and in party mode a performance-metric track.
import type { CountrySchema, OfficeRung } from "../types/country";
import type { PatronageState, PatronageMode, PowerBroker, PatronageActionType, PatronageActionDef } from "../types/patronage";
import type { ElectionResult } from "./electionSystem";
import { Rng } from "./rng";
import { generateName } from "./nameGen";

export const PATRONAGE_CYCLE_WEEKS = 26;
export const PATRONAGE_WEEKLY_AP = 2;

export const PATRONAGE_ACTION_DEFS: PatronageActionDef[] = [
  { type: "cultivate", label: "Cultivate a patron", description: "Private audiences, favors, attention. Builds favor with one broker.", apCost: 1, needsBroker: true },
  { type: "demonstrate-performance", label: "Demonstrate performance", description: "Deliver visible results in your current post. The record speaks for itself.", apCost: 1, needsBroker: false },
  { type: "undermine-rival", label: "Undermine your rival", description: "Quiet words in the right ears. Can backfire if traced back to you.", apCost: 2, needsBroker: false },
  { type: "loyalty-display", label: "Public display of loyalty", description: "Conspicuous deference to the center. The most influential broker notices.", apCost: 1, needsBroker: false },
];

const COURT_BROKER_TITLES = ["Senior Princes", "Interior Circle", "Clerical Establishment", "Merchant Families"];
const PARTY_BROKER_TITLES = ["Party Elders", "Organization Department", "Security Apparatus", "Provincial Bloc"];

export function initPatronageState(office: OfficeRung, country: CountrySchema, mode: PatronageMode, seed: string): PatronageState {
  const rng = new Rng(`${seed}-patronage-${office.id}`);
  const titles = mode === "court-intrigue" ? COURT_BROKER_TITLES : PARTY_BROKER_TITLES;

  // Influence weights: a random split that always sums to 1, with no broker irrelevant.
  const rawWeights = titles.map(() => 0.5 + rng.float());
  const weightSum = rawWeights.reduce((s, w) => s + w, 0);

  const brokers: PowerBroker[] = titles.map((title, i) => ({
    id: `broker-${i}`,
    name: generateName(country.id, rng),
    title,
    influence: rawWeights[i] / weightSum,
    playerFavor: rng.int(25, 45),
    rivalFavor: rng.int(30, 50),
  }));

  return {
    officeId: office.id,
    officeTitle: office.title,
    countryId: country.id,
    mode,
    totalWeeks: PATRONAGE_CYCLE_WEEKS,
    weeksRemaining: PATRONAGE_CYCLE_WEEKS,
    apRemaining: PATRONAGE_WEEKLY_AP,
    brokers,
    rivalName: generateName(country.id, rng),
    performanceScore: rng.int(30, 45),
    rivalPerformanceScore: rng.int(35, 50),
    actionLog: [],
  };
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

export interface PatronageOutcome {
  summary: string;
  authenticityDelta: number;
  corruptionDelta: number;
}

export function applyPatronageAction(state: PatronageState, actionType: PatronageActionType, brokerId: string | undefined, rng: Rng): PatronageOutcome {
  const def = PATRONAGE_ACTION_DEFS.find((d) => d.type === actionType)!;
  state.apRemaining = Math.max(0, state.apRemaining - def.apCost);
  const outcome: PatronageOutcome = { summary: "", authenticityDelta: 0, corruptionDelta: 0 };

  switch (actionType) {
    case "cultivate": {
      const broker = state.brokers.find((b) => b.id === brokerId) ?? state.brokers[0];
      const gain = 5 + rng.range(0, 3);
      broker.playerFavor = clamp(broker.playerFavor + gain);
      outcome.summary = `Cultivated the ${broker.title} (+${gain.toFixed(1)} favor).`;
      outcome.corruptionDelta = 0.5;
      break;
    }
    case "demonstrate-performance": {
      const perfGain = state.mode === "party-patronage" ? 4 + rng.range(0, 2) : 2 + rng.range(0, 1.5);
      state.performanceScore = clamp(state.performanceScore + perfGain);
      for (const b of state.brokers) b.playerFavor = clamp(b.playerFavor + 1.5);
      outcome.summary = `Delivered results (+${perfGain.toFixed(1)} performance, small favor gain across the board).`;
      break;
    }
    case "undermine-rival": {
      if (rng.chance(0.25)) {
        const top = state.brokers.reduce((a, b) => (b.influence > a.influence ? b : a));
        top.playerFavor = clamp(top.playerFavor - 5);
        outcome.summary = `The whisper campaign against ${state.rivalName} was traced back to you — the ${top.title} are displeased.`;
        outcome.authenticityDelta = -3;
      } else {
        for (const b of state.brokers) b.rivalFavor = clamp(b.rivalFavor - 4);
        outcome.summary = `Doubts about ${state.rivalName} are circulating (-4 their favor across the board).`;
        outcome.corruptionDelta = 1;
      }
      break;
    }
    case "loyalty-display": {
      const top = state.brokers.reduce((a, b) => (b.influence > a.influence ? b : a));
      const gain = 7 + rng.range(0, 3);
      top.playerFavor = clamp(top.playerFavor + gain);
      outcome.summary = `Conspicuous loyalty noted by the ${top.title} (+${gain.toFixed(1)} favor).`;
      outcome.authenticityDelta = -1.5;
      break;
    }
  }

  state.actionLog.push(outcome.summary);
  return outcome;
}

/** Rival contender runs their own quiet campaign each week. */
export function tickPatronageWeek(state: PatronageState, rng: Rng): void {
  const target = state.brokers[rng.int(0, state.brokers.length - 1)];
  target.rivalFavor = clamp(target.rivalFavor + rng.range(1.5, 4));
  if (state.mode === "party-patronage") {
    state.rivalPerformanceScore = clamp(state.rivalPerformanceScore + rng.range(0.5, 2));
  }
  state.weeksRemaining = Math.max(0, state.weeksRemaining - 1);
  state.apRemaining = PATRONAGE_WEEKLY_AP;
}

/** Performance matters far more where the doc says metrics replace the persuasion grid. */
function performanceWeight(mode: PatronageMode): number {
  return mode === "party-patronage" ? 0.4 : 0.15;
}

export function patronageScores(state: PatronageState): { player: number; rival: number } {
  const favorWeight = 1 - performanceWeight(state.mode);
  const playerFavor = state.brokers.reduce((s, b) => s + b.influence * b.playerFavor, 0);
  const rivalFavor = state.brokers.reduce((s, b) => s + b.influence * b.rivalFavor, 0);
  return {
    player: playerFavor * favorWeight + state.performanceScore * performanceWeight(state.mode),
    rival: rivalFavor * favorWeight + state.rivalPerformanceScore * performanceWeight(state.mode),
  };
}

/** Resolves the selection into the same ElectionResult shape the rest of the game consumes;
 *  scopeRegionIds is empty, which the result screen uses to switch to selection wording. */
export function resolvePatronageSelection(state: PatronageState): ElectionResult {
  const { player, rival } = patronageScores(state);
  const total = player + rival || 1;
  const candidates = [
    { id: "player", name: "You", totalVotes: player, voteShare: player / total, regionUnitsWon: 0 },
    { id: "patronage-rival", name: state.rivalName, totalVotes: rival, voteShare: rival / total, regionUnitsWon: 0 },
  ].sort((a, b) => b.totalVotes - a.totalVotes);
  return { winnerId: candidates[0].id, candidates, runoffOccurred: false, scopeRegionIds: [] };
}
