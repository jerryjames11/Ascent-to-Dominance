import { useGameStore } from "../state/gameStore";

export function LegacyScreen() {
  const player = useGameStore((s) => s.player);
  const profile = useGameStore((s) => s.profile);
  const officeHistory = useGameStore((s) => s.officeHistory);
  const country = useGameStore((s) => s.country);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!player || !country) return null;

  const fulfilled = profile.promiseLedger.filter((p) => p.status === "fulfilled").length;
  const total = profile.promiseLedger.length;
  const highestTier = officeHistory.reduce((m, o) => Math.max(m, o.tier), 0);

  return (
    <div className="center-column">
      <h1>{player.name} — a career retrospective</h1>
      <p className="muted">Retired from public life in {country.name}.</p>

      <div className="card">
        <h3>Offices held</h3>
        <div className="stack" style={{ gap: 6 }}>
          {officeHistory.map((o, i) => (
            <div key={i} className="row between">
              <span>{o.title}</span>
              <span className="faint">Tier {o.tier}</span>
            </div>
          ))}
          {officeHistory.length === 0 && <p className="faint">Retired before ever winning office.</p>}
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: 14 }}>
        <StatTile label="Highest office tier" value={String(highestTier)} />
        <StatTile label="Promises kept" value={total ? `${fulfilled}/${total}` : "—"} />
        <StatTile label="Authenticity" value={`${Math.round(profile.authenticity)}`} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Career timeline</h3>
        <div className="stack" style={{ gap: 0 }}>
          {profile.careerTimeline.map((e, i) => (
            <div key={i} className="timeline-item">
              <span className="timeline-week">wk {e.absoluteWeek}</span>
              <span>{e.description}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="faint" style={{ marginTop: 14 }}>
        Full Legacy scoring (Domestic, Global, Democratic Integrity, Political Skill, Personal Reputation axes and
        headline archetypes) arrives in Phase 5. This is the raw material it'll be built from.
      </p>

      <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={resetGame}>
        Start a new career
      </button>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <span className="label">{label}</span>
      <div className="value">{value}</div>
    </div>
  );
}
