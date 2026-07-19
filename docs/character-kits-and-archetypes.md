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
- **Core space:** side projects, discipline variety, card storms, Unverified bursts, AI Assisted work, and Debt-for-power bargains.
- **Bridges:** Card Storm through Focus refunds; Automation through AI Assisted; Review through cleanup after the sprint.

Paul's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Vibe Code** | 1 | Flexible 4, Unverified, AI Assisted. |
| Normal | **Side Quest** | 1 | Add a required 3-Work Task in a chosen discipline. When it ships, gain Prototype 1 for the rest of the Cycle. Exhaust. |
| Normal | **Full Stack** | 1 | For the rest of this Cycle, Work cards gain +1 Work when their actual target discipline differs from the previous Work card's target discipline. |
| Normal | **New Model Dropped** | 1 | Generate 2 Quick Fixes. Gain 1 Tech Debt. |
| Normal | **Post Through It** | 1 | Gain 2 Block for every card played before this card today. |
| Normal | **Spike It** | 0 | Flexible 3, Unverified, AI Assisted. Exhaust. |
| Rare | **Ebb & Flow** | 0 | Gain 3 Focus. Draw 3. Add 3 Distractions at the start of the next Day. Exhaust. |

**Prototype** is a stackable Cycle status: all Work cards gain +1 Work per stack. A shipped Side Quest leaves the task board so another can be created without permanently crowding the encounter, but it remains visible in the Cycle report. A Side Quest has no intent, only one can be active at once, and it must ship before the Cycle can end. Its first deterministic flavour-name pool is **Dark Mode for Sharkimedes**, **Emoji Picker**, **Confetti Mode**, **Slack Bot Upgrade**, and **Tiny Internal Tool**.

**Full Stack** compares where the player actually puts the Work, including Flexible cards, rather than the discipline printed on the card. The previous discipline and both Cycle statuses are public state in the squad rack.

**Quick Fix** is the shared generated token: cost 0, Flexible 2, Unverified, AI Assisted, Exhaust. **Post Through It** reads the public `cards played this Day` counter before counting itself. **Ebb & Flow's** Distractions only arrive if another Day begins; ending the Cycle first cleanly dodges the hangover.

### Odin — review control

- **Fantasy:** see the architectural problem coming, raise concerns, and make the work survive contact with reality.
- **Passive:** **I Have Concerns** — every Review also Stuns that Task's intent.
- **Core space:** large Review, Stun, retained answers, rewards when Review exceeds its minimum cleanup job.
- **Bridges:** Matt supplies excess Review; Nick schedules answers; Paul and Madi create risk worth reviewing.

Odin's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Design Review** | 1 | Verify 5. |
| Normal | **One More Diagram** | 1 | Verify 6. Retain. |
| Normal | **Strong Opinions, Loosely Held** | 1 | This Day, whenever a Review Stuns an Intent, gain 1 Focus. Exhaust. |
| Normal | **Approved With Comments** | 1 | Verify 3. Generate 2 Comments. |
| Normal | **Boring Technology** | 1 | Backend 4 Verified. Add +3 Work if the target Task's Intent is Stunned. |
| Normal | **Manual Mode** | 1 | Discard every AI Assisted card in hand. Non-AI Work gains +2 Work for the rest of this Day. Exhaust. |
| Rare | **Architecture Review** | 1 | Verify 5 on every Task. Draw 1 for each Intent Stunned this way. Exhaust. |

**Comment** is the shared zero-cost Generated token: Verify 1; Exhaust.

Odin's cards do not independently duplicate his passive's Stun. They create Review volume, reward the resulting control, or turn a Stunned Task into Backend progress. A Task with no Unverified Work cannot be Reviewed by these cards, so Odin cannot cancel its Intent without a shared direct-Stun effect. **Strong Opinions, Loosely Held** stacks when multiple copies are played and only rewards Stuns caused by Review. **Architecture Review** skips Tasks with no Unverified Work and draws only for Intents that I Have Concerns actually Stuns. **Manual Mode** discards AI Assisted cards currently in hand; it does not remove them from other piles.

