# Character Kits and Deck Archetypes

This document is the design contract for Backlog's developer roster and deck-building engines. It defines what each character contributes, how squads combine into builds, and which shared mechanics must exist before the full card catalogue is authored.

It is deliberately not a balance sheet. Names and numbers marked **PROVISIONAL** should move freely during playtesting without weakening the mechanical identity underneath them.

## Decision key

- **LOCKED** — agreed direction. Implementation and content should assume it.
- **PROVISIONAL** — the intended first version, subject to playtest tuning.
- **OPEN** — a decision we should make interactively rather than bury inside implementation.

## Power-curve philosophy

### LOCKED

- A successful run should feel capable of becoming gloriously unfair. Finding an engine, feeding it, and watching it pop off is part of the entertainment.
- Prefer natural constraints such as Focus, hand size, Exhaust, target order, Tech Debt, and encounter pressure over `first time each Day` caps.
- Do not pre-emptively flatten repeatable triggers into tiny spreadsheet bonuses. Add a limiter only when a loop is trivial, deterministic, and removes meaningful play.
- Basics establish the floor: they are reliable filler that the player should eventually want to replace.
- Character cards should create verbs, engines, and payoffs rather than merely offer larger discipline numbers.
- A squad should normally contain an **engine**, a **payoff**, and a **stabiliser**, but hybrid squads and weird bridge builds are welcome.
- Exact values are provisional until deterministic playtests exist. Mechanical identity comes before numerical balance.

## Kit shape

### LOCKED

Every developer ultimately owns seven cards:

1. **One fixed Starter** — always enters the deck when that developer is selected and demonstrates their identity immediately.
2. **Five normal rewards** — two enablers, two payoffs, and one bridge into a neighbouring archetype.
3. **One rare reward** — a build-around or rule-breaker that can define a run.

There is no common/uncommon split inside the five normal rewards for the vertical slice. Reward collation can use one normal character pool and a rarer slot without creating another taxonomy.

With a three-person squad, the eligible character catalogue is three Starters, fifteen normal rewards, and three rares, plus a compact shared pool. Across roughly eight encounters, a typical deck should finish around 15–18 cards depending on Shops, skips, and removal.

The starting deck remains ten cards: three selected character Starters plus seven Basics.

## Shared engine vocabulary

### Generated

**Generated** records where a card came from; it is not itself a destination or duration rule.

- Generated cards are created during a Cycle and never enter the persistent run deck.
- They can be inspected and counted by other effects.
- Unless their text says otherwise, unplayed Generated cards discard normally and disappear when the Cycle ends.
- The initial token set Exhausts when played, preventing a generated-card loop from feeding itself forever by default.

### Exhaust

**Exhaust** removes a played card for the rest of the current Cycle. It returns in the next encounter if it belongs to the persistent deck.

Exhaust is both a safety valve and a build resource. Nick and future cards may reward it directly, so it should be visible in resolution history rather than treated as silent cleanup.

### Cards played this Day

The game records a public `cards played this Day` count. Cards may scale from it or check thresholds. This is the common foundation for Card Storm decks and future Tools; individual cards should not each maintain private counters.

### Chain

**Chain** is a visible COMBO meter tied to consecutive targeted plays on the same Task.

- The first targeted card starts Chain at 1.
- Another card targeting the same Task increases Chain by 1.
- Targeting a different Task moves the meter there and resets it to 1.
- Non-targeted squad cards do not break Chain.
- Chain resets at the start of each Day.
- Chain has no universal bonus. Levi and explicit cards convert it into value.

This keeps the meter legible without making every deck accidentally care about it.

### Initial generated tokens

These are a reusable vocabulary, not four cards that every character must generate.

| Token | Cost | First-pass effect |
| --- | ---: | --- |
| **Snippet** | 0 | Any 1 Verified. Exhaust. |
| **Quick Fix** | 0 | Any 2 Unverified. AI Assisted. Exhaust. |
| **Comment** | 0 | Review 1. Exhaust. |
| **Checklist** | 0 | Gain 1 Block. Exhaust. |

Names and values are **PROVISIONAL**. Their roles are the contract: precise completion, risky speed, tiny Review, and tiny defence.

## Tech Debt as tension, not only punishment

### LOCKED

- Tech Debt remains persistent deck pollution and a meaningful cost of risky shipping.
- Some cards may deliberately add Debt in exchange for immediate power.
- Opt-in payoffs may count, Exhaust, transform, or scale from Debt. Debt does not gain a universal passive upside.
- A Debt build should feel stronger because it accepted a dangerous bargain, not because the drawback quietly disappeared.
- Cleanup remains valuable. Permanently removing Debt and merely Exhausting it for one Cycle are different effects and must use different language.

### PROVISIONAL card space

