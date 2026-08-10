// Cabinet/Advisor Appointments — Sec 5 (appointment mechanic) + Sec 16 (portfolio table).
// Mechanical portfolio categories are shared across office tiers; PORTFOLIO_SLOTS_BY_TIER
// (src/data/portfolios.ts) maps each tier's real-world title onto one of these categories.
export type PortfolioId =
  | "chief-of-staff"
  | "attorney-general"
  | "defense-interior"
  | "treasury"
  | "foreign-minister"
  | "health-education"
  | "trade-commerce"
  | "press-comms"
  | "central-bank";

export interface PortfolioSlot {
  slotId: string; // unique within a tier's slot list — lets two slots share a mechanical portfolioId
  portfolioId: PortfolioId;
  title: string; // tier-flavored real display title, e.g. "State Police/National Guard Commander"
}

export type AppointeeSource = "loyalist" | "co-opted-rival" | "donor" | "specialist" | "generic";

export interface AppointeeCandidate {
  name: string;
  source: AppointeeSource;
  loyalty: number; // 0-100, starting value
  competence: number; // 0-100
  flavor: string;
  /** id of the RelationshipEntry this candidate is drawn from, if any (rival/donor/party-leader). */
  sourceRelationshipId?: string;
}

export interface Appointee {
  id: string;
  slotId: string;
  portfolioId: PortfolioId;
  name: string;
  source: AppointeeSource;
  loyalty: number; // 0-100, evolves with treatment
  competence: number; // 0-100, fixed at appointment
  appointedWeek: number;
  lastConsultedWeek: number | null;
}

export interface CabinetEffects {
  whipBonus: number; // added to legislator vote-support probability when the player sponsors a bill
  issueIntensityBoost: Record<string, number>; // issueId -> additive multiplier on bill grid effect
  scandalDampening: number; // 0-1, shrinks authenticity/corruption penalties from events & broken promises
}
