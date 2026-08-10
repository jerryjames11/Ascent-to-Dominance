// Demographic Grid — Sec 8
// Single model underlying Campaign, Elections, Legislature, Approval.

export type RegionTier = "precinct" | "region" | "national";

export interface RegionNode {
  id: string;
  tier: RegionTier;
  parentId: string | null; // null for national root
  name: string;
}

export type AgeBracket = "18-29" | "30-44" | "45-64" | "65+";
export type UrbanRural = "urban" | "suburban" | "rural";
export type IncomeBand = "low" | "middle" | "high";
export type EducationLevel = "no-degree" | "some-college" | "degree" | "postgrad";

export interface DemographicSegment {
  id: string;
  ageBracket: AgeBracket;
  urbanRural: UrbanRural;
  income: IncomeBand;
  education: EducationLevel;
  // country-flavored axes from CountrySchema.demographic_axes
  // e.g. { ethnicity: "yoruba", religion: "muslim" }
  extraAxes: Record<string, string>;
}

export interface IdeologyPosition {
  economic: number; // -100 (left) to 100 (right)
  social: number; // -100 (lib) to 100 (conservative)
  foreignPolicy: number; // -100 (dove) to 100 (hawk)
}

export interface IssueSalience {
  issueId: string;
  weight: number; // 0-1, how much this cell cares
}

export interface GridCell {
  regionId: string;
  segmentId: string;
  populationWeight: number; // absolute or normalized pop count
  baselineTurnoutPropensity: number; // 0-1, structural
  ideology: IdeologyPosition;
  issueSalience: IssueSalience[];
  persuasion: number; // 0-100, player-directed, distinct from turnout
  turnoutEnthusiasm: number; // 0-100, moves week to week
}

export interface DemographicGrid {
  countryId: string;
  regions: RegionNode[];
  segments: DemographicSegment[];
  cells: GridCell[]; // one per (regionId x segmentId) leaf pair
}

// --- Read/write contracts every consuming system implements against ---

export interface GridReader {
  getCell(regionId: string, segmentId: string): GridCell | undefined;
  getCellsByRegion(regionId: string): GridCell[];
  getCellsBySegmentFilter(filter: Partial<DemographicSegment>): GridCell[];
  aggregateApproval(regionId?: string): number; // population-weighted avg
}

export interface GridWriter {
  adjustPersuasion(regionId: string, segmentId: string, delta: number): void;
  adjustTurnoutEnthusiasm(regionId: string, segmentId: string, delta: number): void;
  applyBillEffect(effect: BillGridEffect): void;
}

export interface BillGridEffect {
  billId: string;
  targetCells: { regionId?: string; segmentFilter?: Partial<DemographicSegment> };
  persuasionDelta: number;
  salienceDelta: { issueId: string; delta: number }[];
}

// --- Poll layer: what the player actually sees (Campaign tab) ---

export interface PollResult {
  regionId: string;
  reportedApproval: number; // noisy
  confidenceBand: number; // +/- range
  pollsterTier: "low" | "mid" | "high"; // affects noise/lag
  sampledAtWeek: number;
}
