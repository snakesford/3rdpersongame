import { createGameSystems } from "./modules/systems.js";
import {
  buildings,
  enemies,
  engineerDeployables,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  player,
  runtime,
  units,
} from "./modules/state.js";
import { registerPlayerInputs } from "./inputs.js";
import { PLAYER_NAME_STORAGE_KEY } from "./modules/constants.js";
import {
  characterSelectEl,
  classGridEl,
  classStepEl,
  confirmPlayerNameBtn,
  nameStepEl,
  playerNameInputEl,
  playerPortraitNameEl,
  statusTextEl,
} from "./modules/dom.js";

let lastTimestamp = 0;
const characterSelectionListeners = new Set();
export function onCharacterSelected(listener) {
  characterSelectionListeners.add(listener);
  return () => characterSelectionListeners.delete(listener);
}
export function getSelectedPlayerProfile() {
  return player.hasSelectedCharacter ? { name: player.displayName, selectedCharacter: hero.selectedClass } : null;
}
export function spawnMultiplayerPlayer(record) {
  activateVillageWorld();
  hero.x = record.spawnPosition.x;
  hero.y = record.spawnPosition.y;
  updateCamera(1);
  characterSelectEl.classList.add('hidden');
}
const systems = createGameSystems({ getFrameTimestamp: () => lastTimestamp });
const {
  activateVillageWorld,
  awardMercenaryRankRewards,
  cancelGrenadeAim,
  cleanupDeathZoneEntities,
  cleanupDefeatedEnemies,
  cleanupDestroyedBuildings,
  clearEngineerDeployables,
  closeShop,
  closeTrader,
  getAbilityDamage,
  getHeroSpeed,
  initializeCanvas,
  isHeroNearShop,
  isHeroNearTrader,
  registerBuildingControls,
  registerInventoryControls,
  registerNpcControls,
  registerProgressionPersistence,
  registerShopControls,
  registerUpgradeControls,
  registerVehicleInventoryControls,
  render,
  restoreCharacterProgress,
  saveCharacterProgress,
  syncWeaponDerivedStats,
  updateAbilityUI,
  updateBuildBarracksButton,
  updateCamera,
  updateDamagePopups,
  updateDialogueUI,
  updateDodgeArena,
  updateEnemyProjectiles,
  updateEngineerDeployables,
  updateForestSystems,
  updateGrenades,
  updateHero,
  updateHeroProjectiles,
  updateHumveeExhaust,
  updateHumveeRockTilt,
  updateHumveeTech,
  updateInventoryUI,
  updateQuestUI,
  updateShopUI,
  updateSparkEffects,
  updateStatsUI,
  updateTraderUI,
  updateTrainButton,
  updateTrainingAmmoStockpile,
  updateTrainingDriver,
  updateUnits,
  updateWaveMode,
  updateXpUI,
} = systems;


registerInventoryControls();

function sanitizePlayerName(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 18);
}

function savePlayerName(name) {
  localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
}

function loadSavedPlayerName() {
  return sanitizePlayerName(localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "");
}

function confirmPlayerName() {
  const submittedName = sanitizePlayerName(playerNameInputEl.value);
  if (!submittedName) {
    playerNameInputEl.focus();
    statusTextEl.textContent = "Enter a player name before choosing a hero.";
    return;
  }

  player.displayName = submittedName;
  playerPortraitNameEl.textContent = player.displayName;
  savePlayerName(submittedName);
  nameStepEl.classList.add("hidden");
  classStepEl.classList.remove("hidden");
  statusTextEl.textContent = `Welcome, ${player.displayName}. Choose your hero.`;
}

// Keep gameplay coordinates in CSS pixels while rendering at display resolution.

initializeCanvas();

registerVehicleInventoryControls();

registerUpgradeControls();

