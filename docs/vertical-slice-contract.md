# Vertical Slice Gameplay Contract

This document defines the smallest coherent version of the software-engineering deckbuilder. It is a rules contract, not a balance sheet: exact numbers marked **RECOMMENDED** may move during playtesting without changing the game’s identity.

## Decision key

- **LOCKED** — agreed product direction. Implementation should assume it.
- **RECOMMENDED** — the default for the first playable. Change only in response to playtest evidence.
- **OPEN** — a deliberate question. Do not quietly hard-code an answer as game identity.

## Run promise

### LOCKED

- The player chooses three developers. Their combined cards and passives are the run’s “class.”
- The run is one escalating act about shipping a release.
- Each combat-like encounter is a **Cycle** containing two or three simultaneous Tasks. Every Open Task has its own visible intent, and completing a Task removes its future intents.
- The Final Release inverts that structure: it is one large boss Project with all three discipline requirements and escalating intents.
- The team is capable and creates much of its own chaos. AI-assisted work is an accelerant, not a separate faction or simple moral judgement.
- Outcomes must be deterministic enough that a player can explain why they shipped, missed, or created a defect.
- Tactical clarity beats simulation depth. This is a deckbuilder about software work, not a project-management simulator.

### RECOMMENDED

- A complete vertical-slice run should ultimately take 25–35 minutes. The first playable below is a scripted 15–20 minute mini-run.
- No metaprogression, unlock tree, difficulty ladder, daily challenge, compendium, or save migration is required for the slice.

## Squad and deck construction

### LOCKED

- A squad contains exactly **three developers** selected from the available roster.
- Every developer contributes:
  - one always-on passive;
  - one character-defining card to the starting deck;
  - a personal reward-card pool that may appear only while they are in the squad.
- All three passives are active simultaneously.
- Card rewards are drawn only from the selected squad plus a small shared pool. Squad selection must therefore change both the opening deck and its possible evolution.

### RECOMMENDED

- Starting deck size: **10 cards** — three character cards plus seven neutral Basics.
- Recommended Basic package:
  - one **Frontend 3** card;
  - one **Backend 3** card;
  - one **Infra 3** card;
  - two **Flexible 2** cards;
  - one **Review 3** card;
  - one **Standup Cover** card.
- All seven Basics cost **1 Focus**.
- `Frontend 3`, `Backend 3`, and `Infra 3` create 3 Verified Work in a matching requirement. They may use the Pitch In rule against another discipline.
- `Flexible 2` creates 2 Verified Work in any requirement without a mismatch penalty.
- `Review 3` converts up to 3 Unverified Work on one Task into Verified Work.
- `Standup Cover` grants 4 Block and targets the squad rather than a Task.
- Basics are intentionally plain and slightly inefficient. Adding stronger cards and removing Basics should be an immediately legible form of deck growth.
- Character cards may be engines, utility, or high-upside bargains with visible costs. They do not need to cover basic discipline output because the neutral package keeps every squad functional.
- Reward pools should express working style rather than merely repeat discipline colours. A backend developer can still provide planning, review, automation, or risk-control cards.
- Passive text should fit in one short sentence. Repeatable triggers are encouraged when they create an engine; Focus, hand size, Exhaust, target order, Tech Debt, and encounter pressure should constrain them before arbitrary once-per-Day caps do.
- The first playable roster should be **Paul, Odin, Irene, and Madi**, with the player choosing three. This creates four meaningfully different squads while testing speed, architecture, reliable execution, infrastructure, AI tooling, and experimentation. The remaining roster expands in mechanically coherent waves after these engines are proven.
- The full kit and archetype contract lives in [Character Kits and Deck Archetypes](./character-kits-and-archetypes.md). Each developer ultimately owns one fixed Starter, five normal reward cards, and one rare build-around.

## Cycle state

A Cycle is divided into Days. The player spends Focus to play cards against several Tasks, manages risk, then either ships the completed set or reaches the shared deadline.

