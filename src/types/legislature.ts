// Legislature types — Sec 9, AI foundation Sec 14.
import type { IdeologyPosition } from "./grid";
import type { PartyDiscipline } from "./country";

export type AmbitionArchetype = "climber" | "ideologue" | "loyalist" | "pragmatist" | "survivor";

export interface Faction {
  id: string;
  name: string;
  seatShare: number; // 0-1 fraction of seats in the relevant chamber
  discipline: PartyDiscipline;
  ideologyCenter: IdeologyPosition;
  isPlayerParty: boolean;
}

export interface Legislator {
  id: string;
  name: string;
  factionId: string;
  ideology: IdeologyPosition;
  archetype: AmbitionArchetype;
  relationshipToPlayer: number; // -100..100 favor ledger
  seatWeight: number; // number of seats this legislator instance represents (compressed body)
}

export type BillScope = "local" | "regional" | "national";

export interface BillAmendment {
  id: string;
  text: string;
  proposedByFactionId: string;
  ideologyShift: Partial<IdeologyPosition>; // how it moves the bill's effective ideology
  poisonPill: boolean;
}

export interface Bill {
  id: string;
  title: string;
  issueId: string;
  scope: BillScope;
  intensity: number; // 0-100 funding/intensity level, scales grid effect magnitude
  ideology: IdeologyPosition; // the bill's own position, compared against legislators
  targetRegionId?: string; // undefined = nationwide within scope
  targetSegmentFilter?: Record<string, string>;
  amendments: BillAmendment[];
  sponsoredByPlayer: boolean;
  weekProposed: number;
  status: "drafting" | "voting" | "passed" | "failed" | "implemented";
}

export interface VoteProjection {
  legislatorId: string;
  probability: number; // 0-1, legible to player pre-vote
}

export interface VoteRecord {
  legislatorId: string;
  billId: string;
  support: boolean;
}

export interface VoteResult {
  billId: string;
  yeaSeats: number;
  naySeats: number;
  totalSeats: number;
  passed: boolean;
  records: VoteRecord[];
}

export interface AgendaItem {
  issueId: string;
  label: string;
  salience: number; // 0-1, population-weighted avg
  satisfaction: number; // 0-100, higher = happier
  pressure: "low" | "rising" | "high";
}

export const ISSUE_CATALOG: { id: string; label: string }[] = [
  { id: "economy", label: "Economy & Jobs" },
  { id: "healthcare", label: "Healthcare" },
  { id: "education", label: "Education" },
  { id: "public-safety", label: "Public Safety" },
  { id: "housing", label: "Housing" },
  { id: "environment", label: "Environment" },
  { id: "immigration", label: "Immigration" },
  { id: "taxes", label: "Taxes & Spending" },
];