function update(dt) {
  if (player.inventoryOpen) return;
  if (!player.hasSelectedCharacter || player.victory || player.loss) {
    return;
  }
  updateCamera(dt);
  updateHero(dt);
  updateTrainingAmmoStockpile();
  updateTrainingDriver(dt);
  updateHumveeRockTilt(dt);
  updateHumveeExhaust(dt);
  updateHumveeTech(dt);
  updateGrenades(dt);
  if (!player.inTutorialWorld && !player.inVillageWorld && !player.inWaveWorld) {
    updateDodgeArena(dt);
  }
  updateEngineerDeployables(dt);
  updateHeroProjectiles(dt);
  updateEnemyProjectiles(dt);
  updateUnits(dt, units, enemies, buildings.filter((b) => !b.isPlayer));
  updateUnits(dt, enemies, [hero, ...units, ...engineerDeployables.filter(d => d.kind === "autoTurret" && d.hp > 0)], buildings.filter((b) => b.isPlayer));
  if (!player.inTutorialWorld && !player.inVillageWorld && !player.inWaveWorld) {
    updateForestSystems(dt);
    cleanupDeathZoneEntities();
  }
  updateDamagePopups(dt);
  updateSparkEffects(dt);
  cleanupDefeatedEnemies();
  updateWaveMode(dt);
  cleanupDestroyedBuildings();
  updateTrainButton();
  updateBuildBarracksButton();
  if (player.shopOpen && !isHeroNearShop()) {
    closeShop();
  }
  if (player.traderOpen && !isHeroNearTrader()) {
    closeTrader();
  }
  updateXpUI();
  updateShopUI();
  updateTraderUI();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0, 0.05);
  lastTimestamp = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

registerNpcControls();

registerPlayerInputs(systems);

registerBuildingControls();

registerShopControls();

function selectCharacter(classId) {
  const selectedClass = runtime.CHARACTER_OPTIONS[classId];
  if (!selectedClass || !player.displayName) {
    return;
  }

  saveCharacterProgress();
  clearEngineerDeployables();
  hero.selectedClass = classId;
  hero.slashCooldown = selectedClass.cooldown;
  hero.slashRadius = selectedClass.radius || hero.slashRadius;
  hero.slashHalfAngle = selectedClass.halfAngle || hero.slashHalfAngle;
  hero.slashDamage = getAbilityDamage(selectedClass);
  hero.speed = getHeroSpeed(selectedClass);
  hero.lastMoveAngle = null;
  hero.maxHp = selectedClass.stats.health + player.bonusHealth;
  hero.hp = hero.maxHp;
  hero.regenProgress = 0;
  hero.dashTimer = 0;
  hero.sprintTimer = 0;
  hero.sprintCooldownRemaining = 0;
  hero.dashCooldown = selectedClass.dashCooldown || 0;
  hero.dashCooldownRemaining = 0;
  hero.hasAxe = false;
  hero.axeSwingTimer = 0;
  hero.hasBow = classId === "archer";
  hero.bowCooldown = 0;
  hero.grenadeCooldownRemaining = 0;
  hero.battleMedicineCooldownRemaining = 0;
  hero.battleMedicineBuffTimer = 0;
  hero.adrenalineTimer = 0;
  hero.hunterMarkTimer = 0;
  hero.hunterMarkTargetId = null;
  hero.slashTimer = 0;
  hero.battleMedicineUseTimer = 0;
  hero.weaponPickupCooldown = 0;
  hero.hasRifle = ["soldier", "bountyHunter", "engineer"].includes(classId);
  hero.rifleFireMode = "automatic";
  hero.rifleCooldown = 0;
  hero.rifleShotAnimationTimer = 0;
  syncWeaponDerivedStats();
  hero.ammo = hero.hasRifle ? hero.maxAmmo : 0;
  hero.isReloading = false;
  hero.reloadTimer = 0;
  hero.shootLockTimer = 0;
  cancelGrenadeAim();
  heroProjectiles.length = 0;
  heroGrenades.length = 0;
  grenadeShockwaves.length = 0;
  player.hasSelectedCharacter = true;
  restoreCharacterProgress(classId);
  awardMercenaryRankRewards();
  characterSelectEl.classList.add("hidden");
  statusTextEl.textContent = classId === "soldier"
    ? `${selectedClass.name} selected. Walk near a tree and press E to harvest wood. Press F for Burst Shot and G for Grenade.`
    : `${selectedClass.name} selected. Walk near a tree and press E to harvest wood.`;
  updateQuestUI();
  updateAbilityUI();
  updateStatsUI();
  updateXpUI();
  for (const listener of characterSelectionListeners) listener();
}

