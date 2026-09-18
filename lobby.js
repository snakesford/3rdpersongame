import { createRoom, joinRoom, leaveRoom, getRoom, isConnected, on } from './network.js';

const createButton = document.getElementById('createGameBtn');
const joinButton = document.getElementById('joinGameBtn');
const leaveButton = document.getElementById('leaveGameBtn');
const form = document.getElementById('joinGameForm');
const codeInput = document.getElementById('roomCodeInput');
const status = document.getElementById('roomStatus');
let busy = false;

function render(message) {
  const room = getRoom();
  const connected = isConnected();
  createButton.disabled = joinButton.disabled = codeInput.disabled = busy || !connected || !!room;
  leaveButton.disabled = busy || !connected;
  leaveButton.hidden = !room;
  status.textContent = message || (!connected ? 'Connecting to server…' : room
    ? `Room ${room.code} · ${room.players.length}/${room.capacity} players${room.players.length === 1 ? ' · Share your code with a friend.' : ' · Both players connected.'}`
    : 'Create a game or enter a friend’s room code.');
}

async function act(action) {
  if (busy) return;
  busy = true;
  render();
  let errorMessage;
  try { await action(); } catch (error) { errorMessage = error.message; }
  finally { busy = false; render(errorMessage); }
}

createButton.addEventListener('click', () => act(createRoom));
leaveButton.addEventListener('click', () => act(leaveRoom));
form.addEventListener('submit', event => {
  event.preventDefault();
  act(() => joinRoom(codeInput.value));
});
on('room:state', () => render());
on('connect', () => render());
on('disconnect', () => render('Disconnected. Rejoin using your code once connected.'));
on('connect_error', () => render('Server unavailable. Retrying…'));
render();
