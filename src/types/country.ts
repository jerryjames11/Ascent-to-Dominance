// Country Data Table — Sec 19

export type SystemType =
  | "presidential"
  | "parliamentary"
  | "semi-presidential"
  | "absolute-monarchy"
  | "one-party-state";

export type Structure = "federal" | "unitary";

export type ElectoralSystem =
  | "FPTP"
  | "PR"
  | "mixed-member"
  | "run-off"
  | "N/A";

export type ExecutiveSelectionMethod =
  | "direct-election"
  | "legislature-selected"
  | "hereditary"
  | "party-congress";

export type PartyDiscipline = "rigid" | "moderate" | "fractured";

export interface OfficeRung {
  id: string;
  title: string; // e.g. "Mayor", "State Legislature", "US House/Senate", "President"
  tier: 1 | 2 | 3 | 4; // maps to Sec 16 portfolio tiers
  termLength: number; // years
  termLimit: number | null; // null = no limit
  eligibilityRules: EligibilityRules;
  grantsWorldAccess: "none" | "observer" | "full"; // Sec 10 progressive unlock
  grantsAppointmentPower: boolean;
}

export interface EligibilityRules {
  minAge: number;
  citizenshipRequired: boolean;
  residencyYears: number;
}

export interface LegislatureStructure {
  cameral: "unicameral" | "bicameral";
  chambers: {
    name: string;
    seatCount: number;
    selectionMethod: "elected" | "appointed" | "party-selected";
  }[];
}

export interface CountrySchema {
  id: string; // ISO code, e.g. "US"
  name: string;
  systemType: SystemType;
  structure: Structure;
  electoralSystem: ElectoralSystem;
  officeLadder: OfficeRung[];
  executiveSelectionMethod: ExecutiveSelectionMethod;
  legislatureStructure: LegislatureStructure;

  // Sec 12/13 baselines
  baselineInstitutionalStrength: number; // 0-100
  baselineCoupRiskCeiling: "near-zero" | "low" | "moderate" | "high" | "structural";
  partyDiscipline: PartyDiscipline;

  // Sec 8: country-flavored axes beyond the universal segment set
  demographicAxes: string[]; // e.g. ["ethnicity", "religion"]

  // Sec 19: which progression mode this country uses
  progressionMode: "electoral-persuasion" | "court-intrigue" | "party-patronage";
}