async function loadCharacterOptions() {
  if (window.location.protocol === "file:") {
    throw new Error("Open the game through the local HTTP server so character-options.json and enemy-options.json can be fetched.");
  }

  const response = await fetch("./character-options.json");
  if (!response.ok) {
    throw new Error(`Failed to load character options: ${response.status}`);
  }
  runtime.CHARACTER_OPTIONS = await response.json();
}

async function loadEnemyOptions() {
  const response = await fetch("./enemy-options.json");
  if (!response.ok) {
    throw new Error(`Failed to load enemy options: ${response.status}`);
  }
  runtime.ENEMY_OPTIONS = await response.json();
}

function initializeCharacterCards() {
  classGridEl.textContent = "";

  for (const [classId, selectedClass] of Object.entries(runtime.CHARACTER_OPTIONS)) {
    const classCardEl = document.createElement("button");
    classCardEl.className = "class-card";
    classCardEl.dataset.class = classId;
    classCardEl.disabled = false;

    const portraitEl = document.createElement("img");
    portraitEl.className = "class-portrait hidden";
    portraitEl.alt = `${selectedClass.name} portrait`;

    const nameEl = document.createElement("strong");
    nameEl.textContent = selectedClass.name;

    classCardEl.append(portraitEl, nameEl);

    if (selectedClass.abilityName) {
      const abilityEl = document.createElement("span");
      abilityEl.textContent = classId === "engineer" ? "F: Bolt Shot | Q: Repair Station | G: Auto Turret" : classId === "bountyHunter" ? "F: Hunter’s Mark | Q: Adrenaline Shot | G: Explosive Bolt" : classId === "soldier"
        ? `F: ${selectedClass.abilityName} | G: Grenade`
        : `F: ${selectedClass.abilityName}`;
      classCardEl.appendChild(abilityEl);
    }

    if (selectedClass.portrait) {
      portraitEl.src = selectedClass.portrait;
      portraitEl.addEventListener("load", () => {
        portraitEl.classList.remove("hidden");
      });
      portraitEl.addEventListener("error", () => {
        portraitEl.removeAttribute("src");
        portraitEl.classList.add("hidden");
      });
    }

    classCardEl.addEventListener("click", () => {
      selectCharacter(classId);
    });

    classGridEl.appendChild(classCardEl);
  }
}

confirmPlayerNameBtn.addEventListener("click", () => {
  confirmPlayerName();
});

playerNameInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmPlayerName();
  }
});

async function initializeGame() {
  try {
    await loadCharacterOptions();
    await loadEnemyOptions();
    activateVillageWorld();
    initializeCharacterCards();
    updateAbilityUI();
    updateStatsUI();
    updateXpUI();
    updateQuestUI();
    updateInventoryUI();
    updateDialogueUI();
    updateShopUI();
    updateTraderUI();
    updateTrainButton();
    updateBuildBarracksButton();
    const savedPlayerName = loadSavedPlayerName();
    if (savedPlayerName) {
      player.displayName = savedPlayerName;
      playerPortraitNameEl.textContent = player.displayName;
      playerNameInputEl.value = savedPlayerName;
      nameStepEl.classList.add("hidden");
      classStepEl.classList.remove("hidden");
      statusTextEl.textContent = `Welcome back, ${player.displayName}. Choose your hero.`;
    }
    playerNameInputEl.focus();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error(error);
    statusTextEl.textContent = String(error.message || error);
    classGridEl.textContent = "Start the local server with `node server.js`, then open http://127.0.0.1:4173";
  }
}

registerProgressionPersistence();

initializeGame();