- **Known Shortcut** — create Unverified Flexible Work, gaining more output for existing Tech Debt.
- **Legacy Knowledge** — Exhaust a Tech Debt card from a visible pile to gain an immediate effect this Cycle.
- **Refactor Weekend** — permanently remove Debt in exchange for tempo or Credits.
- AI Assisted cards are the most common deliberate Debt source, but Debt payoffs need not all be AI cards.

## Character identities

The current four have implemented first-pass Starters and passives. Their full kits should deepen those identities rather than replace them. The remaining eight identities are **PROVISIONAL** until their exact seven-card catalogues are reviewed.

### Paul — shipping engine

- **Fantasy:** prototype at alarming speed, get it over the line, make tomorrow's problem tomorrow.
- **Passive:** **Move Fast** — whenever a non-final Task ships, gain 1 Focus.
- **Starter:** **Vibe Code** — Flexible 4, Unverified, AI Assisted.
- **Core space:** early shipping, Unverified bursts, AI Assisted work, Debt-for-power bargains.
- **Bridges:** Card Storm through Focus refunds; Automation through AI Assisted; Review through cleanup after the sprint.
- **Rare direction:** a dramatic zero-to-production turn that rewards shipping multiple Tasks or converts accumulated risk into a huge burst.

### Odin — review control

- **Fantasy:** see the architectural problem coming, raise concerns, and make the work survive contact with reality.
- **Passive:** **I Have Concerns** — every Review also Stuns that Task's intent.
- **Starter:** **Design Review** — Review 5.
- **Core space:** large Review, Stun, retained answers, rewards when Review exceeds its minimum cleanup job.
- **Bridges:** Matt supplies excess Review; Nick schedules answers; Paul and Madi create risk worth reviewing.
- **Rare direction:** a sweeping architectural intervention that Reviews or Stuns across several Tasks.

### Irene — completion engine

- **Fantasy:** quietly finish exactly what needs finishing, often before anyone realises it was blocked.
- **Passive:** **Quietly Done** — whenever Verified Work completes a requirement, draw 1 card.
- **Starter:** **Already Fixed** — Flexible 3, Verified.
- **Core space:** precise Flexible Work, requirement completion, quiet automation, draw chains.
- **Bridges:** Generated tokens provide exact finishing points; Seb spreads completion opportunities; Scripts soften bars for later cascades.
- **Rare direction:** a multi-completion turn or a payoff that repeats precise Work across nearly complete requirements.

### Madi — AI automation engine

- **Fantasy:** assemble an extremely custom toolchain, unleash several agents, and accept that the output may have opinions.
- **Passive:** **Custom Setup** — every AI Assisted card installs Script 1 on its target.
- **Starter:** **Agent Swarm** — Backend 5, Unverified, AI Assisted.
- **Core space:** AI Assisted bursts, Script installation, triggering automation now, deliberate Tech Debt.
- **Bridges:** Steph refunds and accelerates installs; Toby converts Guard output; Paul and Debt payoffs embrace the risk.
- **Rare direction:** parallel agents that touch multiple requirements, install multiple Scripts, or trade a large amount of Debt for a spectacular turn.

### Seb — reuse and distribution

- **Fantasy:** solve the component once, then make the whole frontend quietly benefit.
- **Passive direction:** completing a Frontend requirement distributes a small amount of Verified Frontend Work to other open Tasks.
- **Starter direction:** **Use the Component** — Frontend Work plus a smaller echo on another Frontend requirement.
- **Core space:** spread, reuse, Frontend completion, Shared Component-style echoes.
- **Bridges:** Irene turns distributed points into draws; Matt converts overflow into polish; Levi can keep a primary Task moving while echoes cover the rest.
- **Rare direction:** **Design System Migration** — install Script 1 on every open Frontend requirement.

### Toby — defensive conversion

- **Fantasy:** notice the problem, absorb the blast radius, and turn operational calm into forward progress.
- **Passive direction:** whenever Block prevents Morale loss, add that much Verified Infra Work to the intent's Task.
- **Starter direction:** **Check the Logs** — gain Block and apply a small Infra or Guard effect.
- **Core space:** Block, Guard Scripts, observability, profiting from telegraphed Crunch.
- **Bridges:** Elspeth supplies repeatable Block; Steph builds Guard automation; Odin chooses which intents to Stun and which to safely absorb.
- **Rare direction:** **Nothing Gets Past Me** — a major defensive stance that converts the Day's prevented damage into broad Infra progress.

### Steph — automation accelerator

- **Fantasy:** make the paved road so smooth that the whole team moves faster.
- **Passive direction:** whenever a Script or Guard is installed or upgraded, gain 1 Focus.
- **Starter direction:** **One-Click Setup** — install a Script and immediately gain a small tempo benefit.
- **Core space:** install, upgrade, trigger-now effects, temporary Macro-style cards.
- **Bridges:** Madi supplies frequent installs; Toby turns Guard into progress; Card Storm spends the refunded Focus.
- **Rare direction:** **Golden Path** — install Script 1 on every incomplete requirement.