### LOCKED

- Task requirements use three disciplines: **Frontend**, **Backend**, and **Infra**.
- A normal Cycle contains two Tasks early in the run and may contain three later. Every Task has one or two discipline requirements and its own authored intent sequence.
- Every Open Task displays its current intent before the player acts.
- Work can be **Verified** or **Unverified**. Both fill requirements, but Unverified work carries a forecastable shipping risk.
- A Task becomes **Ready** when all its requirements are filled. Ready Tasks stop producing intents but remain targetable by Review and Verify effects.
- The player wins a normal Cycle by making every Task Ready and shipping before or at the shared deadline.

### RECOMMENDED numbers

- Start each Day with **3 Focus**.
- Draw **5 cards** at the start of each Day.
- Cards cost 0–3 Focus; most cost 1.
- At End Day, discard the remaining hand, resolve every Open Task's visible intent from left to right, advance the deadline, then draw a fresh hand.
- Reshuffle the discard pile when the draw pile is empty.
- Normal Cycle length: **3 Days**. Incident and Final Release length: **4 Days**.
- Normal Task size: 3–8 total Work across one or two requirements. A normal Cycle should contain 10–16 total Work across all Tasks.
- Work never spills from one requirement into another unless a card explicitly says **Flexible**.
- Excess work on a completed requirement is wasted unless a card or Tool explicitly converts it.

## Task targeting and Pitch In

### LOCKED

- A Work card targets one requirement on one Task unless its text explicitly affects multiple Tasks.
- A matching discipline creates the card's full Work value.
- **Pitch In** is a universal fallback rule: a Frontend, Backend, or Infra Work card may target a different discipline to create **1 Unverified Work** instead of its printed output.
- Flexible cards ignore discipline matching and create their printed Work normally.
- Review and Verify effects target any Task containing Unverified Work unless the card says otherwise.
- Pitch In prevents hard locks but should be visibly inefficient. It is not a fourth discipline or a separate card keyword.

### RECOMMENDED

- Highlight legal targets after a card is selected. Matching targets show the printed output; mismatched targets explicitly preview `PITCH IN · 1 UNVERIFIED`.
- Basic Work is Verified when used on-discipline. AI-assisted cards and explicit risky effects create Unverified Work as printed.
- Rare multi-target cards are the equivalent of area-of-effect attacks and should be valued accordingly.

## Day sequence

Use one explicit sequence; effects should not create hidden timing windows.

1. **Start Day** — advance to the Day, refill to 3 Focus, draw 5, then resolve start-of-Day effects.
2. **Plan** — show the current intent, requirement state, unverified exposure, defects, morale, draw/discard counts, and active Tools.
3. **Play** — the player plays cards one at a time and sees each result resolve immediately.
4. **Ship or End Day**:
   - **Ship** is enabled once every Task is Ready. The player may keep playing cards first if Focus/cards remain, including verifying Work on Ready Tasks.
   - **End Day** discards the hand, then every Open Task resolves its intent in the displayed order. Ready Tasks do nothing.
5. **Deadline** — after the final intent resolves, a Cycle with every Task Ready is forcibly shipped; otherwise the Cycle is missed.

### RECOMMENDED timing rules

- Card text resolves top to bottom.
- Developer passive triggers resolve immediately after the card that caused them.
- Tool triggers resolve after passives.
- Task intents resolve only on End Day, never in the middle of a card chain.
- If an effect completes a requirement, completion bonuses resolve immediately.
- A Cycle ends immediately after shipping consequences resolve.

### OPEN

- Can the player undo the most recently played card before any random generation or hidden information occurs? This is valuable for learning but may add state complexity.

## Work, verification, defects, and Tech Debt

These four concepts must remain distinct on screen and in code.

### LOCKED

