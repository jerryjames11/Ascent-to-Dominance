// Central game state machine. Phase 1 loop: character creation -> office select -> campaign ->
// election result -> serving (Profile/Country/Legislature tabs, real weekly ticks, sessions,
// term limits) -> term end -> repeat.
import { create } from "zustand";
import type { CountrySchema, OfficeRung } from "../types/country";
import type { IdeologyPosition } from "../types/grid";
import type { PlayerCharacter, ProfileState, CareerEvent, RelationshipEntry, CareerStats } from "../types/player";
import type { CampaignState, WeeklyActionType } from "../types/campaign";
import type { Bill, AgendaItem, BillAmendment } from "../types/legislature";
import { ISSUE_CATALOG } from "../types/legislature";
import { SAMPLE_COUNTRIES } from "../data/sample-countries";
import { getBackstory } from "../data/backstories";
import { getTrait } from "../data/traits";
import { buildGrid, LiveGrid, regionOptionsForCountry } from "../systems/gridSystem";
import { commissionPoll, type PollsterTier } from "../systems/pollSystem";
import {
  generateOpponents,
  initCampaignState,
  applyWeeklyAction,
  advanceWeek as advanceWeekSystem,
  maybeGenerateEvent,
  resolveEvent as resolveEventSystem,
  ACTION_DEFS,
  type ActionTarget,
} from "../systems/campaignSystem";
import { resolveElection, type ElectionResult } from "../systems/electionSystem";
import { generateLegislature, pickRisingChallenger, type GeneratedLegislature } from "../systems/legislatorGen";
import { computeNationalAgenda, projectAllVotes, resolveVote, applyBillPassage } from "../systems/legislatureSystem";
import { awardTrait, evaluateNewTraits } from "../systems/traitSystem";
import { nudgeIdeology, ideologyDistance } from "../systems/driftSystem";
import { generateCandidates, computeCabinetEffects, tickCabinetWeek } from "../systems/cabinetSystem";
import { portfolioSlotsForTier } from "../data/portfolios";
import type { Appointee, AppointeeCandidate, PortfolioId } from "../types/cabinet";
import { generateAiNations, computePlayerNationalStats, tickAiNation } from "../systems/worldSystem";
import { tickTension, stageForTension } from "../systems/tensionSystem";
import { DIPLOMATIC_ACTIONS } from "../systems/diplomacySystem";
import { resolveWarTurn, applyWarDomesticImpact, checkWarResolution, negotiateSettlement, initWar } from "../systems/warSystem";
import type { AiNation, NationalPowerStats, WarState, WarLegacyTag, WarGoalScope } from "../types/world";
import { Rng } from "../systems/rng";

export type Phase =
  | "character-creation"
  | "office-select"
  | "campaigning"
  | "election-result"
  | "serving"
  | "career-ended";

export type ServingTab = "profile" | "country" | "legislature" | "world";

export interface OfficeHeld {
  officeId: string;
  title: string;
  tier: 1 | 2 | 3 | 4;
  startedWeek: number;
}

export interface CharacterCreationInput {
  name: string;
  gender: PlayerCharacter["gender"];
  age: number;
  countryId: string;
  homeRegionId: string;
  backstoryId: PlayerCharacter["backstoryId"];
  ideology: IdeologyPosition;
}

export interface SessionState {
  index: number;
  billsProposedThisSession: number;
}

export const SESSION_LENGTH_WEEKS = 13; // quarterly, Sec 9
export const SESSION_BILL_CAPACITY = 2;

interface GameState {
  phase: Phase;
  servingTab: ServingTab;
  seed: string;
  player: PlayerCharacter | null;
  country: CountrySchema | null;
  grid: LiveGrid | null;
  gridVersion: number;
  absoluteWeek: number;
  currentOffice: OfficeHeld | null;
  officeHistory: OfficeHeld[];
  termsServedByOffice: Record<string, number>;
  session: SessionState | null;
  campaign: CampaignState | null;
  lastElectionResult: ElectionResult | null;
  legislature: GeneratedLegislature | null;
  bills: Bill[];
  activeBillId: string | null;
  cabinet: Appointee[];
  profile: ProfileState;
  pollTier: PollsterTier;

  // World layer (Sec 10/11/18) — generated once the player first reaches national office
  aiNations: AiNation[];
  tensionByNationId: Record<string, number>;
  tradeAgreementsByNationId: Record<string, boolean>;
  worldStatModifiers: NationalPowerStats;
  activeWar: WarState | null;
  warLegacyTags: WarLegacyTag[];

  // actions
  createCharacter: (input: CharacterCreationInput) => void;
  announceCandidacy: (officeId: string) => void;
  runAction: (actionType: WeeklyActionType, target: ActionTarget) => string;
  advanceWeek: () => void;
  answerEvent: (choice: "deny" | "apologize" | "counterattack") => void;
  setPollTier: (tier: PollsterTier) => void;
  continueFromElectionResult: () => void;
  setServingTab: (tab: ServingTab) => void;
  advanceServingWeek: () => void;
  proposeBill: (title: string, issueId: string, intensity: number, ideology: IdeologyPosition, targetRegionId?: string) => boolean;
  setActiveBill: (billId: string | null) => void;
  acceptAmendment: (billId: string) => void;
  callVote: (billId: string) => void;
  honorDonorAsk: (id: string) => void;
  ignoreDonorAsk: (id: string) => void;
  breakPromise: (id: string) => void;
  getCandidatesForSlot: (slotId: string) => AppointeeCandidate[];
  appointToPortfolio: (slotId: string, candidate: AppointeeCandidate) => void;
  dismissAppointee: (id: string) => void;
  consultAppointee: (id: string) => void;
  getPlayerNationalStats: () => NationalPowerStats;
  applyDiplomaticAction: (nationId: string, actionType: (typeof DIPLOMATIC_ACTIONS)[number]["type"]) => void;
  declareWar: (nationId: string, goalScope: WarGoalScope) => void;
  fundWar: () => boolean;
  sueForPeace: () => void;
  endTerm: (choice: "run-again" | "run-next-tier" | "retire") => void;
  resetGame: () => void;
}

