# Game modules

This refactor changes ownership and wiring, not gameplay rules. `game.js` loads configuration, initializes the systems and UI, handles character selection, and runs the frame loop. Its update sequence and 0.05-second delta cap are preserved.

| Module | Responsibility |
| --- | --- |
| `combat.js` | Damage, headshots, attacks, projectiles, reloads, fire modes, explosions, damage popups and sparks |
| `abilities.js` | Ability activation, cooldowns, active effects, Battle Medicine, soldier grenade activation, Bounty Hunter and Engineer abilities/deployables |
| `enemies.js` | Enemy hero, forest spawners, skeleton waves, ranged attacks, enemy targeting, deaths and rewards |
| `units.js` | Unit construction, selection and orders; the existing shared friendly/enemy movement and attack loop |
| `buildings.js` | Construction, placement, selection, training, building destruction and placement preview |
| `inventory.js` | Items, pickups, equipment/stats, ability slots, inventory UI, weapon details and upgrades |
| `progression.js` | XP, levels, upgrades, profession reputation/unlocks, rank rewards, existing character save format |
| `quests.js` | Contracts, camp discovery, objectives, rewards and quest HUD |
| `world.js` | World construction and transitions, portals, forests/villages, resources, harvesting and environment collision |
| `gameModes.js` | Waves, dodge arena, shooting targets, training ammo, mode triggers and victory/loss displays |
| `economy.js` | Shop access, wood sales and shop UI; equipment costs stay with equipment and trader controls stay with NPCs |
| `rendering.js` | Canvas setup, camera, world/character rendering, minimap and general drawing helpers |
| `player.js` | Player movement/update, regeneration, derived movement stats, status and respawn |
| `vehicles.js` | Existing Humvee driving, weapons, tech, travel, inventory and specialized drawing |
| `inputs.js` | Existing keyboard/mouse handling; unchanged |
| `npcs.js` | Existing guides, captain, trader, instructor, driver and dialogue; profession/contract bookkeeping delegates to the new modules |

The checkout still contained the vehicle implementation in `game.js`. Those functions were moved intact into `vehicles.js`.

## Wiring and state

`modules/systems.js` constructs each system once, then connects the existing NPC factory. Each new factory receives a shared registry of cross-system actions. Factories define functions and constants; gameplay starts only after construction. Systems do not import one another or `game.js`, avoiding circular imports. Pure geometry helpers live in `modules/math.js`.

Existing entity arrays, player/hero/quest state, and additional shared collections live in `modules/state.js`. Its `runtime` object holds mutable configuration and entity references, including the bases and enemy hero. Consumers read those references live rather than retaining stale copies across world transitions. NPC-local state and the input selection box remain in their existing modules. The coordinator supplies a live frame-time getter for vehicle animation/recoil.

Assets remain in `modules/assets.js`, DOM references in `modules/dom.js`, and existing global constants in `modules/constants.js`. System-specific configuration moved with its owner. Save keys and serialized fields are unchanged.

The frame update calls retain their original order. In particular, ability timers, reload completion, active ability projectiles, world triggers, harvesting and automatic pickups still execute at their original points inside the player update. Enemy-hero death rewards still run after building destruction cleanup.

## Verification

- `node tests/run.cjs`: five suites using actual ES module loading, covering existing characters, progression/save compatibility, NPCs, waves, combat, buildings/training, selection/orders, shops and vehicles. The module test also checks for missing service bindings and circular imports.
- `node tests/browser.cjs`: temporary local server and headless Google Chrome on macOS. Checks initialization and JavaScript console errors, renders every character, visits the worlds/modes, exercises inventory and keyboard input, and tests mounted weapons/recoil, vehicle travel and save/restore. Test-only hooks are added in memory; production files expose no test globals.

The extraction audit compared 407 original named functions: 404 retained their bodies apart from reference qualification, and the three split functions retained the identical statement sequence after inlining their extracted helpers. No original function implementation was lost or duplicated.

## Networking foundation

Run `npm install`, then `npm start` and open `http://127.0.0.1:4173`.
Socket.IO shares the existing HTTP server and serves its matching browser ES module
locally. `network.js` loads separately from `game.js` and connects to the page's
origin. The server logs connections and disconnections; no game state is sent or
replicated yet.

The client module exports `connect()`, `disconnect()`, `isConnected()`,
`getSocketId()`, `send(event, ...args)`, and `on(event, handler)`.
`on` returns an unsubscribe function and supports Socket.IO lifecycle events
(`connect`, `disconnect`, `connect_error`). `send` returns false while disconnected
instead of buffering events. Unexpected transport failures use Socket.IO's default
reconnection; explicit disconnect stays disconnected until `connect()` is called.
Page exit disconnects, and page restoration reconnects.

`npm run test:browser` uses the production server factory with the existing
test-only game instrumentation. It verifies browser connection, a test-only event
round trip, explicit disconnection, reconnection, and cleanup on browser close,
including the server's socket registry. It also runs the existing gameplay smoke
checks. Google Chrome on macOS is required.

The HTTP integration follows the [Socket.IO server initialization documentation](https://socket.io/docs/v4/server-initialization/).

## Before gameplay synchronization

- Simulation and UI remain coupled: damage, rewards, equipment and world transitions update DOM and local effects directly. Separate authoritative state changes from presentation events.
- State is still a single local world. Player/hero references, shared collections and local storage need session/player ownership before supporting multiple players.
- Combat, vehicles, buildings and world transitions still call one another through the registry. Narrow these interfaces into explicit actions and events before networking them.
- Friendly and enemy units intentionally retain the same movement/attack routine. Selection uses entity IDs, while some targeting retains object references; network replication will need consistent identity and lifecycle handling.
- Randomness, frame timing, input actions, purchases and rewards remain client-driven. Decide authority and synchronization rules before networking gameplay; the networking foundation does not change them.
