// Campaign mechanics — Sec 7. Weekly actions write to the grid via GridWriter; player only ever
// reads outcomes through polls (Sec 8), never raw cells.
import type { DemographicSegment } from "../types/grid";
import type {
  CampaignState,
  CampaignResources,
  CampaignStage,
  WeeklyActionType,
  Opponent,
  OpponentArchetype,
  CampaignEvent,
} from "../types/campaign";
import type { CountrySchema, OfficeRung } from "../types/country";
import type { PlayerCharacter } from "../types/player";
import { LiveGrid } from "./gridSystem";
import { Rng } from "./rng";
import { generateName } from "./nameGen";

export const TOTAL_CAMPAIGN_WEEKS = 78;
export const WEEKLY_ACTION_POINTS = 2;

export interface ActionDef {
  type: WeeklyActionType;
  label: string;
  description: string;
  apCost: number;
  moneyCost: number;
  staminaCost: number;
  needsTarget: boolean;
}

export const ACTION_DEFS: ActionDef[] = [
  { type: "advertise", label: "Run ads", description: "Targeted persuasion, diminishing returns the more you repeat it on the same audience.", apCost: 1, moneyCost: 8000, staminaCost: 5, needsTarget: true },
  { type: "rally", label: "Hold a rally", description: "Boosts persuasion and turnout enthusiasm where you show up. Costs stamina.", apCost: 1, moneyCost: 2000, staminaCost: 20, needsTarget: true },
  { type: "fundraise", label: "Fundraise", description: "Spend time courting donors instead of voters. Diminishing returns per pool.", apCost: 1, moneyCost: 0, staminaCost: 10, needsTarget: false },
  { type: "position", label: "Stake a policy position", description: "Move persuasion on an issue-salient audience. Inconsistent positioning risks Authenticity.", apCost: 1, moneyCost: 500, staminaCost: 5, needsTarget: true },
  { type: "debate", label: "Debate", description: "High risk, high reward. Moves persuasion scope-wide based on how it goes.", apCost: 2, moneyCost: 0, staminaCost: 25, needsTarget: false },
  { type: "oppo-research", label: "Opposition research", description: "Attack an opponent's numbers. Can backfire.", apCost: 2, moneyCost: 5000, staminaCost: 15, needsTarget: false },
  { type: "endorsement", label: "Court an endorsement", description: "Spend political capital for a persuasion boost in a courted audience.", apCost: 1, moneyCost: 0, staminaCost: 5, needsTarget: true },
  { type: "gotv", label: "GOTV infrastructure", description: "Turnout enthusiasm across your scope. Gets stronger in the final stretch.", apCost: 1, moneyCost: 4000, staminaCost: 10, needsTarget: false },
];

const OPPONENT_ARCHETYPES: OpponentArchetype[] = ["attack-dog", "ground-game-grinder", "big-money-air-war", "grassroots-insurgent"];

function stageForWeeksRemaining(weeksRemaining: number): CampaignStage {
  if (weeksRemaining > 52) return "exploratory";
  if (weeksRemaining > 30) return "primary";
  if (weeksRemaining > 4) return "general";
  return "final-stretch";
}

export function generateOpponents(country: CountrySchema, office: OfficeRung, seed: string, count = 2): Opponent[] {
  const rng = new Rng(`${seed}-opponents-${office.id}`);
  const opponents: Opponent[] = [];
  for (let i = 0; i < count; i++) {
    const archetype = OPPONENT_ARCHETYPES[rng.int(0, OPPONENT_ARCHETYPES.length - 1)];
    opponents.push({
      id: `opp-${office.id}-${i}`,
      name: generateName(country.id, rng),
      archetype,
      ideology: {
        economic: rng.range(-80, 80),
        social: rng.range(-80, 80),
        foreignPolicy: rng.range(-80, 80),
      },
      resources: {
        money: rng.range(20000, 80000),
        staffQuality: rng.range(30, 75),
        politicalCapital: rng.range(10, 60),
        stamina: 100,
      },
      pollingSupport: rng.range(20, 40),
    });
  }
  return opponents;
}

