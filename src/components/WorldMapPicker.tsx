import { useState } from "react";
import { SAMPLE_COUNTRIES } from "../data/sample-countries";
import { COUNTRY_MAP_POSITIONS, projectToMap, MAP_VIEWBOX } from "../data/countryMapPositions";
import type { CountrySchema } from "../types/country";

const SYSTEM_LABEL: Record<string, string> = {
  presidential: "Presidential republic",
  parliamentary: "Parliamentary",
  "semi-presidential": "Semi-presidential",
  "absolute-monarchy": "Absolute monarchy",
  "one-party-state": "One-party state",
};

const CONTINENT_LABEL: Record<string, string> = {
  "north-america": "North America",
  "south-america": "South America",
  europe: "Europe",
  africa: "Africa",
  "middle-east": "Middle East",
  asia: "Asia",
};

// Rough, stylized continent silhouettes — decorative backdrop only. Country markers are placed
// independently by real lon/lat, so imprecision here is purely cosmetic.
const CONTINENT_PATHS: string[] = [
  "M70,60 L130,48 L180,68 L222,58 L262,92 L282,132 L272,172 L242,192 L222,232 L202,262 L182,250 L166,220 L150,198 L120,210 L90,190 L58,158 L48,108 Z",
  "M340,288 L382,278 L402,310 L412,362 L400,412 L380,452 L360,472 L338,452 L328,400 L318,350 L328,308 Z",
  "M470,58 L512,44 L552,50 L572,80 L576,110 L560,140 L540,150 L520,144 L500,156 L480,140 L464,110 L460,80 Z",
  "M480,168 L532,158 L572,174 L592,220 L596,280 L580,340 L560,390 L530,410 L510,390 L494,340 L480,290 L470,230 Z",
  "M580,174 L620,168 L650,190 L640,220 L610,230 L590,210 Z",
  "M620,150 L680,98 L750,68 L820,58 L882,78 L922,110 L942,150 L922,190 L900,222 L860,210 L840,242 L820,272 L790,292 L760,282 L740,250 L710,230 L680,220 L650,200 L630,180 Z",
];

export function WorldMapPicker({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const countryById = new Map(SAMPLE_COUNTRIES.map((c) => [c.id, c]));

  const byContinent = new Map<string, CountrySchema[]>();
  for (const pos of COUNTRY_MAP_POSITIONS) {
    const country = countryById.get(pos.id);
    if (!country) continue;
    const list = byContinent.get(pos.continent) ?? [];
    list.push(country);
    byContinent.set(pos.continent, list);
  }

  return (
    <div className="stack">
      <div className="world-map-frame">
        <svg viewBox={MAP_VIEWBOX} className="world-map-svg" role="img" aria-label="World map, click a country to select it">
          {CONTINENT_PATHS.map((d, i) => (
            <path key={i} d={d} className="world-map-land" />
          ))}
          {COUNTRY_MAP_POSITIONS.map((pos) => {
            const country = countryById.get(pos.id);
            if (!country) return null;
            const { x, y } = projectToMap(pos.lon, pos.lat);
            const isSelected = selectedId === pos.id;
            const isHovered = hovered === pos.id;
            return (
              <g
                key={pos.id}
                transform={`translate(${x}, ${y})`}
                className="world-map-marker-group"
                onMouseEnter={() => setHovered(pos.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(pos.id)}
                style={{ cursor: "pointer" }}
              >
                <circle r={isSelected ? 9 : 6} className={`world-map-marker ${isSelected ? "selected" : ""}`} />
                {(isHovered || isSelected) && (
                  <text x={10} y={4} className="world-map-label">
                    {country.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {[...byContinent.entries()].map(([continent, countries]) => (
          <div key={continent}>
            <span className="label">{CONTINENT_LABEL[continent]}</span>
            <div className="row wrap" style={{ marginTop: 6 }}>
              {countries.map((c) => (
                <button
                  key={c.id}
                  className={`btn btn-sm ${selectedId === c.id ? "btn-primary" : ""}`}
                  onClick={() => onSelect(c.id)}
                  title={`${SYSTEM_LABEL[c.systemType]} · ${c.structure}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
