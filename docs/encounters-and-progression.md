# Encounters and progression

This document is the first-cut content contract for ordinary Cycles and the safer routes paired against Incidents. Values are deliberately provisional: scripted playtests should move requirements and pressure, while preserving each encounter's tactical identity.

## Run contract

- A run contains **7–9 fights**, including the Final Release.
- Ordinary Cycle identities remain hidden on the map until entered.
- Selection is seeded by progression tier and shape, never by squad.
- Do not repeat a Cycle while an eligible alternative remains.
- Every run should contain at least one **Tall** and one **Wide** encounter.
- Late slots draw from **Crunch**, **Verification**, or **Volatile** pressure.
- Each Incident is paired with a safer ordinary Cycle. The Incident grants a Tool and a card; the safe route grants only the normal card reward.
- Shared Basics, Pitch-In, Block, Review, Tools, target order, and deliberate dirty shipping must leave every squad a viable line.

## Tuning envelope

| Tier | Days | Base Work | Effective Work after likely pressure | Gross Crunch |
| --- | ---: | ---: | ---: | ---: |
| Early | 4 | 14–18 | 16–22 | 4–7 |
| Mid | 5–6 | 24–32 | 30–38 | 8–13 |
| Late | 5–6 | 36–46 | 44–56 | 13–20 |
| First safe elite alternative | 5 | 24–28 | no more than 34 | 6–10 |
| Late safe elite alternative | 5 | 34–40 | no more than 46 | 10–15 |

Tall encounters sit near the top of their tier because they produce only one intent per Day. Their primary discipline should represent roughly 70–80% of base Work, with a smaller secondary bar so off-discipline cards are inefficient rather than dead.

Wide encounters sit near the bottom of their tier because shipping small Tasks rapidly cancels several future intents. Five-plus Task encounters depend on the compact board work in `backlog-hv2.27.5`.

Crunch encounters reduce base Work by roughly 15–20% to pay for the defensive Focus tax. Volatile encounters subtract expected realised Scope and Regression from their starting budget.

## Intent notation

- `Crunch 3` — lose 3 Morale before Block.
- `Scope FE +3` — add 3 to the Frontend requirement.
- `Regression BE 2` — remove 2 completed Backend Work.
- `Blocked INF` — block Infra targeting for the next Day.
- `Interruption` — add one Distraction.
- `AI Assist BE +3U` — add 3 Unverified Backend Work. This is visibly helpful and may be Stunned.
- `Spawn: Name` — create the named required complication on the next Day.
- A blank Day has no intent for that Task.

## Early pool

### Status Refresh

- **Shape:** Early, Balanced, fixed opener
- **Days:** 4
- **Purpose:** Teach targeting, intent cancellation, Ready versus Shipped, and one dirty-shipping decision without a crowded board.

| Task | Requirements | D1 | D2 | D3 | D4 |
| --- | --- | --- | --- | --- | --- |
| Status Composer | FE 8, BE 6 | Scope FE +2 | Crunch 2 | Regression BE 2 | Crunch 3 |

Base Work 14; expected effective Work 18.

### Participant Profiles

- **Shape:** Early, Balanced
- **Days:** 4
- **Purpose:** Introduce two-Task target order. The editor is easy to silence; the index becomes expensive if ignored.

| Task | Requirements | D1 | D2 | D3 | D4 |
| --- | --- | --- | --- | --- | --- |
| Profile Editor | FE 5, BE 3 | Interruption | Scope FE +2 | Crunch 2 | — |
| Search Index | BE 5, INF 3 | Blocked INF | Crunch 2 | Regression BE 2 | Crunch 3 |

Base Work 16; gross Crunch 7.

### Finish the MCP Server

- **Shape:** Early, Balanced
- **Days:** 4
- **Purpose:** The project is allegedly halfway done. A compact backend/infra encounter teaches that predictable non-damage intents can still wreck a deadline.

| Task | Requirements | D1 | D2 | D3 | D4 |
| --- | --- | --- | --- | --- | --- |
| Tool Handlers | BE 6 | Scope BE +2 | — | Regression BE 2 | Crunch 2 |
| Auth & Hosting | BE 5, INF 4 | Blocked INF | Interruption | Crunch 3 | — |

Base Work 15; expected effective Work 19; gross Crunch 5.

## Mid pool

### Convert Marketing Site to Astro

- **Shape:** Mid, Tall
- **Days:** 6
- **Purpose:** Levi, Chain, Script, and repeated-target engines get room to become silly. Scope creates urgency without spawning extra Tasks.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 | D6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Astro Migration | FE 20, INF 6 | Scope FE +4 | Crunch 2 | Regression FE 3 | Crunch 3 | Scope INF +3 | Crunch 5 |

