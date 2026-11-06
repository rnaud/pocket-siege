# Pocket Siege

A Worms-inspired, turn-based artillery game built with Three.js. Original generated paper-cut character, prop and background art; no Worms assets or branding are used.

## Play

[Play Pocket Siege](https://rnaud.github.io/pocket-siege/)

Pit Moss Company against Coral Crew on a destructible floating island. Play a single island or a best-of-three series, solo against Rookie, Regular or Veteran computer skill, or local pass-and-play. Each squad has three worms; the last squad standing wins. Choose clear skies, rain or storm and a match modifier, grab a supply crate, and plant a proximity mine when the ground gets crowded. The camera follows the action, and you can replay your last shot or export a result card.

- **Move:** left/right arrows, A/D, or touch buttons.
- **Aim:** Up/Down arrows or W/S. On touch, drag on the battlefield or use the angle slider. No predicted trajectory is shown.
- **Fire:** hold Space (or the touch fire button) to build power; release to shoot. Power fills a ring around the aiming reticle. Full charge fires automatically after two seconds.
- **Jump:** Enter jumps forward; double Enter jumps backward. Backspace jumps vertically; double Backspace backflips. Touch has Jump and Backflip buttons.
- **Weapons:** F1 selects bazooka; F2 grenade; F3 heavy mortar; F4 sticky bomb; M places a proximity mine at your worm’s feet. Mortars have shorter range and a larger impact blast. Sticky bombs attach to terrain or worms until their fuse expires. A mine arms after 1.2 seconds and detonates when any worm walks within its trigger radius, so retreat. Each squad carries three grenades, two mortars, two stickies and two mines; the bazooka is unlimited. Counts are shown on the loadout buttons. Grenade/sticky fuse: keys 1–5; bounce: +/−, or use the touch selectors.
- Wind affects bazookas; grenades, mortars and stickies ignore wind. Rain strengthens the wind and storms push it harder. Water eliminates worms. From round six the sea rises every round, so a stalemate becomes a scramble for high ground. Turns last 45 seconds by default, with three seconds to retreat after firing.
- **Match structure:** choose Single island or Best of 3 in the menu. A series shows its score under the round label, plays a new island after each round, and alternates who starts. The winner is the first squad to two round wins.
- **Match modifiers:** Standard, Low gravity, Big blasts, Quick turns (30 seconds) or Moon chaos (low gravity, big blasts and 30-second turns). The AI plans against the selected gravity and blast size.
- **Camera and replays:** the camera fits the shot and the shooter together, then returns for the next turn. After any shot, use ↺ REPLAY to trace the last projectile’s path over the current board. Finished matches can export a result card from the menu; touch devices with file sharing open the share sheet, otherwise it downloads a PNG.
- **Supply crates:** one crate lands per island. Walk a worm onto it to heal 25 HP or add one grenade, mortar or sticky, up to nine of each. The computer will detour to a nearby crate.
- **Daily island:** the menu has a date-seeded Daily Island with clear weather and a one-island solo format. Your win/loss, streak, best hit and longest shot are kept in a local record book; nothing is sent anywhere.
- Sound is optional; use the music-note button. Help pauses the match. Sound, match type, skill, format, weather and modifier are remembered on this device.

Touch layouts support portrait and landscape, including iPhone Safari, and keep the whole control deck on one screen without page scrolling. On desktop the battlefield and control deck fill the window edge to edge. No install or account is required. This is a focused local artillery game, not a recreation of every Worms Armageddon feature; there is no online multiplayer.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run build
```

`npm run preview` serves the production build. Character, hurt-frame, portrait, weapon-card and background images are generated original paper-cut art, optimized in WebP. Terrain, water and effects are procedural. Google Fonts is optional, with system fallbacks. Three.js is bundled locally. A web app manifest and apple-touch icon make the game installable; Open Graph and Twitter tags use the generated share card.

## Tests

```sh
npx playwright install chromium webkit
npm test
```

Tests cover terrain removal, projectile impacts and turn progression, computer turns, AI weapon/blast planning, crate seeking, ammo spending, proximity mines, match modifiers, the action camera, shot replay, the result card, saved settings, generated-art loading, label readability, sudden-death water levels, supply crates, weather, best-of-three flow, daily seeds, the local record book, desktop full-window and iPhone layouts in Chromium and WebKit.

## Deployment

The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages on pushes to `main`. In repository Settings → Pages, select **GitHub Actions** as the source. Vite uses a relative base so repository subpaths work.

## Implementation

A lightweight water shader animates foam, ripples and bubbles; reduced-motion settings freeze its animation, and sudden death can raise its surface. Three.js renders an orthographic battlefield, animated paper-cut soldiers, projectile models, debris, billboard crates and mines, and a layered paper jungle backdrop. Terrain is painted as flat ochre paper strata with a cream cut rim and chartreuse grass; water uses deep teal inks and cream foam. The weapon rigs keep procedural geometry but use the paper palette with ink edge lines. Weather is a cheap CSS layer; storms widen the wind range. A binary terrain mask powers collision and circular excavation; a canvas texture displays the same mask, rebuilt from the mask once per frame after a crater. Physics runs at a fixed 120 Hz with swept projectile collision and an optional gravity scale. The computer samples trajectories for every weapon it can afford, scores blast damage, water/edge knockback and friendly fire, seeks nearby crates, retreats after firing, and can reposition before charging. The camera is an orthographic view rectangle that eases between the full island and a fitted action frame; all HUD overlays project through the same view.

## Daily island and records

The Daily Island uses a date-seeded terrain and a fixed clear/single ruleset. The latest result for the day is stored in `localStorage` along with career wins, losses, streak, best single-blast damage and longest shot. The record book is entirely local: there is no account, server, leaderboard or network request.

## Offline and sharing

The production build registers a service worker that precaches the page, CSS, JavaScript, art and manifest. After the first load the game starts offline; updates are fetched network-first when a connection exists. Saved settings and records use `localStorage` only. Result cards are composed locally on a canvas and either handed to the Web Share API on touch devices or downloaded as a PNG. There is no account, server, leaderboard or analytics request.

## Share and install

The game ships a web app manifest, paper-seal 192/512 px icons, an apple-touch icon and a favicon for installable play. Link previews use the generated 1200×630 card at `public/art/og-card.png`; regenerate the card, icons and favicon with `python3 scripts/make-brand-assets.py` after changing the art.

## License

MIT. Worms and Worms Armageddon are trademarks of their respective owners. This project is independently created and is not affiliated with Team17.

## Art direction

The current **Paper-Cut Expedition** pass uses layered construction paper, screenprint grain, ink outlines and a cream/teal/moss/coral palette. It replaces the earlier gouache jungle with a paper-cut backdrop and emblem, new body and hurt frames, full portraits, five weapon cards, a crate sprite, paper-grain UI surfaces and a matching OG card. Assets and exact prompts are in [`public/art/ART-DIRECTION.md`](public/art/ART-DIRECTION.md).

OpenAI `gpt-image-1.5` was attempted first but the supplied key had no image credits. The pass was generated with Gemini 3.1 Flash Image; the prompts are provider-neutral and can be rerun with OpenAI once image credits are available. The share card, icons and favicon are composed locally by `scripts/make-brand-assets.py`. Soldier sprites breathe, bob when walking, and face the aiming direction; the terrain is paper strata with a cream cut rim, stone flecks and chartreuse grass.

## Combat feedback

The crosshair shows aiming direction, without a future trajectory or impact prediction. Weapons and hands rotate independently of the paper-cut soldier, and shots originate at the visible muzzle. Launch physics remain the same across desktop and mobile layouts.

Hits trigger an illustrated hurt face, flinch, brief color flash, radial knockback with a little lift, dust trails, directional damage numbers, a short hit-stop, a slow-motion beat on a KO, and health-bar loss. Airborne worms retain horizontal momentum and collide with walls, ceilings and ground. Hard falls cause damage. Turns wait for bodies and death explosions to settle. Firing has recoil, a muzzle flash and a trail behind the actual projectile; grenades show their remaining fuse. The active worm’s label is highlighted with a pointer, labels stay below the HUD strip and shift away from the aim reticle, and help or a hidden tab pauses simulation.

See [the gameplay audit](GAMEPLAY-AUDIT.md) for corrected behavior, validation, and remaining differences from Worms Armageddon.