- **Work** fills a named Task requirement.
- **Unverified Work** counts toward completion but remains visibly marked within that requirement.
- **Verify N** converts up to N existing Unverified Work into Verified Work; it does not create new Work.
- **Defects** are visible, cycle-local problems created by risky cards, intents, and shipping Unverified Work.
- **Tech Debt** is persistent deck pollution that survives into later nodes until removed.

### RECOMMENDED shipping rule

- On Ship, total Unverified Work across all Tasks. Every **3 Unverified Work remaining, rounded up**, creates 1 Defect.
- Resolve any card-created or intent-created Defects alongside those shipping Defects.
- Each unresolved Defect costs **1 Morale**.
- If **2 or more Defects** escape from the same Cycle, add **one Tech Debt** card to the discard pile for future Cycles. This caps the deck-pollution spiral while preserving consequences.
- A Tech Debt card is unplayable, occupies a draw, and has no other text. Its pain should be obvious without adding another subsystem.
- Explicit character cards may add Tech Debt directly as part of a powerful bargain.
- Defects do not survive the Cycle after shipping consequences have been applied.

### RECOMMENDED clarity rule

The Ship button must always preview the exact outcome, for example: `SHIP · 2 DEFECTS · −2 MORALE · +1 DEBT`. Unverified Work is totalled across the Cycle rather than rounded separately per Task. There is no percentage roll when work ships.

### OPEN

- Is the threshold of 3 Unverified Work per Defect enough to create a meaningful verify-versus-ship decision?
- Should excess verification remove an existing Defect after all Unverified Work is cleared? Default: no, until testing shows defect control is too narrow.

## Morale and defeat

### LOCKED

- Morale is the squad's shared health. Individual stamina, stress, or health tracks are out of scope.
- Some Task intents deal immediate, fully telegraphed Morale damage when they resolve at End Day. Completing that Task first cancels the damage along with its other future intents.
- Defects, missed Cycles, and explicit Event choices can also reduce Morale. Weekends, Events, and a few support cards can restore it.
- Reaching **0 Morale at any time** loses the run and opens the Defeat Retro.
- Missing the **Final Release** loses the run even if Morale remains above 0.
- Missing an ordinary Cycle or Incident does not automatically end the run. It applies its consequences, and the run continues if Morale remains above 0.
- Shipping with enough Defects to reduce Morale to 0 is still a defeat. The Retro may accurately describe this as `TECHNICALLY SHIPPED`.
- Running out of cards does not cause defeat; the discard pile reshuffles. Tech Debt is dangerous because it weakens future hands, not because it is a separate instant-loss counter.

### RECOMMENDED

- Start at **12 Morale**, with a cap of **12**.
- Normal Morale intents deal 1 damage. Incidents and the Final Release may telegraph 2 damage.
- Missing a normal Cycle costs **3 Morale** and adds one Tech Debt card.
- Missing an Incident costs **4 Morale** and gives no Tool.
- If multiple End Day intents are queued, resolve them left to right and stop when Morale reaches 0.
- The End Day control includes the stacked incoming Morale total, for example `END DAY · −2 MORALE`. The Task intent badges remain responsible for previewing Scope, Regression, Blocked, and Interruption effects so the button label stays punchy.

### OPEN

- Does a 10-point shared track provide enough room for comedy and recovery without making consequences feel cosmetic?

## Task intents

### LOCKED

- Intents are visible before the Day begins and use an authored sequence. Tasks do not need enemy AI.
- Intent text must say exactly what will happen and identify its target.
- Icons and colour may reinforce intent type but cannot be the only explanation.
- Completing a Task before End Day cancels its displayed intent. This is the primary defensive reward for focusing down one Task.

### RECOMMENDED first intent vocabulary

Keep the first playable to five reusable effects:

- **Scope +N** — increase one named requirement by N.
- **Regression N** — remove N Unverified Work, then Verified Work if necessary.
- **Blocked: Type** — cards producing that discipline cost +1 next Day.
- **Interruption** — shuffle one Distraction card into the draw pile for the next Day only.
- **Crunch −N** — immediately lose N Morale when this intent resolves.

