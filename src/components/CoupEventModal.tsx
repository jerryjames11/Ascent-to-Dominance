import { useGameStore } from "../state/gameStore";

// Coup event sequence — Sec 13. Warning window collapsed into this single decision card:
// the player chooses how to respond, and the outcome resolves immediately.
export function CoupEventModal() {
  const pendingCoupEvent = useGameStore((s) => s.pendingCoupEvent);
  const resolveCoup = useGameStore((s) => s.resolveCoup);

  if (!pendingCoupEvent) return null;
  const loyalPct = Math.round(pendingCoupEvent.loyalFraction * 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div className="card" style={{ maxWidth: 480, borderColor: "var(--danger)" }}>
        <span className="badge badge-danger">Coup attempt</span>
        <h2 style={{ marginTop: 10 }}>Intelligence confirms it — elements of the military are moving against you.</h2>
        <p className="muted">
          Roughly {loyalPct}% of the officer corps still answers to you. The next few hours decide whether you stay in power.
        </p>
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-block" onClick={() => resolveCoup("rally-loyal-forces")}>
            Rally loyal forces — stand and fight
          </button>
          <button className="btn btn-block" onClick={() => resolveCoup("negotiate")}>
            Negotiate a way through it
          </button>
          <button className="btn btn-danger btn-block" onClick={() => resolveCoup("flee")}>
            Flee — guarantees exile, avoids worse
          </button>
        </div>
      </div>
    </div>
  );
}
