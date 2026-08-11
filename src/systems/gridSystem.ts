// Demographic Grid generation + live Reader/Writer implementation — Sec 8.
// Builds against the LOCKED interfaces in src/types/grid.ts. Do not change that file's shapes here.
import type {
  DemographicGrid,
  GridCell,
  GridReader,
  GridWriter,
  RegionNode,
  DemographicSegment,
  IdeologyPosition,
  AgeBracket,
  UrbanRural,
  IncomeBand,
  EducationLevel,
  IssueSalience,
  BillGridEffect,
} from "../types/grid";
import type { CountrySchema } from "../types/country";
import { ISSUE_CATALOG } from "../types/legislature";
import { nationalIdeologyBaseline } from "../data/countryBaselines";
import { Rng } from "./rng";

const AGE_BRACKETS: AgeBracket[] = ["18-29", "30-44", "45-64", "65+"];
const URBAN_RURAL: UrbanRural[] = ["urban", "suburban", "rural"];

interface RegionTemplate {
  name: string;
  popShare: number; // fraction of national population
  urbanBias: number; // -1 rural .. +1 urban, shifts urban/suburban/rural mix
  leanOffset: Partial<IdeologyPosition>; // regional political lean vs national baseline
}

const REGION_TEMPLATES: Record<string, RegionTemplate[]> = {
  US: [
    { name: "Northeast", popShare: 0.17, urbanBias: 0.5, leanOffset: { economic: -15, social: -20 } },
    { name: "South", popShare: 0.38, urbanBias: -0.2, leanOffset: { economic: 10, social: 20, foreignPolicy: 10 } },
    { name: "Midwest", popShare: 0.21, urbanBias: -0.1, leanOffset: { economic: 0, social: 5 } },
    { name: "West", popShare: 0.24, urbanBias: 0.4, leanOffset: { economic: -10, social: -15 } },
  ],
  UK: [
    { name: "London & South East", popShare: 0.27, urbanBias: 0.8, leanOffset: { economic: -5, social: -15 } },
    { name: "Midlands", popShare: 0.18, urbanBias: 0.0, leanOffset: { economic: 5, social: 10 } },
    { name: "North of England", popShare: 0.24, urbanBias: -0.1, leanOffset: { economic: -10, social: 5 } },
    { name: "Scotland", popShare: 0.15, urbanBias: 0.1, leanOffset: { economic: -20, social: -10 } },
    { name: "Wales & South West", popShare: 0.16, urbanBias: -0.3, leanOffset: { economic: -5, social: 0 } },
  ],
  FR: [
    { name: "Île-de-France", popShare: 0.19, urbanBias: 0.8, leanOffset: { economic: -10, social: -20 } },
    { name: "Grand Est & North", popShare: 0.22, urbanBias: -0.1, leanOffset: { economic: 15, social: 20 } },
    { name: "Auvergne-Rhône-Alpes", popShare: 0.19, urbanBias: 0.2, leanOffset: { economic: 5, social: 0 } },
    { name: "Occitanie & South West", popShare: 0.2, urbanBias: -0.1, leanOffset: { economic: -15, social: -10 } },
    { name: "Brittany & West", popShare: 0.2, urbanBias: -0.2, leanOffset: { economic: -5, social: -5 } },
  ],
  DE: [
    { name: "Bavaria", popShare: 0.16, urbanBias: 0.1, leanOffset: { economic: 15, social: 10 } },
    { name: "North Rhine-Westphalia", popShare: 0.21, urbanBias: 0.3, leanOffset: { economic: 0, social: 0 } },
    { name: "Former West (other)", popShare: 0.38, urbanBias: 0.1, leanOffset: { economic: 5, social: -5 } },
    { name: "Former East", popShare: 0.25, urbanBias: -0.2, leanOffset: { economic: 5, social: 25, foreignPolicy: 15 } },
  ],
  JP: [
    { name: "Kanto (Tokyo region)", popShare: 0.34, urbanBias: 0.9, leanOffset: { economic: 5, social: -10 } },
    { name: "Kansai", popShare: 0.17, urbanBias: 0.6, leanOffset: { economic: 0, social: 0 } },
    { name: "Chubu", popShare: 0.16, urbanBias: 0.1, leanOffset: { economic: 10, social: 10 } },
    { name: "Kyushu & Okinawa", popShare: 0.12, urbanBias: -0.2, leanOffset: { economic: 5, social: 15 } },
    { name: "Hokkaido & Tohoku", popShare: 0.11, urbanBias: -0.4, leanOffset: { economic: -5, social: 5 } },
    { name: "Chugoku & Shikoku", popShare: 0.1, urbanBias: -0.3, leanOffset: { economic: 5, social: 10 } },
  ],
  SA: [
    { name: "Riyadh & Najd", popShare: 0.32, urbanBias: 0.5, leanOffset: { economic: 10, social: 20 } },
    { name: "Hejaz (Mecca & Jeddah)", popShare: 0.3, urbanBias: 0.6, leanOffset: { economic: 5, social: 5 } },
    { name: "Eastern Province", popShare: 0.18, urbanBias: 0.3, leanOffset: { economic: 15, social: 0 } },
    { name: "Asir & South", popShare: 0.2, urbanBias: -0.4, leanOffset: { economic: -5, social: 25 } },
  ],
  CN: [
    { name: "Coastal East", popShare: 0.3, urbanBias: 0.7, leanOffset: { economic: 15, social: -5 } },
    { name: "South (Guangdong & Fujian)", popShare: 0.18, urbanBias: 0.6, leanOffset: { economic: 20, social: -5 } },
    { name: "Central Provinces", popShare: 0.24, urbanBias: -0.1, leanOffset: { economic: -5, social: 10 } },
    { name: "Northeast (Dongbei)", popShare: 0.12, urbanBias: 0.1, leanOffset: { economic: -15, social: 15 } },
    { name: "West & Interior", popShare: 0.16, urbanBias: -0.5, leanOffset: { economic: -10, social: 20 } },
  ],
  BR: [
    { name: "Southeast (São Paulo & Rio)", popShare: 0.42, urbanBias: 0.7, leanOffset: { economic: 10, social: -10 } },
    { name: "Northeast", popShare: 0.27, urbanBias: -0.1, leanOffset: { economic: -15, social: 10 } },
    { name: "South", popShare: 0.15, urbanBias: 0.3, leanOffset: { economic: 15, social: 15 } },
    { name: "North & Center-West", popShare: 0.16, urbanBias: -0.4, leanOffset: { economic: -5, social: 5 } },
  ],
  IN: [
    { name: "North (Hindi Belt)", popShare: 0.35, urbanBias: -0.2, leanOffset: { economic: 5, social: 25 } },
    { name: "West (Maharashtra & Gujarat)", popShare: 0.19, urbanBias: 0.4, leanOffset: { economic: 15, social: 10 } },
    { name: "South (Dravidian states)", popShare: 0.2, urbanBias: 0.3, leanOffset: { economic: -5, social: -15 } },
    { name: "East & Northeast", popShare: 0.17, urbanBias: -0.3, leanOffset: { economic: -10, social: 5 } },
    { name: "National Capital Region", popShare: 0.09, urbanBias: 0.9, leanOffset: { economic: 10, social: -10 } },
  ],
  NG: [
    { name: "Lagos & Southwest", popShare: 0.24, urbanBias: 0.6, leanOffset: { economic: 15, social: -10 } },
    { name: "North (Sahel & Middle Belt)", popShare: 0.4, urbanBias: -0.4, leanOffset: { economic: -10, social: 35 } },
    { name: "Southeast (Igbo states)", popShare: 0.16, urbanBias: 0.1, leanOffset: { economic: 5, social: 0 } },
    { name: "South-South (Niger Delta)", popShare: 0.2, urbanBias: -0.1, leanOffset: { economic: -5, social: 10 } },
  ],
  MX: [
    { name: "Valley of Mexico", popShare: 0.22, urbanBias: 0.8, leanOffset: { economic: -10, social: -10 } },
    { name: "North (border states)", popShare: 0.24, urbanBias: 0.3, leanOffset: { economic: 15, social: 5 } },
    { name: "Central Bajío", popShare: 0.26, urbanBias: 0.1, leanOffset: { economic: 5, social: 15 } },
    { name: "South & Chiapas", popShare: 0.28, urbanBias: -0.5, leanOffset: { economic: -20, social: 10 } },
  ],
  KR: [
    { name: "Seoul Capital Area", popShare: 0.5, urbanBias: 0.9, leanOffset: { economic: 0, social: -10 } },
    { name: "Yeongnam (Southeast)", popShare: 0.22, urbanBias: 0.3, leanOffset: { economic: 10, social: 15 } },
    { name: "Honam (Southwest)", popShare: 0.1, urbanBias: -0.1, leanOffset: { economic: -10, social: -15 } },
    { name: "Central & Gangwon", popShare: 0.18, urbanBias: -0.2, leanOffset: { economic: 0, social: 5 } },
  ],
  ID: [
    { name: "Java", popShare: 0.55, urbanBias: 0.4, leanOffset: { economic: 0, social: 10 } },
    { name: "Sumatra", popShare: 0.21, urbanBias: -0.1, leanOffset: { economic: -5, social: 15 } },
    { name: "Kalimantan & Sulawesi", popShare: 0.15, urbanBias: -0.3, leanOffset: { economic: -10, social: 5 } },
    { name: "Eastern Islands", popShare: 0.09, urbanBias: -0.5, leanOffset: { economic: -15, social: -5 } },
  ],
  CA: [
    { name: "Ontario", popShare: 0.38, urbanBias: 0.5, leanOffset: { economic: 0, social: -10 } },
    { name: "Quebec", popShare: 0.23, urbanBias: 0.3, leanOffset: { economic: -10, social: -15 } },
    { name: "British Columbia", popShare: 0.13, urbanBias: 0.4, leanOffset: { economic: -5, social: -15 } },
    { name: "Prairies", popShare: 0.18, urbanBias: -0.2, leanOffset: { economic: 20, social: 15 } },
    { name: "Atlantic Canada", popShare: 0.08, urbanBias: -0.3, leanOffset: { economic: -5, social: 5 } },
  ],
  ES: [
    { name: "Madrid", popShare: 0.15, urbanBias: 0.8, leanOffset: { economic: 5, social: -10 } },
    { name: "Catalonia", popShare: 0.17, urbanBias: 0.6, leanOffset: { economic: -5, social: -15 } },
    { name: "Andalusia", popShare: 0.18, urbanBias: 0.0, leanOffset: { economic: -15, social: 5 } },
    { name: "North (Basque, Galicia, Asturias)", popShare: 0.16, urbanBias: 0.1, leanOffset: { economic: -10, social: -5 } },
    { name: "Levante & Islands", popShare: 0.34, urbanBias: 0.2, leanOffset: { economic: 0, social: 0 } },
  ],
  SE: [
    { name: "Stockholm", popShare: 0.24, urbanBias: 0.9, leanOffset: { economic: 0, social: -15 } },
    { name: "Götaland (South)", popShare: 0.45, urbanBias: 0.2, leanOffset: { economic: 5, social: 5 } },
    { name: "Svealand (Central)", popShare: 0.2, urbanBias: 0.1, leanOffset: { economic: -5, social: 0 } },
    { name: "Norrland (North)", popShare: 0.11, urbanBias: -0.5, leanOffset: { economic: -10, social: 10 } },
  ],
  PL: [
    { name: "Mazovia (Warsaw)", popShare: 0.2, urbanBias: 0.7, leanOffset: { economic: 5, social: -15 } },
    { name: "Silesia & South", popShare: 0.28, urbanBias: 0.3, leanOffset: { economic: 10, social: 10 } },
    { name: "Eastern Poland", popShare: 0.24, urbanBias: -0.3, leanOffset: { economic: -10, social: 30 } },
    { name: "Western Poland", popShare: 0.28, urbanBias: 0.1, leanOffset: { economic: 5, social: -5 } },
  ],
  VN: [
    { name: "Red River Delta (Hanoi)", popShare: 0.24, urbanBias: 0.4, leanOffset: { economic: -5, social: 15 } },
    { name: "Mekong Delta", popShare: 0.2, urbanBias: -0.2, leanOffset: { economic: -10, social: 10 } },
    { name: "Southeast (Ho Chi Minh City)", popShare: 0.22, urbanBias: 0.8, leanOffset: { economic: 15, social: -5 } },
    { name: "North & Central Highlands", popShare: 0.34, urbanBias: -0.5, leanOffset: { economic: -20, social: 20 } },
  ],
};