Task definitions should contain a fixed intent sequence, such as `Scope Frontend +2`, then `Regression 2`, then `Crunch −1`. Repetition and escalation are acceptable; hidden branching is not required.

### OPEN

- With several simultaneous Tasks, show only each Task's current intent by default. The Final Release may show its current and next intent to support boss planning.

## Cycle outcomes and report

### LOCKED

- Every Cycle ends in a short report before rewards or returning to the map.
- The report explains causality: each Task's result, verified/unverified totals, cancelled and resolved intents, defects, Morale change, Tech Debt added, and character contributions.
- A successful normal Cycle offers **three cards; choose one or Skip**.
- Character awards and jokes may decorate the report but cannot obscure the mechanical result.

### RECOMMENDED

- Early Ship grants a small, deterministic bonus: **+5 Credits per unused Day**. It should not grant extra cards or Morale.
- A Missed Cycle gives no card reward. The run continues if Morale remains above 0.
- Reward rarity can be omitted in the first playable. Draw three distinct eligible cards from the squad pools and shared pool.
- Never offer a card already at its per-deck copy cap if all three choices can avoid it.
- Skip has no compensation in the first playable; deck thinness is itself the reward.

### OPEN

- Is an early-shipping credit bonus sufficient, or does it make verification feel financially foolish?
- Should rewards guarantee at least two different developers are represented? Default: yes for character visibility, unless it makes deckbuilding too scripted.

## Tools (artifact system)

### LOCKED

- Tools are persistent, always-on artifacts comparable to Slay the Spire relics.
- Tools are separate from cards and cannot clog the deck.
- Incidents are their main guaranteed source; Shops and Events may also provide them.

### RECOMMENDED

- No inventory limit for the slice.
- One short effect per Tool; no Tool upgrades, sets, sockets, durability, or activation buttons.
- First playable examples:
  - **CI Pipeline** — the first Unverified Work added each Day is Verified instead.
  - **Error Monitor** — prevent the first Defect created each Cycle.
  - **Shared Component** — the first Frontend card each Day produces +1 Work.
  - **Feature Flag** — once per Cycle, cancel a Regression intent.
- An Incident reveals **three Tools; choose one**. This makes the system testable in a short run.

### OPEN

- Is `Tools` the final name, or should a more characterful label emerge from the art direction? Use `Tools` in code and UI until a better name wins.

## Credits and Shop

### LOCKED

- A Shop can sell cards and Tools and must provide a way to thin the deck.
- The player may leave without buying anything.

### RECOMMENDED

- Currency is **Credits**.
- Start with 40 Credits. Successful Cycles grant 20 Credits plus any early-ship bonus. Events may add or remove Credits.
- Shop inventory: three cards, two Tools, and one **Remove** service.
- Suggested prices: card 35, Tool 70, Remove 50.
- Remove permanently deletes one non-Tech-Debt card from the deck. Tech Debt removal costs 35, making cleanup possible without being free.
- Inventory does not reroll. Buying does not replace the item.
- No selling, haggling, card upgrades, or shopkeeper relationship system in the slice. The scope goblin has been escorted from the premises.

### OPEN

- Should Remove increase in price after each use across the run? Default: no for the short slice.
- Should the Shop offer a free inspect-deck view before purchase? Default: yes; this is interface support, not another game system.

## Map and nodes

### LOCKED

- The act uses a node-based map with visible branching.
- Required node types are **Cycle**, **Incident**, **Event**, **Weekend**, **Shop**, and **Final Release**.
- The player can inspect the squad, deck, Tools, Morale, and Credits from the map.

### RECOMMENDED full-slice structure

