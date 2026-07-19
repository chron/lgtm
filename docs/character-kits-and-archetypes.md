# Character Kits and Deck Archetypes

This document is the design contract for LGTM's developer roster and deck-building engines. It defines what each character contributes, how squads combine into builds, and which shared mechanics must exist before the full card catalogue is authored.

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

| Basic | Copies | Quality |
| --- | ---: | --- |
| **Frontend 3** | 1 | Unverified |
| **Backend 3** | 1 | Unverified |
| **Infra 3** | 1 | Unverified |
| **Flexible 2** | 2 | Verified |
| **Review 3** | 1 | Review |
| **Standup Cover** | 1 | Block 4 |

The discipline Basics are deliberately risky filler. They make verification, shipping defects, Morale loss, and Tech Debt part of the opening game, while the weaker Flexible cards preserve a safe route for squads without a Review specialist. Character cards should usually feel stronger through mechanics, output, or Verified quality. Tune shipping penalties after playtesting this deck rather than making every Basic safe pre-emptively.

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

All twelve character identities and seven-card catalogues are **LOCKED** for their first playable passes. Values remain tunable through deterministic and browser playtests; implementation status lives in Beads rather than this design contract.

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
- **Passive:** **Shared Components** — whenever Verified Work completes a Frontend requirement, add 1 Verified Frontend Work to every other open Task with an incomplete Frontend requirement.
- **Core space:** spread, reuse, Frontend completion, Shared Component-style echoes.
- **Bridges:** Irene turns distributed points into draws; Matt converts overflow into polish; Levi can keep a primary Task moving while echoes cover the rest.

Seb's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Use the Component** | 1 | Frontend 3, Verified. Then add 1 Verified Frontend Work to every other open Task. |
| Normal | **Design Tokens** | 1 | Add 2 Verified Frontend Work to every open Task. Exhaust. |
| Normal | **Ladle** | 1 | Frontend 2, Verified. Install Script 1 on that requirement. |
| Normal | **Extract Component** | 1 | Frontend 4, Verified. If it completes the requirement, trigger Shared Components one additional time. |
| Normal | **Used Everywhere** | 1 | Frontend 2, Verified, plus 2 Work for every other open Task with an incomplete Frontend requirement. |
| Normal | **Polish the Primitives** | 1 | Verify 4. If this removes the Task's last Unverified Work, add 2 Verified Frontend Work to every other open Task. |
| Rare | **Design System Migration** | 1 | Install Script 1 on every incomplete Frontend requirement, then trigger each. Exhaust. |

Shared Components echoes are ordinary Verified Work packets. They can complete requirements and recursively trigger further echoes, including Irene's completion draws and Matt's future overflow conversion. Resolve the packets through a FIFO queue in Task and requirement board order. Completed requirements and shipped Tasks leave the candidate set, making the cascade finite without an artificial trigger cap.

When an effect adds Frontend Work to a Task rather than targeting a specific requirement, it chooses the incomplete Frontend requirement with the least Work remaining and uses board order to break ties. **Use the Component** and **Design Tokens** spread their explicit Work whether or not the original hit completes anything; each resulting completion may still trigger Shared Components. **Extract Component** produces both the ordinary passive echo and one additional echo when its own hit completes.

**Used Everywhere** counts other open Tasks before its targeted Work resolves and adds the resulting bonus to that single Work packet. **Polish the Primitives** resolves its Review before checking whether any Unverified Work remains. **Design System Migration** performs every install first, then triggers the affected requirements in board order, allowing Steph to refund Focus for each installation before the cascade begins.

Seb needs a wide-board showcase such as **Design System Adoption**: four or five smaller Frontend-heavy Tasks where distributed Work and recursive completion can shine, contrasted with Levi's single enormous Task encounter.

### Toby — defensive conversion

- **Fantasy:** notice the problem, absorb the blast radius, and turn operational calm into forward progress.
- **Passive:** **Quietly On It** — whenever Block prevents Morale loss from a Crunch Intent, add that much Verified Work to that Intent's Task.
- **Core space:** Block, Guard Scripts, observability, profiting from telegraphed Crunch.
- **Bridges:** Elspeth supplies repeatable Block; Steph builds Guard automation; Odin chooses which intents to Stun and which to safely absorb.

