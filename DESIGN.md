# Design

## Register

Product UI with game presentation. Tactical clarity is the default; spectacle is earned by decisive actions.

## Visual Direction

The base is a bright collaborative canvas with lightly tinted paper, dotted-grid texture, chunky charcoal ink, and hard offset shadows. Launch-broadcast typography supplies the loud titles. Character art uses original western Saturday-morning animation language and is allowed to break its local frame.

Avoid dark deckbuilder gloom, literal work-software recreation, corporate dashboard polish, glass effects, and physical-office nostalgia.

## Palette

- `--paper` and `--panel`: warm tinted neutrals for the dominant surface.
- `--ink`: purple-tinted charcoal for text, borders, and hard shadows.
- `--coral`: brand and title accent.
- `--yellow`: primary action and positive emphasis.
- `--mint`: verified work and success.
- `--pink`: risk, defects, and high-energy interruption.
- `--blue`: informational and blocking states.
- Developer accents belong to identity and reactions, not general semantics.

All functional states require a non-color signal such as text, shape, pattern, or motion. Keep body and UI text contrast at WCAG AA or better.

## Typography

- Display: `Avenir Next Condensed`, then `Franklin Gothic Medium`, for screen titles and large reaction copy only.
- UI: `Avenir Next`, then `Segoe UI`, for controls, rules, counters, and labels.
- Labels stay short, uppercase, and tracked. Do not add descriptive eyebrows or restate a heading in supporting copy.
- Use tabular numbers for counters where alignment matters.

## Shape and Depth

- Primary border: 3px charcoal.
- Ordinary hard shadow: 4–8px offset with no blur.
- Major titles and hero moments may use heavier offsets.
- Corners are chunky and slightly irregular, not uniformly pill-shaped.
- Cards are reserved for cards and genuinely discrete actions. Use open canvas spacing elsewhere.

## Character Artwork

Every developer maps three mechanical moods:

- `idle`: persistent squad presence.
- `thinking`: signature card selected or targeting.
- `success`: passive, signature, or completion reaction.

The shared portrait component supports five roles: selection, dock, card, token, and cut-in. Use the canonical master as the fallback when a mood asset is unavailable. Portraits paired with visible names are decorative; standalone portrait tokens expose the developer name.

## Character Presence

- Squad selection uses full-height artwork and assigns selection order from 1 to 3. Unselected candidates remain greyscale; choosing them restores their full character colour.
- The cycle screen keeps the squad visible through avatar-only passive portraits in the top HUD. Ready portraits use a solid outer ring; spent portraits use a dashed ring and reduced saturation.
- Signature cards may show owner artwork breaking the card edge. Basic cards remain graphic.
- The map uses cropped portrait tokens instead of initials.
- Later screens may use character art, but should reuse the same portrait roles and mood rules.

## Reaction Levels

### Micro

Normal passive contributions and signature resolutions. A dock pulse plus compact reaction appears for roughly 600–700ms. It does not block input.

### Hero

A signature card combined with its owner's passive, or a character-assisted task completion. A full viewport cut-in appears after the rules commit, lasts roughly one second, and briefly locks cycle input. Multiple effects from one card collapse into one ceremony.

Presentation cues are derived deterministically from the same card resolution used by the reducer. Never infer reactions from arbitrary timeouts or DOM state.

## Motion

- Fast feedback: 100–180ms.
- State transitions: 180–300ms.
- Hero entrances: 600–1080ms.
- Use quart, quint, or expo ease-out curves. No bounce or elastic easing.
- Animate transforms, opacity, filters, and bounded masks. Avoid layout-driving animation.
- Under reduced motion, preserve the reaction information as a static panel without sliding, shaking, or scaling.

## Responsive Rules

- Squad choices: four columns when spacious, two when constrained, one on narrow screens.
- Cycle squad dock: three columns on desktop, one stacked column on narrow screens.
- The hand remains horizontally scrollable on constrained widths.
- Hero cut-ins keep their full-viewport hierarchy, but move copy above the character and crop the figure more aggressively.
- Never let character art cover task intent, progress, target previews, or cycle actions.

## Cycle Stage

- The cycle is a fixed tactical stage on ordinary desktop viewports, not a vertically stacked page.
- The upper HUD contains long-term run resources and Tools on the left, squad passives in the centre, and Day on the right.
- Morale, Focus, Block, shared Guard, and temporary player effects live in one non-wrapping strip directly above the hand. Tooltips open upward from the strip.
- The player strip is the visible target for squad cards. The task field remains a forgiving invisible extension of that drop target without gaining a second heavy outline.
- Task names carry encounter flavour; persistent cycle numbers and encounter titles are omitted.
- Task consequence badges use the functional `End Day` label. Player-facing control language is `Cancel` / `Cancelled Today`; `Intent` and `Stun` remain engine terms only.
- Requirements show progress as `current/target`; do not repeat the same information as work remaining.
- Draw anchors the lower-left corner, the playable hand owns the lower centre, and actions plus Discard anchor the lower-right corner.
- One boss uses the full task field. Two tasks use two columns, three tasks use three columns, and four tasks use a two-by-two arrangement.