function clamp(v: number, min = -100, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function incomeForSegment(urbanRural: UrbanRural, age: AgeBracket, rng: Rng): IncomeBand {
  let score = 0;
  if (urbanRural === "urban") score += 1;
  if (urbanRural === "rural") score -= 1;
  if (age === "45-64") score += 1;
  if (age === "18-29") score -= 1;
  score += rng.range(-1, 1);
  if (score > 0.6) return "high";
  if (score < -0.6) return "low";
  return "middle";
}

function educationForSegment(urbanRural: UrbanRural, income: IncomeBand, rng: Rng): EducationLevel {
  let score = 0;
  if (urbanRural === "urban") score += 1.2;
  if (urbanRural === "rural") score -= 1;
  if (income === "high") score += 1;
  if (income === "low") score -= 0.6;
  score += rng.range(-1, 1);
  if (score > 1.2) return "postgrad";
  if (score > 0.2) return "degree";
  if (score > -0.8) return "some-college";
  return "no-degree";
}

function segmentIdeologyOffset(seg: { ageBracket: AgeBracket; urbanRural: UrbanRural; education: EducationLevel; income: IncomeBand }): Partial<IdeologyPosition> {
  let economic = 0;
  let social = 0;
  let foreignPolicy = 0;
  if (seg.ageBracket === "18-29") { social -= 20; economic -= 10; }
  if (seg.ageBracket === "65+") { social += 15; foreignPolicy += 5; }
  if (seg.urbanRural === "urban") { social -= 15; economic -= 5; }
  if (seg.urbanRural === "rural") { social += 15; foreignPolicy += 10; }
  if (seg.education === "postgrad" || seg.education === "degree") { social -= 10; }
  if (seg.education === "no-degree") { social += 8; economic += 5; }
  if (seg.income === "high") economic += 15;
  if (seg.income === "low") economic -= 15;
  return { economic, social, foreignPolicy };
}

function salienceForSegment(seg: { ageBracket: AgeBracket; urbanRural: UrbanRural; income: IncomeBand }, rng: Rng): IssueSalience[] {
  const weights: Record<string, number> = {};
  for (const issue of ISSUE_CATALOG) weights[issue.id] = 0.25 + rng.range(0, 0.2);
  weights["economy"] += seg.income === "low" ? 0.35 : 0.15;
  weights["taxes"] += seg.income === "high" ? 0.3 : 0.05;
  weights["healthcare"] += seg.ageBracket === "65+" ? 0.4 : 0.1;
  weights["education"] += seg.ageBracket === "18-29" || seg.ageBracket === "30-44" ? 0.3 : 0.05;
  weights["public-safety"] += seg.urbanRural === "urban" ? 0.2 : 0.1;
  weights["housing"] += seg.urbanRural === "urban" ? 0.25 : 0.05;
  weights["environment"] += seg.urbanRural !== "rural" ? 0.15 : 0.05;
  weights["immigration"] += rng.range(0, 0.25);
  return Object.entries(weights).map(([issueId, w]) => ({ issueId, weight: clamp(w, 0, 1) }));
}

/** Region id/name pairs a country will generate, without building the full grid. Used for
 *  character-creation home-region selection and for national-scope lookups. */
export function regionOptionsForCountry(country: CountrySchema): { id: string; name: string }[] {
  const templates = REGION_TEMPLATES[country.id] ?? REGION_TEMPLATES.US;
  return templates.map((t, i) => ({ id: `${country.id}-region-${i}`, name: t.name }));
}

/** Builds a fresh DemographicGrid for a country, seeded so it's reproducible per (country, seed). */
export function buildGrid(country: CountrySchema, seed: string, playerIdeology: IdeologyPosition, startingPersuasion = 35): DemographicGrid {
  const rng = new Rng(seed);
  const templates = REGION_TEMPLATES[country.id] ?? REGION_TEMPLATES.US;
  const nationalId = `${country.id}-national`;
  const regions: RegionNode[] = [{ id: nationalId, tier: "national", parentId: null, name: country.name }];
  for (let i = 0; i < templates.length; i++) {
    regions.push({ id: `${country.id}-region-${i}`, tier: "region", parentId: nationalId, name: templates[i].name });
  }

  const segments: DemographicSegment[] = [];
  for (const age of AGE_BRACKETS) {
    for (const ur of URBAN_RURAL) {
      const income = incomeForSegment(ur, age, rng);
      const education = educationForSegment(ur, income, rng);
      const extraAxes: Record<string, string> = {};
      for (const axis of country.demographicAxes) {
        extraAxes[axis] = rng.chance(0.5) ? "majority" : "minority";
      }
      segments.push({
        id: `${age}_${ur}_${income}_${education}`,
        ageBracket: age,
        urbanRural: ur,
        income,
        education,
        extraAxes,
      });
    }
  }

  const baseline = nationalIdeologyBaseline(country.id);
  const cells: GridCell[] = [];

  for (let ri = 0; ri < templates.length; ri++) {
    const tmpl = templates[ri];
    const regionId = `${country.id}-region-${ri}`;
    // urban/suburban/rural population split within region, shifted by template's urbanBias
    const urbanShare = clamp(0.34 + tmpl.urbanBias * 0.25, 0.05, 0.85);
    const ruralShare = clamp(0.33 - tmpl.urbanBias * 0.2, 0.05, 0.85);
    const suburbShare = Math.max(0.05, 1 - urbanShare - ruralShare);
    const urShare: Record<UrbanRural, number> = { urban: urbanShare, suburban: suburbShare, rural: ruralShare };

    for (const seg of segments) {
      const agePopShare = 0.25; // even split across 4 brackets, good enough for Phase 1
      const popWeight = tmpl.popShare * urShare[seg.urbanRural] * agePopShare * 1_000_000; // arbitrary national=1,000,000 scale
      const ideology: IdeologyPosition = {
        economic: clamp(baseline.economic + (tmpl.leanOffset.economic ?? 0) + (segmentIdeologyOffset(seg).economic ?? 0) + rng.range(-8, 8)),
        social: clamp(baseline.social + (tmpl.leanOffset.social ?? 0) + (segmentIdeologyOffset(seg).social ?? 0) + rng.range(-8, 8)),
        foreignPolicy: clamp(baseline.foreignPolicy + (tmpl.leanOffset.foreignPolicy ?? 0) + (segmentIdeologyOffset(seg).foreignPolicy ?? 0) + rng.range(-8, 8)),
      };

      // ideological distance to player seeds initial persuasion (closer = friendlier starting point)
      const dist = Math.sqrt(
        (ideology.economic - playerIdeology.economic) ** 2 +
          (ideology.social - playerIdeology.social) ** 2 +
          (ideology.foreignPolicy - playerIdeology.foreignPolicy) ** 2
      );
      const maxDist = Math.sqrt(3) * 200;
      const proximityBonus = (1 - dist / maxDist) * 25; // up to +/-12.5ish
      const persuasion = clamp(startingPersuasion + proximityBonus + rng.range(-6, 6), 0, 100);

      const baselineTurnout = clamp(
        0.45 +
          (seg.ageBracket === "65+" ? 0.2 : seg.ageBracket === "18-29" ? -0.15 : 0) +
          (seg.education === "postgrad" || seg.education === "degree" ? 0.1 : 0) +
          rng.range(-0.05, 0.05),
        0.15,
        0.9
      );

      cells.push({
        regionId,
        segmentId: seg.id,
        populationWeight: popWeight,
        baselineTurnoutPropensity: baselineTurnout,
        ideology,
        issueSalience: salienceForSegment(seg, rng),
        persuasion,
        turnoutEnthusiasm: 45 + rng.range(-5, 5),
      });
    }
  }

  return { countryId: country.id, regions, segments, cells };
}

/** Mutable live wrapper implementing the locked GridReader/GridWriter contracts. */
export class LiveGrid implements GridReader, GridWriter {
  readonly grid: DemographicGrid;
  private index = new Map<string, GridCell>();

  constructor(grid: DemographicGrid) {
    this.grid = grid;
    for (const cell of grid.cells) this.index.set(this.key(cell.regionId, cell.segmentId), cell);
  }

  private key(regionId: string, segmentId: string): string {
    return `${regionId}::${segmentId}`;
  }

  getCell(regionId: string, segmentId: string): GridCell | undefined {
    return this.index.get(this.key(regionId, segmentId));
  }

  getCellsByRegion(regionId: string): GridCell[] {
    return this.grid.cells.filter((c) => c.regionId === regionId);
  }

  getCellsBySegmentFilter(filter: Partial<DemographicSegment>): GridCell[] {
    const matchIds = new Set(
      this.grid.segments
        .filter((s) => Object.entries(filter).every(([k, v]) => (s as unknown as Record<string, unknown>)[k] === v))
        .map((s) => s.id)
    );
    return this.grid.cells.filter((c) => matchIds.has(c.segmentId));
  }

  /** Cells in scope: pass explicit regionIds (e.g. player's home region, or all non-root regions for national). */
  getCellsInScope(regionIds: string[]): GridCell[] {
    const set = new Set(regionIds);
    return this.grid.cells.filter((c) => set.has(c.regionId));
  }

  aggregateApproval(regionId?: string): number {
    const cells = regionId ? this.getCellsByRegion(regionId) : this.grid.cells;
    return weightedAvg(cells, (c) => c.persuasion);
  }

  adjustPersuasion(regionId: string, segmentId: string, delta: number): void {
    const cell = this.getCell(regionId, segmentId);
    if (cell) cell.persuasion = clamp(cell.persuasion + delta, 0, 100);
  }

  adjustTurnoutEnthusiasm(regionId: string, segmentId: string, delta: number): void {
    const cell = this.getCell(regionId, segmentId);
    if (cell) cell.turnoutEnthusiasm = clamp(cell.turnoutEnthusiasm + delta, 0, 100);
  }

  applyBillEffect(effect: BillGridEffect): void {
    let targets: GridCell[];
    if (effect.targetCells.regionId) {
      targets = this.getCellsByRegion(effect.targetCells.regionId);
    } else if (effect.targetCells.segmentFilter) {
      targets = this.getCellsBySegmentFilter(effect.targetCells.segmentFilter);
    } else {
      targets = this.grid.cells;
    }
    for (const cell of targets) {
      cell.persuasion = clamp(cell.persuasion + effect.persuasionDelta, 0, 100);
      for (const sd of effect.salienceDelta) {
        const entry = cell.issueSalience.find((s) => s.issueId === sd.issueId);
        if (entry) entry.weight = clamp(entry.weight + sd.delta, 0, 1);
      }
    }
  }

  /** Weekly decay: turnout enthusiasm and persuasion drift gently toward resting values absent action. */
  tickWeek(): void {
    for (const cell of this.grid.cells) {
      cell.turnoutEnthusiasm = clamp(cell.turnoutEnthusiasm + (45 - cell.turnoutEnthusiasm) * 0.04, 0, 100);
    }
  }
}

export function weightedAvg(cells: GridCell[], pick: (c: GridCell) => number): number {
  if (cells.length === 0) return 0;
  let total = 0;
  let weight = 0;
  for (const c of cells) {
    total += pick(c) * c.populationWeight;
    weight += c.populationWeight;
  }
  return weight === 0 ? 0 : total / weight;
}
