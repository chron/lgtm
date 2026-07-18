# Backlog game

A contained React + TypeScript vertical slice for the software-engineering deckbuilder. The first authored Cycle is playable end to end; the surrounding run screens remain a lightweight scaffold.

## Run it

```bash
bun install
bun run dev
```

Portless serves the game at [https://backlog.localhost](https://backlog.localhost). Use `bun run dev:plain` when a direct Vite port is more useful.

Useful checks:

```bash
bun run check
bun run build
```

`check` runs TypeScript, Oxlint, Oxfmt, Knip, and the Vitest suite.

## Current flow

`Title → Squad → Map → Cycle → Report → Map`

The first Cycle implements:

- a 12-card deck with duplicate Basics and three squad cards;
- draw, discard, reshuffle, Focus, and three-Day deadlines;
- two independently targetable Tasks with visible authored intents;
- Verified and Unverified Work, Review, Pitch In, Defects, and Tech Debt;
- immediate Morale damage, cancelled intents, exact Ship previews, and Cycle misses;
- Paul, Odin, Irene, and Madi's first-pass character cards and passives.

The map also routes to skeletal Event, Shop, and Retro screens. Card rewards are intentionally the next gameplay cut rather than a fake implementation hidden behind pretty cards.

## Architecture

- `src/domain/` owns serialisable content and typed game nouns.
- `src/game/rules.ts` owns pure calculations and exact previews.
- `src/game/gameReducer.ts` owns state transitions and consequence resolution.
- `src/screens/` contains route-sized UI. Components dispatch player intent; they do not resolve rules.
- `src/styles.css` holds the Live Canvas-inspired token layer and responsive game presentation.

The reducer is pure and serialisable so seeded randomness, saves, replays, and simulation tests can be added without replacing the rules seam.

## Styling

The project currently uses bespoke CSS rather than Tailwind. The approved visual direction already depends on chunky shadows, fanned cards, task-state selectors, and layered progress bars; a second styling dialect would add churn before it adds leverage. This can be revisited when the component vocabulary stabilises.

## Good next cuts

1. Add the three-card reward choice and Skip.
2. Tune the first Cycle from colleague playtests.
3. Add the Incident modifier and Tool reward.
4. Integrate the approved character-art pipeline.