Toby's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Check the Logs** | 1 | Infra 2, Verified. Gain 3 Block. |
| Normal | **On Call** | 1 | Gain Block equal to the total incoming Morale this Day. |
| Normal | **Useful Alerting** | 1 | Install Guard 2, then trigger it. |
| Normal | **Above and Beyond** | 0 | Gain 2 Block, then double your Block. Exhaust. |
| Normal | **Keep It Humming** | 1 | Infra 2, Verified. Trigger every Guard on that Task. |
| Normal | **Triage** | 1 | Stun one non-Crunch Intent. Gain 4 Block. |
| Rare | **Nothing Gets Past Me** | 1 | Gain 6 Block. This Day, prevented Crunch damage becomes Verified Work on every open Task instead of only its source Task. Exhaust. |

Quietly On It applies its Work to the open requirement on the Intent's Task with the least Work remaining, preferring Infra and using board order to break ties. It must not become inactive merely because a Task has no Infra requirement. Each Crunch resolves against the ordinary shared Block pool, and the amount actually prevented produces one conversion trigger.

**On Call** reads the current total displayed incoming Morale from unstunned open Intents. **Useful Alerting** installs before it triggers. **Above and Beyond** gains its flat Block before doubling, giving it a floor of 4 while allowing large setup turns; Exhaust is its natural limiter. **Keep It Humming** triggers Guards in requirement order.

**Triage** deliberately cannot Stun Crunch: it removes Scope, Distraction, and other disruptive Intents while leaving manageable damage for Toby to convert. **Nothing Gets Past Me** broadens Quietly On It for the Day rather than triggering it twice on the source Task. For each point of prevented Crunch damage, every open Task receives the same amount of Verified Work using the ordinary target rule above. Block is still spent normally and expires at the end of the Day.

At least one later encounter must present multiple telegraphed Crunch Intents on the same Day. That is Toby's showcase: assemble enough Block, decide which non-Crunch effects to cancel, and turn an apparent disaster into a board-wide burst of progress.

### Steph — automation accelerator

- **Fantasy:** make the paved road so smooth that the whole team moves faster.
- **Passive:** **Paved Road** — whenever a Script or Guard is installed or upgraded, gain 1 Focus.
- **Core space:** install, upgrade, trigger-now effects, and temporary Macros.
- **Bridges:** Madi supplies frequent installs; Toby turns Guard into progress; Card Storm spends the refunded Focus.

Steph's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **One-Click Setup** | 1 | Install Script 1, then trigger it. |
| Normal | **Automate This Bit** | 1 | Install Script 2. |
| Normal | **Guardrails, Not Gatekeepers** | 1 | Install Guard 2, then trigger it. |
| Normal | **Refactor the Workflow** | 1 | Double the target requirement's Script and Guard. Unplayable if both are 0. |
| Normal | **Hot Reload** | 1 | Trigger the target requirement's Script and Guard twice. |
| Normal | **Make It a Command** | 1 | Generate 2 Macros. |
| Rare | **Golden Path** | 2 | Install Script 1 on every incomplete requirement. Exhaust. |

**Macro** is a zero-cost Generated token: trigger the target requirement's Script and Guard once; Exhaust.

Paved Road has no once-per-Day limit. Each automation meter increased is a separate trigger: installing both Script and Guard gains 2 Focus, and doubling both with **Refactor the Workflow** does the same. **Golden Path** triggers Paved Road separately for every incomplete requirement it installs on, allowing a busy board to produce an indecent but finite Focus surplus. Triggering an existing Script or Guard does not activate Paved Road because its meter did not increase.

Install-then-trigger cards resolve in that order, so **One-Click Setup** and **Guardrails, Not Gatekeepers** always have an immediate floor. **Hot Reload** and Macro skip automation types at 0. The cards' ordinary Focus costs, available automation targets, finite draw, and Exhausting Generated Macros are the natural constraints; do not add an artificial trigger cap before playtesting the complete engine.

### Elspeth — sustainable support

- **Fantasy:** make space for the team, smooth the sharp edges, and keep the pace survivable.
- **Passive:** **Healthy Pace** — whenever a card with the Flexible tag is played, gain 2 Block.
- **Core space:** Flexible Work, Block generation, morale support, squad-wide stabilisation.
- **Bridges:** Toby converts her Block into progress; Irene rewards precise Flexible completion; Paul gains room to take risk.