### Irene — completion engine

- **Fantasy:** quietly finish exactly what needs finishing, often before anyone realises it was blocked.
- **Passive:** **Quietly Done** — whenever Verified Work completes a requirement, draw 1 card.
- **Core space:** precise Flexible Work, requirement completion, quiet automation, draw chains.
- **Bridges:** Generated tokens provide exact finishing points; Seb spreads completion opportunities; Scripts soften bars for later cascades.

Irene's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Already Fixed** | 1 | Flexible 3, Verified. |
| Normal | **Quietly Automated** | 1 | Flexible 1, Verified. Install Script 1. |
| Normal | **Last 10%** | 0 | Flexible 2, Verified. Only target a requirement with 2 or less Work remaining. Exhaust. |
| Normal | **No Fuss** | 1 | Flexible 3, Verified. If it completes the requirement, gain 1 Focus. |
| Normal | **While I'm Here** | 1 | Flexible 2, Verified. If it completes the requirement, add 2 Verified Work to another incomplete requirement on that Task. |
| Normal | **Quick Study** | 1 | Generate a zero-cost Verified Work card matching the last Work card's printed discipline and Work. Exhaust. |
| Rare | **All Sorted** | 1 | Complete every requirement with 3 or less Work remaining using Verified Work. Exhaust. |

**Quick Study** copies only printed discipline and Work amount, not tags, quality, owner, bonuses, automation, or other effects. Its copy is Generated and Exhausts when played. Quick Study is unplayable until a Work card has been played that Day.

**While I'm Here** resolves its targeted Work first. On completion, its second hit goes to the incomplete requirement on the same Task with the least Work remaining, using board order as the tie-breaker. **All Sorted** snapshots every open requirement with 1–3 Work remaining, then fills each with exactly enough Verified Work to complete it. It is unplayable when no requirement qualifies.

Quietly Done triggers separately whenever any source of Verified Work completes a requirement, including printed Work, While I'm Here's second hit, CI Runner, explicit Script triggers, and start-of-Day Scripts. Multiple simultaneous completions draw multiple cards. Card-specific Focus refunds and passive draws may overfill their ordinary counters and hand size; the engine is allowed to pop off.

### Madi — AI automation engine

- **Fantasy:** assemble an extremely custom toolchain, unleash several agents, and accept that the output may have opinions.
- **Passive:** **Custom Setup** — every AI Assisted card installs Script 1 on its target.
- **Core space:** AI Assisted bursts, Script installation, triggering automation now, deliberate Tech Debt.
- **Bridges:** Steph refunds and accelerates installs; Toby converts Guard output; Paul and Debt payoffs embrace the risk.

Madi's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Agent Swarm** | 1 | Backend 5, Unverified, AI Assisted. |
| Normal | **Yak Shave** | 1 | Install Script 2 on a requirement. Add 1 Distraction at the start of the next Day. |
| Normal | **Custom Toolchain** | 1 | AI Assisted Work gains +2 Work for the rest of this Cycle. Exhaust. |
| Normal | **Plan It Out** | 1 | Draw 3 additional cards at the start of the next Day. Exhaust. |
| Normal | **Write the RFC** | 1 | Verify 3, then install Script 1 on each incomplete requirement on that Task. |
| Normal | **Agentic Loop** | 1 | Flexible 2, Unverified, AI Assisted. After its Work, trigger the target requirement's Script. |
| Rare | **Parallel Agents** | 1 | Generate 3 Sub-Agents. Gain 1 Tech Debt. Exhaust. |

**Sub-Agent** is a zero-cost Generated token: Flexible 1, Unverified, AI Assisted; after its Work, trigger the target requirement's Script; Exhaust.

