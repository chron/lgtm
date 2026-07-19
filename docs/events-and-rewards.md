# Events and Rewards

This document is the first-pass design contract for Backlog's mystery Event nodes. Events should be quick, explicit, mechanically meaningful breaks between Cycles—not miniature dialogue trees or flavour text wearing a button costume.

## Scope

### LOCKED

- The vertical slice launches with **12 events** and grows toward 14–16 only after the first pool is browser-playable.
- An eight-fight run should normally visit 2–4 Event nodes.
- Event names remain hidden on the map. The player chooses a mystery node based on node type, then discovers the event on entry.
- Do not repeat an event within one run until every eligible event has appeared. Repetition across runs is acceptable.
- Event selection is deterministic from the run seed and current eligibility.
- Most events offer three choices: one stabilising option, one build-shaping option, and one ambitious or costly option.
- Every choice shows its exact mechanical outcome before confirmation. Hidden outcomes are allowed only when the choice explicitly shows odds or says it is random.
- Keep copy punchy: one title, one short setup, choice labels, and outcome chips. No eyebrows, explanatory subheadings, or paragraphs beneath every button.
- Humour targets startup situations and shared team lore, not disability, parenting, location, seniority, or an individual's communication needs.

Values are **PROVISIONAL** until full-run playtests exist. Event identities, choice shapes, and reward primitives are the contract.

## Event selection and conditional choices

Events may be weighted by squad, run state, or previous choices without becoming completely inaccessible. Examples:

- **Cat Tax** is more likely when Kirsten, Paul, or Odin is selected.
- **Daylight Saving Incident** is more likely with Seb.
- **Founder Hackathon** may expose an Odin-specific sceptical response when he is present.
- A deck with no removable Basic disables rather than hides a removal choice, with a concise reason.
- A Tool already owned is removed from that Tool offer and replaced deterministically.

Small conditional choices are preferred over duplicating an entire event for every character. They make the selected squad feel present while keeping the authoring surface sane.

## Reusable outcome primitives

Event implementation must compose typed effects rather than branching on twelve event IDs in the reducer.

1. **Ledger:** gain or lose Credits, current Morale, maximum Morale, or Tech Debt.
2. **Deck surgery:** add, remove, duplicate, or transform a chosen persistent card.
3. **Filtered draft:** choose one of three cards filtered by squad member, tag, discipline, or rarity.
4. **Tool offer:** choose one Tool from an explicit list or a seeded eligible pool.
5. **Next-Cycle modifier:** opening Focus, opening draw, a queued Status, Intent protection, or another visible one-Cycle effect.
6. **Temporary guest card:** add a non-squad Starter for the next Cycle only; remove it when that Cycle ends.
7. **Bounty Task:** add an optional Task to the next Cycle with a visible extra reward and no penalty if ignored.
8. **Reward modifier:** increase the next card choice count, guarantee a rarity, or filter its theme.
9. **Map modifier:** reveal upcoming nodes or alter one legal future connection.

When Tech Debt is reduced, remove any persistent Tech Debt cards no longer supported by the score's three-Debt thresholds. A choice that requires another selection—card removal, duplication, draft, or Tool offer—keeps the Event node active until that selection is complete.

## First event batch

### 1. Quarterly Connect

The whole team gets in one room and briefly remembers what everyone else actually works on.

| Choice | Outcome |
| --- | --- |
| **Demo** | Choose 1 of 3 normal cards belonging to the current squad. |
| **Cross-Pollinate** | Choose a non-squad Starter to borrow for the next Cycle. |
| **Retro** | Restore 3 Morale and reduce Tech Debt by 2. |

### 2. Level-Up Day

No roadmap work. Allegedly.

| Choice | Outcome |
| --- | --- |
| **Learn** | Choose 1 of 3 cards from a visible shared theme. |
| **Refactor** | Remove one Basic or Tech Debt card from the persistent deck. |
| **Tinker** | Choose 1 of 3 Tools; gain 2 Tech Debt. |

### 3. Quiet Hours

The NZ morning begins. Australia is still offline. Slack is beautiful.

| Choice | Outcome |
| --- | --- |
| **Deep Work** | Start Day 1 of the next Cycle with 2 additional Focus. |
| **Clean Up** | Remove one Basic or Tech Debt card. |
| **Plan Async** | Draw 2 additional cards on Day 1 of the next Cycle. |

### 4. Karaoke Night

Someone has selected a song with a dangerously long instrumental intro.

| Choice | Outcome |
| --- | --- |
| **Solo** | Restore 4 Morale. |
| **Duet** | Pay 15 Credits to duplicate a non-Rare persistent card. |
| **Power Ballad** | Increase maximum Morale by 2; add 1 Distraction at the start of the next Cycle. |