Elspeth's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Make Space** | 1 | Flexible 3, Verified. Gain 3 Block. |
| Normal | **Psychological Safety** | 1 | Flexible cards gain 2 additional Block for the rest of this Cycle. Exhaust. |
| Normal | **Check In** | 1 | Generate a Snippet and a Checklist. |
| Normal | **Air Cover** | 1 | Gain 3 Block for every open Task. |
| Normal | **Room to Breathe** | 1 | Flexible 3, Verified. If your Block now covers all incoming Morale, draw 2. |
| Normal | **Healthy Guardrails** | 1 | Flexible 1, Verified. Install Guard 2, then trigger it. |
| Rare | **Sustainable Pace** | 1 | Gain 10 Block, gain 3 Focus, and draw 3. Exhaust. |

Healthy Pace checks the card's explicit Flexible tag, not the discipline of the requirement it ultimately targets. Pay the card's Focus cost first, then resolve Healthy Pace and any **Psychological Safety** stacks before the card's own effects. Pitching In with a non-Flexible card does not count. Flexible Basics, Snippets, Quick Fixes, and other genuinely Flexible cards do count.

**Psychological Safety** adds 2 Block to every future Flexible-card trigger this Cycle and stacks without a cap. It does not benefit from its own effect because it is not itself Flexible. **Check In** generates the shared Snippet and Checklist tokens; playing the Snippet later activates Healthy Pace, while generating it does not.

**Air Cover** counts currently open Tasks when it resolves. **Room to Breathe** checks Block after Healthy Pace and its Work have resolved, against the current total displayed incoming Morale from unstunned Intents. **Healthy Guardrails** resolves Healthy Pace, its Work, the Guard installation, and then the immediate Guard trigger in that order. **Sustainable Pace** is intentionally a dramatic reset turn whose finite draw and Exhaust are its natural constraints.

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
- **Passive:** **Finishing Touches** — when Verified Work exceeds what its requirement needs, use the overflow as Review on that Task.
- **Core space:** overkill, Review, completion polish, high-quality finishing turns.
- **Bridges:** Seb creates distributed overflow; Odin turns Review into control; Irene rewards requirements completed on the way.

Matt's catalogue is **LOCKED** for its first playable pass. Values may still move during playtesting.

| Slot | Card | Cost | Effect |
| --- | --- | ---: | --- |
| Starter | **Delight Moment** | 1 | Frontend 4, Verified. If it completes the requirement, draw 1. |
| Normal | **One More Pass** | 1 | Flexible 5, Verified. Only target a requirement with 3 or less Work remaining. Exhaust. |
| Normal | **Polish Budget** | 1 | This Day, whenever Finishing Touches actually Reviews Work, gain equal Block. Exhaust. |
| Normal | **No Rough Edges** | 1 | Verify 5. If the Task has no Unverified Work afterward, gain 1 Focus and draw 1. |
| Normal | **Delight Budget** | 1 | Gain 3 Block for every completed requirement on open Tasks. |
| Normal | **Microinteraction** | 1 | Flexible 2, Verified. If it completes the requirement, add 2 Verified Work to the incomplete requirement on that Task with the least Work remaining. |
| Rare | **Pixel Perfect** | 1 | Frontend 10, Verified. Apply its overflow as Review to every open Task. Draw 1 for each Task from which this removes the last Unverified Work. Exhaust. |

Finishing Touches observes every Verified Work packet, including played cards, Scripts, automation triggers, secondary hits, and Seb's Shared Components echoes. Work resolution records the attempted amount, amount actually applied, and overflow. The overflow then becomes a real Review event on the same Task, activating Odin and other Review triggers. Only Work actually converted from Unverified to Verified counts as Review; unused overflow is lost.

The Unverified discipline Basics give Matt ambient material from the opening encounter. Paul, Madi, Quick Fixes, Pitch-In, and future risky rewards amplify the engine but are not required to switch it on. Removing every Unverified card remains a valid deck-building choice that weakens Finishing Touches in exchange for safer shipping.

**One More Pass** checks remaining Work before play. **Polish Budget** gains Block only for the amount Finishing Touches actually converts and stacks when multiple copies are active. **Microinteraction's** second hit is its own Verified Work packet and can produce another finishing trigger.

**Pixel Perfect** replaces Finishing Touches' ordinary single-Task conversion for its Work packet rather than double-dipping the source Task. It duplicates the full overflow as Review on every open Task in board order and draws only for Tasks whose last Unverified Work it actually removes. The shared reward previously named **Pixel Perfect** becomes **UI Polish**, reserving the stronger name for Matt's rare.

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

- Should Tech Debt payoffs inspect all persistent Debt, or only Debt currently visible in hand/draw/discard? Prefer the persistent deck count unless a card explicitly Exhausts a visible copy.
