# Pocket Siege

A Worms-inspired, turn-based artillery game built with Three.js. Engine-generated pixel character, prop and background art; no Worms assets or branding are used.

## Play

[Play Pocket Siege](https://rnaud.github.io/pocket-siege/)

Pit Moss Company against Coral Crew on a destructible floating island. Play a single island or a best-of-three series, solo against Rookie, Regular or Veteran computer skill, or local pass-and-play for 2–4 squads on one device (Tide Patrol and Amber Legion join in larger matches), with any squad handed to the computer. Each squad has three worms; the last squad standing wins. Pick any of your three worms, choose a turn and retreat pace, set a sudden-death event and a scheme preset, swing on a ninja rope, jet across a gap, teleport, build a girder, freeze the other squad, or call in a special weapon. Airdropped crates keep the battlefield moving. The camera follows the action, and you can replay your last shot or export a result card.

- **Expedition:** from the mode screen, sail eight generated islands with one squad. Wounds carry over, survivors earn stripes, and each win adds a supply that is re-issued on every later island. Risky routes add a complication and pay an extra pick; a daily seed gives everyone the same run.
- **Graphics:** Shift+F9 during a match, or the GRAPHICS button on the mode screen, opens presentation options that never change how a match plays, and all default to the original look. Shift+F8, or the switch at the top of that sheet, turns every new effect on or off at once. *Diorama* shows the match as a lit miniature with extruded terrain and a tilt-shift lens. *Lighting* adds terrain-cast shadows, dusk, or night with worm lamps, and explosions and flames light the scene. *Destruction* adds shockwave rings, heat haze, scorch marks and debris coloured from the ground it came from. *Art style* switches between CRT, paper cut-out, blueprint, ink and watercolour, and 1-bit handheld. *Atmosphere* adds drifting clouds, backdrop parallax, water reflections, and rain, snow or thunderstorms that stay out from under cover.
- **Move:** left/right arrows, A/D, or touch buttons.
- **Aim:** Up/Down arrows or W/S. On touch, drag on the battlefield or use the angle slider. No predicted trajectory is shown.
- **Fire:** hold Space (or the touch fire button) to build power; release to shoot. Power fills a ring around the aiming reticle. Full charge fires automatically after two seconds. Shotgun, bat, dynamite and air strike fire or target immediately instead.
- **Jump:** Enter jumps forward; double Enter jumps backward. Backspace jumps vertically; double Backspace backflips. Touch has Jump and Backflip buttons.
- **Worm choice:** Tab or SHIFT+Tab cycles your living worms; the on-screen ⇥ WORM button does the same. Selection never changes who is scheduled next. Move, jump, fire or use most utilities to lock the choice; SKIP gives the turn away without firing.
- **Weapons:** F1 bazooka; F2 grenade; F3 mortar; F4 sticky; M mine. Open ＋ SPECIAL for the shotgun, dynamite, cluster bomb, air strike, napalm, baseball bat, homing missile and holy grenade. Air strike and homing missiles enter a click-to-target mode; homing locks a world position rather than chasing the nearest enemy. The shotgun grants two shots for one ammo, with movement and re-aiming between shots. Airstrike approach is selectable; mortars scatter three fragments and cluster bombs spread five bomblets. Blast damage and knockback have distinct weapon strengths, and intervening rock reduces both. Timed grenade fuse: keys 1–5; bounce: +/−, or use the touch selectors.
- **Field kit:** open ✦ UTILS or use R (rope), J (jet pack), P (parachute), T (teleport), G (girder) or F (freeze). Rope: aim, fire, then ←/→ swing, ↑/↓ shorten, R release and re-fire. Jet pack: ↑/↓ thrust, ←/→ steer, J stops; it burns fuel and ignores fall damage while active. Parachute auto-deploys on a hard fall once armed. Teleport and girder use click/tap targeting and end the turn. Freeze costs the other squad its next turn.
- **Timers and sudden death:** turn time is 30, 45 or 60 seconds; retreat is 3, 5 or 8 seconds. From round six, the selected sudden-death event fires: rising water, every worm at 1 HP, nuclear poison, or the leader wins the round. Skip and Surrender live in the move heading and pause menu.
- Wind affects bazookas; grenades, mortars, stickies and most specials ignore wind. Rain strengthens the wind and storms push it harder. Water eliminates worms. Turns last 45 seconds by default, with three seconds to retreat after firing. Full turn time, retreat and sudden-death rules can be changed in the menu or selected as a preset.
- **Match structure:** choose Single island or Best of 3 in the menu. A series shows its score under the round label, plays a new island after each round, and alternates who starts. The winner is the first squad to two round wins.
- **Scheme presets:** Classic duel, Blitz (quick turns, 1 HP), Crate rain, Stockpile (best-of-three with carried ammo and utilities) and Armageddon (60-second turns, storm, nuclear sudden death). Choosing a preset fills the individual controls; changing a control marks the scheme Custom. Airdrops arrive every three rounds, or every two in crate-heavy schemes. With Stockpile, surviving ammunition and field-kit charges carry into the next island.
- **Match modifiers:** Standard, Low gravity, Big blasts, Quick turns (30 seconds) or Moon chaos (low gravity, big blasts and 30-second turns). The AI plans against the selected gravity and blast size.
- **Camera and replays:** the camera fits the shot and the shooter together, then returns for the next turn. After any shot, use ↺ REPLAY to trace the last projectile’s path over the current board. Finished matches can export a result card from the menu; touch devices with file sharing open the share sheet, otherwise it downloads a PNG.
- **Battlefields:** select the original Fern Island, seeded Highlands, Archipelago with water gaps, Forts, Caverns with underground routes, or Bridges with fragile crossings in the match menu. Generated maps keep broad starting platforms with paired elevations for the opposing teams. Daily Island retains its fixed layout and daily seed. All terrain is generated and destructible in-engine.
- **Supply crates:** a crate airdrops onto the island and can be collected after it lands. Health crates heal 25 HP; weapon crates add a grenade, mortar, sticky or mine; utility crates add a field-kit charge; special crates add a special weapon. Counts are capped, and the computer will detour to a nearby crate. A crate drops at the start and then at intervals; sudden-death nukes do not stop the supply economy.
- **Daily island:** the menu has a date-seeded Daily Island with clear weather and a one-island solo format. Your win/loss, streak, best hit and longest shot are kept in a local record book; nothing is sent anywhere.
- Sound is optional; use the music-note button. Help pauses the match. Sound, match type, skill, format, weather, scheme, turn/retreat times and sudden death are remembered on this device.

Touch layouts support portrait and landscape, including iPhone Safari, and keep the whole control deck on one screen without page scrolling. On desktop the battlefield and control deck fill the window edge to edge. No install or account is required. This is a focused local artillery game, not a recreation of every Worms Armageddon feature; there is no online multiplayer.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run build
```

`npm run preview` serves the production build. The pixel engine decodes imported Armageddon sprites, terrain, water, and HUD assets in their native formats. Startup waits for current art before revealing the game; retired artwork and procedural fallback renderers have been removed. The Siege Pixel font and Three.js are bundled locally.

## Tests

```sh
npx playwright install chromium
npm test
```

The `logic` project runs browser-independent rules and executable-fixture comparisons once (`npm test -- --project=logic`, no browser installation needed). Tag these tests `@logic`. The `desktop` project excludes that tag and exercises browser integration in Chromium. CI runs one logic job and two browser shards; deployment requires all three jobs to pass. There is no iPhone/WebKit test project. Verify small mobile UI fixes manually rather than adding a regression test for every reported issue. Add automated coverage when its expected regression value justifies its runtime and maintenance cost.

Tests cover terrain removal, projectile impacts and turn progression, computer turns, AI weapon/blast planning, crate seeking, ammo spending, proximity mines, match modifiers, worm selection and skip, sudden-death variants, rope/jetpack/teleport/girder/parachute/freeze, the special weapon tray, cluster and napalm effects, airdropped crate types, stockpiling, scheme presets, saved settings, imported-art loading, label readability, supply crates, weather, best-of-three flow, daily seeds, the local record book, desktop full-window layout in Chromium.

## Deployment

The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages on pushes to `main`. In repository Settings → Pages, select **GitHub Actions** as the source. Vite uses a relative base so repository subpaths work.

## Implementation

A lightweight water shader draws stepped waves and palette-based ripples; reduced-motion settings freeze its animation, and sudden death can raise its surface. Three.js renders the orthographic battlefield at native pixel resolution with flat-colored geometry and code-generated sprites. Terrain uses irregular rust-colored rock facets, a mossy grass rim, and small flowers anchored to intact topsoil. Weather is a cheap CSS layer; storms widen the wind range. A binary terrain mask powers collision and circular excavation; a canvas texture displays the same mask, rebuilt from the mask once per frame after a crater. Physics runs at a fixed 120 Hz with swept projectile collision and an optional gravity scale. The computer samples trajectories for its conventional weapons, scores blast damage, water/edge knockback and friendly fire, seeks nearby crates, retreats after firing, can reposition before charging, arms a parachute for hard falls, and will spend a freeze when outnumbered. The camera is an orthographic view rectangle that eases between the full island and a fitted action frame; all HUD overlays project through the same view.

## Daily island and records

The Daily Island uses a date-seeded terrain and a fixed clear/single ruleset. The latest result for the day is stored in `localStorage` along with career wins, losses, streak, best single-blast damage and longest shot. The record book is entirely local: there is no account, server, leaderboard or network request.

## Offline and sharing

The production build registers a service worker that precaches the page, CSS, JavaScript and manifest. After the first load the game starts offline; updates are fetched network-first when a connection exists. Saved settings and records use `localStorage` only. Result cards are composed locally on a canvas and either handed to the Web Share API on touch devices or downloaded as a PNG. There is no account, server, leaderboard or analytics request.

## Share and install

The game ships a web app manifest. Artwork is generated locally at startup; historical branding files are no longer used by the game.

## License

MIT. Worms and Worms Armageddon are trademarks of their respective owners. This project is independently created and is not affiliated with Team17.

## Art direction

The battlefield renders directly into a low-resolution framebuffer with antialiasing disabled, then displays it at an integer CSS scale. Resize clips at most one partial outer pixel instead of stretching the grid. Camera translations snap to framebuffer pixels, textures use nearest-neighbor sampling without mipmaps, and sprites use whole-texel scaling without squash or rotation.

`src/pixel-art.js` draws soldiers, hurt frames, portraits, weapon icons, crates, mines, and the landscape from integer scanlines and rectangles at startup. Terrain paints the live collision mask with a fixed palette and fractured rock shapes; water uses discrete color bands and sparse sunset reflections. The responsive framebuffer targets about 480 logical pixels across, with integer scaling; the 32×32 worm sprites use whole-pixel multiples. There are no downloaded bitmap assets in the runtime rendering path. The older files in `public/art` are historical and are not loaded or precached. DOM text and controls remain native for accessibility.

The HUD follows the same pixel reference pass: runtime-drawn plum/gold frames, segmented team health, alive-worm indicators, a central turn timer, pixel nameplates, inventory slots, an aim slider, and a live charge meter. Native buttons retain keyboard, touch, focus, and screen-reader semantics. `scripts/make-pixel-font.py` builds the bundled original 5×7 font from source glyph grids (requires Python `fonttools`); the application itself needs no font-building dependency. The reference and prompt are recorded in [`docs/art-direction/hud.md`](docs/art-direction/hud.md).

## Movement and tactical AI

Walking sweeps small increments, climbs short steps and releases support at ledges. Jumps have a brief ledge grace period and can be buffered just before landing. Rope attachment preserves momentum, allows slack, and uses the same attachment point as its visual; rope and jetpack movement sweep the full worm body through terrain.

The AI scores cover, friendly damage and possible water knockouts. It evaluates walking routes for cover and retreats without crossing unsupported ground or water. These are gameplay heuristics, not a reconstruction of Worms engine constants.

## Combat feedback

The crosshair shows aiming direction, without a future trajectory or impact prediction. Weapons and hands rotate independently of the pixel soldier, and shots originate at the visible muzzle. Launch physics remain the same across desktop and mobile layouts.

Worms use compact heads and distinct whole-body walk, jump, fall, landing, aiming and recoil frames, drawn on the native pixel grid. Enabled sound uses synthesized weapon voices, impacts, bounce ticks, fuse warnings and landings, with no audio downloads. Rapid hits accumulate into a readable damage number.

Hits trigger an illustrated hurt face, brief color flash, radial knockback with a little lift, dust trails, directional damage numbers, a short hit-stop, a slow-motion beat on a KO, and health-bar loss. Airborne worms retain horizontal momentum and collide with walls, ceilings and ground. Hard falls cause damage. Turns wait for bodies and death explosions to settle. Firing has recoil, a muzzle flash and a trail behind the actual projectile; grenades show their remaining fuse. The active worm’s label is highlighted with a pointer, labels stay below the HUD strip and shift away from the aim reticle, and help or a hidden tab pauses simulation.

See [the gameplay audit](GAMEPLAY-AUDIT.md) for corrected behavior and validation, and [the Worms mechanics research](MECHANICS-RESEARCH.md) for a sourced gap analysis and prioritized roadmap.

### Targeted checks before committing

`npm install` installs the repository's pre-commit hook (CI is excluded). For an existing checkout, run `npm run hooks:install` once. Existing custom hooks are preserved.

The hook checks staged runtime/test changes using Playwright's `--only-changed` dependency selection. Browser-facing changes also run a small desktop smoke set covering setup, loading, weapon selection, icons, and firing; runtime changes build for production. Native-kernel-only edits run their related checks without the UI smoke set. No iPhone project is used. The full suite stays in CI.

Use `npm run test:related -- --plan` to inspect the commands, or `npm run test:related` to run them. Docs-only commits skip checks. Stage code before running: the hook rejects unstaged runtime/test files so it cannot validate worktree changes that are absent from the commit. It never stashes or resets your work. Local smoke tests use port 5188 and installed Chrome on macOS, or Playwright Chromium elsewhere.

Import selection cannot prove complete behavioral coverage, especially for browser-loaded code. Keep the smoke mapping in `scripts/test-related.mjs` aligned with affected user flows.
