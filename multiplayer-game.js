import { getRoom, getLocalPlayer, readyPlayer, sendMovement, sendActions, on } from './network.js';
import { getCharacterActions, getSelectedPlayerProfile, onCharacterSelected, onGameFrame, spawnMultiplayerPlayer } from './game.js';
import { characterSelectEl } from './modules/dom.js';
import { hero, player } from './modules/state.js';
import { getPlayerWorldId } from './modules/multiplayer.js';

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
onGameFrame(timestamp => {
  if (!appliedSpawn) return;
  // Emit volatile movement before reliable actions so the write buffer does not drop it.
  sendMovement({ x: hero.x, y: hero.y, worldId: getPlayerWorldId(player),
    facingAngle: hero.facingAngle ?? 0, lastMoveAngle: hero.lastMoveAngle,
    isMoving: hero.isMoving && !player.inventoryOpen && !player.victory && !player.loss,
    onFoot: hero.vehicleId === null,
  }, timestamp);
  sendActions(getCharacterActions(), timestamp);
});
sync();
