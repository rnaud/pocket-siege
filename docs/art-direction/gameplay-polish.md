# Battlefield and combat polish

The Armageddon comparison informed six changes while retaining the original palette and generated pixel grid:

- A compact scoreboard and control strip leave more room for the battlefield. ARSENAL opens the weapon tray; selecting a weapon closes it. Keyboard shortcuts remain available when the tray is closed.
- Worms have generated idle/blink, aiming, walking, recoil, panic, hurt and victory expressions. The active worm visibly holds its weapon while aiming.
- Elevated ridges, open-sided shelters, a tunnel and a separated coastal ledge share the terrain's destructible collision mask.
- Small team-colored labels emphasize the active or injured worm. Off-camera worms do not accumulate labels against the viewport edge.
- Layered integer-grid explosion bursts, square debris and short impact pauses sharpen combat feedback. The charge meter appears beside the active worm as well as in the controls.
- Portrait mode fills the available battlefield and tracks the active worm or projectile. MAP provides a complete battlefield overview; FOLLOW restores tracking. Landscape retains the wide composition.

Artwork and animation frames are generated in code. No new raster runtime assets or reference images are loaded. Keyboard, touch, reduced-motion preferences, and accessible native controls are preserved.
