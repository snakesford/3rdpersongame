# Bounty Hunter

Run `node server.js`, open `http://127.0.0.1:4173`, and choose **Bounty Hunter**.
Left-click fires the Trail Pistol; R reloads. Equipment and weapon upgrades use the existing inventory systems.

| Base stat | Bounty Hunter | Soldier |
| --- | --- | --- |
| Health | 110 | 120 |
| Armor | 25 | 45 |
| Speed | 345 | 300 |
| Bullet headshot multiplier | 2.5× | 2× |
| Starting weapon damage | 20 | 16 |
| Magazine | 8 | 30 |

Headshots use the game's existing chance-based headshot system and helmet protection.

| Default key | Ability | Effect | Cooldown |
| --- | --- | --- | --- |
| F | Hunter’s Mark — Damage | Enemy under the cursor takes 25% more damage from this hunter for 8 seconds; overhead marker and timer. No target consumes no cooldown. | 12s |
| Q | Adrenaline Shot — Support | Immediately restore up to 30 HP and gain 20% movement speed for 6 seconds; green particles while active. | 20s |
| G | Explosive Bolt — Damage | Hold to aim, release to launch; 45 direct damage and 25 to other enemies within 80 world units. Maximum travel 600 units. | 8s |

The direct target receives 45 total, rather than an additional 25 splash damage. The mark bonus applies to the hunter's pistol, equipped weapons, and bolt; allied damage receives no bonus. Bolt collision uses substeps and detonates on obstacles or at the aimed destination. Mark and stimulant effects clear on respawn or character change.

The three abilities use the same draggable inventory slots as Soldier. The first three slots unlock at level 1; the remaining slots unlock at levels 2, 4, and 6. Moving an ability changes its key in the HUD and controls. Ability cooldowns and descriptions appear in the existing details panel.

## Assets

- `images/bounty-hunter-portrait.png` — illustrated character-selection portrait.
- `images/bounty-hunter-sprite.png` — illustrated game and inventory character.
- `images/bounty-hunter-portrait.svg`, `images/bounty-hunter-sprite.svg` — lightweight editable placeholders, retained for replacement workflows.
- `images/hunters-mark.svg` — mark icon placeholder.
- `images/adrenaline-shot.svg` — stimulant icon placeholder.
- `images/explosive-bolt.svg` — bolt icon placeholder.
- `images/trail-pistol.svg` — equipment icon placeholder.

Character portrait and sprite paths are defined in `character-options.json`; ability icon paths are in `getInventoryAbilityIcon()` in `game.js`. The rendered sprite is loaded near `drawBountyHunter()`.

## Character progress saves

Previously, only the player name was persisted. Version 1 character progress now saves every five seconds, on page exit, and before switching characters. Choose the same character under the same player name to resume its saved progress. Saves use localStorage keys beginning with `timberlineCommandCharacterV1:` and do not replace the old player-name key.

Saved data includes level, XP, upgrade points and bonuses, currencies, weapon upgrades, equipped weapon and helmet, backpack, ability placement, ability cooldowns, and profession progression/reward unlocks. World encounters, active profession tasks, transient buffs, and marked target IDs are not restored; loading starts in the existing village with full health. Invalid JSON and unsupported save versions are ignored.

## Verification

Run `node tests/bounty-hunter.cjs` for dependency-free gameplay and DOM/canvas smoke tests. Coverage includes exact damage, headshots and mark ownership, timers, healing cap, actual movement boost, projectile collision and splash, input guards, slot remapping, persistence, respawn, asset paths, and rendering/updating every existing character. DOM and canvas are stubbed; these tests are not a visual browser inspection.

## Artwork generation

Created with the built-in imagegen tool. Final workspace assets are the two PNG paths above. SVG icons and fallback illustrations are editable placeholders.

Generation prompt:

> Use case: stylized-concept. Create a single full-body male Bounty Hunter game character sprite with genuinely transparent background. Rugged adventurer, weathered face with short beard, broad worn leather brimmed hat, rust scarf, long flowing brown leather duster coat, light leather shoulder armor, belt utility pouches and small ammunition bandolier, dark trousers and sturdy worn boots. Holds a compact antique-style pistol in his right hand aimed slightly toward screen right. Three-quarter standing view facing screen right, entire head hat coat boots and weapon visible with small transparent margins. Style: detailed hand-painted digital game illustration with strong dark ink outlines, warm highlights, textured leather and fabric, slightly stylized heroic proportions; match illustrated game inventory character art. Must look like an independent frontier bounty hunter, absolutely not a soldier, robot, mage or archer. No tactical military vest, military helmet, camouflage, rifle, bow, staff, magic, text, scenery, watermark, or cast ground shadow. This is a project-bound sprite asset, transparent PNG.

Sprite refinement prompt:

> Background extraction edit. Preserve the entire bounty hunter exactly including hat, face, pistol, hands, coat edges, boots, pose and painted style. Remove ALL black and brown background and background glow; replace background with genuinely transparent alpha pixels, no scenery, no shadow, no gradient, no opaque backdrop. Produce a clean transparent PNG game sprite cutout, full figure with small margins. Do not redraw the character.