export function initCampaignState(
  office: OfficeRung,
  country: CountrySchema,
  scopeRegionIds: string[],
  opponents: Opponent[],
  playerModifiers: { fundraisingSkill: number },
  isReelection: boolean
): CampaignState {
  return {
    officeId: office.id,
    officeTitle: office.title,
    countryId: country.id,
    scopeRegionIds,
    totalWeeks: TOTAL_CAMPAIGN_WEEKS,
    weeksRemaining: TOTAL_CAMPAIGN_WEEKS,
    apRemaining: WEEKLY_ACTION_POINTS,
    stage: "exploratory",
    resources: {
      money: 15000 + playerModifiers.fundraisingSkill * 100,
      staffQuality: 35,
      politicalCapital: 20,
      stamina: 100,
    },
    opponents,
    actionLog: [],
    polls: [],
    pendingEvent: null,
    eventHistory: [],
    isReelection,
  };
}

export interface ActionTarget {
  regionId?: string;
  segmentFilter?: Partial<DemographicSegment>;
  /** Which National Agenda issue this action is about — used by "position" to tag the Promise Ledger. */
  issueId?: string;
}

export interface ActionOutcome {
  summary: string;
  authenticityDelta: number;
  corruptionDelta: number;
}

function diminishingFactor(recentCountOnTarget: number): number {
  return 1 / (1 + recentCountOnTarget * 0.35);
}

function recentTargetCount(state: CampaignState, type: WeeklyActionType, target: ActionTarget, lookbackWeeks = 8): number {
  const floor = state.weeksRemaining - lookbackWeeks;
  return state.actionLog.filter(
    (l) =>
      l.week >= floor &&
      l.actionType === type &&
      l.targetRegionId === target.regionId &&
      JSON.stringify(l.targetSegmentFilter ?? {}) === JSON.stringify(target.segmentFilter ?? {})
  ).length;
}

