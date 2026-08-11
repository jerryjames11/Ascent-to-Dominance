// Non-electoral campaign-analogs — Sec 19 build implication. Court-intrigue (absolute monarchies)
// and party-patronage (one-party states) replace the electoral Campaign with favor management
// against the people who actually decide advancement, so those countries don't feel hollow.
export type PatronageMode = "court-intrigue" | "party-patronage";

export interface PowerBroker {
  id: string;
  name: string;
  title: string; // e.g. "Senior Princes", "Organization Department"
  influence: number; // 0-1 weight in the final selection decision (sums to 1 across brokers)
  playerFavor: number; // 0-100
  rivalFavor: number; // 0-100
}

export type PatronageActionType = "cultivate" | "demonstrate-performance" | "undermine-rival" | "loyalty-display";

export interface PatronageActionDef {
  type: PatronageActionType;
  label: string;
  description: string;
  apCost: number;
  needsBroker: boolean;
}

export interface PatronageState {
  officeId: string;
  officeTitle: string;
  countryId: string;
  mode: PatronageMode;
  totalWeeks: number;
  weeksRemaining: number;
  apRemaining: number;
  brokers: PowerBroker[];
  rivalName: string;
  /** Party-patronage: provincial performance metrics largely replace persuasion (Sec 19). Court
   *  mode weighs it lightly — favor is nearly everything. */
  performanceScore: number; // 0-100
  rivalPerformanceScore: number; // 0-100
  actionLog: string[];
}
