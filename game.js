const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const woodCountEl = document.getElementById("woodCount");
const statusTextEl = document.getElementById("statusText");
const overlayMessageEl = document.getElementById("overlayMessage");
const buildBarracksBtn = document.getElementById("buildBarracksBtn");
const trainSoldierBtn = document.getElementById("trainSoldierBtn");
const slashAbilityEl = document.getElementById("slashAbility");
const abilityNameEl = document.getElementById("abilityName");
const slashCooldownTextEl = document.getElementById("slashCooldownText");
const characterSelectEl = document.getElementById("characterSelect");
const classCardEls = document.querySelectorAll(".class-card");

const WORLD = { width: 2400, height: 1400 };
const COLORS = {
  ground: "#a8cb7a",
  path: "#b6c792",
  tree: "#2f6b33",
  trunk: "#5f4023",
  hero: "#2546b8",
  heroAccent: "#93b4ff",
  soldier: "#315ba8",
  enemy: "#9d3737",
  enemyBase: "#7f2727",
  barracks: "#6f4d96",
  selection: "#ffe487",
  previewValid: "rgba(111, 77, 150, 0.45)",
  previewInvalid: "rgba(198, 81, 81, 0.45)",
  healthBg: "rgba(0, 0, 0, 0.32)",
  healthGood: "#83df72",
  healthBad: "#e36a6a",
};

const CHARACTER_OPTIONS = {
  swordsman: {
    name: "Swordsman",
    abilityName: "Slash",
    cooldown: 5,
    portrait: "./images/sowrdsman.png",
    effect: "cone",
    damage: 35,
    radius: 86,
    halfAngle: Math.PI / 2,
  },
  soldier: {
    name: "Soldier",
    abilityName: "Burst Shot",
    cooldown: 8,
    portrait: "./images/soldier.png",
    effect: "burst",
    damage: 8,
    range: 220,
    width: 18,
    rounds: 7,
    shotAnglesDegrees: [0, 24, -10, -18, 8, 16, -26],
  },
  mage: {
    name: "Mage",
    abilityName: "Arcane Nova",
    portrait: "./images/mage.png",
    cooldown: 8,
    effect: "nova",
    damage: 30,
    radius: 124,
  },
  robot: {
    name: "Robot",
    abilityName: "Pulse Wave",
    cooldown: 8,
    portrait: "./images/robot.png",
    effect: "cone",
    damage: 25,
    radius: 132,
    halfAngle: Math.PI * 0.7,
  },
};

const player = {
  wood: 1000,
  selectedUnits: [],
  selectedBuildingId: null,
  isPlacingBuilding: false,
  victory: false,
  loss: false,
  hasBuiltBarracks: false,
  hasSelectedCharacter: false,
};

const camera = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
const keys = new Set();

let entityId = 1;
let selectionBox = null;
let harvestTreeId = null;
let lastTimestamp = 0;

const hero = {
  id: nextId(),
  x: 220,
  y: 700,
  radius: 18,
  speed: 220,
  hp: 150,
  maxHp: 150,
  facingAngle: 0,
  slashCooldown: 8,
  slashTimer: 0,
  slashRadius: 86,
  slashHalfAngle: Math.PI / 2,
  slashDamage: 35,
  slashArcTimer: 0,
  selectedClass: null,
  abilityEffect: null,
  harvestTime: 1.4,
  harvestProgress: 0,
  isHarvesting: false,
};

const trees = [];
const buildings = [];
const units = [];
const enemies = [];

spawnTrees();
const enemyBase = createBuilding("enemyBase", WORLD.width - 270, WORLD.height / 2 - 100, false);
enemyBase.hp = 800;
enemyBase.maxHp = 800;
enemyBase.w = 180;
enemyBase.h = 200;
const enemyHero = createEnemyHero(WORLD.width - 430, WORLD.height / 2 - 10);
createUnit("enemySoldier", WORLD.width - 470, WORLD.height / 2 + 90, false);

