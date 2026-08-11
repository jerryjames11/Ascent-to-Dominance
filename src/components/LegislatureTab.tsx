import { useGameStore } from "../state/gameStore";
import { LegislatureScreen } from "./LegislatureScreen";

export function LegislatureTab() {
  const currentOffice = useGameStore((s) => s.currentOffice);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  if (!currentOffice) {
    return (
      <div className="center-column">
        <h1>Legislature</h1>
        <div className="tab-placeholder card">
          <p className="muted" style={{ marginBottom: 10 }}>
            You don't currently hold an office with legislative access. Win an election first.
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab("country")}>
            Go to Country
          </button>
        </div>
      </div>
    );
  }

  return <LegislatureScreen />;
}
