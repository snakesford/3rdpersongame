import { canvas, inventoryTabEls, statusTextEl } from "./modules/dom.js";
import { buildings, enemies, grenadeAim, hero, keys, mouse, player, units } from "./modules/state.js";

const inputState = { selectionBox: null };

function getMovementInput() {
  return {
    dx: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
    dy: (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0),
  };
}

// Register controls once, with game actions supplied by the game module.
function registerPlayerInputs({
  advanceQuestDialogue,
  advanceShootingInstructorDialogue,
  beginTutorialNpcInteraction,
  beginVillagerInteraction,
  cancelGrenadeAim,
  closeQuestDialogue,
  closeShop,
  closeTrader,
  closeTutorialDialogue,
  closeWeaponDetails,
  createBuilding,
  enterHumvee,
  equipPickup,
  exitHumvee,
  fireHumveeGun,
  getBuildingAt,
  getCharacterStatus,
  getCurrentWeaponDetails,
  getNearbyHumvee,
  getNearbyPickup,
  getOccupiedHumvee,
  getOrderedInventoryAbilities,  
  getTutorialNpcById,
  getUnitAt,
  handleTutorialInteraction,
  handleTutorialNpcOption,
  isDialogueOpen,
  isHeroNearShop,
  isHeroNearTrader,
  isInterfacePanelOpen,
  isPlayerBaseSelected,
  isValidBarracksPlacement,
  openShop,
  openTrader,
  screenToWorld,
  selectBuilding,
  selectInventoryTab,
  selectSingleUnit,
  selectUnitsInBox,
  setSelectedUnitsAttackTarget,
  setSelectedUnitsMoveTarget,
  spawnHeroBowShot,
  spawnHeroBullet,
  startBarracksPlacement,
  startGrenadeAim,
  startHarvest,
  startReload,
  toggleHumveeTech,
  toggleInventoryScreen,
  toggleRifleFireMode,
  updateBuildBarracksButton,
  updateDialogueUI,
  updateInventoryUI,
  updateTrainButton,
  useAxeSwing,
  useBattleMedicine,
  useRobotDash,
  useSlash,
  useSmartMissile,
  useSoldierGrenade,
  useSprint,
  getPlayerBase,
  tutorialDialogue,
}) {
  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (event.target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
    keys.add(key);

    if (!player.hasSelectedCharacter) {
      return;
    }

    if (hero.vehicleId !== null && [" ", "h", "b", "x"].includes(key)) return;

    const inventoryTabName = { "1": "equipment", "2": "abilities", "3": "items", "4": getOccupiedHumvee() ? "humvee" : null }[key];
    if (inventoryTabName && !event.ctrlKey && !event.metaKey && !event.altKey &&
        (player.inventoryOpen || !isDialogueOpen())) {
      event.preventDefault();
      keys.delete(key);
      if (event.repeat) return;
      const tab = Array.from(inventoryTabEls).find((entry) => entry.dataset.inventoryTab === inventoryTabName);
      if (player.inventoryOpen && tab.getAttribute("aria-selected") === "true") {
        toggleInventoryScreen();
      } else {
        closeWeaponDetails();
        selectInventoryTab(inventoryTabName);
        if (!player.inventoryOpen) toggleInventoryScreen();
        tab.focus();
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      if (!event.repeat) toggleInventoryScreen();
      return;
    }
    if (player.inventoryOpen) {
      keys.delete(key);
      if (event.key === "Escape") {
        event.preventDefault();
        if (!event.repeat) {
          if (player.weaponDetailsOpen) closeWeaponDetails();
          else toggleInventoryScreen();
        }
      }
      return;
    }

    if (isDialogueOpen()) {
      if (tutorialDialogue.npcId) {
        if (getTutorialNpcById(tutorialDialogue.npcId)?.kind === "shootingInstructor" && event.code === "Space") {
          event.preventDefault();
          if (!event.repeat) advanceShootingInstructorDialogue();
          return;
        }
        if (["1", "2", "3", "4"].includes(event.key)) {
          event.preventDefault();
          const option = tutorialDialogue.options.find((entry) => entry.label.startsWith(`${event.key}.`));
          if (option && !option.disabled) {
            handleTutorialNpcOption(option.id);
          }
          return;
        }
        if (event.key === "Escape") {
          closeTutorialDialogue();
          updateDialogueUI();
          statusTextEl.textContent = getCharacterStatus();
        }
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        advanceQuestDialogue();
        return;
      }
      if (event.key === "Escape") {
        closeQuestDialogue();
        statusTextEl.textContent = getCharacterStatus();
      }
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (beginTutorialNpcInteraction()) {
        return;
      }
      if (beginVillagerInteraction()) {
        return;
      }
      if (isHeroNearTrader()) {
        if (player.traderOpen) {
          closeTrader();
        } else {
          closeShop();
          closeWeaponDetails();
          openTrader();
        }
        return;
      }
      if (isHeroNearShop()) {
        if (player.shopOpen) {
          closeShop();
        } else {
          closeTrader();
          closeWeaponDetails();
          openShop();
        }
        return;
      }
    }

    if (isInterfacePanelOpen()) {
      if (event.key === "Escape") {
        closeShop();
        closeTrader();
        closeWeaponDetails();
      }
      return;
    }

    if (key === "h") {
      selectBuilding(getPlayerBase());
      return;
    }

    if (key === "b") {
      if (isPlayerBaseSelected()) {
        startBarracksPlacement();
      }
      return;
    }

    if (key === "q" && hero.vehicleId !== null) {
      if (!event.repeat) toggleHumveeTech();
      return;
    }

    if (key === "f" && hero.vehicleId !== null) {
      if (!event.repeat) useSmartMissile();
      return;
    }

    if (["f", "q", "g", "1", "2", "3"].includes(key)) {
      const ability = getOrderedInventoryAbilities().find((entry) => entry.key.toLowerCase() === key);
      if (ability?.actionKey === "F") useSlash(mouse.worldX, mouse.worldY);
      else if (!event.repeat) {
        if (ability?.actionKey === "Q") useBattleMedicine();
        else if (ability?.actionKey === "G") startGrenadeAim();
        else if (ability?.actionKey === "Shift") useRobotDash();
        else if (ability?.actionKey === "Sprint") useSprint();
      }
      return;
    }

    if (key === "x") {
      if (!event.repeat && toggleRifleFireMode()) {
        return;
      }
    }

    if (key === "e") {
      if (event.repeat) return;
      if (hero.vehicleId !== null) { exitHumvee(); return; }
      const vehicle = getNearbyHumvee();
      if (vehicle) { enterHumvee(vehicle); return; }
      if (player.inTutorialWorld && handleTutorialInteraction()) {
        return;
      }
      const nearbyPickup = getNearbyPickup();
      if (nearbyPickup) {
        nearbyPickup.collected = true;
        equipPickup(nearbyPickup);
      } else {
        startHarvest();
      }
    }

    if (key === "r") {
      if (startReload(true)) {
        statusTextEl.textContent = `Reloading ${getCurrentWeaponDetails()?.name || "weapon"}.`;
      }
    }

    if (event.key === "Shift" && hero.selectedClass === "robot") {
      useRobotDash();
    }

    if (event.key === "Escape") {
      player.isPlacingBuilding = false;
      cancelGrenadeAim();
      updateBuildBarracksButton();
      statusTextEl.textContent = getCharacterStatus();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
    const grenadeKey = getOrderedInventoryAbilities().find((ability) => ability.actionKey === "G")?.key.toLowerCase();
    if (key === grenadeKey && grenadeAim.active) {
      if (!useSoldierGrenade(mouse.worldX, mouse.worldY)) {
        cancelGrenadeAim();
        statusTextEl.textContent = getCharacterStatus();
      }
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    const world = screenToWorld(mouse.x, mouse.y);
    mouse.worldX = world.x;
    mouse.worldY = world.y;

    if (inputState.selectionBox) {
      inputState.selectionBox.x2 = mouse.worldX;
      inputState.selectionBox.y2 = mouse.worldY;
    }
  });

  canvas.addEventListener("mousedown", (event) => {
    if (!player.hasSelectedCharacter) {
      return;
    }
    if (isInterfacePanelOpen()) {
      return;
    }
    const point = screenToWorld(event.offsetX, event.offsetY);
    mouse.worldX = point.x;
    mouse.worldY = point.y;

    if (hero.vehicleId !== null) {
      if (event.button === 0) {
        mouse.leftDown = true;
        fireHumveeGun(point.x, point.y);
      }
      return;
    }

    if (event.button === 0) {
      mouse.leftDown = true;
      if (player.isPlacingBuilding) {
        if (!isPlayerBaseSelected()) {
          player.isPlacingBuilding = false;
          updateBuildBarracksButton();
          statusTextEl.textContent = "Select the player base to build a Barracks.";
          return;
        }
        if (player.wood >= 100 && isValidBarracksPlacement(point.x, point.y)) {
          player.wood -= 100;
          createBuilding("barracks", point.x - 70, point.y - 70, true);
          player.hasBuiltBarracks = true;
          player.isPlacingBuilding = false;
          hero.shootLockTimer = 0.8;
          updateInventoryUI();
          updateBuildBarracksButton();
          statusTextEl.textContent = "Barracks built. Select it to train soldiers.";
        }
        return;
      }

      if (hero.hasRifle && spawnHeroBullet(point.x, point.y)) {
        inputState.selectionBox = null;
        player.selectedUnits = [];
        player.selectedBuildingId = null;
        updateTrainButton();
        updateBuildBarracksButton();
        statusTextEl.textContent = "M4 fired.";
        return;
      }

      if (hero.hasBow && spawnHeroBowShot(point.x, point.y)) {
        inputState.selectionBox = null;
        player.selectedUnits = [];
        player.selectedBuildingId = null;
        updateTrainButton();
        updateBuildBarracksButton();
        statusTextEl.textContent = "Bow fired.";
        return;
      }

      const clickedUnit = getUnitAt(point, units);
      if (clickedUnit) {
        selectSingleUnit(clickedUnit);
        statusTextEl.textContent = "Soldier selected. Right-click to move or attack.";
        return;
      }

      const clickedBuilding = getBuildingAt(point, buildings.filter((b) => b.isPlayer));
      if (clickedBuilding?.selectable !== false) {
        selectBuilding(clickedBuilding);
        return;
      }

      player.selectedBuildingId = null;
      updateTrainButton();
      updateBuildBarracksButton();
      inputState.selectionBox = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };
    }
  });

  canvas.addEventListener("mouseup", (event) => {
    if (!player.hasSelectedCharacter) {
      return;
    }
    if (event.button === 0) {
      mouse.leftDown = false;
    }
    if (isInterfacePanelOpen()) {
      return;
    }
    if (event.button === 0 && inputState.selectionBox) {
      const dragWidth = Math.abs(inputState.selectionBox.x2 - inputState.selectionBox.x1);
      const dragHeight = Math.abs(inputState.selectionBox.y2 - inputState.selectionBox.y1);
      if (dragWidth < 10 && dragHeight < 10 && hero.hasAxe && !hero.hasRifle) {
        inputState.selectionBox = null;
        player.selectedUnits = [];
        statusTextEl.textContent = "Axe swing.";
        useAxeSwing();
        return;
      }
      selectUnitsInBox(inputState.selectionBox);
      inputState.selectionBox = null;
      statusTextEl.textContent = player.selectedUnits.length
        ? "Units selected. Right-click ground to move, or enemies to attack."
        : "No soldiers selected.";
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      mouse.leftDown = false;
    }
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (!player.hasSelectedCharacter) {
      return;
    }
    if (isInterfacePanelOpen()) {
      return;
    }
    const point = screenToWorld(event.offsetX, event.offsetY);

    if (player.isPlacingBuilding) {
      player.isPlacingBuilding = false;
      updateBuildBarracksButton();
      statusTextEl.textContent = getCharacterStatus();
      return;
    }

    const clickedBuilding = getBuildingAt(point, buildings.filter(
      (building) => building.isPlayer && (building.type === "playerBase" || building.type === "barracks")
    ));
    if (clickedBuilding?.selectable !== false) {
      if (clickedBuilding.type === "playerBase") {
        selectBuilding(clickedBuilding);
      } else if (clickedBuilding.type === "barracks") {
        selectBuilding(clickedBuilding);
      }
      return;
    }

    const enemyUnit = getUnitAt(point, enemies);
    if (enemyUnit && player.selectedUnits.length) {
      setSelectedUnitsAttackTarget(enemyUnit);
      statusTextEl.textContent = "Attack order issued.";
      return;
    }

    const enemyBuilding = getBuildingAt(point, buildings.filter((b) => !b.isPlayer));
    if (enemyBuilding && player.selectedUnits.length) {
      setSelectedUnitsAttackTarget(enemyBuilding);
      statusTextEl.textContent = "Attack order issued.";
      return;
    }

    setSelectedUnitsMoveTarget(point.x, point.y);
    statusTextEl.textContent = player.selectedUnits.length ? "Move order issued." : "Select soldiers first.";
  });
}

export { getMovementInput, inputState, registerPlayerInputs };
