// Tension Track — Sec 18. Tracked per bilateral pair, 0-100, decaying toward an ideology-driven
// baseline absent new events, keeping the World layer multipolar.
import type { IdeologyPosition } from "../types/grid";
import type { AiNation, EscalationStage } from "../types/world";
import { ideologyDistance } from "./driftSystem";

export function stageForTension(v: number): EscalationStage {
  if (v <= 20) return "stable";
  if (v <= 40) return "strained";
  if (v <= 60) return "confrontational";
  if (v <= 80) return "crisis";
  return "brink";
}

export const STAGE_LABEL: Record<EscalationStage, string> = {
  stable: "Stable",
  strained: "Strained",
  confrontational: "Confrontational",
  crisis: "Crisis",
  brink: "Brink",
};

export const STAGE_UNLOCKS: Record<EscalationStage, string> = {
  stable: "Normal diplomacy and trade.",
  strained: "Protests, recalled ambassadors — cheap, reversible.",
  confrontational: "Sanctions, trade restriction, military posturing.",
  crisis: "Proxy conflict eligible, alliance-activation pressure, random incidents.",
  brink: "Open war available. Last-chance summit off-ramp.",
}

function ideologyBaselineTension(playerIdeology: IdeologyPosition, nationIdeology: IdeologyPosition): number {
  const maxDist = Math.sqrt(3) * 200;
  const dist = ideologyDistance(playerIdeology, nationIdeology);
  return (dist / maxDist) * 35; // ideological distance alone can float baseline tension up to ~35
}

/** Weekly tension tick: decays toward the ideology-driven baseline, folds in the AI nation's own
 *  agency nudge (Sec 14 leader formula) and trade suppression ("economic peace" effect). */
export function tickTension(current: number, playerIdeology: IdeologyPosition, nation: AiNation, tradeAgreementActive: boolean, aiNudge: number): number {
  const baseline = ideologyBaselineTension(playerIdeology, nation.ideology);
  let next = current + (baseline - current) * 0.05;
  if (tradeAgreementActive) next -= 1.5;
  next += aiNudge;
  return Math.max(0, Math.min(100, next));
}