function nextId() {
  return entityId++;
}

function spawnTrees() {
  const points = [
    [330, 470], [460, 580], [410, 810], [600, 760], [780, 520], [920, 710],
    [1050, 420], [1120, 920], [1340, 680], [880, 1080], [620, 1020], [1530, 860],
  ];

  for (const [x, y] of points) {
    trees.push({
      id: nextId(),
      x,
      y,
      radius: 28,
      wood: 25,
    });
  }
}

function createBuilding(type, x, y, isPlayer) {
  const building = {
    id: nextId(),
    type,
    x,
    y,
    w: 140,
    h: 140,
    hp: type === "barracks" ? 400 : 800,
    maxHp: type === "barracks" ? 400 : 800,
    isPlayer,
  };
  buildings.push(building);
  return building;
}

function createUnit(kind, x, y, isPlayer) {
  const unit = {
    id: nextId(),
    kind,
    isPlayer,
    x,
    y,
    radius: 14,
    speed: isPlayer ? 112 : 0,
    hp: 100,
    maxHp: 100,
    damage: isPlayer ? 10 : 8,
    attackRange: 34,
    attackCooldown: 1,
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

function createEnemyHero(x, y) {
  return {
    id: nextId(),
    kind: "enemyHero",
    isPlayer: false,
    x,
    y,
    radius: 18,
    speed: 0,
    hp: 150,
    maxHp: 150,
    damage: 0,
    attackRange: 0,
    attackCooldown: 0,
    attackTimer: 0,
  };
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function getCharacterStatus() {
  if (player.isPlacingBuilding) {
    return "Place the Barracks on open ground. Right-click or press Escape to cancel.";
  }

  const tree = getNearbyTree();
  if (hero.isHarvesting) {
    return "Harvesting tree...";
  }
  if (tree) {
    return "Press E to harvest this tree for 25 wood.";
  }
  return "Walk near a tree and press E to harvest wood.";
}

function updateTrainButton() {
  const selected = buildings.find((b) => b.id === player.selectedBuildingId && b.type === "barracks" && b.isPlayer);
  const show = Boolean(selected);
  trainSoldierBtn.classList.toggle("hidden", !show);
  trainSoldierBtn.disabled = player.wood < 50 || !show;
}

function updateAbilityUI() {
  const abilityName = hero.selectedClass ? CHARACTER_OPTIONS[hero.selectedClass].abilityName : "Choose Class";
  const ready = hero.slashTimer <= 0;
  abilityNameEl.textContent = abilityName;
  slashAbilityEl.classList.toggle("ready", ready);
  slashAbilityEl.classList.toggle("cooldown", !ready);
  slashCooldownTextEl.textContent = player.hasSelectedCharacter
    ? (ready ? "Ready" : `${hero.slashTimer.toFixed(1)}s`)
    : "Pick Hero";
}

function normalizeAngle(angle) {
  let normalized = angle;
  while (normalized <= -Math.PI) {
    normalized += Math.PI * 2;
  }
  while (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }
  return normalized;
}

function isPointInSlash(point) {
  const dx = point.x - hero.x;
  const dy = point.y - hero.y;
  const dist = Math.hypot(dx, dy);
  if (dist > hero.slashRadius || dist === 0) {
    return false;
  }

  const angle = Math.atan2(dy, dx);
  const delta = normalizeAngle(angle - hero.facingAngle);
  return Math.abs(delta) <= hero.slashHalfAngle;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return distance(point, start);
  }
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
  const closest = { x: start.x + dx * t, y: start.y + dy * t };
  return distance(point, closest);
}

function damageEnemiesInCone(damage, radius, halfAngle) {
  const originalRadius = hero.slashRadius;
  const originalAngle = hero.slashHalfAngle;
  hero.slashRadius = radius;
  hero.slashHalfAngle = halfAngle;

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (isPointInSlash(enemies[i])) {
      enemies[i].hp -= damage;
    }
  }
  if (isPointInSlash(enemyHero)) {
    enemyHero.hp -= damage;
  }
  for (const building of buildings) {
    if (!building.isPlayer && isPointInSlash(getEntityTargetPoint(building))) {
      building.hp -= damage;
    }
  }

  hero.slashRadius = originalRadius;
  hero.slashHalfAngle = originalAngle;
}

function damageEnemiesInRadius(damage, radius) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (distance(hero, enemies[i]) <= radius) {
      enemies[i].hp -= damage;
    }
  }
  if (distance(hero, enemyHero) <= radius) {
    enemyHero.hp -= damage;
  }
  for (const building of buildings) {
    if (!building.isPlayer && distance(hero, getEntityTargetPoint(building)) <= radius + 24) {
      building.hp -= damage;
    }
  }
}

