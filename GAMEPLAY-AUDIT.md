# Gameplay audit

This pass brings the core artillery controls and combat closer to Worms Armageddon. It is not full feature parity or a bit-for-bit reproduction of its physics.

## Corrected behavior

- Power comes from holding and releasing Space or the touch fire button. The power slider is gone. Repeated keydown events cannot fire extra shots; canceled touches and lost focus do not fire.
- Up/Down aim relative to facing. Left/Right move and turn. Enter and Backspace provide forward, backward, vertical and backflip jumps. Touch has separate jump controls.
- Aiming shows a short reticle only. Future flight paths and impact predictions are removed; projectile trails show only positions already traveled.
- Launch position and velocity are independent of viewport shape and sprite scaling.
- Explosions push bodies radially with distance falloff, a small upward pop and preserved existing momentum; side hits carry worms well away from the blast. Gravity acts in flight; there is no arbitrary airborne horizontal drag or steering.
- Swept body collision handles walls, ceilings and floor contact. Knocked bodies rebound and lose speed through contact friction. Hard falls damage worms and interrupt their turn.
- Bazookas respond to wind; grenades do not. Grenades use surface-normal bounce, selectable 1–5 second fuses and bounce strength.
- A shot starts a three-second retreat window. Players cannot fire a second shot, but can move and jump during retreat.
- Turn progression waits for bodies, projectiles and death explosions to settle. Dead teammates no longer cause living teammates to be skipped in rotation.
- Death explosions can cause chain reactions. Drowning eliminates a worm without an explosion.
- The computer visibly charges its chosen shot; interruptions do not leave its turn stuck. It chooses from the weapons it can afford, scores blast damage, water/edge knockback and friendly fire, detours to nearby supply crates, and retreats from its own firing line. It may also reposition away from the waterline before charging.

## Validation

Playwright runs Chromium desktop and iPhone WebKit checks for input, hold/release power, cancellation, maximum-charge firing, absent trajectory hints, grenade settings, retreat, destructive impacts, computer turns, ammo spending, difficulty selection, active-worm labels, reticle/label avoidance, one-screen touch layouts, the full-window desktop shell, best-of-three flow, daily seeding, supply crates, weather, the local record book, KO slow-motion, match modifiers, the action camera, proximity mines, shot replay, result-card availability and saved settings. Physics tests cover radial impulses, momentum, collision, fall damage, friction, head hits, charge progression, bounce reflection, viewport-independent launch geometry and gravity scaling. AI tests cover blast scoring, limited-ammo weapon choice, difficulty jitter, waterline repositioning and crate seeking. Progress tests cover record storage, streaks, daily seeds, series targets and pickup effects. Camera, modifier and settings helpers have separate unit tests. Offline reload after service-worker precache was verified against the production preview. WebKit emulation is not a physical iPhone device test.

## Additional controls and weapons

Desktop aiming uses Up/Down or W/S; the slider is touch-only. Charge is displayed around the reticle. Walking no longer toggles the fire button’s disabled appearance on tiny terrain steps. The loadout includes a shorter-range, larger-blast mortar, a timed sticky bomb that attaches to terrain or moving worms, and a proximity mine placed at the worm’s feet (M). A mine arms after 1.2 seconds, triggers on any worm within its radius, and ends the placing turn; squads carry two. Grenades, mortars, stickies and mines are limited; the bazooka stays unlimited. From round six, sudden death raises the sea each round. Solo play offers Rookie, Regular and Veteran computer skill. Best of 3 adds a series score and alternating island starts. Match modifiers are Standard, Low gravity, Big blasts, Quick turns and Moon chaos. A supply crate heals or restocks one squad per island. Weather changes the wind range and paints rain or a storm over the battlefield. The action camera fits the projectile and shooter together; after a shot, ↺ REPLAY traces the recorded projectile path, and a finished match can export a locally composed result card. The active worm’s label is highlighted; a KO adds a short slow-motion beat, dust trails follow knocked worms, and damage numbers point in the knockback direction. The Daily Island reuses a date-seeded terrain; the local record book and saved settings stay in `localStorage`. A service worker precaches the production build for offline play after the first load. These are Pocket Siege additions, not claims of identical Armageddon weapon behavior.

## Intentional tuning and remaining scope

The game uses its own 120 Hz simulation, elliptical body collision, terrain mask and tuned movement/weapon values. The bazooka uses a faster launch speed than the other weapons, and blast knockback adds lift so side hits arc away. Charge duration is two seconds, retreat three seconds, and turns 45 seconds (30 with Quick turns or Moon chaos). Standard blast damage caps at 50; the added heavy mortar caps at 65. Each squad starts with three grenades, two mortars, two stickies and two mines. A mine has a 55-unit radius, 45 damage and a 1.2-second arming delay. Low gravity uses 0.55× gravity; Big blasts uses 1.35× radius, damage and impulse. The camera zooms at most 1.35× and fits the action and shooter rather than following the projectile alone. Sudden death begins at round six and raises the water 18 world units per round, capped at 250. A best-of-three series ends at two round wins; a draw is replayed and the series is capped at nine islands. Crates restore 25 HP or one ammo item, capped at nine. Clear, rain and storm wind ranges are 28, 36 and 52 units per second. KO slow-motion runs at about one-third speed for 0.7 seconds. These are this game's settings, not a claim that every original scheme uses these values.

Still absent: the original's full arsenal, ninja rope and utilities, full-turn replays, configurable schemes and the original's exact sudden-death variants, online networking, and exact original collision masks, movement constants and camera behavior. The shot replay is a visual tracer of the recorded projectile, not a state-restoring replay of every body and terrain change. The game is intentionally client-side only; the Daily Island, record book and saved settings are local, with no accounts, leaderboards or network requests. This audit fixes the implemented core systems; those larger features remain outside the current game.

## Performance

Terrain texture rebuilds read the collision mask directly, allocate no per-pixel color arrays, and are deferred to one paint per frame; debris and projectile meshes share geometry/materials, and projectile shaders are prewarmed before the first shot. The camera updates one orthographic projection matrix per frame; HUD overlays reuse the same view rectangle. In a 4× CPU-throttled mobile profile, the per-pixel texture rebuild measured roughly 15 ms; the complete repaint is deferred and coalesced per frame. The service worker precaches same-origin HTML, JS, CSS, art and the manifest after the first production load.

## References

- [Team17 controls reference](https://wa.worms2d.info/main.html?area=cont&page=abou): aiming, firing, jumps, weapon groups, fuse and bounce controls.
- [Original Team17 manual](https://ftp.zx.net.nz/pub/archive/ftp.team17.com/pub/t17/manuals/Worms_Armageddon.pdf): charged shots, grenade settings, fall damage, retreat and waiting for motion to settle.
