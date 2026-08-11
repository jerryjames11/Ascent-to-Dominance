import { useGameStore } from "../state/gameStore";

const WORLD_ACCESS_LABEL: Record<string, string> = {
  none: "No World access",
  observer: "Observer-level World influence",
  full: "Full World-stage control",
};

export function OfficeLadder() {
  const country = useGameStore((s) => s.country);
  const player = useGameStore((s) => s.player);
  const officeHistory = useGameStore((s) => s.officeHistory);
  const termsServedByOffice = useGameStore((s) => s.termsServedByOffice);
  const termLimitRemoved = useGameStore((s) => s.termLimitRemoved);
  const announceCandidacy = useGameStore((s) => s.announceCandidacy);
  const campaign = useGameStore((s) => s.campaign);
  const patronage = useGameStore((s) => s.patronage);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  if (!country || !player) return null;

  if (campaign || patronage) {
    const title = campaign?.officeTitle ?? patronage?.officeTitle;
    return (
      <div className="center-column">
        <h1>{country.name} — Office Ladder</h1>
        <div className="card">
          <p style={{ marginBottom: 10 }}>You're already in contention for {title}. Announcing again isn't possible mid-race.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab("campaign")}>
            Go to Campaign
          </button>
        </div>
      </div>
    );
  }

  const highestTierHeld = officeHistory.reduce((max, o) => Math.max(max, o.tier), 0);

  return (
    <div className="center-column">
      <h1>{country.name} — Office Ladder</h1>
      <p className="muted">
        {highestTierHeld === 0
          ? "Every career starts at the bottom. Announce your candidacy for the first rung."
          : `You've held office up to Tier ${highestTierHeld}. Climb further, or run again where you left off.`}
      </p>

      {officeHistory.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>Career so far</h3>
          <div className="stack">
            {officeHistory.map((o, i) => (
              <div key={i} className="row between">
                <span>{o.title}</span>
                <span className="faint">Tier {o.tier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stack">
        {country.officeLadder.map((office) => {
          const eligible = office.tier <= highestTierHeld + 1;
          const ageOk = player.age >= office.eligibilityRules.minAge;
          const termsServed = termsServedByOffice[office.id] ?? 0;
          const termLimited = office.termLimit !== null && termsServed >= office.termLimit && !termLimitRemoved[office.id];
          const canRun = eligible && ageOk && !termLimited;
          const disabledReason = !eligible
            ? "Climb the ladder in order first"
            : !ageOk
            ? "You don't meet the minimum age yet"
            : termLimited
            ? "Term limit reached for this office"
            : undefined;
          return (
            <div key={office.id} className="card">
              <div className="row between">
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <h3 style={{ margin: 0 }}>{office.title}</h3>
                    <span className="badge">Tier {office.tier}</span>
                    {termsServed > 0 && (
                      <span className="faint">
                        served {termsServed} term{termsServed > 1 ? "s" : ""}
                        {office.termLimit ? ` / ${office.termLimit}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="faint" style={{ margin: "6px 0 0" }}>
                    {office.termLength}-year term{office.termLimit ? `, ${office.termLimit}-term limit` : ", no term limit"} · min age {office.eligibilityRules.minAge}
                    {office.grantsAppointmentPower ? " · appointment power" : ""}
                  </p>
                  <p className="faint" style={{ margin: "2px 0 0" }}>{WORLD_ACCESS_LABEL[office.grantsWorldAccess]}</p>
                </div>
                <button className="btn btn-primary" disabled={!canRun} title={disabledReason} onClick={() => announceCandidacy(office.id)}>
                  Announce
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