- Use a vertically scrolling map with 7–9 visited nodes per run plus the Final Release.
- Paths branch across 2–3 nodes per row and reconverge before the boss.
- A representative run visits:
  - 3–4 normal Cycles;
  - 1 Incident;
  - 1–2 Events or Weekends;
  - 0–1 Shop;
  - 1 Final Release.
- The map layout can be authored rather than procedurally generated for the slice. Node contents may be sampled from small pools.
- Display node type and whether it has been visited; do not reveal every Cycle's exact Tasks or requirements from the map.

## Incidents

### LOCKED

- Incidents are elite Cycles: harder, more consequential, and the main source of Tools.
- They reuse the Cycle rules and screen rather than introducing a second combat engine.

### RECOMMENDED

- Incidents contain two or three Tasks with higher requirements, four Days, more disruptive intents, and one distinctive rule modifier.
- Example modifier: **Live Traffic** — the first Unverified Work each Day creates 1 Defect.
- Success gives Credits, a normal card reward, and a three-Tool choice.
- Failure applies its Morale/debt consequence and gives no Tool.

## Events and Weekends

### LOCKED

- Events offer 2–3 short, mechanically explicit choices.
- Weekends are the campfire equivalent and offer recovery or deck improvement.
- Both use a shared presentation and resolution framework.

### RECOMMENDED

- Event outcomes may change Morale, Credits, cards, or Tech Debt. Avoid event-only currencies and bespoke minigames.
- A Weekend offers exactly three actions:
  - **Rest** — restore 3 Morale.
  - **Refactor** — remove one Tech Debt card; if none exists, remove one non-Tech-Debt card.
  - **Tinker** — upgrade one card. For the first playable, an upgrade changes a single authored number or cost and is stored as `upgradeLevel: 1`.
- Developer-specific event choices are excellent flavour but not required in the first playable.

### OPEN

- Card upgrades add content and UI burden. If they threaten the 15–20 minute build, replace Tinker with `Gain 30 Credits` for the first playable and defer upgrades.

## Final Release

### LOCKED

- The Final Release is the boss of the act and uses the same core Cycle rules.
- Unlike ordinary Cycles, it contains one large Project rather than several Tasks. Mechanically, that Project occupies the same target slot as a Task so cards, requirements, Review, and intents do not need a second rules engine.
- Shipping it opens the Victory Retro. Missing it or reaching 0 Morale opens the Defeat Retro.

### RECOMMENDED

- Four Days, all three requirement types, 24–30 total Work.
- Two phases expressed through intents rather than a new rules engine:
  - Days 1–2: scope and blockers;
  - Days 3–4: regression and morale pressure.
- The release has one persistent rule: **Launch Pressure** — each unresolved Defect costs 2 Morale instead of 1.
- Final shipping still uses the standard Unverified-to-Defect calculation and exact preview.
- No post-boss card or Tool reward.

### OPEN

- Should the player be allowed to ship the Final Release with defects if the exact Morale loss would reduce Morale to 0? Default: yes, and it is a defeat; “technically shipped” can become the Retro joke.

## Victory and defeat Retro

### LOCKED

- The run summary is styled as a remote retrospective board with digital stickies.
- Victory and defeat use the same Retro structure and stay bright, affectionate, and funny.
- The summary must preserve the run’s tactical story, not just produce jokes.

### RECOMMENDED

- Use three board columns:
  - **WENT WELL** — Cycles shipped, early ships, verified percentage, strongest combo.
  - **DIDN’T** — missed Cycles, escaped defects, Morale lost, Tech Debt remaining.
  - **ACTIONS** — one or two mechanically grounded lessons and `PLAY AGAIN`.
- Also show squad, chosen path, cards added/removed, Tools acquired, final deck size, and one award per developer.
- Character cursors, reactions, and Sharkimedes commentary are presentation only; the statistical summary is authored from recorded run facts, not generated text.

## First playable: 15–20 minute mini-run

The first playable should prove the decision loop before the complete content set is built.

### RECOMMENDED route

