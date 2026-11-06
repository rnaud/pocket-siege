# Pocket Siege — Worms Mechanics Research

**Research date:** 2026-11-06  
**Scope:** compare Pocket Siege against the classic 2D Worms formula, primarily _Worms Armageddon_ (1999), with a short note on _Worms W.M.D._ (2016). Sources are linked at the end and inline.

## Executive summary

Pocket Siege already has the **combat core**: destructible terrain, wind, turn-based artillery, fall damage, drowning, knockback, limited ammo, crates, an AI, sudden-death water, and modern client-side extras such as an action camera, shot replay, result cards, daily islands and offline play.

The missing depth is mostly in three places:

1. **Turn economy and worm choice.** Armageddon lets a team choose which worm takes the turn, configures turn/retreat timers, and resolves a round with explicit sudden-death rules. Pocket Siege always rotates to the next worm, uses fixed timers, and only has rising water.
2. **Movement utilities.** The ninja rope is the signature Worms movement system; jetpack, parachute, teleport, girder, bungee, drills/blowtorch, fast walk, laser sight and invisibility all create tactical options. Pocket Siege has walk/jump/backflip only.
3. **Weapon roles and crate economy.** Armageddon has a large arsenal, but the important part is the **role spread** — hitscan, melee/knockback, cluster, area denial, homing, airstrikes, poison, superweapons — plus weapon/health/utility crates and map hazards. Pocket Siege has five explosive weapons and one simple supply crate.

The right next move is **not** to add 60 weapons. It is to add the missing **turn-economy and mobility layer** first, then a small set of representative weapon roles, then scheme/crate depth.

## What classic Worms actually does

### Turn economy

