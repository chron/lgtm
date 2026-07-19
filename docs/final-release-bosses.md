# Final Release Bosses

This document is the design contract for LGTM's Final Release encounters. A boss is a lovingly antagonistic executive stakeholder and a distinct strategic test—not a normal Cycle with larger requirement numbers.

## Catalogue architecture

### LOCKED

- One boss is selected deterministically from the eligible boss catalogue when a run starts.
- The selected boss is revealed immediately after squad selection and remains visible at the top of the map.
- The preview names the stakeholder, project, and strategic warning. Players must be able to build toward the final test.
- Boss identity, project definition, phase transitions, intents, spawned Tasks, launch policy, presentation assets, and Retro lines belong to a `BossDefinition`-style catalogue entry.
- Shared reducers resolve phase triggers and typed boss effects. Do not branch on `mateja` or `tristan` in the main game reducer.
- Adding a future boss should require a definition, content tests, art, and focused mechanics only when that boss introduces a genuinely new reusable effect.
- A run sees exactly one Final Release. It grants no ordinary card or Tool reward.

The first pool contains **Mateja — The Weekend Pivot** and **Tristan — The Significance Test**.

## Shared encounter shape

Every boss uses three visible phases:

1. **Build** — establish the main project and survive the opening cadence.
2. **Stakeholder Review** — trigger the boss's signature complication once the project crosses its progress threshold.
3. **Launch Window** — all required Work is complete; clean up, defend, and choose when to ship before time expires.

Phase transitions receive ceremony, a boss reaction, and an exact mechanical summary. They do not consume a Day unless the boss definition explicitly says so.

Bosses use a longer Cycle—provisionally 8–10 Days—so mature Chain, automation, Review, Block, and card-storm builds have time to express themselves. Exact requirements and timings remain **PROVISIONAL** until full-run simulations exist.

## Launch policy

### LOCKED first pass

- Completing every required Work bar opens the Launch Window; it does not silently end the encounter.
- The player explicitly chooses when to ship and sees the resulting Defects, Morale loss, and outcome before confirming.
- **0 Defects:** clean victory.
- **1 Defect:** victory if the ordinary shipping Morale loss is survivable; the Retro records Known Issues.
- **2 or more Defects:** clearly previewed **Technically Shipped** defeat, even if Morale would otherwise survive.
- Reaching 0 Morale or missing the final launch deadline is defeat.
- Boss-spawned required Tasks must be shipped before the Launch Window can open. Optional Bounty Tasks do not block it.

This makes Review and shipping quality matter without requiring literal perfection. The threshold is a balance lever, but the preview and causal report are non-negotiable.

## Mateja — The Weekend Pivot

### Preview

> **FINAL REVIEW: MATEJA**  
> Expect rapid Scope and helpful Unverified Work.

### Project

> **DATUM: MONDAY LAUNCH**

Mateja contributes surprising amounts of implementation while continuously discovering that the product is larger than previously understood. The player decides which chaos is useful and which must be Stunned.

### Signature effects

- **I Built This Bit** — add a large packet of Unverified AI Assisted Work to the incomplete requirement with the most Work remaining. This is genuinely helpful, can complete the requirement, and creates Review fuel and shipping risk.
- **One More Thing** — apply a large Scope increase to the incomplete requirement with the least Work remaining.
- **Actually, It's a Platform** — at Stakeholder Review, spawn the required **Make It a Platform** Task with Backend and Infra requirements.
- **Demo Tomorrow** — heavy telegraphed Crunch.

### Provisional cadence

| Phase | Pressure |
| --- | --- |
| Build | Helpful Unverified Work → large Scope → Crunch. |
| Stakeholder Review | Spawn **Make It a Platform**, then repeat stronger Vibe Work and Scope effects. |
| Launch Window | Alternating heavy Crunch and final Scope pressure until shipment. |

Mateja tests burst, adaptation, and cleanup. Paul and Madi can amplify the speed; Odin and Matt can turn his contribution into safe progress; control decks must decide not to Stun the helpful intent.

The encounter must remain beatable without an AI or Review specialist through the shared Review Basic, safer Flexible cards, Tools, and intentional target order. It should not hard-counter a squad merely because its fantasy differs.

### Retro voice

- Victory: `shipped before he invented a third product`
- Known Issues: `datum has entered its iterate-in-public era`
- Defeat: `the demo was extremely compelling, technically`

## Tristan — The Significance Test

### Preview

> **FINAL REVIEW: TRISTAN**  
> Expect Validation Tasks and distributed pressure.

### Project

> **PROVE THE FRAUD MODEL**

Tristan keeps asking reasonable questions whose answers happen to require another segment, sample, or chart. The main project remains central, but Validation Tasks prevent a pure single-target race.

### Signature effects

- **Need More Data** — increase Scope across every open Validation Task; if none exist, increase the main Backend requirement.
- **Check the Outliers** — apply Regression to the most advanced open requirement.
- **Segment the Results** — spawn a small required Validation Task. The first-pass pool contains **Check False Positives** and **Segment Breakdown**.
- **Readout Tomorrow** — telegraphed Crunch that scales with the number of unfinished Validation Tasks.
- **Confidence Gate** — the Final Release cannot enter its Launch Window until every required Validation Task ships.

### Provisional cadence

| Phase | Pressure |
| --- | --- |
| Build | Need More Data → Check the Outliers → modest Crunch. |
| Stakeholder Review | Spawn the first Validation Task immediately, then a second at the later phase threshold. |
| Launch Window | Readout Tomorrow alternates with Regression until shipment. |

Tristan tests distribution, flexibility, and sequencing. Seb and Irene can cascade across the board; Levi can still dominate the main project but must decide when to break flow; Review and control builds protect carefully prepared progress.

Validation Tasks stay small enough that every squad can answer them. Their danger comes from timing and accumulating pressure, not from requiring one printed discipline or character mechanic.

### Retro voice

- Victory: `sample size: acceptable`
- Known Issues: `directionally significant`
- Defeat: `further research required`

## Difficulty contract

### LOCKED

- Final Release should be the hardest encounter in the act by a meaningful margin.
- A pile of individually strong cards without a coherent engine should often lose.
- A coherent build played thoughtfully should have a fair, legible route to victory; boss selection must not decide the run at squad select.
- Boss pressure scales through phase effects, intent cadence, launch quality, and limited time before simply inflating every requirement.
- Dangerous effects are telegraphed and explain themselves. Difficulty comes from competing priorities, not hidden rules.
- Preserve the possibility of broken builds crushing the boss. Raise boss pressure through playtesting before capping entertaining engines.

Initial balance should target a substantial failure rate in complete seeded-run simulations. Exact win-rate targets come after the automated playtest harness exists.

## Presentation and extensibility

- The map shows the selected boss portrait, project title, and one-line strategy warning from the start of the run.
- Entering Final Release receives a full boss splash comparable to a signature character moment.
- Intent labels remain mechanical; short stakeholder quotes are secondary flavour.
- Phase changes visually alter the project board and announce spawned Tasks or launch rules.
- The final report lists the causal sequence: boss effects, remaining Unverified Work, Defects, Morale loss, missed deadline, and final outcome.
- The Retro includes a boss-specific sticky and the ordinary run history.
- Achievements include first victories against Mateja and Tristan, with future boss victories driven from boss catalogue IDs rather than hard-coded achievement logic.

Future bosses may change board topology, resource pressure, or launch rules, but must reuse the shared catalogue and phase engine. New global mechanics require their own reviewed contract rather than arriving hidden inside a boss definition.
