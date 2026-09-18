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
origin. The server logs connections and disconnections; room rosters and initial
player spawns are synchronized independently of the simulation.

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

### Multiplayer rooms

The character selection screen includes Create game, Join game, a room code and
player count, and Leave game. Codes are six uppercase letters/digits (excluding
ambiguous characters); joining accepts lowercase and surrounding whitespace.
`lobby.js` owns this UI and uses the room helpers exported by `network.js`:
`createRoom()`, `joinRoom(code)`, `leaveRoom()`, `getRoom()`, and
`sendRoomMessage(data)`. Requests return promises and reject with readable errors.

`rooms.cjs` owns room membership on the server. Each connection can belong to one
game, with at most two connections per game. The server handles `room:create`,
`room:join`, and `room:leave` with `{ok, room}` or `{ok: false, error}` acknowledgments
(leave returns only `{ok: true}`). It publishes `room:state` only to that game's
members. State includes `code`, `worldId`, `spawnId`, `players`, and `capacity`.
Player records contain `{id, name, selectedCharacter, spawnPosition}`.

`room:message` relays data only to the sender's peer, wrapped as
`{senderId, data}`. Both identity and destination come from server membership;
payload fields cannot select a destination or change the event name. There is no
global broadcast or gameplay handler. This uses [Socket.IO room-scoped delivery](https://socket.io/docs/v4/rooms/).

Rooms live in memory in one server process. Leaving or disconnecting releases a
slot and updates the remaining member; the last departure deletes the room.
There is no special host role, so the remaining player can keep using the code.
Reconnecting starts outside a room and requires joining again. Restarting the
server clears all rooms. Movement and combat remain local and unsynchronized.

`tests/rooms-browser.cjs`, run by `npm run test:browser`, checks the lobby controls,
concurrent joins against the two-player limit, invalid/missing codes, single-room
membership, cross-room isolation including forged destination/identity fields,
and cleanup on leaving/disconnecting.

### Player identity and state

Every connection receives a server-generated UUID in `player:identity` (`{id}`),
even before joining a room. This player ID is separate from the Socket.IO ID and
the local hero's numeric entity ID. It remains unchanged across room joins/leaves
for that connection. Disconnect removes the server's player record; reconnecting
gets a new ID. These are session identities, not persistent accounts.

The server tracks connected players and each room's players in maps keyed by
player ID. `room:message.senderId` is now the server-assigned player ID. Clients
cannot choose or override it through request payloads.

`modules/multiplayer.js` holds the shared client `multiplayer` registry, also
exported from `modules/state.js`. Its `players` map contains records shaped as
`{id, isLocal, name, selectedCharacter, spawnPosition}`, with `localPlayerId` explicitly identifying this client. Each
client sees itself as local and its room peer as remote. Outside a room, only
the local identity remains; disconnect clears everything. Room updates remove
departed peers and replace roster records with the latest server snapshot.

`network.js` exposes `getLocalPlayerId()`, `getLocalPlayer()`,
`getRemotePlayers()`, and `getPlayers()` (a map snapshot). Records are read-only,
and callers cannot mutate membership through returned snapshots. The lobby labels
“You (local player)” and “Remote player,” plus their names and selected characters.
The existing `player` and `hero` remain local gameplay objects with their original
movement, controls, and save behavior. Remote characters render from spawn records.

Browser checks cover unique identities across five connections, both peers'
local/remote perspectives, room isolation, read-only snapshots, peer removal,
and fresh identity/empty peer state after reconnecting.

### Shared player spawning

Create or join a room, enter a name, and choose a character on each client. The
first ready player stays in the lobby until both have selected a character.
`multiplayer-game.js` connects character selection to `network.readyPlayer(profile)`
and applies each server `spawnId` once. Solo character selection still starts
immediately. The bridge is separate from gameplay systems and their unit harness.

The server handles `player:ready` only for room members, normalizes names to 18
characters, and validates character IDs against `character-options.json`. IDs and
spawn positions cannot be supplied by clients. Once both players are ready, the
server publishes one roster with `worldId: 'village'`, a new `spawnId`, and two
distinct spawn positions on open ground beside the village shooting range.
Both clients activate the existing village world and position their own hero from
that roster. A repeated ready request does not create a new spawn or teleport
players. Character changes after spawning require leaving the room first.

The renderer draws remote players using their selected character at the assigned
spawn position, with name/character labels. The local character is labeled “You.”
Remote records are never passed into local movement/combat updates. Remote
characters disappear on leaving/disconnecting and are hidden outside the village.
If a replacement player joins and becomes ready, both current room members get a
new shared spawn. Movement, actions, combat, and world travel are not replicated.

`tests/spawn-browser.cjs` opens two actual game tabs, chooses different names and
characters, and checks identical rosters/world IDs, distinct positions, local
hero coordinates, nameplates, and canvas sprite drawing on both clients. It also
checks invalid character rejection, waiting for readiness, forged spawn fields,
duplicate readiness without teleporting, and peer cleanup.

### Remaining gameplay work

- Simulation and UI remain coupled: damage, rewards, equipment and world transitions update DOM and local effects directly. Separate authoritative state changes from presentation events.
- State is still a single local world. Player/hero references, shared collections and local storage need session/player ownership before supporting multiple players.
- Combat, vehicles, buildings and world transitions still call one another through the registry. Narrow these interfaces into explicit actions and events before networking them.
- Friendly and enemy units intentionally retain the same movement/attack routine. Selection uses entity IDs, while some targeting retains object references; network replication will need consistent identity and lifecycle handling.
- Randomness, frame timing, input actions, purchases and rewards remain client-driven. Decide authority and synchronization rules before networking gameplay; the networking foundation does not change them.
