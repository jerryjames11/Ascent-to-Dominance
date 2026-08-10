// Authoritarian Drift / Emergency Powers — Sec 12. Every action spends Institutional Strength;
// the ratchet effect makes each successive action cheaper (less resistance) while raising
// Opposition/Resistance (backlash risk). Off-ramps rebuild Institutional Strength.
import type { AuthoritarianActionDef, OffRampActionDef, TriggerContext } from "../types/authoritarian";

export const AUTHORITARIAN_ACTIONS: AuthoritarianActionDef[] = [
  { id: "emergency-powers", label: "Declare Emergency Powers", description: "Wartime decree authority — pass your next bill without a vote.", trigger: "wartime", baseInstitutionalStrengthCost: 12 },
  { id: "press-censorship", label: "Impose Press Censorship", description: "Controls the narrative short-term. Tanks soft power and Legacy.", trigger: "wartime", baseInstitutionalStrengthCost: 10 },
  { id: "postpone-election", label: "Postpone the Election", description: "Buys 26 weeks in office. A defining authoritarian moment.", trigger: "wartime", baseInstitutionalStrengthCost: 20 },
  { id: "court-packing", label: "Pack the Courts", description: "Adds friendly seats to your legislative majority.", trigger: "losing-legislative-control", baseInstitutionalStrengthCost: 15 },
  { id: "gerrymander", label: "Gerrymander Districts", description: "Boosts your polling heading into the next election.", trigger: "losing-legislative-control", baseInstitutionalStrengthCost: 12 },
  { id: "disqualify-opponent", label: "Disqualify an Opponent", description: "Removes your strongest rival from contention.", trigger: "losing-legislative-control", baseInstitutionalStrengthCost: 18 },
  { id: "remove-term-limit", label: "Constitutional Amendment: Remove Term Limit", description: "This office's term limit no longer applies to you.", trigger: "approaching-term-limit", baseInstitutionalStrengthCost: 25 },
  { id: "prosecute-rival", label: "Prosecute a Rival", description: "Neutralizes a threat. Opposition won't forget it.", trigger: "scandal-threat", baseInstitutionalStrengthCost: 14 },
];

export const OFF_RAMPS: OffRampActionDef[] = [
  { id: "restore-press-freedom", label: "Restore Press Freedom", description: "Lift censorship. Slow rebuild, real reversal.", institutionalStrengthGain: 8 },
  { id: "hold-postponed-election", label: "Hold the Postponed Election", description: "Make good on the vote you delayed.", institutionalStrengthGain: 15 },
  { id: "comply-with-court-ruling", label: "Comply with a Court Ruling", description: "Respect the check. Cools Opposition/Resistance.", institutionalStrengthGain: 6 },
];

/** Ratchet effect: each authoritarian action taken this career makes the next one cheaper —
 *  easier to keep going, harder to stop — floored at 55% of base cost. */
export function ratchetedCost(baseCost: number, authoritarianActionsTaken: number): number {
  const factor = Math.max(0.55, Math.pow(0.9, authoritarianActionsTaken));
  return Math.round(baseCost * factor);
}

export interface TriggerState {
  atWar: boolean;
  lowApproval: boolean; // economic-crisis proxy
  losingLegislativeControl: boolean; // player party seat share < 0.4
  approachingTermLimit: boolean; // one term away from the limit
  scandalThreat: boolean; // corruption > 50
}

export function isTriggered(trigger: TriggerContext, state: TriggerState): boolean {
  switch (trigger) {
    case "wartime":
      return state.atWar;
    case "economic-crisis":
      return state.lowApproval;
    case "losing-legislative-control":
      return state.losingLegislativeControl;
    case "approaching-term-limit":
      return state.approachingTermLimit;
    case "scandal-threat":
      return state.scandalThreat;
  }
}

export function availableActions(state: TriggerState): AuthoritarianActionDef[] {
  return AUTHORITARIAN_ACTIONS.filter((a) => isTriggered(a.trigger, state));
}
