const { randomInt, randomUUID } = require('node:crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const channel = code => `game:${code}`;
const { createCombat } = require('./multiplayer-combat.cjs');
const { sanitizeActions } = require('./action-protocol.cjs');
const characters = require('./character-options.json');
// Open ground beside the village shooting range, matching VILLAGE_WORLD.
const spawnPositions = [{ x: 1810, y: 1250 }, { x: 1970, y: 1250 }];

function attachRooms(io) {
  // Membership is owned by the server, never supplied by message senders.
  const rooms = new Map();
  const players = new Map();
  const motionBudgets = new Map();
  const snapshot = room => ({ code: room.code, worldId: 'village', spawnId: room.spawnId,
    players: [...room.players.values()], capacity: 2, combat: room.combat?.snapshot() || null });
  const publish = room => io.to(channel(room.code)).emit('room:state', snapshot(room));

  const broadcastCombat = room => io.to(channel(room.code)).emit('combat:state', room.combat.snapshot());
  const timer = setInterval(() => {
    for (const room of rooms.values()) if (room.combat) {
      room.combat.advance(performance.now());
      broadcastCombat(room);
    }
  }, 50);
  timer.unref();
  io.httpServer?.once('close', () => clearInterval(timer));

  io.on('connection', socket => {
    const player = { id: randomUUID(), name: '', selectedCharacter: null, spawnPosition: null };
    players.set(player.id, player);
    socket.data.playerId = player.id;
    socket.emit('player:identity', { id: player.id });
    const reply = (ack, value) => { if (typeof ack === 'function') ack(value); };
    const fail = (ack, error) => reply(ack, { ok: false, error });
    function enter(room, ack) {
      // Synchronous with the default in-memory adapter: no gap between capacity
      // checks and membership changes, even when two players join together.
      room.players.set(player.id, player);
      socket.data.roomCode = room.code;
      socket.join(channel(room.code));
      publish(room);
      reply(ack, { ok: true, room: snapshot(room) });
    }
    function leave() {
      const code = socket.data.roomCode;
      const room = rooms.get(code);
      delete socket.data.roomCode;
      if (!room) return;
      socket.leave(channel(code));
      room.players.delete(player.id);
      room.combat?.remove(player.id);
      motionBudgets.delete(player.id);
      player.name = '';
      player.selectedCharacter = null;
      player.spawnPosition = null;
      player.movement = null;
      player.actions = null;
      if (room.players.size === 0) rooms.delete(code);
      else publish(room);
    }

    socket.on('room:create', (_payload, ack) => {
      if (socket.data.roomCode) return fail(ack, 'Leave your current game first.');
      let code;
      do {
        code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      } while (rooms.has(code));
      const room = { code, players: new Map(), spawnId: null };
      rooms.set(code, room);
      enter(room, ack);
    });
    socket.on('room:join', (payload, ack) => {
      if (socket.data.roomCode) return fail(ack, 'Leave your current game first.');
      const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return fail(ack, 'Enter a valid 6-character room code.');
      const room = rooms.get(code);
      if (!room) return fail(ack, 'Game not found. Check the room code.');
      if (room.players.size >= 2) return fail(ack, 'This game is full (2 players).');
      enter(room, ack);
    });
    socket.on('room:leave', (_payload, ack) => {
      leave();
      socket.emit('room:state', null);
      reply(ack, { ok: true });
    });
    socket.on('player:ready', (payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) return fail(ack, 'Join a game first.');
      const name = typeof payload?.name === 'string' ? payload.name.replace(/\s+/g, ' ').trim().slice(0, 18) : '';
      const selectedCharacter = payload?.selectedCharacter;
      if (!name || typeof selectedCharacter !== 'string' || !Object.hasOwn(characters, selectedCharacter)) {
        return fail(ack, 'Choose a name and a valid character.');
      }
      if (player.spawnPosition && (name !== player.name || selectedCharacter !== player.selectedCharacter)) {
        return fail(ack, 'Leave the game before changing your character.');
      }
      player.name = name;
      player.selectedCharacter = selectedCharacter;
      if (room.players.size === 2 && [...room.players.values()].every(p => p.selectedCharacter) &&
          [...room.players.values()].some(p => !p.spawnPosition)) {
        room.spawnId = randomUUID();
        [...room.players.values()].forEach((p, index) => {
          p.spawnPosition = { ...spawnPositions[index] };
          p.actions = null;
          motionBudgets.set(p.id, {at:performance.now(), budget:80});
          p.movement = { ...p.spawnPosition, worldId: 'village', facingAngle: 0,
            lastMoveAngle: null, isMoving: false, onFoot: true, sequence: 0, spawnId: room.spawnId };
        });
        room.combat = createCombat(room);
      }
      publish(room);
      reply(ack, { ok: true, room: snapshot(room) });
    });
    socket.on('player:movement', (payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || !player.spawnPosition || !payload || payload.spawnId !== room.spawnId) {
        return fail(ack, 'Movement requires the current room spawn.');
      }
      if (room.combat?.isDead(player.id)) return fail(ack, 'Dead players cannot move.');
      const { x, y, worldId, facingAngle, lastMoveAngle, isMoving, onFoot, sequence } = payload;
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 2400 || y < 0 || y > 2800 ||
          !['village', 'main', 'tutorial', 'waves', 'arena'].includes(worldId) ||
          !Number.isFinite(facingAngle) || Math.abs(facingAngle) > Math.PI * 2 ||
          !(lastMoveAngle === null || (Number.isFinite(lastMoveAngle) && Math.abs(lastMoveAngle) <= Math.PI * 2)) ||
          typeof isMoving !== 'boolean' || typeof onFoot !== 'boolean' ||
          !Number.isSafeInteger(sequence) || sequence <= (player.movement?.sequence ?? 0)) {
        return fail(ack, 'Invalid or stale movement.');
      }
      if (room.combat) {
        if (worldId !== player.movement.worldId || !onFoot) return fail(ack, 'Multiplayer combat is on foot in the room world.');
        const motion = motionBudgets.get(player.id), now = performance.now();
        const speed = Math.max(680, characters[player.selectedCharacter].agility * 3);
        motion.budget = Math.min(150, motion.budget + (now - motion.at) / 1000 * speed);
        motion.at = now;
        const distance = Math.hypot(x-player.movement.x, y-player.movement.y);
        if (distance > motion.budget) return fail(ack, 'Movement is too fast.');
        motion.budget -= distance;
      }
      // Only movement fields are relayed; identity, room, and combat fields are ignored.
      player.movement = { x, y, worldId, facingAngle, lastMoveAngle, isMoving, onFoot, sequence, spawnId: room.spawnId };
      socket.to(channel(room.code)).volatile.emit('player:movement', { id: player.id, ...player.movement });
      reply(ack, { ok: true });
    });
    socket.on('combat:action', (payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room?.combat) return fail(ack, 'Combat requires a spawned room.');
      const result = room.combat.act(player.id, payload, performance.now());
      // Send corrections on rejection too; clients cannot refill ammo or clear cooldowns.
      broadcastCombat(room);
      reply(ack, result);
    });
    socket.on('player:actions', (payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || !player.spawnPosition || payload?.spawnId !== room.spawnId ||
          !Number.isSafeInteger(payload.sequence) || payload.sequence <= (player.actions?.sequence ?? 0)) {
        return fail(ack, 'Actions require a current spawn and fresh sequence.');
      }
      let visual;
      try { visual = sanitizeActions(payload); }
      catch { return fail(ack, 'Invalid character actions.'); }
      if (room.combat) {
        visual.projectiles = []; visual.grenades = []; visual.shockwaves = []; visual.deployables = [];
        visual.abilityEffect = null; visual.markTarget = null;
        visual.rifleShooting = false; visual.bowShooting = false;
        visual.rifleShotAnimationTimer = 0; visual.isReloading = false;
      }
      player.actions = {...visual, spawnId: room.spawnId, sequence: payload.sequence};
      // Reliable delivery preserves short shots/abilities and their stop transitions.
      socket.to(channel(room.code)).emit('player:actions', {id: player.id, ...player.actions});
      reply(ack, {ok: true});
    });
    socket.on('room:message', (payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || !room.players.has(player.id)) return fail(ack, 'Join a game first.');
      // Fixed event name and server-derived destination/identity prevent clients
      // from targeting another room or impersonating room lifecycle events.
      socket.to(channel(room.code)).emit('room:message', {
        senderId: player.id, data: payload,
      });
      reply(ack, { ok: true });
    });
    socket.on('disconnecting', leave);
    socket.on('disconnect', () => players.delete(player.id));
  });
}

module.exports = { attachRooms };
