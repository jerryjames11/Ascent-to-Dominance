import { useGameStore } from "../state/gameStore";
import { getBackstory } from "../data/backstories";
import { getTrait } from "../data/traits";
import { ideologyDistance } from "../systems/driftSystem";

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
  const honorDonorAsk = useGameStore((s) => s.honorDonorAsk);
  const ignoreDonorAsk = useGameStore((s) => s.ignoreDonorAsk);
  const breakPromise = useGameStore((s) => s.breakPromise);

  if (!player) return null;
  const backstory = getBackstory(player.backstoryId);
  const drift = ideologyDistance(player.ideology, player.startingIdeology);

  return (
    <div className="wide-column">
      <h1>{player.name}</h1>
      <p className="muted">
        {player.age} · {backstory.name}
      </p>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Ideology</h3>
              {drift > 3 && <span className="badge badge-warn">drifted {Math.round(drift)} pts from where you started</span>}
            </div>
            <IdeologyRow label="Economic" leftLabel="Left" rightLabel="Right" value={player.ideology.economic} startingValue={player.startingIdeology.economic} />
            <IdeologyRow label="Social" leftLabel="Liberal" rightLabel="Conservative" value={player.ideology.social} startingValue={player.startingIdeology.social} />
            <IdeologyRow
              label="Foreign policy"
              leftLabel="Dove"
              rightLabel="Hawk"
              value={player.ideology.foreignPolicy}
              startingValue={player.startingIdeology.foreignPolicy}
            />
            {drift > 3 && <p className="faint" style={{ marginTop: 4 }}>Faint tick marks show where you started.</p>}
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
                  <div className="row between">
                    <span className="faint">coalition: {p.coalitionTag}</span>
                    {p.status === "pending" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => breakPromise(p.id)}>
                        Walk it back
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Donor ledger</h3>
            {profile.donorLedger.length === 0 && <p className="faint">No standing donor asks yet.</p>}
            <div className="stack" style={{ gap: 8 }}>
              {profile.donorLedger.map((d) => (
                <div key={d.id}>
                  <div className="row between">
                    <div>
                      <div>{d.donorName}</div>
                      <span className="faint">{d.ask}</span>
                    </div>
                    <span className={`badge ${d.fulfilled === true ? "badge-good" : d.fulfilled === false ? "badge-danger" : ""}`}>
                      {d.fulfilled === null ? "pending" : d.fulfilled ? "kept" : "ignored"}
                    </span>
                  </div>
                  {d.fulfilled === null && (
                    <div className="row" style={{ marginTop: 4 }}>
                      <button className="btn btn-sm" onClick={() => honorDonorAsk(d.id)} title="Corruption up, Authenticity down, better fundraising next campaign">
                        Honor it
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => ignoreDonorAsk(d.id)} title="Authenticity up, weaker fundraising next campaign">
                        Ignore it
                      </button>
                    </div>
                  )}
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

function IdeologyRow({
  label,
  leftLabel,
  rightLabel,
  value,
  startingValue,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  startingValue?: number;
}) {
  const pct = ((value + 100) / 200) * 100;
  const startPct = startingValue !== undefined ? ((startingValue + 100) / 200) * 100 : undefined;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row between">
        <span className="muted">{label}</span>
        <span className="faint">{leftLabel} {Math.round(value)} {rightLabel}</span>
      </div>
      <div className="meter" style={{ position: "relative" }}>
        <span style={{ width: `${pct}%` }} />
        {startPct !== undefined && Math.abs(startPct - pct) > 1 && (
          <span
            style={{
              position: "absolute",
              left: `${startPct}%`,
              top: 0,
              width: 2,
              height: "100%",
              background: "var(--text-faint)",
              opacity: 0.8,
            }}
          />
        )}
      </div>
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
