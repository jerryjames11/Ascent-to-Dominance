// Backstory catalog — Sec 4.
import type { Backstory } from "../types/player";

export const BACKSTORIES: Backstory[] = [
  {
    id: "lawyer",
    name: "Lawyer / Legal",
    description:
      "You spent years in courtrooms and statehouse hearing rooms. You know how law actually gets written.",
    strengths: ["Bill-drafting bonus", "Judiciary relationships"],
    weaknesses: [],
    ideologyDefault: { economic: 5, social: -5, foreignPolicy: 0 },
    statModifiers: { billDraftingBonus: 15, judiciaryRelationshipBonus: 20 },
    starterTraitId: "starter-litigator",
  },
  {
    id: "military",
    name: "Military / Veteran",
    description: "You served. That record opens doors — and narrows others.",
    strengths: ["Military Loyalty bonus", "Hawkish-demographic credibility"],
    weaknesses: ["Foreign-policy ideological pull (hawkish)"],
    ideologyDefault: { economic: 10, social: 10, foreignPolicy: 45 },
    statModifiers: { militaryLoyaltySeed: 25, hawkishCredibility: 20 },
    starterTraitId: "starter-battle-tested",
  },
  {
    id: "business",
    name: "Business / Entrepreneur",
    description: "You built something. Donors trust that. Working people aren't always sure.",
    strengths: ["Strong donor network", "Economic credibility"],
    weaknesses: ["Authenticity penalty with working-class cells"],
    ideologyDefault: { economic: 40, social: 0, foreignPolicy: 5 },
    statModifiers: { donorNetworkStrength: 25, authenticityPenaltyWorkingClass: -15 },
    starterTraitId: "starter-self-made",
  },
  {
    id: "organizer",
    name: "Community Organizer",
    description: "You built a ground game before you had a campaign. Money was always the hard part.",
    strengths: ["Ground-game / turnout bonus"],
    weaknesses: ["Weak donor network", "Elite-approval penalty"],
    ideologyDefault: { economic: -30, social: -20, foreignPolicy: -10 },
    statModifiers: { groundGameBonus: 20, donorNetworkWeak: -20, eliteApprovalPenalty: -15 },
    starterTraitId: "starter-organizer-roots",
  },
  {
    id: "academic",
    name: "Academic / Technocrat",
    description: "You know the policy cold. Retail politics is the part nobody taught you.",
    strengths: ["Policy-effectiveness bonus"],
    weaknesses: ["Lower base charisma / persuasion"],
    ideologyDefault: { economic: -5, social: -10, foreignPolicy: -5 },
    statModifiers: { policyEffectivenessBonus: 20, baseCharismaDelta: -15 },
    starterTraitId: "starter-credentialed",
  },
  {
    id: "dynasty",
    name: "Dynasty / Political Family",
    description: "The name opens every door in the room. It also means every mistake gets remembered.",
    strengths: ["Inherited relationships", "Name recognition"],
    weaknesses: ["Authenticity penalty", "Higher scandal sensitivity"],
    ideologyDefault: { economic: 0, social: 0, foreignPolicy: 0 },
    statModifiers: { inheritedRelationships: 25, nameRecognition: 25, authenticityPenalty: -15, scandalSensitivity: 20 },
    starterTraitId: "starter-inherited-name",
  },
  {
    id: "outsider",
    name: "Outsider / Celebrity",
    description: "Everyone already knows your name. Almost nobody in the party knows you.",
    strengths: ["Huge starting persuasion / attention"],
    weaknesses: ["Near-zero party relationships", "Low legislative skill"],
    ideologyDefault: { economic: 0, social: 0, foreignPolicy: 0 },
    statModifiers: { startingPersuasion: 30, partyRelationshipsDelta: -30, legislativeSkillDelta: -20 },
    starterTraitId: "starter-untested",
  },
];

export function getBackstory(id: string): Backstory {
  const b = BACKSTORIES.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown backstory: ${id}`);
  return b;
}