### 5. Coffee Summit

NZ and Melbourne agree to settle this properly. They do not agree on what “properly” means.

| Choice | Outcome |
| --- | --- |
| **NZ Cup** | Start Day 1 of the next Cycle with 2 additional Focus. |
| **Melbourne Flat White** | Draw 2 additional cards on Day 1 of the next Cycle. |
| **Order for Everyone** | Pay 10 Credits, restore 3 Morale, then gain 1 opening Focus and 1 opening draw next Cycle. |

Neither region is canonically correct.

### 6. Cat Tax

Bread, Toast, Mila, or Angus has entered the call and immediately improved it.

| Choice | Outcome |
| --- | --- |
| **Wave Hello** | Restore 3 Morale. |
| **Keyboard Review** | Reduce Tech Debt by 2 and remove any unsupported Debt card. |
| **Make Them Mascot** | Pay 15 Credits and gain **Cat Tax**. |

**Cat Tax** is an event-exclusive Tool: whenever a Status card is drawn, draw 1 additional card. The deck is finite; do not cap the trigger.

### 7. Mascot Council

The Reef Shark, Platypus, and Pangolin convene. Matt's illustrations have become governance.

Choose one event-exclusive Tool:

| Tool | Effect |
| --- | --- |
| **Reef Shark** | Whenever a non-final Task ships, draw 1. |
| **Platypus** | Script and Guard triggers produce 1 additional Work or Block. |
| **Pangolin** | Whenever a card grants Block, gain 2 additional Block. |

These effects are deliberately uncapped and should be allowed to create builds.

### 8. Founder Hackathon

Nick has a board, Tristan has a spreadsheet, and Mateja has rebuilt half a product since lunch.

| Choice | Outcome |
| --- | --- |
| **Let Mateja Cook** | Choose 1 of 3 Rare AI Assisted cards; gain 3 Tech Debt. |
| **Ask Tristan for Numbers** | Choose 1 of 3 Backend or Review cards. |
| **Nick Makes a Board** | Reveal upcoming map nodes; the next card reward shows 4 choices. |

### 9. Customer Feedback Flood

The customers are thoughtful, engaged, and have written several extremely actionable paragraphs.

| Choice | Outcome |
| --- | --- |
| **Synthesize** | Choose 1 of 3 Flexible or Review cards. |
| **Fix the Top Pain** | Add a small Bounty Task to the next Cycle; shipping it grants a Tool offer. |
| **Share the Praise** | Restore 3 Morale; the next card reward shows 4 choices. |

### 10. Enterprise Request

It is genuinely important. It is also needed rather soon.

| Choice | Outcome |
| --- | --- |
| **Commit** | Add a large Bounty Task to the next Cycle; shipping it grants 30 Credits and a Rare-card offer. |
| **Negotiate** | Gain 15 Credits; Stun the next Scope Intent this run. |
| **Prototype** | Choose 1 of 3 AI Assisted cards; gain 3 Tech Debt. |

### 11. Design Opened a PR

The designers and PMs are coding now. Reactions in the developer channel are mixed but fascinated.

| Choice | Outcome |
| --- | --- |
| **Pair Up** | Add **Pair Programming** to the persistent deck. |
| **Review Together** | Transform one Unverified discipline Basic into a Verified equivalent. |
| **Merge It** | Gain 20 Credits and 2 Tech Debt. |

### 12. Daylight Saving Incident

The calendar says nine. Queensland says absolutely not.

| Choice | Outcome |
| --- | --- |
| **Go Async** | Draw 2 additional cards on Day 1 of the next Cycle. |
| **Move Standup** | Restore 3 Morale and ignore the next Distraction added this run. |
| **Automate Calendar** | Gain **Timezone Wrangler**. |

**Timezone Wrangler** is an event-exclusive Tool: unspent Focus carries into the next Day. It remains uncapped.

## Follow-up pool

After the first twelve are playable, add **Sharkimedes Has Thoughts**, **Vietnam Planning Thread**, **Competitor Launch**, and **Marketing Needs Backup**. These should lean harder into character-conditional choices, map editing, and showcase Bounty Tasks rather than introducing another pile of currencies.

## Presentation contract

- Event art may use Slack threads, call grids, dashboards, calendars, or mascot illustrations, but the interaction remains a game choice—not a fake productivity app.
- Choice buttons show an imperative label and compact outcome chips.
- Disabled choices remain visible with one direct reason such as `Need 15 Credits` or `No Basic cards`.
- Selecting a choice receives immediate ceremony before any secondary draft/removal view opens.
- Returning to the map happens only after every pending event selection resolves.
- Event history records the event ID, choice ID, and exact outcome for deterministic playtest scripts.
