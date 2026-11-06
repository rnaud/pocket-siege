# Pocket Siege — Paper-Cut Expedition

The game now uses a tactile **cut-paper diorama** direction instead of the earlier painted-gouache jungle.

## Style

- Hand-cut layered construction paper, matte screenprinted inks, visible deckled edges.
- Subtle paper fibre/fleck texture, soft offset paper shadows, bold deep-teal ink outlines.
- Palette: warm cream `#f2e8d2`, deep ink teal `#17383b`, moss `#708a4b`, chartreuse `#d4e36c`, coral `#e96e57`, tangerine `#e7a34a`.
- Premium tabletop adventure miniature; no glossy plastic, no 3D render, no painterly brushwork, no smooth gradients.

## Generation note

The supplied OpenAI key was valid but returned `credit_balance_exhausted` for image generation. This pass was generated with the available **Gemini 3.1 Flash Image** key. The prompts below are provider-neutral and can be rerun with OpenAI `gpt-image-1.5` once image credits are added. Sprites were generated on a flat `#ff00ff` chroma matte, keyed with a magenta/green score, edge-decontaminated, alpha-eroded one pixel, trimmed and normalised to WebP.

## Files

| File                                                                                                        | Use                                           |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `paper-islands.webp`                                                                                        | 1672×941 game backdrop and menu-art band      |
| `paper-grain.webp`                                                                                          | 1024×1024 cream texture for paper UI surfaces |
| `paper-emblem.webp`                                                                                         | Header/logo/favicon emblem                    |
| `moss-body-paper.webp`, `coral-body-paper.webp`                                                             | 512×512 in-game bodies, no arms/weapons       |
| `moss-hurt-paper.webp`, `coral-hurt-paper.webp`                                                             | 512×512 hurt frames, same anchors as bodies   |
| `moss-soldier-paper.webp`, `coral-soldier-paper.webp`                                                       | 512×512 menu/HUD/share portraits              |
| `weapon-rocket.webp`, `weapon-grenade.webp`, `weapon-mortar.webp`, `weapon-sticky.webp`, `weapon-mine.webp` | 512×512 loadout cards                         |
| `crate-paper.webp`                                                                                          | 512×512 supply-crate sprite                   |
| `favicon.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`                                       | Paper seal app icons                          |
| `og-card.png`                                                                                               | 1200×630 share card                           |

Old gouache files remain in the directory for rollback: `fern-islands.webp`, `moss-body.webp`, `coral-body.webp`, `moss-hurt.webp`, `coral-hurt.webp`, `moss-soldier.webp`, `coral-soldier.webp`.

## Shared style prompt

> PAPER SIEGE art direction. Hand-cut layered construction-paper diorama, matte screenprinted inks, visible deckled cut edges, subtle paper fibre and fleck texture, soft offset paper shadows, bold deep teal-ink outlines, warm cream paper, ochre, moss green, chartreuse, coral and tangerine spot colours. Premium tactile tabletop adventure game. No glossy plastic, no 3D render, no painterly brushwork, no smooth gradients, no photorealism.

## Background prompt

> Wide cinematic 16:9 background painting for a side-on artillery game, made entirely from layered cut paper. A miniature jungle archipelago at golden hour: stepped paper cliffs, ferns and palms, tiny ochre ruins, a calm turquoise paper lagoon with scalloped cut-paper waves, coral sun, cream clouds, layered depth with visible cut edges and soft paper shadows. Keep the middle and lower middle quiet for readable game characters and terrain. No foreground platform, no characters, no text, no UI, no logo, no border. Expansive cream-teal sky in the upper half.

## Body prompts

Moss:

