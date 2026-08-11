import { useGameStore } from "../state/gameStore";
import { OfficeLadder } from "./OfficeLadder";
import { CountryScreen } from "./CountryScreen";

// Country tab covers both halves of "your position in this country's government": the office
// ladder when you don't hold one yet, the full dashboard once you do.
export function CountryTab() {
  const currentOffice = useGameStore((s) => s.currentOffice);
  return currentOffice ? <CountryScreen /> : <OfficeLadder />;
}
