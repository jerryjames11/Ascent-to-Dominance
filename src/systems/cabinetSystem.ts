// Cabinet/Advisor Appointments — Sec 5. Candidate generation draws primarily from the
// Relationship Web (co-opted rivals, donors, party leadership) plus generated qualified
// strangers as a fallback, per spec.
import type { PortfolioId, PortfolioSlot, AppointeeCandidate, Appointee, CabinetEffects } from "../types/cabinet";
import type { RelationshipEntry, BackstoryId, ProfileState } from "../types/player";
import { Rng } from "./rng";
import { generateName } from "./nameGen";

const BACKSTORY_PORTFOLIO_MATCH: Record<BackstoryId, PortfolioId[]> = {
  lawyer: ["attorney-general"],
  military: ["defense-interior"],
  business: ["treasury", "trade-commerce", "central-bank"],
  organizer: ["chief-of-staff"],
  academic: ["health-education"],
  dynasty: ["foreign-minister"],
  outsider: ["press-comms"],
};

export function generateCandidates(
  slot: PortfolioSlot,
  countryId: string,
  backstoryId: BackstoryId,
  relationships: RelationshipEntry[],
  seed: string
): AppointeeCandidate[] {
  const rng = new Rng(`${seed}-appoint-${slot.slotId}`);
  const candidates: AppointeeCandidate[] = [];

  // Loyalist ally — always available.
  candidates.push({
    name: generateName(countryId, rng),
    source: "loyalist",
    loyalty: rng.int(70, 90),
    competence: rng.int(40, 70),
    flavor: "A trusted ally. High loyalty, unremarkable expertise.",
  });

  // Backstory-matched specialist.
  const isMatch = BACKSTORY_PORTFOLIO_MATCH[backstoryId]?.includes(slot.portfolioId);
  candidates.push({
    name: generateName(countryId, rng),
    source: "specialist",
    loyalty: rng.int(40, 60),
    competence: isMatch ? rng.int(75, 95) : rng.int(55, 75),
    flavor: isMatch ? "A specialist whose background lines up with this portfolio — real competence bonus." : "A qualified professional, no particular edge here.",
  });

  // Co-opted rival — only if a rival relationship exists.
  const rival = relationships.find((r) => r.role === "rival");
  if (rival) {
    candidates.push({
      name: rival.name,
      source: "co-opted-rival",
      loyalty: rng.int(20, 50),
      competence: rng.int(50, 85),
      flavor: "A former rival, brought inside the tent. Risky — but neutralizes a threat and can peel their support.",
      sourceRelationshipId: rival.id,
    });
  }

  // Donor appointee — only if there's donor standing to draw on.
  const donor = relationships.find((r) => r.role === "donor");
  if (donor) {
    candidates.push({
      name: `${donor.name} pick`,
      source: "donor",
      loyalty: rng.int(50, 70),
      competence: rng.int(30, 60),
      flavor: "Repays the Donor Ledger. Raises corruption/influence exposure.",
      sourceRelationshipId: donor.id,
    });
  }

  return candidates;
}

export function computeCabinetEffects(cabinet: Appointee[]): CabinetEffects {
  const effects: CabinetEffects = { whipBonus: 0, issueIntensityBoost: {}, scandalDampening: 0 };
  for (const a of cabinet) {
    const strength = (a.competence / 100) * (a.loyalty / 100); // 0-1
    if (a.portfolioId === "chief-of-staff") {
      effects.whipBonus += strength * 0.25;
    } else if (a.portfolioId === "treasury") {
      effects.issueIntensityBoost.economy = (effects.issueIntensityBoost.economy ?? 0) + strength * 0.3;
      effects.issueIntensityBoost.taxes = (effects.issueIntensityBoost.taxes ?? 0) + strength * 0.3;
    } else if (a.portfolioId === "health-education") {
      effects.issueIntensityBoost.healthcare = (effects.issueIntensityBoost.healthcare ?? 0) + strength * 0.3;
      effects.issueIntensityBoost.education = (effects.issueIntensityBoost.education ?? 0) + strength * 0.3;
    } else if (a.portfolioId === "press-comms") {
      effects.scandalDampening = Math.min(0.4, effects.scandalDampening + strength * 0.4);
    }
  }
  return effects;
}

/** Weekly loyalty drift + low-loyalty leak risk, called from advanceServingWeek. Returns a leak
 *  description if one occurred, so the store can log it and apply consequences. */
export function tickCabinetWeek(cabinet: Appointee[], currentWeek: number, rng: Rng): { leaks: { appointee: Appointee; description: string }[] } {
  const leaks: { appointee: Appointee; description: string }[] = [];
  for (const a of cabinet) {
    const recentlyConsulted = a.lastConsultedWeek !== null && currentWeek - a.lastConsultedWeek <= 8;
    const baseline = a.source === "loyalist" ? 80 : a.source === "specialist" ? 55 : 45;
    const drift = recentlyConsulted ? (baseline - a.loyalty) * 0.08 : (baseline - a.loyalty) * 0.03 - 0.4;
    a.loyalty = Math.max(0, Math.min(100, a.loyalty + drift));

    if (a.loyalty < 30 && rng.chance(0.04)) {
      leaks.push({ appointee: a, description: `${a.name} (${a.portfolioId}) leaked internal deliberations to the press.` });
    }
  }
  return { leaks };
}

export function findProfileDonorRelationship(profile: ProfileState): RelationshipEntry | undefined {
  return profile.relationships.find((r) => r.role === "donor");
}
