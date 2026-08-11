// Save/Load — client-side persistence via localStorage. Everything in GameState is plain data
// except `grid`, a LiveGrid class instance (methods + an internal Map index) that plain
// JSON.stringify can't round-trip. We persist its underlying DemographicGrid data and rebuild the
// LiveGrid wrapper on load. `import type` for GameState avoids a real runtime circular import —
// gameStore.ts imports this module's functions at runtime, this module only imports its types.
import type { CountrySchema } from "../types/country";
import type { DemographicGrid } from "../types/grid";
import type { PlayerCharacter, ProfileState } from "../types/player";
import type { CampaignState } from "../types/campaign";
import type { Bill } from "../types/legislature";
import type { Appointee } from "../types/cabinet";
import type { AiNation, WarState, WarLegacyTag, NationalPowerStats } from "../types/world";
import type { PendingCoupEvent, CareerEndingReason } from "../types/authoritarian";
import type { PatronageState } from "../types/patronage";
import type { GeneratedLegislature } from "./legislatorGen";
import type { ElectionResult } from "./electionSystem";
import type { PollsterTier } from "./pollSystem";
import type { Phase, MainTab, OfficeHeld, SessionState, GameState } from "../state/gameStore";
import { LiveGrid } from "./gridSystem";

const SAVE_KEY = "rise-to-power-save-v1";
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  savedAt: number;
  phase: Phase;
  activeTab: MainTab;
  seed: string;
  player: PlayerCharacter | null;
  country: CountrySchema | null;
  gridData: DemographicGrid | null;
  gridVersion: number;
  absoluteWeek: number;
  currentOffice: OfficeHeld | null;
  officeHistory: OfficeHeld[];
  termsServedByOffice: Record<string, number>;
  session: SessionState | null;
  campaign: CampaignState | null;
  lastElectionResult: ElectionResult | null;
  legislature: GeneratedLegislature | null;
  bills: Bill[];
  activeBillId: string | null;
  cabinet: Appointee[];
  profile: ProfileState;
  pollTier: PollsterTier;
  aiNations: AiNation[];
  tensionByNationId: Record<string, number>;
  tradeAgreementsByNationId: Record<string, boolean>;
  worldStatModifiers: NationalPowerStats;
  activeWar: WarState | null;
  warLegacyTags: WarLegacyTag[];
  institutionalStrength: number;
  militaryLoyalty: number;
  oppositionStrength: number;
  authoritarianActionsTaken: number;
  termLimitRemoved: Record<string, boolean>;
  electionPostponedWeeks: number;
  decreePower: number;
  censorshipActive: boolean;
  gerrymanderActive: boolean;
  nextCampaignDisqualifyOpponent: boolean;
  commandDecentralized: boolean;
  pendingCoupEvent: PendingCoupEvent | null;
  endingReason: CareerEndingReason | null;
  patronage: PatronageState | null;
}

export function serializeState(state: GameState): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    phase: state.phase,
    activeTab: state.activeTab,
    seed: state.seed,
    player: state.player,
    country: state.country,
    gridData: state.grid ? state.grid.grid : null,
    gridVersion: state.gridVersion,
    absoluteWeek: state.absoluteWeek,
    currentOffice: state.currentOffice,
    officeHistory: state.officeHistory,
    termsServedByOffice: state.termsServedByOffice,
    session: state.session,
    campaign: state.campaign,
    lastElectionResult: state.lastElectionResult,
    legislature: state.legislature,
    bills: state.bills,
    activeBillId: state.activeBillId,
    cabinet: state.cabinet,
    profile: state.profile,
    pollTier: state.pollTier,
    aiNations: state.aiNations,
    tensionByNationId: state.tensionByNationId,
    tradeAgreementsByNationId: state.tradeAgreementsByNationId,
    worldStatModifiers: state.worldStatModifiers,
    activeWar: state.activeWar,
    warLegacyTags: state.warLegacyTags,
    institutionalStrength: state.institutionalStrength,
    militaryLoyalty: state.militaryLoyalty,
    oppositionStrength: state.oppositionStrength,
    authoritarianActionsTaken: state.authoritarianActionsTaken,
    termLimitRemoved: state.termLimitRemoved,
    electionPostponedWeeks: state.electionPostponedWeeks,
    decreePower: state.decreePower,
    censorshipActive: state.censorshipActive,
    gerrymanderActive: state.gerrymanderActive,
    nextCampaignDisqualifyOpponent: state.nextCampaignDisqualifyOpponent,
    commandDecentralized: state.commandDecentralized,
    pendingCoupEvent: state.pendingCoupEvent,
    endingReason: state.endingReason,
    patronage: state.patronage,
  };
}

export function deserializeSave(data: SaveData): Partial<GameState> {
  const { version, savedAt, gridData, ...rest } = data;
  void version;
  void savedAt;
  return {
    ...rest,
    grid: gridData ? new LiveGrid(gridData) : null,
  };
}

export function saveToLocalStorage(state: GameState): void {
  if (!state.player) return; // nothing worth persisting before character creation
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState(state)));
  } catch {
    // localStorage can throw (quota exceeded, private browsing) — saving is best-effort, never fatal
  }
}

export function loadFromLocalStorage(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== SAVE_VERSION || !parsed.player || !parsed.country) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function savedGameSummary(): { name: string; countryName: string; savedAt: number } | null {
  const data = loadFromLocalStorage();
  if (!data || !data.player || !data.country) return null;
  return { name: data.player.name, countryName: data.country.name, savedAt: data.savedAt };
}
