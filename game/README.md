# LGTM! game

A contained React + TypeScript vertical slice for the software-engineering deckbuilder. The first authored Cycle is playable end to end; the surrounding run screens remain a lightweight scaffold.

## Run it

```bash
bun install
bun run dev
```

Portless serves the game at [https://lgtm.localhost](https://lgtm.localhost). Use `bun run dev:plain` when a direct Vite port is more useful.

Useful checks:

```bash
bun run check
bun run build
```

`check` runs TypeScript, Oxlint, Oxfmt, Knip, and the Vitest suite.

## Local run logs

While the Vite dev server is running, every reducer action is written to an
append-only JSONL file in `telemetry/run-<run-id>.jsonl`. A fresh file is
created for every `START_RUN`; entries include the action, sequence number,
screen transition, whether the action changed state, and the complete resulting
game state. The `telemetry/` directory is local-only and ignored by Git.

The client batches writes briefly and flushes when the tab is hidden or closed.
The logger is best-effort and development-only, so a missing sink never affects
gameplay or production builds.

## Scripted balance runs

Run the six current build families through seeded, headless acts using the real
game reducer:

```bash
bun run playtest
bun run playtest --runs 100 --json telemetry/playtest-latest.json
bun run playtest --scenario automation --deck showcase
```

The default uses the ordinary Starter deck for a fair comparison with human
runs. `--deck showcase` adds six build-defining cards to test an assembled
engine. The terminal dashboard compares win rate, Days, ending Morale and Tech
Debt, cards played per Day, peak Chain, installed Scripts, prevented damage, and
dead hands. `--policy careful` and `--policy velocity` provide intentionally
imperfect alternate pilots. The JSON option includes every raw run for deeper
analysis or future charts.

### Human calibration runs

Play normally in the development build; each run is already recorded under
`telemetry/`. To replay a specific generated act, add a seed to the ordinary game
URL, for example `https://lgtm.localhost/?seed=4200`. Every New Run started
while that parameter remains uses the same act.

After completing a few runs, render them through the same dashboard:

```bash
bun run playtest:human --latest 3
bun run playtest:human --latest 3 --json telemetry/human-latest.json
```

Only completed runs are included by default. Use `--include-incomplete` while
debugging, or `--file telemetry/run-….jsonl` to select an exact run.

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
