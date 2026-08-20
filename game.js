const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const woodCountEl = document.getElementById("woodCount");
const moneyCountEl = document.getElementById("moneyCount");
const armorValueEl = document.getElementById("armorValue");
const healthValueEl = document.getElementById("healthValue");
const weaponValueEl = document.getElementById("weaponValue");
const speedValueEl = document.getElementById("speedValue");
const armorFillEl = document.getElementById("armorFill");
const healthFillEl = document.getElementById("healthFill");
const weaponFillEl = document.getElementById("weaponFill");
const speedFillEl = document.getElementById("speedFill");
const xpLevelEl = document.getElementById("xpLevel");
const xpFillEl = document.getElementById("xpFill");
const upgradePointsEl = document.getElementById("upgradePoints");
const upgradeActionEls = document.querySelectorAll(".upgrade-action");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");
const equipmentWeaponNameEl = document.getElementById("equipmentWeaponName");
const equipmentWeaponMetaEl = document.getElementById("equipmentWeaponMeta");
const equipmentWeaponIconEl = document.getElementById("equipmentWeaponIcon");
const equipmentAbilityNameEl = document.getElementById("equipmentAbilityName");
const equipmentAbilityMetaEl = document.getElementById("equipmentAbilityMeta");
const equipmentHelmetNameEl = document.getElementById("equipmentHelmetName");
const equipmentHelmetMetaEl = document.getElementById("equipmentHelmetMeta");
const equipmentHelmetIconEl = document.getElementById("equipmentHelmetIcon");
const equipmentBodyArmorNameEl = document.getElementById("equipmentBodyArmorName");
const equipmentBodyArmorMetaEl = document.getElementById("equipmentBodyArmorMeta");
const statusTextEl = document.getElementById("statusText");
const overlayMessageEl = document.getElementById("overlayMessage");
const buildBarracksBtn = document.getElementById("buildBarracksBtn");
const trainSoldierBtn = document.getElementById("trainSoldierBtn");
const shopPanelEl = document.getElementById("shopPanel");
const shopSellWoodBtn = document.getElementById("shopSellWoodBtn");
const closeShopBtn = document.getElementById("closeShopBtn");
const traderPanelEl = document.getElementById("traderPanel");
const buyWeaponUpgradeBtn = document.getElementById("buyWeaponUpgradeBtn");
const closeTraderBtn = document.getElementById("closeTraderBtn");
const traderStatusEl = document.getElementById("traderStatus");
const slashAbilityEl = document.getElementById("slashAbility");
const abilityNameEl = document.getElementById("abilityName");
const slashCooldownTextEl = document.getElementById("slashCooldownText");
const dashAbilityEl = document.getElementById("dashAbility");
const dashAbilityNameEl = document.getElementById("dashAbilityName");
const dashCooldownTextEl = document.getElementById("dashCooldownText");
const characterSelectEl = document.getElementById("characterSelect");
const nameStepEl = document.getElementById("nameStep");
const classStepEl = document.getElementById("classStep");
const playerNameInputEl = document.getElementById("playerNameInput");
const confirmPlayerNameBtn = document.getElementById("confirmPlayerNameBtn");
const classGridEl = document.querySelector(".class-grid");
const weaponBuffImage = new Image();
weaponBuffImage.src = "./images/sword.jpg";
const soldierRunningImage = new Image();
soldierRunningImage.src = "./images/soldierRunning.png";
const soldierIdleImage = new Image();
soldierIdleImage.src = "./images/soldier-stationary.png";
const soldierShootingImage = new Image();
soldierShootingImage.src = "./images/soldier-shooting.png";
const skeletonImage = new Image();
skeletonImage.src = "./images/skeleton.png";
const bowImage = new Image();
bowImage.src = "./images/bow.png";
const archerImage = new Image();
archerImage.src = "./images/archer.png";
const archerRunningImage = new Image();
archerRunningImage.src = "./images/archer-running.png";
const archerShootingImage = new Image();
archerShootingImage.src = "./images/archer-shooting.png";
const archerDeadImage = new Image();
archerDeadImage.src = "./images/archer-dead.png";

const MAIN_WORLD_HEIGHT = 1400;
const MAIN_LANE_Y = 700;
const WORLD = { width: 2400, height: 1900 };
const GRID_SIZE = 120;
const PLAYER_BASE_SPAWN = { x: 250, y: 740 };
const DEATH_ZONE = {
  x: WORLD.width / 2 - 110,
  y: MAIN_WORLD_HEIGHT - 300,
  size: 220,
};
const SPAWN_WAVE_TILE = {
  x: PLAYER_BASE_SPAWN.x + 120,
  y: PLAYER_BASE_SPAWN.y + 110,
  size: 90,
  triggered: false,
};
const SPAWN_STREAM_TILE = {
  x: PLAYER_BASE_SPAWN.x + 220,
  y: PLAYER_BASE_SPAWN.y + 110,
  size: 90,
  interval: 0.5,
  timer: 0,
};
const DODGE_ARENA_TILE = {
  x: PLAYER_BASE_SPAWN.x + 320,
  y: PLAYER_BASE_SPAWN.y + 110,
  size: 90,
};
const DODGE_ARENA = {
  x: WORLD.width - 520,
  y: 120,
  w: 360,
  h: 320,
  spawnX: WORLD.width - 340,
  spawnY: 280,
  bulletInterval: 0.3,
};
const VILLAGE_ROAD_WIDTH = 76;
const COLORS = {
  ground: "#a8cb7a",
  path: "#b6c792",
  tree: "#2f6b33",
  trunk: "#5f4023",
  stone: "#7e8792",
  stoneShadow: "#5d6670",
  stoneHighlight: "#c7d0da",
  deathZone: "#6c2030",
  hero: "#2546b8",
  heroAccent: "#93b4ff",
  soldier: "#315ba8",
  enemy: "#9d3737",
  spawnWave: "#7a5a32",
  spawnStream: "#5d6f2e",
  enemyBase: "#7f2727",
  playerBase: "#3c6f4c",
  barracks: "#6f4d96",
  shop: "#7a5230",
  dodgeArena: "#3e6f97",
  villageRoof: "#8c5b3b",
  villageWall: "#d7bf97",
  villageWell: "#7f8f9d",
  villageField: "#7e6638",
  villageCrop: "#7dbf54",
  villageFence: "#7a5a35",
  villageHay: "#dcbf63",
  selection: "#ffe487",
  previewValid: "rgba(111, 77, 150, 0.45)",
  previewInvalid: "rgba(198, 81, 81, 0.45)",
  healthBg: "rgba(0, 0, 0, 0.32)",
  healthGood: "#83df72",
  healthBad: "#e36a6a",
};

let CHARACTER_OPTIONS = {};
let ENEMY_OPTIONS = {};

const player = {
  displayName: "",
  wood: 1000,
  money: 0,
  level: 1,
  xp: 0,
  upgradePoints: 0,
  selectedUnits: [],
  selectedBuildingId: null,
  isPlacingBuilding: false,
  victory: false,
  loss: false,
  hasBuiltBarracks: false,
  hasSelectedCharacter: false,
  shopOpen: false,
  traderOpen: false,
  inDodgeArena: false,
  dodgeArenaReturnX: PLAYER_BASE_SPAWN.x + 40,
  dodgeArenaReturnY: PLAYER_BASE_SPAWN.y,
  weaponBonusStat: 0,
  weaponBonusDamage: 0,
  bonusArmor: 0,
  bonusHealth: 0,
  bonusDamage: 0,
  bonusSpeed: 0,
  bonusAbilityDamage: 0,
  helmetBonusArmor: 0,
};

const camera = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0, leftDown: false };
const keys = new Set();

let entityId = 1;
let selectionBox = null;
let harvestTreeId = null;
let lastTimestamp = 0;

const hero = {
  id: nextId(),
  x: PLAYER_BASE_SPAWN.x,
  y: PLAYER_BASE_SPAWN.y,
  radius: 18,
  speed: 220,
  hp: 150,
  maxHp: 150,
  facingAngle: 0,
  lastMoveAngle: null,
  slashCooldown: 8,
  slashTimer: 0,
  slashRadius: 86,
  slashHalfAngle: Math.PI / 2,
  slashDamage: 35,
  slashArcTimer: 0,
  dashTimer: 0,
  dashCooldown: 0,
  dashCooldownRemaining: 0,
  dashSpeed: 680,
  dashDuration: 0.18,
  selectedClass: null,
  abilityEffect: null,
  harvestTime: 1.4,
  harvestProgress: 0,
  isHarvesting: false,
  equippedArmorValue: 0,
  equippedHelmetType: null,
  latestPickup: null,
  hasAxe: false,
  axeSwingTimer: 0,
  axeSwingDuration: 0.22,
  hasBow: false,
  bowCooldown: 0,
  shootLockTimer: 0,
  weaponPickupCooldown: 0,
  hasRifle: false,
  rifleCooldown: 0,
  isMoving: false,
  isDead: false,
  deathTimer: 0,
  deathDuration: 0.7,
  ammo: 0,
  maxAmmo: 30,
  isReloading: false,
  reloadTimer: 0,
  reloadDuration: 1.2,
};

const UPGRADE_OPTIONS = [
  { id: "health", label: "Health", description: "+10 max HP" },
  { id: "armor", label: "Armor", description: "+3 body armor" },
  { id: "damage", label: "Damage", description: "+2 weapon damage" },
  { id: "speed", label: "Speed", description: "+5 speed" },
  { id: "ability", label: "Ability", description: "+3 ability damage" },
  { id: "helmet", label: "Helmet", description: "+3 helmet armor" },
];

const DEFAULT_ENEMY_NAME = "Enemy Hero";
const MINIMAP_NEARBY_RADIUS = 360;

const trees = [];
const stones = [];
const buildings = [];
const units = [];
const enemies = [];
const heroProjectiles = [];
const damagePopups = [];
const sparkEffects = [];
const dodgeArenaBullets = [];
const villageFields = [];
const villagePaths = [];
const villageFences = [];
const villageProps = [];
const trader = {
  x: 304,
  y: 1492,
  radius: 22,
};
const pickups = [
  // {
  //   id: nextId(),
  //   type: "helmet",
  //   x: 540,
  //   y: 650,
  //   radius: 18,
  //   collected: false,
  //   armorValue: 60,
  // },
  // {
  //   id: nextId(),
  //   type: "healthBuff",
  //   x: GRID_SIZE * 6 + 80,
  //   y: MAIN_LANE_Y + 20,
  //   radius: 18,
  //   collected: false,
  //   healthValue: 20,
  // },
  // {
  //   id: nextId(),
  //   type: "weaponBuff",
  //   x: GRID_SIZE * 6 - 80,
  //   y: MAIN_LANE_Y + 20,
  //   radius: 18,
  //   collected: false,
  //   damageValue: 2,
  // },
  // {
  //   id: nextId(),
  //   type: "axe",
  //   x: PLAYER_BASE_SPAWN.x + 140,
  //   y: PLAYER_BASE_SPAWN.y - 50,
  //   radius: 18,
  //   collected: false,
  // },
  // {
  //   id: nextId(),
  //   type: "rifle",
  //   x: PLAYER_BASE_SPAWN.x + 210,
  //   y: PLAYER_BASE_SPAWN.y - 50,
  //   radius: 18,
  //   collected: false,
  // },
  // {
  //   id: nextId(),
  //   type: "bow",
  //   x: PLAYER_BASE_SPAWN.x + 280,
  //   y: PLAYER_BASE_SPAWN.y - 50,
  //   radius: 18,
  //   collected: false,
  // },
];

spawnTrees();
spawnStones();
const playerBase = createBuilding("playerBase", 60, MAIN_LANE_Y - 100, true);
playerBase.hp = 900;
playerBase.maxHp = 900;
playerBase.w = 180;
playerBase.h = 200;
createBuilding("shop", 180, MAIN_LANE_Y - 220, true);
initializeVillage();
const enemyBase = createBuilding("enemyBase", WORLD.width - 270, MAIN_LANE_Y - 100, false);
enemyBase.hp = 800;
enemyBase.maxHp = 800;
enemyBase.w = 180;
enemyBase.h = 200;
let enemyHero = null;

function initializeEnemyForces() {
  createUnit("boss", WORLD.width / 2, MAIN_LANE_Y, false);
  enemyHero = createEnemyHero(WORLD.width - 430, MAIN_LANE_Y - 10);
  enemyHero.equippedArmorValue = 80;
  enemyHero.latestPickup = {
  type: "enemyHelmet",
  armorValue: 80,
  radius: 18,
  };
  createUnit("enemySoldier", WORLD.width - 470, MAIN_LANE_Y + 90, false);
}

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

function spawnStones() {
  const points = [
    [260, 890], [520, 430], [690, 930], [970, 560], [1180, 760], [1260, 1040],
    [1450, 500], [1540, 310], [1660, 780], [1810, 980], [1980, 610], [2140, 880],
  ];

  for (const [x, y] of points) {
    stones.push({
      id: nextId(),
      x,
      y,
      radius: 19,
    });
  }
}

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
  buildings.push(building);
  return building;
}

function addVillageRectProp(type, x, y, w, h, collidable = true) {
  villageProps.push({ type, x, y, w, h, collidable, shape: "rect" });
}

function addVillageCircleProp(type, x, y, radius, collidable = true) {
  villageProps.push({ type, x, y, radius, collidable, shape: "circle" });
}

