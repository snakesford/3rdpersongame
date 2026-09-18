// Identity/roster state only. Movement and gameplay still use the local player
// and hero in state.js. No remote record aliases those gameplay objects.
export function createPlayerRegistry() {
  let localPlayerId = null;
  const players = new Map();

  function setRoomPlayers(roster = []) {
    const ids = new Set(roster.map(player => player.id));
    if (localPlayerId) ids.add(localPlayerId);
    for (const id of players.keys()) {
      if (!ids.has(id)) players.delete(id);
    }
    for (const id of ids) {
      if (!players.has(id)) players.set(id, Object.freeze({ id, isLocal: id === localPlayerId }));
    }
  }

  return {
    get localPlayerId() { return localPlayerId; },
    // Return a copy so callers cannot alter membership owned by networking.
    get players() { return new Map(players); },
    getLocalPlayer: () => players.get(localPlayerId) || null,
    getRemotePlayers: () => [...players.values()].filter(player => !player.isLocal),
    setIdentity(id) {
      players.clear();
      localPlayerId = id;
      setRoomPlayers();
    },
    setRoomPlayers,
    reset() {
      localPlayerId = null;
      players.clear();
    },
  };
}

export const multiplayer = createPlayerRegistry();
