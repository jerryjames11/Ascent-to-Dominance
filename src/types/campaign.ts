// Campaign types — Sec 7.
import type { IdeologyPosition, PollResult } from "./grid";

export interface CampaignResources {
  money: number;
  staffQuality: number; // 0-100, better staff = better action outputs
  politicalCapital: number;
  stamina: number; // 0-100, fatigue; low stamina weakens action outputs
}

export type CampaignStage = "exploratory" | "primary" | "general" | "final-stretch";

export type WeeklyActionType =
  | "advertise"
  | "rally"
  | "fundraise"
  | "position"
  | "debate"
  | "oppo-research"
  | "endorsement"
  | "gotv";

export interface WeeklyActionLog {
  week: number; // weeks remaining at time of action
  actionType: WeeklyActionType;
  targetRegionId?: string;
  targetSegmentFilter?: Record<string, string>;
  outcomeSummary: string;
}

export type OpponentArchetype =
  | "attack-dog"
  | "ground-game-grinder"
  | "big-money-air-war"
  | "grassroots-insurgent";

export interface Opponent {
  id: string;
  name: string;
  archetype: OpponentArchetype;
  ideology: IdeologyPosition;
  resources: CampaignResources;
  pollingSupport: number; // 0-100, this opponent's simulated national/scope support
}

export type CampaignEventType = "scandal" | "economic-shock" | "endorsement-flip" | "gaffe";

export interface CampaignEvent {
  id: string;
  type: CampaignEventType;
  week: number;
  description: string;
  resolved: boolean;
  choiceOutcome?: "deny" | "apologize" | "counterattack";
}

export interface CampaignState {
  officeId: string;
  officeTitle: string;
  countryId: string;
  scopeRegionIds: string[]; // regions this election is decided over
  totalWeeks: number;
  weeksRemaining: number;
  apRemaining: number;
  stage: CampaignStage;
  resources: CampaignResources;
  opponents: Opponent[];
  actionLog: WeeklyActionLog[];
  polls: PollResult[];
  pendingEvent: CampaignEvent | null;
  eventHistory: CampaignEvent[];
  isReelection: boolean;
}
