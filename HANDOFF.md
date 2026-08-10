# Rise to Power — Phase 1 Handoff

## What exists
- `src/types/grid.ts` — Demographic Grid (Sec 8). Locked interface.
- `src/types/country.ts` — Country Schema (Sec 19). Locked interface.
- `src/data/sample-countries.ts` — US/UK/France/Germany/Japan, fully parameterized.

## Rule for every session
Reference `rise-to-power-design-doc.md` directly for spec. Don't re-derive
systems from scratch — the doc is source of truth.

## Build order
1. Character creation (Sec 4) — reads `CountrySchema` to lock system archetype.
2. Office ladder UI — walks `officeLadder[]` per country.
3. Campaign mechanics (Sec 7) — writes to `GridWriter`, reads via `PollResult`
   (never raw `GridCell` — enforce noisy/lagged polling at the UI boundary).
4. Basic Legislature (Sec 9) — reads grid for National Agenda panel,
   writes `BillGridEffect` on bill passage.
5. Profile (Sec 5) — Promise/Donor ledgers, relationship web.

## Do not build yet
World tab, War, Authoritarian Drift, Coup mechanics — Phases 3-4.

## Parallelization point
Once `grid.ts` and `country.ts` are stable and code compiles clean,
split into subagents:
- Agent A: Legislature bill-builder (Sec 9)
- Agent B: Campaign UI + weekly actions (Sec 7)
- Agent C: Profile + relationship web (Sec 5)

All three import only from `src/types/` — no agent redefines shared shapes.

## Explicitly deferred to chat, not Claude Code
- Flavor text generation rules (Sec 20)
- 190-country data pass (Sec 19) — extend `sample-countries.ts` array
- Leader archetype tuning (Sec 14)
