import { getRoom, getLocalPlayer, readyPlayer, on } from './network.js';
import { getSelectedPlayerProfile, onCharacterSelected, spawnMultiplayerPlayer } from './game.js';
import { characterSelectEl } from './modules/dom.js';

let submittedProfile = null;
let appliedSpawn = null;

function sync() {
  const room = getRoom();
  if (!room) { submittedProfile = null; appliedSpawn = null; return; }
  const profile = getSelectedPlayerProfile();
  if (!profile) return;
  const key = JSON.stringify([room.code, profile]);
  if (submittedProfile !== key) {
    submittedProfile = key;
    readyPlayer(profile).catch(error => {
      if (submittedProfile === key) {
        submittedProfile = null;
        document.getElementById('roomStatus').textContent = error.message;
      }
    });
  }
  const local = getLocalPlayer();
  if (room.spawnId && local?.spawnPosition) {
    if (appliedSpawn !== room.spawnId) {
      appliedSpawn = room.spawnId;
      spawnMultiplayerPlayer(local);
    }
  } else {
    characterSelectEl.classList.remove('hidden');
  }
}

onCharacterSelected(sync);
on('room:state', sync);
on('disconnect', sync);
sync();
