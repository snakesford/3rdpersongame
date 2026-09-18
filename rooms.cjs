const { randomInt } = require('node:crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const channel = code => `game:${code}`;

function attachRooms(io) {
  // Membership is owned by the server, never supplied by message senders.
  const rooms = new Map();
  const snapshot = room => ({ code: room.code, players: [...room.players], capacity: 2 });
  const publish = room => io.to(channel(room.code)).emit('room:state', snapshot(room));

  io.on('connection', socket => {
    const reply = (ack, value) => { if (typeof ack === 'function') ack(value); };
    const fail = (ack, error) => reply(ack, { ok: false, error });
    function enter(room, ack) {
      // Synchronous with the default in-memory adapter: no gap between capacity
      // checks and membership changes, even when two players join together.
      room.players.add(socket.id);
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
      room.players.delete(socket.id);
      if (room.players.size === 0) rooms.delete(code);
      else publish(room);
    }

    socket.on('room:create', (_payload, ack) => {
      if (socket.data.roomCode) return fail(ack, 'Leave your current game first.');
      let code;
      do {
        code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      } while (rooms.has(code));
      const room = { code, players: new Set() };
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
    socket.on('room:message', (payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || !room.players.has(socket.id)) return fail(ack, 'Join a game first.');
      // Fixed event name and server-derived destination/identity prevent clients
      // from targeting another room or impersonating room lifecycle events.
      socket.to(channel(room.code)).emit('room:message', {
        senderId: socket.id, data: payload,
      });
      reply(ack, { ok: true });
    });
    socket.on('disconnecting', leave);
  });
}

module.exports = { attachRooms };
