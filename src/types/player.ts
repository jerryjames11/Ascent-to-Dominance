// Character / Profile types — Sec 4-5. Builds on locked grid.ts IdeologyPosition.
import type { IdeologyPosition } from "./grid";

export type BackstoryId =
  | "lawyer"
  | "military"
  | "business"
  | "organizer"
  | "academic"
  | "dynasty"
  | "outsider";

export interface StatModifiers {
  billDraftingBonus?: number;
  judiciaryRelationshipBonus?: number;
  militaryLoyaltySeed?: number;
  hawkishCredibility?: number;
  donorNetworkStrength?: number;
  authenticityPenaltyWorkingClass?: number;
  groundGameBonus?: number;
  donorNetworkWeak?: number;
  eliteApprovalPenalty?: number;
  policyEffectivenessBonus?: number;
  baseCharismaDelta?: number;
  inheritedRelationships?: number;
  nameRecognition?: number;
  authenticityPenalty?: number;
  scandalSensitivity?: number;
  startingPersuasion?: number;
  partyRelationshipsDelta?: number;
  legislativeSkillDelta?: number;
}

export interface Backstory {
  id: BackstoryId;
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  ideologyDefault: IdeologyPosition;
  statModifiers: StatModifiers;
  starterTraitId: string;
}

export type Gender = "male" | "female" | "nonbinary";

export interface PlayerCharacter {
  name: string;
  gender: Gender;
  age: number;
  countryId: string;
  homeRegionId: string;
  backstoryId: BackstoryId;
  ideology: IdeologyPosition; // current — drifts with positions taken and bills sponsored
  startingIdeology: IdeologyPosition; // fixed at creation, for the Ideology Drift Tracker (Sec 5)
  charisma: number; // 0-100
  persuasionSkill: number; // 0-100
  fundraisingSkill: number; // 0-100
  legislativeSkill: number; // 0-100
  groundGameSkill: number; // 0-100
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  category:
    | "campaign"
    | "legislature"
    | "war"
    | "authoritarian"
    | "reputation"
    | "backstory"
    | "legacy";
  negative?: boolean;
}

export type PromiseStatus = "pending" | "fulfilled" | "broken" | "compromised";

export interface PromiseLedgerEntry {
  id: string;
  text: string;
  coalitionTag: string;
  status: PromiseStatus;
  madeAtWeek: number;
}

export interface DonorAsk {
  id: string;
  donorName: string;
  ask: string;
  fulfilled: boolean | null; // null = still pending
  weekMade: number;
}

/** Real, trackable counters behind Sec 17 trait thresholds. Some catalog traits (e.g. Party
 *  Loyalist/Maverick) are defined around a personal voting record the player doesn't cast in
 *  Phase 1 (they sponsor/whip, not vote as one of many seats) — those are approximated via
 *  cross-party support on bills the player sponsors instead. */
export interface CareerStats {
  debateWins: number;
  debateLosses: number;
  bigFundraisingHauls: number;
  endorsementsSecured: number;
  oppoResearchUsedThisCampaign: number;
  negativeCampaignWins: number;
  gaffeEvents: number;
  scandalEvents: number;
  highTurnoutWins: number;
  sponsoredBillsTotal: number;
  bipartisanBillsPassed: number; // passed with >=30% of yea seats from outside the player's party
  crossPartyHeavyBillsPassed: number; // passed with >=50% of yea seats from outside the player's party
  highCorruptionStreakWeeks: number; // consecutive serving-weeks with corruption > 50 and no scandal
}

export type RelationshipRole =
  | "party-leader"
  | "rival"
  | "donor"
  | "foreign-leader"
  | "appointee"
  | "constituent-group";

export interface RelationshipEntry {
  id: string;
  name: string;
  role: RelationshipRole;
  score: number; // -100 to 100
  historyLog: string[];
}

export type CareerEventType =
  | "candidacy-announced"
  | "election-won"
  | "election-lost"
  | "office-assumed"
  | "bill-passed"
  | "bill-failed"
  | "scandal"
  | "trait-earned"
  | "term-ended";

export interface CareerEvent {
  absoluteWeek: number;
  type: CareerEventType;
  description: string;
}

export interface ProfileState {
  earnedTraitIds: string[];
  promiseLedger: PromiseLedgerEntry[];
  donorLedger: DonorAsk[];
  relationships: RelationshipEntry[];
  careerTimeline: CareerEvent[];
  corruptionScore: number; // 0-100, influence/scandal risk
  authenticity: number; // 0-100
  careerStats: CareerStats;
  /** Accumulates from honoring/ignoring Donor Ledger asks; bankrolls (or drags down) the next campaign's starting money. */
  donorGoodwill: number;
}
