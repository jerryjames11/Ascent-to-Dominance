import { useGameStore } from "./state/gameStore";
import { TopBar, BottomNav } from "./components/NavShell";
import { CharacterCreation } from "./components/CharacterCreation";
import { ProfileScreen } from "./components/ProfileScreen";
import { CountryTab } from "./components/CountryTab";
import { WorldScreen } from "./components/WorldScreen";
import { LegislatureTab } from "./components/LegislatureTab";
import { CampaignTab } from "./components/CampaignTab";
import { ElectionResultScreen } from "./components/ElectionResultScreen";
import { LegacyScreen } from "./components/LegacyScreen";
import { CoupEventModal } from "./components/CoupEventModal";

// Persistent shell: one bottom nav bar (Profile/Country/World/Legislature/Campaign, Sec 3) always
// reachable while a career is underway. Each tab shows whatever's actually true right now instead
// of the app routing between separate full-screen phases.
function MainShell() {
  const activeTab = useGameStore((s) => s.activeTab);
  return (
    <>
      <div className="scroll-area">
        {activeTab === "profile" && <ProfileScreen />}
        {activeTab === "country" && <CountryTab />}
        {activeTab === "world" && <WorldScreen />}
        {activeTab === "legislature" && <LegislatureTab />}
        {activeTab === "campaign" && <CampaignTab />}
      </div>
      <BottomNav />
      <CoupEventModal />
    </>
  );
}

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="app-shell">
      {phase !== "character-creation" && <TopBar />}
      {phase === "character-creation" && (
        <div className="scroll-area">
          <CharacterCreation />
        </div>
      )}
      {phase === "playing" && <MainShell />}
      {phase === "election-result" && (
        <div className="scroll-area">
          <ElectionResultScreen />
        </div>
      )}
      {phase === "career-ended" && (
        <div className="scroll-area">
          <LegacyScreen />
        </div>
      )}
    </div>
  );
}
