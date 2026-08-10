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
  ideology: IdeologyPosition;
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
}
