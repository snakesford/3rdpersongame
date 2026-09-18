import { distance } from "./modules/math.js";
import {
  enemies,
  enemyProjectiles,
  engineerDeployables,
  forestEnemySpawners,
  forestRespawnQueue,
  hero,
  nextId,
  runtime,
  stones,
  trees,
  units,
} from "./modules/state.js";
import { DEFAULT_ENEMY_NAME, MAIN_LANE_Y, SPAWN_WAVE_TILE, WORLD } from "./modules/constants.js";
import { statusTextEl } from "./modules/dom.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createEnemiesSystem(services) {
  const FOREST_ROAMING_SPAWNS = [
    { id: "roam-g1", kind: "goblin", x: 1168, y: 1068 },
    { id: "roam-g2", kind: "goblin", x: 1288, y: 920 },
    { id: "roam-g3", kind: "goblin", x: 1464, y: 930 },
    { id: "roam-g4", kind: "goblin", x: 1612, y: 782 },
    { id: "roam-a1", kind: "goblinArcher", x: 1378, y: 1106 },
    { id: "roam-a2", kind: "goblinArcher", x: 1718, y: 876 },
  ];

  function createForestEnemySpawner(config) {
    forestEnemySpawners.push({
      hpMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      aggroRange: 220,
      ...config,
    });
  }

  function spawnEnemyFromSpawner(spawner) {
    const enemy = services.createUnit(spawner.kind, spawner.x, spawner.y, false);
    enemy.spawnerId = spawner.id;
    enemy.campId = spawner.campId || null;
    enemy.displayName = spawner.displayName || enemy.displayName;
    enemy.hp = Math.round(enemy.hp * spawner.hpMultiplier);
    enemy.maxHp = enemy.hp;
    enemy.damage = Math.round(enemy.damage * spawner.damageMultiplier);
    enemy.speed *= spawner.speedMultiplier;
    enemy.homeX = spawner.x;
    enemy.homeY = spawner.y;
    enemy.lootTier = spawner.lootTier || (enemy.campId === "hiddenCamp" ? "better" : "normal");
    enemy.aggroRange = spawner.aggroRange;
    return enemy;
  }

  function queueEnemyRespawn(enemy) {
    return enemy;
  }

  function initializeForestEncounterSpawners() {
    forestEnemySpawners.length = 0;
    forestRespawnQueue.length = 0;

    for (const camp of services.FOREST_CAMPS) {
      for (const spawn of camp.spawns) {
        createForestEnemySpawner({
          ...spawn,
          campId: camp.id,
          aggroRange: spawn.kind === "goblinArcher" ? 280 : spawn.kind === "ogre" ? 210 : 230,
        });
      }
    }

    for (const spawn of FOREST_ROAMING_SPAWNS) {
      createForestEnemySpawner({
        ...spawn,
        aggroRange: spawn.kind === "goblinArcher" ? 270 : 220,
      });
    }

    for (const spawner of forestEnemySpawners) {
      spawnEnemyFromSpawner(spawner);
    }
  }

  function initializeEnemyForces() {
    services.createUnit("boss", WORLD.width / 2, MAIN_LANE_Y, false);
    runtime.enemyHero = createEnemyHero(WORLD.width - 250, services.getWorldHeight() - 250);
    runtime.enemyHero.equippedArmorValue = 80;
    runtime.enemyHero.latestPickup = {
    type: "enemyHelmet",
    armorValue: 80,
    radius: 18,
    };
    services.createUnit("enemySoldier", WORLD.width - 300, services.getWorldHeight() - 180, false);
  }

  function createEnemyHero(x, y) {
    const enemyHeroConfig = runtime.ENEMY_OPTIONS.enemyHero;
    if (!enemyHeroConfig) {
      throw new Error("Missing enemy config for enemyHero");
    }

    return {
      id: nextId(),
      kind: "enemyHero",
      displayName: DEFAULT_ENEMY_NAME,
      isPlayer: false,
      x,
      y,
      radius: enemyHeroConfig.radius,
      speed: enemyHeroConfig.speed,
      hp: enemyHeroConfig.hp,
      maxHp: enemyHeroConfig.hp,
      damage: enemyHeroConfig.damage,
      xpReward: enemyHeroConfig.xp,
      attackRange: enemyHeroConfig.attackRange,
      attackCooldown: enemyHeroConfig.attackCooldown,
      attackTimer: 0,
      active: true,
      equippedArmorValue: 0,
      latestPickup: null,
    };
  }

  function spawnSingleSkeleton(x = 200 + Math.random() * 650, y = 90 + Math.random() * 30) {
    services.createUnit("skeleton", x, y, false);
  }

  function spawnSkeletonWave() {
    const positions = [
      [200, 90],
      [320, 110],
      [440, 95],
      [560, 120],
      [680, 100],
      [800, 115],
    ];

    for (const [x, y] of positions) {
      spawnSingleSkeleton(x, y);
    }

    SPAWN_WAVE_TILE.triggered = true;
    services.spawnTextPopup(SPAWN_WAVE_TILE.x + SPAWN_WAVE_TILE.size / 2, SPAWN_WAVE_TILE.y - 10, "Skeleton wave spawned!", "rgba(245, 240, 220, 1)", 1.8);
  }

  function dropLatestPickupFromEnemyHero() {
    if (!runtime.enemyHero.latestPickup) {
      return;
    }

    services.spawnPickupDrop(runtime.enemyHero.latestPickup, runtime.enemyHero.x, runtime.enemyHero.y);
    runtime.enemyHero.latestPickup = null;
  }

  function fireEnemyProjectile(attacker, target) {
    const targetPoint = services.getEntityTargetPoint(target);
    const angle = Math.atan2(targetPoint.y - attacker.y, targetPoint.x - attacker.x);
    enemyProjectiles.push({
      x: attacker.x,
      y: attacker.y,
      angle,
      speed: attacker.projectileSpeed || 420,
      radius: attacker.projectileRadius || 5,
      damage: attacker.damage,
      traveled: 0,
      maxDistance: attacker.attackRange + 40,
      active: true,
      projectileType: attacker.projectileType || "goblinArrow",
    });
  }

  function updateEnemyProjectiles(dt) {
    for (let index = enemyProjectiles.length - 1; index >= 0; index -= 1) {
      const projectile = enemyProjectiles[index];
      const step = projectile.speed * dt;
      projectile.x += Math.cos(projectile.angle) * step;
      projectile.y += Math.sin(projectile.angle) * step;
      projectile.traveled += step;

      let blocked = false;
      for (const tree of trees) {
        if (services.intersectsTree(projectile, projectile.radius, tree)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        for (const stone of stones) {
          if (services.intersectsStone(projectile, projectile.radius, stone)) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) {
        enemyProjectiles.splice(index, 1);
        continue;
      }

      if (distance(projectile, hero) <= projectile.radius + hero.radius) {
        services.dealDamage(hero, projectile.damage, true);
        enemyProjectiles.splice(index, 1);
        continue;
      }

      let hitUnit = false;
      for (const unit of [...units, ...engineerDeployables.filter(d => d.kind === "autoTurret" && d.hp > 0)]) {
        if (distance(projectile, unit) <= projectile.radius + unit.radius) {
          services.dealDamage(unit, projectile.damage, true);
          hitUnit = true;
          break;
        }
      }
      if (hitUnit) {
        enemyProjectiles.splice(index, 1);
        continue;
      }

      if (projectile.traveled >= projectile.maxDistance) {
        enemyProjectiles.splice(index, 1);
      }
    }
  }

  function updateForestSystems(dt) {
    for (const camp of services.FOREST_CAMPS) {
      if (!camp.hidden || services.hasDiscoveredCamp(camp.id)) {
        continue;
      }
      if (distance(hero, camp.center) <= camp.discoveryRadius) {
        services.markCampDiscovered(camp.id);
        statusTextEl.textContent = "Hidden Goblin Camp discovered.";
        break;
      }
    }
  }

  function getForestEnemyTarget(unit) {
    if (!unit.spawnerId) {
      return null;
    }

    const aggroRange = unit.aggroRange || 220;
    const defender = services.getClosestTarget(unit, [hero, ...engineerDeployables.filter(d => d.kind === "autoTurret" && d.hp > 0)], []);
    if (!defender || distance(unit, defender) > aggroRange) {
      unit.targetUnitId = null;
      unit.targetBuildingId = null;
      return null;
    }

    return defender;
  }

  function cleanupDefeatedEnemies() {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.hp > 0) {
        continue;
      }

      if (enemy.kind === "boss") {
        services.spawnRareHelmetDrop(enemy.x, enemy.y);
      }

      if (enemy.tutorialProfessionId === "mercenary") {
        services.completeTutorialProfessionTask("mercenary");
      }

      services.registerContractKill(enemy);
      queueEnemyRespawn(enemy);
      services.awardPlayerXp(enemy.xpReward || 0, enemy.x, enemy.y);
      if (enemy.campId === "hiddenCamp" && Math.random() < 0.28) {
        const lootOptions = [
          { type: "enemyHelmet", armorValue: 80, radius: 18 },
          { type: "weaponBuff", damageValue: 2, radius: 18 },
          { type: "healthBuff", healthValue: 20, radius: 18 },
        ];
        services.spawnPickupDrop(lootOptions[Math.floor(Math.random() * lootOptions.length)], enemy.x + 10, enemy.y);
      }
      enemies.splice(i, 1);
    }
  }

  function cleanupEnemyHero() {
    if (runtime.enemyHero.active && runtime.enemyHero.hp <= 0) {
      runtime.enemyHero.hp = 0;
      services.awardPlayerXp(runtime.enemyHero.xpReward || 0, runtime.enemyHero.x, runtime.enemyHero.y);
      services.dropLatestPickupFromEnemyHero();
      runtime.enemyHero.active = false;
    }

  }

  return {
    cleanupEnemyHero,
    FOREST_ROAMING_SPAWNS,
    createForestEnemySpawner,
    spawnEnemyFromSpawner,
    queueEnemyRespawn,
    initializeForestEncounterSpawners,
    initializeEnemyForces,
    createEnemyHero,
    spawnSingleSkeleton,
    spawnSkeletonWave,
    dropLatestPickupFromEnemyHero,
    fireEnemyProjectile,
    updateEnemyProjectiles,
    updateForestSystems,
    getForestEnemyTarget,
    cleanupDefeatedEnemies,
  };
}

export { createEnemiesSystem };
