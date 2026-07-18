# Matt character set v1

Built-in image generation with `odin-master-v1.png` as the initial style anchor
and Matt's four references under `assets/references/matt/`. The idle render then
became the identity, outfit, palette, and style anchor for both semantic variants.
All prompts requested a flat `#00FF00` background; post-processing is reproducible
with `uv run tools/character-art/pipeline.py all`.

## Idle

Ordered references: `odin-master-v1.png`, `matt/angry.png`,
`matt/dramatic.png`, `matt/orange-hoodie.png`, `matt/smirking.png`.

```text
Use case: stylized-concept
Asset type: canonical game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is the definitive visual-style, linework, adult-proportion, polish, and thigh-up framing anchor only; do not copy Odin's identity, beard shape, plaid shirt, earbuds, or pose. Images 2 through 5 are identity references for the same adult man, Matt Powell; preserve his recognizable face, thick wavy dark-brown hair, full dark beard and moustache, large round dark-framed glasses, lean build, and playful expressive eyebrows.
Primary request: Create a highly polished, recognizable cartoon portrait of Matt as a creative design engineer and improv performer who has just spotted the tiny detail that will make the whole feature delightful.
Subject: One character only, thigh-up. Relaxed three-quarter stance with a clever warm half-smile. One hand is open in a small theatrical presenting gesture while the other pinches thumb and forefinger close together to indicate a precise finishing touch. The character reads clever, artistic, playful, and exacting; affectionate and adult, never manic, childish, smug, or slapstick. Outfit: burnt-orange zip hoodie worn open over a cream T-shirt, charcoal trousers; no visible brand marks.
Style/medium: Match Image 1's original western Saturday-morning television animation character art: chunky variable charcoal outlines, simplified but recognizable facial planes, bold graphic shapes, crisp 2-to-3-tone cel shading, small controlled hand-drawn texture, clean expressive silhouette, and bright game-ready polish. Not anime, not photorealistic, and not a direct imitation of an existing game or franchise.
Composition/framing: Portrait canvas, full body to mid-thigh, centered with generous clear padding around hair, elbows, and both hands. Entire silhouette inside the canvas. Eye-level view and similar apparent character scale to Image 1.
Lighting/mood: Bright cheerful high-key animation lighting; clever, creative, composed, lightly mischievous.
Color palette: Warm natural skin, dark charcoal outlines, dark brown hair and beard, burnt orange, cream, and charcoal.
Scene/backdrop: Perfectly flat solid chroma green #00FF00 for local background removal. One uniform color only with no shadows, gradients, texture, reflection, floor plane, halo, or lighting variation.
Constraints: Preserve Matt's identity across the photo references. Crisp opaque illustrated edges and generous padding. Do not use #00FF00 anywhere in the subject. No cast shadow, contact shadow, glow, text, logos, watermark, interface, props, other people, scenery, extra objects, extra fingers, or extra limbs.
```

## Thinking

Ordered references: `matt-idle-v1.png`, `matt/dramatic.png`,
`matt/angry.png`.

```text
Use case: identity-preserve
Asset type: semantic THINKING game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is the canonical Matt cartoon anchor and controls identity, exact outfit, proportions, palette, western Saturday-morning-cartoon linework, cel shading, polish, scale, and framing. Images 2 and 3 are supplementary facial-expression references for the same adult man only.
Primary request: Create Matt in a distinct THINKING state while keeping him unmistakably the exact same illustrated character as Image 1.
Subject: One character only, thigh-up. Turn him slightly three-quarter, fold one arm loosely across his torso, and rest the other hand lightly against his beard with one eyebrow raised. His eyes focus just off to the side as he considers whether a polished detail is actually finished. The expression is clever, analytical, creative, and gently exacting, with restrained improv-performer timing; never angry, anxious, gloomy, smug, or caricatured. Preserve the burnt-orange open zip hoodie, cream T-shirt, charcoal trousers, wavy dark-brown hair, round dark glasses, beard, facial proportions, and lean adult build exactly from Image 1.
Style/medium: Exactly match Image 1's chunky variable charcoal outlines, simplified recognizable facial planes, crisp 2-to-3-tone cel shading, controlled hand-drawn texture, and bright polished game-character finish. No redesign, anime influence, or realism drift.
Composition/framing: Portrait canvas matching Image 1, full body to mid-thigh, same apparent scale, centered with generous clear padding around hair, elbows, and hands. Entire silhouette inside the canvas.
Scene/backdrop: Perfectly flat solid chroma green #00FF00. Uniform color only with no shadows, gradients, texture, floor plane, reflection, halo, or lighting variation.
Constraints: Preserve identity, outfit, proportions, palette, and rendering from Image 1. Do not use #00FF00 in the subject. No text, logos, watermark, interface, props, scenery, other people, extra objects, extra fingers, or extra limbs.
```

## Success

Ordered references: `matt-idle-v1.png`, `matt/smirking.png`,
`matt/orange-hoodie.png`.

```text
Use case: identity-preserve
Asset type: semantic SUCCESS game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is the canonical Matt cartoon anchor and controls identity, exact outfit, proportions, palette, western Saturday-morning-cartoon linework, cel shading, polish, scale, and framing. Images 2 and 3 are supplementary facial-identity references for the same adult man only.
Primary request: Create Matt in a distinct SUCCESS state while keeping him unmistakably the exact same illustrated character as Image 1.
Subject: One character only, thigh-up. Give him a broad delighted grin, eyebrows lifted, and a compact theatrical ta-da pose: both hands open near chest height, one slightly higher than the other, presenting the final polished result with restrained improv-performer flair. He reads clever, creative, proud of the detail, and warmly playful; never manic, childish, smug, aggressive, or slapstick. Preserve the burnt-orange open zip hoodie, cream T-shirt, charcoal trousers, wavy dark-brown hair, round dark glasses, beard, facial proportions, and lean adult build exactly from Image 1.
Style/medium: Exactly match Image 1's chunky variable charcoal outlines, simplified recognizable facial planes, crisp 2-to-3-tone cel shading, controlled hand-drawn texture, and bright polished game-character finish. No redesign, anime influence, or realism drift.
Composition/framing: Portrait canvas matching Image 1, full body to mid-thigh, same apparent scale, centered with generous clear padding around hair, elbows, and both hands. Entire silhouette inside the canvas.
Scene/backdrop: Perfectly flat solid chroma green #00FF00. Uniform color only with no shadows, gradients, texture, floor plane, reflection, halo, or lighting variation.
Constraints: Preserve identity, outfit, proportions, palette, and rendering from Image 1. Do not use #00FF00 in the subject. No text, logos, watermark, interface, props, scenery, other people, extra objects, extra fingers, or extra limbs.
```