function initializeVillage() {
  villagePaths.push(
    { x: 132, y: playerBase.y + playerBase.h, w: VILLAGE_ROAD_WIDTH, h: 420 },
    { x: 132, y: 1210, w: 430, h: 64 },
    { x: 210, y: 1338, w: 330, h: 56 },
    { x: 188, y: 1476, w: 170, h: 52 },
    { x: 408, y: 1246, w: 70, h: 160 }
  );

  villageFields.push(
    { x: 640, y: 1295, w: 160, h: 94 },
    { x: 642, y: 1418, w: 156, h: 88 }
  );

  villageFences.push(
    { x1: 620, y1: 1278, x2: 818, y2: 1278 },
    { x1: 620, y1: 1394, x2: 818, y2: 1394 },
    { x1: 620, y1: 1278, x2: 620, y2: 1394 },
    { x1: 818, y1: 1278, x2: 818, y2: 1394 },
    { x1: 620, y1: 1402, x2: 816, y2: 1402 },
    { x1: 620, y1: 1512, x2: 816, y2: 1512 },
    { x1: 620, y1: 1402, x2: 620, y2: 1512 },
    { x1: 816, y1: 1402, x2: 816, y2: 1512 },
    { x1: 94, y1: 1190, x2: 570, y2: 1190 },
    { x1: 94, y1: 1548, x2: 570, y2: 1548 }
  );

  createBuilding("villageHouse", 86, 1232, true, { w: 102, h: 86, hp: 500, maxHp: 500, selectable: false });
  createBuilding("villageHouse", 210, 1362, true, { w: 96, h: 82, hp: 500, maxHp: 500, selectable: false });
  createBuilding("villageHouse", 352, 1246, true, { w: 94, h: 84, hp: 500, maxHp: 500, selectable: false });
  createBuilding("well", 254, 1212, true, { w: 62, h: 62, hp: 350, maxHp: 350, selectable: false });
  createBuilding("blacksmith", 420, 1360, true, { w: 134, h: 104, hp: 650, maxHp: 650, selectable: false });
  createBuilding("market", 118, 1450, true, { w: 118, h: 82, hp: 400, maxHp: 400, selectable: false });

  addVillageRectProp("crate", 498, 1484, 22, 22);
  addVillageRectProp("crate", 528, 1488, 20, 20);
  addVillageCircleProp("barrel", 468, 1498, 11);
  addVillageCircleProp("barrel", 548, 1510, 11);
  addVillageRectProp("hay", 578, 1468, 38, 26);
  addVillageRectProp("hay", 594, 1502, 42, 28);

  trees.push(
    { id: nextId(), x: 56, y: 1338, radius: 24, wood: 25 },
    { id: nextId(), x: 540, y: 1188, radius: 26, wood: 25 },
    { id: nextId(), x: 846, y: 1358, radius: 25, wood: 25 },
    { id: nextId(), x: 722, y: 1548, radius: 24, wood: 25 }
  );
}

function createUnit(kind, x, y, isPlayer) {
  const enemyConfig = !isPlayer ? ENEMY_OPTIONS[kind] : null;
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
    xpReward: isPlayer ? 0 : enemyConfig.xp,
    attackRange: isPlayer ? 34 : enemyConfig.attackRange,
    attackCooldown: isPlayer ? 1 : enemyConfig.attackCooldown,
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
  const enemyHeroConfig = ENEMY_OPTIONS.enemyHero;
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

function sanitizePlayerName(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 18);
}

function confirmPlayerName() {
  const submittedName = sanitizePlayerName(playerNameInputEl.value);
  if (!submittedName) {
    playerNameInputEl.focus();
    statusTextEl.textContent = "Enter a player name before choosing a hero.";
    return;
  }

  player.displayName = submittedName;
  nameStepEl.classList.add("hidden");
  classStepEl.classList.remove("hidden");
  statusTextEl.textContent = `Welcome, ${player.displayName}. Choose your hero.`;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function getCharacterStatus() {
  if (player.inDodgeArena) {
    return "Dodge Arena active. Survive the bullet rain.";
  }

  if (player.isPlacingBuilding) {
    return "Place the Barracks on open ground. Right-click or press Escape to cancel.";
  }

  const nearbyPickup = getNearbyPickup();
  if (nearbyPickup) {
    if (nearbyPickup.type === "rareHelmet") {
      return "Press E to equip the rare blue helmet.";
    }
    if (nearbyPickup.type === "healthBuff") {
      return "Run over the health buff to gain +20 HP.";
    }
    if (nearbyPickup.type === "weaponBuff") {
      return "Run over the weapon buff to gain +2 damage.";
    }
    if (nearbyPickup.type === "axe") {
      return "Press E to equip the axe. Click to swing it.";
    }
    if (nearbyPickup.type === "rifle") {
      return "Press E to equip the M4 rifle. Left-click to fire.";
    }
    if (nearbyPickup.type === "bow") {
      return "Press E to equip the bow. Hold left-click to fire arrows.";
    }
    return "Press E to equip the helmet.";
  }

  if (isHeroNearTrader()) {
    return "Near the Trader. Press Space to buy weapon upgrades.";
  }

  if (isHeroNearShop()) {
    return "Near the Shop. Press Space to trade 25 wood for 25 gold.";
  }

  if (!SPAWN_WAVE_TILE.triggered && isHeroOnSpawnWaveTile()) {
    return "Spawn Wave triggered.";
  }

  if (isHeroOnSpawnStreamTile()) {
    return "Standing on Spawn Stream.";
  }

  if (isHeroOnDodgeArenaTile()) {
    return "Step onto Dodge Arena to teleport in.";
  }

  const tree = getNearbyTree();
  if (hero.isHarvesting) {
    return "Harvesting tree...";
  }
  if (tree) {
    return "Press E to harvest this tree for 25 wood.";
  }
  if (hero.hasRifle) {
    return "Left-click to fire the M4 rifle.";
  }
  return "Walk near a tree and press E to harvest wood.";
}

function updateTrainButton() {
  const selected = buildings.find((b) => b.id === player.selectedBuildingId && b.type === "barracks" && b.isPlayer);
  const show = Boolean(selected);
  trainSoldierBtn.classList.toggle("hidden", !show);
  trainSoldierBtn.disabled = player.money < 50 || !show;
}

function isPlayerBaseSelected() {
  return player.selectedBuildingId === playerBase.id;
}

function updateBuildBarracksButton() {
  buildBarracksBtn.disabled = !isPlayerBaseSelected() || player.isPlacingBuilding;
}

function startBarracksPlacement() {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (player.shopOpen || player.traderOpen) {
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
  clearUnitSelection();
  player.selectedUnits = [];
  updateTrainButton();
  updateBuildBarracksButton();
  statusTextEl.textContent = "Place the Barracks on open ground. Right-click or press Escape to cancel.";
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

  const showDash = hero.selectedClass === "robot";
  const dashReady = hero.dashCooldownRemaining <= 0;
  dashAbilityEl.classList.toggle("hidden", !showDash);
  dashAbilityNameEl.textContent = "Dash";
  dashAbilityEl.classList.toggle("ready", showDash && dashReady);
  dashAbilityEl.classList.toggle("cooldown", !showDash || !dashReady);
  dashCooldownTextEl.textContent = !showDash
    ? "Unavailable"
    : dashReady
      ? "Ready"
      : `${hero.dashCooldownRemaining.toFixed(1)}s`;
}

function updateShopUI() {
  shopPanelEl.classList.toggle("hidden", !player.shopOpen);
  shopSellWoodBtn.disabled = player.wood < 25;
}

function updateTraderUI() {
  traderPanelEl.classList.toggle("hidden", !player.traderOpen);
  buyWeaponUpgradeBtn.disabled = player.money < 50;
  traderStatusEl.textContent = `Current bonus: +${player.weaponBonusStat} weapon`;
}

function getSelectedClassConfig() {
  return hero.selectedClass ? CHARACTER_OPTIONS[hero.selectedClass] : null;
}

function getBaseArmor(selected = getSelectedClassConfig()) {
  return selected?.stats?.armor || 0;
}

function getHelmetArmorValue() {
  if (hero.equippedArmorValue > 0) {
    return hero.equippedArmorValue + player.helmetBonusArmor;
  }

  return player.helmetBonusArmor;
}

function getTotalArmor(selected = getSelectedClassConfig()) {
  return Math.max(getBaseArmor(selected) + player.bonusArmor, getHelmetArmorValue());
}

function getDisplayedWeaponStat(selected = getSelectedClassConfig()) {
  return (selected?.stats?.weapon || 0) + player.weaponBonusStat + player.bonusDamage;
}

function getBasicBowDamage() {
  return (CHARACTER_OPTIONS.archer?.damage || 0) + player.bonusDamage;
}

function getAbilityDamage(selected = getSelectedClassConfig()) {
  return (selected?.damage || 0) + player.weaponBonusDamage + player.bonusAbilityDamage;
}

function getHeroSpeed(selected = getSelectedClassConfig()) {
  return (selected?.agility || hero.speed || 0) + player.bonusSpeed;
}

function updateUpgradeUI() {
  upgradePointsEl.textContent = `Upgrade Points: ${player.upgradePoints}`;
  upgradePointsEl.classList.toggle("hidden", player.upgradePoints <= 0);
  upgradeActionEls.forEach((element) => {
    element.classList.toggle("hidden", player.upgradePoints <= 0);
  });
}

upgradeActionEls.forEach((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyUpgrade(element.dataset.upgrade);
  });
});

function updateStatsUI() {
  const selected = getSelectedClassConfig();
  const stats = selected?.stats || { armor: 0, health: 0, weapon: 0 };
  const armor = getTotalArmor(selected);
  const damage = getDisplayedWeaponStat(selected);
  const health = hero.maxHp || stats.health;
  const speed = getHeroSpeed(selected);

  armorValueEl.textContent = String(armor);
  healthValueEl.textContent = String(health);
  weaponValueEl.textContent = String(damage);
  speedValueEl.textContent = String(speed);
  armorFillEl.style.width = `${armor}%`;
  healthFillEl.style.width = `${Math.min(100, (health / 200) * 100)}%`;
  weaponFillEl.style.width = `${Math.min(100, damage * 2)}%`;
  speedFillEl.style.width = `${Math.min(100, (speed / 300) * 100)}%`;
  updateEquipmentUI(selected, stats);
}

function buildHelmetIcon(fill, stroke) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M16 31c0-10 7-18 16-18s16 8 16 18v8c0 2-2 4-4 4H20c-2 0-4-2-4-4z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M23 43v6h18v-6" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 29h16" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function updateEquipmentUI(selected, stats) {
  const equippedWeaponType = hero.hasBow
    ? "bow"
    : hero.hasRifle
      ? "rifle"
      : hero.hasAxe
        ? "axe"
        : null;

  if (equippedWeaponType === "bow") {
    equipmentWeaponIconEl.src = "./images/bow.png";
    equipmentWeaponNameEl.textContent = "Bow";
    equipmentWeaponMetaEl.textContent = "Ranged weapon";
  } else if (equippedWeaponType === "rifle") {
    equipmentWeaponIconEl.src = "./images/rifle.png";
    equipmentWeaponNameEl.textContent = "M4 Rifle";
    equipmentWeaponMetaEl.textContent = "Automatic rifle";
  } else if (equippedWeaponType === "axe") {
    equipmentWeaponIconEl.src = "./images/sword.jpg";
    equipmentWeaponNameEl.textContent = "Axe";
    equipmentWeaponMetaEl.textContent = "Melee weapon";
  } else {
    equipmentWeaponIconEl.src = "./images/rifle.png";
    equipmentWeaponNameEl.textContent = "None";
    equipmentWeaponMetaEl.textContent = "No weapon equipped";
  }

  equipmentWeaponIconEl.style.opacity = equippedWeaponType ? "1" : "0.35";

  if (selected) {
    equipmentAbilityNameEl.textContent = selected.abilityName;
    equipmentAbilityMetaEl.textContent = "Bound to F";
  } else {
    equipmentAbilityNameEl.textContent = "None";
    equipmentAbilityMetaEl.textContent = "Choose a class";
  }

  const equippedHelmetType = hero.latestPickup?.type === "helmet" ||
    hero.latestPickup?.type === "rareHelmet" ||
    hero.latestPickup?.type === "enemyHelmet"
    ? hero.latestPickup.type
    : hero.equippedHelmetType || (player.helmetBonusArmor > 0 ? "helmet" : null);

  const helmetArmorValue = getHelmetArmorValue();

  if (equippedHelmetType === "rareHelmet") {
    equipmentHelmetIconEl.src = buildHelmetIcon("#4ea0ff", "#d2efff");
    equipmentHelmetNameEl.textContent = "Rare Helmet";
    equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
  } else if (equippedHelmetType === "enemyHelmet") {
    equipmentHelmetIconEl.src = buildHelmetIcon("#78bf6f", "#ecffd8");
    equipmentHelmetNameEl.textContent = "Enemy Helmet";
    equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
  } else if (equippedHelmetType === "helmet") {
    equipmentHelmetIconEl.src = buildHelmetIcon("#9ca7b8", "#edf3ff");
    equipmentHelmetNameEl.textContent = "Helmet";
    equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
  } else {
    equipmentHelmetIconEl.src = buildHelmetIcon("#56615d", "#aeb8b3");
    equipmentHelmetNameEl.textContent = "None";
    equipmentHelmetMetaEl.textContent = "No helmet equipped";
  }

  equipmentHelmetIconEl.style.opacity = equippedHelmetType ? "1" : "0.35";

  if (selected && stats.armor > 0) {
    equipmentBodyArmorNameEl.textContent = "Standard Armor";
    equipmentBodyArmorMetaEl.textContent = `Base armor ${stats.armor + player.bonusArmor}`;
  } else {
    equipmentBodyArmorNameEl.textContent = "None";
    equipmentBodyArmorMetaEl.textContent = "No body armor equipped";
  }
}

function getXpRequiredForLevel(level) {
  return 50 + (level - 1) * 25;
}

