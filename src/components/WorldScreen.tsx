import { useMemo, useState } from "react";
import { useGameStore } from "../state/gameStore";
import { stageForTension, STAGE_LABEL, STAGE_UNLOCKS } from "../systems/tensionSystem";
import { availableActionsForStage } from "../systems/diplomacySystem";
import type { NationalPowerStats } from "../types/world";

const STAT_KEYS: (keyof NationalPowerStats)[] = ["economy", "military", "diplomacy", "stability", "innovation"];
// Sec 10: four dominance paths make up the composite ranking. Stability isn't a path to "win" —
// it's domestic health, shown alongside for context.
const STAT_LABELS: Record<keyof NationalPowerStats, string> = {
  economy: "Economic Hegemon",
  military: "Military Superpower",
  diplomacy: "Diplomatic Leader",
  stability: "Domestic stability (not a dominance path)",
  innovation: "Ideological Exporter",
};
const DOMINANCE_STAT_KEYS: (keyof NationalPowerStats)[] = ["economy", "military", "diplomacy", "innovation"];

const STAGE_BADGE: Record<string, string> = { stable: "badge-good", strained: "", confrontational: "badge-warn", crisis: "badge-warn", brink: "badge-danger" };

export function WorldScreen() {
  const country = useGameStore((s) => s.country);
  const player = useGameStore((s) => s.player);
  const currentOffice = useGameStore((s) => s.currentOffice);
  const aiNations = useGameStore((s) => s.aiNations);
  const tensionByNationId = useGameStore((s) => s.tensionByNationId);
  const activeWar = useGameStore((s) => s.activeWar);
  const warLegacyTags = useGameStore((s) => s.warLegacyTags);
  const getPlayerNationalStats = useGameStore((s) => s.getPlayerNationalStats);
  const applyDiplomaticAction = useGameStore((s) => s.applyDiplomaticAction);
  const declareWar = useGameStore((s) => s.declareWar);
  const fundWar = useGameStore((s) => s.fundWar);
  const sueForPeace = useGameStore((s) => s.sueForPeace);
  const gridVersion = useGameStore((s) => s.gridVersion);
  const absoluteWeek = useGameStore((s) => s.absoluteWeek);
  const worldStatModifiers = useGameStore((s) => s.worldStatModifiers);

  const [lastFundMsg, setLastFundMsg] = useState<string | null>(null);

  const playerStats = useMemo(() => getPlayerNationalStats(), [getPlayerNationalStats, gridVersion, absoluteWeek, worldStatModifiers]);

  if (!country || !player) return null;

  if (!currentOffice || currentOffice.tier < 3) {
    return (
      <div className="center-column">
        <h1>World</h1>
        <div className="card">
          <p>World access unlocks once you hold national office — observer-level at the legislature, full control from the executive.</p>
        </div>
      </div>
    );
  }

  const isFullControl = currentOffice.tier >= 4;
  const rows = [
    { id: country.id, name: country.name, isPlayer: true, stats: playerStats },
    ...aiNations.map((n) => ({ id: n.id, name: n.name, isPlayer: false, stats: n.stats })),
  ];
  const leaderByStat: Record<string, string> = {};
  for (const key of STAT_KEYS) {
    const best = rows.reduce((a, b) => (b.stats[key] > a.stats[key] ? b : a));
    leaderByStat[key] = best.id;
  }

  return (
    <div className="wide-column">
      <h1>World</h1>
      <p className="muted">{isFullControl ? "Full World-stage control." : "Observer-level influence — you can see the board, but diplomacy and war require full executive control."}</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3>Global rankings</h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Nation</th>
                {STAT_KEYS.map((k) => (
                  <th key={k} title={STAT_LABELS[k]}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: r.isPlayer ? 700 : 400 }}>{r.name}{r.isPlayer ? " (you)" : ""}</td>
                  {STAT_KEYS.map((k) => (
                    <td key={k}>
                      {Math.round(r.stats[k])}
                      {leaderByStat[k] === r.id && <span className="badge badge-good" style={{ marginLeft: 6 }}>leader</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ marginTop: 8 }}>
          Dominance paths: {DOMINANCE_STAT_KEYS.map((k) => STAT_LABELS[k]).join(" · ")}. Stability reflects domestic health, not a path itself.
        </p>
      </div>

      {activeWar && (
        <div className="card" style={{ marginBottom: 14, borderColor: "var(--danger)" }}>
          <span className="badge badge-danger">At war</span>
          <h3 style={{ marginTop: 8 }}>vs {aiNations.find((n) => n.id === activeWar.nationId)?.name ?? activeWar.nationId}</h3>
          <p className="faint">
            {activeWar.goalScope} war goals · turn {activeWar.turns} · {Math.round(activeWar.casualties).toLocaleString()} casualties ·{" "}
            {activeWar.fundingActive ? "funded" : "unfunded (front suffers each turn)"}
          </p>
          <div className="row between">
            <span className="muted">Front control</span>
            <span>{activeWar.front < 50 ? "losing ground" : activeWar.front > 50 ? "gaining ground" : "stalemate"}</span>
          </div>
          <div className="meter" style={{ marginTop: 4, marginBottom: 10 }}>
            <span style={{ width: `${activeWar.front}%` }} />
          </div>
          <div className="row">
            {isFullControl && !activeWar.fundingActive && (
              <button
                className="btn"
                onClick={() => {
                  const ok = fundWar();
                  setLastFundMsg(ok ? "War funding bill passed." : "War funding bill failed or session is full.");
                }}
              >
                Propose war funding
              </button>
            )}
            {isFullControl && (
              <button className="btn btn-danger" onClick={sueForPeace}>
                Sue for peace
              </button>
            )}
          </div>
          {lastFundMsg && <p className="faint" style={{ marginTop: 6 }}>{lastFundMsg}</p>}
        </div>
      )}

      <div className="grid-2">
        {aiNations.map((nation) => {
          const tension = tensionByNationId[nation.id] ?? 15;
          const stage = stageForTension(tension);
          const actions = availableActionsForStage(tension);
          return (
            <div className="card" key={nation.id}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{nation.name}</h3>
                <span className={`badge ${STAGE_BADGE[stage]}`}>{STAGE_LABEL[stage]}</span>
              </div>
              <p className="faint" style={{ margin: "4px 0 8px" }}>
                {nation.leaderName} · {nation.archetype.replace(/-/g, " ")} · domestic approval {Math.round(nation.domesticApproval)}%
              </p>
              <div className="meter" style={{ marginBottom: 6 }}>
                <span style={{ width: `${tension}%` }} />
              </div>
              <p className="faint">{STAGE_UNLOCKS[stage]}</p>

              {isFullControl ? (
                <div className="row wrap" style={{ marginTop: 8 }}>
                  {actions.map((a) => (
                    <button key={a.type} className="btn btn-sm" title={a.description} onClick={() => applyDiplomaticAction(nation.id, a.type)}>
                      {a.label}
                    </button>
                  ))}
                  {stage === "brink" && !activeWar && (
                    <>
                      <button className="btn btn-sm btn-danger" onClick={() => declareWar(nation.id, "limited")}>
                        Declare limited war
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => declareWar(nation.id, "total")}>
                        Declare total war
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <p className="faint">Diplomacy actions require full executive control.</p>
              )}
            </div>
          );
        })}
      </div>

      {warLegacyTags.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3>War record</h3>
          <div className="stack" style={{ gap: 6 }}>
            {warLegacyTags.map((t, i) => (
              <div key={i} className="row between">
                <span>{t.description}</span>
                <span className="badge">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