Base Work 26; expected effective Work 36; gross Crunch 10.

### Data Pipeline

- **Shape:** Mid, Tall
- **Days:** 6
- **Purpose:** Backend/infra counterpart to Astro. Script and Guard have two large requirements to compound across several Days.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 | D6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Data Pipeline | BE 20, INF 8 | Blocked INF | Scope BE +4 | Crunch 3 | Regression BE 3 | Scope INF +3 | Crunch 5 |

Base Work 28; expected effective Work 38; gross Crunch 8.

### Every Methodology at Once

- **Shape:** Mid, Wide
- **Days:** 5
- **Purpose:** Seb, Irene, Steph, distributed Work, Generated-card storms, and rapid shipping all shine. The methodology Tasks are tiny; the shared Runner is the bottleneck.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Tree Test | FE 4 | Scope FE +2 | — | Crunch 2 | — | — |
| Card Sort | FE 4 | Interruption | — | Scope FE +2 | — | — |
| First Click | FE 3 | — | Crunch 2 | — | Regression FE 2 | — |
| Five-Second Test | FE 3 | — | Scope FE +2 | — | Crunch 2 | — |
| Unmoderated Runner | FE 2, BE 4, INF 4 | Blocked INF | — | Regression BE 2 | — | Crunch 3 |

Base Work 24; expected effective Work about 34 if the board is left alive; gross Crunch 9.

### AI Results Analysis

- **Shape:** Mid, Verification
- **Days:** 5
- **Purpose:** Introduce the helpful AI intent before Mateja. Accept free Unverified Work and ship dirty, spend Focus reviewing it, or Stun the help and work cleanly.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Theme Clustering | BE 8 | AI Assist BE +3U | — | Scope BE +3 | — | Crunch 3 |
| Insight Summaries | FE 6, BE 4 | AI Assist FE +3U | — | Regression BE 2 | Crunch 2 | — |
| Evidence Links | FE 4, INF 3 | — | AI Assist INF +3U | Interruption | — | Crunch 2 |

Base Work 25; the AI can contribute 9 Unverified Work; gross Crunch 7. Depends on `backlog-hv2.27.3`.

### Build Observer Rooms

- **Shape:** Mid, Balanced, light Crunch
- **Days:** 5
- **Purpose:** Foreshadow The Session Is Live. Players decide which customer-facing surface to stabilise before several modest pressures align.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Observer UI | FE 7 | Scope FE +3 | — | Crunch 2 | — | — |
| Live Presence | BE 6, INF 3 | Blocked INF | Crunch 3 | — | Regression BE 3 | — |
| Permissions & Invites | FE 3, BE 5, INF 3 | Interruption | Scope BE +3 | Crunch 3 | — | Crunch 4 |

Base Work 27; expected effective Work 36; gross Crunch 12.

### Sharkimedes 2.0

- **Shape:** Mid, Volatile
- **Days:** 5
- **Purpose:** A serious production effort with an unserious stakeholder. Interruptions and one spawned catchphrase reward decks that can absorb chaos without making the mascot sad.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Long-Term Memory | BE 7 | Interruption | Spawn: One More Catchphrase | Scope BE +3 | — | — |
| Admin UI | FE 5 | — | Scope FE +3 | — | Crunch 2 | — |
| Meme Retrieval | BE 5, INF 3 | Interruption | — | Regression BE 2 | — | — |
| Productionise It | INF 6 | — | Blocked INF | — | Crunch 3 | Crunch 4 |
| One More Catchphrase | BE 4 | — | — | Interruption | — | — |

Base Work 26 plus a required spawned 4 Work; gross Crunch 9. The complication does not exist until spawned.

## Late pool

### Change CI Again

- **Shape:** Late, Volatile, Automation
- **Days:** 6
- **Purpose:** Script and Guard builds can turn a painful migration into a machine. Everyone else must sequence Blocked requirements and avoid losing completed setup to Regression.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 | D6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| New Pipeline | BE 6, INF 9 | Blocked INF | Scope INF +4 | — | Crunch 4 | — | — |
| Preview Environments | FE 4, BE 5, INF 5 | Interruption | Crunch 3 | Regression BE 3 | — | Scope FE +3 | — |
| Delete Old Config | BE 4, INF 5 | — | Blocked BE | Crunch 4 | — | Regression INF 3 | Crunch 6 |

Base Work 38; expected effective Work 51; gross Crunch 17.

### Switch to TanStack Router

