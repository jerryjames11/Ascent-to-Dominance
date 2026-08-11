import { useGameStore } from "../state/gameStore";
import { CampaignScreen } from "./CampaignScreen";
import { PatronageScreen } from "./PatronageScreen";

export function CampaignTab() {
  const campaign = useGameStore((s) => s.campaign);
  const patronage = useGameStore((s) => s.patronage);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  if (campaign) return <CampaignScreen />;
  if (patronage) return <PatronageScreen />;

  return (
    <div className="center-column">
      <h1>Campaign</h1>
      <div className="tab-placeholder card">
        <p className="muted" style={{ marginBottom: 10 }}>
          Not currently campaigning for anything. Head to Country to announce your next race.
        </p>
        <button className="btn btn-primary" onClick={() => setActiveTab("country")}>
          Go to Country
        </button>
      </div>
    </div>
  );
}