function updateXpUI() {
  const xpRequired = getXpRequiredForLevel(player.level);
  xpLevelEl.textContent = `Level ${player.level} • ${player.xp}/${xpRequired} XP`;
  xpFillEl.style.width = `${Math.min(100, (player.xp / xpRequired) * 100)}%`;
  updateUpgradeUI();
}

function awardPlayerXp(amount, sourceX = hero.x, sourceY = hero.y) {
  if (amount <= 0) {
    return;
  }

  player.xp += amount;
  spawnTextPopup(sourceX, sourceY - 24, `+${amount} XP`, "rgba(150, 219, 255, 1)", 1.2);

  let leveledUp = false;
  while (player.xp >= getXpRequiredForLevel(player.level)) {
    player.xp -= getXpRequiredForLevel(player.level);
    player.level += 1;
    player.upgradePoints += 1;
    leveledUp = true;
  }

  if (leveledUp) {
    statusTextEl.textContent = `Level up! You are now level ${player.level}.`;
  }

  updateXpUI();
}

function applyUpgrade(upgradeId) {
  if (player.upgradePoints <= 0) {
    return;
  }

  if (upgradeId === "health") {
    player.bonusHealth += 10;
    hero.maxHp += 10;
    hero.hp = Math.min(hero.maxHp, hero.hp + 10);
    statusTextEl.textContent = "Upgrade applied: +10 max HP.";
  } else if (upgradeId === "armor") {
    player.bonusArmor += 3;
    statusTextEl.textContent = "Upgrade applied: +3 armor.";
  } else if (upgradeId === "damage") {
    player.bonusDamage += 2;
    statusTextEl.textContent = "Upgrade applied: +2 damage.";
  } else if (upgradeId === "speed") {
    player.bonusSpeed += 5;
    hero.speed += 5;
    statusTextEl.textContent = "Upgrade applied: +5 speed.";
  } else if (upgradeId === "ability") {
    player.bonusAbilityDamage += 3;
    statusTextEl.textContent = "Upgrade applied: +3 ability damage.";
  } else if (upgradeId === "helmet") {
    player.helmetBonusArmor += 3;
    if (!hero.equippedHelmetType) {
      hero.equippedHelmetType = "helmet";
    }
    statusTextEl.textContent = "Upgrade applied: +3 helmet armor.";
  } else {
    return;
  }

  player.upgradePoints -= 1;
  updateStatsUI();
  updateXpUI();
}

function getShopBuilding() {
  return buildings.find((building) => building.type === "shop" && building.isPlayer) || null;
}

function isHeroNearShop() {
  const shop = getShopBuilding();
  if (!shop) {
    return false;
  }

  const shopCenter = { x: shop.x + shop.w / 2, y: shop.y + shop.h / 2 };
  return distance(hero, shopCenter) <= 280;
}

function isHeroNearTrader() {
  return distance(hero, trader) <= 190;
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
  spawnTextPopup(hero.x, hero.y - 28, "Dodge Arena", "rgba(172, 225, 255, 1)", 1.4);
}

function leaveDodgeArena(message = "Returned from the Dodge Arena.") {
  player.inDodgeArena = false;
  dodgeArenaBullets.length = 0;
  hero.hp = hero.maxHp;
  hero.x = player.dodgeArenaReturnX;
  hero.y = player.dodgeArenaReturnY;
  hero.targetPos = null;
  statusTextEl.textContent = message;
  spawnTextPopup(hero.x, hero.y - 28, "Returned", "rgba(196, 234, 255, 1)", 1.2);
}

function spawnDodgeArenaBullet() {
  dodgeArenaBullets.push({
    x: DODGE_ARENA.x + 24 + Math.random() * (DODGE_ARENA.w - 48),
    y: DODGE_ARENA.y - 18,
    radius: 7 + Math.random() * 2,
    speed: 260 + Math.random() * 90,
    damage: 14,
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
      hero.hp -= bullet.damage;
      spawnDamagePopup(hero, bullet.damage);
      dodgeArenaBullets.splice(index, 1);
      continue;
    }
    if (bullet.y > DODGE_ARENA.y + DODGE_ARENA.h + 24) {
      dodgeArenaBullets.splice(index, 1);
    }
  }
}

function spawnSingleSkeleton(x = 200 + Math.random() * 650, y = 90 + Math.random() * 30) {
  createUnit("skeleton", x, y, false);
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
  spawnTextPopup(SPAWN_WAVE_TILE.x + SPAWN_WAVE_TILE.size / 2, SPAWN_WAVE_TILE.y - 10, "Skeleton wave spawned!", "rgba(245, 240, 220, 1)", 1.8);
}

function spawnRareHelmetDrop(x, y) {
  pickups.push({
    id: nextId(),
    type: "rareHelmet",
    x,
    y,
    radius: 18,
    collected: false,
    armorValue: 85,
  });
}

function spawnPickupDrop(pickup, x, y) {
  pickups.push({
    id: nextId(),
    type: pickup.type,
    x,
    y,
    radius: pickup.radius ?? 18,
    collected: false,
    pickupDelay: 0.3,
    armorValue: pickup.armorValue,
    healthValue: pickup.healthValue,
    damageValue: pickup.damageValue,
  });
}

function dropLatestPickupFromHero() {
  if (!hero.latestPickup) {
    return;
  }

  spawnPickupDrop(hero.latestPickup, hero.x, hero.y);
  hero.latestPickup = null;
}

function dropLatestPickupFromEnemyHero() {
  if (!enemyHero.latestPickup) {
    return;
  }

  spawnPickupDrop(enemyHero.latestPickup, enemyHero.x, enemyHero.y);
  enemyHero.latestPickup = null;
}

function respawnHero() {
  dropLatestPickupFromHero();
  const selectedClass = hero.selectedClass ? CHARACTER_OPTIONS[hero.selectedClass] : null;
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
  hero.weaponPickupCooldown = 0;
  hero.hasRifle = hero.selectedClass === "soldier";
  hero.rifleCooldown = 0;
  hero.ammo = hero.hasRifle ? hero.maxAmmo : 0;
  hero.isReloading = false;
  hero.reloadTimer = 0;
  hero.isDead = false;
  hero.deathTimer = 0;
  hero.dashTimer = 0;
  hero.dashCooldown = selectedClass?.dashCooldown || 0;
  hero.dashCooldownRemaining = 0;
  heroProjectiles.length = 0;
  hero.maxHp = (selectedClass?.stats?.health || 150) + player.bonusHealth;
  hero.hp = hero.maxHp;
  hero.x = PLAYER_BASE_SPAWN.x;
  hero.y = PLAYER_BASE_SPAWN.y;
  hero.targetPos = null;
  cancelHarvest();
  closeShop();
  closeTrader();
  updateStatsUI();
  statusTextEl.textContent = "You respawned at base.";
  spawnTextPopup(hero.x, hero.y - 30, "Respawned!", "rgba(196, 234, 255, 1)", 1.4);
}

function openShop() {
  if (!isHeroNearShop()) {
    statusTextEl.textContent = "Move closer to the Shop first.";
    return;
  }
  player.shopOpen = true;
  updateShopUI();
}

function closeShop() {
  player.shopOpen = false;
  updateShopUI();
}

function openTrader() {
  if (!isHeroNearTrader()) {
    statusTextEl.textContent = "Move closer to the Trader first.";
    return;
  }
  player.traderOpen = true;
  updateTraderUI();
}

function closeTrader() {
  player.traderOpen = false;
  updateTraderUI();
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

function getDamagePopupPoint(target) {
  if (typeof target.w === "number" && typeof target.h === "number") {
    return { x: target.x + target.w / 2, y: target.y - 12 };
  }
  return { x: target.x, y: target.y - target.radius - 10 };
}

function spawnDamagePopup(target, amount) {
  const point = getDamagePopupPoint(target);
  damagePopups.push({
    x: point.x,
    y: point.y,
    amount,
    ttl: 0.6,
    maxTtl: 0.6,
    color: "rgba(255, 230, 140, 1)",
    outline: "rgba(35, 20, 10, 1)",
  });
}

function spawnTextPopup(x, y, text, color = "rgba(255, 230, 140, 1)", ttl = 0.9) {
  damagePopups.push({
    x,
    y,
    amount: text,
    ttl,
    maxTtl: ttl,
    color,
    outline: "rgba(35, 20, 10, 1)",
  });
}

function dealDamage(target, amount, showPopup = false) {
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
      dealDamage(enemies[i], damage, true);
    }
  }
  if (isPointInSlash(enemyHero)) {
    dealDamage(enemyHero, damage, true);
  }
  for (const building of buildings) {
    if (!building.isPlayer && isPointInSlash(getEntityTargetPoint(building))) {
      dealDamage(building, damage, true);
    }
  }

  hero.slashRadius = originalRadius;
  hero.slashHalfAngle = originalAngle;
}

