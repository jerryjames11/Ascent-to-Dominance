import { useMemo, useState } from "react";
import { useGameStore } from "../state/gameStore";
import { SAMPLE_COUNTRIES } from "../data/sample-countries";
import { BACKSTORIES } from "../data/backstories";
import { WorldMapPicker } from "./WorldMapPicker";
import type { BackstoryId, Gender } from "../types/player";
import type { IdeologyPosition } from "../types/grid";
import { regionOptionsForCountry } from "../systems/gridSystem";

type Step = 0 | 1 | 2 | 3;

const SYSTEM_LABEL: Record<string, string> = {
  presidential: "Presidential republic",
  parliamentary: "Parliamentary",
  "semi-presidential": "Semi-presidential",
  "absolute-monarchy": "Absolute monarchy",
  "one-party-state": "One-party state",
};

export function CharacterCreation() {
  const createCharacter = useGameStore((s) => s.createCharacter);
  const [step, setStep] = useState<Step>(0);

  const [countryId, setCountryId] = useState("");
  const [homeRegionId, setHomeRegionId] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [age, setAge] = useState(38);
  const [backstoryId, setBackstoryId] = useState<BackstoryId>("lawyer");
  const [ideology, setIdeology] = useState<IdeologyPosition>({ economic: 0, social: 0, foreignPolicy: 0 });
  const [ideologyTouched, setIdeologyTouched] = useState(false);

  const country = useMemo(() => SAMPLE_COUNTRIES.find((c) => c.id === countryId), [countryId]);
  const regionOptions = useMemo(() => (country ? regionOptionsForCountry(country) : []), [country]);
  const backstory = useMemo(() => BACKSTORIES.find((b) => b.id === backstoryId)!, [backstoryId]);

  const effectiveHomeRegion = homeRegionId || regionOptions[0]?.id || "";
  const effectiveIdeology = ideologyTouched ? ideology : backstory.ideologyDefault;

  function canAdvance(): boolean {
    if (step === 0) return !!countryId;
    if (step === 1) return name.trim().length > 0 && age >= 18 && age <= 90 && !!effectiveHomeRegion;
    if (step === 2) return !!backstoryId;
    return true;
  }

  function handleCreate() {
    createCharacter({
      name: name.trim(),
      gender,
      age,
      countryId,
      homeRegionId: effectiveHomeRegion,
      backstoryId,
      ideology: effectiveIdeology,
    });
  }

  return (
    <div className="center-column">
      <h1>Begin a career</h1>
      <p className="muted">Step {step + 1} of 4</p>

      {step === 0 && (
        <div className="card stack">
          <h3>Where in the world?</h3>
          <p className="muted">
            Pick a country. It locks your political-system archetype — how you campaign, govern, and rise is shaped by this.
          </p>
          <WorldMapPicker selectedId={countryId} onSelect={(id) => { setCountryId(id); setHomeRegionId(""); }} />
          {country && (
            <div className="card" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
              <div className="row between">
                <strong>{country.name}</strong>
                <span className="badge">{SYSTEM_LABEL[country.systemType]}</span>
              </div>
              <p className="faint" style={{ margin: "4px 0 0" }}>
                {country.structure === "federal" ? "Federal" : "Unitary"} · {country.electoralSystem} · Institutional Strength{" "}
                {country.baselineInstitutionalStrength}
                {country.progressionMode !== "electoral-persuasion" &&
                  ` · ${country.progressionMode === "court-intrigue" ? "court-intrigue" : "party-patronage"} advancement, no elections`}
              </p>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="card stack">
          <h3>Who are you?</h3>
          <label className="stack" style={{ gap: 4 }}>
            <span className="label">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </label>
          <div className="grid-2">
            <label className="stack" style={{ gap: 4 }}>
              <span className="label">Gender</span>
              <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Nonbinary</option>
              </select>
            </label>
            <label className="stack" style={{ gap: 4 }}>
              <span className="label">Age</span>
              <input type="number" min={18} max={90} value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </label>
          </div>
          <p className="faint">Age affects office-eligibility minimums and how much career you realistically have left to build.</p>
          {regionOptions.length > 0 && (
            <label className="stack" style={{ gap: 4 }}>
              <span className="label">Home region — where you'll first run</span>
              <select value={effectiveHomeRegion} onChange={(e) => setHomeRegionId(e.target.value)}>
                {regionOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card stack">
          <h3>Backstory</h3>
          <div className="stack">
            {BACKSTORIES.map((b) => (
              <div key={b.id} className={`option-card ${backstoryId === b.id ? "selected" : ""}`} onClick={() => { setBackstoryId(b.id); setIdeologyTouched(false); }}>
                <strong>{b.name}</strong>
                <p className="faint" style={{ margin: "4px 0 8px" }}>{b.description}</p>
                <div className="row wrap">
                  {b.strengths.map((s) => (
                    <span key={s} className="badge badge-good">{s}</span>
                  ))}
                  {b.weaknesses.map((w) => (
                    <span key={w} className="badge badge-warn">{w}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card stack">
          <h3>Starting ideology</h3>
          <p className="muted">Your backstory suggests a default. Adjust if you want to play against type.</p>
          <IdeologySlider
            label="Economic"
            leftLabel="Left"
            rightLabel="Right"
            value={effectiveIdeology.economic}
            onChange={(v) => { setIdeologyTouched(true); setIdeology({ ...effectiveIdeology, economic: v }); }}
          />
          <IdeologySlider
            label="Social"
            leftLabel="Liberal"
            rightLabel="Conservative"
            value={effectiveIdeology.social}
            onChange={(v) => { setIdeologyTouched(true); setIdeology({ ...effectiveIdeology, social: v }); }}
          />
          <IdeologySlider
            label="Foreign policy"
            leftLabel="Dove"
            rightLabel="Hawk"
            value={effectiveIdeology.foreignPolicy}
            onChange={(v) => { setIdeologyTouched(true); setIdeology({ ...effectiveIdeology, foreignPolicy: v }); }}
          />
          {ideologyTouched && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setIdeologyTouched(false)}>
              Reset to backstory default
            </button>
          )}
        </div>
      )}

      <div className="row between" style={{ marginTop: 18 }}>
        <button className="btn" disabled={step === 0} onClick={() => setStep((s) => (s - 1) as Step)}>
          Back
        </button>
        {step < 3 ? (
          <button className="btn btn-primary" disabled={!canAdvance()} onClick={() => setStep((s) => (s + 1) as Step)}>
            Continue
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleCreate}>
            Start career
          </button>
        )}
      </div>
    </div>
  );
}

function IdeologySlider({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <span className="label">{label}</span>
      <input type="range" min={-100} max={100} value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="slider-labels">
        <span>{leftLabel}</span>
        <span>{Math.round(value)}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
