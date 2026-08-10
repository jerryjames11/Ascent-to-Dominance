# Rise to Power — Phase 1 Prototype

Political career sim. Core loop: **announce candidacy → campaign → win/lose → serve & legislate →
announce again**. See [rise-to-power-design-doc.md](../rise-to-power-design-doc.md) for full spec
and [HANDOFF.md](./HANDOFF.md) for build order/scope. This is Phase 1 only — World, War,
Authoritarian Drift, and Coup mechanics are intentionally not built yet.

## Run it

```bash
npm install
npm run dev
```

## Structure

- `src/types/` — `grid.ts` and `country.ts` are the **locked** interfaces from the handoff; everything
  else (`player.ts`, `legislature.ts`, `campaign.ts`) extends them.
- `src/data/` — sample countries (US/UK/France/Germany/Japan), backstories, trait catalog.
- `src/systems/` — pure game logic: grid generation, polling, elections, campaign actions, legislature
  (bill whipping, National Agenda). No React here.
- `src/state/gameStore.ts` — single Zustand store wiring the systems together as a phase machine.
- `src/components/` — one screen per phase/tab.

## Implemented (Phase 1 scope)

- Character creation (Sec 4): backstory, country, home region, ideology sliders.
- Office ladder per country, walked in order (Sec 6).
- Demographic Grid (Sec 8): region × segment cells, generated per country, mutated only through
  `GridWriter`, read by the player only through noisy/lagged `PollResult` polls.
- Campaign (Sec 7): weekly actions with AP/money/stamina costs, diminishing returns, opponent AI,
  random events, election resolution (FPTP electoral-college-style, PR/mixed-member popular vote,
  run-off with redistribution).
- Legislature (Sec 9): bill builder, legible pre-vote whip projections (Sec 14 formula), seat-weighted
  vote resolution, National Agenda panel, bill effects write back to the grid. Chamber scales to the
  office tier held (a mayor sits on a 9-seat council, not the national legislature).
- Profile (Sec 5): traits, Promise Ledger (tied to campaign positioning, checked against passed bills),
  Donor Ledger, relationship web, career timeline.
