import { io } from "/socket.io/socket.io.esm.min.js";
import { multiplayer } from "./modules/multiplayer.js";

// One same-origin connection, independent of game state and the frame loop.
const socket = io({ autoConnect: false });
let room = null;
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
