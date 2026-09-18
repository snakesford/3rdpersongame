import { clamp } from "./modules/math.js";
import {
  buildings,
  hero,
  mouse,
  nextId,
  player,
  runtime,
  stones,
  trees,
  villageProps,
} from "./modules/state.js";
import { buildBarracksBtn, ctx, statusTextEl, trainSoldierBtn } from "./modules/dom.js";
import { COLORS, WORLD } from "./modules/constants.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createBuildingsSystem(services) {
  function createBuilding(type, x, y, isPlayer, options = {}) {
    const building = {
      id: nextId(),
      type,
      x,
      y,
      w: options.w ?? 140,
      h: options.h ?? 140,
      hp: options.hp ?? (type === "barracks" ? 400 : type === "shop" ? 300 : type === "playerBase" ? 900 : 800),
      maxHp: options.maxHp ?? (type === "barracks" ? 400 : type === "shop" ? 300 : type === "playerBase" ? 900 : 800),
      isPlayer,
      selectable: options.selectable ?? true,
    };
    if (type === "humvee") {
      building.mountedWeapon = "machineGun";
      building.weaponAmmo = { machineGun: 300, grenade40: 75, howitzer50: 15 };
      building.ammo = 300;
      building.maxAmmo = 300;
      building.gunCooldown = 0;
      building.smartMissileCooldown = 0;
      building.driverId = null;
      building.reservedDriverId = null;
      building.tech = null;
      building.techActive = false;
      building.repairDelay = 5;
    }
    buildings.push(building);
    return building;
  }

  function updateTrainButton() {
    const selected = buildings.find((b) => b.id === player.selectedBuildingId && b.type === "barracks" && b.isPlayer);
    const show = Boolean(selected);
    trainSoldierBtn.classList.toggle("hidden", !show);
    trainSoldierBtn.disabled = player.money < 50 || !show;
  }

  function isPlayerBaseSelected() {
    return Boolean(runtime.playerBase && player.selectedBuildingId === runtime.playerBase.id);
  }

  function updateBuildBarracksButton() {
    buildBarracksBtn.disabled = !isPlayerBaseSelected() || player.isPlacingBuilding;
  }

  function startBarracksPlacement() {
    if (!player.hasSelectedCharacter) {
      return;
    }
    if (services.isInterfacePanelOpen()) {
      return;
    }
    if (!isPlayerBaseSelected()) {
      statusTextEl.textContent = "Select the player base first. Press H or click the base.";
      return;
    }
    if (player.wood < 100) {
      statusTextEl.textContent = "Not enough wood to build a Barracks.";
      return;
    }
    player.isPlacingBuilding = true;
    services.clearUnitSelection();
    player.selectedUnits = [];
    updateTrainButton();
    updateBuildBarracksButton();
    statusTextEl.textContent = "Place the Barracks on open ground. Right-click or press Escape to cancel.";
  }

  function selectBuilding(building) {
    services.clearUnitSelection();
    player.selectedUnits = [];
    player.selectedBuildingId = building.id;
    updateTrainButton();
    updateBuildBarracksButton();
    if (building.type === "barracks") {
      statusTextEl.textContent = "Barracks selected. Train a soldier for 50 gold.";
    } else if (building.type === "playerBase") {
      statusTextEl.textContent = "Base selected. Build a Barracks from here.";
    } else if (building.type === "shop") {
      statusTextEl.textContent = "Shop selected. Sell 25 wood for 25 gold.";
    }
  }

  function isPointInBuilding(point, building) {
    return (
      point.x >= building.x &&
      point.x <= building.x + building.w &&
      point.y >= building.y &&
      point.y <= building.y + building.h
    );
  }

  function getBuildingAt(point, list) {
    return list.find((building) => isPointInBuilding(point, building));
  }

  function isValidBarracksPlacement(x, y) {
    const preview = { x: x - 70, y: y - 70, w: 140, h: 140 };
    if (preview.x < 40 || preview.y < 40 || preview.x + preview.w > WORLD.width - 40 || preview.y + preview.h > services.getWorldHeight() - 40) {
      return false;
    }

    for (const tree of trees) {
      const closestX = clamp(tree.x, preview.x, preview.x + preview.w);
      const closestY = clamp(tree.y, preview.y, preview.y + preview.h);
      if (Math.hypot(tree.x - closestX, tree.y - closestY) < tree.radius + 10) {
        return false;
      }
    }

    for (const stone of stones) {
      const closestX = clamp(stone.x, preview.x, preview.x + preview.w);
      const closestY = clamp(stone.y, preview.y, preview.y + preview.h);
      if (Math.hypot(stone.x - closestX, stone.y - closestY) < stone.radius + 10) {
        return false;
      }
    }

    for (const building of buildings) {
      if (
        preview.x < building.x + building.w + 20 &&
        preview.x + preview.w > building.x - 20 &&
        preview.y < building.y + building.h + 20 &&
        preview.y + preview.h > building.y - 20
      ) {
        return false;
      }
    }

    for (const prop of villageProps) {
      if (!prop.collidable || prop.shape !== "rect") {
        continue;
      }
      if (
        preview.x < prop.x + prop.w + 12 &&
        preview.x + preview.w > prop.x - 12 &&
        preview.y < prop.y + prop.h + 12 &&
        preview.y + preview.h > prop.y - 12
      ) {
        return false;
      }
    }

    return true;
  }

  function cleanupDestroyedBuildings() {
    for (let i = buildings.length - 1; i >= 0; i -= 1) {
      const building = buildings[i];
      if (building.hp > 0) {
        continue;
      }
      if (hero.vehicleId === building.id) services.exitHumvee();
      if (building.driverId && services.npcState.trainingDriver?.vehicleId === building.id) services.releaseDriverVehicle();
      buildings.splice(i, 1);
      if (building.type === "humvee") {
        services.explodeGrenade({
          targetX: building.x + building.w / 2,
          targetY: building.y + building.h / 2,
          damage: 200,
          explosionRadius: 180,
          particleCount: 70,
          effectDuration: 0.65,
          coreScale: 3,
          ownerId: building.id,
        });
      }
      if (player.selectedBuildingId === building.id) {
        player.selectedBuildingId = null;
        updateTrainButton();
        updateBuildBarracksButton();
      }
      if (building.type === "enemyBase") {
        services.triggerVictory();
      } else if (building.type === "playerBase") {
        services.triggerLoss();
      }
    }

    services.cleanupEnemyHero();

  }

  function drawBuildPreview() {
    if (!player.isPlacingBuilding) {
      return;
    }
    const x = mouse.worldX - 70;
    const y = mouse.worldY - 70;
    ctx.fillStyle = isValidBarracksPlacement(mouse.worldX, mouse.worldY) ? COLORS.previewValid : COLORS.previewInvalid;
    ctx.fillRect(x, y, 140, 140);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.strokeRect(x, y, 140, 140);
  }

  function registerBuildingControls() {
    buildBarracksBtn.addEventListener("click", () => {
      startBarracksPlacement();
    });
    trainSoldierBtn.addEventListener("click", () => {
      if (!player.hasSelectedCharacter) {
        return;
      }
      if (services.isInterfacePanelOpen()) {
        return;
      }
      const barracks = buildings.find((building) => building.id === player.selectedBuildingId && building.isPlayer);
      if (!barracks || player.money < 50) {
        return;
      }
      player.money -= 50;
      services.updateInventoryUI();
      services.createUnit("soldier", barracks.x + barracks.w + 24, barracks.y + barracks.h / 2, true);
      trainSoldierBtn.disabled = player.money < 50;
      statusTextEl.textContent = "Soldier trained. Select it and issue orders with the mouse.";
    });
  }

  return {
    createBuilding,
    updateTrainButton,
    isPlayerBaseSelected,
    updateBuildBarracksButton,
    startBarracksPlacement,
    selectBuilding,
    isPointInBuilding,
    getBuildingAt,
    isValidBarracksPlacement,
    cleanupDestroyedBuildings,
    drawBuildPreview,
    registerBuildingControls,
  };
}

export { createBuildingsSystem };
