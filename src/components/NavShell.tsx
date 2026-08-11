import { useGameStore, type MainTab } from "../state/gameStore";

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
        {player && <span className="faint" title="Your career saves to this browser automatically as you play">💾 auto-saved</span>}
        {player && (
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("Abandon this career and start over?")) resetGame(); }}>
            New career
          </button>
        )}
      </div>
    </div>
  );
}

const TAB_DEFS: { id: MainTab; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "country", label: "Country", icon: "🏛" },
  { id: "world", label: "World", icon: "🌐" },
  { id: "legislature", label: "Legislature", icon: "⚖" },
  { id: "campaign", label: "Campaign", icon: "📣" },
];

export function BottomNav() {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const currentOffice = useGameStore((s) => s.currentOffice);

  return (
    <nav className="bottom-nav">
      {TAB_DEFS.map((t) => {
        const locked = t.id === "world" && (!currentOffice || currentOffice.tier < 3);
        return (
          <button
            key={t.id}
            className={`bottom-nav-item ${activeTab === t.id ? "active" : ""}`}
            disabled={locked}
            title={locked ? "Unlocks at national office (Legislature or higher)" : undefined}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="bottom-nav-icon">{t.icon}</span>
            <span>
              {t.label}
              {locked ? " 🔒" : ""}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
