// Authoritarian Drift / Emergency Powers — Sec 12. Coup Mechanics — Sec 13.
export type AuthoritarianActionId =
  | "emergency-powers"
  | "press-censorship"
  | "postpone-election"
  | "court-packing"
  | "gerrymander"
  | "disqualify-opponent"
  | "remove-term-limit"
  | "prosecute-rival";

export type OffRampActionId = "restore-press-freedom" | "hold-postponed-election" | "comply-with-court-ruling";

export type TriggerContext =
  | "wartime"
  | "economic-crisis"
  | "losing-legislative-control"
  | "approaching-term-limit"
  | "scandal-threat";

export interface AuthoritarianActionDef {
  id: AuthoritarianActionId;
  label: string;
  description: string;
  trigger: TriggerContext;
  baseInstitutionalStrengthCost: number;
}

export interface OffRampActionDef {
  id: OffRampActionId;
  label: string;
  description: string;
  institutionalStrengthGain: number;
}

export type CoupChoice = "rally-loyal-forces" | "negotiate" | "flee";

export interface PendingCoupEvent {
  week: number;
  loyalFraction: number; // 0-1, share of the military still loyal
}

export type CoupOutcome = "fails" | "exile" | "worse";

export type CareerEndingReason = "retired" | "term-limit-out" | "exiled" | "imprisoned";