function damageEnemiesInLine(damage, range, width) {
  const start = { x: hero.x, y: hero.y };
  const end = {
    x: hero.x + Math.cos(hero.facingAngle) * range,
    y: hero.y + Math.sin(hero.facingAngle) * range,
  };

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (distanceToSegment(enemies[i], start, end) <= width) {
      enemies[i].hp -= damage;
    }
  }
  if (distanceToSegment(enemyHero, start, end) <= width) {
    enemyHero.hp -= damage;
  }
  for (const building of buildings) {
    if (!building.isPlayer && distanceToSegment(getEntityTargetPoint(building), start, end) <= width + 18) {
      building.hp -= damage;
    }
  }
}

function buildBurstShots(range, rounds, spreadAngle, shotAnglesDegrees) {
  const shots = [];
  const customAngles = shotAnglesDegrees?.length
    ? shotAnglesDegrees.slice(0, rounds).map((degrees) => (degrees * Math.PI) / 180)
    : null;
  const startAngle = hero.facingAngle - spreadAngle / 2;
  const angleStep = rounds > 1 ? spreadAngle / (rounds - 1) : 0;

  for (let index = 0; index < rounds; index += 1) {
    const angle = customAngles
      ? hero.facingAngle + customAngles[index]
      : startAngle + angleStep * index;
    const start = { x: hero.x, y: hero.y };
    const end = {
      x: hero.x + Math.cos(angle) * range,
      y: hero.y + Math.sin(angle) * range,
    };

    shots.push({ start, end, angle, range });
  }

  return shots;
}

function spawnBurstProjectile(shot, damage, width) {
  return {
    x: shot.start.x,
    y: shot.start.y,
    angle: shot.angle,
    speed: 720,
    radius: Math.max(4, width * 0.45),
    damage,
    width,
    traveled: 0,
    maxDistance: shot.range,
    active: true,
  };
}

function intersectsBuilding(point, radius, building) {
  const closestX = clamp(point.x, building.x, building.x + building.w);
  const closestY = clamp(point.y, building.y, building.y + building.h);
  return Math.hypot(point.x - closestX, point.y - closestY) <= radius;
}

function updateBurstProjectile(projectile, dt) {
  const step = projectile.speed * dt;
  projectile.x += Math.cos(projectile.angle) * step;
  projectile.y += Math.sin(projectile.angle) * step;
  projectile.traveled += step;

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
      enemies[i].hp -= projectile.damage;
      projectile.active = false;
      return;
    }
  }

  if (distance(projectile, enemyHero) <= projectile.radius + enemyHero.radius) {
    enemyHero.hp -= projectile.damage;
    projectile.active = false;
    return;
  }

  for (const building of buildings) {
    if (!building.isPlayer && intersectsBuilding(projectile, projectile.radius, building)) {
      building.hp -= projectile.damage;
      projectile.active = false;
      return;
    }
  }

  if (
    projectile.traveled >= projectile.maxDistance ||
    projectile.x < 0 ||
    projectile.y < 0 ||
    projectile.x > WORLD.width ||
    projectile.y > WORLD.height
  ) {
    projectile.active = false;
  }
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
  updateTrainButton();
}

