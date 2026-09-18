import { clamp, distance } from "./modules/math.js";
import {
  camera,
  enemies,
  nextId,
  player,
  runtime,
  units,
} from "./modules/state.js";
import { WORLD } from "./modules/constants.js";
import { inputState } from "./inputs.js";
import { ctx } from "./modules/dom.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createUnitsSystem(services) {
  function createUnit(kind, x, y, isPlayer) {
    const enemyConfig = !isPlayer ? runtime.ENEMY_OPTIONS[kind] : null;
    if (!isPlayer && !enemyConfig) {
      throw new Error(`Missing enemy config for unit kind: ${kind}`);
    }

    const unit = {
      id: nextId(),
      kind,
      isPlayer,
      x,
      y,
      radius: isPlayer ? 14 : enemyConfig.radius,
      speed: isPlayer ? 112 : enemyConfig.speed,
      hp: isPlayer ? 100 : enemyConfig.hp,
      maxHp: isPlayer ? 100 : enemyConfig.hp,
      damage: isPlayer ? 10 : enemyConfig.damage,
      armor: isPlayer ? 0 : (enemyConfig.armor || 0),
      xpReward: isPlayer ? 0 : enemyConfig.xp,
      attackRange: isPlayer ? 34 : enemyConfig.attackRange,
      attackCooldown: isPlayer ? 1 : enemyConfig.attackCooldown,
      attackStyle: isPlayer ? "melee" : (enemyConfig.attackStyle || "melee"),
      preferredRange: isPlayer ? 0 : (enemyConfig.preferredRange || enemyConfig.attackRange),
      retreatRange: isPlayer ? 0 : (enemyConfig.retreatRange || 0),
      projectileSpeed: isPlayer ? 0 : (enemyConfig.projectileSpeed || 0),
      projectileRadius: isPlayer ? 0 : (enemyConfig.projectileRadius || 0),
      projectileType: isPlayer ? null : (enemyConfig.projectileType || null),
      attackTimer: 0,
      targetPos: null,
      targetUnitId: null,
      targetBuildingId: null,
      selected: false,
    };

    if (isPlayer) {
      units.push(unit);
    } else {
      enemies.push(unit);
    }

    return unit;
  }

  function clearUnitSelection() {
    for (const unit of units) {
      unit.selected = false;
    }
  }

  function selectUnitsInBox(box) {
    clearUnitSelection();
    player.selectedUnits = units
      .filter((unit) =>
        unit.x >= Math.min(box.x1, box.x2) &&
        unit.x <= Math.max(box.x1, box.x2) &&
        unit.y >= Math.min(box.y1, box.y2) &&
        unit.y <= Math.max(box.y1, box.y2)
      )
      .map((unit) => unit.id);

    for (const unit of units) {
      unit.selected = player.selectedUnits.includes(unit.id);
    }
    player.selectedBuildingId = null;
    services.updateTrainButton();
    services.updateBuildBarracksButton();
  }

  function selectSingleUnit(unit) {
    clearUnitSelection();
    player.selectedUnits = [unit.id];
    unit.selected = true;
    player.selectedBuildingId = null;
    services.updateTrainButton();
    services.updateBuildBarracksButton();
  }

  function getUnitAt(point, list) {
    return list.find((unit) => distance(point, unit) <= unit.radius);
  }

  function setSelectedUnitsMoveTarget(x, y) {
    const selectedUnits = units.filter((unit) => player.selectedUnits.includes(unit.id));
    if (!selectedUnits.length) {
      return;
    }

    const spacing = 26;
    const cols = Math.ceil(Math.sqrt(selectedUnits.length));
    selectedUnits.forEach((unit, index) => {
      const offsetX = (index % cols) * spacing - ((cols - 1) * spacing) / 2;
      const offsetY = Math.floor(index / cols) * spacing - ((cols - 1) * spacing) / 2;
      unit.targetPos = { x: x + offsetX, y: y + offsetY };
      unit.targetUnitId = null;
      unit.targetBuildingId = null;
    });
  }

  function setSelectedUnitsAttackTarget(target) {
    const selectedUnits = units.filter((unit) => player.selectedUnits.includes(unit.id));
    for (const unit of selectedUnits) {
      unit.targetUnitId = target.kind ? target.id : null;
      unit.targetBuildingId = target.type ? target.id : null;
      unit.targetPos = { x: target.x, y: target.y };
    }
  }

  function getEntityTargetPoint(target) {
    if (typeof target.w === "number" && typeof target.h === "number") {
      return { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    }
    return { x: target.x, y: target.y };
  }

  function isBuildingTarget(target) {
    return typeof target.w === "number" && typeof target.h === "number";
  }

  function getClosestTarget(unit, unitsList, buildingsList) {
    let closest = null;
    let closestDistance = Infinity;

    for (const otherUnit of unitsList) {
      if (otherUnit.hp <= 0 || otherUnit.active === false) continue;
      const dist = distance(unit, otherUnit);
      if (dist < closestDistance) {
        closest = otherUnit;
        closestDistance = dist;
      }
    }

    for (const building of buildingsList) {
      if (building.hp <= 0) continue;
      const dist = distance(unit, getEntityTargetPoint(building));
      if (dist < closestDistance) {
        closest = building;
        closestDistance = dist;
      }
    }

    return closest;
  }

  function updateUnits(dt, list, enemiesList, enemyBuildings) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const unit = list[i];
      unit.attackTimer = Math.max(0, unit.attackTimer - dt);

      let target = null;
      if (unit.targetUnitId) {
        target = enemiesList.find((enemy) => enemy.id === unit.targetUnitId) || null;
      } else if (unit.targetBuildingId) {
        target = enemyBuildings.find((building) => building.id === unit.targetBuildingId) || null;
      }

      if (target?.hp <= 0) { target = null; unit.targetUnitId = null; unit.targetBuildingId = null; }
      if (!target) {
        target = !unit.isPlayer && unit.spawnerId
          ? services.getForestEnemyTarget(unit)
          : unit.isPlayer
          ? (enemiesList.find((enemy) => distance(unit, enemy) <= 150) ||
            enemyBuildings.find((building) => distance(unit, { x: building.x + building.w / 2, y: building.y + building.h / 2 }) <= 180) ||
            null)
          : getClosestTarget(unit, enemiesList, enemyBuildings);
        if (target) {
          unit.targetUnitId = isBuildingTarget(target) ? null : target.id;
          unit.targetBuildingId = isBuildingTarget(target) ? target.id : null;
        }
      }

      if (target) {
        const targetPoint = getEntityTargetPoint(target);
        const dist = distance(unit, targetPoint);
        const useRangedLogic = !unit.isPlayer && unit.attackStyle === "ranged" && !isBuildingTarget(target);
        if (!unit.isPlayer && unit.spawnerId && dist > (unit.aggroRange || 220) + 35) {
          unit.targetUnitId = null;
          unit.targetBuildingId = null;
          target = null;
        }
        if (!target) {
          continue;
        }
        if (useRangedLogic && dist < unit.retreatRange) {
          moveAway(unit, targetPoint.x, targetPoint.y, dt);
        } else if (dist > (useRangedLogic ? unit.preferredRange : unit.attackRange)) {
          moveTowards(unit, targetPoint.x, targetPoint.y, dt);
        } else if (unit.attackTimer === 0) {
          if (useRangedLogic) {
            services.fireEnemyProjectile(unit, target);
          } else {
            services.dealDamage(target, unit.damage, unit.isPlayer);
          }
          unit.attackTimer = unit.attackCooldown;
        }
        unit.targetPos = { x: targetPoint.x, y: targetPoint.y };
      } else if (unit.targetPos) {
        const dist = distance(unit, unit.targetPos);
        if (dist > 6) {
          moveTowards(unit, unit.targetPos.x, unit.targetPos.y, dt);
        }
      }

      if (unit.hp <= 0 && unit.isPlayer) {
        list.splice(i, 1);
        player.selectedUnits = player.selectedUnits.filter((id) => id !== unit.id);
      }
    }
  }

  function moveTowards(unit, x, y, dt) {
    const dx = x - unit.x;
    const dy = y - unit.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      return;
    }
    unit.x += (dx / dist) * unit.speed * dt;
    unit.y += (dy / dist) * unit.speed * dt;
  }

  function moveAway(unit, x, y, dt) {
    const dx = unit.x - x;
    const dy = unit.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      return;
    }
    unit.x = clamp(unit.x + (dx / dist) * unit.speed * dt, unit.radius, WORLD.width - unit.radius);
    unit.y = clamp(unit.y + (dy / dist) * unit.speed * dt, unit.radius, services.getWorldHeight() - unit.radius);
  }

  function drawSelectionBox() {
    if (!inputState.selectionBox) {
      return;
    }
    const x = inputState.selectionBox.x1 - camera.x;
    const y = inputState.selectionBox.y1 - camera.y;
    const w = inputState.selectionBox.x2 - inputState.selectionBox.x1;
    const h = inputState.selectionBox.y2 - inputState.selectionBox.y1;
    ctx.strokeStyle = "rgba(255, 228, 135, 0.9)";
    ctx.fillStyle = "rgba(255, 228, 135, 0.15)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  return {
    createUnit,
    clearUnitSelection,
    selectUnitsInBox,
    selectSingleUnit,
    getUnitAt,
    setSelectedUnitsMoveTarget,
    setSelectedUnitsAttackTarget,
    getEntityTargetPoint,
    isBuildingTarget,
    getClosestTarget,
    updateUnits,
    moveTowards,
    moveAway,
    drawSelectionBox,
  };
}

export { createUnitsSystem };
