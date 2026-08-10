// Portfolio slots by office tier — Sec 16. Tier 3 (national legislature) doesn't get a full
// cabinet in the doc, just a single Chief of Staff/Legislative Director slot, so it's granted
// regardless of the country's officeLadder grantsAppointmentPower flag on that rung.
import type { PortfolioId, PortfolioSlot } from "../types/cabinet";

export const PORTFOLIO_LABELS: Record<PortfolioId, string> = {
  "chief-of-staff": "Chief of Staff",
  "attorney-general": "Attorney General / Justice",
  "defense-interior": "Defense / Interior",
  treasury: "Treasury / Finance",
  "foreign-minister": "Foreign Minister",
  "health-education": "Health / Education",
  "trade-commerce": "Trade / Commerce",
  "press-comms": "Press / Comms",
  "central-bank": "Central Bank Governor",
};

export const PORTFOLIO_EFFECT_DESCRIPTIONS: Record<PortfolioId, string> = {
  "chief-of-staff": "Legislative liaison — cheaper vote-whipping on bills you sponsor.",
  "attorney-general": "Institutional Strength interactions (arrives Phase 4).",
  "defense-interior": "Military Loyalty, war-turn effectiveness, coup-risk management (arrives Phase 4).",
  treasury: "Economic bill effectiveness, crisis/war-funding resilience.",
  "foreign-minister": "World-tab diplomacy effectiveness.",
  "health-education": "Boosts healthcare/education bill effectiveness on the demographic grid.",
  "trade-commerce": "Economic Competition track in the World tab.",
  "press-comms": "Scandal-damage mitigation.",
  "central-bank": "Economic stability; resists loyalist capture without cost.",
};

const TIER1_SLOTS: PortfolioSlot[] = [
  { slotId: "t1-cos", portfolioId: "chief-of-staff", title: "Chief of Staff" },
  { slotId: "t1-safety", portfolioId: "defense-interior", title: "Police / Public Safety Commissioner" },
  { slotId: "t1-treasurer", portfolioId: "treasury", title: "Treasurer / Budget Director" },
  { slotId: "t1-comms", portfolioId: "press-comms", title: "Communications Director" },
];

const TIER2_SLOTS: PortfolioSlot[] = [
  { slotId: "t2-cos", portfolioId: "chief-of-staff", title: "Chief of Staff" },
  { slotId: "t2-ag", portfolioId: "attorney-general", title: "Attorney General (State)" },
  { slotId: "t2-police", portfolioId: "defense-interior", title: "State Police / National Guard Commander" },
  { slotId: "t2-treasury", portfolioId: "treasury", title: "Treasury / Finance Secretary" },
  { slotId: "t2-health", portfolioId: "health-education", title: "Health & Human Services Secretary" },
  { slotId: "t2-education", portfolioId: "health-education", title: "Education Secretary" },
  { slotId: "t2-press", portfolioId: "press-comms", title: "Press Secretary" },
];

const TIER3_SLOTS: PortfolioSlot[] = [{ slotId: "t3-cos", portfolioId: "chief-of-staff", title: "Chief of Staff / Legislative Director" }];

const TIER4_SLOTS: PortfolioSlot[] = [
  { slotId: "t4-cos", portfolioId: "chief-of-staff", title: "Chief of Staff" },
  { slotId: "t4-ag", portfolioId: "attorney-general", title: "Attorney General / Minister of Justice" },
  { slotId: "t4-defense", portfolioId: "defense-interior", title: "Defense Minister" },
  { slotId: "t4-interior", portfolioId: "defense-interior", title: "Interior / Homeland Security Minister" },
  { slotId: "t4-treasury", portfolioId: "treasury", title: "Treasury / Finance Minister" },
  { slotId: "t4-foreign", portfolioId: "foreign-minister", title: "Foreign Minister" },
  { slotId: "t4-health", portfolioId: "health-education", title: "Health Minister" },
  { slotId: "t4-education", portfolioId: "health-education", title: "Education Minister" },
  { slotId: "t4-trade", portfolioId: "trade-commerce", title: "Trade / Commerce Minister" },
  { slotId: "t4-press", portfolioId: "press-comms", title: "Press Secretary / Comms Director" },
  { slotId: "t4-centralbank", portfolioId: "central-bank", title: "Central Bank Governor" },
];

export function portfolioSlotsForTier(tier: 1 | 2 | 3 | 4): PortfolioSlot[] {
  if (tier === 1) return TIER1_SLOTS;
  if (tier === 2) return TIER2_SLOTS;
  if (tier === 3) return TIER3_SLOTS;
  return TIER4_SLOTS;
}
