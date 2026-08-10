// Diplomacy actions — Sec 10. Real stat tradeoffs, gated by the current Tension Track stage.
import type { EscalationStage, DiplomaticActionType } from "../types/world";
import { stageForTension } from "./tensionSystem";

const STAGE_ORDER: EscalationStage[] = ["stable", "strained", "confrontational", "crisis", "brink"];
function stageIndex(s: EscalationStage): number {
  return STAGE_ORDER.indexOf(s);
}

export interface DiplomaticActionDef {
  type: DiplomaticActionType;
  label: string;
  description: string;
  minStage: EscalationStage;
  maxStage: EscalationStage;
  tensionDelta: number;
  playerEconomyDelta: number;
  nationEconomyDelta: number;
  playerDiplomacyDelta: number;
}

export const DIPLOMATIC_ACTIONS: DiplomaticActionDef[] = [
  { type: "protest", label: "Diplomatic protest", description: "Cheap, reversible de-escalation.", minStage: "stable", maxStage: "crisis", tensionDelta: -3, playerEconomyDelta: 0, nationEconomyDelta: 0, playerDiplomacyDelta: 0.5 },
  { type: "recall-ambassador", label: "Recall ambassador", description: "A visible signal of displeasure.", minStage: "strained", maxStage: "crisis", tensionDelta: 8, playerEconomyDelta: 0, nationEconomyDelta: 0, playerDiplomacyDelta: -1 },
  { type: "propose-trade", label: "Propose trade agreement", description: "\"Economic peace\" — suppresses future tension while active.", minStage: "stable", maxStage: "confrontational", tensionDelta: -10, playerEconomyDelta: 3, nationEconomyDelta: 3, playerDiplomacyDelta: 1 },
  { type: "form-alliance", label: "Form alliance", description: "Locks in de-escalation and boosts your standing — only while things are still calm.", minStage: "stable", maxStage: "strained", tensionDelta: -15, playerEconomyDelta: 0, nationEconomyDelta: 0, playerDiplomacyDelta: 5 },
  { type: "impose-sanctions", label: "Impose sanctions", description: "Hurts their economy — and yours, some.", minStage: "confrontational", maxStage: "brink", tensionDelta: 12, playerEconomyDelta: -3, nationEconomyDelta: -8, playerDiplomacyDelta: -1 },
  { type: "summit", label: "Call a summit", description: "Last-chance off-ramp. Costly to arrange, but a real reversal.", minStage: "crisis", maxStage: "brink", tensionDelta: -25, playerEconomyDelta: 0, nationEconomyDelta: 0, playerDiplomacyDelta: 2 },
];

export function availableActionsForStage(tension: number): DiplomaticActionDef[] {
  const stage = stageForTension(tension);
  const idx = stageIndex(stage);
  return DIPLOMATIC_ACTIONS.filter((a) => stageIndex(a.minStage) <= idx && idx <= stageIndex(a.maxStage));
}