const countryById = (id: string): CountrySchema => {
  const c = SAMPLE_COUNTRIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown country ${id}`);
  return c;
};

function scopeForOffice(country: CountrySchema, office: OfficeRung, homeRegionId: string): string[] {
  if (office.tier >= 4) {
    return regionOptionsForCountry(country).map((r) => r.id);
  }
  return [homeRegionId];
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function pushEvent(profile: ProfileState, absoluteWeek: number, type: CareerEvent["type"], description: string) {
  profile.careerTimeline.push({ absoluteWeek, type, description });
}

function pushEarnedTraitEvents(profile: ProfileState, absoluteWeek: number, newTraitIds: string[]) {
  for (const id of newTraitIds) {
    const trait = getTrait(id);
    pushEvent(profile, absoluteWeek, "trait-earned", `Earned trait: ${trait?.name ?? id}.`);
  }
}

function defaultCareerStats(): CareerStats {
  return {
    debateWins: 0,
    debateLosses: 0,
    bigFundraisingHauls: 0,
    endorsementsSecured: 0,
    oppoResearchUsedThisCampaign: 0,
    negativeCampaignWins: 0,
    gaffeEvents: 0,
    scandalEvents: 0,
    highTurnoutWins: 0,
    sponsoredBillsTotal: 0,
    bipartisanBillsPassed: 0,
    crossPartyHeavyBillsPassed: 0,
    highCorruptionStreakWeeks: 0,
  };
}

function freshProfile(): ProfileState {
  return {
    earnedTraitIds: [],
    promiseLedger: [],
    donorLedger: [],
    relationships: [],
    careerTimeline: [],
    corruptionScore: 0,
    authenticity: 60,
    careerStats: defaultCareerStats(),
    donorGoodwill: 0,
  };
}

function seedRelationships(legislature: GeneratedLegislature): RelationshipEntry[] {
  const entries: RelationshipEntry[] = [];
  for (const faction of legislature.factions) {
    entries.push({
      id: `party-${faction.id}`,
      name: `${faction.name} Leadership`,
      role: "party-leader",
      score: faction.isPlayerParty ? 20 : 0,
      historyLog: [faction.isPlayerParty ? "Your party's leadership in the chamber." : "Opposition leadership."],
    });
  }
  return entries;
}

function bumpDonorRelationship(relationships: RelationshipEntry[], delta: number, note: string): RelationshipEntry[] {
  const existing = relationships.find((r) => r.id === "donor-circle");
  if (existing) {
    return relationships.map((r) =>
      r.id === "donor-circle" ? { ...r, score: Math.max(-100, Math.min(100, r.score + delta)), historyLog: [...r.historyLog, note] } : r
    );
  }
  return [...relationships, { id: "donor-circle", name: "Donor Circle", role: "donor", score: Math.max(-100, Math.min(100, delta)), historyLog: [note] }];
}

function sessionForWeek(weeksIntoTerm: number): SessionState {
  return { index: Math.floor(Math.max(0, weeksIntoTerm) / SESSION_LENGTH_WEEKS), billsProposedThisSession: 0 };
}

function defaultWorldStatModifiers(): NationalPowerStats {
  return { economy: 0, military: 0, diplomacy: 0, stability: 0, innovation: 0 };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "character-creation",
  servingTab: "profile",
  seed: `career-${Date.now()}`,
  player: null,
  country: null,
  grid: null,
  gridVersion: 0,
  absoluteWeek: 0,
  currentOffice: null,
  officeHistory: [],
  termsServedByOffice: {},
  session: null,
  campaign: null,
  lastElectionResult: null,
  legislature: null,
  bills: [],
  activeBillId: null,
  cabinet: [],
  profile: freshProfile(),
  pollTier: "low",
  aiNations: [],
  tensionByNationId: {},
  tradeAgreementsByNationId: {},
  worldStatModifiers: defaultWorldStatModifiers(),
  activeWar: null,
  warLegacyTags: [],

  createCharacter: (input) => {
    const country = countryById(input.countryId);
    const backstory = getBackstory(input.backstoryId);
    const player: PlayerCharacter = {
      name: input.name,
      gender: input.gender,
      age: input.age,
      countryId: input.countryId,
      homeRegionId: input.homeRegionId,
      backstoryId: input.backstoryId,
      ideology: input.ideology,
      startingIdeology: input.ideology,
      charisma: 50 + (backstory.statModifiers.baseCharismaDelta ?? 0) + (backstory.statModifiers.startingPersuasion ?? 0) * 0.3,
      persuasionSkill: 50 + (backstory.statModifiers.startingPersuasion ?? 0),
      fundraisingSkill: 50 + (backstory.statModifiers.donorNetworkStrength ?? 0) + (backstory.statModifiers.donorNetworkWeak ?? 0),
      legislativeSkill: 50 + (backstory.statModifiers.billDraftingBonus ?? 0) + (backstory.statModifiers.legislativeSkillDelta ?? 0),
      groundGameSkill: 50 + (backstory.statModifiers.groundGameBonus ?? 0),
    };
    const seed = `${input.countryId}-${input.name}-${Date.now()}`;
    const startingPersuasion = 30 + (backstory.statModifiers.startingPersuasion ?? 0) * 0.4 + (backstory.statModifiers.nameRecognition ?? 0) * 0.3;
    const grid = new LiveGrid(buildGrid(country, seed, player.ideology, startingPersuasion));

    const profile = freshProfile();
    profile.earnedTraitIds = [backstory.starterTraitId];
    profile.authenticity = 60 + (backstory.statModifiers.authenticityPenalty ?? 0) + (backstory.statModifiers.authenticityPenaltyWorkingClass ?? 0) * 0.3;
    pushEvent(profile, 0, "trait-earned" as CareerEvent["type"], `Entered politics as a ${backstory.name}.`);

    set({
      phase: "office-select",
      seed,
      player,
      country,
      grid,
      gridVersion: 1,
      absoluteWeek: 0,
      currentOffice: null,
      officeHistory: [],
      termsServedByOffice: {},
      session: null,
      campaign: null,
      lastElectionResult: null,
      legislature: null,
      bills: [],
      cabinet: [],
      profile,
      servingTab: "profile",
      aiNations: [],
      tensionByNationId: {},
      tradeAgreementsByNationId: {},
      worldStatModifiers: defaultWorldStatModifiers(),
      activeWar: null,
      warLegacyTags: [],
    });
  },

  announceCandidacy: (officeId) => {
    const { country, player, grid, seed, absoluteWeek, profile, legislature } = get();
    if (!country || !player || !grid) return;
    const office = country.officeLadder.find((o) => o.id === officeId);
    if (!office) return;
    const scopeRegionIds = scopeForOffice(country, office, player.homeRegionId);
    const isReelection = get().currentOffice?.officeId === officeId;
    const opponents = generateOpponents(country, office, `${seed}-w${absoluteWeek}`, country.electoralSystem === "run-off" ? 3 : 2);

    // Sec 14 stretch: a disaffected "climber" from the outgoing legislature can arrive as a
    // named, better-known challenger instead of a fully generic one.
    const challenger = legislature ? pickRisingChallenger(legislature) : undefined;
    let challengerNote: string | null = null;
    if (challenger && opponents.length > 0) {
      opponents[0] = {
        ...opponents[0],
        name: challenger.name,
        ideology: challenger.ideology,
        pollingSupport: Math.min(55, opponents[0].pollingSupport + 12),
      };
      challengerNote = `${challenger.name}, once a rising voice in your own chamber, is now challenging you for ${office.title}.`;
    }

    const donorGoodwillBonus = Math.max(-6000, Math.min(15000, profile.donorGoodwill * 350));
    const campaign = initCampaignState(office, country, scopeRegionIds, opponents, player, isReelection, donorGoodwillBonus);

    const nextProfile = { ...profile, careerStats: { ...profile.careerStats, oppoResearchUsedThisCampaign: 0 } };
    pushEvent(nextProfile, absoluteWeek, "candidacy-announced", `Announced candidacy for ${office.title}.`);
    if (challengerNote) pushEvent(nextProfile, absoluteWeek, "candidacy-announced", challengerNote);
    nextProfile.relationships = [
      ...nextProfile.relationships.filter((r) => r.role !== "rival"),
      ...opponents.map((o) => ({ id: o.id, name: o.name, role: "rival" as const, score: 0, historyLog: [`Running against you for ${office.title}.`] })),
    ];

    set({ phase: "campaigning", campaign, profile: nextProfile, lastElectionResult: null });
  },

  runAction: (actionType, target) => {
    const { campaign, grid, player, seed, absoluteWeek } = get();
    if (!campaign || !grid || !player) return "";
    const def = ACTION_DEFS.find((d) => d.type === actionType)!;
    if (campaign.apRemaining < def.apCost) return "Not enough time left this week for that.";
    if (campaign.resources.money < def.moneyCost) return "Not enough money for that.";
    const rng = new Rng(`${seed}-action-${absoluteWeek}-${campaign.weeksRemaining}-${actionType}`);
    const outcome = applyWeeklyAction(campaign, grid, player, actionType, target, rng);

    const profile = { ...get().profile, careerStats: { ...get().profile.careerStats } };
    profile.authenticity = clamp(profile.authenticity + outcome.authenticityDelta);
    profile.corruptionScore = clamp(profile.corruptionScore + outcome.corruptionDelta);

    if (actionType === "position" && target.issueId) {
      const issueLabel = ISSUE_CATALOG.find((i) => i.id === target.issueId)?.label ?? target.issueId;
      const audience = target.segmentFilter && Object.keys(target.segmentFilter).length > 0 ? Object.values(target.segmentFilter).join("/") : "voters broadly";
      profile.promiseLedger = [
        ...profile.promiseLedger,
        {
          id: `promise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: `Committed to ${issueLabel} for ${audience}.`,
          coalitionTag: target.issueId,
          status: "pending",
          madeAtWeek: campaign.weeksRemaining,
        },
      ];
    }
    if (actionType === "fundraise" && Math.random() < 0.3) {
      profile.donorLedger = [
        ...profile.donorLedger,
        {
          id: `donor-${Date.now()}`,
          donorName: `${player.name.split(" ")[0]}'s donor circle`,
          ask: "Go easy on business regulation this term.",
          fulfilled: null,
          weekMade: campaign.weeksRemaining,
        },
      ];
    }

    // Career-stat bookkeeping feeding Sec 17 trait thresholds.
    let nextPlayer = player;
    if (actionType === "debate" && outcome.debateMargin !== undefined) {
      if (outcome.debateMargin > 0.05) profile.careerStats.debateWins += 1;
      else if (outcome.debateMargin < -0.05) profile.careerStats.debateLosses += 1;
    }
    if (actionType === "fundraise" && outcome.moneyRaised !== undefined && outcome.moneyRaised > 6000) {
      profile.careerStats.bigFundraisingHauls += 1;
    }
    if (actionType === "endorsement" && outcome.endorsementSecured) {
      profile.careerStats.endorsementsSecured += 1;
    }
    if (actionType === "oppo-research") {
      profile.careerStats.oppoResearchUsedThisCampaign += 1;
    }
    if (actionType === "position" && outcome.targetIdeology) {
      const dist = ideologyDistance(player.ideology, outcome.targetIdeology);
      nextPlayer = { ...player, ideology: nudgeIdeology(player.ideology, outcome.targetIdeology, 0.06) };
      if (dist > 15) profile.authenticity = clamp(profile.authenticity - 0.4);
    }

    const newTraits = evaluateNewTraits(profile);
    pushEarnedTraitEvents(profile, absoluteWeek, newTraits);

    set({ campaign: { ...campaign }, gridVersion: get().gridVersion + 1, profile, player: nextPlayer });
    return outcome.summary;
  },

  advanceWeek: () => {
    const { campaign, grid, seed, absoluteWeek, country } = get();
    if (!campaign || !grid || !country) return;
    const rng = new Rng(`${seed}-tick-${absoluteWeek}`);
    advanceWeekSystem(campaign, grid, rng);
    const newAbsoluteWeek = absoluteWeek + 1;

    const event = maybeGenerateEvent(campaign, campaign.weeksRemaining, rng);

    const polls = commissionPoll(grid, campaign.scopeRegionIds, campaign.weeksRemaining, get().pollTier, seed);
    campaign.polls = polls;

    if (campaign.weeksRemaining <= 0 && !event) {
      const result = resolveElection(grid, country, campaign.scopeRegionIds, campaign.opponents);
      const profile = { ...get().profile, careerStats: { ...get().profile.careerStats } };
      const office = country.officeLadder.find((o) => o.id === campaign.officeId)!;
      if (result.winnerId === "player") {
        pushEvent(profile, newAbsoluteWeek, "election-won", `Won the race for ${office.title}.`);

        const avgTurnout = campaign.scopeRegionIds.length
          ? grid.getCellsInScope(campaign.scopeRegionIds).reduce((s, c) => s + c.turnoutEnthusiasm, 0) /
            Math.max(1, grid.getCellsInScope(campaign.scopeRegionIds).length)
          : 0;
        if (avgTurnout >= 65) profile.careerStats.highTurnoutWins += 1;
        if (profile.careerStats.oppoResearchUsedThisCampaign >= 3) profile.careerStats.negativeCampaignWins += 1;
        const newTraits = evaluateNewTraits(profile);
        pushEarnedTraitEvents(profile, newAbsoluteWeek, newTraits);

        const legislature = generateLegislature(country, get().player!.ideology, `${seed}-${office.id}-${newAbsoluteWeek}`, office.tier);
        // Each term generates a fresh chamber — drop the outgoing one's leadership entries
        // rather than accumulating stale duplicates every re-election.
        profile.relationships = [...profile.relationships.filter((r) => r.role !== "party-leader"), ...seedRelationships(legislature)];
        pushEvent(profile, newAbsoluteWeek, "office-assumed", `Sworn in as ${office.title}.`);

        // World layer unlocks at national office (Sec 10 progressive unlock) — generate the AI
        // nations once, the first time the player reaches tier 3+.
        const existingNations = get().aiNations;
        const worldInit =
          office.tier >= 3 && existingNations.length === 0
            ? { aiNations: generateAiNations(country.id, seed), tensionByNationId: {} as Record<string, number> }
            : null;

        set({
          absoluteWeek: newAbsoluteWeek,
          lastElectionResult: result,
          phase: "election-result",
          profile,
          currentOffice: { officeId: office.id, title: office.title, tier: office.tier, startedWeek: newAbsoluteWeek },
          legislature,
          bills: [],
          cabinet: [],
          session: sessionForWeek(0),
          ...(worldInit ?? {}),
        });
      } else {
        pushEvent(profile, newAbsoluteWeek, "election-lost", `Lost the race for ${office.title}.`);
        set({ absoluteWeek: newAbsoluteWeek, lastElectionResult: result, phase: "election-result", profile });
      }
      return;
    }

    set({ absoluteWeek: newAbsoluteWeek, campaign: { ...campaign }, gridVersion: get().gridVersion + 1 });
  },

  answerEvent: (choice) => {
    const { campaign, grid, absoluteWeek, cabinet } = get();
    if (!campaign || !grid) return;
    const eventType = campaign.pendingEvent?.type;
    const outcome = resolveEventSystem(campaign, grid, choice);
    const dampening = 1 - computeCabinetEffects(cabinet).scandalDampening;
    const profile = { ...get().profile, careerStats: { ...get().profile.careerStats } };
    profile.authenticity = clamp(profile.authenticity + outcome.authenticityDelta * (outcome.authenticityDelta < 0 ? dampening : 1));
    profile.corruptionScore = clamp(profile.corruptionScore + outcome.corruptionDelta);
    if (eventType === "gaffe") profile.careerStats.gaffeEvents += 1;
    if (eventType === "scandal") profile.careerStats.scandalEvents += 1;

    const newTraits = evaluateNewTraits(profile);
    pushEarnedTraitEvents(profile, absoluteWeek, newTraits);

    set({ campaign: { ...campaign }, gridVersion: get().gridVersion + 1, profile });
  },

  setPollTier: (tier) => set({ pollTier: tier }),

  continueFromElectionResult: () => {
    const { currentOffice } = get();
    set({ phase: currentOffice ? "serving" : "office-select", campaign: null, servingTab: "profile" });
  },

  setServingTab: (tab) => set({ servingTab: tab }),

  advanceServingWeek: () => {
    const { grid, currentOffice, absoluteWeek, seed, cabinet, profile, country, aiNations, tensionByNationId, tradeAgreementsByNationId, activeWar, worldStatModifiers, bills } = get();
    if (!grid || !currentOffice || !country) return;
    grid.tickWeek();
    const newAbsoluteWeek = absoluteWeek + 1;
    const weeksIntoTerm = newAbsoluteWeek - currentOffice.startedWeek;
    const existingSession = get().session;
    const targetIndex = Math.floor(weeksIntoTerm / SESSION_LENGTH_WEEKS);
    const session =
      existingSession && existingSession.index === targetIndex ? existingSession : { index: targetIndex, billsProposedThisSession: 0 };

    const rng = new Rng(`${seed}-servetick-${newAbsoluteWeek}`);
    const nextCabinet = cabinet.map((a) => ({ ...a }));
    const { leaks } = tickCabinetWeek(nextCabinet, newAbsoluteWeek, rng);
    const nextProfile = { ...profile, careerStats: { ...profile.careerStats } };
    for (const leak of leaks) {
      nextProfile.authenticity = clamp(nextProfile.authenticity - 5);
      nextProfile.corruptionScore = clamp(nextProfile.corruptionScore + 4);
      pushEvent(nextProfile, newAbsoluteWeek, "scandal", leak.description);
    }
    if (nextProfile.corruptionScore > 50 && leaks.length === 0) {
      nextProfile.careerStats.highCorruptionStreakWeeks += 1;
    } else if (nextProfile.corruptionScore <= 50) {
      nextProfile.careerStats.highCorruptionStreakWeeks = 0;
    }

    // World layer tick (Sec 10/14/18/11) — evolves in the background regardless of tier;
    // only direct player *actions* are gated to observer/full by office tier.
    let nextAiNations = aiNations;
    let nextTension = tensionByNationId;
    let nextWar = activeWar;
    let nextWorldMods = worldStatModifiers;
    let nextWarLegacyTags = get().warLegacyTags;
    if (aiNations.length > 0) {
      const billsPassedByIssue: Record<string, number> = {};
      for (const b of bills) if (b.status === "implemented") billsPassedByIssue[b.issueId] = (billsPassedByIssue[b.issueId] ?? 0) + 1;
      const playerStats = computePlayerNationalStats(country, grid, billsPassedByIssue, nextCabinet);
      const finalPlayerStats: NationalPowerStats = {
        economy: clamp(playerStats.economy + worldStatModifiers.economy),
        military: clamp(playerStats.military + worldStatModifiers.military),
        diplomacy: clamp(playerStats.diplomacy + worldStatModifiers.diplomacy),
        stability: clamp(playerStats.stability + worldStatModifiers.stability),
        innovation: clamp(playerStats.innovation + worldStatModifiers.innovation),
      };

      nextAiNations = aiNations.map((n) => ({ ...n, stats: { ...n.stats } }));
      nextTension = { ...tensionByNationId };
      for (const nation of nextAiNations) {
        const current = nextTension[nation.id] ?? 15;
        const { tensionNudge } = tickAiNation(nation, finalPlayerStats, current, rng);
        nextTension[nation.id] = tickTension(current, get().player!.ideology, nation, tradeAgreementsByNationId[nation.id] ?? false, tensionNudge);
      }

      if (nextWar) {
        const nation = nextAiNations.find((n) => n.id === nextWar!.nationId);
        if (nation) {
          const frontDelta = resolveWarTurn(finalPlayerStats, nation.stats, nextWar, grid.aggregateApproval(), rng);
          nextWar = { ...nextWar, front: clamp(nextWar.front + frontDelta, 0, 100), turns: nextWar.turns + 1, casualties: nextWar.casualties + (nextWar.goalScope === "total" ? 220 : 90) };
          applyWarDomesticImpact(grid, frontDelta, nextWar.goalScope);
          pushEvent(nextProfile, newAbsoluteWeek, "scandal", `War turn vs ${nation.name}: front ${frontDelta >= 0 ? "+" : ""}${frontDelta.toFixed(1)}.`);

          const resolution = checkWarResolution(nextWar);
          if (resolution !== "ongoing") {
            const { tag, economyDelta } = negotiateSettlement(nextWar, nextWar.nationId);
            nextWorldMods = { ...worldStatModifiers, economy: worldStatModifiers.economy + economyDelta };
            nextWarLegacyTags = [...nextWarLegacyTags, tag];
            pushEvent(nextProfile, newAbsoluteWeek, "term-ended", `${tag.label}: ${tag.description}`);
            nextTension[nextWar.nationId] = 45;
            nextWar = null;
          }
        } else {
          nextWar = null;
        }
      }
    }

    const newTraits = evaluateNewTraits(nextProfile);
    pushEarnedTraitEvents(nextProfile, newAbsoluteWeek, newTraits);

    set({
      absoluteWeek: newAbsoluteWeek,
      gridVersion: get().gridVersion + 1,
      session,
      cabinet: nextCabinet,
      profile: nextProfile,
      aiNations: nextAiNations,
      tensionByNationId: nextTension,
      activeWar: nextWar,
      worldStatModifiers: nextWorldMods,
      warLegacyTags: nextWarLegacyTags,
    });
  },

  proposeBill: (title, issueId, intensity, ideology, targetRegionId) => {
    const { bills, absoluteWeek, session, profile } = get();
    const activeSession = session ?? sessionForWeek(0);
    if (activeSession.billsProposedThisSession >= SESSION_BILL_CAPACITY) return false;

    const bill: Bill = {
      id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      issueId,
      scope: "national",
      intensity,
      ideology,
      targetRegionId,
      amendments: [],
      sponsoredByPlayer: true,
      weekProposed: absoluteWeek,
      status: "voting",
    };
    const nextProfile = { ...profile, careerStats: { ...profile.careerStats, sponsoredBillsTotal: profile.careerStats.sponsoredBillsTotal + 1 } };
    set({
      bills: [...bills, bill],
      activeBillId: bill.id,
      session: { ...activeSession, billsProposedThisSession: activeSession.billsProposedThisSession + 1 },
      profile: nextProfile,
    });
    return true;
  },

  setActiveBill: (billId) => set({ activeBillId: billId }),

  acceptAmendment: (billId) => {
    const { bills, legislature } = get();
    if (!legislature) return;
    const bill = bills.find((b) => b.id === billId);
    if (!bill || bill.status !== "voting") return;
    const opposing = legislature.factions.filter((f) => !f.isPlayerParty).sort((a, b) => b.seatShare - a.seatShare)[0];
    if (!opposing) return;

    const shiftPct = 0.3;
    const amendment: BillAmendment = {
      id: `amend-${Date.now()}`,
      text: `Amended to accommodate ${opposing.name}'s concerns.`,
      proposedByFactionId: opposing.id,
      ideologyShift: {
        economic: (opposing.ideologyCenter.economic - bill.ideology.economic) * shiftPct,
        social: (opposing.ideologyCenter.social - bill.ideology.social) * shiftPct,
        foreignPolicy: (opposing.ideologyCenter.foreignPolicy - bill.ideology.foreignPolicy) * shiftPct,
      },
      poisonPill: false,
    };
    const updatedBill: Bill = { ...bill, amendments: [...bill.amendments, amendment], intensity: Math.max(10, Math.round(bill.intensity * 0.85)) };
    set({ bills: bills.map((b) => (b.id === billId ? updatedBill : b)) });
  },

  callVote: (billId) => {
    const { bills, legislature, grid, seed, absoluteWeek, campaign, country, profile, currentOffice, player, cabinet } = get();
    if (!legislature || !grid || !country || !player) return;
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;
    const heldOffice = currentOffice ? country.officeLadder.find((o) => o.id === currentOffice.officeId) : undefined;
    const scopeRegionIds =
      campaign?.scopeRegionIds ??
      (heldOffice ? scopeForOffice(country, heldOffice, player.homeRegionId) : regionOptionsForCountry(country).map((r) => r.id));
    const agenda: AgendaItem[] = computeNationalAgenda(grid, scopeRegionIds);
    const cabinetEffects = computeCabinetEffects(cabinet);
    const projections = projectAllVotes(bill, legislature.legislators, legislature.factions, agenda, cabinetEffects.whipBonus);
    const rng = new Rng(`${seed}-vote-${absoluteWeek}-${billId}`);
    const result = resolveVote(bill, legislature.legislators, projections, rng);

    const nextProfile = { ...profile, careerStats: { ...profile.careerStats } };
    let nextPlayer = player;

    if (result.passed) {
      applyBillPassage(bill, grid, cabinetEffects.issueIntensityBoost[bill.issueId] ?? 0);

      const legislatorById = new Map(legislature.legislators.map((l) => [l.id, l]));
      const nonPartyYea = result.records
        .filter((r) => r.support)
        .reduce((sum, r) => {
          const l = legislatorById.get(r.legislatorId);
          if (!l) return sum;
          const faction = legislature.factions.find((f) => f.id === l.factionId);
          return faction && !faction.isPlayerParty ? sum + l.seatWeight : sum;
        }, 0);
      const crossPartyFraction = result.yeaSeats > 0 ? nonPartyYea / result.yeaSeats : 0;
      if (crossPartyFraction >= 0.3) nextProfile.careerStats.bipartisanBillsPassed += 1;
      if (crossPartyFraction >= 0.5) nextProfile.careerStats.crossPartyHeavyBillsPassed += 1;

      pushEvent(nextProfile, absoluteWeek, "bill-passed", `${bill.title} passed ${result.yeaSeats.toFixed(0)}-${result.naySeats.toFixed(0)}.`);
      const newStatus = bill.amendments.length > 0 ? ("compromised" as const) : ("fulfilled" as const);
      nextProfile.promiseLedger = nextProfile.promiseLedger.map((p) => (p.status === "pending" && p.coalitionTag === bill.issueId ? { ...p, status: newStatus } : p));

      const dist = ideologyDistance(player.ideology, bill.ideology);
      nextPlayer = { ...player, ideology: nudgeIdeology(player.ideology, bill.ideology, 0.12) };
      if (dist > 20) nextProfile.authenticity = clamp(nextProfile.authenticity - 1);
    } else {
      bill.status = "failed";
      pushEvent(nextProfile, absoluteWeek, "bill-failed", `${bill.title} failed ${result.yeaSeats.toFixed(0)}-${result.naySeats.toFixed(0)}.`);
    }

    const newTraits = evaluateNewTraits(nextProfile);
    pushEarnedTraitEvents(nextProfile, absoluteWeek, newTraits);

    set({ bills: bills.map((b) => (b.id === billId ? bill : b)), gridVersion: get().gridVersion + 1, profile: nextProfile, player: nextPlayer, activeBillId: null });
  },

  honorDonorAsk: (id) => {
    const { profile, absoluteWeek } = get();
    const ask = profile.donorLedger.find((d) => d.id === id);
    if (!ask || ask.fulfilled !== null) return;
    const nextProfile = { ...profile };
    nextProfile.donorLedger = profile.donorLedger.map((d) => (d.id === id ? { ...d, fulfilled: true } : d));
    nextProfile.corruptionScore = clamp(nextProfile.corruptionScore + 8);
    nextProfile.authenticity = clamp(nextProfile.authenticity - 3);
    nextProfile.donorGoodwill = nextProfile.donorGoodwill + 10;
    nextProfile.relationships = bumpDonorRelationship(profile.relationships, 15, `Honored: "${ask.ask}"`);

    // Donor/Promise tension (Sec 5): this donor ask specifically trades off against economic
    // commitments — honoring it walks back any pending promise on that ground automatically.
    const conflicting = nextProfile.promiseLedger.find((p) => p.status === "pending" && (p.coalitionTag === "economy" || p.coalitionTag === "taxes"));
    if (conflicting) {
      nextProfile.promiseLedger = nextProfile.promiseLedger.map((p) => (p.id === conflicting.id ? { ...p, status: "broken" as const } : p));
      pushEvent(nextProfile, absoluteWeek, "scandal", `Honoring a donor ask meant walking back: "${conflicting.text}"`);
      if (awardTrait(nextProfile, "broken-promise")) pushEvent(nextProfile, absoluteWeek, "trait-earned", `Earned trait: ${getTrait("broken-promise")?.name}.`);
    }

    const newTraits = evaluateNewTraits(nextProfile);
    pushEarnedTraitEvents(nextProfile, absoluteWeek, newTraits);
    set({ profile: nextProfile });
  },

  ignoreDonorAsk: (id) => {
    const { profile } = get();
    const ask = profile.donorLedger.find((d) => d.id === id);
    if (!ask || ask.fulfilled !== null) return;
    const nextProfile = { ...profile };
    nextProfile.donorLedger = profile.donorLedger.map((d) => (d.id === id ? { ...d, fulfilled: false } : d));
    nextProfile.authenticity = clamp(nextProfile.authenticity + 5);
    nextProfile.donorGoodwill = Math.max(-20, nextProfile.donorGoodwill - 10);
    nextProfile.relationships = bumpDonorRelationship(profile.relationships, -15, `Ignored: "${ask.ask}"`);
    set({ profile: nextProfile });
  },

  breakPromise: (id) => {
    const { profile, absoluteWeek, cabinet } = get();
    const promise = profile.promiseLedger.find((p) => p.id === id);
    if (!promise || promise.status !== "pending") return;
    const dampening = 1 - computeCabinetEffects(cabinet).scandalDampening;
    const nextProfile = { ...profile };
    nextProfile.promiseLedger = profile.promiseLedger.map((p) => (p.id === id ? { ...p, status: "broken" as const } : p));
    nextProfile.authenticity = clamp(nextProfile.authenticity - 10 * dampening);
    const awarded = awardTrait(nextProfile, "broken-promise");
    if (awarded) pushEvent(nextProfile, absoluteWeek, "trait-earned", `Earned trait: ${getTrait("broken-promise")?.name}.`);
    pushEvent(nextProfile, absoluteWeek, "scandal", `Walked back a promise: "${promise.text}"`);
    set({ profile: nextProfile });
  },

  endTerm: (choice) => {
    const { currentOffice, officeHistory, country, absoluteWeek, profile, termsServedByOffice } = get();
    if (!currentOffice || !country) return;
    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "term-ended", `Term as ${currentOffice.title} ended.`);
    const history = [...officeHistory, currentOffice];
    const nextTermsServed = { ...termsServedByOffice, [currentOffice.officeId]: (termsServedByOffice[currentOffice.officeId] ?? 0) + 1 };

    const resolvedPromises = nextProfile.promiseLedger.filter((p) => p.status !== "pending");
    const fulfilledLike = resolvedPromises.filter((p) => p.status === "fulfilled" || p.status === "compromised");
    if (resolvedPromises.length >= 2 && fulfilledLike.length / resolvedPromises.length >= 0.8) {
      if (awardTrait(nextProfile, "kept-faith")) pushEvent(nextProfile, absoluteWeek, "trait-earned", `Earned trait: ${getTrait("kept-faith")?.name}.`);
    }
    if (nextProfile.corruptionScore < 10) {
      if (awardTrait(nextProfile, "clean-hands")) pushEvent(nextProfile, absoluteWeek, "trait-earned", `Earned trait: ${getTrait("clean-hands")?.name}.`);
    }

    if (choice === "retire") {
      set({ phase: "career-ended", officeHistory: history, currentOffice: null, profile: nextProfile, termsServedByOffice: nextTermsServed, session: null, cabinet: [] });
      return;
    }

    if (choice === "run-next-tier") {
      const idx = country.officeLadder.findIndex((o) => o.id === currentOffice.officeId);
      const next = country.officeLadder[idx + 1];
      if (next) {
        set({ officeHistory: history, currentOffice: null, phase: "office-select", profile: nextProfile, termsServedByOffice: nextTermsServed, session: null, cabinet: [] });
        return;
      }
    }

    // run-again (re-election) or fallback if no next tier exists — OfficeLadder itself blocks
    // re-announcing an office once termsServedByOffice reaches its termLimit.
    set({ officeHistory: history, currentOffice: null, phase: "office-select", profile: nextProfile, termsServedByOffice: nextTermsServed, session: null, cabinet: [] });
  },

  getCandidatesForSlot: (slotId) => {
    const { country, currentOffice, player, profile, seed } = get();
    if (!country || !currentOffice || !player) return [];
    const slots = portfolioSlotsForTier(currentOffice.tier);
    const slot = slots.find((s) => s.slotId === slotId);
    if (!slot) return [];
    return generateCandidates(slot, country.id, player.backstoryId, profile.relationships, `${seed}-${currentOffice.officeId}`);
  },

  appointToPortfolio: (slotId, candidate) => {
    const { country, currentOffice, cabinet, absoluteWeek, profile } = get();
    if (!country || !currentOffice) return;
    const slots = portfolioSlotsForTier(currentOffice.tier);
    const slot = slots.find((s) => s.slotId === slotId);
    if (!slot) return;

    const appointee: Appointee = {
      id: `appointee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slotId,
      portfolioId: slot.portfolioId as PortfolioId,
      name: candidate.name,
      source: candidate.source,
      loyalty: candidate.loyalty,
      competence: candidate.competence,
      appointedWeek: absoluteWeek,
      lastConsultedWeek: null,
    };

    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "office-assumed", `Appointed ${candidate.name} as ${slot.title}.`);

    if (candidate.source === "co-opted-rival" && candidate.sourceRelationshipId) {
      nextProfile.relationships = nextProfile.relationships.map((r) =>
        r.id === candidate.sourceRelationshipId ? { ...r, score: Math.min(100, r.score + 30), historyLog: [...r.historyLog, `Co-opted into your cabinet as ${slot.title}.`] } : r
      );
    }
    if (candidate.source === "donor" && candidate.sourceRelationshipId) {
      nextProfile.relationships = nextProfile.relationships.map((r) =>
        r.id === candidate.sourceRelationshipId ? { ...r, score: Math.min(100, r.score + 15), historyLog: [...r.historyLog, `Their pick got the ${slot.title} appointment.`] } : r
      );
      nextProfile.corruptionScore = clamp(nextProfile.corruptionScore + 5);
      // Repays the Donor Ledger directly, per Sec 5.
      const pendingAsk = nextProfile.donorLedger.find((d) => d.fulfilled === null);
      if (pendingAsk) nextProfile.donorLedger = nextProfile.donorLedger.map((d) => (d.id === pendingAsk.id ? { ...d, fulfilled: true } : d));
    }
    if (slot.portfolioId === "central-bank" && candidate.source === "loyalist") {
      // "Forcing loyalist control costs Institutional Strength" — Institutional Strength itself
      // is a Phase 4 stat; the corruption cost lands now so the choice isn't free in the meantime.
      nextProfile.corruptionScore = clamp(nextProfile.corruptionScore + 6);
    }

    set({ cabinet: [...cabinet.filter((a) => a.slotId !== slotId), appointee], profile: nextProfile });
  },

  dismissAppointee: (id) => {
    const { cabinet, profile, absoluteWeek } = get();
    const appointee = cabinet.find((a) => a.id === id);
    if (!appointee) return;
    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "term-ended", `${appointee.name} was dismissed or resigned.`);
    set({ cabinet: cabinet.filter((a) => a.id !== id), profile: nextProfile });
  },

  consultAppointee: (id) => {
    const { cabinet, absoluteWeek } = get();
    set({ cabinet: cabinet.map((a) => (a.id === id ? { ...a, lastConsultedWeek: absoluteWeek, loyalty: Math.min(100, a.loyalty + 5) } : a)) });
  },

  getPlayerNationalStats: () => {
    const { country, grid, bills, cabinet, worldStatModifiers } = get();
    if (!country || !grid) return defaultWorldStatModifiers();
    const billsPassedByIssue: Record<string, number> = {};
    for (const b of bills) if (b.status === "implemented") billsPassedByIssue[b.issueId] = (billsPassedByIssue[b.issueId] ?? 0) + 1;
    const base = computePlayerNationalStats(country, grid, billsPassedByIssue, cabinet);
    return {
      economy: clamp(base.economy + worldStatModifiers.economy),
      military: clamp(base.military + worldStatModifiers.military),
      diplomacy: clamp(base.diplomacy + worldStatModifiers.diplomacy),
      stability: clamp(base.stability + worldStatModifiers.stability),
      innovation: clamp(base.innovation + worldStatModifiers.innovation),
    };
  },

  applyDiplomaticAction: (nationId, actionType) => {
    const { currentOffice, aiNations, tensionByNationId, tradeAgreementsByNationId, worldStatModifiers, profile, absoluteWeek } = get();
    if (!currentOffice || currentOffice.tier < 4) return; // observer tier can view, not act
    const def = DIPLOMATIC_ACTIONS.find((d) => d.type === actionType);
    const nation = aiNations.find((n) => n.id === nationId);
    if (!def || !nation) return;
    const currentTension = tensionByNationId[nationId] ?? 15;
    const stage = stageForTension(currentTension);
    const stageOrder = ["stable", "strained", "confrontational", "crisis", "brink"];
    if (stageOrder.indexOf(stage) < stageOrder.indexOf(def.minStage) || stageOrder.indexOf(stage) > stageOrder.indexOf(def.maxStage)) return;

    const nextTension = { ...tensionByNationId, [nationId]: clamp(currentTension + def.tensionDelta, 0, 100) };
    const nextTradeAgreements = { ...tradeAgreementsByNationId };
    if (actionType === "propose-trade" || actionType === "form-alliance") nextTradeAgreements[nationId] = true;
    if (actionType === "impose-sanctions") nextTradeAgreements[nationId] = false;

    const nextWorldMods = {
      ...worldStatModifiers,
      economy: worldStatModifiers.economy + def.playerEconomyDelta,
      diplomacy: worldStatModifiers.diplomacy + def.playerDiplomacyDelta,
    };
    const nextNations = aiNations.map((n) => (n.id === nationId ? { ...n, stats: { ...n.stats, economy: clamp(n.stats.economy + def.nationEconomyDelta) } } : n));

    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "candidacy-announced", `${def.label} with ${nation.name}.`);

    set({ tensionByNationId: nextTension, tradeAgreementsByNationId: nextTradeAgreements, worldStatModifiers: nextWorldMods, aiNations: nextNations, profile: nextProfile });
  },

  declareWar: (nationId, goalScope) => {
    const { currentOffice, aiNations, tensionByNationId, activeWar, absoluteWeek, profile } = get();
    if (!currentOffice || currentOffice.tier < 4 || activeWar) return;
    const nation = aiNations.find((n) => n.id === nationId);
    if (!nation) return;
    const stage = stageForTension(tensionByNationId[nationId] ?? 0);
    if (stage !== "brink") return;
    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "scandal", `Declared ${goalScope} war on ${nation.name}.`);
    set({ activeWar: initWar(nationId, absoluteWeek, goalScope), profile: nextProfile });
  },

  fundWar: () => {
    const { activeWar, legislature, session, cabinet, absoluteWeek, profile } = get();
    if (!activeWar || !legislature || activeWar.fundingActive) return false;
    const activeSession = session ?? sessionForWeek(0);
    if (activeSession.billsProposedThisSession >= SESSION_BILL_CAPACITY) return false;

    const playerParty = legislature.factions.find((f) => f.isPlayerParty);
    const whipBonus = computeCabinetEffects(cabinet).whipBonus;
    const successChance = 0.5 + ((playerParty?.seatShare ?? 0.3) - 0.5) * 0.6 + whipBonus;
    const rng = new Rng(`${get().seed}-warfunding-${absoluteWeek}`);
    const passed = rng.chance(Math.max(0.05, Math.min(0.95, successChance)));

    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, passed ? "bill-passed" : "bill-failed", passed ? "War funding bill passed." : "War funding bill failed.");
    set({
      activeWar: passed ? { ...activeWar, fundingActive: true } : activeWar,
      session: { ...activeSession, billsProposedThisSession: activeSession.billsProposedThisSession + 1 },
      profile: nextProfile,
    });
    return passed;
  },

  sueForPeace: () => {
    const { activeWar, absoluteWeek, profile, worldStatModifiers, warLegacyTags, tensionByNationId } = get();
    if (!activeWar) return;
    const { tag, economyDelta } = negotiateSettlement(activeWar, activeWar.nationId);
    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "term-ended", `Sued for peace. ${tag.label}: ${tag.description}`);
    set({
      activeWar: null,
      worldStatModifiers: { ...worldStatModifiers, economy: worldStatModifiers.economy + economyDelta },
      warLegacyTags: [...warLegacyTags, tag],
      tensionByNationId: { ...tensionByNationId, [activeWar.nationId]: 45 },
      profile: nextProfile,
    });
  },

  resetGame: () =>
    set({
      phase: "character-creation",
      servingTab: "profile",
      seed: `career-${Date.now()}`,
      player: null,
      country: null,
      grid: null,
      gridVersion: 0,
      absoluteWeek: 0,
      currentOffice: null,
      officeHistory: [],
      termsServedByOffice: {},
      session: null,
      campaign: null,
      lastElectionResult: null,
      legislature: null,
      bills: [],
      activeBillId: null,
      cabinet: [],
      profile: freshProfile(),
      pollTier: "low",
      aiNations: [],
      tensionByNationId: {},
      tradeAgreementsByNationId: {},
      worldStatModifiers: defaultWorldStatModifiers(),
      activeWar: null,
      warLegacyTags: [],
    }),
}));

export function actionDefsList() {
  return ACTION_DEFS;
}
