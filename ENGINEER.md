# Engineer

Run `node server.js`, open `http://127.0.0.1:4173`, and choose **Engineer**. Left-click fires the heavy nail gun; R reloads. Existing equipment, weapon upgrades, leveling, draggable ability slots, and character progress saves are shared with Soldier and Bounty Hunter.

Base stats: **120 HP, 75 armor, 225 movement speed**. The nail gun deals 12 base damage, holds 16 nails, and fires every 0.28 seconds. Normal nails use the existing bullet headshot chance and multiplier. Weapon and ability damage upgrades apply through the existing progression system.

| Default key | Ability | Behavior | Cooldown |
| --- | --- | --- | --- |
| F | Bolt Shot — Damage | 35 base damage, ignoring 50% of armor; 600-unit range. This ability does not roll headshots. | 2s |
| Q | Repair Station — Support | Lasts 12 seconds; heals allies for 6 HP/sec within 150 units, or repairs friendly vehicles for 12 HP/sec. | 25s |
| G | Auto Turret — Damage/Support | 100 HP, 320-unit detection range, 10 base damage every 0.6 seconds. Only one active; deploying another replaces it. | 30s |

The first three ability slots unlock at level 1; additional slots unlock at levels 2, 4, and 6, matching existing characters. Dragging abilities changes their keys in the shared HUD and controls. HUD displays include station lifetime, turret health, and cooldowns. Inventory details include descriptions and icons.

## Combat and support details

Engineer projectiles stop at their first target or obstacle and use substeps to avoid skipping collisions. Turrets seek the nearest visible enemy and cannot detect through trees, rocks, or buildings. Enemies can target turrets with melee and ranged attacks, including forest enemies. Turret kills use the existing XP and loot processing.

Armor calculation for Engineer projectiles is `damage × 100 / (100 + armor × (1 − penetration))`, rounded by the existing ranged-hit handler. Bolt Shot uses 50% penetration; normal nails and turret shots use zero. An unarmored Bolt Shot deals 35; against 100 armor it deals 23 instead of 18 without penetration. Incoming damage to the Engineer on foot uses `damage × 100 / (100 + totalArmor)`, so 75 armor reduces a 35-damage hit to 20. Existing characters' damage calculations are unchanged.

Repair stations cap health at maximum and never revive destroyed units. They also repair allied turrets. Vehicle range is measured to the vehicle's hull rather than its center. Friendly vehicles include allied entities and player-claimed Humvees, even after parking. Vehicles carried in the existing unit/building collections are supported when their type/kind is `humvee`, `tank`, or `vehicle`, or `isVehicle` is true. This adds generic repair support; it does not introduce a new tank vehicle into the game.

Abilities cannot be placed while dead, driving, in a dialogue, placing a building, or using inventory/shop panels. Existing deployed equipment continues functioning when the Engineer enters a vehicle. Deployables clear on respawn, character change, or world changes.

## Saves

Engineer uses the existing versioned per-character localStorage saves. Level, upgrades, equipment, backpack, ability placement, and cooldowns restore when selecting Engineer under the same player name. Cooldown restoration now reads each ability's configured duration, preserving the full 25- and 30-second Engineer cooldowns. Deployables are temporary world entities and are not restored into a restarted world.

## Assets and verification

- `images/engineer-sprite.png` — illustrated mechanic with heavy nail gun, used in game and inventory.
- `images/engineer-portrait.png` — character-selection artwork.
- `images/bolt-shot.svg`, `images/repair-station.svg`, `images/auto-turret.svg` — ability icons.
- `images/nail-gun.svg` — equipment icon.

The PNG artwork was created with the built-in imagegen tool; SVG icons and deployable canvas drawings are editable code assets.

Run `node tests/engineer.cjs` and `node tests/bounty-hunter.cjs`. Coverage includes abilities, armor, actual projectile impacts, friendly/enemy healing filters, claimed Humvees and generic tanks, health caps and station expiry, turret replacement/destruction, enemy melee/ranged targeting, line of sight, XP rewards, input guards, save restoration, and character switching. These are automated smoke tests with stubbed DOM/canvas, not a browser visual inspection.

## Artwork prompt

> Use case: stylized-concept. Asset type: full-body playable Engineer game sprite and inventory portrait, genuinely transparent alpha background. Single rugged male mechanic technician, grounded early-industrial equipment, broad work pants, heavy scuffed boots, rolled-up cream shirt sleeves, thick protective work gloves, leather tool belt packed with spanners and pliers, welding goggles on forehead, short disheveled hair and stubble, small compressor and mechanical equipment strapped to back. Carries a heavy industrial pneumatic nail/bolt gun in both hands, recognizably a construction power tool with squared steel housing, chunky nail magazine, brass fittings and short hose. Full body including boots, three-quarter standing facing screen right, compact silhouette, centered with transparent margins. Detailed illustrated hand-painted game art with strong dark outlines, warm highlights, fabric and worn steel texture, heroic but natural proportions. Distinctly civilian repair worker; no soldier uniform, camouflage, tactical armor, helmet, robot features, futuristic tech, magic, bow, long coat, cape, cowboy hat, revolver or bounty hunter attire. No text, scenery, floor, glow, backdrop or cast shadow. Transparent PNG cutout.
