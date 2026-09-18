import { clamp, distance } from "./modules/math.js";
import {
  dodgeArenaBullets,
  enemies,
  hero,
  player,
  runtime,
  shootingRangeTutorial,
  trainingAmmoStockpile,
  tutorialRangeTargets,
  waveMode,
} from "./modules/state.js";
import {
  DODGE_ARENA,
  DODGE_ARENA_DODGE_XP,
  DODGE_ARENA_TILE,
  PLAYER_BASE_SPAWN,
  SPAWN_STREAM_TILE,
  SPAWN_WAVE_TILE,
  TUTORIAL_WORLD,
  VILLAGE_WORLD,
  WORLD,
} from "./modules/constants.js";
import { ctx, overlayMessageEl, statusTextEl } from "./modules/dom.js";
import { ammoStockpileImage } from "./modules/assets.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createGameModesSystem(services) {
  const WAVE_MODE_TILE = { x: 1520, y: 1270, size: 96, destination: "waves", label: ["WAVE", "MODE"] };

  const WAVE_MODE = { counts: [3, 5], spawnX: WORLD.width / 2, spawnY: WORLD.height / 2, delay: 3 };

  const SHOOTING_RANGE_CONFIG = {
    instructorStartX: TUTORIAL_WORLD.spawnX + 120,
    instructorStartY: TUTORIAL_WORLD.spawnY - 110,
    shootPosX: TUTORIAL_WORLD.spawnX + 420,
    shootPosY: TUTORIAL_WORLD.spawnY - 120,
    targetLaneX: TUTORIAL_WORLD.spawnX + 690,
    nearTargetY: TUTORIAL_WORLD.spawnY - 170,
    farTargetY: TUTORIAL_WORLD.spawnY - 285,
  };

  const VILLAGE_SHOOTING_RANGE = {
    instructorStartX: VILLAGE_WORLD.range.x + 60,
    instructorStartY: VILLAGE_WORLD.range.y + 40,
    shootPosX: VILLAGE_WORLD.range.x + 150,
    shootPosY: VILLAGE_WORLD.range.y + 120,
    targetLaneX: VILLAGE_WORLD.range.x + 440,
    nearTargetY: VILLAGE_WORLD.range.y + 120,
    farTargetY: VILLAGE_WORLD.range.y + 50,
  };

  function getShootingRangeConfig() {
    return player.inVillageWorld ? VILLAGE_SHOOTING_RANGE : SHOOTING_RANGE_CONFIG;
  }

  function getShootingLine() {
    const range = getShootingRangeConfig();
    return { x: range.shootPosX - 54, y: range.shootPosY - 12, w: 18, h: 128 };
  }

  const SHOOTING_RANGE_TUTORIAL_XP = 12;

  const SHOOTING_RANGE_TARGET_XP = 5;

  function resetShootingRangeTutorial() {
    shootingRangeTutorial.movingTargets = false;
    tutorialRangeTargets.length = 0;
    shootingRangeTutorial.state = shootingRangeTutorial.completed ? "completed" : "idle";
    shootingRangeTutorial.started = shootingRangeTutorial.completed;
    shootingRangeTutorial.hits = 0;
    shootingRangeTutorial.introSeen = false;
    tutorialRangeTargets.push(
      {
        id: "rangeTargetNear",
        resetTimer: 0,
        x: getShootingRangeConfig().targetLaneX,
        y: getShootingRangeConfig().nearTargetY,
        radius: 18,
        hit: false,
        destroyed: false,
        hp: 40,
        maxHp: 40,
      },
      {
        id: "rangeTargetFar",
        resetTimer: 0,
        x: getShootingRangeConfig().targetLaneX + 86,
        y: getShootingRangeConfig().farTargetY,
        radius: 18,
        hit: false,
        destroyed: false,
        hp: 40,
        maxHp: 40,
      }
    );
  }

  function getMovingTargetTile() {
    const line = getShootingLine();
    return { x: line.x - 164, y: line.y + 10, size: 64 };
  }

  function getStaticTargetTile() {
    const movingTile = getMovingTargetTile();
    return { ...movingTile, y: movingTile.y + movingTile.size + 24 };
  }

  function activateStaticTargets() {
    if (!shootingRangeTutorial.movingTargets) return;
    const range = getShootingRangeConfig();
    const targets = tutorialRangeTargets.map((target, index) => ({
      id: index === 0 ? "rangeTargetNear" : "rangeTargetFar",
      x: range.targetLaneX + index * 86,
      y: index === 0 ? range.nearTargetY : range.farTargetY,
      radius: target.radius,
      hit: false,
      destroyed: false,
      hp: target.maxHp,
      maxHp: target.maxHp,
      resetTimer: 0,
    }));
    tutorialRangeTargets.splice(0, tutorialRangeTargets.length, ...targets);
    shootingRangeTutorial.movingTargets = false;
    shootingRangeTutorial.hits = 0;
    statusTextEl.textContent = "Static targets activated.";
  }

  function activateMovingTargets() {
    if (shootingRangeTutorial.movingTargets) return;
    const targets = tutorialRangeTargets.map((target, index) => ({
      ...target,
      id: `movingRangeTarget${index}`,
      hit: false,
      destroyed: false,
      hp: target.maxHp,
      resetTimer: 0,
      originY: target.y,
      movementPhase: index * Math.PI,
    }));
    tutorialRangeTargets.splice(0, tutorialRangeTargets.length, ...targets);
    shootingRangeTutorial.movingTargets = true;
    shootingRangeTutorial.hits = 0;
    statusTextEl.textContent = "Moving targets activated.";
  }

  function resetTutorialRangeTargets() {
    for (const target of tutorialRangeTargets) {
      target.hit = false;
      target.destroyed = false;
      target.hp = target.maxHp;
      target.resetTimer = 0;
    }
  }

  function isHeroOnSpawnWaveTile() {
    return (
      hero.x >= SPAWN_WAVE_TILE.x &&
      hero.x <= SPAWN_WAVE_TILE.x + SPAWN_WAVE_TILE.size &&
      hero.y >= SPAWN_WAVE_TILE.y &&
      hero.y <= SPAWN_WAVE_TILE.y + SPAWN_WAVE_TILE.size
    );
  }

  function isHeroOnSpawnStreamTile() {
    return (
      hero.x >= SPAWN_STREAM_TILE.x &&
      hero.x <= SPAWN_STREAM_TILE.x + SPAWN_STREAM_TILE.size &&
      hero.y >= SPAWN_STREAM_TILE.y &&
      hero.y <= SPAWN_STREAM_TILE.y + SPAWN_STREAM_TILE.size
    );
  }

  function isHeroOnDodgeArenaTile() {
    return (
      hero.x >= DODGE_ARENA_TILE.x &&
      hero.x <= DODGE_ARENA_TILE.x + DODGE_ARENA_TILE.size &&
      hero.y >= DODGE_ARENA_TILE.y &&
      hero.y <= DODGE_ARENA_TILE.y + DODGE_ARENA_TILE.size
    );
  }

  function isPointInsideDodgeArena(x, y) {
    return (
      x >= DODGE_ARENA.x &&
      x <= DODGE_ARENA.x + DODGE_ARENA.w &&
      y >= DODGE_ARENA.y &&
      y <= DODGE_ARENA.y + DODGE_ARENA.h
    );
  }

  function enterDodgeArena() {
    if (player.inDodgeArena) {
      return;
    }

    player.inDodgeArena = true;
    player.dodgeArenaReturnX = PLAYER_BASE_SPAWN.x + 40;
    player.dodgeArenaReturnY = PLAYER_BASE_SPAWN.y;
    hero.x = DODGE_ARENA.spawnX;
    hero.y = DODGE_ARENA.spawnY;
    hero.hp = hero.maxHp;
    dodgeArenaBullets.length = 0;
    DODGE_ARENA.timer = 0;
    statusTextEl.textContent = "Dodge Arena entered. Survive the bullet rain.";
    services.spawnTextPopup(hero.x, hero.y - 28, "Dodge Arena", "rgba(172, 225, 255, 1)", 1.4);
  }

  function leaveDodgeArena(message = "Returned from the Dodge Arena.") {
    player.inDodgeArena = false;
    dodgeArenaBullets.length = 0;
    hero.hp = hero.maxHp;
    hero.x = player.dodgeArenaReturnX;
    hero.y = player.dodgeArenaReturnY;
    hero.targetPos = null;
    statusTextEl.textContent = message;
    services.spawnTextPopup(hero.x, hero.y - 28, "Returned", "rgba(196, 234, 255, 1)", 1.2);
  }

  function getWaveModeStatus() {
    if (waveMode.completed) return "Wave mode complete! Returning to training…";
    if (waveMode.timer > 0) return `Wave ${waveMode.wave + 1}/${WAVE_MODE.counts.length} starts in ${Math.ceil(waveMode.timer)}…`;
    return `Wave ${waveMode.wave}/${WAVE_MODE.counts.length} — ${enemies.filter(enemy => enemy.hp > 0).length} enemies remaining`;
  }

  function activateWaveWorld() {
    services.prepareWorldTravel();
    services.clearWorldEntities();
    player.inWaveWorld = true;
    player.inTutorialWorld = false;
    player.inVillageWorld = false;
    player.inDodgeArena = false;
    runtime.playerBase = null;
    runtime.enemyBase = null;
    runtime.enemyHero.active = false;
    runtime.enemyHero.hp = 0;
    hero.x = WAVE_MODE.spawnX;
    hero.y = WAVE_MODE.spawnY;
    hero.hp = hero.maxHp;
    waveMode.timer = WAVE_MODE.delay;
    overlayMessageEl.classList.add("hidden");
    services.updateCamera(1);
    statusTextEl.textContent = getWaveModeStatus();
    services.updateQuestUI();
    services.updateStatsUI();
    services.updateAbilityUI();
    services.updateTrainButton();
    services.updateBuildBarracksButton();
  }

  function updateWaveMode(dt) {
    if (!player.inWaveWorld || hero.isDead || hero.hp <= 0) return;
    if (waveMode.timer > 0) {
      waveMode.timer = Math.max(0, waveMode.timer - dt);
      if (waveMode.timer === 0) {
        if (waveMode.completed) {
          if (services.getOccupiedHumvee()) services.teleportHumvee(services.activateTutorialWorld);
          else services.activateTutorialWorld();
          return;
        }
        const count = WAVE_MODE.counts[waveMode.wave++];
        for (let i = 0; i < count; i += 1) {
          const angle = i * Math.PI * 2 / count;
          // Keep the entire spawn ring within the map, even when the hero is at an edge.
          const centerX = clamp(hero.x, 400, WORLD.width - 400);
          const centerY = clamp(hero.y, 400, services.getWorldHeight() - 400);
          services.createUnit("skeleton", centerX + Math.cos(angle) * 340, centerY + Math.sin(angle) * 340, false);
        }
      }
    } else if (waveMode.wave > 0 && !enemies.some(enemy => enemy.hp > 0)) {
      waveMode.completed = waveMode.wave === WAVE_MODE.counts.length;
      waveMode.timer = WAVE_MODE.delay;
    }
    statusTextEl.textContent = getWaveModeStatus();
    services.updateQuestUI();
  }

  function registerTutorialTargetHit(target) {
    if (shootingRangeTutorial.state !== "shootTargets" && shootingRangeTutorial.state !== "completed") {
      return;
    }
    if (target.hit) {
      return;
    }

    target.hit = true;
    shootingRangeTutorial.hits += 1;
    statusTextEl.textContent = `Instructor: Hit the targets: ${shootingRangeTutorial.hits}/2.`;
    services.updateQuestUI();
    if (shootingRangeTutorial.hits >= tutorialRangeTargets.length) {
      services.completeShootingRangeTutorial();
    }
  }

  function destroyTutorialRangeTarget(target, reason = "destroyed") {
    if (reason !== "grenade" && shootingRangeTutorial.state !== "shootTargets" && shootingRangeTutorial.state !== "completed") {
      return;
    }
    if (target.destroyed) {
      return;
    }

    target.destroyed = true;
    target.hp = 0;
    target.resetTimer = 2;
    services.awardPlayerXp(SHOOTING_RANGE_TARGET_XP, target.x, target.y);
    if (shootingRangeTutorial.state === "shootTargets" || shootingRangeTutorial.state === "completed") {
      registerTutorialTargetHit(target);
    }
    services.spawnTextPopup(
      target.x,
      target.y - 28,
      reason === "grenade" ? "Target destroyed" : "Target down",
      "rgba(255, 218, 148, 1)",
      0.9
    );
  }

  function tryHitTutorialRangeTarget(projectile) {
    if (!player.inTutorialWorld && !player.inVillageWorld) {
      return false;
    }

    for (const target of tutorialRangeTargets) {
      if (target.destroyed) {
        continue;
      }
      const postLeft = target.x - 4;
      const postTop = target.y + 16;
      const postRight = postLeft + 8;
      const postBottom = postTop + 34;
      const hitsPost = (
        projectile.x + projectile.radius >= postLeft &&
        projectile.x - projectile.radius <= postRight &&
        projectile.y + projectile.radius >= postTop &&
        projectile.y - projectile.radius <= postBottom
      );
      if (hitsPost) {
        services.spawnTextPopup(
          target.x + (Math.random() - 0.5) * 18,
          target.y - 28 + (Math.random() - 0.5) * 14,
          "Miss!",
          "rgba(255, 214, 148, 1)",
          0.9
        );
        continue;
      }
      if (distance(projectile, target) > projectile.radius + target.radius) {
        continue;
      }
      const damage = Math.max(1, Math.round(projectile.baseDamage ?? projectile.damage ?? 1));
      services.spawnDamagePopup(target, damage);
      projectile.active = false;
      if (shootingRangeTutorial.state !== "shootTargets" && shootingRangeTutorial.state !== "completed") {
        return true;
      }

      target.hp = Math.max(0, target.hp - damage);
      if (target.hp <= 0) {
        destroyTutorialRangeTarget(target);
      } else {
        registerTutorialTargetHit(target);
      }
      return true;
    }

    return false;
  }

  function updateShootingRangeTargets(dt) {
    const tile = getMovingTargetTile();
    if (hero.x >= tile.x && hero.x <= tile.x + tile.size &&
        hero.y >= tile.y && hero.y <= tile.y + tile.size) {
      activateMovingTargets();
    }
    const staticTile = getStaticTargetTile();
    if (hero.x >= staticTile.x && hero.x <= staticTile.x + staticTile.size &&
        hero.y >= staticTile.y && hero.y <= staticTile.y + staticTile.size) {
      activateStaticTargets();
    }
    for (const target of tutorialRangeTargets) {
      if (!target.destroyed) {
        if (shootingRangeTutorial.movingTargets) {
          target.movementPhase += dt * 2;
          target.y = target.originY + Math.sin(target.movementPhase) * 32;
        }
        continue;
      }
      target.resetTimer = Math.max(0, target.resetTimer - dt);
      if (target.resetTimer === 0) {
        target.destroyed = false;
        target.hit = false;
        target.hp = target.maxHp;
        shootingRangeTutorial.hits = tutorialRangeTargets.filter((entry) => entry.hit).length;
      }
    }

  }

  function spawnDodgeArenaBullet() {
    const headshotConfig = services.buildProjectileHeadshotConfig("arenaBullet");
    dodgeArenaBullets.push({
      x: DODGE_ARENA.x + 24 + Math.random() * (DODGE_ARENA.w - 48),
      y: DODGE_ARENA.y - 18,
      radius: 7 + Math.random() * 2,
      speed: 260 + Math.random() * 90,
      damage: 14,
      baseDamage: 14,
      projectileType: "arenaBullet",
      canHeadshot: true,
      headshotChance: headshotConfig.headshotChance,
      headshotMultiplier: headshotConfig.headshotMultiplier,
    });
  }

  function updateDodgeArena(dt) {
    if (!player.inDodgeArena) {
      return;
    }

    DODGE_ARENA.timer = (DODGE_ARENA.timer || 0) + dt;
    while (DODGE_ARENA.timer >= DODGE_ARENA.bulletInterval) {
      spawnDodgeArenaBullet();
      if (Math.random() > 0.55) {
        spawnDodgeArenaBullet();
      }
      DODGE_ARENA.timer -= DODGE_ARENA.bulletInterval;
    }

    for (let index = dodgeArenaBullets.length - 1; index >= 0; index -= 1) {
      const bullet = dodgeArenaBullets[index];
      bullet.y += bullet.speed * dt;
      if (distance(hero, bullet) <= hero.radius + bullet.radius) {
        services.applyRangedProjectileHit(hero, bullet);
        dodgeArenaBullets.splice(index, 1);
        continue;
      }
      if (bullet.y > DODGE_ARENA.y + DODGE_ARENA.h + 24) {
        services.awardPlayerXp(DODGE_ARENA_DODGE_XP, bullet.x, bullet.y);
        dodgeArenaBullets.splice(index, 1);
      }
    }
  }

  function triggerVictory() {
    player.victory = true;
    overlayMessageEl.textContent = "VICTORY";
    overlayMessageEl.classList.remove("hidden");
  }

  function triggerLoss() {
    player.loss = true;
    overlayMessageEl.textContent = "DEFEAT";
    overlayMessageEl.classList.remove("hidden");
  }

  function updateTrainingAmmoStockpile() {
    if (!player.inTutorialWorld || hero.hp <= 0 || hero.isDead) {
      trainingAmmoStockpile.occupantId = null;
      return;
    }
    const vehicle = services.getOccupiedHumvee();
    const stockpile = trainingAmmoStockpile;
    const overlaps = vehicle ? services.humveeOverlapsTile(vehicle, stockpile)
      : Math.hypot(hero.x - clamp(hero.x, stockpile.x, stockpile.x + stockpile.size),
        hero.y - clamp(hero.y, stockpile.y, stockpile.y + stockpile.size)) <= hero.radius;
    const occupantId = overlaps ? (vehicle?.id ?? hero.id) : null;
    if (occupantId === stockpile.occupantId) return;
    stockpile.occupantId = occupantId;
    if (!overlaps) return;

    let refilled = false;
    if (hero.hasRifle) {
      refilled = hero.ammo < hero.maxAmmo;
      hero.ammo = hero.maxAmmo;
      hero.isReloading = false;
      hero.reloadTimer = 0;
    }
    if (vehicle) {
      if (vehicle.weaponAmmo) {
        for (const [id, weapon] of Object.entries(services.HUMVEE_WEAPONS)) {
          if (vehicle.weaponAmmo[id] < weapon.ammo) refilled = true;
          vehicle.weaponAmmo[id] = weapon.ammo;
        }
      }
      if (vehicle.ammo < vehicle.maxAmmo) refilled = true;
      vehicle.ammo = vehicle.maxAmmo;
    }
    if (refilled) {
      services.spawnTextPopup(stockpile.x + stockpile.size / 2, stockpile.y - 16,
        "Ammo refilled!", "rgba(255, 228, 154, 1)", 1.2);
      services.updateInventoryUI();
      if (vehicle) services.updateHumveeInventory();
    }
  }

  function drawTrainingAmmoStockpile() {
    if (!player.inTutorialWorld) return;
    const { x, y, size } = trainingAmmoStockpile;
    ctx.save();
    ctx.fillStyle = "rgba(197, 164, 83, 0.65)";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#ffe2a0";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
    if (ammoStockpileImage.complete && ammoStockpileImage.naturalWidth > 0) {
      const scale = (size - 16) / Math.max(ammoStockpileImage.naturalWidth, ammoStockpileImage.naturalHeight);
      const width = ammoStockpileImage.naturalWidth * scale;
      const height = ammoStockpileImage.naturalHeight * scale;
      ctx.drawImage(ammoStockpileImage, x + (size - width) / 2, y + (size - height) / 2, width, height);
    }
    services.drawNameplate(x + size / 2, y - 16, "AMMO", "rgba(15, 33, 24, 0.9)");
    ctx.restore();
  }

  function drawDodgeArenaBullets() {
    for (const bullet of dodgeArenaBullets) {
      ctx.fillStyle = "#ffe391";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 243, 193, 0.45)";
      ctx.fillRect(bullet.x - 1.5, bullet.y - 18, 3, 12);
    }
  }

  return {
    WAVE_MODE_TILE,
    WAVE_MODE,
    SHOOTING_RANGE_CONFIG,
    VILLAGE_SHOOTING_RANGE,
    getShootingRangeConfig,
    getShootingLine,
    SHOOTING_RANGE_TUTORIAL_XP,
    SHOOTING_RANGE_TARGET_XP,
    resetShootingRangeTutorial,
    getMovingTargetTile,
    getStaticTargetTile,
    activateStaticTargets,
    activateMovingTargets,
    resetTutorialRangeTargets,
    isHeroOnSpawnWaveTile,
    isHeroOnSpawnStreamTile,
    isHeroOnDodgeArenaTile,
    isPointInsideDodgeArena,
    enterDodgeArena,
    leaveDodgeArena,
    getWaveModeStatus,
    activateWaveWorld,
    updateWaveMode,
    registerTutorialTargetHit,
    destroyTutorialRangeTarget,
    tryHitTutorialRangeTarget,
    updateShootingRangeTargets,
    spawnDodgeArenaBullet,
    updateDodgeArena,
    triggerVictory,
    triggerLoss,
    updateTrainingAmmoStockpile,
    drawTrainingAmmoStockpile,
    drawDodgeArenaBullets,
  };
}

export { createGameModesSystem };
