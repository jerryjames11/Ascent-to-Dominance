// Legislature mechanics — Sec 9. AI vote utility formula — Sec 14.
import type { IdeologyPosition, BillGridEffect } from "../types/grid";
import type { Bill, Legislator, Faction, VoteProjection, VoteResult, VoteRecord, AgendaItem, BillScope } from "../types/legislature";
import { ISSUE_CATALOG } from "../types/legislature";
import type { LiveGrid } from "./gridSystem";
import { weightedAvg } from "./gridSystem";
import { Rng } from "./rng";

function ideologyDistance(a: IdeologyPosition, b: IdeologyPosition): number {
  return Math.sqrt((a.economic - b.economic) ** 2 + (a.social - b.social) ** 2 + (a.foreignPolicy - b.foreignPolicy) ** 2);
}

function effectiveBillIdeology(bill: Bill): IdeologyPosition {
  let ideology = { ...bill.ideology };
  for (const amendment of bill.amendments) {
    ideology = {
      economic: ideology.economic + (amendment.ideologyShift.economic ?? 0),
      social: ideology.social + (amendment.ideologyShift.social ?? 0),
      foreignPolicy: ideology.foreignPolicy + (amendment.ideologyShift.foreignPolicy ?? 0),
    };
  }
  return ideology;
}

/** Sec 14 vote_score: ideological distance, faction discipline pressure, relationship, constituent
 *  salience, archetype modifier — surfaced to the player as a legible probability. `whipBonus`
 *  (0-1) is the Chief of Staff cabinet effect (Sec 16), added flat when the player sponsored the bill. */
export function projectVote(bill: Bill, legislator: Legislator, faction: Faction, agenda: AgendaItem[], whipBonus = 0): VoteProjection {
  const billIdeology = effectiveBillIdeology(bill);
  const maxDist = Math.sqrt(3) * 200;
  const dist = ideologyDistance(legislator.ideology, billIdeology);
  const ideologyScore = 1 - dist / maxDist; // 0..1, higher = more aligned

  const factionAligned = ideologyDistance(faction.ideologyCenter, billIdeology) < dist;
  const disciplinePressure = faction.discipline === "rigid" ? 0.35 : faction.discipline === "moderate" ? 0.2 : 0.08;
  const disciplineScore = factionAligned ? disciplinePressure : -disciplinePressure * 0.6;

  const relationshipScore = (legislator.relationshipToPlayer / 100) * (bill.sponsoredByPlayer ? 0.2 : 0.05);

  const agendaItem = agenda.find((a) => a.issueId === bill.issueId);
  const constituentSalience = agendaItem ? agendaItem.salience * (agendaItem.satisfaction < 50 ? 0.15 : 0.05) : 0.05;

  const archetypeModifier: Record<Legislator["archetype"], number> = {
    climber: bill.sponsoredByPlayer ? 0.1 : 0,
    ideologue: ideologyScore > 0.6 ? 0.1 : -0.1,
    loyalist: disciplineScore,
    pragmatist: 0.05,
    survivor: constituentSalience,
  };

  const raw =
    0.5 + (ideologyScore - 0.5) * 0.7 + disciplineScore + relationshipScore + constituentSalience + archetypeModifier[legislator.archetype] + (bill.sponsoredByPlayer ? whipBonus : 0);
  return { legislatorId: legislator.id, probability: Math.max(0.02, Math.min(0.98, raw)) };
}

export function projectAllVotes(bill: Bill, legislators: Legislator[], factions: Faction[], agenda: AgendaItem[], whipBonus = 0): VoteProjection[] {
  const factionById = new Map(factions.map((f) => [f.id, f]));
  return legislators.map((l) => projectVote(bill, l, factionById.get(l.factionId)!, agenda, whipBonus));
}

export function resolveVote(bill: Bill, legislators: Legislator[], projections: VoteProjection[], rng: Rng): VoteResult {
  const projById = new Map(projections.map((p) => [p.legislatorId, p.probability]));
  const records: VoteRecord[] = legislators.map((l) => ({
    legislatorId: l.id,
    billId: bill.id,
    support: rng.chance(projById.get(l.id) ?? 0.5),
  }));

  let yeaSeats = 0;
  let naySeats = 0;
  for (const r of records) {
    const l = legislators.find((x) => x.id === r.legislatorId)!;
    if (r.support) yeaSeats += l.seatWeight;
    else naySeats += l.seatWeight;
  }
  const totalSeats = yeaSeats + naySeats;
  return { billId: bill.id, yeaSeats, naySeats, totalSeats, passed: yeaSeats > naySeats, records };
}

/** National Agenda panel — Sec 8: aggregated salience/satisfaction per issue. */
export function computeNationalAgenda(grid: LiveGrid, scopeRegionIds: string[]): AgendaItem[] {
  const cells = grid.getCellsInScope(scopeRegionIds);
  return ISSUE_CATALOG.map((issue) => {
    const salience = weightedAvg(cells, (c) => {
      const entry = c.issueSalience.find((s) => s.issueId === issue.id);
      return entry ? entry.weight : 0;
    });
    const satisfaction = weightedAvg(cells, (c) => c.persuasion);
    const pressureScore = salience * (1 - satisfaction / 100);
    const pressure: AgendaItem["pressure"] = pressureScore > 0.35 ? "high" : pressureScore > 0.18 ? "rising" : "low";
    return { issueId: issue.id, label: issue.label, salience, satisfaction, pressure };
  }).sort((a, b) => b.salience * (1 - b.satisfaction / 100) - a.salience * (1 - a.satisfaction / 100));
}

let billCounter = 0;
export function createBill(
  title: string,
  issueId: string,
  scope: BillScope,
  intensity: number,
  ideology: IdeologyPosition,
  weekProposed: number,
  sponsoredByPlayer: boolean,
  targetRegionId?: string
): Bill {
  billCounter += 1;
  return {
    id: `bill-${billCounter}-${Date.now()}`,
    title,
    issueId,
    scope,
    intensity,
    ideology,
    targetRegionId,
    amendments: [],
    sponsoredByPlayer,
    weekProposed,
    status: "drafting",
  };
}

/** Applies a passed bill's effect to the grid — Sec 9 "effects touch the demographic grid unevenly".
 *  `issueIntensityBoost` is the Treasury/Health-Education cabinet effect (Sec 16) for this bill's issue. */
export function applyBillPassage(bill: Bill, grid: LiveGrid, issueIntensityBoost = 0): void {
  // Passed bills read as delivering for their targeted audience; direction/targeting already encode
  // "who benefits" — magnitude alone scales how strongly they feel it.
  const magnitude = (bill.intensity / 100) * 6 * (1 + issueIntensityBoost);
  const effect: BillGridEffect = {
    billId: bill.id,
    targetCells: bill.targetRegionId
      ? { regionId: bill.targetRegionId }
      : bill.targetSegmentFilter
      ? { segmentFilter: bill.targetSegmentFilter }
      : {},
    persuasionDelta: magnitude,
    salienceDelta: [{ issueId: bill.issueId, delta: -0.08 * (bill.intensity / 100) }],
  };
  grid.applyBillEffect(effect);
  bill.status = "implemented";
}