/** Resolves a single weekly action. Mutates `state.resources`/`state.actionLog` and the live grid. */
export function applyWeeklyAction(
  state: CampaignState,
  grid: LiveGrid,
  player: PlayerCharacter,
  actionType: WeeklyActionType,
  target: ActionTarget,
  rng: Rng
): ActionOutcome {
  const def = ACTION_DEFS.find((d) => d.type === actionType)!;
  state.apRemaining = Math.max(0, state.apRemaining - def.apCost);
  state.resources.money -= def.moneyCost;
  state.resources.stamina = Math.max(0, state.resources.stamina - def.staminaCost);

  const cellsInScope = target.regionId
    ? grid.getCellsByRegion(target.regionId)
    : grid.getCellsInScope(state.scopeRegionIds);
  const cells = target.segmentFilter
    ? cellsInScope.filter((c) => {
        const seg = grid.grid.segments.find((s) => s.id === c.segmentId);
        return seg && Object.entries(target.segmentFilter!).every(([k, v]) => (seg as unknown as Record<string, unknown>)[k] === v);
      })
    : cellsInScope;

  const staminaFactor = 0.5 + state.resources.stamina / 200; // 0.5 - 1.0
  const staffFactor = 0.6 + state.resources.staffQuality / 250; // 0.6 - 1.0
  const dim = diminishingFactor(recentTargetCount(state, actionType, target));
  let outcome: ActionOutcome = { summary: "", authenticityDelta: 0, corruptionDelta: 0 };

  switch (actionType) {
    case "advertise": {
      const base = 2.2 * staffFactor * staminaFactor * dim;
      for (const c of cells) grid.adjustPersuasion(c.regionId, c.segmentId, base);
      outcome.summary = `Ads reached ${cells.length} audience cells (+${base.toFixed(1)} persuasion, diminishing returns applied).`;
      break;
    }
    case "rally": {
      const persuasionGain = 1.8 * staminaFactor * player.charisma / 60 * dim;
      const turnoutGain = 6 * staminaFactor * dim;
      for (const c of cells) {
        grid.adjustPersuasion(c.regionId, c.segmentId, persuasionGain);
        grid.adjustTurnoutEnthusiasm(c.regionId, c.segmentId, turnoutGain);
      }
      outcome.summary = `Rally energized the crowd (+${persuasionGain.toFixed(1)} persuasion, +${turnoutGain.toFixed(1)} enthusiasm).`;
      break;
    }
    case "fundraise": {
      const donorDim = diminishingFactor(recentTargetCount(state, "fundraise", {}, 6));
      const raised = (4000 + player.fundraisingSkill * 90) * staffFactor * donorDim;
      state.resources.money += raised;
      outcome.summary = `Raised $${Math.round(raised).toLocaleString()}.`;
      outcome.corruptionDelta = 0.3;
      break;
    }
    case "position": {
      const gain = 2.5 * dim;
      for (const c of cells) grid.adjustPersuasion(c.regionId, c.segmentId, gain);
      outcome.summary = `Staked a position with the targeted audience (+${gain.toFixed(1)} persuasion).`;
      outcome.authenticityDelta = rng.chance(0.25) ? -3 : 1;
      break;
    }
    case "debate": {
      const playerRoll = player.charisma * 0.6 + player.persuasionSkill * 0.4 + rng.range(-20, 20);
      const oppRoll = 50 + rng.range(-20, 20);
      const margin = (playerRoll - oppRoll) / 100;
      const gain = margin * 5;
      const scopeCells = grid.getCellsInScope(state.scopeRegionIds);
      for (const c of scopeCells) grid.adjustPersuasion(c.regionId, c.segmentId, gain);
      outcome.summary =
        margin > 0.05
          ? `Won the debate decisively (${gain > 0 ? "+" : ""}${gain.toFixed(1)} persuasion scope-wide).`
          : margin < -0.05
          ? `Rough debate night (${gain.toFixed(1)} persuasion scope-wide).`
          : `Debate was a wash.`;
      break;
    }
    case "oppo-research": {
      const target0 = state.opponents[rng.int(0, state.opponents.length - 1)];
      const backfire = rng.chance(0.25);
      if (backfire) {
        target0.pollingSupport += 2;
        outcome.summary = `The attack on ${target0.name} backfired — sympathy bump for them.`;
        outcome.authenticityDelta = -4;
      } else {
        target0.pollingSupport = Math.max(2, target0.pollingSupport - 3.5);
        outcome.summary = `Opposition research against ${target0.name} landed (-3.5 their polling).`;
      }
      break;
    }
    case "endorsement": {
      const secured = rng.chance(0.6 + state.resources.politicalCapital / 200);
      if (secured) {
        state.resources.politicalCapital = Math.max(0, state.resources.politicalCapital - 8);
        const gain = 4;
        for (const c of cells) grid.adjustPersuasion(c.regionId, c.segmentId, gain);
        outcome.summary = `Endorsement secured (+${gain} persuasion with that audience).`;
      } else {
        outcome.summary = `Courted an endorsement, but it didn't come through this week.`;
      }
      break;
    }
    case "gotv": {
      const stageFactor = state.stage === "final-stretch" ? 1.8 : state.stage === "general" ? 1.2 : 0.8;
      const gain = 5 * staffFactor * stageFactor * dim;
      const scopeCells = grid.getCellsInScope(state.scopeRegionIds);
      for (const c of scopeCells) grid.adjustTurnoutEnthusiasm(c.regionId, c.segmentId, gain);
      outcome.summary = `GOTV infrastructure built (+${gain.toFixed(1)} turnout enthusiasm scope-wide).`;
      break;
    }
  }

  state.actionLog.push({
    week: state.weeksRemaining,
    actionType,
    targetRegionId: target.regionId,
    targetSegmentFilter: target.segmentFilter as Record<string, string> | undefined,
    outcomeSummary: outcome.summary,
  });

  return outcome;
}

