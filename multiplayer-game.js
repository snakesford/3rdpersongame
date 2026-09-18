import { combatSession } from './modules/combat-session.js';
import { getRoom, getLocalPlayer, readyPlayer, sendMovement, sendActions, sendCombatAction, on } from './network.js';
import { getCharacterActions, getSelectedPlayerProfile, onCharacterSelected, onGameFrame, spawnMultiplayerPlayer, applyCombatPlayer, clearLocalCombatEffects, showCombatHit } from './game.js';
import { characterSelectEl } from './modules/dom.js';
import { hero, player, buildings } from './modules/state.js';
import { getPlayerWorldId } from './modules/multiplayer.js';

let submittedProfile = null;
let appliedSpawn = null;
let savedHero = null;
let savedInventory = null;
let lastEventId = 0;
let savedVehicles = [];
function applyCombat() {
  const state = combatSession.player(getLocalPlayer()?.id);
  if (!combatSession.active || !state) return;
  const elapsed = Math.max(0, (Date.now() - combatSession.receivedAt) / 1000);
  const visual = {...state};
  const oldVehicleId=hero.vehicleId, worldId=getPlayerWorldId(player);
  // Keep local driving responsive; all other vehicle fields come from the server.
  const localVehicle=buildings.find(v=>v.id===state.vehicleId);
  const predicted=oldVehicleId===state.vehicleId && localVehicle ? {x:localVehicle.x,y:localVehicle.y,driveAngle:localVehicle.driveAngle,facingLeft:localVehicle.facingLeft} : null;
  const vehicles=combatSession.snapshot.vehicles || [];
  for(let i=buildings.length-1;i>=0;i--) if(buildings[i].type==='humvee' &&
    !vehicles.some(v=>v.id===buildings[i].id && (v.worldId===worldId || v.id===state.vehicleId))) buildings.splice(i,1);
  for(const data of vehicles) {
    if(data.worldId!==worldId && data.id!==state.vehicleId) continue;
    let vehicle=buildings.find(v=>v.id===data.id);
    if(!vehicle) {vehicle={}; buildings.push(vehicle);}
    Object.assign(vehicle,data,{weaponAmmo:{...data.weaponAmmo},gunCooldown:Math.max(0,data.gunCooldown-elapsed),smartMissileCooldown:Math.max(0,data.smartMissileCooldown-elapsed)});
    if(data.id===state.vehicleId && predicted && (data.worldId!==worldId || Math.hypot(predicted.x-data.x,predicted.y-data.y)<=150)) Object.assign(vehicle,predicted);
    if(data.id===state.vehicleId) {hero.x=vehicle.x+vehicle.w/2;hero.y=vehicle.y+vehicle.h/2;}
  }
  if(oldVehicleId && !state.vehicleId && state.vehicleExitPosition) Object.assign(hero,state.vehicleExitPosition);
  delete visual.vehicleExitPosition;
  for (const key of Object.keys(visual)) {
    if (/Timer$|Cooldown$|CooldownRemaining$/.test(key)) visual[key] = Math.max(0, visual[key] - elapsed);
  }
  player.backpack = (state.backpack || []).map(item=>({...item}));
  player.tutorialPathsUnlocked = !!state.tutorialPathsUnlocked;
  player.bonusDamage = state.bonusDamage || 0;
  visual.latestPickup = state.equippedHelmetType ? {type:state.equippedHelmetType,armorValue:state.equippedArmorValue,radius:18} : null;
  delete visual.backpack; delete visual.tutorialPathsUnlocked; delete visual.bonusDamage;
  delete visual.id; delete visual.sequence; delete visual.markId;
  applyCombatPlayer(visual);
  for (const event of combatSession.snapshot.events) {
    if (event.id <= lastEventId) continue;
    lastEventId = event.id;
    if (event.type === 'hit') showCombatHit(event);
  }
}
function endCombat() {
  if (combatSession.active) {
    for(let i=buildings.length-1;i>=0;i--) if(buildings[i].type==='humvee') buildings.splice(i,1);
    if(player.inVillageWorld) buildings.push(...savedVehicles);
    savedVehicles=[];
  }
  if (savedHero) {
    const {x, y} = hero;
    Object.assign(hero, savedHero, {x, y});
    savedHero = null;
  }
  if(savedInventory) { Object.assign(player,savedInventory); savedInventory=null; }
  combatSession.clear(); lastEventId = 0;
}

function sync() {
  const room = getRoom();
  if (!room) { endCombat(); submittedProfile = null; appliedSpawn = null; return; }
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
      if (!savedHero) {
        savedHero = structuredClone(hero);
        savedInventory = {backpack:structuredClone(player.backpack),tutorialPathsUnlocked:player.tutorialPathsUnlocked,bonusDamage:player.bonusDamage};
      }
      appliedSpawn = room.spawnId;
      lastEventId = 0;
      combatSession.active = true;
      combatSession.send = sendCombatAction;
      spawnMultiplayerPlayer(local);
      savedVehicles=buildings.filter(v=>v.type==='humvee').map(v=>structuredClone(v));
      clearLocalCombatEffects();
      applyCombat();
    }
  } else {
    characterSelectEl.classList.remove('hidden');
  }
}

onCharacterSelected(sync);
on('room:state', sync);
on('disconnect', sync);
on('combat:state', applyCombat);
onGameFrame(timestamp => {
  if (!appliedSpawn) return;
  applyCombat();
  // Emit volatile movement before reliable actions so the write buffer does not drop it.
  sendMovement({ x: hero.x, y: hero.y, worldId: getPlayerWorldId(player),
    facingAngle: hero.facingAngle ?? 0, lastMoveAngle: hero.lastMoveAngle,
    isMoving: hero.isMoving && !player.inventoryOpen && !player.victory && !player.loss,
    onFoot: hero.vehicleId === null,
  }, timestamp);
  sendActions(getCharacterActions(), timestamp);
});
sync();
