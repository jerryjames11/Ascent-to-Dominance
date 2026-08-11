import { useGameStore, type ServingTab } from "../state/gameStore";

export function TopBar() {
  const player = useGameStore((s) => s.player);
  const country = useGameStore((s) => s.country);
  const currentOffice = useGameStore((s) => s.currentOffice);
  const campaign = useGameStore((s) => s.campaign);
  const patronage = useGameStore((s) => s.patronage);
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <div className="top-bar">
      <div className="row">
        <span className="brand">RISE TO POWER</span>
        {country && <span className="badge">{country.name}</span>}
      </div>
      <div className="row">
        {player && (
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {player.name}
            {currentOffice
              ? ` · ${currentOffice.title}`
              : campaign
              ? ` · Candidate for ${campaign.officeTitle}`
              : patronage
              ? ` · In contention for ${patronage.officeTitle}`
              : ""}
          </span>
        )}
        {player && (
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("Abandon this career and start over?")) resetGame(); }}>
            New career
          </button>
        )}
      </div>
    </div>
  );
}

const TAB_DEFS: { id: ServingTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "country", label: "Country" },
  { id: "legislature", label: "Legislature" },
  { id: "world", label: "World" },
];

export function ServingTabs() {
  const servingTab = useGameStore((s) => s.servingTab);
  const setServingTab = useGameStore((s) => s.setServingTab);
  const currentOffice = useGameStore((s) => s.currentOffice);

  return (
    <div className="tabs">
      {TAB_DEFS.map((t) => {
        const locked = t.id === "world" && (!currentOffice || currentOffice.tier < 3);
        return (
          <button
            key={t.id}
            className={`tab ${servingTab === t.id ? "active" : ""}`}
            disabled={locked}
            title={locked ? "Unlocks at national office — Phase 3" : undefined}
            onClick={() => setServingTab(t.id)}
          >
            {t.label}
            {locked ? " 🔒" : ""}
          </button>
        );
      })}
    </div>
  );
}
