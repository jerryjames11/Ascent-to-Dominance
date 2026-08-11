import { useMemo } from "react";
import { useGameStore } from "../state/gameStore";
import { computeLegacy } from "../systems/legacySystem";
import { getTrait } from "../data/traits";

const AXIS_LABELS: { key: keyof ReturnType<typeof computeLegacy>["axes"]; label: string }[] = [
  { key: "domestic", label: "Domestic Legacy" },
  { key: "globalStanding", label: "Global Standing" },
  { key: "democraticIntegrity", label: "Democratic Integrity" },
  { key: "promiseIntegrity", label: "Promise Integrity" },
  { key: "politicalSkill", label: "Political Skill" },
  { key: "personalReputation", label: "Personal Reputation" },
];

export function LegacyScreen() {
  const player = useGameStore((s) => s.player);
  const profile = useGameStore((s) => s.profile);
  const officeHistory = useGameStore((s) => s.officeHistory);
  const country = useGameStore((s) => s.country);
  const resetGame = useGameStore((s) => s.resetGame);
  const endingReason = useGameStore((s) => s.endingReason);
  const institutionalStrength = useGameStore((s) => s.institutionalStrength);
  const authoritarianActionsTaken = useGameStore((s) => s.authoritarianActionsTaken);
  const warLegacyTags = useGameStore((s) => s.warLegacyTags);
  const aiNations = useGameStore((s) => s.aiNations);
  const absoluteWeek = useGameStore((s) => s.absoluteWeek);
  const getPlayerNationalStats = useGameStore((s) => s.getPlayerNationalStats);

  const report = useMemo(() => {
    if (!player || !country) return null;
    return computeLegacy({
      player,
      country,
      profile,
      officeHistory,
      endingReason: endingReason ?? "retired",
      finalStats: getPlayerNationalStats(),
      aiNations,
      institutionalStrength,
      authoritarianActionsTaken,
      warLegacyTags,
      finalWeek: absoluteWeek,
    });
  }, [player, country, profile, officeHistory, endingReason, getPlayerNationalStats, aiNations, institutionalStrength, authoritarianActionsTaken, warLegacyTags, absoluteWeek]);

  if (!player || !country || !report) return null;

  const capstone = getTrait(report.archetypeTraitId);

  return (
    <div className="center-column">
      <div className="row" style={{ gap: 10 }}>
        <h1 style={{ marginBottom: 0 }}>{player.name}</h1>
        <span className={`badge ${capstone?.negative ? "badge-danger" : "badge-good"}`} title={capstone?.description}>
          {report.archetype}
        </span>
      </div>
      <p className="muted">The historians' verdict, {country.name}.</p>

      <div className="card">
        {report.narrative.map((p, i) => (
          <p key={i} style={{ marginBottom: i === report.narrative.length - 1 ? 0 : "0.75em", fontFamily: '"Iowan Old Style", Georgia, serif' }}>
            {p}
          </p>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Legacy — six axes, no single number</h3>
        <div className="stack" style={{ gap: 10 }}>
          {AXIS_LABELS.map(({ key, label }) => {
            const v = report.axes[key];
            return (
              <div key={key}>
                <div className="row between">
                  <span className="muted">{label}</span>
                  <span>{Math.round(v)}</span>
                </div>
                <div className={`meter ${v < 35 ? "danger" : v < 55 ? "warn" : ""}`}>
                  <span style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {report.dominancePathsLed.length > 0 && (
          <p className="faint" style={{ marginTop: 10 }}>Dominance paths achieved: {report.dominancePathsLed.join(" · ")}</p>
        )}
      </div>

      <div className="grid-3" style={{ marginTop: 14 }}>
        <StatTile label="Highest office tier" value={String(report.highestTier)} />
        <StatTile label="Contests won / lost" value={`${report.electionsWon} / ${report.electionsLost}`} />
        <StatTile label="Bills passed / failed" value={`${report.billsPassed} / ${report.billsFailed}`} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Career timeline</h3>
        <div className="stack" style={{ gap: 0 }}>
          {profile.careerTimeline
            .slice()
            .reverse()
            .map((e, i) => (
              <div key={i} className="timeline-item">
                <span className="timeline-week">wk {e.absoluteWeek}</span>
                <span>{e.description}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Paths not taken</h3>
        <p className="faint" style={{ marginBottom: 0 }}>
          Still unplayed: {report.untriedCountries.join(", ")} — including the court-intrigue and party-patronage systems if you haven't
          run a monarchy or one-party state yet.
        </p>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={resetGame}>
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
