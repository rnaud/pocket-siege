# Gameplay audit

This pass brings the core artillery controls and combat closer to Worms Armageddon. It is not full feature parity or a bit-for-bit reproduction of its physics.

## Corrected behavior

- Power comes from holding and releasing Space or the touch fire button. The power slider is gone. Repeated keydown events cannot fire extra shots; canceled touches and lost focus do not fire.
- Up/Down aim relative to facing. Left/Right move and turn. Enter and Backspace provide forward, backward, vertical and backflip jumps. Touch has separate jump controls.
- Aiming shows a short reticle only. Future flight paths and impact predictions are removed; projectile trails show only positions already traveled.
- Launch position and velocity are independent of viewport shape and sprite scaling.
- Explosions push bodies radially, with distance falloff and preserved existing momentum. Gravity acts in flight; there is no arbitrary airborne horizontal drag or steering.
- Swept body collision handles walls, ceilings and floor contact. Knocked bodies rebound and lose speed through contact friction. Hard falls damage worms and interrupt their turn.
- Bazookas respond to wind; grenades do not. Grenades use surface-normal bounce, selectable 1–5 second fuses and bounce strength.
- A shot starts a three-second retreat window. Players cannot fire a second shot, but can move and jump during retreat.
- Turn progression waits for bodies, projectiles and death explosions to settle. Dead teammates no longer cause living teammates to be skipped in rotation.
- Death explosions can cause chain reactions. Drowning eliminates a worm without an explosion.
- The computer visibly charges its chosen shot; interruptions do not leave its turn stuck.

## Validation

Playwright runs Chromium desktop and iPhone WebKit checks for input, hold/release power, cancellation, maximum-charge firing, absent trajectory hints, grenade settings, retreat, destructive impacts and computer turns. Physics tests cover radial impulses, momentum, collision, fall damage, friction, head hits, charge progression, bounce reflection and viewport-independent launch geometry. WebKit emulation is not a physical iPhone device test.

## Intentional tuning and remaining scope

The game uses its own 120 Hz simulation, elliptical body collision, terrain mask and tuned movement/weapon values. Charge duration is two seconds, retreat three seconds, and turns 45 seconds. Blast damage caps at 50. These are this game's settings, not a claim that every original scheme uses these values.

Still absent: the original's full arsenal, ninja rope and utilities, crates and mines, configurable schemes and sudden death, online networking, replays, and exact original collision masks, movement constants and camera behavior. This audit fixes the implemented core systems; those larger features remain outside the current game.

## References

- [Team17 controls reference](https://wa.worms2d.info/main.html?area=cont&page=abou): aiming, firing, jumps, weapon groups, fuse and bounce controls.
- [Original Team17 manual](https://ftp.zx.net.nz/pub/archive/ftp.team17.com/pub/t17/manuals/Worms_Armageddon.pdf): charged shots, grenade settings, fall damage, retreat and waiting for motion to settle.
