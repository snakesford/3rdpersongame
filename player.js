import { clamp } from "./modules/math.js";
import {
  dodgeArenaBullets,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  mouse,
  player,
  quest,
  runtime,
} from "./modules/state.js";
import {
  DODGE_ARENA,
  PLAYER_BASE_SPAWN,
  SOLDIER_BATTLE_MEDICINE_REGEN_BONUS,
  TUTORIAL_WORLD,
  VILLAGE_WORLD,
  WORLD,
} from "./modules/constants.js";
import { statusTextEl } from "./modules/dom.js";
import { getMovementInput } from "./inputs.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createPlayerSystem(services) {
  function getCharacterStatus() {
    if (player.inWaveWorld) return services.getWaveModeStatus();
    if (player.inVillageWorld) {
      const npc = services.getNearbyTutorialNpc();
      return npc
        ? `${npc.name} nearby. Press Space to talk.`
        : "Village. Visit the shooting range to the east, or walk onto a teleporter to travel.";
    }
    if (player.inTutorialWorld) {
      return "Training world. Talk to the guides with Space, or use a teleporter to leave.";
    }

    if (services.isDialogueOpen()) {
      return "Talking to the Mercenary Captain. Press Space to continue.";
    }

    if (services.isHeroNearTrader()) {
      return "Near the Trader. Press Space to buy weapon upgrades.";
    }

    if (services.isHeroNearVillager()) {
      if (quest.activeContractStage === "readyToTurnIn") {
        return "Return to the Mercenary Captain. Press Space to claim your reward.";
      }
      if (quest.activeContractStage === "active") {
        return "Near the Mercenary Captain. Press Space to review your contract.";
      }
      if (quest.availableContractIds.length > 0) {
        return "Near the Mercenary Captain. Press Space to take a contract.";
      }
      return "Near the Mercenary Captain. Press Space to talk.";
    }

    if (services.isHeroNearShop()) {
      return "Near the Shop. Press Space to trade 25 wood for 25 gold.";
    }

    return "";
  }

  function getSelectedClassConfig() {
    return hero.selectedClass ? runtime.CHARACTER_OPTIONS[hero.selectedClass] : null;
  }

  function getHeroSpeed(selected = getSelectedClassConfig()) {
    return (selected?.agility || hero.speed || 0) + player.bonusSpeed;
  }

  function getHeroRegen(selected = getSelectedClassConfig()) {
    const baseRegen = selected?.stats?.regen || 0;
    return baseRegen + player.bonusRegen + (hero.battleMedicineBuffTimer > 0 ? SOLDIER_BATTLE_MEDICINE_REGEN_BONUS : 0);
  }

  function respawnHero() {
    services.clearEngineerDeployables();
    hero.vehicleId = null;
    services.dropLatestPickupFromHero();
    const selectedClass = hero.selectedClass ? runtime.CHARACTER_OPTIONS[hero.selectedClass] : null;
    player.inDodgeArena = false;
    dodgeArenaBullets.length = 0;
    DODGE_ARENA.timer = 0;
    hero.equippedArmorValue = 0;
    hero.equippedHelmetType = null;
    hero.speed = getHeroSpeed(selectedClass);
    hero.lastMoveAngle = null;
    hero.hasAxe = false;
    hero.axeSwingTimer = 0;
    hero.hasBow = hero.selectedClass === "archer";
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
    hero.hasRifle = ["soldier", "bountyHunter", "engineer"].includes(hero.selectedClass);
    hero.rifleFireMode = "automatic";
    hero.rifleCooldown = 0;
    hero.rifleShotAnimationTimer = 0;
    services.syncWeaponDerivedStats();
    hero.ammo = hero.hasRifle ? hero.maxAmmo : 0;
    hero.isReloading = false;
    hero.reloadTimer = 0;
    hero.isDead = false;
    hero.deathTimer = 0;
    hero.dashTimer = 0;
    hero.sprintTimer = 0;
    hero.sprintCooldownRemaining = 0;
    hero.regenProgress = 0;
    hero.dashCooldown = selectedClass?.dashCooldown || 0;
    hero.dashCooldownRemaining = 0;
    services.cancelGrenadeAim();
    heroProjectiles.length = 0;
    heroGrenades.length = 0;
    grenadeShockwaves.length = 0;
    hero.maxHp = (selectedClass?.stats?.health || 150) + player.bonusHealth;
    hero.hp = hero.maxHp;
    hero.x = player.inVillageWorld ? VILLAGE_WORLD.spawnX : player.inTutorialWorld ? TUTORIAL_WORLD.spawnX : PLAYER_BASE_SPAWN.x;
    hero.y = player.inVillageWorld ? VILLAGE_WORLD.spawnY : player.inTutorialWorld ? TUTORIAL_WORLD.spawnY : PLAYER_BASE_SPAWN.y;
    hero.targetPos = null;
    services.cancelHarvest();
    services.closeShop();
    services.closeTrader();
    services.closeWeaponDetails();
    services.updateStatsUI();
    statusTextEl.textContent = player.inVillageWorld ? "You respawned in the village." : player.inTutorialWorld ? "You respawned in the tutorial world." : "You respawned at base.";
    if (player.inWaveWorld) services.activateWaveWorld();
    services.spawnTextPopup(hero.x, hero.y - 30, "Respawned!", "rgba(196, 234, 255, 1)", 1.4);
  }

  function updateHero(dt) {
    if (hero.isDead) {
      hero.deathTimer = Math.max(0, hero.deathTimer - dt);
      hero.isMoving = false;
      if (hero.deathTimer === 0) {
        respawnHero();
      }
      return;
    }

    services.updatePlayerCombatTimers(dt);
    const regenRate = getHeroRegen();
    if (regenRate > 0 && hero.hp > 0 && hero.hp < hero.maxHp) {
      hero.regenProgress += regenRate * dt;
      const missingHp = hero.maxHp - hero.hp;
      const wholeHpRestored = Math.min(Math.floor(hero.regenProgress), Math.floor(missingHp));
      if (wholeHpRestored > 0) {
        hero.hp = Math.min(hero.maxHp, hero.hp + wholeHpRestored);
        hero.regenProgress -= wholeHpRestored;
        services.spawnTextPopup(hero.x, hero.y - hero.radius - 18, `+${wholeHpRestored} HP`, "rgba(156, 245, 164, 1)", 0.9);
      }
    } else if (hero.hp >= hero.maxHp) {
      hero.regenProgress = 0;
    }
    if (services.isSoldierRifleShooting()) {
      hero.facingAngle = Math.atan2(mouse.worldY - hero.y, mouse.worldX - hero.x);
    }
    hero.isMoving = false;
    if (services.isDialogueOpen()) {
      services.updateInventoryUI();
      statusTextEl.textContent = getCharacterStatus();
      services.updateAbilityUI();
      return;
    }
    if (hero.vehicleId !== null) {
      services.updateHumveeDriving(dt);
      if (hero.vehicleId !== null) return;
    }

    if (mouse.leftDown && !player.isPlacingBuilding && !services.isInterfacePanelOpen() && !services.isUsingBattleMedicine()) {
      if (hero.hasRifle) {
        if (hero.rifleFireMode === "automatic") {
          services.spawnHeroBullet(mouse.worldX, mouse.worldY);
        }
      } else if (hero.hasBow) {
        services.spawnHeroBowShot(mouse.worldX, mouse.worldY);
      }
    }
    services.updateActiveAbility(dt);

    if (player.victory || player.loss) {
      services.updateAbilityUI();
      return;
    }

    if (!player.hasSelectedCharacter) {
      services.updateAbilityUI();
      return;
    }

    if (services.isInterfacePanelOpen()) {
      services.updateInventoryUI();
      services.updateStatsUI();
      services.updateAbilityUI();
      return;
    }

    const { dx, dy } = getMovementInput();
    const movementSpeedMultiplier = services.getRoadSpeedMultiplier() * (services.isSoldierRifleShooting() ? 0.5 : 1)
      * (hero.sprintTimer > 0 ? services.SPRINT_SPEED_MULTIPLIER : 1)
      * (hero.adrenalineTimer > 0 ? 1.2 : 1);

    if (services.isUsingBattleMedicine()) {
      hero.isMoving = false;
    } else if (hero.dashTimer > 0) {
      hero.x = clamp(hero.x + Math.cos(hero.lastMoveAngle) * hero.dashSpeed * dt, hero.radius, WORLD.width - hero.radius);
      hero.y = clamp(hero.y + Math.sin(hero.lastMoveAngle) * hero.dashSpeed * dt, hero.radius, services.getWorldHeight() - hero.radius);
      services.resolveHeroObstacleCollisions();
      hero.isMoving = true;
    } else if (dx || dy) {
      const mag = Math.hypot(dx, dy);
      hero.lastMoveAngle = Math.atan2(dy / mag, dx / mag);
      if (!services.isSoldierRifleShooting()) {
        hero.facingAngle = hero.lastMoveAngle;
      }
      hero.x = clamp(hero.x + (dx / mag) * hero.speed * movementSpeedMultiplier * dt, hero.radius, WORLD.width - hero.radius);
      hero.y = clamp(hero.y + (dy / mag) * hero.speed * movementSpeedMultiplier * dt, hero.radius, services.getWorldHeight() - hero.radius);
      services.resolveHeroObstacleCollisions();
      hero.isMoving = true;
      if (hero.isHarvesting) {
        services.cancelHarvest();
      }
    }

    if (hero.isMoving) {
      hero.runAnimationTimer += dt;
    } else {
      hero.runAnimationTimer = 0;
    }

    if (services.updatePlayerWorldInteractions(dt)) return;

    services.updateHarvest(dt);

    services.updateAutomaticPickups(dt);

    if (hero.hp <= 0) {
      hero.hp = 0;
      if (player.inDodgeArena) {
        services.leaveDodgeArena("Arena down. Sent back to the main area.");
        services.updateAbilityUI();
        return;
      }
      hero.isDead = true;
      hero.deathTimer = hero.deathDuration;
    }

    services.updateInventoryUI();
    statusTextEl.textContent = getCharacterStatus();
    services.updateStatsUI();
    services.updateAbilityUI();
  }

  return {
    getCharacterStatus,
    getSelectedClassConfig,
    getHeroSpeed,
    getHeroRegen,
    respawnHero,
    updateHero,
  };
}

export { createPlayerSystem };
