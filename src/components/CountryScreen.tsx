import { useState } from "react";
import { useGameStore } from "../state/gameStore";

export function CountryScreen() {
  const country = useGameStore((s) => s.country);
  const grid = useGameStore((s) => s.grid);
  useGameStore((s) => s.gridVersion);
  const currentOffice = useGameStore((s) => s.currentOffice);
  const bills = useGameStore((s) => s.bills);
  const endTerm = useGameStore((s) => s.endTerm);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  if (!country || !grid || !currentOffice) return null;

  const nationalApproval = grid.aggregateApproval();
  const regionRows = grid.grid.regions
    .filter((r) => r.tier === "region")
    .map((r) => ({ name: r.name, approval: grid.aggregateApproval(r.id) }));

  const passedThisTerm = bills.filter((b) => b.status === "implemented").length;
  const failedThisTerm = bills.filter((b) => b.status === "failed").length;

  const idx = country.officeLadder.findIndex((o) => o.id === currentOffice.officeId);
  const nextOffice = country.officeLadder[idx + 1];

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
            <div className="row between">
              <span className="muted">Bills passed</span>
              <span>{passedThisTerm}</span>
            </div>
            <div className="row between">
              <span className="muted">Bills failed</span>
              <span>{failedThisTerm}</span>
            </div>
            <hr className="divider" />
            {!confirmingEnd ? (
              <button className="btn btn-block" onClick={() => setConfirmingEnd(true)}>
                End term
              </button>
            ) : (
              <div className="stack">
                <p className="faint">What's next?</p>
                <button className="btn btn-primary btn-block" onClick={() => endTerm("run-again")}>
                  Seek re-election — {currentOffice.title}
                </button>
                <button className="btn btn-block" disabled={!nextOffice} onClick={() => endTerm("run-next-tier")}>
                  {nextOffice ? `Run for ${nextOffice.title}` : "No higher office available yet"}
                </button>
                <button className="btn btn-danger btn-block" onClick={() => endTerm("retire")}>
                  Retire
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingEnd(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Cabinet</h3>
            <p className="faint">Appointment power and portfolios arrive in Phase 2.</p>
          </div>
        </div>
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
