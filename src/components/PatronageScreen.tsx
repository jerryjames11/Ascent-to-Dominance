import { useState } from "react";
import { useGameStore } from "../state/gameStore";
import { PATRONAGE_ACTION_DEFS, PATRONAGE_WEEKLY_AP, PATRONAGE_CYCLE_WEEKS, patronageScores } from "../systems/patronageSystem";
import type { PatronageActionType } from "../types/patronage";

export function PatronageScreen() {
  const patronage = useGameStore((s) => s.patronage);
  const runPatronageAction = useGameStore((s) => s.runPatronageAction);
  const advancePatronageWeek = useGameStore((s) => s.advancePatronageWeek);

  const [targetBrokerId, setTargetBrokerId] = useState<string>("");
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);

  if (!patronage) return null;

  const isCourt = patronage.mode === "court-intrigue";
  const weeksElapsed = PATRONAGE_CYCLE_WEEKS - patronage.weeksRemaining;
  const progressPct = Math.round((weeksElapsed / PATRONAGE_CYCLE_WEEKS) * 100);
  const { player, rival } = patronageScores(patronage);
  const standingShare = player + rival > 0 ? (player / (player + rival)) * 100 : 50;

  function handleAction(type: PatronageActionType) {
    const def = PATRONAGE_ACTION_DEFS.find((d) => d.type === type)!;
    const brokerId = def.needsBroker ? targetBrokerId || patronage!.brokers[0].id : undefined;
    setLastOutcome(runPatronageAction(type, brokerId));
  }

  return (
    <div className="wide-column">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h1 style={{ marginBottom: 0 }}>
          {isCourt ? "The Court" : "The Party"} — {patronage.officeTitle}
        </h1>
        <span className="badge">{isCourt ? "Court intrigue" : "Party patronage"}</span>
      </div>
      <p className="muted">
        {patronage.weeksRemaining} weeks until the decision · contending against {patronage.rivalName}
      </p>
      <div className="meter" style={{ marginBottom: 20 }}>
        <span style={{ width: `${progressPct}%` }} />
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3>
              This week — {patronage.apRemaining}/{PATRONAGE_WEEKLY_AP} action points left
            </h3>
            <label className="stack" style={{ gap: 4, marginBottom: 10 }}>
              <span className="label">Patron to cultivate</span>
              <select value={targetBrokerId} onChange={(e) => setTargetBrokerId(e.target.value)}>
                {patronage.brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="stack">
              {PATRONAGE_ACTION_DEFS.map((def) => (
                <div key={def.type} className="row between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <div>
                    <div className="row" style={{ gap: 6 }}>
                      <strong style={{ fontSize: "0.88rem" }}>{def.label}</strong>
                      <span className="faint">{def.apCost} AP</span>
                    </div>
                    <p className="faint" style={{ margin: "2px 0 0" }}>{def.description}</p>
                  </div>
                  <button className="btn btn-sm" disabled={patronage.apRemaining < def.apCost} onClick={() => handleAction(def.type)}>
                    Do it
                  </button>
                </div>
              ))}
            </div>
            {lastOutcome && (
              <p className="faint" style={{ marginTop: 10 }}>
                Last: {lastOutcome}
              </p>
            )}
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              setLastOutcome(null);
              advancePatronageWeek();
            }}
          >
            Advance to next week
          </button>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Standing</h3>
            <div className="row between">
              <span className="muted">Weighted support vs {patronage.rivalName}</span>
              <strong>{standingShare.toFixed(0)}%</strong>
            </div>
            <div className={`meter ${standingShare < 50 ? "warn" : ""}`} style={{ marginTop: 6, marginBottom: 10 }}>
              <span style={{ width: `${standingShare}%` }} />
            </div>
            {!isCourt && (
              <div>
                <div className="row between">
                  <span className="muted">Performance record</span>
                  <span>
                    {Math.round(patronage.performanceScore)} vs {Math.round(patronage.rivalPerformanceScore)}
                  </span>
                </div>
                <div className="meter" style={{ marginTop: 4 }}>
                  <span style={{ width: `${patronage.performanceScore}%` }} />
                </div>
                <p className="faint" style={{ marginTop: 6 }}>
                  In the party, delivered results weigh heavily — favor alone won't carry the decision.
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h3>{isCourt ? "The court factions" : "The selectorate"}</h3>
            <div className="stack" style={{ gap: 10 }}>
              {patronage.brokers.map((b) => (
                <div key={b.id}>
                  <div className="row between">
                    <span>
                      {b.title} <span className="faint">— {b.name}</span>
                    </span>
                    <span className="faint">{Math.round(b.influence * 100)}% influence</span>
                  </div>
                  <div className="row" style={{ gap: 10, marginTop: 4 }}>
                    <div style={{ flex: 1 }}>
                      <span className="faint">You {Math.round(b.playerFavor)}</span>
                      <div className="meter">
                        <span style={{ width: `${b.playerFavor}%` }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="faint">Rival {Math.round(b.rivalFavor)}</span>
                      <div className="meter warn">
                        <span style={{ width: `${b.rivalFavor}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