### Elspeth — sustainable support

- **Fantasy:** make space for the team, smooth the sharp edges, and keep the pace survivable.
- **Passive direction:** whenever a Flexible card is played, gain Block.
- **Starter direction:** **Make Space** — Flexible Work plus Block.
- **Core space:** Flexible Work, Block generation, morale support, squad-wide stabilisation.
- **Bridges:** Toby converts her Block into progress; Irene rewards precise Flexible completion; Paul gains room to take risk.
- **Rare direction:** **Sustainable Pace** — a powerful team-wide defensive and tempo reset rather than a single large Work number.

### Kirsten — generated-card learner

- **Fantasy:** try the thing, learn from the last play, and turn lots of small contributions into a surprisingly huge Day.
- **Passive direction:** Generated cards gain +1 to their printed Work, Review, or Block.
- **Starter direction:** **Give It a Go** — generate a small choice or pair of temporary tokens.
- **Core space:** Generated cards, copying, exact completion, cards-played payoffs.
- **Bridges:** Levi converts volume into Chain; Irene converts precision into draw; Nick converts Exhaust into Focus.
- **Rare direction:** **Fast Learner** — replay or copy the last non-generated card as a temporary zero-cost card.

### Matt — polish and overflow

- **Fantasy:** finish the job, then find the tiny thing that makes it feel much better than anyone budgeted for.
- **Passive direction:** excess Verified Work becomes Review on the same Task instead of being wasted.
- **Starter direction:** **Delight Moment** — Frontend Work with a reward for completing or overfilling its requirement.
- **Core space:** overkill, Review, completion polish, high-quality finishing turns.
- **Bridges:** Seb creates distributed overflow; Odin turns Review into control; Irene rewards requirements completed on the way.
- **Rare direction:** **Pixel Perfect** — convert a large amount of excess or completed Work into broad Review and a splashy payoff.

### Nick — hand planner and Exhaust engine

- **Fantasy:** clear the calendar, organise the chaos, and make an enormous turn look suspiciously well planned.
- **Passive direction:** whenever a card Exhausts, gain 1 Focus.
- **Starter direction:** **Clear the Calendar** — deliberately Exhaust a card from hand to draw or organise the next plays.
- **Core space:** Exhaust, Retain, draw ordering, temporary copies, planned burst turns.
- **Bridges:** Kirsten supplies fuel; Levi spends the Focus in one long Chain; Odin benefits from holding the right answer.
- **Rare direction:** **No Meetings** — a dramatic hand-expansion turn with an Exhaust consequence that can become its own engine.

### Levi — Chain payoff

- **Fantasy:** put the headphones on, stay on one problem, and let momentum become a COMBO meter.
- **Passive direction:** consecutive Work cards on the Chained Task gain output based on Chain.
- **Starter direction:** **Heads Down** — Work that starts or advances Chain and rewards staying on target.
- **Core space:** same-Task sequencing, cheap cards, cards-played payoffs, shipping one Task decisively.
- **Bridges:** Kirsten supplies many tiny plays; Irene draws through completions; Paul refunds Focus when the focused Task ships.
- **Rare direction:** **Flow State** — preserve or dramatically amplify Chain for the rest of the Day.

## Archetypes and squad pairings

These are overlapping families, not classes. Every character should have a clear home and at least one bridge into a second family.

### Card Storm

**Loop:** generate cheap cards → play many cards → gain Chain, draw, or Focus → continue.

Primary characters: Kirsten, Nick, Levi, Irene, Paul.

Example squads:

- **Kirsten / Levi / Irene** — tokens grow Chain, precise completions draw replacements.
- **Kirsten / Nick / Paul** — tokens Exhaust for Focus, then shipping refunds more Focus.
- **Levi / Irene / Paul** — focus one Task, draw on requirements, ship it, and keep moving.

### Automation Engine

**Loop:** install Scripts and Guards → accelerate or trigger them → convert recurring output into completion, Block, or more tempo.

Primary characters: Madi, Steph, Toby, Seb, Irene.

Example squads:

- **Madi / Steph / Toby** — AI installs refund Focus while Guard output feeds Infra progress.
- **Madi / Steph / Irene** — automation prepares exact completion cascades.
- **Steph / Seb / Irene** — Scripts and distributed Work make several bars finish together.

### Completion Cascade

**Loop:** spread or precisely place Work → complete several requirements → turn completions and overflow into draw and Review.

Primary characters: Seb, Matt, Irene.

Example squads:

