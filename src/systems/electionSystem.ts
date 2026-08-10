// Election resolution — Sec 8 ("Elections resolve directly from final grid state"), Sec 6 electoral systems.
import type { GridCell } from "../types/grid";
import type { CountrySchema, ElectoralSystem } from "../types/country";
import type { Opponent } from "../types/campaign";
import type { LiveGrid } from "./gridSystem";

export interface CandidateResult {
  id: string; // "player" or opponent id
  name: string;
  totalVotes: number;
  voteShare: number; // 0-1, of scope total
  regionUnitsWon: number; // for FPTP electoral-college-style aggregation; 0 if not applicable
}

export interface ElectionResult {
  winnerId: string;
  candidates: CandidateResult[];
  runoffOccurred: boolean;
  scopeRegionIds: string[];
}

function effectiveTurnout(cell: GridCell): number {
  const mult = 0.5 + cell.turnoutEnthusiasm / 100; // 0.5x .. 1.5x
  return Math.max(0, Math.min(0.97, cell.baselineTurnoutPropensity * mult));
}

/** Splits each cell's non-player vote share across opponents, proportional to their polling support. */
function opponentShareWeights(opponents: Opponent[]): number[] {
  const total = opponents.reduce((s, o) => s + Math.max(0.5, o.pollingSupport), 0);
  return opponents.map((o) => Math.max(0.5, o.pollingSupport) / total);
}

function tallyRegion(
  grid: LiveGrid,
  regionId: string,
  opponents: Opponent[],
  shareWeights: number[]
): { player: number; byOpponent: number[]; turnout: number } {
  const cells = grid.getCellsByRegion(regionId);
  let player = 0;
  const byOpponent = opponents.map(() => 0);
  let turnout = 0;
  for (const cell of cells) {
    const t = effectiveTurnout(cell);
    const votesCast = cell.populationWeight * t;
    turnout += votesCast;
    const playerShare = cell.persuasion / 100;
    const playerVotes = votesCast * playerShare;
    player += playerVotes;
    const remaining = votesCast - playerVotes;
    opponents.forEach((_, i) => {
      byOpponent[i] += remaining * shareWeights[i];
    });
  }
  return { player, byOpponent, turnout };
}

function buildCandidates(
  playerVotes: number,
  opponentVotes: number[],
  opponents: Opponent[],
  playerUnits: number,
  opponentUnits: number[],
  total: number
): CandidateResult[] {
  const candidates: CandidateResult[] = [
    { id: "player", name: "You", totalVotes: playerVotes, voteShare: total ? playerVotes / total : 0, regionUnitsWon: playerUnits },
  ];
  opponents.forEach((o, i) => {
    candidates.push({
      id: o.id,
      name: o.name,
      totalVotes: opponentVotes[i],
      voteShare: total ? opponentVotes[i] / total : 0,
      regionUnitsWon: opponentUnits[i],
    });
  });
  return candidates.sort((a, b) => b.totalVotes - a.totalVotes);
}

export function resolveElection(
  grid: LiveGrid,
  country: CountrySchema,
  scopeRegionIds: string[],
  opponents: Opponent[]
): ElectionResult {
  const shareWeights = opponentShareWeights(opponents);
  const system: ElectoralSystem = country.electoralSystem;

  let playerTotal = 0;
  const opponentTotals = opponents.map(() => 0);
  let playerUnits = 0;
  const opponentUnits = opponents.map(() => 0);
  let grandTotal = 0;

  for (const regionId of scopeRegionIds) {
    const { player, byOpponent, turnout } = tallyRegion(grid, regionId, opponents, shareWeights);
    grandTotal += turnout;
    playerTotal += player;
    byOpponent.forEach((v, i) => (opponentTotals[i] += v));

    // Determine this region's "unit" winner (used for FPTP electoral-college-style aggregation).
    let unitWinner: "player" | number = "player";
    let best = player;
    byOpponent.forEach((v, i) => {
      if (v > best) {
        best = v;
        unitWinner = i;
      }
    });
    if (unitWinner === "player") playerUnits += 1;
    else opponentUnits[unitWinner] += 1;
  }

  let runoffOccurred = false;

  if (scopeRegionIds.length > 1 && system === "FPTP") {
    // Electoral-college-style: most region units won, not raw popular vote.
    const candidates = buildCandidates(playerTotal, opponentTotals, opponents, playerUnits, opponentUnits, grandTotal);
    const winner = candidates.reduce((a, b) => (a.regionUnitsWon >= b.regionUnitsWon ? a : b));
    return { winnerId: winner.id, candidates, runoffOccurred, scopeRegionIds };
  }

  if (system === "run-off") {
    const candidates = buildCandidates(playerTotal, opponentTotals, opponents, playerUnits, opponentUnits, grandTotal);
    const leader = candidates[0];
    if (leader.voteShare < 0.5 && candidates.length > 2) {
      // Second round: eliminated candidates' votes redistribute to the two finalists,
      // weighted toward whichever finalist is closer ideologically (approximated via original share proportions).
      runoffOccurred = true;
      const [a, b] = candidates;
      const eliminated = candidates.slice(2);
      const eliminatedVotes = eliminated.reduce((s, c) => s + c.totalVotes, 0);
      // split eliminated votes proportional to the two finalists' existing relative strength
      const aWeight = a.totalVotes / (a.totalVotes + b.totalVotes || 1);
      const aFinal = a.totalVotes + eliminatedVotes * aWeight;
      const bFinal = b.totalVotes + eliminatedVotes * (1 - aWeight);
      const winner = aFinal >= bFinal ? a : b;
      const runoffTotal = aFinal + bFinal;
      const finalCandidates = candidates.map((c) => {
        if (c.id === a.id) return { ...c, totalVotes: aFinal, voteShare: aFinal / runoffTotal };
        if (c.id === b.id) return { ...c, totalVotes: bFinal, voteShare: bFinal / runoffTotal };
        return { ...c, voteShare: 0 };
      });
      return { winnerId: winner.id, candidates: finalCandidates.sort((x, y) => y.totalVotes - x.totalVotes), runoffOccurred, scopeRegionIds };
    }
    return { winnerId: leader.id, candidates, runoffOccurred, scopeRegionIds };
  }

  // PR / mixed-member / N-A / single-region FPTP: national (or scope) popular-vote plurality.
  const candidates = buildCandidates(playerTotal, opponentTotals, opponents, playerUnits, opponentUnits, grandTotal);
  return { winnerId: candidates[0].id, candidates, runoffOccurred, scopeRegionIds };
}
