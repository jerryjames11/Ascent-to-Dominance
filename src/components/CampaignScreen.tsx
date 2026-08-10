import { useMemo, useState } from "react";
import { useGameStore } from "../state/gameStore";
import { ACTION_DEFS, TOTAL_CAMPAIGN_WEEKS, WEEKLY_ACTION_POINTS } from "../systems/campaignSystem";
import type { WeeklyActionType } from "../types/campaign";
import type { AgeBracket, UrbanRural } from "../types/grid";
import type { ActionTarget } from "../systems/campaignSystem";
import { ISSUE_CATALOG } from "../types/legislature";

const STAGE_LABEL: Record<string, string> = {
  exploratory: "Exploratory",
  primary: "Primary / Nomination",
  general: "General Campaign",
  "final-stretch": "Final Stretch",
};

const AGE_OPTIONS: AgeBracket[] = ["18-29", "30-44", "45-64", "65+"];
const UR_OPTIONS: UrbanRural[] = ["urban", "suburban", "rural"];

export function CampaignScreen() {
  const campaign = useGameStore((s) => s.campaign);
  const grid = useGameStore((s) => s.grid);
  useGameStore((s) => s.gridVersion); // subscribe for re-render on grid mutation
  const country = useGameStore((s) => s.country);
  const runAction = useGameStore((s) => s.runAction);
  const advanceWeek = useGameStore((s) => s.advanceWeek);
  const answerEvent = useGameStore((s) => s.answerEvent);
  const setPollTier = useGameStore((s) => s.setPollTier);
  const pollTier = useGameStore((s) => s.pollTier);

  const [regionId, setRegionId] = useState<string>("");
  const [ageBracket, setAgeBracket] = useState<string>("");
  const [urbanRural, setUrbanRural] = useState<string>("");
  const [positionIssueId, setPositionIssueId] = useState<string>(ISSUE_CATALOG[0].id);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);

  const scopeRegionNames = useMemo(() => {
    if (!grid || !campaign) return [];
    return campaign.scopeRegionIds.map((id) => grid.grid.regions.find((r) => r.id === id)?.name ?? id);
  }, [grid, campaign]);

  if (!campaign || !grid || !country) return null;

  const weeksElapsed = TOTAL_CAMPAIGN_WEEKS - campaign.weeksRemaining;
  const progressPct = Math.round((weeksElapsed / TOTAL_CAMPAIGN_WEEKS) * 100);
  const multiRegion = campaign.scopeRegionIds.length > 1;

  function buildTarget(needsTarget: boolean): ActionTarget {
    if (!needsTarget) return {};
    const target: ActionTarget = {};
    if (multiRegion && regionId) target.regionId = regionId;
    else if (!multiRegion) target.regionId = campaign!.scopeRegionIds[0];
    const filter: Record<string, string> = {};
    if (ageBracket) filter.ageBracket = ageBracket;
    if (urbanRural) filter.urbanRural = urbanRural;
    if (Object.keys(filter).length > 0) target.segmentFilter = filter as ActionTarget["segmentFilter"];
    return target;
  }

  function handleAction(type: WeeklyActionType) {
    const def = ACTION_DEFS.find((d) => d.type === type)!;
    const target = buildTarget(def.needsTarget);
    if (type === "position") target.issueId = positionIssueId;
    const outcome = runAction(type, target);
    setLastOutcome(outcome);
  }

  const scopePoll = campaign.polls.find((p) => p.regionId === "__scope__") ?? campaign.polls[0];

  return (
    <div className="wide-column">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h1 style={{ marginBottom: 0 }}>Campaign — {campaign.officeTitle}</h1>
        <span className="badge">{STAGE_LABEL[campaign.stage]}</span>
      </div>
      <p className="muted">
        {campaign.weeksRemaining} weeks to election day · running in {scopeRegionNames.join(", ")}
      </p>
      <div className="meter" style={{ marginBottom: 20 }}>
        <span style={{ width: `${progressPct}%` }} />
      </div>

      {campaign.pendingEvent && (
        <div className="card" style={{ borderColor: "var(--warn)", marginBottom: 14 }}>
          <span className="badge badge-warn">Campaign event</span>
          <h3 style={{ marginTop: 8 }}>{campaign.pendingEvent.description}</h3>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => answerEvent("deny")}>Deny it</button>
            <button className="btn" onClick={() => answerEvent("apologize")}>Apologize</button>
            <button className="btn" onClick={() => answerEvent("counterattack")}>Counterattack</button>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3>This week — {campaign.apRemaining}/{WEEKLY_ACTION_POINTS} action points left</h3>
            {(multiRegion || true) && (
              <div className="grid-3" style={{ marginBottom: 10 }}>
                {multiRegion && (
                  <label className="stack" style={{ gap: 4 }}>
                    <span className="label">Region</span>
                    <select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                      <option value="">All regions</option>
                      {campaign.scopeRegionIds.map((id) => (
                        <option key={id} value={id}>
                          {grid.grid.regions.find((r) => r.id === id)?.name ?? id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="stack" style={{ gap: 4 }}>
                  <span className="label">Age group</span>
                  <select value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)}>
                    <option value="">Any</option>
                    {AGE_OPTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="label">Setting</span>
                  <select value={urbanRural} onChange={(e) => setUrbanRural(e.target.value)}>
                    <option value="">Any</option>
                    {UR_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="label">Position issue (for "Stake a position")</span>
                  <select value={positionIssueId} onChange={(e) => setPositionIssueId(e.target.value)}>
                    {ISSUE_CATALOG.map((i) => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="stack">
              {ACTION_DEFS.map((def) => {
                const disabled = campaign.apRemaining < def.apCost || campaign.resources.money < def.moneyCost;
                return (
                  <div key={def.type} className="row between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        <strong style={{ fontSize: "0.88rem" }}>{def.label}</strong>
                        <span className="faint">{def.apCost} AP{def.moneyCost ? ` · $${def.moneyCost.toLocaleString()}` : ""}</span>
                      </div>
                      <p className="faint" style={{ margin: "2px 0 0" }}>{def.description}</p>
                    </div>
                    <button className="btn btn-sm" disabled={disabled} onClick={() => handleAction(def.type)}>
                      Do it
                    </button>
                  </div>
                );
              })}
            </div>
            {lastOutcome && (
              <p className="faint" style={{ marginTop: 10 }}>
                Last: {lastOutcome}
              </p>
            )}
          </div>

          <button
            className="btn btn-primary btn-block"
            disabled={!!campaign.pendingEvent}
            onClick={() => {
              setLastOutcome(null);
              advanceWeek();
            }}
          >
            Advance to next week
          </button>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Resources</h3>
            <div className="stack" style={{ gap: 10 }}>
              <ResourceRow label="Money" value={`$${Math.round(campaign.resources.money).toLocaleString()}`} />
              <MeterRow label="Staff quality" value={campaign.resources.staffQuality} />
              <MeterRow label="Political capital" value={campaign.resources.politicalCapital} />
              <MeterRow label="Stamina" value={campaign.resources.stamina} warnBelow={30} />
            </div>
          </div>

          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Polling</h3>
              <select value={pollTier} onChange={(e) => setPollTier(e.target.value as typeof pollTier)}>
                <option value="low">Free tracker (noisy)</option>
                <option value="mid">Mid-tier pollster</option>
                <option value="high">Premium pollster</option>
              </select>
            </div>
            {scopePoll ? (
              <div style={{ marginTop: 10 }}>
                <div className="row between">
                  <span className="muted">Reported approval</span>
                  <strong>{scopePoll.reportedApproval}% ± {scopePoll.confidenceBand}</strong>
                </div>
                <div className="meter" style={{ marginTop: 6 }}>
                  <span style={{ width: `${scopePoll.reportedApproval}%` }} />
                </div>
                <p className="faint" style={{ marginTop: 6 }}>Sampled week {scopePoll.sampledAtWeek} · {scopePoll.pollsterTier} tier</p>
              </div>
            ) : (
              <p className="faint">No polling yet — advance a week.</p>
            )}
          </div>

          <div className="card">
            <h3>Opponents</h3>
            <div className="stack" style={{ gap: 10 }}>
              {campaign.opponents.map((o) => (
                <div key={o.id}>
                  <div className="row between">
                    <span>{o.name}</span>
                    <span className="faint">{o.archetype.replace(/-/g, " ")}</span>
                  </div>
                  <div className="meter" style={{ marginTop: 4 }}>
                    <span style={{ width: `${o.pollingSupport}%` }} />
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

function ResourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MeterRow({ label, value, warnBelow }: { label: string; value: number; warnBelow?: number }) {
  const warn = warnBelow !== undefined && value < warnBelow;
  return (
    <div>
      <div className="row between">
        <span className="muted">{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className={`meter ${warn ? "warn" : ""}`} style={{ marginTop: 4 }}>
        <span style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
