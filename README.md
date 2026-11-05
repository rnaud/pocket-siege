# Pocket Siege

A Worms-inspired, turn-based artillery game built with Three.js. Original generated character and background art; no Worms assets or branding are used.

## Play

[Play Pocket Siege](https://rnaud.github.io/pocket-siege/)

Pit Moss Company against Coral Crew on a destructible floating island. Play solo against the computer or choose local pass-and-play. Each squad has three worms; the last squad standing wins.

- **Move:** left/right arrows, A/D, or touch buttons
- **Jump:** up arrow, W, or Jump
- **Aim:** drag on the battlefield or use the angle and power sliders; Q/E fine-tune the angle. Aim up or down in either direction.
- **Fire:** Space or Fire Away
- **Weapons:** Bazooka explodes on contact; grenades bounce and have a three-second fuse. Select with the buttons or 1/2.
- Wind affects projectiles; water eliminates worms. Each turn lasts 45 seconds.
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

The crosshair shows barrel direction; the dotted trajectory previews the shot under current wind. The impact marker shows a rocket collision or a grenade’s first bounce, not its final explosion. Weapons and hands rotate independently of the illustrated soldier, and shots originate at the visible muzzle. The same projection-aware calculation drives aiming and firing on desktop and mobile.

Hits trigger an illustrated hurt face, flinch, brief color flash, knockback, orbiting stun stars, damage numbers and health-bar loss. Knockouts fade and tumble. Firing has recoil, a muzzle flash and a projectile trail; grenades show their remaining fuse. Help and a hidden browser tab pause simulation.