function damageEnemiesInRadius(damage, radius) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (distance(hero, enemies[i]) <= radius) {
      dealDamage(enemies[i], damage, true);
    }
  }
  if (distance(hero, enemyHero) <= radius) {
    dealDamage(enemyHero, damage, true);
  }
  for (const building of buildings) {
    if (!building.isPlayer && distance(hero, getEntityTargetPoint(building)) <= radius + 24) {
      dealDamage(building, damage, true);
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
  if (distanceToSegment(enemyHero, start, end) <= width) {
    dealDamage(enemyHero, damage, true);
  }
  for (const building of buildings) {
    if (!building.isPlayer && distanceToSegment(getEntityTargetPoint(building), start, end) <= width + 18) {
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

function spawnBurstProjectile(shot, damage, width) {
  const angle = (shot.baseAngle ?? hero.facingAngle) + shot.angleOffset;
  return {
    x: hero.x,
    y: hero.y,
    angle,
    speed: 720,
    radius: Math.max(4, width * 0.45),
    damage,
    width,
    traveled: 0,
    maxDistance: shot.range,
    active: true,
    hitIds: new Set(),
    ricochetCount: 0,
    ricochetTimer: 0,
  };
}

function spawnAbilityProjectile(config) {
  return {
    x: hero.x,
    y: hero.y,
    angle: hero.facingAngle,
    speed: config.speed || 820,
    radius: Math.max(4, (config.width || 10) * 0.45),
    damage: config.damage,
    width: config.width || 10,
    traveled: 0,
    maxDistance: config.range,
    active: true,
    stopOnHit: true,
    style: config.style || "arrow",
  };
}

function buildArcherArrowProjectile(damageOverride = null) {
  const archerClass = CHARACTER_OPTIONS.archer || {};
  return spawnAbilityProjectile({
    damage: damageOverride ?? getAbilityDamage(archerClass),
    width: archerClass.width || 10,
    range: canvas.width * 0.5,
    style: "arrow",
    speed: 820,
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

function intersectsBuilding(point, radius, building) {
  const closestX = clamp(point.x, building.x, building.x + building.w);
  const closestY = clamp(point.y, building.y, building.y + building.h);
  return Math.hypot(point.x - closestX, point.y - closestY) <= radius;
}

function intersectsTree(point, radius, tree) {
  return Math.hypot(point.x - tree.x, point.y - tree.y) <= radius + tree.radius;
}

function intersectsStone(point, radius, stone) {
  return Math.hypot(point.x - stone.x, point.y - stone.y) <= radius + stone.radius;
}

function resolveCircleAgainstRect(entity, radius, rect) {
  const closestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const closestY = clamp(entity.y, rect.y, rect.y + rect.h);
  const dx = entity.x - closestX;
  const dy = entity.y - closestY;
  const distanceToRect = Math.hypot(dx, dy);

  if (distanceToRect > 0 && distanceToRect < radius) {
    const overlap = radius - distanceToRect;
    entity.x = clamp(entity.x + (dx / distanceToRect) * overlap, radius, WORLD.width - radius);
    entity.y = clamp(entity.y + (dy / distanceToRect) * overlap, radius, WORLD.height - radius);
    return;
  }

  if (distanceToRect === 0) {
    const distances = [
      { axis: "left", value: Math.abs(entity.x - rect.x) },
      { axis: "right", value: Math.abs(rect.x + rect.w - entity.x) },
      { axis: "top", value: Math.abs(entity.y - rect.y) },
      { axis: "bottom", value: Math.abs(rect.y + rect.h - entity.y) },
    ];
    distances.sort((a, b) => a.value - b.value);
    const nearest = distances[0];
    if (nearest.axis === "left") {
      entity.x = rect.x - radius;
    } else if (nearest.axis === "right") {
      entity.x = rect.x + rect.w + radius;
    } else if (nearest.axis === "top") {
      entity.y = rect.y - radius;
    } else {
      entity.y = rect.y + rect.h + radius;
    }
    entity.x = clamp(entity.x, radius, WORLD.width - radius);
    entity.y = clamp(entity.y, radius, WORLD.height - radius);
  }
}

function resolveHeroObstacleCollisions() {
  const obstacles = [...trees, ...stones];
  for (const obstacle of obstacles) {
    const dx = hero.x - obstacle.x;
    const dy = hero.y - obstacle.y;
    const minDistance = hero.radius + obstacle.radius;
    const distanceToObstacle = Math.hypot(dx, dy);

    if (distanceToObstacle === 0) {
      hero.x = clamp(obstacle.x + minDistance, hero.radius, WORLD.width - hero.radius);
      continue;
    }

    if (distanceToObstacle < minDistance) {
      const overlap = minDistance - distanceToObstacle;
      hero.x = clamp(hero.x + (dx / distanceToObstacle) * overlap, hero.radius, WORLD.width - hero.radius);
      hero.y = clamp(hero.y + (dy / distanceToObstacle) * overlap, hero.radius, WORLD.height - hero.radius);
    }
  }

  for (const building of buildings) {
    resolveCircleAgainstRect(hero, hero.radius, building);
  }

  for (const prop of villageProps) {
    if (!prop.collidable) {
      continue;
    }
    if (prop.shape === "rect") {
      resolveCircleAgainstRect(hero, hero.radius, prop);
      continue;
    }

    const dx = hero.x - prop.x;
    const dy = hero.y - prop.y;
    const minDistance = hero.radius + prop.radius;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < minDistance) {
      const overlap = minDistance - dist;
      hero.x = clamp(hero.x + (dx / dist) * overlap, hero.radius, WORLD.width - hero.radius);
      hero.y = clamp(hero.y + (dy / dist) * overlap, hero.radius, WORLD.height - hero.radius);
    }
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
    if (intersectsTree(projectile, projectile.radius, tree)) {
      projectile.active = false;
      return;
    }
  }

  for (const stone of stones) {
    if (intersectsStone(projectile, projectile.radius, stone)) {
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

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (!projectile.hitIds.has(enemies[i].id) && distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
      dealDamage(enemies[i], projectile.damage, true);
      projectile.hitIds.add(enemies[i].id);
    }
  }

  if (!projectile.hitIds.has(enemyHero.id) && distance(projectile, enemyHero) <= projectile.radius + enemyHero.radius) {
    dealDamage(enemyHero, projectile.damage, true);
    projectile.hitIds.add(enemyHero.id);
  }

  for (const building of buildings) {
    if (!building.isPlayer && !projectile.hitIds.has(building.id) && intersectsBuilding(projectile, projectile.radius, building)) {
      dealDamage(building, projectile.damage, true);
      projectile.hitIds.add(building.id);
    }
  }

  const offscreenMargin = 24;
  if (
    projectile.traveled >= projectile.maxDistance ||
    projectile.x < camera.x - offscreenMargin ||
    projectile.y < camera.y - offscreenMargin ||
    projectile.x > camera.x + canvas.width + offscreenMargin ||
    projectile.y > camera.y + canvas.height + offscreenMargin
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
    if (intersectsTree(projectile, projectile.radius, tree)) {
      projectile.active = false;
      return;
    }
  }

  for (const stone of stones) {
    if (intersectsStone(projectile, projectile.radius, stone)) {
      projectile.active = false;
      return;
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
      dealDamage(enemies[i], projectile.damage, true);
      projectile.active = false;
      return;
    }
  }

  if (distance(projectile, enemyHero) <= projectile.radius + enemyHero.radius) {
    dealDamage(enemyHero, projectile.damage, true);
    projectile.active = false;
    return;
  }

  for (const building of buildings) {
    if (!building.isPlayer && intersectsBuilding(projectile, projectile.radius, building)) {
      dealDamage(building, projectile.damage, true);
      projectile.active = false;
      return;
    }
  }

  const offscreenMargin = 24;
  if (
    projectile.traveled >= projectile.maxDistance ||
    projectile.x < camera.x - offscreenMargin ||
    projectile.y < camera.y - offscreenMargin ||
    projectile.x > camera.x + canvas.width + offscreenMargin ||
    projectile.y > camera.y + canvas.height + offscreenMargin
  ) {
    projectile.active = false;
  }
}

function updateHeroProjectiles(dt) {
  for (let i = heroProjectiles.length - 1; i >= 0; i -= 1) {
    if (heroProjectiles[i].style === "arrow") {
      updateAbilityProjectile(heroProjectiles[i], dt);
    } else {
      updateBurstProjectile(heroProjectiles[i], dt);
    }
    if (!heroProjectiles[i].active) {
      heroProjectiles.splice(i, 1);
    }
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
  updateBuildBarracksButton();
}

function selectSingleUnit(unit) {
  clearUnitSelection();
  player.selectedUnits = [unit.id];
  unit.selected = true;
  player.selectedBuildingId = null;
  updateTrainButton();
  updateBuildBarracksButton();
}

function selectBuilding(building) {
  clearUnitSelection();
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

function getNearbyTree() {
  return trees.find((tree) => distance(hero, tree) <= hero.radius + tree.radius + 20) || null;
}

function isManualPickupType(type) {
  return type === "helmet" ||
    type === "rareHelmet" ||
    type === "enemyHelmet" ||
    type === "axe" ||
    type === "rifle" ||
    type === "bow";
}

function getNearbyPickup() {
  return pickups.find(
    (pickup) => !pickup.collected &&
      !pickup.pickupDelay &&
      isManualPickupType(pickup.type) &&
      distance(hero, pickup) <= hero.radius + pickup.radius + 16
  ) || null;
}

function equipPickup(pickup) {
  if (pickup.type === "helmet" || pickup.type === "rareHelmet" || pickup.type === "enemyHelmet") {
    const previousArmor = getTotalArmor();
    if (hero.equippedHelmetType && hero.equippedArmorValue > 0) {
      spawnPickupDrop(
        {
          type: hero.equippedHelmetType,
          armorValue: hero.equippedArmorValue,
          radius: pickup.radius,
        },
        pickup.x + 20,
        pickup.y
      );
    }
    hero.equippedArmorValue = pickup.armorValue;
    hero.equippedHelmetType = pickup.type;
    hero.latestPickup = {
      type: pickup.type,
      armorValue: pickup.armorValue,
      radius: pickup.radius,
    };
    const armorDelta = getTotalArmor() - previousArmor;
    updateStatsUI();
    if (pickup.type === "rareHelmet") {
      spawnTextPopup(pickup.x, pickup.y - 22, "Rare Helmet picked up!", "rgba(120, 196, 255, 1)", 1.8);
      spawnTextPopup(pickup.x, pickup.y + 4, `Rare Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(120, 196, 255, 1)", 1.8);
    } else if (pickup.type === "enemyHelmet") {
      spawnTextPopup(pickup.x, pickup.y - 22, "Enemy Helmet picked up!", "rgba(170, 255, 170, 1)", 1.8);
      spawnTextPopup(pickup.x, pickup.y + 4, `Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(170, 255, 170, 1)", 1.8);
    } else {
      spawnTextPopup(pickup.x, pickup.y - 22, "Helmet equipped!", "rgba(196, 234, 255, 1)", 1.8);
      spawnTextPopup(pickup.x, pickup.y + 4, `Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(156, 245, 164, 1)", 1.8);
    }
    return;
  }

  if (pickup.type === "axe") {
    if (hero.weaponPickupCooldown > 0) {
      pickup.collected = false;
      return;
    }
    swapHeroWeaponPickup("axe", pickup.x, pickup.y, pickup.radius);
    hero.hasAxe = true;
    hero.weaponPickupCooldown = 0.8;
    hero.latestPickup = {
      type: "axe",
      radius: pickup.radius,
    };
    updateStatsUI();
    spawnTextPopup(pickup.x, pickup.y - 12, "Axe equipped!", "rgba(255, 214, 164, 1)", 1.8);
    spawnTextPopup(pickup.x, pickup.y + 12, "Click to swing", "rgba(255, 236, 201, 1)", 1.8);
    return;
  }

  if (pickup.type === "rifle") {
    if (hero.weaponPickupCooldown > 0) {
      pickup.collected = false;
      return;
    }
    swapHeroWeaponPickup("rifle", pickup.x, pickup.y, pickup.radius);
    hero.hasRifle = true;
    hero.weaponPickupCooldown = 0.8;
    hero.ammo = hero.maxAmmo;
    hero.isReloading = false;
    hero.reloadTimer = 0;
    hero.latestPickup = {
      type: "rifle",
      radius: pickup.radius,
    };
    updateStatsUI();
    spawnTextPopup(pickup.x, pickup.y - 12, "M4 equipped!", "rgba(196, 234, 255, 1)", 1.8);
    spawnTextPopup(pickup.x, pickup.y + 12, "Left-click to fire", "rgba(196, 234, 255, 1)", 1.8);
    return;
  }

  if (pickup.type === "bow") {
    if (hero.weaponPickupCooldown > 0) {
      pickup.collected = false;
      return;
    }
    swapHeroWeaponPickup("bow", pickup.x, pickup.y, pickup.radius);
    hero.hasBow = true;
    hero.bowCooldown = 0;
    hero.weaponPickupCooldown = 0.8;
    hero.latestPickup = {
      type: "bow",
      radius: pickup.radius,
    };
    updateStatsUI();
    spawnTextPopup(pickup.x, pickup.y - 12, "Bow equipped!", "rgba(214, 200, 154, 1)", 1.8);
    spawnTextPopup(pickup.x, pickup.y + 12, "Hold left-click to fire", "rgba(245, 234, 196, 1)", 1.8);
  }
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

function useSlash(targetX = null, targetY = null) {
  if (!player.hasSelectedCharacter || player.victory || player.loss || hero.slashTimer > 0) {
    return false;
  }

  const selectedClass = CHARACTER_OPTIONS[hero.selectedClass];
  if (!selectedClass) {
    return false;
  }
  if (targetX !== null && targetY !== null) {
    const dx = targetX - hero.x;
    const dy = targetY - hero.y;
    if (Math.hypot(dx, dy) >= 1) {
      hero.facingAngle = Math.atan2(dy, dx);
    }
  }
  hero.slashCooldown = selectedClass.cooldown;
  hero.slashTimer = hero.slashCooldown;
  hero.slashArcTimer = selectedClass.effect === "burst" ? 0.42 : 0.22;
  hero.abilityEffect = { ...selectedClass, aimAngle: hero.facingAngle };

  if (selectedClass.effect === "cone") {
    hero.slashRadius = selectedClass.radius;
    hero.slashHalfAngle = selectedClass.halfAngle;
    damageEnemiesInCone(getAbilityDamage(selectedClass), selectedClass.radius, selectedClass.halfAngle);
  } else if (selectedClass.effect === "line") {
    damageEnemiesInLine(getAbilityDamage(selectedClass), selectedClass.range, selectedClass.width);
  } else if (selectedClass.effect === "burst") {
    const burstBaseAngle = hero.abilityEffect.aimAngle;
    const shots = buildBurstShots(
      selectedClass.range,
      selectedClass.rounds,
      selectedClass.spreadAngle,
      selectedClass.shotAnglesDegrees
    );
    hero.abilityEffect.pendingShots = shots.map((shot, index) => ({
      ...shot,
      baseAngle: burstBaseAngle,
      damage: getAbilityDamage(selectedClass),
      width: selectedClass.width,
      delay: index * 0.045,
    }));
    hero.abilityEffect.projectiles = [];
  } else if (selectedClass.effect === "projectile") {
    hero.abilityEffect.projectiles = [buildArcherArrowProjectile(getAbilityDamage(selectedClass))];
  } else if (selectedClass.effect === "nova") {
    damageEnemiesInRadius(getAbilityDamage(selectedClass), selectedClass.radius);
  }

  updateAbilityUI();
  return true;
}

function useAxeSwing() {
  if (!player.hasSelectedCharacter || player.victory || player.loss || !hero.hasAxe) {
    return;
  }

  hero.axeSwingTimer = hero.axeSwingDuration;
  damageEnemiesInCone(18 + player.bonusDamage, 64, Math.PI / 3);
}

function useRobotDash() {
  if (
    !player.hasSelectedCharacter ||
    player.victory ||
    player.loss ||
    hero.selectedClass !== "robot" ||
    hero.lastMoveAngle === null ||
    hero.dashTimer > 0 ||
    hero.dashCooldownRemaining > 0
  ) {
    return false;
  }

  hero.dashTimer = hero.dashDuration;
  hero.dashCooldownRemaining = hero.dashCooldown || 4;
  hero.facingAngle = hero.lastMoveAngle;
  hero.isMoving = true;
  if (hero.isHarvesting) {
    cancelHarvest();
  }
  statusTextEl.textContent = "Dash activated.";
  return true;
}

function swapHeroWeaponPickup(nextWeaponType, x, y, radius) {
  if (nextWeaponType === "axe" && hero.hasRifle) {
    spawnPickupDrop({ type: "rifle", radius }, x + 18, y);
    hero.hasRifle = false;
    hero.ammo = 0;
    hero.isReloading = false;
    hero.reloadTimer = 0;
  }

  if (nextWeaponType === "bow" && hero.hasRifle) {
    spawnPickupDrop({ type: "rifle", radius }, x + 18, y);
    hero.hasRifle = false;
    hero.ammo = 0;
    hero.isReloading = false;
    hero.reloadTimer = 0;
  }

  if (nextWeaponType === "bow" && hero.hasAxe) {
    spawnPickupDrop({ type: "axe", radius }, x - 18, y);
    hero.hasAxe = false;
    hero.axeSwingTimer = 0;
  }

  if ((nextWeaponType === "axe" || nextWeaponType === "rifle") && hero.hasBow) {
    spawnPickupDrop({ type: "bow", radius }, x, y + 18);
  }

  if ((nextWeaponType === "axe" || nextWeaponType === "rifle" || nextWeaponType === "bow") && hero.hasBow) {
    hero.hasBow = false;
    hero.bowCooldown = 0;
  }

  if (nextWeaponType === "rifle" && hero.hasAxe) {
    spawnPickupDrop({ type: "axe", radius }, x - 18, y);
    hero.hasAxe = false;
    hero.axeSwingTimer = 0;
  }
}

function startReload(force = false) {
  if (!hero.hasRifle || hero.isReloading) {
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
  if (!hero.hasRifle || hero.isReloading || hero.rifleCooldown > 0 || hero.ammo <= 0 || hero.shootLockTimer > 0) {
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
  hero.rifleCooldown = 0.08;
  hero.ammo -= 1;
  heroProjectiles.push({
    ...spawnBurstProjectile({ angleOffset: 0, range: GRID_SIZE * 5 }, 16 + player.bonusDamage, 18),
    x: hero.x,
    y: hero.y,
    angle,
  });
  if (hero.ammo === 0) {
    startReload();
  }
  return true;
}

function spawnHeroBowShot(targetX, targetY) {
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
  hero.bowCooldown = 0.45;
  heroProjectiles.push({
    ...buildArcherArrowProjectile(getBasicBowDamage()),
    x: hero.x,
    y: hero.y,
    angle: hero.facingAngle,
  });
  return true;
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
  if (hero.isDead) {
    hero.deathTimer = Math.max(0, hero.deathTimer - dt);
    hero.isMoving = false;
    if (hero.deathTimer === 0) {
      respawnHero();
    }
    return;
  }

  hero.slashTimer = Math.max(0, hero.slashTimer - dt);
  hero.slashArcTimer = Math.max(0, hero.slashArcTimer - dt);
  hero.axeSwingTimer = Math.max(0, hero.axeSwingTimer - dt);
  hero.bowCooldown = Math.max(0, hero.bowCooldown - dt);
  hero.shootLockTimer = Math.max(0, hero.shootLockTimer - dt);
  hero.weaponPickupCooldown = Math.max(0, hero.weaponPickupCooldown - dt);
  hero.rifleCooldown = Math.max(0, hero.rifleCooldown - dt);
  hero.dashTimer = Math.max(0, hero.dashTimer - dt);
  hero.dashCooldownRemaining = Math.max(0, hero.dashCooldownRemaining - dt);
  if (hero.isReloading) {
    hero.reloadTimer = Math.max(0, hero.reloadTimer - dt);
    if (hero.reloadTimer === 0) {
      hero.isReloading = false;
      hero.ammo = hero.maxAmmo;
    }
  }
  hero.isMoving = false;
  if (mouse.leftDown && !player.isPlacingBuilding && !player.shopOpen && !player.traderOpen) {
    if (hero.hasRifle) {
      spawnHeroBullet(mouse.worldX, mouse.worldY);
    } else if (hero.hasBow) {
      spawnHeroBowShot(mouse.worldX, mouse.worldY);
    }
  }
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
  } else if (hero.abilityEffect?.effect === "projectile") {
    const projectiles = hero.abilityEffect.projectiles || [];
    for (let index = projectiles.length - 1; index >= 0; index -= 1) {
      updateAbilityProjectile(projectiles[index], dt);
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

  if (player.shopOpen || player.traderOpen) {
    woodCountEl.textContent = String(player.wood);
    moneyCountEl.textContent = String(player.money);
    updateAbilityUI();
    return;
  }

  const dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  const dy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);

  if (hero.dashTimer > 0) {
    hero.x = clamp(hero.x + Math.cos(hero.lastMoveAngle) * hero.dashSpeed * dt, hero.radius, WORLD.width - hero.radius);
    hero.y = clamp(hero.y + Math.sin(hero.lastMoveAngle) * hero.dashSpeed * dt, hero.radius, WORLD.height - hero.radius);
    resolveHeroObstacleCollisions();
    hero.isMoving = true;
  } else if (dx || dy) {
    const mag = Math.hypot(dx, dy);
    hero.lastMoveAngle = Math.atan2(dy / mag, dx / mag);
    hero.facingAngle = hero.lastMoveAngle;
    hero.x = clamp(hero.x + (dx / mag) * hero.speed * dt, hero.radius, WORLD.width - hero.radius);
    hero.y = clamp(hero.y + (dy / mag) * hero.speed * dt, hero.radius, WORLD.height - hero.radius);
    resolveHeroObstacleCollisions();
    hero.isMoving = true;
    if (hero.isHarvesting) {
      cancelHarvest();
    }
  }

  if (!SPAWN_WAVE_TILE.triggered && isHeroOnSpawnWaveTile()) {
    spawnSkeletonWave();
  }

  if (isHeroOnSpawnStreamTile()) {
    SPAWN_STREAM_TILE.timer += dt;
    while (SPAWN_STREAM_TILE.timer >= SPAWN_STREAM_TILE.interval) {
      spawnSingleSkeleton();
      SPAWN_STREAM_TILE.timer -= SPAWN_STREAM_TILE.interval;
    }
  } else {
    SPAWN_STREAM_TILE.timer = 0;
  }

  if (!player.inDodgeArena && isHeroOnDodgeArenaTile()) {
    enterDodgeArena();
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

  for (const pickup of pickups) {
    if (pickup.pickupDelay) {
      pickup.pickupDelay = Math.max(0, pickup.pickupDelay - dt);
    }

    if (!pickup.collected && !pickup.pickupDelay && distance(hero, pickup) <= hero.radius + pickup.radius) {
      if (isManualPickupType(pickup.type)) {
        continue;
      }

      pickup.collected = true;
      if (pickup.type === "healthBuff") {
        player.bonusHealth += pickup.healthValue;
        hero.maxHp += pickup.healthValue;
        hero.hp = hero.maxHp;
        updateStatsUI();
        spawnTextPopup(pickup.x, pickup.y - 12, "Health Buff!", "rgba(255, 172, 172, 1)", 1.8);
        spawnTextPopup(pickup.x, pickup.y + 12, `Max HP +${pickup.healthValue}`, "rgba(255, 210, 210, 1)", 1.8);
      } else if (pickup.type === "weaponBuff") {
        player.bonusDamage += pickup.damageValue;
        updateStatsUI();
        spawnTextPopup(pickup.x, pickup.y - 12, "Weapon Buff!", "rgba(255, 218, 140, 1)", 1.8);
        spawnTextPopup(pickup.x, pickup.y + 12, `Damage +${pickup.damageValue}`, "rgba(255, 238, 196, 1)", 1.8);
      }
    }
  }

  if (hero.hp <= 0) {
    hero.hp = 0;
    if (player.inDodgeArena) {
      leaveDodgeArena("Arena down. Sent back to the main area.");
      updateAbilityUI();
      return;
    }
    hero.isDead = true;
    hero.deathTimer = hero.deathDuration;
  }

  woodCountEl.textContent = String(player.wood);
  moneyCountEl.textContent = String(player.money);
  statusTextEl.textContent = getCharacterStatus();
  updateAbilityUI();
}

function updateDamagePopups(dt) {
  for (let index = damagePopups.length - 1; index >= 0; index -= 1) {
    damagePopups[index].ttl -= dt;
    damagePopups[index].y -= 34 * dt;
    if (damagePopups[index].ttl <= 0) {
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
    const dist = distance(unit, otherUnit);
    if (dist < closestDistance) {
      closest = otherUnit;
      closestDistance = dist;
    }
  }

  for (const building of buildingsList) {
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

    if (!target) {
      target = unit.isPlayer
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
      if (dist > unit.attackRange) {
        moveTowards(unit, targetPoint.x, targetPoint.y, dt);
      } else if (unit.attackTimer === 0) {
        dealDamage(target, unit.damage, unit.isPlayer);
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

function isInsideDeathZone(entity) {
  return (
    entity.x >= DEATH_ZONE.x &&
    entity.x <= DEATH_ZONE.x + DEATH_ZONE.size &&
    entity.y >= DEATH_ZONE.y &&
    entity.y <= DEATH_ZONE.y + DEATH_ZONE.size
  );
}

function cleanupDeathZoneEntities() {
  if (isInsideDeathZone(hero)) {
    hero.hp = 0;
  }

  for (let i = units.length - 1; i >= 0; i -= 1) {
    const unit = units[i];
    if (!isInsideDeathZone(unit)) {
      continue;
    }
    units.splice(i, 1);
    player.selectedUnits = player.selectedUnits.filter((id) => id !== unit.id);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (isInsideDeathZone(enemies[i])) {
      enemies.splice(i, 1);
    }
  }

  if (enemyHero.active && isInsideDeathZone(enemyHero)) {
    enemyHero.active = false;
    enemyHero.hp = 0;
  }
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
      updateBuildBarracksButton();
    }
    if (building.type === "enemyBase") {
      triggerVictory();
    } else if (building.type === "playerBase") {
      triggerLoss();
    }
  }

  if (enemyHero.active && enemyHero.hp <= 0) {
    enemyHero.hp = 0;
    awardPlayerXp(enemyHero.xpReward || 0, enemyHero.x, enemyHero.y);
    dropLatestPickupFromEnemyHero();
    enemyHero.active = false;
  }

}

function cleanupDefeatedEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.hp > 0) {
      continue;
    }

    if (enemy.kind === "boss") {
      spawnRareHelmetDrop(enemy.x, enemy.y);
    }

    awardPlayerXp(enemy.xpReward || 0, enemy.x, enemy.y);
    enemies.splice(i, 1);
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
  updateDodgeArena(dt);
  updateHeroProjectiles(dt);
  updateUnits(dt, units, enemies, buildings.filter((b) => !b.isPlayer));
  updateUnits(dt, enemies, [hero, ...units], buildings.filter((b) => b.isPlayer));
  cleanupDeathZoneEntities();
  updateDamagePopups(dt);
  updateSparkEffects(dt);
  cleanupDefeatedEnemies();
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

function drawBackground() {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = COLORS.path;
  ctx.fillRect(0, MAIN_LANE_Y - 90, WORLD.width, 180);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let x = 0; x < WORLD.width; x += 120) {
    ctx.fillRect(x, 0, 2, WORLD.height);
  }
  for (let y = 0; y < WORLD.height; y += 120) {
    ctx.fillRect(0, y, WORLD.width, 2);
  }

  ctx.fillStyle = COLORS.deathZone;
  ctx.fillRect(DEATH_ZONE.x, DEATH_ZONE.y, DEATH_ZONE.size, DEATH_ZONE.size);
  ctx.strokeStyle = "rgba(255, 220, 220, 0.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(DEATH_ZONE.x, DEATH_ZONE.y, DEATH_ZONE.size, DEATH_ZONE.size);

  ctx.fillStyle = COLORS.spawnWave;
  ctx.fillRect(SPAWN_WAVE_TILE.x, SPAWN_WAVE_TILE.y, SPAWN_WAVE_TILE.size, SPAWN_WAVE_TILE.size);
  ctx.strokeStyle = "rgba(255, 237, 196, 0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(SPAWN_WAVE_TILE.x, SPAWN_WAVE_TILE.y, SPAWN_WAVE_TILE.size, SPAWN_WAVE_TILE.size);
  ctx.fillStyle = "#fff1cf";
  ctx.font = "700 14px Chakra Petch";
  ctx.textAlign = "center";
  ctx.fillText("SPAWN", SPAWN_WAVE_TILE.x + SPAWN_WAVE_TILE.size / 2, SPAWN_WAVE_TILE.y + 36);
  ctx.fillText("WAVE", SPAWN_WAVE_TILE.x + SPAWN_WAVE_TILE.size / 2, SPAWN_WAVE_TILE.y + 56);

  ctx.fillStyle = COLORS.spawnStream;
  ctx.fillRect(SPAWN_STREAM_TILE.x, SPAWN_STREAM_TILE.y, SPAWN_STREAM_TILE.size, SPAWN_STREAM_TILE.size);
  ctx.strokeStyle = "rgba(220, 255, 180, 0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(SPAWN_STREAM_TILE.x, SPAWN_STREAM_TILE.y, SPAWN_STREAM_TILE.size, SPAWN_STREAM_TILE.size);
  ctx.fillStyle = "#f1ffd2";
  ctx.fillText("SPAWN", SPAWN_STREAM_TILE.x + SPAWN_STREAM_TILE.size / 2, SPAWN_STREAM_TILE.y + 36);
  ctx.fillText("FLOW", SPAWN_STREAM_TILE.x + SPAWN_STREAM_TILE.size / 2, SPAWN_STREAM_TILE.y + 56);

  ctx.fillStyle = COLORS.dodgeArena;
  ctx.fillRect(DODGE_ARENA_TILE.x, DODGE_ARENA_TILE.y, DODGE_ARENA_TILE.size, DODGE_ARENA_TILE.size);
  ctx.strokeStyle = "rgba(205, 234, 255, 0.6)";
  ctx.lineWidth = 3;
  ctx.strokeRect(DODGE_ARENA_TILE.x, DODGE_ARENA_TILE.y, DODGE_ARENA_TILE.size, DODGE_ARENA_TILE.size);
  ctx.fillStyle = "#e3f3ff";
  ctx.fillText("DODGE", DODGE_ARENA_TILE.x + DODGE_ARENA_TILE.size / 2, DODGE_ARENA_TILE.y + 34);
  ctx.fillText("ARENA", DODGE_ARENA_TILE.x + DODGE_ARENA_TILE.size / 2, DODGE_ARENA_TILE.y + 54);

  ctx.fillStyle = "rgba(27, 54, 76, 0.92)";
  ctx.fillRect(DODGE_ARENA.x, DODGE_ARENA.y, DODGE_ARENA.w, DODGE_ARENA.h);
  ctx.strokeStyle = "rgba(168, 225, 255, 0.55)";
  ctx.lineWidth = 4;
  ctx.strokeRect(DODGE_ARENA.x, DODGE_ARENA.y, DODGE_ARENA.w, DODGE_ARENA.h);
  ctx.fillStyle = "#eaf7ff";
  ctx.font = "700 22px Chakra Petch";
  ctx.fillText("DODGE ARENA", DODGE_ARENA.x + DODGE_ARENA.w / 2, DODGE_ARENA.y + 34);
  ctx.font = "700 14px Chakra Petch";
  ctx.fillText("Bullets rain from above", DODGE_ARENA.x + DODGE_ARENA.w / 2, DODGE_ARENA.y + 58);

  for (const path of villagePaths) {
    ctx.fillStyle = COLORS.path;
    ctx.fillRect(path.x, path.y, path.w, path.h);
  }

  for (const field of villageFields) {
    ctx.fillStyle = COLORS.villageField;
    ctx.fillRect(field.x, field.y, field.w, field.h);
    ctx.strokeStyle = "rgba(54, 35, 17, 0.35)";
    ctx.lineWidth = 2;
    for (let row = 10; row < field.h; row += 14) {
      ctx.beginPath();
      ctx.moveTo(field.x + 6, field.y + row);
      ctx.lineTo(field.x + field.w - 6, field.y + row);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.villageCrop;
    for (let x = field.x + 10; x < field.x + field.w - 8; x += 18) {
      for (let y = field.y + 10; y < field.y + field.h - 8; y += 18) {
        ctx.fillRect(x, y, 6, 6);
      }
    }
  }

  ctx.strokeStyle = COLORS.villageFence;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const fence of villageFences) {
    ctx.beginPath();
    ctx.moveTo(fence.x1, fence.y1);
    ctx.lineTo(fence.x2, fence.y2);
    ctx.stroke();
    const posts = Math.max(2, Math.floor(distance({ x: fence.x1, y: fence.y1 }, { x: fence.x2, y: fence.y2 }) / 22));
    for (let index = 0; index <= posts; index += 1) {
      const t = index / posts;
      const px = fence.x1 + (fence.x2 - fence.x1) * t;
      const py = fence.y1 + (fence.y2 - fence.y1) * t;
      ctx.fillStyle = "#8b6941";
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }
}

function drawMinimap() {
  const mapWidth = minimapCanvas.width;
  const mapHeight = minimapCanvas.height;
  const scaleX = mapWidth / WORLD.width;
  const scaleY = mapHeight / WORLD.height;
  const toMapX = (x) => x * scaleX;
  const toMapY = (y) => y * scaleY;

  minimapCtx.clearRect(0, 0, mapWidth, mapHeight);
  minimapCtx.fillStyle = "#19301f";
  minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

  minimapCtx.fillStyle = "rgba(208, 188, 132, 0.36)";
  minimapCtx.fillRect(0, toMapY(MAIN_LANE_Y - 90), mapWidth, Math.max(10, 180 * scaleY));

  minimapCtx.fillStyle = "rgba(122, 90, 50, 0.7)";
  minimapCtx.fillRect(toMapX(SPAWN_WAVE_TILE.x), toMapY(SPAWN_WAVE_TILE.y), SPAWN_WAVE_TILE.size * scaleX, SPAWN_WAVE_TILE.size * scaleY);
  minimapCtx.fillStyle = "rgba(93, 111, 46, 0.72)";
  minimapCtx.fillRect(toMapX(SPAWN_STREAM_TILE.x), toMapY(SPAWN_STREAM_TILE.y), SPAWN_STREAM_TILE.size * scaleX, SPAWN_STREAM_TILE.size * scaleY);
  minimapCtx.fillStyle = "rgba(62, 111, 151, 0.8)";
  minimapCtx.fillRect(toMapX(DODGE_ARENA_TILE.x), toMapY(DODGE_ARENA_TILE.y), DODGE_ARENA_TILE.size * scaleX, DODGE_ARENA_TILE.size * scaleY);
  minimapCtx.fillStyle = "rgba(108, 32, 48, 0.72)";
  minimapCtx.fillRect(toMapX(DEATH_ZONE.x), toMapY(DEATH_ZONE.y), DEATH_ZONE.size * scaleX, DEATH_ZONE.size * scaleY);
  minimapCtx.strokeStyle = "rgba(168, 225, 255, 0.55)";
  minimapCtx.strokeRect(toMapX(DODGE_ARENA.x), toMapY(DODGE_ARENA.y), DODGE_ARENA.w * scaleX, DODGE_ARENA.h * scaleY);

  minimapCtx.fillStyle = "rgba(64, 120, 67, 0.85)";
  for (const tree of trees) {
    if (distance(hero, tree) > MINIMAP_NEARBY_RADIUS) {
      continue;
    }
    minimapCtx.fillRect(toMapX(tree.x) - 1, toMapY(tree.y) - 1, 3, 3);
  }

  minimapCtx.fillStyle = "rgba(158, 170, 184, 0.8)";
  for (const stone of stones) {
    if (distance(hero, stone) > MINIMAP_NEARBY_RADIUS) {
      continue;
    }
    minimapCtx.fillRect(toMapX(stone.x) - 1, toMapY(stone.y) - 1, 3, 3);
  }

  for (const building of buildings) {
    minimapCtx.fillStyle = building.type === "enemyBase"
      ? "#d56464"
      : building.type === "playerBase"
        ? "#6fd58a"
        : building.type === "shop"
          ? "#d9b56c"
          : "#ab8bdf";
    minimapCtx.fillRect(
      toMapX(building.x),
      toMapY(building.y),
      Math.max(3, building.w * scaleX),
      Math.max(3, building.h * scaleY)
    );
  }

  minimapCtx.fillStyle = "#f6e1a8";
  minimapCtx.beginPath();
  minimapCtx.arc(toMapX(trader.x), toMapY(trader.y), 3, 0, Math.PI * 2);
  minimapCtx.fill();

  for (const pickup of pickups) {
    if (pickup.collected || distance(hero, pickup) > MINIMAP_NEARBY_RADIUS * 1.25) {
      continue;
    }
    minimapCtx.fillStyle = pickup.type === "rareHelmet"
      ? "#6db5ff"
      : pickup.type === "healthBuff"
        ? "#ff9a9a"
        : pickup.type === "weaponBuff"
          ? "#ffd36d"
          : "#dfe8f2";
    minimapCtx.fillRect(toMapX(pickup.x) - 1, toMapY(pickup.y) - 1, 3, 3);
  }

  minimapCtx.fillStyle = "#6aa8ff";
  minimapCtx.beginPath();
  minimapCtx.arc(toMapX(hero.x), toMapY(hero.y), 3.5, 0, Math.PI * 2);
  minimapCtx.fill();

  if (enemyHero.active) {
    minimapCtx.fillStyle = "#ff7f7f";
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(enemyHero.x), toMapY(enemyHero.y), 3.5, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  minimapCtx.fillStyle = "rgba(143, 183, 255, 0.95)";
  for (const unit of units) {
    minimapCtx.fillRect(toMapX(unit.x) - 1, toMapY(unit.y) - 1, 2, 2);
  }

  minimapCtx.fillStyle = "rgba(239, 148, 148, 0.9)";
  for (const enemy of enemies) {
    minimapCtx.fillRect(toMapX(enemy.x) - 1, toMapY(enemy.y) - 1, 2, 2);
  }

  minimapCtx.strokeStyle = "rgba(255, 245, 210, 0.75)";
  minimapCtx.lineWidth = 1;
  minimapCtx.strokeRect(
    toMapX(camera.x),
    toMapY(camera.y),
    Math.max(8, canvas.width * scaleX),
    Math.max(8, canvas.height * scaleY)
  );

  minimapCtx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  minimapCtx.strokeRect(0.5, 0.5, mapWidth - 1, mapHeight - 1);
}

function drawTree(tree) {
  ctx.fillStyle = COLORS.trunk;
  ctx.fillRect(tree.x - 7, tree.y + 8, 14, 28);
  ctx.beginPath();
  ctx.fillStyle = COLORS.tree;
  ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawStone(stone) {
  ctx.fillStyle = COLORS.stoneShadow;
  ctx.beginPath();
  ctx.ellipse(stone.x + 2, stone.y + 4, stone.radius * 0.92, stone.radius * 0.68, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.stone;
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y, stone.radius, stone.radius * 0.78, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = COLORS.stoneHighlight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stone.x - stone.radius * 0.12, stone.y - stone.radius * 0.08, stone.radius * 0.36, 3.9, 5.75);
  ctx.stroke();
}

function drawPickup(pickup) {
  if (pickup.collected) {
    return;
  }

  if (pickup.type === "helmet" || pickup.type === "rareHelmet" || pickup.type === "enemyHelmet") {
    const fill = pickup.type === "rareHelmet" ? "#3f89d8" : pickup.type === "enemyHelmet" ? "#4f9e58" : "#8795a8";
    const stroke = pickup.type === "rareHelmet" ? "#b8e1ff" : pickup.type === "enemyHelmet" ? "#d3ffb5" : "#dce5ef";
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(pickup.x - 16, pickup.y - 2, 32, 12);
    ctx.clearRect(pickup.x - 8, pickup.y + 2, 16, 8);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(pickup.x - 16, pickup.y - 2, 32, 12);
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius, Math.PI, 0);
    ctx.stroke();
  } else if (pickup.type === "healthBuff") {
    ctx.strokeStyle = "#ffe0e0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff7b7b";
    ctx.fillRect(pickup.x - 4, pickup.y - 12, 8, 24);
    ctx.fillRect(pickup.x - 12, pickup.y - 4, 24, 8);
  } else if (pickup.type === "weaponBuff") {
    if (weaponBuffImage.complete && weaponBuffImage.naturalWidth > 0) {
      const size = pickup.radius * 2.3;
      ctx.drawImage(weaponBuffImage, pickup.x - size / 2, pickup.y - size / 2, size, size);
    } else {
      ctx.strokeStyle = "#ffe5a6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pickup.x - 6, pickup.y + 10);
      ctx.lineTo(pickup.x + 8, pickup.y - 10);
      ctx.stroke();
      ctx.fillStyle = "#ffe18c";
      ctx.fillRect(pickup.x - 2, pickup.y - 2, 10, 4);
      ctx.fillRect(pickup.x - 12, pickup.y - 14, 8, 3);
      ctx.fillRect(pickup.x - 9.5, pickup.y - 16.5, 3, 8);
    }
  } else if (pickup.type === "axe") {
    ctx.strokeStyle = "#8f643c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pickup.x - 9, pickup.y + 10);
    ctx.lineTo(pickup.x + 7, pickup.y - 10);
    ctx.stroke();
    ctx.fillStyle = "#d5dce6";
    ctx.beginPath();
    ctx.moveTo(pickup.x + 4, pickup.y - 12);
    ctx.lineTo(pickup.x + 16, pickup.y - 4);
    ctx.lineTo(pickup.x + 5, pickup.y + 1);
    ctx.closePath();
    ctx.fill();
  } else if (pickup.type === "rifle") {
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(-0.35);
    ctx.fillStyle = "#2d3640";
    ctx.fillRect(-14, -3, 28, 6);
    ctx.fillRect(10, -2, 10, 3);
    ctx.fillStyle = "#715235";
    ctx.fillRect(-10, 2, 10, 4);
    ctx.fillRect(-2, 3, 4, 8);
    ctx.restore();
  } else if (pickup.type === "bow") {
    if (bowImage.complete && bowImage.naturalWidth > 0) {
      const size = 34;
      ctx.drawImage(bowImage, pickup.x - size / 2, pickup.y - size / 2, size, size);
    } else {
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(-0.2);
      ctx.strokeStyle = "#8f643c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-2, 0, 10, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = "#d8d0bf";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.lineTo(-2, 10);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawTrader() {
  ctx.beginPath();
  ctx.fillStyle = "#c8a15e";
  ctx.arc(trader.x, trader.y, trader.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#5c3416";
  ctx.arc(trader.x, trader.y - 6, trader.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff1cf";
  ctx.font = "700 14px Chakra Petch";
  ctx.textAlign = "center";
  ctx.fillText("TRADER", trader.x, trader.y - 34);
}

function drawVillageProp(prop) {
  if (prop.type === "crate") {
    ctx.fillStyle = "#8f643c";
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    ctx.strokeStyle = "rgba(58, 35, 16, 0.65)";
    ctx.lineWidth = 2;
    ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
    ctx.beginPath();
    ctx.moveTo(prop.x, prop.y);
    ctx.lineTo(prop.x + prop.w, prop.y + prop.h);
    ctx.moveTo(prop.x + prop.w, prop.y);
    ctx.lineTo(prop.x, prop.y + prop.h);
    ctx.stroke();
    return;
  }

  if (prop.type === "hay") {
    ctx.fillStyle = COLORS.villageHay;
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    ctx.strokeStyle = "rgba(122, 90, 35, 0.45)";
    ctx.lineWidth = 2;
    for (let y = prop.y + 4; y < prop.y + prop.h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(prop.x + 4, y);
      ctx.lineTo(prop.x + prop.w - 4, y);
      ctx.stroke();
    }
    return;
  }

  if (prop.type === "barrel") {
    ctx.fillStyle = "#825737";
    ctx.beginPath();
    ctx.arc(prop.x, prop.y, prop.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4b08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(prop.x, prop.y - 1, prop.radius * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function isVillageBuildingType(type) {
  return type === "villageHouse" || type === "blacksmith" || type === "market" || type === "well";
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

function getHeroHelmetStyle() {
  const helmetType = hero.equippedHelmetType || (player.helmetBonusArmor > 0 ? "helmet" : null);
  if (!helmetType || getHelmetArmorValue() <= 0) {
    return null;
  }

  if (helmetType === "rareHelmet") {
    return { fill: "#3f89d8", stroke: "#b8e1ff" };
  }

  if (helmetType === "enemyHelmet") {
    return { fill: "#4f9e58", stroke: "#d3ffb5" };
  }

  return { fill: "#8795a8", stroke: "#dce5ef" };
}

function drawHeroStickFigure() {
  const angle = hero.facingAngle || 0;
  const headX = hero.x;
  const headY = hero.y - 12;
  const headRadius = 8;
  const neckY = headY + headRadius;
  const hipY = hero.y + 8;
  const shoulderY = neckY + 6;
  const shoulderSpread = 10;
  const armReach = 12;
  const legReach = 10;
  const leadX = Math.cos(angle);
  const leadY = Math.sin(angle);
  const sideX = Math.cos(angle + Math.PI / 2);
  const sideY = Math.sin(angle + Math.PI / 2);
  const swingProgress = hero.axeSwingDuration > 0 ? 1 - hero.axeSwingTimer / hero.axeSwingDuration : 1;
  const swingAngle = hero.hasAxe
    ? angle + (-0.75 + clamp(swingProgress, 0, 1) * 1.5)
    : angle;
  const handX = headX + sideX * shoulderSpread + leadX * armReach;
  const handY = shoulderY + sideY * shoulderSpread + leadY * armReach;
  const axeGripX = headX + sideX * 4 + leadX * 6;
  const axeGripY = headY + 6 + sideY * 2;

  ctx.strokeStyle = COLORS.hero;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  const helmetStyle = getHeroHelmetStyle();
  if (helmetStyle) {
    ctx.fillStyle = helmetStyle.fill;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius + 1, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(headX - headRadius - 1, headY - 1, (headRadius + 1) * 2, 5);
    ctx.strokeStyle = helmetStyle.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius + 1, Math.PI, 0);
    ctx.stroke();
    ctx.strokeRect(headX - headRadius - 1, headY - 1, (headRadius + 1) * 2, 5);
    ctx.strokeStyle = COLORS.hero;
    ctx.lineWidth = 4;
  }

  ctx.beginPath();
  ctx.moveTo(headX, neckY);
  ctx.lineTo(headX, hipY);
  ctx.moveTo(headX, shoulderY);
  ctx.lineTo(headX + sideX * shoulderSpread + leadX * armReach, shoulderY + sideY * shoulderSpread + leadY * armReach);
  ctx.moveTo(headX, shoulderY);
  ctx.lineTo(headX - sideX * shoulderSpread + leadX * armReach, shoulderY - sideY * shoulderSpread + leadY * armReach);
  ctx.moveTo(headX, hipY);
  ctx.lineTo(headX + sideX * 6 + leadX * legReach, hipY + 18 + leadY * 4);
  ctx.moveTo(headX, hipY);
  ctx.lineTo(headX - sideX * 6 + leadX * legReach, hipY + 18 - leadY * 4);
  ctx.stroke();

  if (hero.hasAxe) {
    const axeHandleLength = 18;
    const handleEndX = axeGripX + Math.cos(swingAngle) * axeHandleLength;
    const handleEndY = axeGripY + Math.sin(swingAngle) * axeHandleLength;
    ctx.strokeStyle = "#8f643c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(axeGripX, axeGripY);
    ctx.lineTo(handleEndX, handleEndY);
    ctx.stroke();

    const bladeBaseX = handleEndX - Math.cos(swingAngle) * 2;
    const bladeBaseY = handleEndY - Math.sin(swingAngle) * 2;
    const bladeX = bladeBaseX + Math.cos(swingAngle - Math.PI / 2) * 10;
    const bladeY = bladeBaseY + Math.sin(swingAngle - Math.PI / 2) * 10;
    ctx.fillStyle = "#d5dce6";
    ctx.beginPath();
    ctx.moveTo(bladeBaseX, bladeBaseY);
    ctx.lineTo(bladeX, bladeY);
    ctx.lineTo(
      bladeBaseX + Math.cos(swingAngle + Math.PI * 0.1) * 7,
      bladeBaseY + Math.sin(swingAngle + Math.PI * 0.1) * 7
    );
    ctx.closePath();
    ctx.fill();

    if (hero.axeSwingTimer > 0) {
      ctx.strokeStyle = "rgba(255, 229, 168, 0.85)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(axeGripX, axeGripY, 22, angle - 0.75, angle + 0.75);
      ctx.stroke();
    }
  }

  if (hero.hasRifle) {
    const rifleLength = 24;
    const muzzleX = handX + Math.cos(angle) * rifleLength;
    const muzzleY = handY + Math.sin(angle) * rifleLength;
    ctx.strokeStyle = "#2d3640";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(handX - Math.cos(angle) * 4, handY - Math.sin(angle) * 4);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.stroke();
    ctx.strokeStyle = "#171d22";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(muzzleX - Math.cos(angle) * 6, muzzleY - Math.sin(angle) * 6);
    ctx.lineTo(muzzleX + Math.cos(angle) * 8, muzzleY + Math.sin(angle) * 8);
    ctx.stroke();
    ctx.strokeStyle = "#715235";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(handX - Math.cos(angle) * 3, handY - Math.sin(angle) * 3);
    ctx.lineTo(handX - Math.cos(angle) * 11 - Math.sin(angle) * 3, handY - Math.sin(angle) * 11 + Math.cos(angle) * 3);
    ctx.stroke();
  }
}

function drawSoldierHero() {
  const isBurstShooting = hero.abilityEffect?.effect === "burst" &&
    Boolean(hero.abilityEffect?.pendingShots && hero.abilityEffect.pendingShots.length > 0);
  const isRifleShooting = hero.hasRifle && mouse.leftDown && !hero.isReloading;
  const image = (isBurstShooting || isRifleShooting)
    ? soldierShootingImage
    : hero.isMoving
      ? soldierRunningImage
      : soldierIdleImage;
  if (!image.complete || image.naturalWidth <= 0) {
    drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
    return;
  }

  const size = 54;
  ctx.save();
  ctx.translate(hero.x, hero.y);
  if (image === soldierRunningImage) {
    const runAngle = hero.lastMoveAngle ?? hero.facingAngle;
    if (Math.cos(runAngle) < 0) {
      ctx.scale(-1, 1);
    }
  } else {
    ctx.rotate(hero.facingAngle);
  }
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  const helmetStyle = getHeroHelmetStyle();
  if (helmetStyle) {
    ctx.fillStyle = helmetStyle.fill;
    ctx.beginPath();
    ctx.arc(0, -13, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-10, -13, 20, 6);
    ctx.strokeStyle = helmetStyle.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -13, 10, Math.PI, 0);
    ctx.stroke();
    ctx.strokeRect(-10, -13, 20, 6);
  }
  ctx.restore();
}

function drawArcherHero() {
  if (hero.isDead) {
    if (!archerDeadImage.complete || archerDeadImage.naturalWidth <= 0) {
      drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
      return;
    }

    const size = 46;
    ctx.drawImage(archerDeadImage, hero.x - size / 2, hero.y - size / 2, size, size);
    return;
  }

  const isShooting = (hero.hasBow && mouse.leftDown) || hero.abilityEffect?.effect === "projectile";
  const image = isShooting
    ? archerShootingImage
    : hero.isMoving
      ? archerRunningImage
      : archerImage;
  if (!image.complete || image.naturalWidth <= 0) {
    drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
    return;
  }

  const size = 46;
  const facingAngle = hero.isMoving && hero.lastMoveAngle !== null ? hero.lastMoveAngle : hero.facingAngle;
  const isFacingLeft = facingAngle !== null && Math.cos(facingAngle) < 0;
  ctx.save();
  ctx.translate(hero.x, hero.y);
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawBuilding(building) {
  if (building.type === "villageHouse") {
    ctx.fillStyle = COLORS.villageWall;
    ctx.fillRect(building.x, building.y + 22, building.w, building.h - 22);
    ctx.fillStyle = COLORS.villageRoof;
    ctx.beginPath();
    ctx.moveTo(building.x - 6, building.y + 26);
    ctx.lineTo(building.x + building.w / 2, building.y - 8);
    ctx.lineTo(building.x + building.w + 6, building.y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6b472b";
    ctx.fillRect(building.x + building.w * 0.42, building.y + building.h - 28, 16, 28);
    ctx.fillStyle = "#9ec4de";
    ctx.fillRect(building.x + 18, building.y + 40, 18, 14);
    ctx.fillRect(building.x + building.w - 36, building.y + 40, 18, 14);
    return;
  }

  if (building.type === "blacksmith") {
    ctx.fillStyle = "#6f5f58";
    ctx.fillRect(building.x, building.y + 18, building.w, building.h - 18);
    ctx.fillStyle = "#4e3730";
    ctx.fillRect(building.x + 10, building.y + 10, building.w - 20, 24);
    ctx.fillStyle = "#8f643c";
    ctx.fillRect(building.x + building.w - 36, building.y + 18, 18, 42);
    ctx.fillStyle = "#c86f43";
    ctx.fillRect(building.x + building.w - 34, building.y + 2, 14, 18);
    ctx.fillStyle = "#d7dfe6";
    ctx.fillRect(building.x + 22, building.y + 46, 26, 18);
    ctx.fillStyle = "#33231d";
    ctx.fillRect(building.x + building.w * 0.42, building.y + building.h - 30, 18, 30);
    return;
  }

  if (building.type === "market") {
    ctx.fillStyle = "#8f643c";
    ctx.fillRect(building.x + 8, building.y + 24, building.w - 16, building.h - 24);
    ctx.fillStyle = "#d7efe6";
    ctx.fillRect(building.x, building.y, building.w, 24);
    ctx.fillStyle = "#b94d4d";
    for (let x = building.x; x < building.x + building.w; x += 22) {
      ctx.fillRect(x, building.y, 12, 24);
    }
    ctx.fillStyle = "#6b472b";
    ctx.fillRect(building.x + 14, building.y + building.h - 24, 10, 24);
    ctx.fillRect(building.x + building.w - 24, building.y + building.h - 24, 10, 24);
    return;
  }

  if (building.type === "well") {
    const centerX = building.x + building.w / 2;
    const centerY = building.y + building.h / 2;
    ctx.fillStyle = "#8d9aa5";
    ctx.beginPath();
    ctx.arc(centerX, centerY, building.w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#273947";
    ctx.beginPath();
    ctx.arc(centerX, centerY, building.w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#dbe8ef";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, building.w * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  ctx.fillStyle = building.type === "enemyBase"
    ? COLORS.enemyBase
    : building.type === "playerBase"
      ? COLORS.playerBase
    : building.type === "shop"
      ? COLORS.shop
      : COLORS.barracks;
  ctx.fillRect(building.x, building.y, building.w, building.h);

  if (player.selectedBuildingId === building.id) {
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 3;
    ctx.strokeRect(building.x - 4, building.y - 4, building.w + 8, building.h + 8);
  }

  ctx.fillStyle = "#f6eed3";
  ctx.font = "600 20px Chakra Petch";
  ctx.textAlign = "center";
  const label = building.type === "enemyBase"
    ? "ENEMY BASE"
    : building.type === "playerBase"
      ? "PLAYER BASE"
    : building.type === "shop"
      ? "SHOP"
      : "BARRACKS";
  ctx.fillText(label, building.x + building.w / 2, building.y + building.h / 2 + 6);
  if (!isVillageBuildingType(building.type)) {
    drawHealthBar(building.x + building.w / 2, building.y - 14, 120, building.hp / building.maxHp);
  }
}

function drawHealthBar(x, y, width, ratio) {
  const clamped = clamp(ratio, 0, 1);
  ctx.fillStyle = COLORS.healthBg;
  ctx.fillRect(x - width / 2, y, width, 10);
  ctx.fillStyle = clamped > 0.45 ? COLORS.healthGood : COLORS.healthBad;
  ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * clamped, 8);
}

function drawNameplate(x, y, name, fillStyle = "rgba(15, 33, 24, 0.88)") {
  if (!name) {
    return;
  }

  ctx.font = "700 14px Chakra Petch";
  ctx.textAlign = "center";
  const paddingX = 10;
  const width = ctx.measureText(name).width + paddingX * 2;
  const height = 22;
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.fillStyle = fillStyle;
  ctx.fillRect(left, top, width, height);
  ctx.strokeStyle = "rgba(255, 245, 210, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);
  ctx.fillStyle = "#fff5d2";
  ctx.fillText(name, x, top + 15);
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
  if (!hero.abilityEffect) {
    return;
  }

  const progress = hero.slashArcTimer / 0.22;
  ctx.strokeStyle = `rgba(255, 245, 210, ${0.25 + progress * 0.45})`;
  ctx.fillStyle = `rgba(176, 227, 255, ${0.08 + progress * 0.12})`;
  ctx.lineWidth = 10;

  if (hero.abilityEffect.effect === "cone") {
    if (hero.slashArcTimer <= 0) {
      return;
    }
    const aimAngle = hero.abilityEffect.aimAngle ?? hero.facingAngle;
    ctx.beginPath();
    ctx.arc(
      hero.x,
      hero.y,
      hero.abilityEffect.radius - 18,
      aimAngle - hero.abilityEffect.halfAngle,
      aimAngle + hero.abilityEffect.halfAngle
    );
    ctx.stroke();
    return;
  }

  if (hero.abilityEffect.effect === "nova") {
    if (hero.slashArcTimer <= 0) {
      return;
    }
    ctx.beginPath();
    ctx.arc(hero.x, hero.y, hero.abilityEffect.radius * (0.55 + (1 - progress) * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (hero.abilityEffect.effect === "line") {
    if (hero.slashArcTimer <= 0) {
      return;
    }
    const aimAngle = hero.abilityEffect.aimAngle ?? hero.facingAngle;
    const endX = hero.x + Math.cos(aimAngle) * hero.abilityEffect.range;
    const endY = hero.y + Math.sin(aimAngle) * hero.abilityEffect.range;
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
    return;
  }

  if (hero.abilityEffect.effect === "projectile") {
    const projectiles = hero.abilityEffect.projectiles || [];
    for (const projectile of projectiles) {
      drawArrowProjectile(projectile);
    }
  }
}

function drawArrowProjectile(projectile) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.angle);

  ctx.strokeStyle = "#6e4823";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  ctx.fillStyle = "#d9dfe4";
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(1, -5);
  ctx.lineTo(1, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c84f4f";
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-9, -5);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-9, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBulletProjectile(projectile) {
  const bodyLength = Math.max(14, projectile.radius * 3.8);
  const bodyRadius = Math.max(3, projectile.radius * 0.72);
  const noseLength = Math.max(6, projectile.radius * 1.4);
  const tailInset = Math.max(3, projectile.radius * 0.8);

  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.angle);

  ctx.fillStyle = "#7b4d24";
  ctx.beginPath();
  ctx.ellipse(-bodyLength * 0.28, 0, bodyRadius * 0.78, bodyRadius * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d7a44d";
  ctx.beginPath();
  ctx.moveTo(-bodyLength / 2 + tailInset, -bodyRadius);
  ctx.lineTo(bodyLength / 2 - noseLength, -bodyRadius);
  ctx.quadraticCurveTo(bodyLength / 2 - noseLength * 0.55, 0, bodyLength / 2 - noseLength, bodyRadius);
  ctx.lineTo(-bodyLength / 2 + tailInset, bodyRadius);
  ctx.quadraticCurveTo(-bodyLength / 2 - bodyRadius * 0.45, 0, -bodyLength / 2 + tailInset, -bodyRadius);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f3dfb2";
  ctx.beginPath();
  ctx.moveTo(bodyLength / 2 - noseLength, -bodyRadius);
  ctx.lineTo(bodyLength / 2 + noseLength, 0);
  ctx.lineTo(bodyLength / 2 - noseLength, bodyRadius);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(110, 66, 24, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-bodyLength / 2 + tailInset + 1, -bodyRadius * 0.45);
  ctx.lineTo(bodyLength / 2 - noseLength * 1.05, -bodyRadius * 0.45);
  ctx.stroke();

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

function drawHeroProjectiles() {
  for (const projectile of heroProjectiles) {
    if (projectile.style === "arrow") {
      drawArrowProjectile(projectile);
      continue;
    }
    drawBulletProjectile(projectile);
  }
}

function drawDamagePopups() {
  ctx.textAlign = "center";
  ctx.font = "700 22px Chakra Petch";
  for (const popup of damagePopups) {
    const alpha = popup.ttl / popup.maxTtl;
    ctx.fillStyle = popup.color.replace(", 1)", `, ${alpha})`);
    ctx.strokeStyle = popup.outline.replace(", 1)", `, ${alpha})`);
    ctx.lineWidth = 3;
    ctx.strokeText(String(popup.amount), popup.x, popup.y);
    ctx.fillText(String(popup.amount), popup.x, popup.y);
  }
}

function drawSparkEffects() {
  for (const spark of sparkEffects) {
    const alpha = clamp(spark.ttl / spark.maxTtl, 0, 1);
    const tailX = spark.x - Math.cos(spark.angle) * spark.length;
    const tailY = spark.y - Math.sin(spark.angle) * spark.length;
    ctx.strokeStyle = spark.color === "#fff8d6"
      ? `rgba(255, 248, 214, ${alpha})`
      : `rgba(255, 217, 143, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(spark.x, spark.y);
    ctx.stroke();
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
  const nearbyPickup = getNearbyPickup();
  if (nearbyPickup) {
    ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
    ctx.fillRect(nearbyPickup.x - 52, nearbyPickup.y - 72, 104, 26);
    ctx.fillStyle = "#fff5d2";
    ctx.font = "600 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("Press E", nearbyPickup.x, nearbyPickup.y - 54);
    return;
  }

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

  for (const stone of stones) {
    drawStone(stone);
  }

  for (const pickup of pickups) {
    drawPickup(pickup);
  }

  for (const prop of villageProps) {
    drawVillageProp(prop);
  }

  drawTrader();

  for (const building of buildings) {
    drawBuilding(building);
  }

  if (hero.selectedClass === "stickman") {
    drawHeroStickFigure();
  } else if (hero.selectedClass === "soldier") {
    drawSoldierHero();
  } else if (hero.selectedClass === "archer") {
    drawArcherHero();
  } else {
    drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
  }
  drawDodgeArenaBullets();
  drawHealthBar(hero.x, hero.y - 34, 60, hero.hp / hero.maxHp);
  drawNameplate(hero.x, hero.y - 50, player.displayName || "Player");
  drawHarvestProgress();
  drawSlashArc();
  drawHeroProjectiles();
  drawSparkEffects();

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
    const isBoss = unit.kind === "boss";
    if (unit.kind === "skeleton" && skeletonImage.complete && skeletonImage.naturalWidth > 0) {
      const size = 42;
      ctx.drawImage(skeletonImage, unit.x - size / 2, unit.y - size / 2, size, size);
    } else {
      drawEntityCircle(unit, isBoss ? "#5b2a2a" : COLORS.enemy, isBoss ? "#ff9f7b" : "#ef9494");
    }
    drawHealthBar(unit.x, unit.y - (isBoss ? 36 : 28), isBoss ? 70 : 44, unit.hp / unit.maxHp);
    if (isBoss) {
      ctx.fillStyle = "#ffe0b0";
      ctx.font = "700 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("BOSS", unit.x, unit.y - 44);
    }
  }

  if (enemyHero.active) {
    drawEntityCircle(enemyHero, COLORS.enemy, enemyHero.equippedArmorValue >= 80 ? "#86db7e" : "#f2b0b0");
    drawHealthBar(enemyHero.x, enemyHero.y - 34, 60, enemyHero.hp / enemyHero.maxHp);
    drawNameplate(enemyHero.x, enemyHero.y - 50, enemyHero.displayName || DEFAULT_ENEMY_NAME, "rgba(56, 18, 18, 0.9)");
  }

  drawDamagePopups();
  drawBuildPreview();
  drawSelectionBox();
  drawModeHint();

  ctx.restore();
  drawMinimap();
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

  if (event.code === "Space") {
    event.preventDefault();
    if (isHeroNearTrader()) {
      if (player.traderOpen) {
        closeTrader();
      } else {
        closeShop();
        openTrader();
      }
      return;
    }
    if (isHeroNearShop()) {
      if (player.shopOpen) {
        closeShop();
      } else {
        closeTrader();
        openShop();
      }
      return;
    }
  }

  if (player.shopOpen || player.traderOpen) {
    if (event.key === "Escape") {
      closeShop();
      closeTrader();
    }
    return;
  }

  if (key === "h") {
    selectBuilding(playerBase);
    return;
  }

  if (key === "b") {
    if (isPlayerBaseSelected()) {
      startBarracksPlacement();
    }
    return;
  }

  if (key === "e") {
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
      statusTextEl.textContent = "Reloading rifle.";
    }
  }

  if (key === "f") {
    useSlash(mouse.worldX, mouse.worldY);
  }

  if (event.key === "Shift" && hero.selectedClass === "robot") {
    useRobotDash();
  }

  if (event.key === "Escape") {
    player.isPlacingBuilding = false;
    updateBuildBarracksButton();
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
  if (player.shopOpen || player.traderOpen) {
    return;
  }
  const point = screenToWorld(event.offsetX, event.offsetY);
  mouse.worldX = point.x;
  mouse.worldY = point.y;

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
        woodCountEl.textContent = String(player.wood);
        updateBuildBarracksButton();
        statusTextEl.textContent = "Barracks built. Select it to train soldiers.";
      }
      return;
    }

    if (hero.hasRifle && spawnHeroBullet(point.x, point.y)) {
      selectionBox = null;
      player.selectedUnits = [];
      player.selectedBuildingId = null;
      updateTrainButton();
      updateBuildBarracksButton();
      statusTextEl.textContent = "M4 fired.";
      return;
    }

    if (hero.hasBow && spawnHeroBowShot(point.x, point.y)) {
      selectionBox = null;
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
    selectionBox = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };
  }
});

canvas.addEventListener("mouseup", (event) => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (event.button === 0) {
    mouse.leftDown = false;
  }
  if (player.shopOpen || player.traderOpen) {
    return;
  }
  if (event.button === 0 && selectionBox) {
    const dragWidth = Math.abs(selectionBox.x2 - selectionBox.x1);
    const dragHeight = Math.abs(selectionBox.y2 - selectionBox.y1);
    if (dragWidth < 10 && dragHeight < 10 && hero.hasAxe && !hero.hasRifle) {
      selectionBox = null;
      player.selectedUnits = [];
      statusTextEl.textContent = "Axe swing.";
      useAxeSwing();
      return;
    }
    selectUnitsInBox(selectionBox);
    selectionBox = null;
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
  if (player.shopOpen || player.traderOpen) {
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

buildBarracksBtn.addEventListener("click", () => {
  startBarracksPlacement();
});

shopSellWoodBtn.addEventListener("click", () => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (!isHeroNearShop()) {
    statusTextEl.textContent = "Move closer to the Shop to sell wood.";
    closeShop();
    return;
  }
  if (player.wood < 25) {
    statusTextEl.textContent = "You need at least 25 wood to sell.";
    return;
  }
  player.wood -= 25;
  player.money += 25;
  woodCountEl.textContent = String(player.wood);
  moneyCountEl.textContent = String(player.money);
  updateTrainButton();
  statusTextEl.textContent = "Sold 25 wood for 25 gold.";
  updateShopUI();
});

trainSoldierBtn.addEventListener("click", () => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (player.shopOpen || player.traderOpen) {
    return;
  }
  const barracks = buildings.find((building) => building.id === player.selectedBuildingId && building.isPlayer);
  if (!barracks || player.money < 50) {
    return;
  }
  player.money -= 50;
  moneyCountEl.textContent = String(player.money);
  createUnit("soldier", barracks.x + barracks.w + 24, barracks.y + barracks.h / 2, true);
  trainSoldierBtn.disabled = player.money < 50;
  statusTextEl.textContent = "Soldier trained. Select it and issue orders with the mouse.";
});

closeShopBtn.addEventListener("click", () => {
  closeShop();
});

buyWeaponUpgradeBtn.addEventListener("click", () => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (!isHeroNearTrader()) {
    closeTrader();
    statusTextEl.textContent = "Move closer to the Trader first.";
    return;
  }
  if (player.money < 50) {
    statusTextEl.textContent = "You need 50 gold for a weapon enhancement.";
    return;
  }
  player.money -= 50;
  player.weaponBonusStat += 10;
  player.weaponBonusDamage += 5;
  moneyCountEl.textContent = String(player.money);
  updateStatsUI();
  updateTraderUI();
  statusTextEl.textContent = "Weapon enhanced. +10 weapon, +5 ability damage.";
});

closeTraderBtn.addEventListener("click", () => {
  closeTrader();
});

function selectCharacter(classId) {
  const selectedClass = CHARACTER_OPTIONS[classId];
  if (!selectedClass || !player.displayName) {
    return;
  }

  hero.selectedClass = classId;
  hero.slashCooldown = selectedClass.cooldown;
  hero.slashRadius = selectedClass.radius || hero.slashRadius;
  hero.slashHalfAngle = selectedClass.halfAngle || hero.slashHalfAngle;
  hero.slashDamage = getAbilityDamage(selectedClass);
  hero.speed = getHeroSpeed(selectedClass);
  hero.lastMoveAngle = null;
  hero.maxHp = selectedClass.stats.health + player.bonusHealth;
  hero.hp = hero.maxHp;
  hero.dashTimer = 0;
  hero.dashCooldown = selectedClass.dashCooldown || 0;
  hero.dashCooldownRemaining = 0;
  hero.hasAxe = false;
  hero.axeSwingTimer = 0;
  hero.hasBow = classId === "archer";
  hero.bowCooldown = 0;
  hero.weaponPickupCooldown = 0;
  hero.hasRifle = classId === "soldier";
  hero.rifleCooldown = 0;
  hero.ammo = hero.hasRifle ? hero.maxAmmo : 0;
  hero.isReloading = false;
  hero.reloadTimer = 0;
  player.hasSelectedCharacter = true;
  characterSelectEl.classList.add("hidden");
  statusTextEl.textContent = `${selectedClass.name} selected. Walk near a tree and press E to harvest wood.`;
  updateAbilityUI();
  updateStatsUI();
  updateXpUI();
}

async function loadCharacterOptions() {
  if (window.location.protocol === "file:") {
    throw new Error("Open the game through the local HTTP server so character-options.json and enemy-options.json can be fetched.");
  }

  const response = await fetch("./character-options.json");
  if (!response.ok) {
    throw new Error(`Failed to load character options: ${response.status}`);
  }
  CHARACTER_OPTIONS = await response.json();
}

async function loadEnemyOptions() {
  const response = await fetch("./enemy-options.json");
  if (!response.ok) {
    throw new Error(`Failed to load enemy options: ${response.status}`);
  }
  ENEMY_OPTIONS = await response.json();
}

function initializeCharacterCards() {
  classGridEl.textContent = "";

  for (const [classId, selectedClass] of Object.entries(CHARACTER_OPTIONS)) {
    const classCardEl = document.createElement("button");
    classCardEl.className = "class-card";
    classCardEl.dataset.class = classId;
    classCardEl.disabled = false;

    const portraitEl = document.createElement("img");
    portraitEl.className = "class-portrait hidden";
    portraitEl.alt = `${selectedClass.name} portrait`;

    const nameEl = document.createElement("strong");
    nameEl.textContent = selectedClass.name;

    const abilityEl = document.createElement("span");
    abilityEl.textContent = `F: ${selectedClass.abilityName}`;

    classCardEl.append(portraitEl, nameEl, abilityEl);

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
    initializeEnemyForces();
    initializeCharacterCards();
    updateAbilityUI();
    updateStatsUI();
    updateXpUI();
    updateShopUI();
    updateTraderUI();
    updateTrainButton();
    updateBuildBarracksButton();
    playerNameInputEl.focus();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error(error);
    statusTextEl.textContent = String(error.message || error);
    classGridEl.textContent = "Start the local server with `node server.js`, then open http://127.0.0.1:4173";
  }
}

initializeGame();
