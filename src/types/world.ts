// World Layer — Sec 10 (national power stats, AI nations, dominance paths), Sec 18 (Tension
// Track), Sec 11 (War). Progressive unlock: local/regional = none, national legislature =
// observer, executive = full control (Sec 10).
import type { IdeologyPosition } from "./grid";

export interface NationalPowerStats {
  economy: number; // 0-100
  military: number; // 0-100
  diplomacy: number; // 0-100, soft power
  stability: number; // 0-100
  innovation: number; // 0-100
}

export type LeaderArchetype = "builder" | "warhawk" | "isolationist" | "ideologue-exporter" | "survivalist";

export interface AiNation {
  id: string; // matches a CountrySchema id from SAMPLE_COUNTRIES
  name: string;
  leaderName: string;
  archetype: LeaderArchetype;
  ideology: IdeologyPosition;
  stats: NationalPowerStats;
  domesticApproval: number; // 0-100, the AI leader's own domestic pressure
}

export type EscalationStage = "stable" | "strained" | "confrontational" | "crisis" | "brink";

export interface TensionState {
  nationId: string;
  value: number; // 0-100
}

export type DiplomaticActionType =
  | "protest"
  | "recall-ambassador"
  | "propose-trade"
  | "form-alliance"
  | "impose-sanctions"
  | "summit"
  | "declare-war"
  | "sue-for-peace";

export interface DiplomaticActionDef {
  type: DiplomaticActionType;
  label: string;
  description: string;
  minStage: EscalationStage;
  maxStage?: EscalationStage;
  tensionDelta: number; // signed; negative = de-escalates
}

export type WarGoalScope = "limited" | "total";

export interface WarState {
  nationId: string;
  startedWeek: number;
  goalScope: WarGoalScope;
  front: number; // 0-100, 50 = stalemate, 100 = decisive player control, 0 = decisive loss
  casualties: number;
  fundingActive: boolean;
  turns: number;
}

export interface WarLegacyTag {
  nationId: string;
  label: "Won the War" | "Quagmire" | "Peacemaker" | "Lost the War";
  description: string;
}

export const DOMINANCE_PATHS = ["economic-hegemon", "military-superpower", "diplomatic-leader", "ideological-exporter"] as const;
export type DominancePath = (typeof DOMINANCE_PATHS)[number];
