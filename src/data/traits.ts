// Trait/Perk catalog — Sec 17. Phase 1 subset: Campaign, Legislature, backstory starters.
// War/Authoritarian/Coup/Legacy traits are catalogued for future phases but not earnable yet.
import type { Trait } from "../types/player";

export const TRAITS: Trait[] = [
  // Backstory starters
  { id: "starter-litigator", name: "Litigator", description: "Years of casework sharpened your drafting instincts.", category: "backstory" },
  { id: "starter-battle-tested", name: "Battle-Tested", description: "Service record seeds Military Loyalty.", category: "backstory" },
  { id: "starter-self-made", name: "Self-Made", description: "You built it yourself, and donors know it.", category: "backstory" },
  { id: "starter-organizer-roots", name: "Organizer Roots", description: "You know how to get people to the polls.", category: "backstory" },
  { id: "starter-credentialed", name: "Credentialed", description: "The policy expertise is real. The charisma is a work in progress.", category: "backstory" },
  { id: "starter-inherited-name", name: "Inherited Name", description: "The family name precedes you everywhere.", category: "backstory" },
  { id: "starter-untested", name: "Untested", description: "Famous, but untested in a legislature or a caucus room.", category: "backstory", negative: true },

  // Campaign
  { id: "debate-killer", name: "Debate Killer", description: "3+ decisive debate wins. Debate persuasion bonus.", category: "campaign" },
  { id: "natural-fundraiser", name: "Natural Fundraiser", description: "3 cycles exceeding fundraising targets. Reduced donor diminishing returns.", category: "campaign" },
  { id: "ground-game-master", name: "Ground Game Master", description: "High-turnout wins. Cheaper turnout actions.", category: "campaign" },
  { id: "gaffe-prone", name: "Gaffe-Prone", description: "3+ self-inflicted negative events. Higher backfire risk.", category: "campaign", negative: true },
  { id: "media-darling", name: "Media Darling", description: "High free-press persuasion. Ad coverage-amplification bonus.", category: "campaign" },
  { id: "attack-dog", name: "Attack Dog", description: "Won via negative campaigning. Stronger opposition research, capped Authenticity.", category: "campaign" },

  // Legislature
  { id: "coalition-builder", name: "Coalition Builder", description: "5+ bipartisan bills. Cheaper cross-faction whipping.", category: "legislature" },
  { id: "party-loyalist", name: "Party Loyalist", description: "90%+ party-line voting. Cheaper own-party whipping, harder crossover.", category: "legislature" },
  { id: "maverick", name: "Maverick", description: "30%+ cross-party votes. Independent-voter persuasion bonus, reduced party funding.", category: "legislature" },
  { id: "legislative-workhorse", name: "Legislative Workhorse", description: "10+ sponsored bills. Reduced unintended-effect risk.", category: "legislature" },
  { id: "broken-promise", name: "Broken Promise", description: "A Promise Ledger entry broke. Scoped Authenticity penalty, opposition ammo.", category: "legislature", negative: true },
  { id: "kept-faith", name: "Kept Faith", description: "80%+ term fulfillment. Authenticity bonus.", category: "legislature" },

  // Personal reputation
  { id: "scandal-scarred", name: "Scandal-Scarred", description: "Survived 2+ major scandals. Reduced future severity, lower Authenticity ceiling.", category: "reputation", negative: true },
  { id: "clean-hands", name: "Clean Hands", description: "Near-zero corruption across a term. Authenticity + soft-power bonus.", category: "reputation" },
  { id: "untouchable", name: "Untouchable", description: "Sustained high corruption with no exposure. Stronger donor ties, rising catastrophic-exposure risk.", category: "reputation", negative: true },

  // Authoritarian-drift / Democratic-integrity — Sec 12/13
  { id: "survived-coup-attempt", name: "Survived a Coup Attempt", description: "A defining event. Rally-round-the-flag approval spike.", category: "authoritarian" },
  { id: "restored-the-republic", name: "Restored the Republic", description: "Reversed significant authoritarian drift. Major Legacy-positive weight.", category: "authoritarian" },
  { id: "iron-fist", name: "Iron Fist", description: "Institutional Strength stayed critically low through term end. Control bonus, permanent pariah penalty.", category: "authoritarian", negative: true },
  { id: "peaceful-transition", name: "Peaceful Transition", description: "Retired or termed out with institutions intact. Core \"Statesman\" input.", category: "authoritarian" },
];

export function getTrait(id: string): Trait | undefined {
  return TRAITS.find((t) => t.id === id);
}