1. **Squad** — choose three of Paul, Odin, Irene, and Madi.
2. **Cycle** — a two-Task normal encounter; choose one of three reward cards or Skip.
3. **Branch** — choose one authored Event or one Weekend.
4. **Shop** — buy or remove, then leave.
5. **Incident** — a four-Day, multi-Task encounter with one modifier; choose a Tool and a card on success.
6. **Final Release** — all three disciplines, then Victory/Defeat Retro.

This is a deliberately short authored map. It exercises every high-value system once without pretending procedural variety exists yet.

### First-playable content counts

| Content | Count | Notes |
| --- | ---: | --- |
| Developers | 4 | Choose 3; placeholder art is acceptable |
| Starting card definitions | 4 character + 5 Basic | The chosen squad contributes 3 character cards; the 9-copy Basic package makes a 12-card deck |
| Reward cards | 12 personal + 3 shared | Three per developer; avoid rarity initially |
| Tech Debt / Distraction cards | 2 templates | Status cards, not reward cards |
| Normal Cycles | 2 | Each contains 2 authored Tasks; one active and one alternate for repeat tests |
| Incidents | 1 | Contains 2–3 Tasks and one persistent modifier |
| Final Releases | 1 | One fixed, large boss Project |
| Intent effects | 5 | Shared vocabulary above |
| Events | 1 | 2–3 choices |
| Weekend actions | 3 | Rest, Refactor, Tinker or fallback |
| Tools | 4 | Incident offers 3; Shop may offer 2 |
| Shop inventories | 1 authored template | Draw from eligible squad cards/Tools |
| Retro awards | 4–6 | Deterministic conditions, not bespoke prose generation |

### Full vertical-slice content target

- 6 developers: Paul, Odin, Irene, Madi, Matt, and Elspeth.
- 36–42 developer cards plus 6 shared cards and the 5 Basic templates.
- 6 normal Cycles, 2 Incidents, 1 Final Release.
- 6 Events, 1 Weekend action set, 10–12 Tools.
- 2–3 authored map layouts or one constrained layout generator.
- One 25–35 minute act, with no second act required.

## Suggested data shapes

These shapes favour declarative content and a small set of reusable effect primitives. Names are illustrative, not an implementation mandate.

```ts
type Discipline = "frontend" | "backend" | "infra";
type WorkKind = "verified" | "unverified";
type NodeKind = "cycle" | "incident" | "event" | "weekend" | "shop" | "final";

type DeveloperDefinition = {
  id: string;
  name: string;
  passive: Effect[];
  startingCardId: string;
  rewardCardIds: string[];
};

type CardDefinition = {
  id: string;
  ownerDeveloperId?: string;
  name: string;
  cost: number;
  tags: (Discipline | "flexible" | "basic" | "ai_assisted" | "review" | "automation" | "shared")[];
  effects: Effect[];
  upgrade?: { cost?: number; effects?: Effect[] };
  maxCopies?: number;
};

type Effect =
  | { kind: "addWork"; discipline: Discipline | "flexible"; amount: number; workKind: WorkKind }
  | { kind: "verify"; discipline?: Discipline; amount: number }
  | { kind: "addDefect"; amount: number }
  | { kind: "removeDefect"; amount: number }
  | { kind: "draw"; amount: number }
  | { kind: "gainFocus"; amount: number }
  | { kind: "morale"; amount: number }
  | { kind: "addCard"; cardId: string; destination: "draw" | "discard" | "hand" }
  | { kind: "exhaustSelf" }
  | { kind: "custom"; behaviorId: string };

type TaskDefinition = {
  id: string;
  name: string;
  requirements: Partial<Record<Discipline, number>>;
  intents: IntentDefinition[];
};

type CycleDefinition = {
  id: string;
  kind: "normal" | "incident" | "final";
  name: string;
  maxDays: number;
  tasks: TaskDefinition[]; // Final Release contains exactly one boss Project here.
  modifierId?: string;
  rewards: { credits: number; cardChoice: boolean; toolChoice: boolean };
};

type IntentDefinition =
  | { kind: "scope"; discipline: Discipline; amount: number }
  | { kind: "regression"; amount: number }
  | { kind: "blocked"; discipline: Discipline }
  | { kind: "interruption"; cardId: string }
  | { kind: "crunch"; moraleLoss: number };

type RunState = {
  squadIds: [string, string, string];
  morale: number;
  credits: number;
  deck: CardInstance[];
  toolIds: string[];
  currentNodeId: string;
  visitedNodeIds: string[];
  history: RunHistoryEvent[];
};

type CycleState = {
  cycleId: string;
  day: number;
  focus: number;
  tasks: TaskState[];
  defects: number;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  temporaryModifiers: ModifierInstance[];
};

type TaskState = {
  taskId: string;
  status: "open" | "ready";
  intentIndex: number;
  work: Partial<Record<Discipline, { verified: number; unverified: number }>>;
};
```