- **Seb / Irene / Matt** — spread creates completion triggers and excess becomes useful polish.
- **Seb / Levi / Irene** — focused Chain handles the main Task while component echoes finish the others.

### Block Engine

**Loop:** generate Block or Guard → intentionally absorb safe intents → convert prevented damage into Work or further advantage.

Primary characters: Elspeth, Toby, Steph, Odin.

The interesting decision is whether to Stun an intent or allow a telegraphed Crunch to hit Block and feed Toby. Stun remains preferable for Scope, Distraction, or damage the squad cannot cover.

### Ship Fast, Clean Later

**Loop:** create large Unverified or AI Assisted bursts → ship Tasks for tempo → exploit or clean up the resulting Tech Debt.

Primary characters: Paul, Madi, Odin, Matt.

Example squads:

- **Paul / Madi / Odin** — enormous risky output backed by Review and Stun.
- **Paul / Madi / Matt** — speed creates risk; excess Work becomes cleanup and polish.
- **Paul / Odin / Matt** — ship quickly, then convert spare output into quality before the deadline.

This family should tempt the player to say “one more shortcut” while still making a clogged deck and defect forecast genuinely scary.

### Planned Burst

**Loop:** Retain or arrange the right cards → clear space and reduce costs → release one oversized, deliberate Day.

Primary characters: Nick, Odin, Kirsten, Levi.

Example squads:

- **Nick / Kirsten / Levi** — bank a setup, generate fuel, then spend it in one long Chain.
- **Nick / Odin / Levi** — hold the correct defensive answer while building a focused burst.

## High-value pairings

| Pair | Why it works |
| --- | --- |
| Paul + Irene | Requirement completions draw; Task shipping restores Focus. |
| Paul + Madi | AI speed installs Scripts and embraces Debt tension. |
| Paul + Levi | Focused shipping turns one Chain into fuel for the next Task. |
| Odin + Matt | Matt produces Review; Odin turns it into intent control. |
| Odin + Nick | Retain and hand planning preserve the right Review or Stun answer. |
| Irene + Seb | Distributed Work creates several completion-and-draw triggers. |
| Irene + Kirsten | Tiny Generated cards land exact finishing points. |
| Madi + Steph | Every AI install can refund Focus and accelerate automation. |
| Madi + Toby | Guard Scripts become both defence and Infra progress. |
| Toby + Elspeth | Repeatable Block becomes a proactive engine. |
| Kirsten + Nick | Generated cards Exhaust into Focus. |
| Kirsten + Levi | Cheap tokens turn the Chain meter into a proper combo. |
| Steph + Toby | Guard automation repeatedly feeds Toby's conversion. |

## Content and implementation order

### Phase 1 — engine foundations

1. Add Generated and Exhaust lifecycle rules.
2. Add public cards-played-this-Day and last-target history.
3. Implement the four initial generated tokens and generation effects.
4. Add the Chain meter and target-transition rules.
5. Add opt-in Tech Debt counting, Exhausting, and scaling hooks.

### Phase 2 — prove the engines with the current roster

1. Expand Paul, Odin, Irene, and Madi to the full seven-card kit shape.
2. Add shared bridge cards that let a reward offer connect two selected developers.
3. Exercise Card Storm, Automation, Review, Block, and Debt payoffs in deterministic scenarios.

### Phase 3 — add characters in mechanical waves

1. **Card Storm:** Kirsten, Nick, Levi.
2. **Automation and defence:** Steph, Toby.
3. **Completion and support:** Seb, Matt, Elspeth.

A character becomes playable only when their passive, Starter, five normal cards, rare, art integration, reward filtering, tooltips, tests, and at least one deterministic scenario land together. Character art may exist in the UI before that point, but an incomplete kit should not quietly enter squad selection.

### Phase 4 — curate and tune

1. Review reward-pool size and duplicate rules for every three-character squad.
2. Ensure every character has an engine, payoff, and bridge represented in their five normal cards.
3. Add deterministic archetype playtests before tuning encounter numbers.
4. Tune encounter pressure upward to meet powerful builds rather than reflexively capping the builds.

## Open design questions

- Does Levi's passive add the full Chain value, or a smaller stepped bonus? Start generous and tune from playtests.
- Does Nick's `No Meetings` draw the entire remaining pile, refill to a larger hand, or create temporary copies? The fantasy is locked; the safest legible rule is not.
- Does Steph need a distinct **Macro** token, or can her kit use Snippets plus immediate Script triggers?
- Should Tech Debt payoffs inspect all persistent Debt, or only Debt currently visible in hand/draw/discard? Prefer the persistent deck count unless a card explicitly Exhausts a visible copy.
- How much distributed Work can Seb create before three-Task encounters become automatic? Preserve the cascade, then tune values.
- Can Matt's overflow Review cross to another Task? Default to the same Task for clarity; consider a rare that breaks the rule.
