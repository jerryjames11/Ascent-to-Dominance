import { useMemo, useState } from "react";
import { useGameStore, SESSION_BILL_CAPACITY } from "../state/gameStore";
import { computeNationalAgenda, projectAllVotes } from "../systems/legislatureSystem";
import { computeCabinetEffects } from "../systems/cabinetSystem";
import { ISSUE_CATALOG } from "../types/legislature";
import { regionOptionsForCountry } from "../systems/gridSystem";
import type { IdeologyPosition } from "../types/grid";

const PRESSURE_BADGE: Record<string, string> = { high: "badge-danger", rising: "badge-warn", low: "badge-good" };

export function LegislatureScreen() {
  const country = useGameStore((s) => s.country);
  const player = useGameStore((s) => s.player);
  const grid = useGameStore((s) => s.grid);
  const gridVersion = useGameStore((s) => s.gridVersion);
  const currentOffice = useGameStore((s) => s.currentOffice);
  const legislature = useGameStore((s) => s.legislature);
  const bills = useGameStore((s) => s.bills);
  const activeBillId = useGameStore((s) => s.activeBillId);
  const setActiveBill = useGameStore((s) => s.setActiveBill);
  const proposeBill = useGameStore((s) => s.proposeBill);
  const acceptAmendment = useGameStore((s) => s.acceptAmendment);
  const callVote = useGameStore((s) => s.callVote);
  const session = useGameStore((s) => s.session);
  const cabinet = useGameStore((s) => s.cabinet);

  const [title, setTitle] = useState("");
  const [issueId, setIssueId] = useState(ISSUE_CATALOG[0].id);
  const [intensity, setIntensity] = useState(50);
  const [billIdeology, setBillIdeology] = useState<IdeologyPosition>({ economic: 0, social: 0, foreignPolicy: 0 });
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const scopeRegionIds = useMemo(() => {
    if (!country || !player || !currentOffice) return [];
    if (currentOffice.tier >= 4) return regionOptionsForCountry(country).map((r) => r.id);
    return [player.homeRegionId];
  }, [country, player, currentOffice]);

  const agenda = useMemo(() => (grid ? computeNationalAgenda(grid, scopeRegionIds) : []), [grid, scopeRegionIds, gridVersion]);

  const activeBill = bills.find((b) => b.id === activeBillId);
  const whipBonus = useMemo(() => computeCabinetEffects(cabinet).whipBonus, [cabinet]);
  const projections = useMemo(() => {
    if (!activeBill || !legislature) return [];
    return projectAllVotes(activeBill, legislature.legislators, legislature.factions, agenda, whipBonus);
  }, [activeBill, legislature, agenda, whipBonus]);

  if (!country || !legislature) return null;

  const projectedYea = activeBill
    ? legislature.legislators.reduce((sum, l, i) => sum + (projections[i]?.probability ?? 0) * l.seatWeight, 0)
    : 0;
  const totalSeats = legislature.totalSeats;
  const projectedShare = totalSeats > 0 ? projectedYea / totalSeats : 0;
  const sessionCapacityLeft = SESSION_BILL_CAPACITY - (session?.billsProposedThisSession ?? 0);
  const canProposeMore = sessionCapacityLeft > 0;

  return (
    <div className="wide-column">
      <h1>Legislature — {legislature.chamberName}</h1>
      <p className="muted">{totalSeats} seats · {country.partyDiscipline} party discipline</p>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3>National Agenda</h3>
            <div className="stack" style={{ gap: 10 }}>
              {agenda.map((item) => (
                <div key={item.issueId}>
                  <div className="row between">
                    <span>{item.label}</span>
                    <span className={`badge ${PRESSURE_BADGE[item.pressure]}`}>{item.pressure} pressure</span>
                  </div>
                  <div className="row" style={{ gap: 10, marginTop: 4 }}>
                    <div style={{ flex: 1 }}>
                      <span className="faint">Salience {Math.round(item.salience * 100)}%</span>
                      <div className="meter"><span style={{ width: `${item.salience * 100}%` }} /></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="faint">Satisfaction {Math.round(item.satisfaction)}%</span>
                      <div className="meter"><span style={{ width: `${item.satisfaction}%` }} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Chamber composition</h3>
            <div className="stack" style={{ gap: 8 }}>
              {legislature.factions.map((f) => (
                <div key={f.id}>
                  <div className="row between">
                    <span>{f.name}{f.isPlayerParty ? " (your party)" : ""}</span>
                    <span className="faint">{Math.round(f.seatShare * 100)}%</span>
                  </div>
                  <div className="meter"><span style={{ width: `${f.seatShare * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Propose a bill</h3>
              <span className="faint">{sessionCapacityLeft}/{SESSION_BILL_CAPACITY} left this session</span>
            </div>
            <div className="stack">
              <label className="stack" style={{ gap: 4 }}>
                <span className="label">Title</span>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Regional Broadband Expansion Act" />
              </label>
              <label className="stack" style={{ gap: 4 }}>
                <span className="label">Issue area</span>
                <select value={issueId} onChange={(e) => setIssueId(e.target.value)}>
                  {ISSUE_CATALOG.map((i) => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </select>
              </label>
              <label className="stack" style={{ gap: 4 }}>
                <span className="label">Intensity / funding — {intensity}</span>
                <input type="range" min={10} max={100} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
              </label>
              <label className="stack" style={{ gap: 4 }}>
                <span className="label">Bill's ideological lean (economic) — {billIdeology.economic}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={billIdeology.economic}
                  onChange={(e) => setBillIdeology({ ...billIdeology, economic: Number(e.target.value) })}
                />
              </label>
              <button
                className="btn btn-primary btn-block"
                disabled={!title.trim() || !canProposeMore}
                title={!canProposeMore ? `Session capacity reached — advance a week to reach the next session` : undefined}
                onClick={() => {
                  const ok = proposeBill(title.trim(), issueId, intensity, billIdeology);
                  if (ok) {
                    setTitle("");
                    setBlockedMessage(null);
                  } else {
                    setBlockedMessage("This session's bill capacity is full — advance a week to open the next session.");
                  }
                }}
              >
                Introduce bill
              </button>
              {blockedMessage && <p className="faint">{blockedMessage}</p>}
            </div>
          </div>

          {activeBill && (
            <div className="card">
              <h3>{activeBill.title}</h3>
              <p className="faint">Projected whip count (legible, pre-vote):</p>
              <div className="row between">
                <span>Yea (projected)</span>
                <strong>{Math.round(projectedYea)} / {Math.round(totalSeats)}</strong>
              </div>
              <div className="meter" style={{ marginTop: 6 }}>
                <span style={{ width: `${Math.min(100, projectedShare * 100)}%` }} />
              </div>

              {projectedShare < 0.5 && activeBill.amendments.length === 0 && (
                <div className="card" style={{ marginTop: 12, background: "var(--bg-sunken)" }}>
                  <span className="badge badge-warn">Whip count is short</span>
                  <p className="faint" style={{ margin: "6px 0" }}>
                    The largest opposing faction will offer an amendment. Accepting waters the bill down (lower intensity,
                    pulled toward their position) but should improve your whip count.
                  </p>
                  <div className="row">
                    <button className="btn btn-sm" onClick={() => acceptAmendment(activeBill.id)}>Accept amendment</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => callVote(activeBill.id)}>Call the vote as-is</button>
                  </div>
                </div>
              )}

              {activeBill.amendments.length > 0 && (
                <p className="faint" style={{ marginTop: 8 }}>Amended: {activeBill.amendments[activeBill.amendments.length - 1].text}</p>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => callVote(activeBill.id)}>Call the vote</button>
                <button className="btn btn-ghost" onClick={() => setActiveBill(null)}>Dismiss</button>
              </div>
            </div>
          )}

          <div className="card">
            <h3>Bill history</h3>
            {bills.length === 0 && <p className="faint">No bills yet this term.</p>}
            <div className="stack" style={{ gap: 6 }}>
              {bills
                .slice()
                .reverse()
                .map((b) => (
                  <div key={b.id} className="row between">
                    <span onClick={() => (b.status === "voting" ? setActiveBill(b.id) : undefined)} style={{ cursor: b.status === "voting" ? "pointer" : "default" }}>
                      {b.title}
                    </span>
                    <span className={`badge ${b.status === "implemented" ? "badge-good" : b.status === "failed" ? "badge-danger" : ""}`}>{b.status}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
