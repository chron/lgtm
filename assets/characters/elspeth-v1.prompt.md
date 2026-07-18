# Elspeth character set v1

Built-in image generation with `odin-master-v1.png` as the initial style anchor
and Elspeth's four references under `assets/references/elspeth/`. The idle render
then became the identity, outfit, palette, and style anchor for both semantic
variants. All prompts requested a flat `#00FF00` background; post-processing is
reproducible with `uv run tools/character-art/pipeline.py all`.

## Idle

Ordered references: `odin-master-v1.png`, `elspeth/applauding.png`,
`elspeth/concerned.png`, `elspeth/emphatic.png`,
`elspeth/hand-on-forehead.png`.

```text
Use case: stylized-concept
Asset type: canonical game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is the definitive visual-style, linework, adult-proportion, polish, and thigh-up framing anchor only; do not copy Odin's identity, facial hair, plaid shirt, earbuds, or pose. Images 2 through 5 are identity references for the same adult woman, Elspeth; preserve her recognizable face, long straight very-dark-brown hair, subtly arched brows, slim build, and large dark rectangular glasses when visible.
Primary request: Create a highly polished, recognizable cartoon portrait of Elspeth as an experienced, calm engineering lead who creates the conditions for everyone else to do excellent work.
Subject: One character only, thigh-up. Relaxed upright three-quarter stance with a warm composed smile. One hand is open in a calm welcoming gesture and the other rests lightly across her midsection, as though she has just made a complicated situation feel manageable. She reads experienced, grounded, generous, quietly authoritative, and optimistic; never corporate, stern, maternal, or saccharine. Outfit: ochre-gold cardigan worn open over a cream crewneck top, dark charcoal trousers; no visible brand marks.
Style/medium: Match Image 1's original western Saturday-morning television animation character art: chunky variable charcoal outlines, simplified but recognizable facial planes, bold graphic shapes, crisp 2-to-3-tone cel shading, small controlled hand-drawn texture, clean expressive silhouette, and bright game-ready polish. Not anime, not photorealistic, and not a direct imitation of an existing game or franchise.
Composition/framing: Portrait canvas, full body to mid-thigh, centered with generous clear padding around hair, elbows, and both hands. Entire silhouette inside the canvas. Eye-level view and similar apparent character scale to Image 1.
Lighting/mood: Bright cheerful high-key animation lighting; reassuring, capable, open, lightly playful.
Color palette: Warm natural skin, dark charcoal outlines, very dark brown hair, ochre gold, cream, and charcoal.
Scene/backdrop: Perfectly flat solid chroma green #00FF00 for local background removal. One uniform color only with no shadows, gradients, texture, reflection, floor plane, halo, or lighting variation.
Constraints: Preserve Elspeth's identity across the photo references. Crisp opaque illustrated edges and generous padding. Do not use #00FF00 anywhere in the subject. No cast shadow, contact shadow, glow, text, logos, watermark, interface, props, other people, scenery, extra objects, extra fingers, or extra limbs.
```

## Thinking

Ordered references: `elspeth-idle-v1.png`, `elspeth/concerned.png`,
`elspeth/hand-on-forehead.png`.

```text
Use case: identity-preserve
Asset type: semantic THINKING game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is the canonical Elspeth cartoon anchor and controls identity, exact outfit, proportions, palette, western Saturday-morning-cartoon linework, cel shading, polish, scale, and framing. Images 2 and 3 are supplementary facial-expression and gesture references for the same adult woman only.
Primary request: Create Elspeth in a distinct THINKING state while keeping her unmistakably the exact same illustrated character as Image 1.
Subject: One character only, thigh-up. Three-quarter view with one arm loosely folded and the other hand resting lightly against her temple, head tilted a fraction and eyes focused to the side as she calmly turns a complicated team problem over. Give her a composed, attentive expression with a tiny reassuring almost-smile. She reads experienced, thoughtful, grounded, and unflustered; never worried, exhausted, stern, gloomy, maternal, or corporate. Preserve the ochre-gold open cardigan, cream crewneck top, charcoal trousers, long very-dark-brown hair, dark rectangular glasses, facial proportions, and slim adult build exactly from Image 1.
Style/medium: Exactly match Image 1's chunky variable charcoal outlines, simplified recognizable facial planes, crisp 2-to-3-tone cel shading, controlled hand-drawn texture, and bright polished game-character finish. No redesign, anime influence, or realism drift.
Composition/framing: Portrait canvas matching Image 1, full body to mid-thigh, same apparent scale, centered with generous clear padding around hair, elbows, and hands. Entire silhouette inside the canvas.
Scene/backdrop: Perfectly flat solid chroma green #00FF00. Uniform color only with no shadows, gradients, texture, floor plane, reflection, halo, or lighting variation.
Constraints: Preserve identity, outfit, proportions, palette, and rendering from Image 1. Do not use #00FF00 in the subject. No text, logos, watermark, interface, props, scenery, other people, extra objects, extra fingers, or extra limbs.
```

## Success

Ordered references: `elspeth-idle-v1.png`, `elspeth/applauding.png`,
`elspeth/emphatic.png`.

```text
Use case: identity-preserve
Asset type: semantic SUCCESS game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is the canonical Elspeth cartoon anchor and controls identity, exact outfit, proportions, palette, western Saturday-morning-cartoon linework, cel shading, polish, scale, and framing. Images 2 and 3 are supplementary facial-expression and gesture references for the same adult woman only.
Primary request: Create Elspeth in a distinct SUCCESS state while keeping her unmistakably the exact same illustrated character as Image 1.
Subject: One character only, thigh-up. Give her a bright genuine smile and a small appreciative applause gesture with both hands held naturally near chest height, shoulders relaxed, as though the team has just shipped something difficult together. The celebration is generous and shared rather than self-congratulatory. She reads experienced, optimistic, grounded, and quietly delighted; never corporate, saccharine, maternal, exaggerated, or slapstick. Preserve the ochre-gold open cardigan, cream crewneck top, charcoal trousers, long very-dark-brown hair, dark rectangular glasses, facial proportions, and slim adult build exactly from Image 1.
Style/medium: Exactly match Image 1's chunky variable charcoal outlines, simplified recognizable facial planes, crisp 2-to-3-tone cel shading, controlled hand-drawn texture, and bright polished game-character finish. No redesign, anime influence, or realism drift.
Composition/framing: Portrait canvas matching Image 1, full body to mid-thigh, same apparent scale, centered with generous clear padding around hair, elbows, and both hands. Entire silhouette inside the canvas.
Scene/backdrop: Perfectly flat solid chroma green #00FF00. Uniform color only with no shadows, gradients, texture, floor plane, reflection, halo, or lighting variation.
Constraints: Preserve identity, outfit, proportions, palette, and rendering from Image 1. Do not use #00FF00 in the subject. No text, logos, watermark, interface, props, scenery, other people, extra objects, extra fingers, or extra limbs.
```
