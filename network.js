import { io } from "/socket.io/socket.io.esm.min.js";

// One same-origin connection, independent of game state and the frame loop.
const socket = io({ autoConnect: false });

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