/** Opponent AI: reacts to the player's polling swings with weighted-random counter-moves. */
export function tickOpponentAI(state: CampaignState, rng: Rng): void {
  for (const opp of state.opponents) {
    const archetypeSwing: Record<OpponentArchetype, number> = {
      "attack-dog": rng.range(-2, 3),
      "ground-game-grinder": rng.range(-1, 2),
      "big-money-air-war": rng.range(-2, 3.5),
      "grassroots-insurgent": rng.range(-2.5, 3.5),
    };
    opp.pollingSupport = Math.max(2, Math.min(70, opp.pollingSupport + archetypeSwing[opp.archetype]));
  }
}

const EVENT_POOL: { type: CampaignEvent["type"]; description: string }[] = [
  { type: "gaffe", description: "An old quote resurfaces and local press is running with it." },
  { type: "scandal", description: "A staffer's spending on the campaign card raises questions." },
  { type: "economic-shock", description: "A regional plant announces layoffs this week." },
  { type: "endorsement-flip", description: "A local paper that backed you last cycle is reconsidering." },
];

export function maybeGenerateEvent(state: CampaignState, currentWeek: number, rng: Rng): CampaignEvent | null {
  if (state.pendingEvent) return state.pendingEvent;
  const chance = state.stage === "final-stretch" ? 0.12 : 0.06;
  if (!rng.chance(chance)) return null;
  const pick = EVENT_POOL[rng.int(0, EVENT_POOL.length - 1)];
  const event: CampaignEvent = {
    id: `evt-${currentWeek}-${rng.int(0, 99999)}`,
    type: pick.type,
    week: currentWeek,
    description: pick.description,
    resolved: false,
  };
  state.pendingEvent = event;
  return event;
}

export function resolveEvent(
  state: CampaignState,
  grid: LiveGrid,
  choice: "deny" | "apologize" | "counterattack"
): ActionOutcome {
  const event = state.pendingEvent;
  if (!event) return { summary: "", authenticityDelta: 0, corruptionDelta: 0 };
  event.choiceOutcome = choice;
  event.resolved = true;
  state.eventHistory.push(event);
  state.pendingEvent = null;

  const scopeCells = grid.getCellsInScope(state.scopeRegionIds);
  let persuasionDelta = 0;
  let authenticityDelta = 0;
  let summary = "";

  if (choice === "deny") {
    persuasionDelta = -1.5;
    authenticityDelta = -5;
    summary = "Denied it outright. Story lingers, but you didn't dignify it.";
  } else if (choice === "apologize") {
    persuasionDelta = -0.5;
    authenticityDelta = 3;
    summary = "Owned it publicly. Short-term hit, but it reads as sincere.";
  } else {
    persuasionDelta = -2.5;
    authenticityDelta = -2;
    summary = "Went on the attack instead. Bigger swing, bigger risk.";
  }

  for (const c of scopeCells) grid.adjustPersuasion(c.regionId, c.segmentId, persuasionDelta);
  return { summary, authenticityDelta, corruptionDelta: 0 };
}

/** Advances the campaign clock by one week: decays the grid, updates stage, ticks opponent AI. */
export function advanceWeek(state: CampaignState, grid: LiveGrid, rng: Rng): void {
  grid.tickWeek();
  tickOpponentAI(state, rng);
  state.weeksRemaining = Math.max(0, state.weeksRemaining - 1);
  state.stage = stageForWeeksRemaining(state.weeksRemaining);
  state.resources.stamina = Math.min(100, state.resources.stamina + 15);
  state.apRemaining = WEEKLY_ACTION_POINTS;
}

export function resourcesAfterSpend(resources: CampaignResources, moneyDelta: number): CampaignResources {
  return { ...resources, money: resources.money + moneyDelta };
}