> PAPER SIEGE art direction. One adorable battle worm character sprite for a side-on artillery game, full body, facing right, squat curved peach-cream segmented body with curled tail, huge expressive ivory eyes, determined mischievous expression, moss green paper military helmet with a tiny fern sprig, small olive paper satchel. The character has NO arms, NO hands, NO weapon, NO bazooka: the runtime adds articulated parts. Entire character visible and centered with 10 percent padding. Flat solid pure magenta background (#ff00ff), absolutely no shadow, no gradient, no scenery, no ground, no text, no logo, no extra poses. Square canvas.

Coral:

> PAPER SIEGE art direction. One adorable battle worm character sprite for a side-on artillery game, full body, facing LEFT, squat curved peach-cream segmented body with curled tail, huge expressive ivory eyes, cheeky toothy grin and confident eyebrows. Wear a coral-red cut-paper oversized military helmet with cream goggles strapped on top, tan chin strap, small rust paper satchel. The character has NO arms, NO hands, NO weapon, NO bazooka. Entire character visible and centered with 10 percent padding. Flat solid pure magenta background (#ff00ff), absolutely no shadow, no gradient, no scenery, no ground, no text, no logo. Exactly one character. Square canvas.

## Hurt-frame prompt

> Edit the attached paper-cut battle worm sprite. Keep exactly the same body silhouette, pose, framing, helmet, fern sprig, satchel, palette, cut-paper texture, ink outlines and flat pure magenta background. Change ONLY the face to a clear comic ouch: eyes squeezed shut into curved lines, eyebrows raised in pain, mouth open in a small rounded grimace, slightly scrunched cheek. No blood, wounds, marks, stars or text. Keep NO arms, NO hands, NO weapon. Full body, one character.

The Coral version is the same prompt with the coral helmet, goggles and satchel.

## Full-portrait prompt

> Edit the attached paper-cut battle worm body. Keep exactly the same character identity, body shape, face, helmet, satchel, palette, cut-paper texture, ink outlines, facing and full-body framing. Add two tiny layered paper arms and mitten hands holding a chunky olive-green paper bazooka pointing diagonally up-right, with cream band, coral muzzle and ink outline. Full character and weapon visible and centered with 10 percent padding. Flat pure magenta background (#ff00ff), no gradient, no scenery, no ground, no text, no extra characters.

Coral swaps the bazooka for rust-red with a tangerine muzzle and faces left.

## Prop prompts

Each prop uses the shared style, one isolated object, flat `#ff00ff`, no hands, no character, no text, no cast shadow, 12% padding.

- **Rocket:** chunky hand-cut paper toy bazooka, olive-green layered paper tube, cream band, coral muzzle ring, dark ink outline, small ochre wooden grips, side-on three-quarter view pointing up-right.
- **Grenade:** hand-cut paper pineapple grenade, chartreuse paper body with deep ink cross-hatch segments, coral fuse and cream paper cap, three-quarter view.
- **Mortar:** hand-cut paper heavy mortar, thick ochre paper tube with cream bands and coral rim on a dark teal splayed paper tripod, three-quarter view pointing up-right.
- **Sticky:** hand-cut paper sticky bomb, round coral-pink paper bomb with two crossed cream paper tape strips and a small ochre fuse.
- **Mine:** hand-cut paper proximity mine, dark teal layered paper disc with a cream paper rim, small coral warning light and folded paper antenna.
- **Crate:** hand-cut paper supply crate, layered ochre timber-paper planks, chartreuse paper band, cream fern stamp on the lid, coral latch, three-quarter view.

## Paper and emblem prompts

Paper texture:

> Seamless tileable warm cream handmade paper texture, close-up flat scan, subtle long fibres, tiny flecks and screenprint grain, gentle uneven absorbency, no objects, no cutouts, no shadows, no text, no border. Uniform soft lighting.

Emblem:

> One circular cut-paper expedition badge, a chartreuse sun disc with a cream fern leaf and a tiny coral triangle at the centre, deep teal ink border, layered paper edges and a soft offset paper shadow. No text, no letters, no character, no weapon. Centered on flat solid pure magenta background (#ff00ff), no gradient. Square canvas, 10 percent padding.

## In-engine treatment

- `paper-islands` is tinted warm/dim on the Three.js backdrop so characters and labels stay forward.
- Terrain is painted as flat ochre paper strata with a cream cut rim, chartreuse grass and dark ink side edges.
- Water uses deep teal/turquoise inks with cream foam.
- The articulated weapons keep their procedural geometry but use the paper palette and added ink edge lines.
- Supply crates and mines are billboard sprites using `crate-paper.webp` and `weapon-mine.webp`.
- UI surfaces use `paper-grain.webp` with ink rules, offset shadows and Bricolage Grotesque display type.
- `scripts/make-brand-assets.py` rebuilds the OG card, paper-seal icons and favicon from the final art.
