import { useMemo, useState } from "react";
import { useGameStore, SESSION_LENGTH_WEEKS, SESSION_BILL_CAPACITY } from "../state/gameStore";
import { portfolioSlotsForTier, PORTFOLIO_EFFECT_DESCRIPTIONS } from "../data/portfolios";
import { OFF_RAMPS, availableActions, ratchetedCost } from "../systems/authoritarianSystem";
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
  const termLimitRemoved = useGameStore((s) => s.termLimitRemoved);
  const electionPostponedWeeks = useGameStore((s) => s.electionPostponedWeeks);
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

  const termWeeks = officeRung.termLength * 52 + electionPostponedWeeks;
  const weeksIntoTerm = absoluteWeek - currentOffice.startedWeek;
  const termExpired = weeksIntoTerm >= termWeeks;
  const termProgressPct = Math.min(100, Math.round((weeksIntoTerm / termWeeks) * 100));

  const termsServed = termsServedByOffice[currentOffice.officeId] ?? 0;
  const reelectionBlocked = officeRung.termLimit !== null && termsServed >= officeRung.termLimit && !termLimitRemoved[currentOffice.officeId];

  const showChooser = confirmingEnd || termExpired;

  return (
    <div className="wide-column">
      <h1>{country.name}</h1>
      <p className="muted">
        {currentOffice.title} · {country.systemType.replace(/-/g, " ")} · {country.structure}
        {electionPostponedWeeks > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>election postponed</span>}
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

          <AuthorityCard country={country} />
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

function AuthorityCard({ country }: { country: NonNullable<ReturnType<typeof useGameStore.getState>["country"]> }) {
  const institutionalStrength = useGameStore((s) => s.institutionalStrength);
  const militaryLoyalty = useGameStore((s) => s.militaryLoyalty);
  const oppositionStrength = useGameStore((s) => s.oppositionStrength);
  const authoritarianActionsTaken = useGameStore((s) => s.authoritarianActionsTaken);
  const decreePower = useGameStore((s) => s.decreePower);
  const commandDecentralized = useGameStore((s) => s.commandDecentralized);
  const getTriggerState = useGameStore((s) => s.getTriggerState);
  const getCoupProbability = useGameStore((s) => s.getCoupProbability);
  const takeAuthoritarianAction = useGameStore((s) => s.takeAuthoritarianAction);
  const takeOffRamp = useGameStore((s) => s.takeOffRamp);
  const purgeOfficerCorps = useGameStore((s) => s.purgeOfficerCorps);
  const increaseMilitaryBudget = useGameStore((s) => s.increaseMilitaryBudget);
  const decentralizeCommand = useGameStore((s) => s.decentralizeCommand);
  const gridVersion = useGameStore((s) => s.gridVersion);
  const absoluteWeek = useGameStore((s) => s.absoluteWeek);
  const cabinet = useGameStore((s) => s.cabinet);
  const legislature = useGameStore((s) => s.legislature);
  const activeWar = useGameStore((s) => s.activeWar);
  const aiNations = useGameStore((s) => s.aiNations);
  const tensionByNationId = useGameStore((s) => s.tensionByNationId);

  const [expanded, setExpanded] = useState(false);

  // These read live store state internally (Sec 12/13 formulas) — re-derive whenever any input
  // they depend on could have changed, not just when the memoized getter functions themselves do.
  const triggerState = useMemo(
    () => getTriggerState(),
    [getTriggerState, gridVersion, absoluteWeek, legislature, activeWar, institutionalStrength]
  );
  const actions = useMemo(() => availableActions(triggerState), [triggerState]);
  const coupProbability = useMemo(
    () => getCoupProbability(),
    [getCoupProbability, institutionalStrength, militaryLoyalty, oppositionStrength, cabinet, legislature, aiNations, tensionByNationId, gridVersion]
  );

  return (
    <div className="card">
      <div className="row between">
        <h3 style={{ margin: 0 }}>Authority</h3>
        <span className="badge">{country.baselineCoupRiskCeiling} ceiling</span>
      </div>
      <div className="grid-3" style={{ marginTop: 10 }}>
        <MeterStat label="Institutional Strength" value={institutionalStrength} warnBelow={40} />
        <MeterStat label="Military Loyalty" value={militaryLoyalty} warnBelow={40} />
        <MeterStat label="Coup Probability" value={coupProbability} warnAbove={30} />
      </div>
      <p className="faint" style={{ marginTop: 6 }}>
        Opposition/Resistance {Math.round(oppositionStrength)} · {authoritarianActionsTaken} authoritarian action{authoritarianActionsTaken === 1 ? "" : "s"} taken
        {decreePower > 0 ? ` · ${decreePower} decree power available` : ""}
      </p>

      <button className="btn btn-ghost btn-sm" onClick={() => setExpanded((v) => !v)} style={{ marginTop: 6 }}>
        {expanded ? "Hide" : "Show"} actions
      </button>

      {expanded && (
        <div className="stack" style={{ marginTop: 10, gap: 14 }}>
          <div>
            <span className="label">Available now (contextual)</span>
            {actions.length === 0 && <p className="faint">No triggers active — no temptations on the table right now.</p>}
            <div className="stack" style={{ gap: 6, marginTop: 6 }}>
              {actions.map((a) => {
                const cost = ratchetedCost(a.baseInstitutionalStrengthCost, authoritarianActionsTaken);
                const disabled = institutionalStrength < cost;
                return (
                  <div key={a.id} className="row between">
                    <div>
                      <strong style={{ fontSize: "0.85rem" }}>{a.label}</strong>
                      <p className="faint" style={{ margin: "2px 0 0" }}>{a.description}</p>
                    </div>
                    <button className="btn btn-sm btn-danger" disabled={disabled} title={`-${cost} Institutional Strength`} onClick={() => takeAuthoritarianAction(a.id)}>
                      -{cost} IS
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label">Off-ramps</span>
            <div className="stack" style={{ gap: 6, marginTop: 6 }}>
              {OFF_RAMPS.map((o) => (
                <div key={o.id} className="row between">
                  <div>
                    <strong style={{ fontSize: "0.85rem" }}>{o.label}</strong>
                    <p className="faint" style={{ margin: "2px 0 0" }}>{o.description}</p>
                  </div>
                  <button className="btn btn-sm" onClick={() => takeOffRamp(o.id)}>
                    +{o.institutionalStrengthGain} IS
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Military loyalty mitigations</span>
            <div className="row wrap" style={{ marginTop: 6 }}>
              <button className="btn btn-sm" onClick={purgeOfficerCorps} title="Boosts loyalty, spends Institutional Strength — can backfire">
                Purge officer corps
              </button>
              <button className="btn btn-sm" onClick={increaseMilitaryBudget} title="Boosts loyalty, costs economy">
                Increase military budget
              </button>
              <button className="btn btn-sm" disabled={commandDecentralized} onClick={decentralizeCommand} title="Reduces any future coup's effectiveness">
                {commandDecentralized ? "Command decentralized" : "Decentralize command"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function MeterStat({ label, value, warnBelow, warnAbove }: { label: string; value: number; warnBelow?: number; warnAbove?: number }) {
  const warn = (warnBelow !== undefined && value < warnBelow) || (warnAbove !== undefined && value > warnAbove);
  return (
    <div className="stat-tile">
      <span className="label">{label}</span>
      <div className="value" style={{ fontSize: "1.1rem" }}>{Math.round(value)}</div>
      <div className={`meter ${warn ? "danger" : ""}`} style={{ marginTop: 4 }}>
        <span style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