Keep `RunState` serialisable. Record structured history events when cards, Tools, requirements, defects, Morale, rewards, and nodes change; the Cycle Report and Retro should read this ledger rather than reconstruct causality from final state.

## Prototype questions and success criteria

The first playable exists to answer these questions, in this order:

1. **Can players read the decision?** Within five seconds, can a player identify remaining requirements, every Open Task's current intent, Focus, Unverified Work, Defects, and the exact consequence of shipping?
2. **Is verification a real trade-off?** Do players sometimes choose verification over raw progress for reasons they can articulate, rather than always verifying or never verifying?
3. **Does squad choice create a class?** After two Cycles, can players describe how two different three-person squads plan and take risks differently?
4. **Do character mechanics generate the comedy?** Can players point to a funny outcome caused by a passive/card interaction, without needing flavour text to explain why it was funny?
5. **Are intents tactically relevant?** Do players change the order or type of cards they play because of the visible intent?
6. **Does AI feel like capability plus catastrophe?** Are AI-assisted/Unverified effects attractive enough to use, while their cleanup and shipping consequences remain understandable and manageable?
7. **Are Defects and Tech Debt distinct?** After one explanation, can players correctly predict which is immediate Cycle risk and which will hurt future draws?
8. **Does deckbuilding begin quickly enough?** Does the first three-card reward create a meaningful direction, including a credible reason to Skip?
9. **Does thinning matter?** At the Shop or Weekend, can the player identify a card or Tech Debt they would plausibly remove and why?
10. **Are Tools exciting without adding homework?** Does a Tool visibly change at least one later decision, and can players remember its effect without repeatedly opening details?
11. **Does failure bend rather than break the run?** Can a missed normal Cycle create a tense comeback instead of an obvious death spiral?
12. **Does the Retro tell the truth?** Can the player use it to reconstruct the run’s pivotal choice, while still enjoying the character jokes?
13. **Is the pace right?** Can a first-time player finish in 20 minutes and a repeat player in 15 without skipping decisions or reports?

Do not use “players liked it” as the sole gate. The prototype succeeds when observers see deliberate verify-versus-ship decisions, different squad lines, understandable consequences, and at least one self-created disaster the player wants to recount afterward.

## Explicitly out of scope

- Enemy AI, hidden intent logic, or project simulation beyond authored effects.
- Individual developer health, burnout, availability calendars, or interpersonal conflict meters.
- Separate combat systems for incidents or the final boss.
- Partial Work or completed-Task carryover after a missed Cycle.
- Random defect rolls at Ship.
- Equipment slots, consumables, inventory limits, or Tool upgrades.
- Multiple acts, permanent unlocks, account systems, online multiplayer, or leaderboards.
- Generated card rules or generated Retro statistics at runtime.
- Literal ticket-board workflow, office simulation, or bureaucracy-management mechanics.
