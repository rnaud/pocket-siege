# Pocket Siege

A Worms-inspired, turn-based artillery game built with Three.js. Original generated character and background art; no Worms assets or branding are used.

## Play

[Play Pocket Siege](https://rnaud.github.io/pocket-siege/)

Pit Moss Company against Coral Crew on a destructible floating island. Play solo against the computer at Rookie, Regular or Veteran skill, or choose local pass-and-play. Each squad has three worms; the last squad standing wins.

- **Move:** left/right arrows, A/D, or touch buttons.
- **Aim:** Up/Down arrows or W/S. On touch, drag on the battlefield or use the angle slider. No predicted trajectory is shown.
- **Fire:** hold Space (or the touch fire button) to build power; release to shoot. Power fills a ring around the aiming reticle. Full charge fires automatically after two seconds.
- **Jump:** Enter jumps forward; double Enter jumps backward. Backspace jumps vertically; double Backspace backflips. Touch has Jump and Backflip buttons.
- **Weapons:** F1 selects bazooka; F2 grenade; F3 heavy mortar; F4 sticky bomb. Mortars have shorter range and a larger impact blast. Sticky bombs attach to terrain or worms until their fuse expires. Each squad carries three grenades, two mortars and two stickies; the bazooka is unlimited. Counts are shown on the loadout buttons. Grenade/sticky fuse: keys 1–5; bounce: +/−, or use the touch selectors.
- Wind affects bazookas; the other three weapons ignore wind. Water eliminates worms. From round six the sea rises every round, so a stalemate becomes a scramble for high ground. Turns last 45 seconds, with three seconds to retreat after firing.
- Sound is optional; use the music-note button. Help pauses the match.

Touch layouts support portrait and landscape, including iPhone Safari, and keep the whole control deck on one screen without page scrolling. No install or account is required. This is a focused local artillery game, not a recreation of every Worms Armageddon feature; there is no online multiplayer.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run build
```

`npm run preview` serves the production build. Character, hurt-frame, and background images are generated original art, optimized in WebP. Terrain and effects are procedural. Google Fonts is optional, with system fallbacks. Three.js is bundled locally. A web app manifest and apple-touch icon make the game installable; Open Graph and Twitter tags use the generated share card.

## Tests

```sh
npx playwright install chromium webkit
npm test
```

Tests cover terrain removal, projectile impacts and turn progression, computer turns, AI weapon/blast planning, ammo spending, sudden-death water levels, and desktop/iPhone layouts in Chromium and WebKit.

## Deployment

The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages on pushes to `main`. In repository Settings → Pages, select **GitHub Actions** as the source. Vite uses a relative base so repository subpaths work.

## Implementation

A lightweight water shader animates foam, ripples and bubbles; reduced-motion settings freeze its animation, and sudden death can raise its surface. Three.js renders an orthographic battlefield, animated illustrated soldiers, projectiles, debris, and a painted jungle backdrop. A binary terrain mask powers collision and circular excavation; a canvas texture displays the same mask, rebuilt from the mask once per frame after a crater. Physics runs at a fixed 120 Hz with swept projectile collision. The computer samples trajectories for every weapon it can afford, scores blast damage and friendly fire, and can reposition before charging.

## Share and install

The game ships a web app manifest and 192/512 px icons for add-to-home-screen on iOS and Android. Link previews use the generated 1200×630 card at `public/art/og-card.png`; regenerate it and the icons with `python3 scripts/make-brand-assets.py` after changing the art.

## License

MIT. Worms and Worms Armageddon are trademarks of their respective owners. This project is independently created and is not affiliated with Team17.

## Art direction

The original background and two transparent soldier illustrations were created with the built-in image generation tool. Assets and exact generation prompts are in [`public/art/`](public/art/ART-DIRECTION.md). The share card and home-screen icons are composed from that art by `scripts/make-brand-assets.py`. The terrain uses layered soil, stones, grass fringes, and crater-edge shading. Soldier sprites breathe, bob when walking, and face the aiming direction.

## Combat feedback

The crosshair shows aiming direction, without a future trajectory or impact prediction. Weapons and hands rotate independently of the illustrated soldier, and shots originate at the visible muzzle. Launch physics remain the same across desktop and mobile layouts.

Hits trigger an illustrated hurt face, flinch, brief color flash, radial knockback, stun stars, damage numbers, a short hit-stop and health-bar loss. Airborne worms retain horizontal momentum and collide with walls, ceilings and ground. Hard falls cause damage. Turns wait for bodies and death explosions to settle. Firing has recoil, a muzzle flash and a trail behind the actual projectile; grenades show their remaining fuse. The active worm has a pulsing ground ring, labels shift away from the aim reticle, and help or a hidden tab pauses simulation.

See [the gameplay audit](GAMEPLAY-AUDIT.md) for corrected behavior, validation, and remaining differences from Worms Armageddon.
