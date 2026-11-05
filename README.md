# Pocket Siege

A Worms-inspired, turn-based artillery game built with Three.js. Original generated character and background art; no Worms assets or branding are used.

## Play

[Play Pocket Siege](https://rnaud.github.io/pocket-siege/)

Pit Moss Company against Coral Crew on a destructible floating island. Play solo against the computer or choose local pass-and-play. Each squad has three worms; the last squad standing wins.

- **Move:** left/right arrows, A/D, or touch buttons.
- **Aim:** Up/Down arrows, drag on the battlefield, or the angle slider. No predicted trajectory is shown.
- **Fire:** hold Space (or the touch fire button) to build power; release to shoot. Full charge fires automatically after two seconds.
- **Jump:** Enter jumps forward; double Enter jumps backward. Backspace jumps vertically; double Backspace backflips. Touch has Jump and Backflip buttons.
- **Weapons:** F1 selects bazooka; F2 selects grenade. Grenade fuse: keys 1–5; bounce: +/−, or use the touch selectors.
- Wind affects bazookas, not grenades. Water eliminates worms. Turns last 45 seconds, with three seconds to retreat after firing.
- Sound is optional; use the music-note button. Help pauses the match.

Touch layouts support portrait and landscape, including iPhone Safari. No install or account is required. This is a focused local artillery game, not a recreation of every Worms Armageddon feature; there is no online multiplayer.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run build
```

`npm run preview` serves the production build. Character, hurt-frame, and background images are generated original art, optimized in WebP. Terrain and effects are procedural. Google Fonts is optional, with system fallbacks. Three.js is bundled locally.

## Tests

```sh
npx playwright install chromium webkit
npm test
```

Tests cover terrain removal, actual projectile impacts and turn progression, computer turns, and desktop/iPhone layouts in Chromium and WebKit.

## Deployment

The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages on pushes to `main`. In repository Settings → Pages, select **GitHub Actions** as the source. Vite uses a relative base so repository subpaths work.

## Implementation

Three.js renders an orthographic battlefield, animated illustrated soldiers, projectiles, debris, and a painted jungle backdrop. A binary terrain mask powers collision and circular excavation; a canvas texture displays the same mask. Physics runs at a fixed 120 Hz with swept projectile collision. The computer samples ballistic trajectories against the live terrain before firing.

## License

MIT. Worms and Worms Armageddon are trademarks of their respective owners. This project is independently created and is not affiliated with Team17.

## Art direction

The original background and two transparent soldier illustrations were created with the built-in image generation tool. Assets and exact generation prompts are in [`public/art/`](public/art/ART-DIRECTION.md). The terrain uses layered soil, stones, grass fringes, and crater-edge shading. Soldier sprites breathe, bob when walking, and face the aiming direction.

## Combat feedback

The crosshair shows aiming direction, without a future trajectory or impact prediction. Weapons and hands rotate independently of the illustrated soldier, and shots originate at the visible muzzle. Launch physics remain the same across desktop and mobile layouts.

Hits trigger an illustrated hurt face, flinch, brief color flash, radial knockback, stun stars, damage numbers and health-bar loss. Airborne worms retain horizontal momentum and collide with walls, ceilings and ground. Hard falls cause damage. Turns wait for bodies and death explosions to settle. Firing has recoil, a muzzle flash and a trail behind the actual projectile; grenades show their remaining fuse. Help and a hidden browser tab pause simulation.

See [the gameplay audit](GAMEPLAY-AUDIT.md) for corrected behavior, validation, and remaining differences from Worms Armageddon.
