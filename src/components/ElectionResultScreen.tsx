import { useGameStore } from "../state/gameStore";

export function ElectionResultScreen() {
  const result = useGameStore((s) => s.lastElectionResult);
  const currentOffice = useGameStore((s) => s.currentOffice);
  const continueFromElectionResult = useGameStore((s) => s.continueFromElectionResult);

  if (!result) return null;
  const won = result.winnerId === "player";
  const player = result.candidates.find((c) => c.id === "player")!;
  const totalVotes = result.candidates.reduce((s, c) => s + c.totalVotes, 0);

  return (
    <div className="center-column">
      <h1>{won ? "You won." : "You lost."}</h1>
      <p className="muted">
        {result.runoffOccurred ? "After a run-off round. " : ""}
        {won && currentOffice ? `You are now ${currentOffice.title}.` : "The campaign ends here — but a career doesn't."}
      </p>

      <div className="card">
        <h3>Final tally</h3>
        <div className="stack" style={{ gap: 10 }}>
          {result.candidates.map((c) => (
            <div key={c.id}>
              <div className="row between">
                <span style={{ fontWeight: c.id === "player" ? 700 : 400 }}>{c.name}</span>
                <span className="faint">{(c.voteShare * 100).toFixed(1)}%{c.regionUnitsWon ? ` · ${c.regionUnitsWon} units` : ""}</span>
              </div>
              <div className={`meter ${c.id === result.winnerId ? "" : "warn"}`} style={{ marginTop: 4 }}>
                <span style={{ width: `${Math.max(1, c.voteShare * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 10 }}>
          {Math.round(totalVotes).toLocaleString()} votes cast · you took {(player.voteShare * 100).toFixed(1)}%
        </p>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={continueFromElectionResult}>
        {won ? "Take office" : "Continue"}
      </button>
    </div>
  );
}
