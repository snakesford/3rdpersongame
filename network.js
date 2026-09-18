import { io } from "/socket.io/socket.io.esm.min.js";
import { multiplayer } from "./modules/multiplayer.js";

// One same-origin connection, independent of game state and the frame loop.
const socket = io({ autoConnect: false });
let room = null;
let actionSpawn = null;
let actionSequence = 0;
let lastActionSentAt = -Infinity;
let lastActions = '';
socket.on('player:actions', actions => {
  if (room?.spawnId === actions.spawnId) multiplayer.applyActions(actions);
});
let movementSequence = 0;
let movementSpawn = null;
let lastMovementSentAt = -Infinity;
let lastMovement = '';
socket.on('player:movement', movement => {
  if (room?.spawnId === movement.spawnId) multiplayer.applyMovement(movement);
});
socket.on("player:identity", ({ id }) => {
  multiplayer.setIdentity(id);
  multiplayer.setRoomPlayers(room?.players);
});
socket.on("room:state", state => {
  room = state;
  multiplayer.setRoomPlayers(state?.players);
});
socket.on("disconnect", () => {
  room = null;
  multiplayer.reset();
});

export const getLocalPlayerId = () => multiplayer.localPlayerId;
export const getLocalPlayer = () => multiplayer.getLocalPlayer();
export const getRemotePlayers = () => multiplayer.getRemotePlayers();
export const getPlayers = () => multiplayer.players;

export function getRoom() {
  return room ? { ...room, players: room.players.map(player => ({ ...player,
    spawnPosition: player.spawnPosition ? { ...player.spawnPosition } : null,
    movement: player.movement ? { ...player.movement } : null,
    actions: player.actions ? structuredClone(player.actions) : null,
  })) } : null;
}

function request(event, payload = null) {
  if (!socket.connected) return Promise.reject(new Error("Not connected to the server."));
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error, result) => {
      if (error) return reject(new Error("Server did not respond. Please reconnect and try again."));
      if (!result?.ok) return reject(new Error(result?.error || "Room request failed."));
      resolve(result);
    });
  });
}

export const createRoom = () => request("room:create");
export const joinRoom = code => request("room:join", { code });
export const leaveRoom = () => request("room:leave");
export const sendRoomMessage = data => request("room:message", data);
export const readyPlayer = profile => request("player:ready", profile);

// Called after local simulation. Never queue obsolete positions while offline.
export function sendMovement(state, now = performance.now()) {
  if (!socket.connected || !room?.spawnId || !getLocalPlayer()?.spawnPosition) return false;
  if (movementSpawn !== room.spawnId) {
    movementSpawn = room.spawnId;
    movementSequence = 0;
    lastMovementSentAt = -Infinity;
    lastMovement = '';
  }
  if (now - lastMovementSentAt < 50) return false;
  const {x, y, worldId, facingAngle, lastMoveAngle, isMoving, onFoot} = state;
  const movement = {x, y, worldId, facingAngle, lastMoveAngle, isMoving, onFoot};
  const serialized = JSON.stringify(movement);
  // Repeat stationary state so a dropped stop packet repairs itself.
  if (serialized === lastMovement && now - lastMovementSentAt < 250) return false;
  socket.volatile.emit('player:movement', {...movement, spawnId: room.spawnId, sequence: ++movementSequence});
  lastMovement = serialized;
  lastMovementSentAt = now;
  return true;
}

export function sendActions(state, now = performance.now()) {
  if (!socket.connected || !room?.spawnId || !getLocalPlayer()?.spawnPosition) return false;
  if (actionSpawn !== room.spawnId) {
    actionSpawn = room.spawnId;
    actionSequence = 0;
    lastActionSentAt = -Infinity;
    lastActions = '';
  }
  const serialized = JSON.stringify(state);
  if (serialized === lastActions && now - lastActionSentAt < 250) return false;
  // Send changes immediately, including effects shorter than a movement tick.
  socket.emit('player:actions', {...state, spawnId: room.spawnId, sequence: ++actionSequence});
  lastActions = serialized;
  lastActionSentAt = now;
  return true;
}

export function connect() {
  socket.connect();
}

export function disconnect() {
  socket.disconnect();
}

export function isConnected() {
  return socket.connected;
}

export function getSocketId() {
  return socket.id;
}

// Do not queue stale events while offline. Callers can check the return value.
export function send(event, ...args) {
  if (!socket.connected) return false;
  socket.emit(event, ...args);
  return true;
}

// Also accepts lifecycle events: connect, disconnect, and connect_error.
export function on(event, handler) {
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

window.addEventListener("pagehide", disconnect);
window.addEventListener("pageshow", connect);
connect();
