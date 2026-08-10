import { useState } from "react";
import { useGameStore, SESSION_LENGTH_WEEKS, SESSION_BILL_CAPACITY } from "../state/gameStore";
import { portfolioSlotsForTier, PORTFOLIO_EFFECT_DESCRIPTIONS } from "../data/portfolios";
import type { AppointeeCandidate } from "../types/cabinet";

const SOURCE_LABEL: Record<string, string> = {
  loyalist: "Loyalist ally",
  "co-opted-rival": "Co-opted rival",
  donor: "Donor appointee",
  specialist: "Backstory-matched specialist",
  generic: "Generic pick",
};

export function CountryScreen() {
  const country = useGameStore((s) => s.country);
  const grid = useGameStore((s) => s.grid);
  useGameStore((s) => s.gridVersion);
  const currentOffice = useGameStore((s) => s.currentOffice);
  const absoluteWeek = useGameStore((s) => s.absoluteWeek);
  const session = useGameStore((s) => s.session);
  const termsServedByOffice = useGameStore((s) => s.termsServedByOffice);
  const bills = useGameStore((s) => s.bills);
  const endTerm = useGameStore((s) => s.endTerm);
  const advanceServingWeek = useGameStore((s) => s.advanceServingWeek);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  if (!country || !grid || !currentOffice) return null;

  const nationalApproval = grid.aggregateApproval();
  const regionRows = grid.grid.regions
    .filter((r) => r.tier === "region")
    .map((r) => ({ name: r.name, approval: grid.aggregateApproval(r.id) }));

  const passedThisTerm = bills.filter((b) => b.status === "implemented").length;
  const failedThisTerm = bills.filter((b) => b.status === "failed").length;

  const officeRung = country.officeLadder.find((o) => o.id === currentOffice.officeId)!;
  const idx = country.officeLadder.findIndex((o) => o.id === currentOffice.officeId);
  const nextOffice = country.officeLadder[idx + 1];

  const termWeeks = officeRung.termLength * 52;
  const weeksIntoTerm = absoluteWeek - currentOffice.startedWeek;
  const termExpired = weeksIntoTerm >= termWeeks;
  const termProgressPct = Math.min(100, Math.round((weeksIntoTerm / termWeeks) * 100));

  const termsServed = termsServedByOffice[currentOffice.officeId] ?? 0;
  const reelectionBlocked = officeRung.termLimit !== null && termsServed >= officeRung.termLimit;

  const showChooser = confirmingEnd || termExpired;

  return (
    <div className="wide-column">
      <h1>{country.name}</h1>
      <p className="muted">
        {currentOffice.title} · {country.systemType.replace(/-/g, " ")} · {country.structure}
      </p>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3>National approval</h3>
            <div className="stat-tile" style={{ marginBottom: 12 }}>
              <span className="label">Population-weighted average</span>
              <div className="value">{nationalApproval.toFixed(1)}%</div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {regionRows.map((r) => (
                <div key={r.name}>
                  <div className="row between">
                    <span className="muted">{r.name}</span>
                    <span>{r.approval.toFixed(1)}%</span>
                  </div>
                  <div className="meter"><span style={{ width: `${r.approval}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Institutional baselines</h3>
            <div className="grid-3">
              <StatTile label="Institutional Strength" value={String(country.baselineInstitutionalStrength)} />
              <StatTile label="Coup Risk Ceiling" value={country.baselineCoupRiskCeiling} />
              <StatTile label="Party Discipline" value={country.partyDiscipline} />
            </div>
            <p className="faint" style={{ marginTop: 10 }}>
              Authoritarian drift and coup mechanics arrive in a later phase — these are the baselines they'll run against.
            </p>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3>This term</h3>
            <div className="row between">
              <span className="muted">Office</span>
              <span>{currentOffice.title}</span>
            </div>
            <div className="row between" style={{ marginTop: 6 }}>
              <span className="muted">Term progress</span>
              <span>
                week {Math.min(weeksIntoTerm, termWeeks)} / {termWeeks}
              </span>
            </div>
            <div className={`meter ${termExpired ? "warn" : ""}`} style={{ marginTop: 4, marginBottom: 10 }}>
              <span style={{ width: `${termProgressPct}%` }} />
            </div>
            <div className="row between">
              <span className="muted">Legislative session</span>
              <span className="faint">
                Session {(session?.index ?? 0) + 1} · {session?.billsProposedThisSession ?? 0}/{SESSION_BILL_CAPACITY} bills introduced
                {" "}
                (resets every {SESSION_LENGTH_WEEKS} weeks)
              </span>
            </div>
            <div className="row between">
              <span className="muted">Bills passed / failed</span>
              <span>
                {passedThisTerm} / {failedThisTerm}
              </span>
            </div>
            <hr className="divider" />

            {!termExpired && !showChooser && (
              <div className="stack">
                <button className="btn btn-primary btn-block" onClick={advanceServingWeek}>
                  Advance a week
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingEnd(true)}>
                  End term early
                </button>
              </div>
            )}

            {showChooser && (
              <div className="stack" style={{ marginTop: termExpired ? 0 : 10 }}>
                <p className="faint">{termExpired ? "Your term has ended. What's next?" : "What's next?"}</p>
                <button
                  className="btn btn-primary btn-block"
                  disabled={reelectionBlocked}
                  title={reelectionBlocked ? "Term limit reached for this office" : undefined}
                  onClick={() => endTerm("run-again")}
                >
                  {reelectionBlocked ? `Term limit reached — ${currentOffice.title}` : `Seek re-election — ${currentOffice.title}`}
                </button>
                <button className="btn btn-block" disabled={!nextOffice} onClick={() => endTerm("run-next-tier")}>
                  {nextOffice ? `Run for ${nextOffice.title}` : "No higher office available yet"}
                </button>
                <button className="btn btn-danger btn-block" onClick={() => endTerm("retire")}>
                  Retire
                </button>
                {!termExpired && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingEnd(false)}>
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          <CabinetCard tier={currentOffice.tier} />
        </div>
      </div>
    </div>
  );
}

function CabinetCard({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  const cabinet = useGameStore((s) => s.cabinet);
  const getCandidatesForSlot = useGameStore((s) => s.getCandidatesForSlot);
  const appointToPortfolio = useGameStore((s) => s.appointToPortfolio);
  const dismissAppointee = useGameStore((s) => s.dismissAppointee);
  const consultAppointee = useGameStore((s) => s.consultAppointee);
  const absoluteWeek = useGameStore((s) => s.absoluteWeek);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AppointeeCandidate[]>([]);

  const slots = portfolioSlotsForTier(tier);

  function openSlot(slotId: string) {
    setOpenSlotId(slotId);
    setCandidates(getCandidatesForSlot(slotId));
  }

  return (
    <div className="card">
      <h3>Cabinet</h3>
      <div className="stack" style={{ gap: 10 }}>
        {slots.map((slot) => {
          const appointee = cabinet.find((a) => a.slotId === slot.slotId);
          const canConsult = appointee && (appointee.lastConsultedWeek === null || absoluteWeek - appointee.lastConsultedWeek > 4);
          return (
            <div key={slot.slotId}>
              <div className="row between">
                <div>
                  <strong style={{ fontSize: "0.88rem" }}>{slot.title}</strong>
                  <p className="faint" style={{ margin: "2px 0 0" }}>{PORTFOLIO_EFFECT_DESCRIPTIONS[slot.portfolioId]}</p>
                </div>
                {!appointee && (
                  <button className="btn btn-sm" onClick={() => openSlot(slot.slotId)}>
                    Appoint
                  </button>
                )}
              </div>

              {appointee && (
                <div style={{ marginTop: 6 }}>
                  <div className="row between">
                    <span>
                      {appointee.name} <span className="faint">— {SOURCE_LABEL[appointee.source]}</span>
                    </span>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" disabled={!canConsult} onClick={() => consultAppointee(appointee.id)}>
                        Consult
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => dismissAppointee(appointee.id)}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 10, marginTop: 4 }}>
                    <div style={{ flex: 1 }}>
                      <span className="faint">Loyalty {Math.round(appointee.loyalty)}</span>
                      <div className={`meter ${appointee.loyalty < 30 ? "danger" : ""}`}><span style={{ width: `${appointee.loyalty}%` }} /></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="faint">Competence {Math.round(appointee.competence)}</span>
                      <div className="meter"><span style={{ width: `${appointee.competence}%` }} /></div>
                    </div>
                  </div>
                </div>
              )}

              {openSlotId === slot.slotId && (
                <div className="stack" style={{ marginTop: 8, gap: 6 }}>
                  {candidates.map((c, i) => (
                    <div key={i} className="option-card" onClick={() => { appointToPortfolio(slot.slotId, c); setOpenSlotId(null); }}>
                      <div className="row between">
                        <strong style={{ fontSize: "0.85rem" }}>{c.name}</strong>
                        <span className="badge">{SOURCE_LABEL[c.source]}</span>
                      </div>
                      <p className="faint" style={{ margin: "4px 0" }}>{c.flavor}</p>
                      <span className="faint">Loyalty {c.loyalty} · Competence {c.competence}</span>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpenSlotId(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <span className="label">{label}</span>
      <div className="value" style={{ fontSize: "1.1rem", textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}
