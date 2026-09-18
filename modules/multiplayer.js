// Room roster and spawn state. Movement and gameplay still use the local player
// and hero in state.js. No remote record aliases those gameplay objects.
export function createPlayerRegistry() {
  let localPlayerId = null;
  const players = new Map();
  const motion = new Map();

  function getRenderState(id, now = Date.now()) {
    const sample = motion.get(id);
    const target = players.get(id)?.movement;
    if (!sample || !target) return null;
    const amount = Math.min(1, Math.max(0, (now - sample.at) / 80));
    const angleDelta = Math.atan2(Math.sin(target.facingAngle - sample.from.facingAngle), Math.cos(target.facingAngle - sample.from.facingAngle));
    const isMoving = target.isMoving && now - sample.at < 1000;
    return { ...target,
      x: sample.from.x + (target.x - sample.from.x) * amount,
      y: sample.from.y + (target.y - sample.from.y) * amount,
      facingAngle: sample.from.facingAngle + angleDelta * amount,
      isMoving, runAnimationTimer: isMoving ? (now - sample.startedAt) / 1000 : 0,
    };
  }

  function applyMovement(update, now = Date.now()) {
    const record = players.get(update.id);
    if (!record || record.isLocal || !record.spawnPosition) return false;
    const old = record.movement;
    if (old && (update.spawnId !== old.spawnId || update.sequence <= old.sequence)) return false;
    const current = getRenderState(update.id, now) || update;
    const snap = current.worldId !== update.worldId || Math.hypot(current.x - update.x, current.y - update.y) > 300;
    const prior = motion.get(update.id);
    motion.set(update.id, {from: snap ? update : current, at: now,
      startedAt: old?.isMoving && update.isMoving ? prior?.startedAt ?? now : now});
    players.set(update.id, Object.freeze({...record, movement: Object.freeze({...update})}));
    return true;
  }

  function setRoomPlayers(roster = []) {
    const ids = new Set(roster.map(player => player.id));
    if (localPlayerId) ids.add(localPlayerId);
    for (const id of players.keys()) {
      if (!ids.has(id)) { players.delete(id); motion.delete(id); }
    }
    for (const id of ids) {
      const record = roster.find(player => player.id === id);
      const old = players.get(id)?.movement;
      const incoming = record?.movement;
      const movement = old && incoming?.spawnId === old.spawnId && old.sequence > incoming.sequence ? old : incoming;
      if (!movement) motion.delete(id);
      else if (!old || old.spawnId !== movement.spawnId) {
        motion.set(id, {from: movement, at: Date.now(), startedAt: Date.now()});
      }
      players.set(id, Object.freeze({ id, isLocal: id === localPlayerId,
        name: record?.name || '', selectedCharacter: record?.selectedCharacter || null,
        spawnPosition: record?.spawnPosition ? Object.freeze({ ...record.spawnPosition }) : null,
        movement: movement ? Object.freeze({...movement}) : null,
      }));
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
      motion.clear();
      localPlayerId = id;
      setRoomPlayers();
    },
    setRoomPlayers,
    applyMovement,
    getRenderState,
    reset() {
      localPlayerId = null;
      players.clear();
      motion.clear();
    },
  };
}

export const multiplayer = createPlayerRegistry();

export function getPlayerWorldId(player) {
  return player.inDodgeArena ? 'arena' : player.inVillageWorld ? 'village'
    : player.inTutorialWorld ? 'tutorial' : player.inWaveWorld ? 'waves' : 'main';
}