Custom Setup installs its Script before **Agentic Loop** or **Sub-Agent** triggers the target, so either card has a useful floor and scales aggressively from existing automation. **Write the RFC** resolves its Review first, then installs Script 1 only on requirements that remain incomplete. **Plan It Out** adds to the ordinary five-card next-Day draw rather than replacing it. Multiple copies of **Custom Toolchain** stack; Focus, Cycle duration, Exhaust, and encounter pressure are its natural constraints.

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
- **Passive:** **Learning by Doing** — Generated cards gain +1 to each printed Work, Review, or Block amount.
- **Core space:** Generated cards, copying, exact completion, cards-played payoffs.
- **Bridges:** Levi converts volume into Chain; Irene converts precision into draw; Nick converts Exhaust into Focus.

Kirsten's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Give It a Go** | 1 | Generate a Snippet and a Checklist. |
| Normal | **Ask a Good Question** | 1 | Generate 2 Comments. |
| Normal | **Try a Different Way** | 1 | Generate a Quick Fix and a Snippet. |
| Normal | **Second Attempt** | 0 | Return a Generated card from Exhaust to your hand. Exhaust. |
| Normal | **It All Adds Up** | 1 | Flexible 1 Verified for every Generated card played before this card today. |
| Normal | **On a Roll** | 0 | Gain 1 Focus for every 2 Generated cards played before this card today. Exhaust. |
| Rare | **Fast Learner** | 1 | Generate a zero-cost copy of the last non-Generated card played this Day. Exhaust. |

Learning by Doing turns the initial token set into Snippet 2 Verified Work, Quick Fix 3 Unverified Work, Comment 2 Review, and Checklist 2 Block. When a Generated card has more than one printed output, each eligible amount receives the bonus.

**Second Attempt** can retrieve any Generated card in the current Cycle's Exhaust pile; the recovered card still Exhausts when played again. **It All Adds Up** is unplayable before a Generated card has been played and counts only earlier plays. **On a Roll** uses complete pairs, is unplayable before two Generated plays, and may gain more than 1 Focus.

**Fast Learner** copies the complete card definition, including special effects and downsides, then overrides the copy to cost 0, marks it Generated, and makes it Exhaust when played. It cannot copy a Generated card and is unplayable until a non-Generated card has been played that Day. Because the copy is Generated, Learning by Doing also improves its printed Work, Review, and Block.

### Matt — polish and overflow

- **Fantasy:** finish the job, then find the tiny thing that makes it feel much better than anyone budgeted for.
- **Passive direction:** excess Verified Work becomes Review on the same Task instead of being wasted.
- **Starter direction:** **Delight Moment** — Frontend Work with a reward for completing or overfilling its requirement.
- **Core space:** overkill, Review, completion polish, high-quality finishing turns.
- **Bridges:** Seb creates distributed overflow; Odin turns Review into control; Irene rewards requirements completed on the way.
- **Rare direction:** **Pixel Perfect** — convert a large amount of excess or completed Work into broad Review and a splashy payoff.

### Nick — hand planner and Exhaust engine

- **Fantasy:** clear the calendar, organise the chaos, and make an enormous turn look suspiciously well planned.
- **Passive:** **Well Organised** — whenever a card Exhausts, gain 1 Focus.
- **Core space:** Exhaust, Retain, draw ordering, temporary copies, planned burst turns.
- **Bridges:** Kirsten supplies fuel; Levi spends the Focus in one long Chain; Odin benefits from holding the right answer.

Nick's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Clear the Calendar** | 1 | Exhaust another card from your hand. Draw 2. |
| Normal | **Put a Pin in It** | 1 | Choose another card in hand. It Retains and costs 1 less until played. Exhaust. |
| Normal | **Inbox Zero** | 0 | Exhaust every Status card in hand, then draw that many cards. Exhaust. |
| Normal | **Prioritise Ruthlessly** | 1 | Draw 3, then put 2 cards from hand back on top of the draw pile in either order. Exhaust. |
| Normal | **Timebox It** | 1 | Gain 3 Block for every card Exhausted before this card today. Exhaust. |
| Normal | **Deep Work** | 1 | Backend 3 Verified, plus 2 Work for every Retained card currently in hand. |
| Rare | **No Meetings** | 1 | Exhaust every other card in hand, then draw the rest of your draw pile. Exhaust. |

