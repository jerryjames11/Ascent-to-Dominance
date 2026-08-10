import { useGameStore } from "./state/gameStore";
import { TopBar, ServingTabs } from "./components/NavShell";
import { CharacterCreation } from "./components/CharacterCreation";
import { OfficeLadder } from "./components/OfficeLadder";
import { CampaignScreen } from "./components/CampaignScreen";
import { ElectionResultScreen } from "./components/ElectionResultScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { CountryScreen } from "./components/CountryScreen";
import { LegislatureScreen } from "./components/LegislatureScreen";
import { WorldScreen } from "./components/WorldScreen";
import { LegacyScreen } from "./components/LegacyScreen";

function ServingArea() {
  const servingTab = useGameStore((s) => s.servingTab);
  return (
    <>
      <ServingTabs />
      <div className="scroll-area">
        {servingTab === "profile" && <ProfileScreen />}
        {servingTab === "country" && <CountryScreen />}
        {servingTab === "legislature" && <LegislatureScreen />}
        {servingTab === "world" && <WorldScreen />}
      </div>
    </>
  );
}

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="app-shell">
      {phase !== "character-creation" && <TopBar />}
      {phase === "serving" ? (
        <ServingArea />
      ) : (
        <div className="scroll-area">
          {phase === "character-creation" && <CharacterCreation />}
          {phase === "office-select" && <OfficeLadder />}
          {phase === "campaigning" && <CampaignScreen />}
          {phase === "election-result" && <ElectionResultScreen />}
          {phase === "career-ended" && <LegacyScreen />}
        </div>
      )}
    </div>
  );
}
