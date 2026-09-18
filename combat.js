import { distance, distanceToSegment, normalizeAngle } from "./modules/math.js";
import {
  buildings,
  camera,
  damagePopups,
  enemies,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  mouse,
  player,
  runtime,
  sparkEffects,
  stones,
  trees,
  tutorialRangeTargets,
} from "./modules/state.js";
import { statusTextEl } from "./modules/dom.js";
import {
  GRID_SIZE,
  HELMET_HEADSHOT_PROTECTION,
  RANGED_HEADSHOT_CONFIG,
  SOLDIER_GRENADE_DAMAGE,
  SOLDIER_GRENADE_RADIUS,
  SOLDIER_GRENADE_RANGE,
  WORLD,
} from "./modules/constants.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createCombatSystem(services) {
  function isSoldierRifleShooting() {
    return hero.selectedClass === "soldier" &&
      hero.hasRifle &&
      hero.rifleFireMode === "automatic" &&
      mouse.leftDown &&
      !hero.isReloading &&
      hero.ammo > 0 &&
      hero.shootLockTimer <= 0 &&
      !player.isPlacingBuilding &&
      !services.isInterfacePanelOpen() &&
      !services.isUsingBattleMedicine();
  }

  function toggleRifleFireMode() {
    if (!player.hasSelectedCharacter || hero.selectedClass !== "soldier" || !hero.hasRifle) {
      return false;
    }
    hero.rifleFireMode = hero.rifleFireMode === "automatic" ? "semi" : "automatic";
    statusTextEl.textContent = hero.rifleFireMode === "automatic"
      ? "Fire Mode: Automatic"
      : "Fire Mode: Semi-Automatic";
    spawnTextPopup(
      hero.x,
      hero.y - hero.radius - 30,
      hero.rifleFireMode === "automatic" ? "Fire Mode: Automatic" : "Fire Mode: Semi-Automatic",
      "rgba(196, 234, 255, 1)",
      1.1
    );
    return true;
  }

  function getRifleDamage() {
    return (services.isEngineer() ? 12 : services.isBountyHunter() ? 20 : 16) + player.bonusDamage + player.weaponDetailDamageLevel * services.getWeaponUpgradeRules().damage.step;
  }

  function getRifleMaxAmmo() {
    return (services.isEngineer() ? 16 : services.isBountyHunter() ? 8 : 30) + player.weaponDetailAmmoLevel * services.getWeaponUpgradeRules().ammo.step;
  }

  function getRifleReloadDuration() {
    return Math.max(0.4, 1.2 - player.weaponDetailReloadLevel * services.getWeaponUpgradeRules().reload.step);
  }

  function getRifleRange() {
    return GRID_SIZE * 5 + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.step;
  }

  function getRifleFireInterval() {
    return Math.max(0.03, (services.isEngineer() ? 0.28 : services.isBountyHunter() ? 0.3 : 0.08) - player.weaponDetailFireRateLevel * services.getWeaponUpgradeRules().fireRate.rifleStep);
  }

  function getClassWeaponCooldown(selected) {
    return Math.max(0.5, (selected?.cooldown || 1) - player.weaponDetailFireRateLevel * services.getWeaponUpgradeRules().fireRate.classStep);
  }

  function getAxeDamage() {
    return 18 + player.bonusDamage + player.weaponDetailDamageLevel * services.getWeaponUpgradeRules().damage.step;
  }

  function getHeroAttackDamage(selected = services.getSelectedClassConfig()) {
    if (hero.hasRifle) return getRifleDamage();
    if (hero.hasBow) return getBasicBowDamage();
    if (hero.hasAxe) return getAxeDamage();
    return selected?.effect ? getAbilityDamage(selected) : 0;
  }

  function getBasicBowDamage() {
    return (runtime.CHARACTER_OPTIONS.archer?.damage || 0) + player.bonusDamage + player.weaponDetailDamageLevel * services.getWeaponUpgradeRules().damage.step;
  }

  function getAbilityDamage(selected = services.getSelectedClassConfig()) {
    return (selected?.damage || 0) + player.weaponBonusDamage + player.bonusAbilityDamage + player.weaponDetailDamageLevel * services.getWeaponUpgradeRules().damage.step;
  }

  function getHeroHeadshotChance(selected = services.getSelectedClassConfig()) {
    if (hero.hasRifle) return buildProjectileHeadshotConfig("bullet").headshotChance;
    if (hero.hasBow) return buildProjectileHeadshotConfig("arrow").headshotChance;
    if (hero.hasAxe) return 0;
    if (selected?.effect === "burst") return buildProjectileHeadshotConfig("bullet").headshotChance;
    if (selected?.effect === "projectile") return buildProjectileHeadshotConfig("arrow").headshotChance;
    return 0;
  }

  function getHeroHeadshotDamage(selected = services.getSelectedClassConfig()) {
    let projectileType;
    if (hero.hasRifle) {
      projectileType = "bullet";
    } else if (hero.hasBow) {
      projectileType = "arrow";
    } else if (!hero.hasAxe && ["burst", "projectile"].includes(selected?.effect)) {
      projectileType = selected.effect === "burst" ? "bullet" : "arrow";
    } else {
      return "—";
    }
    return calculateHeadshotDamage(getHeroAttackDamage(selected), buildProjectileHeadshotConfig(projectileType).headshotMultiplier);
  }

  function getAbilityAimAngle() {
    return hero.abilityEffect?.aimAngle ?? hero.facingAngle;
  }

  function isPointInSlash(point) {
    const dx = point.x - hero.x;
    const dy = point.y - hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > hero.slashRadius || dist === 0) {
      return false;
    }

    const angle = Math.atan2(dy, dx);
    const delta = normalizeAngle(angle - getAbilityAimAngle());
    return Math.abs(delta) <= hero.slashHalfAngle;
  }

  function getDamagePopupPoint(target) {
    if (typeof target.w === "number" && typeof target.h === "number") {
      return { x: target.x + target.w / 2, y: target.y - 12 };
    }
    return { x: target.x, y: target.y - target.radius - 10 };
  }

  function getPopupSpawnPoint(baseX, baseY, lane = "center") {
    const horizontalOffsets = lane === "xp"
      ? [26, -26, 40, -40, 54, -54]
      : [0, 18, -18, 32, -32];
    const verticalStep = lane === "xp" ? 18 : 14;

    for (let index = 0; index < horizontalOffsets.length; index += 1) {
      const candidate = {
        x: baseX + horizontalOffsets[index],
        y: baseY - Math.floor(index / 2) * verticalStep,
      };
      const overlaps = damagePopups.some((popup) =>
        Math.abs(popup.x - candidate.x) < 28 &&
        Math.abs(popup.y - candidate.y) < 18 &&
        popup.ttl > 0.15
      );
      if (!overlaps) {
        return candidate;
      }
    }

    return {
      x: baseX + (lane === "xp" ? 26 : 0),
      y: baseY - verticalStep * 2,
    };
  }

  function getRandomDamagePopupVector() {
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    return {
      offsetX: direction.x * 20,
      offsetY: direction.y * 20,
      driftX: direction.x * 34,
      driftY: direction.y * 34,
    };
  }

  function spawnDamagePopup(target, amount) {
    const point = getDamagePopupPoint(target);
    const vector = getRandomDamagePopupVector();
    const popupPoint = getPopupSpawnPoint(point.x + vector.offsetX, point.y + vector.offsetY, "damage");
    damagePopups.push({
      x: popupPoint.x,
      y: popupPoint.y,
      amount,
      ttl: 0.6,
      maxTtl: 0.6,
      color: "rgba(255, 230, 140, 1)",
      outline: "rgba(35, 20, 10, 1)",
      driftX: vector.driftX,
      driftY: vector.driftY,
    });
  }

  function spawnTextPopup(x, y, text, color = "rgba(255, 230, 140, 1)", ttl = 0.9) {
    const popupPoint = getPopupSpawnPoint(x, y, String(text).includes("XP") ? "xp" : "center");
    damagePopups.push({
      x: popupPoint.x,
      y: popupPoint.y,
      amount: text,
      ttl,
      maxTtl: ttl,
      color,
      outline: "rgba(35, 20, 10, 1)",
    });
  }

  function getEntityHelmetType(target) {
    if (!target) {
      return null;
    }

    if (target.equippedHelmetType) {
      return target.equippedHelmetType;
    }

    const latestPickupType = target.latestPickup?.type;
    if (latestPickupType === "helmet" || latestPickupType === "rareHelmet" || latestPickupType === "goldHelmet" || latestPickupType === "enemyHelmet") {
      return latestPickupType;
    }

    if (target === runtime.enemyHero && target.equippedArmorValue > 0) {
      return "enemyHelmet";
    }

    return null;
  }

  function getHeadshotProtectionForTarget(target) {
    const helmetType = getEntityHelmetType(target);
    return helmetType ? (HELMET_HEADSHOT_PROTECTION[helmetType] || 0) : 0;
  }

  function buildProjectileHeadshotConfig(projectileType) {
    const config = RANGED_HEADSHOT_CONFIG[projectileType] || {};
    return {
      headshotChance: config.headshotChance ?? 0,
      headshotMultiplier: services.isBountyHunter() && hero.vehicleId === null && projectileType === "bullet" ? services.getSelectedClassConfig().headshotMultiplier : (config.headshotMultiplier ?? 2),
    };
  }

  function calculateHeadshotDamage(baseDamage, multiplier, helmetProtection = 0) {
    const extraDamage = baseDamage * Math.max(0, multiplier - 1);
    return Math.max(1, Math.round(baseDamage + extraDamage * (1 - helmetProtection)));
  }

  function applyRangedProjectileHit(target, projectile) {
    const baseDamage = projectile.baseDamage ?? projectile.damage;
    const projectileType = projectile.projectileType || "bullet";
    const headshotChance = projectile.headshotChance ?? buildProjectileHeadshotConfig(projectileType).headshotChance;
    const headshotMultiplier = projectile.headshotMultiplier ?? buildProjectileHeadshotConfig(projectileType).headshotMultiplier;
    const isHeadshot = Boolean(projectile.canHeadshot) && Math.random() < headshotChance;

    let finalDamage = baseDamage;
    if (isHeadshot) {
      const helmetProtection = getHeadshotProtectionForTarget(target);
      finalDamage = calculateHeadshotDamage(baseDamage, headshotMultiplier, helmetProtection);
    }

    finalDamage = Math.max(1, Math.round(finalDamage));
    if (dealDamage(target, finalDamage, true, projectile.sourceClass) === false) return;

    if (isHeadshot) {
      const popupPoint = getDamagePopupPoint(target);
      spawnTextPopup(popupPoint.x, popupPoint.y - 22, "HEADSHOT", "rgba(255, 132, 132, 1)", 0.8);
    }
  }

  function dealDamage(target, amount, showPopup = false, sourceClass = null) {
    if (sourceClass === "bountyHunter" && services.isBountyHunter() && hero.hunterMarkTimer > 0 && target.id === hero.hunterMarkTargetId) amount *= 1.25;
    if (target === hero && services.getOccupiedHumvee()) target = services.getOccupiedHumvee();
    if (target === hero && services.isEngineer() && amount > 0) amount *= 100 / (100 + services.getTotalArmor());
    if (target.type === "humvee" && amount > 0) {
      if (target.hp <= 0) return false;
      if (target.techActive && target.tech === "trophy" && Math.random() < 0.4) {
        spawnTextPopup(target.x + target.w / 2, target.y - 25,
          "Trophy System: Blocked!", "rgba(156, 225, 255, 1)", 1.1);
        return false;
      }
      target.repairDelay = 5;
    }
    target.hp -= amount;
    if (showPopup) {
      spawnDamagePopup(target, amount);
    }
  }

  function damageEnemiesInCone(damage, radius, halfAngle) {
    const originalRadius = hero.slashRadius;
    const originalAngle = hero.slashHalfAngle;
    hero.slashRadius = radius;
    hero.slashHalfAngle = halfAngle;

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (isPointInSlash(enemies[i])) {
        dealDamage(enemies[i], damage, true, hero.selectedClass);
      }
    }
    if (isPointInSlash(runtime.enemyHero)) {
      dealDamage(runtime.enemyHero, damage, true, hero.selectedClass);
    }
    for (const building of buildings) {
      if (!building.isPlayer && isPointInSlash(services.getEntityTargetPoint(building))) {
        dealDamage(building, damage, true, hero.selectedClass);
      }
    }

    hero.slashRadius = originalRadius;
    hero.slashHalfAngle = originalAngle;
  }

  function damageEnemiesInRadius(damage, radius) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (distance(hero, enemies[i]) <= radius) {
        dealDamage(enemies[i], damage, true, hero.selectedClass);
      }
    }
    if (distance(hero, runtime.enemyHero) <= radius) {
      dealDamage(runtime.enemyHero, damage, true, hero.selectedClass);
    }
    for (const building of buildings) {
      if (!building.isPlayer && distance(hero, services.getEntityTargetPoint(building)) <= radius + 24) {
        dealDamage(building, damage, true, hero.selectedClass);
      }
    }
  }

  function damageEnemiesInRadiusFromPoint(centerX, centerY, damage, radius, ignoredId = null) {
    const center = { x: centerX, y: centerY };
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const dist = distance(center, enemies[i]);
      if (dist <= radius) {
        const scaledDamage = Math.max(8, Math.round(damage * (1 - dist / radius * 0.6)));
        dealDamage(enemies[i], scaledDamage, true);
      }
    }
    if (runtime.enemyHero.active) {
      const dist = distance(center, runtime.enemyHero);
      if (dist <= radius) {
        const scaledDamage = Math.max(8, Math.round(damage * (1 - dist / radius * 0.6)));
        dealDamage(runtime.enemyHero, scaledDamage, true);
      }
    }
    for (const building of buildings) {
      if (!building.isPlayer && building.id !== ignoredId) {
        const dist = distance(center, services.getEntityTargetPoint(building));
        if (dist <= radius + 24) {
          const scaledDamage = Math.max(10, Math.round(damage * (1 - dist / (radius + 24) * 0.5)));
          dealDamage(building, scaledDamage, true);
        }
      }
    }
  }

  function destroyEnvironmentInRadius(centerX, centerY, radius) {
    const center = { x: centerX, y: centerY };

    for (let i = trees.length - 1; i >= 0; i -= 1) {
      const tree = trees[i];
      if (distance(center, tree) <= radius + tree.radius) {
        if (runtime.harvestTreeId === tree.id) {
          services.cancelHarvest();
        }
        spawnTextPopup(tree.x, tree.y - tree.radius - 10, "Tree down", "rgba(201, 255, 184, 1)", 0.8);
        trees.splice(i, 1);
      }
    }

    for (let i = stones.length - 1; i >= 0; i -= 1) {
      const stone = stones[i];
      if (distance(center, stone) <= radius + stone.radius) {
        spawnTextPopup(stone.x, stone.y - stone.radius - 10, "Rock blasted", "rgba(214, 226, 235, 1)", 0.8);
        stones.splice(i, 1);
      }
    }

    for (const target of tutorialRangeTargets) {
      if (target.destroyed) {
        continue;
      }
      if (distance(center, target) <= radius + target.radius) {
        services.destroyTutorialRangeTarget(target, "grenade");
      }
    }
  }

  function damageEnemiesInLine(damage, range, width) {
    const aimAngle = getAbilityAimAngle();
    const start = { x: hero.x, y: hero.y };
    const end = {
      x: hero.x + Math.cos(aimAngle) * range,
      y: hero.y + Math.sin(aimAngle) * range,
    };

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (distanceToSegment(enemies[i], start, end) <= width) {
        dealDamage(enemies[i], damage, true);
      }
    }
    if (distanceToSegment(runtime.enemyHero, start, end) <= width) {
      dealDamage(runtime.enemyHero, damage, true);
    }
    for (const building of buildings) {
      if (!building.isPlayer && distanceToSegment(services.getEntityTargetPoint(building), start, end) <= width + 18) {
        dealDamage(building, damage, true);
      }
    }
  }

  function buildBurstShots(range, rounds, spreadAngle, shotAnglesDegrees) {
    const shots = [];
    const customAngles = shotAnglesDegrees?.length
      ? shotAnglesDegrees.slice(0, rounds).map((degrees) => (degrees * Math.PI) / 180)
      : null;
    const startAngleOffset = -spreadAngle / 2;
    const angleStep = rounds > 1 ? spreadAngle / (rounds - 1) : 0;

    for (let index = 0; index < rounds; index += 1) {
      const angleOffset = customAngles
        ? customAngles[index]
        : startAngleOffset + angleStep * index;

      shots.push({ angleOffset, range });
    }

    return shots;
  }

  function getClampedGrenadeTarget(targetX, targetY) {
    const dx = targetX - hero.x;
    const dy = targetY - hero.y;
    const distanceToTarget = Math.hypot(dx, dy);
    if (distanceToTarget <= 0.001) {
      return { x: hero.x, y: hero.y, distance: 0 };
    }
    const clampedDistance = Math.min(distanceToTarget, SOLDIER_GRENADE_RANGE);
    const scale = clampedDistance / distanceToTarget;
    return {
      x: hero.x + dx * scale,
      y: hero.y + dy * scale,
      distance: clampedDistance,
    };
  }

  function explodeGrenade(grenade) {
    const radius = grenade.explosionRadius ?? SOLDIER_GRENADE_RADIUS;
    const damage = grenade.damage ?? (SOLDIER_GRENADE_DAMAGE + player.weaponBonusDamage);
    const particles = [];
    const particleCount = grenade.particleCount ?? 34;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distanceScale = 0.45 + Math.random() * 0.75;
      particles.push({
        angle,
        targetRadius: radius * distanceScale,
        size: 1.4 + Math.random() * 2.8,
        drift: (Math.random() - 0.5) * 20,
        speedScale: 0.8 + Math.random() * 0.4,
        color: Math.random() > 0.5
          ? "255, 232, 132"
          : Math.random() > 0.45
            ? "255, 194, 88"
            : "255, 248, 200",
      });
    }

    grenadeShockwaves.push({
      x: grenade.targetX,
      y: grenade.targetY,
      radius,
      ttl: grenade.effectDuration ?? 0.22,
      maxTtl: grenade.effectDuration ?? 0.22,
      coreScale: grenade.coreScale ?? 1,
      particles,
    });
    damageEnemiesInRadiusFromPoint(grenade.targetX, grenade.targetY, damage, radius, grenade.ownerId);
    destroyEnvironmentInRadius(grenade.targetX, grenade.targetY, radius);
    spawnTextPopup(grenade.targetX, grenade.targetY - 18, "BOOM", "rgba(255, 210, 138, 1)", 0.5);
  }

  function updateGrenades(dt) {
    for (let i = heroGrenades.length - 1; i >= 0; i -= 1) {
      const grenade = heroGrenades[i];
      grenade.ttl = Math.max(0, grenade.ttl - dt);
      const progress = 1 - grenade.ttl / grenade.maxTtl;
      grenade.x = grenade.startX + (grenade.targetX - grenade.startX) * progress;
      grenade.y = grenade.startY + (grenade.targetY - grenade.startY) * progress;
      if (grenade.ttl === 0) {
        explodeGrenade(grenade);
        heroGrenades.splice(i, 1);
      }
    }

    for (let i = grenadeShockwaves.length - 1; i >= 0; i -= 1) {
      grenadeShockwaves[i].ttl = Math.max(0, grenadeShockwaves[i].ttl - dt);
      if (grenadeShockwaves[i].ttl === 0) {
        grenadeShockwaves.splice(i, 1);
      }
    }
  }

  function spawnBurstProjectile(shot, damage, width) {
    const angle = (shot.baseAngle ?? hero.facingAngle) + shot.angleOffset;
    const headshotConfig = buildProjectileHeadshotConfig("bullet");
    return {
      x: hero.x,
      y: hero.y,
      angle,
      speed: 720,
      radius: Math.max(4, width * 0.45),
      damage,
      baseDamage: damage,
      width,
      traveled: 0,
      maxDistance: shot.range,
      active: true,
      hitIds: new Set(),
      sourceClass: hero.vehicleId === null ? hero.selectedClass : null,
      ricochetCount: 0,
      ricochetTimer: 0,
      projectileType: "bullet",
      canHeadshot: true,
      headshotChance: headshotConfig.headshotChance,
      headshotMultiplier: headshotConfig.headshotMultiplier,
    };
  }

  function spawnAbilityProjectile(config) {
    const projectileType = config.projectileType || "arrow";
    const headshotConfig = buildProjectileHeadshotConfig(projectileType);
    return {
      x: hero.x,
      y: hero.y,
      angle: hero.facingAngle,
      speed: config.speed || 820,
      radius: Math.max(4, (config.width || 10) * 0.45),
      damage: config.damage,
      baseDamage: config.damage,
      width: config.width || 10,
      traveled: 0,
      maxDistance: config.range,
      active: true,
      sourceClass: hero.selectedClass,
      stopOnHit: true,
      style: config.style || "arrow",
      projectileType,
      canHeadshot: config.canHeadshot ?? true,
      headshotChance: config.headshotChance ?? headshotConfig.headshotChance,
      headshotMultiplier: config.headshotMultiplier ?? headshotConfig.headshotMultiplier,
    };
  }

  function buildArcherArrowProjectile(damageOverride = null) {
    const archerClass = runtime.CHARACTER_OPTIONS.archer || {};
    return spawnAbilityProjectile({
      damage: damageOverride ?? getAbilityDamage(archerClass),
      width: archerClass.width || 10,
      range: Math.round(services.viewport.width * 0.5) + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.step,
      style: "arrow",
      speed: 820,
      projectileType: "arrow",
      canHeadshot: true,
    });
  }

  function spawnRicochetSparks(x, y, angle) {
    for (let index = 0; index < 7; index += 1) {
      const spread = (Math.random() - 0.5) * 1.5;
      sparkEffects.push({
        x,
        y,
        angle: angle + Math.PI + spread,
        speed: 130 + Math.random() * 110,
        length: 7 + Math.random() * 8,
        ttl: 0.12 + Math.random() * 0.12,
        maxTtl: 0.24,
        color: Math.random() > 0.35 ? "#ffd98f" : "#fff8d6",
      });
    }
  }

  function updateBurstProjectile(projectile, dt) {
    const step = projectile.speed * dt;
    projectile.x += Math.cos(projectile.angle) * step;
    projectile.y += Math.sin(projectile.angle) * step;
    projectile.traveled += step;

    if (projectile.ricochetTimer > 0) {
      projectile.ricochetTimer = Math.max(0, projectile.ricochetTimer - dt);
      if (projectile.ricochetTimer === 0) {
        projectile.active = false;
        return;
      }
    }

    for (const tree of trees) {
      if (services.intersectsTree(projectile, projectile.radius, tree)) {
        projectile.active = false;
        if (projectile.damagesTrees) {
          tree.mountedGunHitsRemaining ??= 3 + Math.floor(Math.random() * 4);
          tree.mountedGunHitsRemaining -= 1;
          if (tree.mountedGunHitsRemaining <= 0) {
            if (runtime.harvestTreeId === tree.id) services.cancelHarvest();
            trees.splice(trees.indexOf(tree), 1);
            spawnTextPopup(tree.x, tree.y - tree.radius - 10, "Tree down", "rgba(201, 255, 184, 1)", 0.8);
          }
        }
        return;
      }
    }

    for (const stone of stones) {
      if (services.intersectsStone(projectile, projectile.radius, stone)) {
        if (projectile.ricochetCount > 0) {
          projectile.active = false;
          return;
        }

        const normalX = projectile.x - stone.x;
        const normalY = projectile.y - stone.y;
        const normalLength = Math.hypot(normalX, normalY) || 1;
        const nx = normalX / normalLength;
        const ny = normalY / normalLength;
        const inX = Math.cos(projectile.angle);
        const inY = Math.sin(projectile.angle);
        const dot = inX * nx + inY * ny;
        const reflectedX = inX - 2 * dot * nx;
        const reflectedY = inY - 2 * dot * ny;

        projectile.angle = Math.atan2(reflectedY, reflectedX);
        projectile.x = stone.x + nx * (stone.radius + projectile.radius + 2);
        projectile.y = stone.y + ny * (stone.radius + projectile.radius + 2);
        projectile.ricochetCount = 1;
        projectile.ricochetTimer = 0.09;
        projectile.maxDistance = Math.min(projectile.maxDistance, projectile.traveled + 90);
        spawnRicochetSparks(projectile.x, projectile.y, projectile.angle);
        return;
      }
    }

    if (services.tryHitTutorialRangeTarget(projectile)) {
      return;
    }

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (!projectile.hitIds.has(enemies[i].id) && distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
        applyRangedProjectileHit(enemies[i], projectile);
        projectile.hitIds.add(enemies[i].id);
      }
    }

    if (!projectile.hitIds.has(runtime.enemyHero.id) && distance(projectile, runtime.enemyHero) <= projectile.radius + runtime.enemyHero.radius) {
      applyRangedProjectileHit(runtime.enemyHero, projectile);
      projectile.hitIds.add(runtime.enemyHero.id);
    }

    for (const building of buildings) {
      if (!building.isPlayer && !projectile.hitIds.has(building.id) && services.intersectsBuilding(projectile, projectile.radius, building)) {
        dealDamage(building, projectile.damage, true, projectile.sourceClass);
        projectile.hitIds.add(building.id);
      }
    }

    if (projectile.ownerId !== undefined) {
      if (projectile.traveled >= projectile.maxDistance || projectile.x < 0 || projectile.y < 0
        || projectile.x > WORLD.width || projectile.y > services.getWorldHeight()) projectile.active = false;
      return;
    }
    const offscreenMargin = 24;
    if (
      projectile.traveled >= projectile.maxDistance ||
      projectile.x < camera.x - offscreenMargin ||
      projectile.y < camera.y - offscreenMargin ||
      projectile.x > camera.x + services.viewport.width + offscreenMargin ||
      projectile.y > camera.y + services.viewport.height + offscreenMargin
    ) {
      projectile.active = false;
    }
  }

  function updateAbilityProjectile(projectile, dt) {
    const step = projectile.speed * dt;
    projectile.x += Math.cos(projectile.angle) * step;
    projectile.y += Math.sin(projectile.angle) * step;
    projectile.traveled += step;

    for (const tree of trees) {
      if (services.intersectsTree(projectile, projectile.radius, tree)) {
        projectile.active = false;
        return;
      }
    }

    for (const stone of stones) {
      if (services.intersectsStone(projectile, projectile.radius, stone)) {
        projectile.active = false;
        return;
      }
    }

    if (services.tryHitTutorialRangeTarget(projectile)) {
      return;
    }

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
        applyRangedProjectileHit(enemies[i], projectile);
        projectile.active = false;
        return;
      }
    }

    if (distance(projectile, runtime.enemyHero) <= projectile.radius + runtime.enemyHero.radius) {
      applyRangedProjectileHit(runtime.enemyHero, projectile);
      projectile.active = false;
      return;
    }

    for (const building of buildings) {
      if (!building.isPlayer && services.intersectsBuilding(projectile, projectile.radius, building)) {
        dealDamage(building, projectile.damage, true, projectile.sourceClass);
        projectile.active = false;
        return;
      }
    }

    const offscreenMargin = 24;
    if (
      projectile.traveled >= projectile.maxDistance ||
      projectile.x < camera.x - offscreenMargin ||
      projectile.y < camera.y - offscreenMargin ||
      projectile.x > camera.x + services.viewport.width + offscreenMargin ||
      projectile.y > camera.y + services.viewport.height + offscreenMargin
    ) {
      projectile.active = false;
    }
  }

  function updateHeroProjectiles(dt) {
    for (let i = heroProjectiles.length - 1; i >= 0; i -= 1) {
      if (heroProjectiles[i].style === "engineerBolt") {
        services.updateEngineerProjectile(heroProjectiles[i], dt);
      } else if (heroProjectiles[i].style === "explosiveBolt") {
        services.updateExplosiveBolt(heroProjectiles[i], dt);
      } else if (heroProjectiles[i].style === "smartMissile") {
        services.updateSmartMissile(heroProjectiles[i], dt);
      } else if (heroProjectiles[i].explosionRadius) {
        services.updateHumveeShell(heroProjectiles[i], dt);
      } else if (heroProjectiles[i].style === "arrow") {
        updateAbilityProjectile(heroProjectiles[i], dt);
      } else {
        updateBurstProjectile(heroProjectiles[i], dt);
      }
      if (!heroProjectiles[i].active) {
        heroProjectiles.splice(i, 1);
      }
    }
  }

  function useAxeSwing() {
    if (hero.vehicleId !== null) return false;
    if (!player.hasSelectedCharacter || player.victory || player.loss || !hero.hasAxe) {
      return;
    }

    hero.axeSwingTimer = hero.axeSwingDuration;
    damageEnemiesInCone(
      getAxeDamage(),
      64 + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.meleeStep,
      Math.PI / 3
    );
  }

  function startReload(force = false) {
    if (hero.vehicleId !== null) return false;
    if (!hero.hasRifle || hero.isReloading || services.isUsingBattleMedicine()) {
      return false;
    }
    if (!force && hero.ammo > 0) {
      return false;
    }
    if (hero.ammo >= hero.maxAmmo) {
      return false;
    }

    hero.isReloading = true;
    hero.reloadTimer = hero.reloadDuration;
    return true;
  }

  function spawnHeroBullet(targetX, targetY) {
    if (hero.vehicleId !== null) return false;
    if (!hero.hasRifle || hero.isReloading || hero.rifleCooldown > 0 || hero.ammo <= 0 || hero.shootLockTimer > 0 || services.isUsingBattleMedicine()) {
      return false;
    }

    const dx = targetX - hero.x;
    const dy = targetY - hero.y;
    const distanceToTarget = Math.hypot(dx, dy);
    if (distanceToTarget < 1) {
      return false;
    }

    const angle = Math.atan2(dy, dx);
    hero.facingAngle = angle;
    hero.rifleCooldown = getRifleFireInterval();
    hero.rifleShotAnimationTimer = 0.15;
    hero.rifleShotAngle = angle;
    hero.ammo -= 1;
    heroProjectiles.push({
      ...(services.isEngineer() ? services.buildEngineerProjectile(hero, angle, getRifleDamage(), getRifleRange()) : spawnBurstProjectile({ angleOffset: 0, range: getRifleRange() }, getRifleDamage(), 18)),
      x: hero.x,
      y: hero.y,
      angle,
      canHeadshot: true,
    });
    if (hero.ammo === 0) {
      startReload();
    }
    return true;
  }

  function spawnHeroBowShot(targetX, targetY) {
    if (hero.vehicleId !== null) return false;
    if (!hero.hasBow || hero.bowCooldown > 0 || hero.shootLockTimer > 0) {
      return false;
    }

    const dx = targetX - hero.x;
    const dy = targetY - hero.y;
    const distanceToTarget = Math.hypot(dx, dy);
    if (distanceToTarget < 1) {
      return false;
    }

    hero.facingAngle = Math.atan2(dy, dx);
    hero.bowCooldown = Math.max(0.12, 0.45 - player.weaponDetailFireRateLevel * services.getWeaponUpgradeRules().fireRate.bowStep);
    heroProjectiles.push({
      ...buildArcherArrowProjectile(getBasicBowDamage()),
      x: hero.x,
      y: hero.y,
      angle: hero.facingAngle,
    });
    return true;
  }

  function updateDamagePopups(dt) {
    for (let index = damagePopups.length - 1; index >= 0; index -= 1) {
      const popup = damagePopups[index];
      popup.ttl -= dt;
      popup.x += (popup.driftX || 0) * dt;
      popup.y += (popup.driftY ?? -34) * dt;
      if (popup.ttl <= 0) {
        damagePopups.splice(index, 1);
      }
    }
  }

  function updateSparkEffects(dt) {
    for (let index = sparkEffects.length - 1; index >= 0; index -= 1) {
      const spark = sparkEffects[index];
      spark.ttl -= dt;
      spark.x += Math.cos(spark.angle) * spark.speed * dt;
      spark.y += Math.sin(spark.angle) * spark.speed * dt;
      spark.speed = Math.max(0, spark.speed - 420 * dt);
      if (spark.ttl <= 0) {
        sparkEffects.splice(index, 1);
      }
    }
  }

  function engineerDamageAfterArmor(target, damage, penetration = 0) {
    const armor = Math.max(0, target.armor || target.stats?.armor || 0, target.equippedArmorValue || 0);
    return damage * 100 / (100 + armor * (1 - penetration));
  }

  function updateReload(dt) {
    if (hero.isReloading) {
      hero.reloadTimer = Math.max(0, hero.reloadTimer - dt);
      if (hero.reloadTimer === 0) {
        hero.isReloading = false;
        hero.ammo = hero.maxAmmo;
      }
    }
  }

  return {
    updateReload,
    isSoldierRifleShooting,
    toggleRifleFireMode,
    getRifleDamage,
    getRifleMaxAmmo,
    getRifleReloadDuration,
    getRifleRange,
    getRifleFireInterval,
    getClassWeaponCooldown,
    getAxeDamage,
    getHeroAttackDamage,
    getBasicBowDamage,
    getAbilityDamage,
    getHeroHeadshotChance,
    getHeroHeadshotDamage,
    getAbilityAimAngle,
    isPointInSlash,
    getDamagePopupPoint,
    getPopupSpawnPoint,
    getRandomDamagePopupVector,
    spawnDamagePopup,
    spawnTextPopup,
    getEntityHelmetType,
    getHeadshotProtectionForTarget,
    buildProjectileHeadshotConfig,
    calculateHeadshotDamage,
    applyRangedProjectileHit,
    dealDamage,
    damageEnemiesInCone,
    damageEnemiesInRadius,
    damageEnemiesInRadiusFromPoint,
    destroyEnvironmentInRadius,
    damageEnemiesInLine,
    buildBurstShots,
    getClampedGrenadeTarget,
    explodeGrenade,
    updateGrenades,
    spawnBurstProjectile,
    spawnAbilityProjectile,
    buildArcherArrowProjectile,
    spawnRicochetSparks,
    updateBurstProjectile,
    updateAbilityProjectile,
    updateHeroProjectiles,
    useAxeSwing,
    startReload,
    spawnHeroBullet,
    spawnHeroBowShot,
    updateDamagePopups,
    updateSparkEffects,
    engineerDamageAfterArmor,
  };
}

export { createCombatSystem };