- **Shape:** Late, Volatile, frontend-heavy
- **Days:** 6
- **Purpose:** Repeated Frontend targeting is rewarded, but Regression punishes filling every bar evenly before shipping anything.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 | D6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Route Tree | FE 12 | Scope FE +4 | — | Regression FE 4 | — | Crunch 4 | — |
| Loaders & Actions | FE 8, BE 6 | Interruption | Scope BE +4 | — | Regression BE 3 | Crunch 5 | — |
| Deep Links | FE 7, INF 5 | Blocked INF | Crunch 3 | Scope FE +3 | Regression FE 3 | — | Crunch 6 |

Base Work 38; expected effective Work 55 if pressure is ignored; gross Crunch 18.

### The Session Is Live

- **Shape:** Late, Crunch
- **Days:** 5
- **Purpose:** Toby's showcase. Several telegraphed Crunch intents align on Days 2–3; shipping one Task changes the incoming total dramatically.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Recording Pipeline | BE 8, INF 6 | Crunch 3 | Regression BE 3 | Crunch 5 | — | Crunch 6 |
| Observer Room | FE 7, BE 4 | Interruption | Crunch 3 | Scope FE +3 | Crunch 5 | — |
| Live Transcript | FE 5, BE 6 | Scope BE +3 | Crunch 3 | Crunch 4 | Regression BE 3 | Crunch 6 |

Base Work 36; gross scheduled Crunch 35 before cancelled intents. Competent target order should reduce this radically.

### Enterprise SSO

- **Shape:** Late, Volatile
- **Days:** 6
- **Purpose:** The largest ordinary board. Scope repeatedly moves the finish line while the squad chooses between customer-facing login, provisioning, and compliance pressure.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 | D6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SAML Login | FE 4, BE 9 | Scope BE +4 | — | Crunch 3 | Regression BE 3 | — | Crunch 5 |
| SCIM Provisioning | BE 8, INF 6 | Blocked INF | Scope BE +4 | — | Crunch 4 | Scope INF +3 | — |
| Audit Logs | FE 4, BE 6, INF 5 | Interruption | Crunch 3 | Scope INF +3 | — | Regression BE 3 | Crunch 6 |

Base Work 42; expected effective Work 56; gross Crunch 21. This is intentionally the ceiling for an ordinary Cycle.

## Safer Incident alternatives

### Upgrade Every Dependency

- **Shape:** First safe elite alternative, Wide but predictable
- **Days:** 5
- **Purpose:** Give a struggling squad a legible ordinary fight instead of the first Incident. Nothing spawns and the pressure ceiling is visible.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend Dependencies | FE 7 | Scope FE +2 | — | Crunch 2 | — | — |
| Backend Dependencies | BE 7 | — | Scope BE +2 | — | Regression BE 2 | — |
| Runtime & Images | INF 6 | Blocked INF | — | Crunch 3 | — | Crunch 4 |
| Lockfile Archaeology | FE 2, BE 2, INF 2 | Interruption | — | — | — | — |

Base Work 26; expected effective Work 32; gross Crunch 9. Ordinary card reward only.

### Migrate Postgres Without Drama

- **Shape:** Late safe elite alternative, backend/infra
- **Days:** 5
- **Purpose:** Still difficult, but deterministic and spawn-free. The title is a promise the Incident path absolutely does not make.

| Task | Requirements | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- | --- |
| Schema Migration | BE 10 | Scope BE +3 | — | Regression BE 3 | Crunch 4 | — |
| Backfill | BE 8, INF 6 | Blocked INF | Crunch 3 | — | Scope INF +3 | Crunch 5 |
| Cutover | BE 6, INF 8 | — | Interruption | Crunch 3 | — | Crunch 5 |

Base Work 38; expected effective Work 47; gross Crunch 20 scheduled but only 12–15 should remain after competent shipping.

## Implementation dependencies

- `backlog-hv2.27.3` adds generic starting/helpful Unverified Work for AI Results Analysis.
- `backlog-hv2.27.4` retunes Incidents so they are genuine elite alternatives rather than easier Tool routes.
- `backlog-hv2.27.5` adds compact five-plus Task layouts.
- `backlog-hv2.27.1` reshapes the authored map around optional Incident lanes.

## First playtest questions

1. Does the fixed opener end on Day 2–3 without being trivial?
2. Do Tall fights create a satisfying engine window without making off-discipline hands miserable?
3. Can Wide fights be read and targeted quickly at 1280×900?
4. Does AI Assist feel tempting enough to accept, and does Stun read as a legitimate clean-build response?
5. Does The Session Is Live make Block valuable without becoming an unavoidable Morale tax?
6. Are the safe Incident alternatives clearly less rewarding and materially safer?
7. Do coherent late builds finish ordinary Cycles on Day 4–5 while broken builds still get to be gloriously broken?