function selectSingleUnit(unit) {
  clearUnitSelection();
  player.selectedUnits = [unit.id];
  unit.selected = true;
  player.selectedBuildingId = null;
  updateTrainButton();
}

function selectBuilding(building) {
  clearUnitSelection();
  player.selectedUnits = [];
  player.selectedBuildingId = building.id;
  updateTrainButton();
  if (building.type === "barracks") {
    statusTextEl.textContent = "Barracks selected. Train a soldier for 50 wood.";
  }
}

function getNearbyTree() {
  return trees.find((tree) => distance(hero, tree) <= hero.radius + tree.radius + 20) || null;
}

function screenToWorld(x, y) {
  return { x: x + camera.x, y: y + camera.y };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isPointInBuilding(point, building) {
  return (
    point.x >= building.x &&
    point.x <= building.x + building.w &&
    point.y >= building.y &&
    point.y <= building.y + building.h
  );
}

function getUnitAt(point, list) {
  return list.find((unit) => distance(point, unit) <= unit.radius);
}

function getBuildingAt(point, list) {
  return list.find((building) => isPointInBuilding(point, building));
}

function isValidBarracksPlacement(x, y) {
  const preview = { x: x - 70, y: y - 70, w: 140, h: 140 };
  if (preview.x < 40 || preview.y < 40 || preview.x + preview.w > WORLD.width - 40 || preview.y + preview.h > WORLD.height - 40) {
    return false;
  }

  for (const tree of trees) {
    const closestX = clamp(tree.x, preview.x, preview.x + preview.w);
    const closestY = clamp(tree.y, preview.y, preview.y + preview.h);
    if (Math.hypot(tree.x - closestX, tree.y - closestY) < tree.radius + 10) {
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

  return true;
}

function startHarvest() {
  const tree = getNearbyTree();
  if (!tree || hero.isHarvesting) {
    return;
  }
  hero.isHarvesting = true;
  hero.harvestProgress = 0;
  harvestTreeId = tree.id;
}

function cancelHarvest() {
  hero.isHarvesting = false;
  hero.harvestProgress = 0;
  harvestTreeId = null;
}

function useSlash() {
  if (!player.hasSelectedCharacter || player.victory || player.loss || hero.slashTimer > 0) {
    return;
  }

  const selectedClass = CHARACTER_OPTIONS[hero.selectedClass];
  hero.slashCooldown = selectedClass.cooldown;
  hero.slashTimer = hero.slashCooldown;
  hero.slashArcTimer = selectedClass.effect === "burst" ? 0.42 : 0.22;
  hero.abilityEffect = { ...selectedClass };

  if (selectedClass.effect === "cone") {
    hero.slashRadius = selectedClass.radius;
    hero.slashHalfAngle = selectedClass.halfAngle;
    damageEnemiesInCone(selectedClass.damage, selectedClass.radius, selectedClass.halfAngle);
  } else if (selectedClass.effect === "line") {
    damageEnemiesInLine(selectedClass.damage, selectedClass.range, selectedClass.width);
  } else if (selectedClass.effect === "burst") {
    const shots = buildBurstShots(
      selectedClass.range,
      selectedClass.rounds,
      selectedClass.spreadAngle,
      selectedClass.shotAnglesDegrees
    );
    hero.abilityEffect.pendingShots = shots.map((shot, index) => ({
      ...shot,
      damage: selectedClass.damage,
      width: selectedClass.width,
      delay: index * 0.045,
    }));
    hero.abilityEffect.projectiles = [];
  } else if (selectedClass.effect === "nova") {
    damageEnemiesInRadius(selectedClass.damage, selectedClass.radius);
  }

  updateAbilityUI();
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

function updateCamera(dt) {
  camera.x = clamp(hero.x - canvas.width / 2, 0, WORLD.width - canvas.width);
  camera.y = clamp(hero.y - canvas.height / 2, 0, WORLD.height - canvas.height);
}

function updateHero(dt) {
  hero.slashTimer = Math.max(0, hero.slashTimer - dt);
  hero.slashArcTimer = Math.max(0, hero.slashArcTimer - dt);
  if (hero.abilityEffect?.effect === "burst") {
    const pendingShots = hero.abilityEffect.pendingShots || [];
    const projectiles = hero.abilityEffect.projectiles || [];

    for (let index = pendingShots.length - 1; index >= 0; index -= 1) {
      pendingShots[index].delay -= dt;
      if (pendingShots[index].delay <= 0) {
        projectiles.push(spawnBurstProjectile(pendingShots[index], pendingShots[index].damage, pendingShots[index].width));
        pendingShots.splice(index, 1);
      }
    }

    for (let index = projectiles.length - 1; index >= 0; index -= 1) {
      updateBurstProjectile(projectiles[index], dt);
      if (!projectiles[index].active) {
        projectiles.splice(index, 1);
      }
    }
  }

  if (
    hero.slashArcTimer === 0 &&
    (!hero.abilityEffect?.projectiles || hero.abilityEffect.projectiles.length === 0) &&
    (!hero.abilityEffect?.pendingShots || hero.abilityEffect.pendingShots.length === 0)
  ) {
    hero.abilityEffect = null;
  }

  if (player.victory || player.loss) {
    updateAbilityUI();
    return;
  }

  if (!player.hasSelectedCharacter) {
    updateAbilityUI();
    return;
  }

  const dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  const dy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);

  if (dx || dy) {
    const mag = Math.hypot(dx, dy);
    hero.facingAngle = Math.atan2(dy / mag, dx / mag);
    hero.x = clamp(hero.x + (dx / mag) * hero.speed * dt, hero.radius, WORLD.width - hero.radius);
    hero.y = clamp(hero.y + (dy / mag) * hero.speed * dt, hero.radius, WORLD.height - hero.radius);
    if (hero.isHarvesting) {
      cancelHarvest();
    }
  }

  if (hero.isHarvesting) {
    const tree = trees.find((t) => t.id === harvestTreeId);
    if (!tree || distance(hero, tree) > hero.radius + tree.radius + 26) {
      cancelHarvest();
    } else {
      hero.harvestProgress += dt / hero.harvestTime;
      if (hero.harvestProgress >= 1) {
        player.wood += tree.wood;
        trees.splice(trees.indexOf(tree), 1);
        cancelHarvest();
      }
    }
  }

  if (hero.hp <= 0) {
    triggerLoss();
  }

  woodCountEl.textContent = String(player.wood);
  statusTextEl.textContent = getCharacterStatus();
  updateAbilityUI();
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

    if (!target) {
      const nearbyUnit = enemiesList.find((enemy) => distance(unit, enemy) <= 150);
      const nearbyBuilding = enemyBuildings.find((building) => distance(unit, { x: building.x + building.w / 2, y: building.y + building.h / 2 }) <= 180);
      target = nearbyUnit || nearbyBuilding || null;
      if (target) {
        unit.targetUnitId = isBuildingTarget(target) ? null : target.id;
        unit.targetBuildingId = isBuildingTarget(target) ? target.id : null;
      }
    }

    if (target) {
      const targetPoint = getEntityTargetPoint(target);
      const dist = distance(unit, targetPoint);
      if (dist > unit.attackRange) {
        moveTowards(unit, targetPoint.x, targetPoint.y, dt);
      } else if (unit.attackTimer === 0) {
        target.hp -= unit.damage;
        unit.attackTimer = unit.attackCooldown;
      }
      unit.targetPos = { x: targetPoint.x, y: targetPoint.y };
    } else if (unit.targetPos) {
      const dist = distance(unit, unit.targetPos);
      if (dist > 6) {
        moveTowards(unit, unit.targetPos.x, unit.targetPos.y, dt);
      }
    }

    if (unit.hp <= 0) {
      list.splice(i, 1);
      if (unit.isPlayer) {
        player.selectedUnits = player.selectedUnits.filter((id) => id !== unit.id);
      }
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

function cleanupDestroyedBuildings() {
  for (let i = buildings.length - 1; i >= 0; i -= 1) {
    const building = buildings[i];
    if (building.hp > 0) {
      continue;
    }
    buildings.splice(i, 1);
    if (player.selectedBuildingId === building.id) {
      player.selectedBuildingId = null;
      updateTrainButton();
    }
    if (building.type === "enemyBase") {
      triggerVictory();
    }
  }

  if (enemyHero.hp <= 0) {
    enemyHero.hp = 0;
  }

  const hasPlayerBarracks = buildings.some((building) => building.isPlayer && building.type === "barracks");
  if (player.hasBuiltBarracks && !hasPlayerBarracks && player.wood < 100 && units.length === 0 && !player.victory) {
    triggerLoss();
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

function update(dt) {
  if (!player.hasSelectedCharacter || player.victory || player.loss) {
    return;
  }
  updateCamera(dt);
  updateHero(dt);
  updateUnits(dt, units, enemies, buildings.filter((b) => !b.isPlayer));
  cleanupDestroyedBuildings();
  trainSoldierBtn.disabled = player.wood < 50 || player.selectedBuildingId === null;
}

function drawBackground() {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = COLORS.path;
  ctx.fillRect(0, WORLD.height / 2 - 90, WORLD.width, 180);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let x = 0; x < WORLD.width; x += 120) {
    ctx.fillRect(x, 0, 2, WORLD.height);
  }
  for (let y = 0; y < WORLD.height; y += 120) {
    ctx.fillRect(0, y, WORLD.width, 2);
  }
}

function drawTree(tree) {
  ctx.fillStyle = COLORS.trunk;
  ctx.fillRect(tree.x - 7, tree.y + 8, 14, 28);
  ctx.beginPath();
  ctx.fillStyle = COLORS.tree;
  ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEntityCircle(entity, fill, accent) {
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = accent;
  ctx.arc(entity.x, entity.y - 4, entity.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuilding(building) {
  ctx.fillStyle = building.type === "enemyBase" ? COLORS.enemyBase : COLORS.barracks;
  ctx.fillRect(building.x, building.y, building.w, building.h);

  if (player.selectedBuildingId === building.id) {
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 3;
    ctx.strokeRect(building.x - 4, building.y - 4, building.w + 8, building.h + 8);
  }

  ctx.fillStyle = "#f6eed3";
  ctx.font = "600 20px Chakra Petch";
  ctx.textAlign = "center";
  ctx.fillText(building.type === "enemyBase" ? "ENEMY BASE" : "BARRACKS", building.x + building.w / 2, building.y + building.h / 2 + 6);
  drawHealthBar(building.x + building.w / 2, building.y - 14, 120, building.hp / building.maxHp);
}

function drawHealthBar(x, y, width, ratio) {
  const clamped = clamp(ratio, 0, 1);
  ctx.fillStyle = COLORS.healthBg;
  ctx.fillRect(x - width / 2, y, width, 10);
  ctx.fillStyle = clamped > 0.45 ? COLORS.healthGood : COLORS.healthBad;
  ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * clamped, 8);
}

function drawHarvestProgress() {
  if (!hero.isHarvesting) {
    return;
  }
  const width = 60;
  ctx.fillStyle = COLORS.healthBg;
  ctx.fillRect(hero.x - width / 2, hero.y - 42, width, 10);
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(hero.x - width / 2 + 1, hero.y - 41, (width - 2) * clamp(hero.harvestProgress, 0, 1), 8);
}

function drawSlashArc() {
  if (hero.slashArcTimer <= 0 || !hero.abilityEffect) {
    return;
  }

  const progress = hero.slashArcTimer / 0.22;
  ctx.strokeStyle = `rgba(255, 245, 210, ${0.25 + progress * 0.45})`;
  ctx.fillStyle = `rgba(176, 227, 255, ${0.08 + progress * 0.12})`;
  ctx.lineWidth = 10;

  if (hero.abilityEffect.effect === "cone") {
    ctx.beginPath();
    ctx.arc(
      hero.x,
      hero.y,
      hero.abilityEffect.radius - 18,
      hero.facingAngle - hero.abilityEffect.halfAngle,
      hero.facingAngle + hero.abilityEffect.halfAngle
    );
    ctx.stroke();
    return;
  }

  if (hero.abilityEffect.effect === "nova") {
    ctx.beginPath();
    ctx.arc(hero.x, hero.y, hero.abilityEffect.radius * (0.55 + (1 - progress) * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (hero.abilityEffect.effect === "line") {
    const endX = hero.x + Math.cos(hero.facingAngle) * hero.abilityEffect.range;
    const endY = hero.y + Math.sin(hero.facingAngle) * hero.abilityEffect.range;
    ctx.beginPath();
    ctx.moveTo(hero.x, hero.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    return;
  }

  if (hero.abilityEffect.effect === "burst") {
    const projectiles = hero.abilityEffect.projectiles || [];
    for (const projectile of projectiles) {
      const tailX = projectile.x - Math.cos(projectile.angle) * 16;
      const tailY = projectile.y - Math.sin(projectile.angle) * 16;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 225, 150, 0.7)";
      ctx.lineWidth = 3;
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "#ffd972";
      ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSelectionBox() {
  if (!selectionBox) {
    return;
  }
  const x = selectionBox.x1 - camera.x;
  const y = selectionBox.y1 - camera.y;
  const w = selectionBox.x2 - selectionBox.x1;
  const h = selectionBox.y2 - selectionBox.y1;
  ctx.strokeStyle = "rgba(255, 228, 135, 0.9)";
  ctx.fillStyle = "rgba(255, 228, 135, 0.15)";
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
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

function drawModeHint() {
  const tree = getNearbyTree();
  if (tree && !hero.isHarvesting) {
    ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
    ctx.fillRect(tree.x - 52, tree.y - 72, 104, 26);
    ctx.fillStyle = "#fff5d2";
    ctx.font = "600 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("Press E", tree.x, tree.y - 54);
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawBackground();

  for (const tree of trees) {
    drawTree(tree);
  }

  for (const building of buildings) {
    drawBuilding(building);
  }

  drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
  drawHealthBar(hero.x, hero.y - 34, 60, hero.hp / hero.maxHp);
  drawHarvestProgress();
  drawSlashArc();

  for (const unit of units) {
    drawEntityCircle(unit, COLORS.soldier, "#8fb7ff");
    if (unit.selected) {
      ctx.beginPath();
      ctx.strokeStyle = COLORS.selection;
      ctx.lineWidth = 3;
      ctx.arc(unit.x, unit.y, unit.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHealthBar(unit.x, unit.y - 28, 44, unit.hp / unit.maxHp);
  }

  for (const unit of enemies) {
    drawEntityCircle(unit, COLORS.enemy, "#ef9494");
    drawHealthBar(unit.x, unit.y - 28, 44, unit.hp / unit.maxHp);
  }

  drawEntityCircle(enemyHero, COLORS.enemy, "#f2b0b0");
  drawHealthBar(enemyHero.x, enemyHero.y - 34, 60, enemyHero.hp / enemyHero.maxHp);

  drawBuildPreview();
  drawSelectionBox();
  drawModeHint();

  ctx.restore();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0, 0.05);
  lastTimestamp = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.add(key);

  if (!player.hasSelectedCharacter) {
    return;
  }

  if (key === "e") {
    startHarvest();
  }

  if (key === "f") {
    useSlash();
  }

  if (event.key === "Escape") {
    player.isPlacingBuilding = false;
    statusTextEl.textContent = getCharacterStatus();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
  const world = screenToWorld(mouse.x, mouse.y);
  mouse.worldX = world.x;
  mouse.worldY = world.y;

  if (selectionBox) {
    selectionBox.x2 = mouse.worldX;
    selectionBox.y2 = mouse.worldY;
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  const point = screenToWorld(event.offsetX, event.offsetY);
  mouse.worldX = point.x;
  mouse.worldY = point.y;

  if (event.button === 0) {
    if (player.isPlacingBuilding) {
      if (player.wood >= 100 && isValidBarracksPlacement(point.x, point.y)) {
        player.wood -= 100;
        createBuilding("barracks", point.x - 70, point.y - 70, true);
        player.hasBuiltBarracks = true;
        player.isPlacingBuilding = false;
        woodCountEl.textContent = String(player.wood);
        statusTextEl.textContent = "Barracks built. Select it to train soldiers.";
      }
      return;
    }

    const clickedUnit = getUnitAt(point, units);
    if (clickedUnit) {
      selectSingleUnit(clickedUnit);
      statusTextEl.textContent = "Soldier selected. Right-click to move or attack.";
      return;
    }

    const clickedBuilding = getBuildingAt(point, buildings.filter((b) => b.isPlayer));
    if (clickedBuilding) {
      selectBuilding(clickedBuilding);
      return;
    }

    player.selectedBuildingId = null;
    updateTrainButton();
    selectionBox = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };
  }
});

canvas.addEventListener("mouseup", (event) => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (event.button === 0 && selectionBox) {
    selectUnitsInBox(selectionBox);
    selectionBox = null;
    statusTextEl.textContent = player.selectedUnits.length
      ? "Units selected. Right-click ground to move, or enemies to attack."
      : "No soldiers selected.";
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (!player.hasSelectedCharacter) {
    return;
  }
  const point = screenToWorld(event.offsetX, event.offsetY);

  if (player.isPlacingBuilding) {
    player.isPlacingBuilding = false;
    statusTextEl.textContent = getCharacterStatus();
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

buildBarracksBtn.addEventListener("click", () => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (player.wood < 100) {
    statusTextEl.textContent = "Not enough wood to build a Barracks.";
    return;
  }
  player.isPlacingBuilding = true;
  player.selectedBuildingId = null;
  clearUnitSelection();
  player.selectedUnits = [];
  updateTrainButton();
  statusTextEl.textContent = "Place the Barracks on open ground. Right-click or press Escape to cancel.";
});

trainSoldierBtn.addEventListener("click", () => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  const barracks = buildings.find((building) => building.id === player.selectedBuildingId && building.isPlayer);
  if (!barracks || player.wood < 50) {
    return;
  }
  player.wood -= 50;
  woodCountEl.textContent = String(player.wood);
  createUnit("soldier", barracks.x + barracks.w + 24, barracks.y + barracks.h / 2, true);
  trainSoldierBtn.disabled = player.wood < 50;
  statusTextEl.textContent = "Soldier trained. Select it and issue orders with the mouse.";
});

function selectCharacter(classId) {
  const selectedClass = CHARACTER_OPTIONS[classId];
  if (!selectedClass) {
    return;
  }

  hero.selectedClass = classId;
  hero.slashCooldown = selectedClass.cooldown;
  hero.slashRadius = selectedClass.radius || hero.slashRadius;
  hero.slashHalfAngle = selectedClass.halfAngle || hero.slashHalfAngle;
  hero.slashDamage = selectedClass.damage;
  player.hasSelectedCharacter = true;
  characterSelectEl.classList.add("hidden");
  statusTextEl.textContent = `${selectedClass.name} selected. Walk near a tree and press E to harvest wood.`;
  updateAbilityUI();
}

for (const classCardEl of classCardEls) {
  const portraitEl = classCardEl.querySelector(".class-portrait");
  const selectedClass = CHARACTER_OPTIONS[classCardEl.dataset.class];
  if (portraitEl && selectedClass?.portrait) {
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
    selectCharacter(classCardEl.dataset.class);
  });
}

updateAbilityUI();
requestAnimationFrame(gameLoop);
