// Generates a compressed legislative body — Sec 9/14. Real chamber seat counts are compressed to a
// manageable number of Legislator "blocs", each carrying seatWeight real seats, for playable whip math.
import type { CountrySchema } from "../types/country";
import type { Faction, Legislator, AmbitionArchetype } from "../types/legislature";
import type { IdeologyPosition } from "../types/grid";
import { Rng } from "./rng";
import { generateName } from "./nameGen";

const ARCHETYPES: AmbitionArchetype[] = ["climber", "ideologue", "loyalist", "pragmatist", "survivor"];
const TARGET_BLOC_COUNT = 28;

function nationalIdeologyBaseline(countryId: string): IdeologyPosition {
  const baselines: Record<string, IdeologyPosition> = {
    US: { economic: 5, social: 0, foreignPolicy: 10 },
    UK: { economic: -5, social: -5, foreignPolicy: 0 },
    FR: { economic: -5, social: 0, foreignPolicy: -5 },
    DE: { economic: 0, social: -5, foreignPolicy: -15 },
    JP: { economic: 10, social: 15, foreignPolicy: -5 },
  };
  return baselines[countryId] ?? { economic: 0, social: 0, foreignPolicy: 0 };
}

const FACTION_NAME_POOL = [
  "Progress Coalition",
  "National Alliance",
  "Reform Bloc",
  "Heartland Party",
  "Liberty Union",
  "People's Front",
  "Centrist Accord",
  "Green Coalition",
];

export interface GeneratedLegislature {
  factions: Faction[];
  legislators: Legislator[];
  chamberName: string;
  totalSeats: number;
}

// Sub-national office tiers legislate in a body scaled to their actual jurisdiction, not the
// national chamber — a mayor doesn't sit in a 435-seat House. Tiers 3-4 use the real chamber.
const SUBNATIONAL_CHAMBER: Record<1 | 2, { name: string; seatCount: number }> = {
  1: { name: "Council", seatCount: 9 },
  2: { name: "State/Regional Legislature", seatCount: 120 },
};

export function generateLegislature(country: CountrySchema, playerIdeology: IdeologyPosition, seed: string, officeTier: 1 | 2 | 3 | 4 = 4): GeneratedLegislature {
  const rng = new Rng(`${seed}-legislature`);
  const nationalChamber = country.legislatureStructure.chambers.find((c) => c.selectionMethod === "elected") ?? country.legislatureStructure.chambers[0];
  const chamber =
    officeTier === 1 || officeTier === 2
      ? SUBNATIONAL_CHAMBER[officeTier]
      : { name: nationalChamber.name, seatCount: nationalChamber.seatCount };
  const baseline = nationalIdeologyBaseline(country.id);

  const factionCount = country.partyDiscipline === "fractured" ? rng.int(4, 6) : country.partyDiscipline === "rigid" ? 2 : rng.int(2, 4);
  const factionShares: number[] = [];
  let remaining = 1;
  for (let i = 0; i < factionCount - 1; i++) {
    const share = remaining * rng.range(0.25, 0.55);
    factionShares.push(share);
    remaining -= share;
  }
  factionShares.push(remaining);

  const factions: Faction[] = factionShares.map((share, i) => {
    const spread = 40;
    return {
      id: `faction-${i}`,
      name: FACTION_NAME_POOL[i % FACTION_NAME_POOL.length],
      seatShare: share,
      discipline: country.partyDiscipline,
      ideologyCenter: {
        economic: baseline.economic + rng.range(-spread, spread),
        social: baseline.social + rng.range(-spread, spread),
        foreignPolicy: baseline.foreignPolicy + rng.range(-spread, spread),
      },
      isPlayerParty: false,
    };
  });

  // Mark whichever faction is ideologically closest to the player as their nominal party.
  let closest = factions[0];
  let closestDist = Infinity;
  for (const f of factions) {
    const d =
      (f.ideologyCenter.economic - playerIdeology.economic) ** 2 +
      (f.ideologyCenter.social - playerIdeology.social) ** 2 +
      (f.ideologyCenter.foreignPolicy - playerIdeology.foreignPolicy) ** 2;
    if (d < closestDist) {
      closestDist = d;
      closest = f;
    }
  }
  closest.isPlayerParty = true;

  const legislators: Legislator[] = [];
  const seatsPerBloc = chamber.seatCount / TARGET_BLOC_COUNT;
  let blocIndex = 0;
  for (const faction of factions) {
    const blocsForFaction = Math.max(1, Math.round((chamber.seatCount * faction.seatShare) / seatsPerBloc));
    for (let i = 0; i < blocsForFaction; i++) {
      const spread = faction.discipline === "rigid" ? 10 : faction.discipline === "moderate" ? 20 : 30;
      legislators.push({
        id: `leg-${blocIndex}`,
        name: generateName(country.id, rng),
        factionId: faction.id,
        ideology: {
          economic: faction.ideologyCenter.economic + rng.range(-spread, spread),
          social: faction.ideologyCenter.social + rng.range(-spread, spread),
          foreignPolicy: faction.ideologyCenter.foreignPolicy + rng.range(-spread, spread),
        },
        archetype: ARCHETYPES[rng.int(0, ARCHETYPES.length - 1)],
        relationshipToPlayer: rng.range(-10, 10),
        seatWeight: Math.round(chamber.seatCount * faction.seatShare) / blocsForFaction,
      });
      blocIndex++;
    }
  }

  return { factions, legislators, chamberName: chamber.name, totalSeats: chamber.seatCount };
}