Well Organised triggers for cards Exhausted by playing them and by effects that remove them from hand. Each card produces a separate Focus trigger, including Status and Generated cards. Focus may overfill.

**Put a Pin in It** gives its chosen card Retain and a stackable cost reduction for the current Cycle, to a minimum of 0. **Prioritise Ruthlessly** resolves its draw before the player chooses and orders exactly two cards to return; it is unplayable unless two cards will be available after drawing. **Timebox It** counts only earlier Exhausts, then triggers Well Organised when it Exhausts after resolution. **Deep Work** counts Retain markers currently in hand without consuming them.

**No Meetings** Exhausts the existing hand before drawing, so Well Organised produces the Focus for the new hand to spend. It draws only the current draw pile without reshuffling discard. No Meetings itself Exhausts after that draw and grants its own Focus normally.

### Levi — Chain payoff

- **Fantasy:** put the headphones on, stay on one problem, and let momentum become a COMBO meter.
- **Passive:** **Momentum** — Work targeting the Chained Task gains Work equal to the current Chain.
- **Core space:** same-Task sequencing, cheap cards, cards-played payoffs, shipping one Task decisively.
- **Bridges:** Kirsten supplies many tiny plays; Irene draws through completions; Paul refunds Focus when the focused Task ships.

Levi's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Heads Down** | 1 | Frontend 3, Verified. Advance Chain one additional time. |
| Normal | **Tiny Commit** | 0 | Frontend 1, Verified. Exhaust. |
| Normal | **Keep the Thread** | 1 | Flexible 2, Verified. If it continues an existing Chain, draw 1. |
| Normal | **Stacked PRs** | 1 | Frontend 2, Verified. Advance Chain two additional times. |
| Normal | **Do Not Disturb** | 1 | Gain 2 Block for each Chain. Exhaust. |
| Normal | **Context Loaded** | 1 | Generate one Snippet for every 2 Chain. Exhaust. |
| Rare | **Flow State** | 1 | Double Chain. It no longer resets when targeting a different Task this Day. Exhaust. |

Chain advances before the Work resolves, and **Momentum** uses the resulting value. The first ordinary targeted play starts Chain at 1; **Heads Down** then advances it once more, so it produces 5 Verified Frontend Work before other bonuses. **Stacked PRs** advances Chain three times in total: once for targeting and twice from its own effect. The Momentum bonus inherits the played card's Work quality.

**Keep the Thread** checks whether its target was already Chained before the play. Squad-targeted cards do not move or break Chain. **Do Not Disturb** and **Context Loaded** require an existing Chain; Context Loaded uses complete pairs. **Flow State** doubles the current Chain and, for the rest of the Day, changing Tasks transfers that value before advancing normally instead of resetting it to 1. Chain still resets at the start of the next Day.

Focused builds need encounters that let this engine breathe. **Convert Marketing Site to Astro** is the first showcase: one enormous Frontend requirement, enough Days to build momentum, and escalating intents that create pressure without routinely spawning extra Tasks.

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

- Does Steph need a distinct **Macro** token, or can her kit use Snippets plus immediate Script triggers?
- Should Tech Debt payoffs inspect all persistent Debt, or only Debt currently visible in hand/draw/discard? Prefer the persistent deck count unless a card explicitly Exhausts a visible copy.
- How much distributed Work can Seb create before three-Task encounters become automatic? Preserve the cascade, then tune values.
- Can Matt's overflow Review cross to another Task? Default to the same Task for clarity; consider a rare that breaks the rule.
