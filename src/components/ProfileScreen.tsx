import { useGameStore } from "../state/gameStore";
import { getBackstory } from "../data/backstories";
import { getTrait } from "../data/traits";

const STATUS_BADGE: Record<string, string> = {
  fulfilled: "badge-good",
  broken: "badge-danger",
  compromised: "badge-warn",
  pending: "",
};

const ROLE_LABEL: Record<string, string> = {
  "party-leader": "Party leadership",
  rival: "Rival",
  donor: "Donor",
  "foreign-leader": "Foreign leader",
  appointee: "Appointee",
  "constituent-group": "Constituent group",
};

export function ProfileScreen() {
  const player = useGameStore((s) => s.player);
  const profile = useGameStore((s) => s.profile);

  if (!player) return null;
  const backstory = getBackstory(player.backstoryId);

  return (
    <div className="wide-column">
      <h1>{player.name}</h1>
      <p className="muted">
        {player.age} · {backstory.name}
      </p>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3>Ideology</h3>
            <IdeologyRow label="Economic" leftLabel="Left" rightLabel="Right" value={player.ideology.economic} />
            <IdeologyRow label="Social" leftLabel="Liberal" rightLabel="Conservative" value={player.ideology.social} />
            <IdeologyRow label="Foreign policy" leftLabel="Dove" rightLabel="Hawk" value={player.ideology.foreignPolicy} />
          </div>

          <div className="card">
            <h3>Standing</h3>
            <MeterStat label="Authenticity" value={profile.authenticity} />
            <MeterStat label="Corruption / influence exposure" value={profile.corruptionScore} warnAbove={50} />
          </div>

          <div className="card">
            <h3>Traits</h3>
            <div className="row wrap">
              {profile.earnedTraitIds.map((id) => {
                const trait = getTrait(id);
                if (!trait) return null;
                return (
                  <span key={id} className={`badge ${trait.negative ? "badge-warn" : "badge-good"}`} title={trait.description}>
                    {trait.name}
                  </span>
                );
              })}
              {profile.earnedTraitIds.length === 0 && <span className="faint">None yet.</span>}
            </div>
          </div>

          <div className="card">
            <h3>Relationship web</h3>
            {profile.relationships.length === 0 && <p className="faint">No notable relationships yet.</p>}
            <div className="stack" style={{ gap: 8 }}>
              {profile.relationships.map((r) => (
                <div key={r.id} className="row between">
                  <div>
                    <span>{r.name}</span>
                    <span className="faint" style={{ marginLeft: 8 }}>{ROLE_LABEL[r.role]}</span>
                  </div>
                  <span className={r.score >= 0 ? "muted" : "badge badge-danger"} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {r.score > 0 ? "+" : ""}
                    {Math.round(r.score)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Promise ledger</h3>
            {profile.promiseLedger.length === 0 && <p className="faint">No commitments made yet — campaign positioning creates these.</p>}
            <div className="stack" style={{ gap: 8 }}>
              {profile.promiseLedger.map((p) => (
                <div key={p.id}>
                  <div className="row between">
                    <span style={{ fontSize: "0.85rem" }}>{p.text}</span>
                    <span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                  </div>
                  <span className="faint">coalition: {p.coalitionTag}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Donor ledger</h3>
            {profile.donorLedger.length === 0 && <p className="faint">No standing donor asks yet.</p>}
            <div className="stack" style={{ gap: 8 }}>
              {profile.donorLedger.map((d) => (
                <div key={d.id} className="row between">
                  <div>
                    <div>{d.donorName}</div>
                    <span className="faint">{d.ask}</span>
                  </div>
                  <span className={`badge ${d.fulfilled === true ? "badge-good" : d.fulfilled === false ? "badge-danger" : ""}`}>
                    {d.fulfilled === null ? "pending" : d.fulfilled ? "kept" : "ignored"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
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
              {profile.careerTimeline.length === 0 && <p className="faint">Nothing recorded yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdeologyRow({ label, leftLabel, rightLabel, value }: { label: string; leftLabel: string; rightLabel: string; value: number }) {
  const pct = ((value + 100) / 200) * 100;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row between">
        <span className="muted">{label}</span>
        <span className="faint">{leftLabel} {Math.round(value)} {rightLabel}</span>
      </div>
      <div className="meter"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function MeterStat({ label, value, warnAbove }: { label: string; value: number; warnAbove?: number }) {
  const warn = warnAbove !== undefined && value > warnAbove;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="row between">
        <span className="muted">{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className={`meter ${warn ? "danger" : ""}`}><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}
