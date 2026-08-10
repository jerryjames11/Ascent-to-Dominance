import { useGameStore } from "../state/gameStore";

const ENDING_HEADLINE: Record<string, { headline: string; sub: string }> = {
  retired: { headline: "a career retrospective", sub: "Retired from public life in" },
  "term-limit-out": { headline: "termed out", sub: "Reached the end of the road, term-limited, in" },
  exiled: { headline: "forced into exile", sub: "Overthrown and exiled from" },
  imprisoned: { headline: "fallen", sub: "Overthrown and imprisoned in" },
};

export function LegacyScreen() {
  const player = useGameStore((s) => s.player);
  const profile = useGameStore((s) => s.profile);
  const officeHistory = useGameStore((s) => s.officeHistory);
  const country = useGameStore((s) => s.country);
  const resetGame = useGameStore((s) => s.resetGame);
  const endingReason = useGameStore((s) => s.endingReason);
  const institutionalStrength = useGameStore((s) => s.institutionalStrength);

  if (!player || !country) return null;

  const fulfilled = profile.promiseLedger.filter((p) => p.status === "fulfilled").length;
  const total = profile.promiseLedger.length;
  const highestTier = officeHistory.reduce((m, o) => Math.max(m, o.tier), 0);
  const ending = ENDING_HEADLINE[endingReason ?? "retired"];

  return (
    <div className="center-column">
      <h1>
        {player.name} — {ending.headline}
      </h1>
      <p className="muted">
        {ending.sub} {country.name}.
      </p>
      {(endingReason === "exiled" || endingReason === "imprisoned") && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 14 }}>
          <span className="badge badge-danger">Overthrown</span>
          <p style={{ margin: "8px 0 0" }}>
            Institutional Strength had fallen to {Math.round(institutionalStrength)} by the end — the drift that made this possible was
            years in the making.
          </p>
        </div>
      )}

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
        <StatTile label="Institutional Strength" value={`${Math.round(institutionalStrength)}`} />
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
