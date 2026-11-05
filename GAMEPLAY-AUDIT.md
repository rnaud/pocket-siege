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
- The computer visibly charges its chosen shot; interruptions do not leave its turn stuck. It now chooses from the weapons it can afford, scores blast damage and friendly fire, and may reposition away from the waterline before charging.

## Validation

Playwright runs Chromium desktop and iPhone WebKit checks for input, hold/release power, cancellation, maximum-charge firing, absent trajectory hints, grenade settings, retreat, destructive impacts, computer turns, ammo spending, difficulty selection, active-worm labels, reticle/label avoidance, one-screen touch layouts and the full-window desktop shell. Physics tests cover radial impulses, momentum, collision, fall damage, friction, head hits, charge progression, bounce reflection and viewport-independent launch geometry. AI tests cover blast scoring, limited-ammo weapon choice, difficulty jitter and waterline repositioning. WebKit emulation is not a physical iPhone device test.

## Additional controls and weapons

Desktop aiming uses Up/Down or W/S; the slider is touch-only. Charge is displayed around the reticle. Walking no longer toggles the fire button’s disabled appearance on tiny terrain steps. The loadout now also includes a shorter-range, larger-blast mortar and a timed sticky bomb that attaches to terrain or moving worms. Squads carry limited grenades, mortars and stickies; the bazooka stays unlimited. From round six, sudden death raises the sea each round. Solo play offers Rookie, Regular and Veteran computer skill. These are Pocket Siege additions, not claims of identical Armageddon weapon behavior. Animated shader water adds foam, ripples and bubbles, and the active worm’s label is highlighted.

## Intentional tuning and remaining scope

The game uses its own 120 Hz simulation, elliptical body collision, terrain mask and tuned movement/weapon values. The bazooka uses a faster launch speed than the other weapons, and blast knockback adds lift so side hits arc away. Charge duration is two seconds, retreat three seconds, and turns 45 seconds. Standard blast damage caps at 50; the added heavy mortar caps at 65. Each squad starts with three grenades, two mortars and two stickies. Sudden death begins at round six and raises the water 18 world units per round, capped at 250. These are this game's settings, not a claim that every original scheme uses these values.

Still absent: the original's full arsenal, ninja rope and utilities, crates and mines, configurable schemes and the original's exact sudden-death variants, online networking, replays, and exact original collision masks, movement constants and camera behavior. This audit fixes the implemented core systems; those larger features remain outside the current game.

## Performance

Terrain texture rebuilds read the collision mask directly, allocate no per-pixel color arrays, and are deferred to one paint per frame; debris and projectile meshes share geometry/materials, and projectile shaders are prewarmed before the first shot. In a 4× CPU-throttled mobile profile, the per-pixel texture rebuild measured roughly 15 ms; the complete repaint is deferred and coalesced per frame.

## References

- [Team17 controls reference](https://wa.worms2d.info/main.html?area=cont&page=abou): aiming, firing, jumps, weapon groups, fuse and bounce controls.
- [Original Team17 manual](https://ftp.zx.net.nz/pub/archive/ftp.team17.com/pub/t17/manuals/Worms_Armageddon.pdf): charged shots, grenade settings, fall damage, retreat and waiting for motion to settle.
