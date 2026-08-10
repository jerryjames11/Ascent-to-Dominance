# Rise to Power — Prototype (Phases 1–4)

Political career sim. Core loop: **announce candidacy → campaign → win/lose → serve, legislate,
appoint a cabinet, manage the world stage → announce again**. See
[rise-to-power-design-doc.md](../rise-to-power-design-doc.md) for full spec and
[HANDOFF.md](./HANDOFF.md) for the original Phase 1 build order. Phases 1 through 4 of the doc's
five-phase build order (Sec 21) are implemented; Phase 5 (Legacy/endgame scoring, full 190-country
data pass, non-electoral country modes) is not.

## Run it

```bash
npm install
npm run dev
```

## Structure

- `src/types/` — `grid.ts` and `country.ts` are the **locked** interfaces from the original
  handoff; everything else extends them (`player.ts`, `legislature.ts`, `campaign.ts`, `cabinet.ts`,
  `world.ts`, `authoritarian.ts`).
- `src/data/` — sample countries (US/UK/France/Germany/Japan), backstories, trait catalog, cabinet
  portfolio slots by office tier.
- `src/systems/` — pure game logic, no React: grid generation, polling, elections, campaign actions,
  legislature, traits, ideology drift, cabinet, world/AI-nations, tension track, diplomacy, war,
  authoritarian drift, coups.
- `src/state/gameStore.ts` — single Zustand store wiring every system together as a phase machine.
- `src/components/` — one screen per phase/tab.

## Implemented

**Phase 1 — core loop:** character creation, office ladder, Demographic Grid (region × segment
cells, mutated only through `GridWriter`, read only through noisy/lagged polls), campaign weekly
actions + opponent AI + election resolution (FPTP/PR/mixed-member/run-off), basic Legislature
(bill builder, legible whip projections, National Agenda), Profile (traits, Promise/Donor ledgers,
relationship web). Real time-in-office (weekly ticks, term limits, 13-week legislative sessions),
bill amendment negotiation, and Ideology Drift Tracker were added as Phase 1 gap-closing work.

**Phase 2 — depth:** Cabinet/Portfolio system (candidates drawn from the Relationship Web —
loyalist ally, co-opted rival, donor appointee, backstory-matched specialist — with loyalty that
evolves and portfolio effects wired into real systems: cheaper vote-whipping, bill-effect boosts,
scandal dampening); Donor/Promise Ledger tension (honoring a donor ask can auto-break a
conflicting promise); rising-challenger AI (a disaffected legislator can return as a named
opponent).

**Phase 3 — World layer:** national power stats (Economy/Military/Diplomacy/Stability/Innovation)
computed from grid + bills + cabinet; AI-run nations with leader archetypes driving a periodic
world-leader formula; Tension Track (five escalation stages, ideology-driven baseline, trade
suppression); diplomacy actions with real stat tradeoffs; War resolution (comparative-strength
war-turn formula, front/control track, per-demographic approval erosion, negotiated settlement
with Won/Lost/Quagmire/Peacemaker legacy tags). Progressive unlock: national legislature =
observer, executive = full control.

**Phase 4 — high-stakes systems:** live Institutional Strength spent by contextual authoritarian
actions (emergency powers, press censorship, postponed elections, court-packing, gerrymandering,
disqualifying opponents, term-limit removal, prosecuting rivals) with a ratchet effect (cheaper
each time, raises Opposition/Resistance) and off-ramps to rebuild it; live Military Loyalty fed by
the Defense/Interior cabinet appointment and mitigations (purge, budget increase, decentralize
command); a visible, multi-factor Coup Probability gauge and a full coup event sequence
(rally/negotiate/flee → fails/exile/imprisoned, each with real consequences and Legacy traits).

## Known simplifications

- Legacy/endgame scoring (Sec 15) is not built — the end screen shows raw career data, not the
  full multi-axis scoring and headline archetypes.
- Only the 5 Phase 1 sample countries exist; the full 190-country data pass and non-electoral
  country modes (court-intrigue monarchies, party-patronage one-party states) are Phase 5 scope.
- AI nations are drawn from that same 5-country pool rather than a populated rest-of-world.
