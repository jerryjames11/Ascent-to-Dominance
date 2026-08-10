// Central game state machine. Phase 1 loop: character creation -> office select -> campaign ->
// election result -> serving (Profile/Country/Legislature tabs) -> term end -> repeat.
import { create } from "zustand";
import type { CountrySchema, OfficeRung } from "../types/country";
import type { IdeologyPosition } from "../types/grid";
import type { PlayerCharacter, ProfileState, CareerEvent, RelationshipEntry } from "../types/player";
import type { CampaignState, WeeklyActionType } from "../types/campaign";
import type { Bill, AgendaItem } from "../types/legislature";
import { ISSUE_CATALOG } from "../types/legislature";
import { SAMPLE_COUNTRIES } from "../data/sample-countries";
import { getBackstory } from "../data/backstories";
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
import { generateLegislature, type GeneratedLegislature } from "../systems/legislatorGen";
import { computeNationalAgenda, projectAllVotes, resolveVote, applyBillPassage } from "../systems/legislatureSystem";
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
  campaign: CampaignState | null;
  lastElectionResult: ElectionResult | null;
  legislature: GeneratedLegislature | null;
  bills: Bill[];
  activeBillId: string | null;
  profile: ProfileState;
  pollTier: PollsterTier;

  // actions
  createCharacter: (input: CharacterCreationInput) => void;
  announceCandidacy: (officeId: string) => void;
  runAction: (actionType: WeeklyActionType, target: ActionTarget) => string;
  advanceWeek: () => void;
  answerEvent: (choice: "deny" | "apologize" | "counterattack") => void;
  setPollTier: (tier: PollsterTier) => void;
  continueFromElectionResult: () => void;
  setServingTab: (tab: ServingTab) => void;
  proposeBill: (title: string, issueId: string, intensity: number, ideology: IdeologyPosition, targetRegionId?: string) => void;
  setActiveBill: (billId: string | null) => void;
  callVote: (billId: string) => void;
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