- A match is turn-based. Teams act in a randomly determined sequence, and a team normally moves **one worm per turn** unless it uses an item that allows worm selection. ([Worms Armageddon — Wikipedia](https://en.wikipedia.org/wiki/Worms_Armageddon))
- Teams can have up to **eight worms**. ([Worms Armageddon — Wikipedia](https://en.wikipedia.org/wiki/Worms_Armageddon))
- The scheme independently defines **turn time**, **retreat time**, **rope retreat time**, **hot-seat delay**, **round time**, and **worm select mode**. Worm select modes are sequential, on, or random. ([Game scheme file — Worms Knowledge Base](https://worms2d.info/Game_scheme_file))
- The **Select Worm** item toggles worm control during a turn; with Select Worm enabled, Tab cycles through the team's worms. ([Select Worm — Worms Knowledge Base](https://worms2d.info/Select_Worm))
- **Skip Go**, **Surrender**, and **Freeze** exist as turn-control / status tools. ([Weapons — Worms Knowledge Base](https://worms2d.info/Weapons))
- Scheme files also expose starting energy, fall-damage strength, artillery mode (no walking), stockpiling between rounds, team weapons, crate probabilities, mine delay, dud mines, hazardous objects, and more. ([Game scheme file](https://worms2d.info/Game_scheme_file))

### Movement and utility kit

Armageddon's movement layer is as important as its guns:

- **Ninja Rope:** attach, swing, climb/shorten, release and re-fire while airborne, fire weapons from the rope, and rope-knock other worms. Power settings control shots and maximum length. ([Ninja Rope — Worms Knowledge Base](https://worms2d.info/Ninja_Rope))
- **Jet Pack:** two thrusters, usually 30 fuel drained at 6/sec, no fall damage, weapons can be dropped while flying; it ends with the turn. ([Jet Pack — Worms Knowledge Base](https://worms2d.info/Jet_Pack))
- **Parachute:** wind-driven gliding, slight steering, auto-deploys before damaging falls, and does not end the turn. ([Parachute — Worms Knowledge Base](https://worms2d.info/Parachute))
- **Teleport:** move anywhere the worm fits, but it ends the turn. ([Teleport — Worms Knowledge Base](https://worms2d.info/Teleport))
- **Girder:** place a short or long terrain piece at one of eight angles; it blocks movement, protects from fire, bridges gaps, and ends the turn. ([Girder — Worms Knowledge Base](https://worms2d.info/Girder))
- **Bungee, blowtorch, pneumatic drill, fast walk, laser sight, invisibility, low gravity**, plus instant utilities such as Crate Spy, Crate Shower, Damage x2 and Double Turn Time. ([Weapons — Worms Knowledge Base](https://worms2d.info/Weapons))

### Weapons by role

The Armageddon weapon table contains **45 regular weapon/utility records and 20 superweapon records**. ([Game scheme file](https://worms2d.info/Game_scheme_file)) The exact count matters less than the role coverage:

| Role                  | Examples                                                            |
| --------------------- | ------------------------------------------------------------------- |
| Default artillery     | Bazooka, mortar, grenade                                            |
| Hitscan / direct fire | Handgun, shotgun, uzi, minigun, longbow                             |
| Melee / knockback     | Fire punch, dragon ball, kamikaze, prod, battle axe, baseball bat   |
| Explosive variants    | Cluster bomb, banana bomb, dynamite, petrol bomb, holy hand grenade |
| Homing                | Homing missile, homing pigeon                                       |
| Airstrikes            | Air strike, napalm strike, mail strike, mine strike                 |
| Area denial / status  | Skunk poison, flame thrower, napalm, mines, oil drums               |
| Mobile bombs          | Sheep, super sheep, mole bomb                                       |
| Superweapons          | Armageddon, nuclear test, concrete donkey, salvation army, freeze   |
| Utilities             | Rope, jetpack, parachute, bungee, teleport, girder, drills          |

Source: [Weapons — Worms Knowledge Base](https://worms2d.info/Weapons).

### Crates and hazards

- Teams can receive **weapon, health and utility crates**, airdropped or teleported; crate probabilities and health-crate energy are scheme options. ([Worms Armageddon — Wikipedia](https://en.wikipedia.org/wiki/Worms_Armageddon), [Game scheme file](https://worms2d.info/Game_scheme_file))
- The scheme can enable **oil drums / hazardous objects**, mines, dud mines, and crate limits. ([Game scheme file](https://worms2d.info/Game_scheme_file))
- Health crates stop spawning during sudden death, making remaining health crates a territorial objective. ([Sudden Death — Worms Knowledge Base](https://worms2d.info/Sudden_Death))

### Sudden death and round clock

Armageddon separates **turn time** from **round time**. When round time expires, a sudden-death event can be selected:

- Round ends / strongest team wins
- Nuclear strike (poison damage per turn)
- All worm health reduced to 1 HP
- Nothing

Water rise is a separate setting; the stock rates are 0, 5, 20 and 45 pixels per turn. Sudden death triggers between turns, never during one, and can disable worm select. ([Sudden Death — Worms Knowledge Base](https://worms2d.info/Sudden_Death))

### Fall damage and physics

Fall damage is **velocity-based**, not distance-based; losing control from a hard fall can end a turn. Under standard settings the maximum normal fall damage is about 67. ([Fall Damage — Worms Knowledge Base](https://worms2d.info/Fall_Damage))

### Customization and modes

Armageddon supports custom team names and eight named worms, a team special weapon, grave, flag, victory fanfare and voice set; random terrain, a terrain editor and terrain import; training, campaign, deathmatch, local multiplayer, online multiplayer, alliances and hot-seat. ([Worms Armageddon — Wikipedia](https://en.wikipedia.org/wiki/Worms_Armageddon))

### Worms W.M.D. additions

W.M.D. returned to 2D Armageddon-style play and added **crafting, buildings worms can enter, vehicles (tanks, helicopters, mechs), and gun turrets**. Classes, water physics and dynamic objects from earlier modern installments were removed. ([Worms W.M.D. — Wikipedia](https://en.wikipedia.org/wiki/Worms_W.M.D))

These are real Worms features, but they are a different design layer and should not be the first target for Pocket Siege.

## Pocket Siege today

| Area           | Current state                                         |
| -------------- | ----------------------------------------------------- |
| Squad          | 3 worms, 100 HP                                       |
| Turn           | One rotating worm; 30/45 sec; 3 sec retreat           |
| Weapons        | Bazooka, grenade, mortar, sticky, mine                |
| Ammo           | Per-team limited ammo; unlimited bazooka              |
| Utilities      | None (low gravity is a match modifier, not a utility) |
| Crates         | One supply crate per island; health or one ammo item  |
| Sudden death   | Rising water from round 6                             |
| Wind / gravity | Wind; low-gravity and big-blast modifiers             |
| Terrain        | Destructible mask, craters, water                     |
| Physics        | Knockback, fall damage, drowning, slow-mo, camera     |
| AI             | Seeks crates, scores water/edge risk, retreats        |
| Modes          | Single, best-of-three, daily, AI/local                |
| Meta           | Local records, share card, shot replay, offline PWA   |

Sources: [README](README.md), [GAMEPLAY-AUDIT.md](GAMEPLAY-AUDIT.md), [src/weapons.js](src/weapons.js), [src/physics.js](src/physics.js).

Pocket Siege is already ahead of classic Worms in camera work, shot replay, result sharing, daily seeds, weather, offline support and readable mobile controls. The gap is tactical breadth, not presentation.

## Gap matrix

**Impact** is how much the mechanic changes moment-to-moment decisions. **Effort** is relative implementation cost in this codebase.

| Mechanic                         | Armageddon                              | Pocket Siege             | Impact         | Effort |
| -------------------------------- | --------------------------------------- | ------------------------ | -------------- | ------ |
| Worm selection                   | Tab / Select Worm; sequential/on/random | Forced rotation          | High           | S      |
| Turn/retreat timers              | Scheme-defined                          | Fixed 30/45 and 3 sec    | Medium         | S      |
| Round timer + SD variants        | 4 events + water rates                  | Water only               | High           | S–M    |
| Skip / surrender / freeze        | Yes                                     | No                       | Medium         | S      |
| Ninja rope                       | Signature mobility                      | No                       | Very high      | L      |
| Jetpack                          | Fuel, no fall damage                    | No                       | High           | M      |
| Parachute                        | Wind glide, auto-deploy                 | No                       | Medium         | M      |
| Teleport                         | Anywhere, ends turn                     | No                       | Medium         | S–M    |
| Girder                           | Build terrain                           | No                       | High           | M      |
| Bungee / drills / blowtorch      | Yes                                     | No                       | Low–medium     | M      |
| Fast walk / laser / invisibility | Utility pickups                         | No                       | Medium         | S–M    |
| Hitscan weapons                  | Shotgun, uzi, etc.                      | No                       | High           | M      |
| Melee/knockback                  | Bat, punch, prod                        | Explosion knockback only | Medium         | S–M    |
| Cluster / banana                 | Yes                                     | No                       | High           | M      |
| Air/napalm strikes               | Yes                                     | No                       | High           | M      |
| Homing weapons                   | Missile/pigeon                          | No                       | Medium         | M–L    |
| Poison/fire/status               | Skunk, napalm, flames                   | No                       | Medium         | M      |
| Superweapons                     | 20 records                              | No                       | High spectacle | M      |
| Crate types/airdrops             | Weapon/health/utility                   | One supply crate         | High           | S–M    |
| Oil drums/hazards                | Yes                                     | Mines only               | Medium         | S–M    |
| Stockpiling                      | Scheme option                           | No                       | Low            | S      |
| Team weapons                     | Yes                                     | No                       | Medium         | S–M    |
| Team size                        | Up to 8                                 | 3                        | Medium         | M      |
| Custom teams/cosmetics           | Names, graves, voices                   | Fixed squads             | Low–medium     | L      |
| Campaign/missions                | Yes                                     | No                       | High content   | L      |
| Roping/race modes                | Yes                                     | No                       | High for niche | L      |
| Forts/alliances                  | Yes                                     | No                       | Medium         | L      |
| Vehicles/buildings/crafting      | W.M.D.                                  | No                       | Optional       | XL     |
| Online multiplayer               | Yes                                     | Deliberately no          | N/A            | XL     |

## Recommended roadmap

### Phase 1A — Turn economy (small, highest ratio)

1. **Worm select**: Tab / on-screen roster before moving; highlight the selected worm; preserve rotation.
2. **Timers**: menu options for turn time (30/45/60) and retreat (3/5/8); show them in the HUD.
3. **Round clock + sudden death**: choose water rise, 1 HP, poison/nuke, or round end; show the round timer; stop health crates in sudden death.
4. **Skip Go / Surrender / Freeze**: at minimum Skip and Surrender; Freeze as a rare utility.
5. **Tests**: turn order, selected worm, timer expiry, SD event, skip/surrender.

This changes how every turn is planned without requiring new weapon physics.

### Phase 1B — Mobility kit

1. **Ninja Rope**: fire at terrain, attach, swing with gravity, shorten/extend, release, re-fire; no rope knocking in the first cut.
2. **Jetpack**: fuel bar, thrust, no fall damage, ends with the turn or fuel.
3. **Parachute**: passive/auto-deploy, wind steering, cancels fall damage.
4. **Teleport**: target cursor, valid empty placement, ends turn.
5. **Girder**: place a 32/64 px terrain segment at 8 angles; collides with terrain and worms; ends turn.
6. **Utility tray/HUD**: icons, ammo/fuel, mobile controls, cancel.
7. **AI**: use rope/jetpack for repositioning and escapes; don't require expert rope tricks.

This is the single biggest "it feels like Worms" upgrade. Rope is the hardest and should be prototyped first.

### Phase 2 — Representative weapon roles

Add roles, not the whole list:

- **Shotgun** — hitscan, limited range, two shots, small carve.
- **Dynamite** — drop, timer, large blast.
- **Cluster bomb** — split into sub-explosions.
- **Air strike** — target an x position; plane drops a line of bombs.
- **Napalm/petrol** — persistent flame area denial.
- **Baseball bat / fire punch** — melee knockback with fall/water potential.
- **Homing missile** — one steerable projectile.
- **One superweapon** — Holy Hand Grenade or Banana Bomb, rare crate only.
- **Oil drums** — chain-reacting map hazards.

Each needs a generated weapon card, one or two tests, and an AI scoring rule. This is where the arsenal starts to feel deep without 60 icons.

### Phase 3 — Crate and scheme economy

- Airdrop crates at a configurable cadence, with weapon/health/utility types.
- Utility crate pool: rope, jetpack, teleport, girder, parachute, fast walk, laser sight, invisibility.
- Crate probabilities, crate limit, health-crate energy, dud mines, stockpiling between rounds.
- Scheme presets: Classic, Crazy Crates, Roping, Sudden Sinking, Artillery Only, Quick Skirmish.
- Save custom schemes locally.

### Phase 4 — Modes and content

- 6–10 handcrafted campaign missions with objectives other than “kill all”.
- Rope race / shopper once the rope is solid.
- Team customization: 4 worms, names, colors/hats, victory pose; 8 worms is probably too much visual/UI work.
- Forts/alliances: large; only if the core loop is already deep.

### Phase 5 — Deliberate non-goals

- **No online multiplayer** (explicit product constraint).
- **No vehicles/buildings/crafting** from W.M.D.; they change the game into a different design and are XL effort.
- **No attempt at all 65 weapon records**; a curated 15–20 with real roles is better.
- **No terrain editor** until the core mechanics and content are stable.

## Recommended next patch

**“Turn & Mobility 1A + Ninja Rope”**

- Worm select + custom timers + round timer and three sudden-death variants.
- Skip/surrender.
- Prototype, then ship, the ninja rope with a fuel-like rope HUD and mobile controls.
- Add tests for selection, SD events, rope attach/swing/detach, and fall-damage interaction.
- Add one generated utility icon/rope card in the existing paper-cut set.

This is the highest-leverage step. It makes positioning, turn planning and sudden death feel like Worms before adding a large arsenal.

## Sources

- [Worms Armageddon — Wikipedia](https://en.wikipedia.org/wiki/Worms_Armageddon) — turn structure, one worm per turn, up to eight worms, movement utilities, crates, modes, customization.
- [Weapons — Worms Knowledge Base](https://worms2d.info/Weapons) — Armageddon weapon/utility panel, regular and super weapons, Select Worm, Skip Go, Surrender, Freeze.
- [Game scheme file — Worms Knowledge Base](https://worms2d.info/Game_scheme_file) — turn/retreat/round timers, worm select, sudden death, water rise, crates, fall damage, gravity, stockpiling, team weapons, 45 regular + 20 super records.
- [Sudden Death — Worms Knowledge Base](https://worms2d.info/Sudden_Death) — four events, flooding speeds, timing, health crates, worm-select lockout.
- [Ninja Rope — Worms Knowledge Base](https://worms2d.info/Ninja_Rope) — attach/swing/re-fire, power/length, weapon drops, rope knocking.
- [Jet Pack — Worms Knowledge Base](https://worms2d.info/Jet_Pack) — fuel, thrust, fall-damage immunity, weapon drops.
- [Parachute — Worms Knowledge Base](https://worms2d.info/Parachute) — wind steering, auto-deploy, no turn end.
- [Teleport — Worms Knowledge Base](https://worms2d.info/Teleport) — anywhere placement, turn ends.
- [Girder — Worms Knowledge Base](https://worms2d.info/Girder) — short/long terrain pieces, eight angles, blocking/protection.
- [Select Worm — Worms Knowledge Base](https://worms2d.info/Select_Worm) — Tab cycling and rotation order.
- [Fall Damage — Worms Knowledge Base](https://worms2d.info/Fall_Damage) — velocity-based damage, control loss.
- [Worms W.M.D. — Wikipedia](https://en.wikipedia.org/wiki/Worms_W.M.D) — crafting, buildings, vehicles, turrets, classes removed.