function pushEvent(profile: ProfileState, absoluteWeek: number, type: CareerEvent["type"], description: string) {
  profile.careerTimeline.push({ absoluteWeek, type, description });
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
  campaign: null,
  lastElectionResult: null,
  legislature: null,
  bills: [],
  activeBillId: null,
  profile: {
    earnedTraitIds: [],
    promiseLedger: [],
    donorLedger: [],
    relationships: [],
    careerTimeline: [],
    corruptionScore: 0,
    authenticity: 60,
  },
  pollTier: "low",

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
      charisma: 50 + (backstory.statModifiers.baseCharismaDelta ?? 0) + (backstory.statModifiers.startingPersuasion ?? 0) * 0.3,
      persuasionSkill: 50 + (backstory.statModifiers.startingPersuasion ?? 0),
      fundraisingSkill: 50 + (backstory.statModifiers.donorNetworkStrength ?? 0) + (backstory.statModifiers.donorNetworkWeak ?? 0),
      legislativeSkill: 50 + (backstory.statModifiers.billDraftingBonus ?? 0) + (backstory.statModifiers.legislativeSkillDelta ?? 0),
      groundGameSkill: 50 + (backstory.statModifiers.groundGameBonus ?? 0),
    };
    const seed = `${input.countryId}-${input.name}-${Date.now()}`;
    const startingPersuasion = 30 + (backstory.statModifiers.startingPersuasion ?? 0) * 0.4 + (backstory.statModifiers.nameRecognition ?? 0) * 0.3;
    const grid = new LiveGrid(buildGrid(country, seed, player.ideology, startingPersuasion));

    const profile: ProfileState = {
      earnedTraitIds: [backstory.starterTraitId],
      promiseLedger: [],
      donorLedger: [],
      relationships: [],
      careerTimeline: [],
      corruptionScore: 0,
      authenticity: 60 + (backstory.statModifiers.authenticityPenalty ?? 0) + (backstory.statModifiers.authenticityPenaltyWorkingClass ?? 0) * 0.3,
    };
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
      campaign: null,
      lastElectionResult: null,
      legislature: null,
      bills: [],
      profile,
      servingTab: "profile",
    });
  },

  announceCandidacy: (officeId) => {
    const { country, player, grid, seed, absoluteWeek, profile } = get();
    if (!country || !player || !grid) return;
    const office = country.officeLadder.find((o) => o.id === officeId);
    if (!office) return;
    const scopeRegionIds = scopeForOffice(country, office, player.homeRegionId);
    const isReelection = get().currentOffice?.officeId === officeId;
    const opponents = generateOpponents(country, office, `${seed}-w${absoluteWeek}`, country.electoralSystem === "run-off" ? 3 : 2);
    const campaign = initCampaignState(office, country, scopeRegionIds, opponents, player, isReelection);

    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "candidacy-announced", `Announced candidacy for ${office.title}.`);
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

    const profile = { ...get().profile };
    profile.authenticity = Math.max(0, Math.min(100, profile.authenticity + outcome.authenticityDelta));
    profile.corruptionScore = Math.max(0, Math.min(100, profile.corruptionScore + outcome.corruptionDelta));
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

    set({ campaign: { ...campaign }, gridVersion: get().gridVersion + 1, profile });
    return outcome.summary;
  },

  advanceWeek: () => {
    const { campaign, grid, seed, absoluteWeek, country } = get();
    if (!campaign || !grid || !country) return;
    const rng = new Rng(`${seed}-tick-${absoluteWeek}`);
    advanceWeekSystem(campaign, grid, rng);
    const newAbsoluteWeek = absoluteWeek + 1;

    const event = maybeGenerateEvent(campaign, campaign.weeksRemaining, rng);

    const pollRng = new Rng(`${seed}-pollpick-${newAbsoluteWeek}`);
    const polls = commissionPoll(grid, campaign.scopeRegionIds, campaign.weeksRemaining, get().pollTier, seed);
    campaign.polls = polls;
    void pollRng;

    if (campaign.weeksRemaining <= 0 && !event) {
      const result = resolveElection(grid, country, campaign.scopeRegionIds, campaign.opponents);
      const profile = { ...get().profile };
      const office = country.officeLadder.find((o) => o.id === campaign.officeId)!;
      if (result.winnerId === "player") {
        pushEvent(profile, newAbsoluteWeek, "election-won", `Won the race for ${office.title}.`);
        const legislature = generateLegislature(country, get().player!.ideology, `${seed}-${office.id}-${newAbsoluteWeek}`, office.tier);
        profile.relationships = [...profile.relationships, ...seedRelationships(legislature)];
        pushEvent(profile, newAbsoluteWeek, "office-assumed", `Sworn in as ${office.title}.`);
        set({
          absoluteWeek: newAbsoluteWeek,
          lastElectionResult: result,
          phase: "election-result",
          profile,
          currentOffice: { officeId: office.id, title: office.title, tier: office.tier, startedWeek: newAbsoluteWeek },
          legislature,
          bills: [],
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
    const { campaign, grid, seed, absoluteWeek } = get();
    if (!campaign || !grid) return;
    resolveEventSystem(campaign, grid, choice);
    const profile = { ...get().profile };
    profile.authenticity = Math.max(0, Math.min(100, profile.authenticity));
    void seed;
    void absoluteWeek;
    set({ campaign: { ...campaign }, gridVersion: get().gridVersion + 1, profile });
  },

  setPollTier: (tier) => set({ pollTier: tier }),

  continueFromElectionResult: () => {
    const { currentOffice } = get();
    set({ phase: currentOffice ? "serving" : "office-select", campaign: null, servingTab: "profile" });
  },

  setServingTab: (tab) => set({ servingTab: tab }),

  proposeBill: (title, issueId, intensity, ideology, targetRegionId) => {
    const { bills, absoluteWeek } = get();
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
    set({ bills: [...bills, bill], activeBillId: bill.id });
  },

  setActiveBill: (billId) => set({ activeBillId: billId }),

  callVote: (billId) => {
    const { bills, legislature, grid, seed, absoluteWeek, campaign, country, profile, currentOffice, player } = get();
    if (!legislature || !grid || !country || !player) return;
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;
    const heldOffice = currentOffice ? country.officeLadder.find((o) => o.id === currentOffice.officeId) : undefined;
    const scopeRegionIds =
      campaign?.scopeRegionIds ??
      (heldOffice ? scopeForOffice(country, heldOffice, player.homeRegionId) : regionOptionsForCountry(country).map((r) => r.id));
    const agenda: AgendaItem[] = computeNationalAgenda(grid, scopeRegionIds);
    const projections = projectAllVotes(bill, legislature.legislators, legislature.factions, agenda);
    const rng = new Rng(`${seed}-vote-${absoluteWeek}-${billId}`);
    const result = resolveVote(bill, legislature.legislators, projections, rng);

    const nextProfile = { ...profile };
    if (result.passed) {
      applyBillPassage(bill, grid);
      pushEvent(nextProfile, absoluteWeek, "bill-passed", `${bill.title} passed ${result.yeaSeats.toFixed(0)}-${result.naySeats.toFixed(0)}.`);
      nextProfile.promiseLedger = nextProfile.promiseLedger.map((p) =>
        p.status === "pending" && p.coalitionTag === bill.issueId ? { ...p, status: "fulfilled" as const } : p
      );
    } else {
      bill.status = "failed";
      pushEvent(nextProfile, absoluteWeek, "bill-failed", `${bill.title} failed ${result.yeaSeats.toFixed(0)}-${result.naySeats.toFixed(0)}.`);
    }

    set({ bills: bills.map((b) => (b.id === billId ? bill : b)), gridVersion: get().gridVersion + 1, profile: nextProfile, activeBillId: null });
  },

  endTerm: (choice) => {
    const { currentOffice, officeHistory, country, absoluteWeek, profile } = get();
    if (!currentOffice || !country) return;
    const nextProfile = { ...profile };
    pushEvent(nextProfile, absoluteWeek, "term-ended", `Term as ${currentOffice.title} ended.`);
    const history = [...officeHistory, currentOffice];

    if (choice === "retire") {
      set({ phase: "career-ended", officeHistory: history, currentOffice: null, profile: nextProfile });
      return;
    }

    if (choice === "run-next-tier") {
      const idx = country.officeLadder.findIndex((o) => o.id === currentOffice.officeId);
      const next = country.officeLadder[idx + 1];
      if (next) {
        set({ officeHistory: history, currentOffice: null, phase: "office-select", profile: nextProfile });
        return;
      }
    }

    // run-again (re-election) or fallback if no next tier exists
    set({ officeHistory: history, currentOffice: null, phase: "office-select", profile: nextProfile });
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
      campaign: null,
      lastElectionResult: null,
      legislature: null,
      bills: [],
      activeBillId: null,
      profile: {
        earnedTraitIds: [],
        promiseLedger: [],
        donorLedger: [],
        relationships: [],
        careerTimeline: [],
        corruptionScore: 0,
        authenticity: 60,
      },
      pollTier: "low",
    }),
}));

export function actionDefsList() {
  return ACTION_DEFS;
}
