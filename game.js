import {
  archerDeadImage,
  archerImage,
  archerRunningImage,
  archerShootingImage,
  bowImage,
  skeletonImage,
  soldierIdleImage,
  soldierMedkitImage,
  soldierReloadingImage,
  soldierRunningImage,
  soldierRunningRightFootImage,
  soldierRunningTransitionImage,
  soldierShootingImage,
  weaponBuffImage,
} from "./modules/assets.js";
import {
  COLORS,
  DEFAULT_ENEMY_NAME,
  DEATH_ZONE,
  DODGE_ARENA,
  DODGE_ARENA_DODGE_XP,
  DODGE_ARENA_TILE,
  GOLD_HELMET_ARMOR,
  GRID_SIZE,
  HELMET_HEADSHOT_PROTECTION,
  MAIN_LANE_Y,
  MAIN_WORLD_HEIGHT,
  MINIMAP_NEARBY_RADIUS,
  PLAYER_BASE_SPAWN,
  PLAYER_NAME_STORAGE_KEY,
  QUEST_DIALOGUES,
  QUEST_ID,
  RANGED_HEADSHOT_CONFIG,
  SOLDIER_BATTLE_MEDICINE_COOLDOWN,
  SOLDIER_BATTLE_MEDICINE_DURATION,
  SOLDIER_BATTLE_MEDICINE_HEAL,
  SOLDIER_BATTLE_MEDICINE_REGEN_BONUS,
  SOLDIER_GRENADE_COOLDOWN,
  SOLDIER_GRENADE_DAMAGE,
  SOLDIER_GRENADE_RADIUS,
  SOLDIER_GRENADE_RANGE,
  SPAWN_STREAM_TILE,
  SPAWN_WAVE_TILE,
  TUTORIAL_TILE,
  TUTORIAL_WORLD,
  UPGRADE_OPTIONS,
  VILLAGE_ROAD_WIDTH,
  VILLAGE_WORLD,
  VILLAGE_RETURN_TILES,
  WORLD,
} from "./modules/constants.js";
import {
  abilityNameEl,
  armorFillEl,
  armorValueEl,
  battleMedicineAbilityEl,
  battleMedicineAbilityNameEl,
  battleMedicineCooldownTextEl,
  buildBarracksBtn,
  buyWeaponUpgradeBtn,
  canvas,
  characterSelectEl,
  classGridEl,
  classStepEl,
  closeShopBtn,
  closeTraderBtn,
  confirmPlayerNameBtn,
  ctx,
  dashAbilityEl,
  dashAbilityNameEl,
  dashCooldownTextEl,
  dialogueHintEl,
  dialogueOptionsEl,
  dialoguePanelEl,
  dialogueProgressEl,
  dialogueProgressFillEl,
  dialogueProgressLabelEl,
  dialogueProgressReputationEl,
  dialogueProgressUnlockEl,
  dialogueProgressValueEl,
  dialogueSpeakerEl,
  dialogueTextEl,
  closeWeaponDetailsBtn,
  equipmentBodyArmorIconEl,
  equipmentBodyArmorMetaEl,
  equipmentBodyArmorNameEl,
  equipmentHelmetIconEl,
  equipmentHelmetMetaEl,
  equipmentHelmetNameEl,
  equipmentWeaponIconEl,
  equipmentWeaponMetaEl,
  equipmentWeaponNameEl,
  grenadeAbilityEl,
  grenadeAbilityNameEl,
  grenadeCooldownTextEl,
  healthFillEl,
  healthValueEl,
  inventoryListEl,
  minimapCanvas,
  minimapCtx,
  nameStepEl,
  overlayMessageEl,
  playerNameInputEl,
  playerPortraitNameEl,
  playerPortraitEl,
  questObjectiveEl,
  questPanelEl,
  questTitleEl,
  regenFillEl,
  regenValueEl,
  shopPanelEl,
  shopSellWoodBtn,
  slashAbilityEl,
  slashCooldownTextEl,
  speedFillEl,
  speedValueEl,
  statusTextEl,
  traderPanelEl,
  traderStatusEl,
  trainSoldierBtn,
  upgradeActionEls,
  upgradePointsEl,
  weaponDetailsAmmoEl,
  weaponDetailsAmmoEffectEl,
  weaponDetailsBtnEl,
  weaponDetailsDamageEl,
  weaponDetailsDamageEffectEl,
  weaponDetailsFireRateEl,
  weaponDetailsFireRateEffectEl,
  weaponDetailsMetaEl,
  weaponDetailsNameEl,
  weaponDetailsPanelEl,
  weaponDetailsRangeEl,
  weaponDetailsRangeEffectEl,
  weaponDetailsReloadEl,
  weaponDetailsReloadEffectEl,
  weaponDetailUpgradeEls,
  weaponFillEl,
  weaponValueEl,
  xpFillEl,
  xpLevelEl,
} from "./modules/dom.js";
import {
  buildings,
  camera,
  damagePopups,
  dodgeArenaBullets,
  enemies,
  grenadeAim,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  inventory,
  keys,
  mouse,
  nextId,
  pickups,
  player,
  quest,
  sparkEffects,
  stones,
  trader,
  trees,
  units,
  villageFences,
  villageFields,
  villagePaths,
  villageProps,
  villager,
} from "./modules/state.js";

let CHARACTER_OPTIONS = {};
let ENEMY_OPTIONS = {};

let selectionBox = null;
let harvestTreeId = null;
let lastTimestamp = 0;
let playerBase = null;
let enemyBase = null;
let enemyHero = null;
let lastSoldierAnimationName = null;
const BATTLE_MEDICINE_USE_DURATION = 0.9;
const ROAD_SPEED_MULTIPLIER = 1.3;
const MAIN_WORLD_TRADER_POSITION = { x: trader.x, y: trader.y };
const tutorialNpcs = [];
const tutorialPlots = [];
const tutorialSites = [];
const tutorialRangeTargets = [];
const tutorialDialogue = {
  npcId: null,
  text: "",
  options: [],
  progressView: null,
  taskOffered: false,
};
const SHOOTING_INSTRUCTOR_ID = "shootingInstructor";
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

const shootingRangeTutorial = {
  state: "idle",
  started: false,
  completed: false,
  hits: 0,
  introSeen: false,
};
const TUTORIAL_PROFESSIONS = {
  farmer: {
    label: "Farmer",
    color: "#b8d86b",
    taskXp: 12,
    intro: "I teach farming. Start with seeds, learn to plant, then harvest for better crops and better rewards later.",
    workText: "Farming grows from simple seed plots into better crops, rarer harvests, and stronger farm rewards.",
    taskTitle: "Plant and harvest 1 crop",
    rewardText: "Seed stock increased and farming progress gained.",
  },
  mercenary: {
    label: "Mercenary",
    color: "#ff5a5a",
    taskXp: 12,
    intro: "I post combat contracts. The first one is simple: kill a nearby target and come back alive.",
    workText: "Mercenary work scales into area clears, escorts, hunts, and harder contracts with gold and gear.",
    taskTitle: "Defeat the training raider",
    rewardText: "Gold paid and Mercenary reputation improved.",
  },
  explorer: {
    label: "Explorer",
    color: "#7fd0c5",
    taskXp: 12,
    intro: "I map the wilds. Find the marked landmark nearby and you will understand how discovery work begins.",
    workText: "Exploration unlocks landmarks, ruins, treasure routes, and deeper resource finds the farther you roam.",
    taskTitle: "Discover the old waypoint",
    rewardText: "Explorer progress increased.",
  },
  merchant: {
    label: "Merchant",
    color: "#e0b766",
    taskXp: 12,
    intro: "I teach trade. Bring me gathered materials and I turn them into deals, gold, and better prices.",
    workText: "Trading grows through deliveries, buying low, selling high, and unlocking stronger market opportunities.",
    taskTitle: "Deliver 25 wood",
    rewardText: "Gold earned and Merchant standing improved.",
  },
  craftsman: {
    label: "Craftsman",
    color: "#aab6cb",
    taskXp: 12,
    intro: "I teach crafting. Gather ore, bring it back, and I will show you how raw material becomes equipment.",
    workText: "Crafting expands into recipes, forging, upgrades, and stronger equipment options over time.",
    taskTitle: "Collect 1 ore sample",
    rewardText: "Crafting progress increased and a forge bonus granted.",
  },
  scholar: {
    label: "Scholar",
    color: "#c794ff",
    taskXp: 12,
    intro: "I study artifacts and enchantment. Bring me an arcane shard and I will introduce the magical path.",
    workText: "Scholar work opens enchanting, artifacts, magical materials, and stronger ability growth.",
    taskTitle: "Recover 1 arcane shard",
    rewardText: "Scholar progress increased and magical insight granted.",
  },
};
const PROFESSION_REPUTATION_UNLOCKS = {
  merchant: [
    { reputation: 1, text: "Unlocks better trade payouts for wood deliveries." },
    { reputation: 3, text: "Unlocks stronger merchant delivery contracts." },
    { reputation: 5, text: "Unlocks the best tutorial market opportunities." },
  ],
};
const SHOOTING_RANGE_TUTORIAL_XP = 12;
const tutorialProfessionState = Object.fromEntries(
  Object.keys(TUTORIAL_PROFESSIONS).map((professionId) => [
    professionId,
    {
      level: 1,
      xp: 0,
      reputation: 0,
      completed: 0,
      introSeen: false,
      activeTask: null,
    },
  ])
);
const enemyProjectiles = [];
const forestEnemySpawners = [];
const forestRespawnQueue = [];
const FOREST_REGION = {
  x: 920,
  y: 170,
  w: 1320,
  h: 1320,
};
const FOREST_CLEARINGS = [
  { x: 1160, y: 980, radius: 108, color: "rgba(168, 191, 110, 0.38)" },
  { x: 1495, y: 815, radius: 124, color: "rgba(176, 198, 116, 0.34)" },
  { x: 1825, y: 625, radius: 156, color: "rgba(187, 201, 123, 0.34)" },
  { x: 2010, y: 1240, radius: 150, color: "rgba(176, 194, 116, 0.32)" },
];
const MERCENARY_CONTRACTS = {
  knownCamp: {
    id: "knownCamp",
    title: "Clear the Goblin Camp",
    campId: "knownCamp",
    discoveryRequired: false,
    requirements: {
      goblin: 5,
      goblinArcher: 2,
      ogre: 1,
    },
    rewards: {
      gold: 90,
      xp: 60,
      mercenaryXp: 18,
      mercenaryReputation: 1,
      lootChance: 0.55,
      lootTable: ["enemyHelmet", "healthBuff", "weaponBuff"],
    },
    offerLines: [
      "A goblin camp has settled deeper in the forest and they are testing our roads.",
      "Clear it out. I need five goblins, two archers, and their ogre brute dead.",
    ],
    progressLines: [
      "Hold the line and finish the camp. I only pay for confirmed kills.",
    ],
    completionLines: [
      "The known camp is broken. Good work.",
      "Take your pay. Keep roaming. There may be a second camp hidden in those trees.",
    ],
  },
  hiddenCamp: {
    id: "hiddenCamp",
    title: "Break the Hidden Goblin Camp",
    campId: "hiddenCamp",
    discoveryRequired: true,
    requirements: {
      goblin: 6,
      goblinArcher: 3,
      ogre: 1,
    },
    rewards: {
      gold: 160,
      xp: 110,
      mercenaryXp: 30,
      mercenaryReputation: 2,
      lootChance: 0.85,
      lootTable: ["rareHelmet", "weaponBuff", "enemyHelmet"],
    },
    offerLines: [
      "You found their hidden camp. Hit it before they spread farther.",
      "This one is tougher. Break their whole warband and come back standing.",
    ],
    progressLines: [
      "The hidden camp is still active. Finish the harder contract and report back.",
    ],
    completionLines: [
      "That hidden camp was the real nest.",
      "You earned the heavier contract pay. More work will open as the frontier expands.",
    ],
  },
};
const FOREST_CAMPS = [
  {
    id: "knownCamp",
    label: "Goblin Camp",
    center: { x: 1820, y: 620 },
    discoveryRadius: 0,
    iconVisibleFromStart: true,
    hidden: false,
    props: [
      { type: "tent", x: 1738, y: 560, w: 86, h: 58, collidable: true },
      { type: "tent", x: 1868, y: 572, w: 82, h: 56, collidable: true },
      { type: "campfire", x: 1812, y: 646, radius: 16, collidable: false },
      { type: "crate", x: 1762, y: 672, w: 24, h: 24, collidable: true },
      { type: "crate", x: 1894, y: 684, w: 22, h: 22, collidable: true },
      { type: "barrel", x: 1928, y: 654, radius: 12, collidable: true },
      { type: "banner", x: 1706, y: 634, w: 18, h: 44, collidable: false },
      { type: "wreckage", x: 1848, y: 714, w: 42, h: 16, collidable: false },
      { type: "bush", x: 1688, y: 724, radius: 18, collidable: false },
      { type: "bush", x: 1960, y: 556, radius: 18, collidable: false },
    ],
    spawns: [
      { id: "known-g1", kind: "goblin", x: 1734, y: 644 },
      { id: "known-g2", kind: "goblin", x: 1766, y: 712 },
      { id: "known-g3", kind: "goblin", x: 1836, y: 718 },
      { id: "known-g4", kind: "goblin", x: 1918, y: 706 },
      { id: "known-g5", kind: "goblin", x: 1938, y: 612 },
      { id: "known-a1", kind: "goblinArcher", x: 1712, y: 582 },
      { id: "known-a2", kind: "goblinArcher", x: 1948, y: 572 },
      { id: "known-o1", kind: "ogre", x: 1824, y: 564, displayName: "Camp Ogre" },
    ],
  },
  {
    id: "hiddenCamp",
    label: "Hidden Camp",
    center: { x: 2050, y: 1260 },
    discoveryRadius: 185,
    iconVisibleFromStart: false,
    hidden: true,
    discoveryXp: 16,
    props: [
      { type: "tent", x: 1966, y: 1196, w: 84, h: 56, collidable: true },
      { type: "tent", x: 2088, y: 1180, w: 92, h: 62, collidable: true },
      { type: "tent", x: 2036, y: 1324, w: 82, h: 54, collidable: true },
      { type: "campfire", x: 2060, y: 1262, radius: 18, collidable: false },
      { type: "crate", x: 1974, y: 1296, w: 24, h: 24, collidable: true },
      { type: "crate", x: 2142, y: 1290, w: 26, h: 26, collidable: true },
      { type: "barrel", x: 2178, y: 1232, radius: 12, collidable: true },
      { type: "barrel", x: 1946, y: 1228, radius: 12, collidable: true },
      { type: "banner", x: 2188, y: 1268, w: 18, h: 46, collidable: false },
      { type: "wreckage", x: 2010, y: 1364, w: 54, h: 16, collidable: false },
      { type: "bush", x: 1918, y: 1334, radius: 20, collidable: false },
      { type: "bush", x: 2206, y: 1174, radius: 20, collidable: false },
    ],
    spawns: [
      { id: "hidden-g1", kind: "goblin", x: 1962, y: 1260, hpMultiplier: 1.2, damageMultiplier: 1.1 },
      { id: "hidden-g2", kind: "goblin", x: 1988, y: 1352, hpMultiplier: 1.2, damageMultiplier: 1.1 },
      { id: "hidden-g3", kind: "goblin", x: 2054, y: 1394, hpMultiplier: 1.2, damageMultiplier: 1.1 },
      { id: "hidden-g4", kind: "goblin", x: 2146, y: 1354, hpMultiplier: 1.2, damageMultiplier: 1.1 },
      { id: "hidden-g5", kind: "goblin", x: 2158, y: 1252, hpMultiplier: 1.2, damageMultiplier: 1.1 },
      { id: "hidden-g6", kind: "goblin", x: 2032, y: 1184, hpMultiplier: 1.2, damageMultiplier: 1.1 },
      { id: "hidden-a1", kind: "goblinArcher", x: 1930, y: 1200, hpMultiplier: 1.18, damageMultiplier: 1.15 },
      { id: "hidden-a2", kind: "goblinArcher", x: 2194, y: 1204, hpMultiplier: 1.18, damageMultiplier: 1.15 },
      { id: "hidden-a3", kind: "goblinArcher", x: 2128, y: 1396, hpMultiplier: 1.18, damageMultiplier: 1.15 },
      { id: "hidden-o1", kind: "ogre", x: 2062, y: 1230, hpMultiplier: 1.35, damageMultiplier: 1.18, displayName: "Camp Chieftain" },
    ],
  },
];
const FOREST_ROAMING_SPAWNS = [
  { id: "roam-g1", kind: "goblin", x: 1168, y: 1068 },
  { id: "roam-g2", kind: "goblin", x: 1288, y: 920 },
  { id: "roam-g3", kind: "goblin", x: 1464, y: 930 },
  { id: "roam-g4", kind: "goblin", x: 1612, y: 782 },
  { id: "roam-a1", kind: "goblinArcher", x: 1378, y: 1106 },
  { id: "roam-a2", kind: "goblinArcher", x: 1718, y: 876 },
];

function getCampConfig(campId) {
  return FOREST_CAMPS.find((camp) => camp.id === campId) || null;
}

function getContractConfig(contractId) {
  return MERCENARY_CONTRACTS[contractId] || null;
}

function hasCompletedContract(contractId) {
  return quest.completedContractIds.includes(contractId);
}

function hasDiscoveredCamp(campId) {
  return quest.discoveredCampIds.includes(campId);
}

function getNextAvailableContractId() {
  if (!hasCompletedContract("knownCamp")) {
    return "knownCamp";
  }
  if (!hasCompletedContract("hiddenCamp") && hasDiscoveredCamp("hiddenCamp")) {
    return "hiddenCamp";
  }
  return null;
}

function ensureContractAvailability() {
  const nextContractId = getNextAvailableContractId();
  quest.availableContractIds = nextContractId ? [nextContractId] : [];
  if (!quest.activeContractId) {
    quest.activeContractStage = nextContractId ? "available" : "idle";
  }
}

function buildContractProgress(requirements) {
  return Object.fromEntries(
    Object.keys(requirements).map((kind) => [kind, 0])
  );
}

function getActiveContract() {
  return quest.activeContractId ? getContractConfig(quest.activeContractId) : null;
}

function startMercenaryContract(contractId) {
  const contract = getContractConfig(contractId);
  if (!contract) {
    return false;
  }

  quest.activeContractId = contractId;
  quest.activeContractStage = "active";
  quest.progress = buildContractProgress(contract.requirements);
  quest.availableContractIds = [];
  updateQuestUI();
  return true;
}

function finishMercenaryContractObjective() {
  quest.activeContractStage = "readyToTurnIn";
  updateQuestUI();
  spawnTextPopup(hero.x, hero.y - 24, "Contract complete!", "rgba(214, 255, 176, 1)", 1.6);
  statusTextEl.textContent = "Return to the Mercenary Captain.";
}

function markCampDiscovered(campId) {
  if (hasDiscoveredCamp(campId)) {
    return;
  }

  quest.discoveredCampIds.push(campId);
  const camp = getCampConfig(campId);
  if (camp?.discoveryXp) {
    awardTutorialProfessionProgress("explorer", camp.discoveryXp, 1, "Hidden Goblin Camp discovered. Explorer progress increased.");
    spawnTextPopup(hero.x, hero.y - 26, `+${camp.discoveryXp} Exploration XP`, "rgba(126, 220, 205, 1)", 1.5);
  }
  ensureContractAvailability();
  updateQuestUI();
}

function getRandomBetween(min, max) {
  return min + Math.random() * (max - min);
}

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
  const enemy = createUnit(spawner.kind, spawner.x, spawner.y, false);
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

  for (const camp of FOREST_CAMPS) {
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
  createUnit("boss", WORLD.width / 2, MAIN_LANE_Y, false);
  enemyHero = createEnemyHero(WORLD.width - 250, getWorldHeight() - 250);
  enemyHero.equippedArmorValue = 80;
  enemyHero.latestPickup = {
  type: "enemyHelmet",
  armorValue: 80,
  radius: 18,
  };
  createUnit("enemySoldier", WORLD.width - 300, getWorldHeight() - 180, false);
}

function clearWorldEntities() {
  trees.length = 0;
  stones.length = 0;
  buildings.length = 0;
  units.length = 0;
  enemies.length = 0;
  enemyProjectiles.length = 0;
  pickups.length = 0;
  heroProjectiles.length = 0;
  heroGrenades.length = 0;
  grenadeShockwaves.length = 0;
  damagePopups.length = 0;
  sparkEffects.length = 0;
  dodgeArenaBullets.length = 0;
  villageFields.length = 0;
  villagePaths.length = 0;
  villageFences.length = 0;
  villageProps.length = 0;
  tutorialNpcs.length = 0;
  tutorialPlots.length = 0;
  tutorialSites.length = 0;
  tutorialRangeTargets.length = 0;
  forestEnemySpawners.length = 0;
  forestRespawnQueue.length = 0;
}

function initializeMainWorld() {
  clearWorldEntities();
  Object.assign(trader, MAIN_WORLD_TRADER_POSITION);
  ensureContractAvailability();
  SPAWN_WAVE_TILE.triggered = false;
  SPAWN_STREAM_TILE.timer = 0;
  DODGE_ARENA.timer = 0;
  player.inTutorialWorld = false;
  player.inVillageWorld = false;
  player.inDodgeArena = false;
  player.selectedUnits = [];
  player.selectedBuildingId = null;

  spawnTrees();
  spawnStones();
  playerBase = createBuilding("playerBase", 60, MAIN_LANE_Y - 100, true);
  playerBase.hp = 900;
  playerBase.maxHp = 900;
  playerBase.w = 180;
  playerBase.h = 200;
  initializeVillage();
  initializeForest();
  enemyBase = createBuilding("enemyBase", WORLD.width - 290, getWorldHeight() - 320, false);
  enemyBase.hp = 800;
  enemyBase.maxHp = 800;
  enemyBase.w = 180;
  enemyBase.h = 200;
  initializeEnemyForces();
  initializeForestEncounterSpawners();
}

function getTutorialProfessionState(professionId) {
  return tutorialProfessionState[professionId];
}

function getProfessionXpRequired(level) {
  return 20 + (level - 1) * 10;
}

function getNextProfessionUnlock(professionId, reputation) {
  const unlocks = PROFESSION_REPUTATION_UNLOCKS[professionId] || [];
  return unlocks.find((entry) => entry.reputation > reputation) || null;
}

function buildProfessionProgressView(professionId) {
  const profession = TUTORIAL_PROFESSIONS[professionId];
  const state = getTutorialProfessionState(professionId);
  const xpRequired = getProfessionXpRequired(state.level);
  const nextUnlock = getNextProfessionUnlock(professionId, state.reputation);
  return {
    label: `${profession.label} XP Progress`,
    value: `${state.xp}/${xpRequired} XP`,
    percent: clamp(state.xp / xpRequired, 0, 1),
    reputationText: `${profession.label} Reputation ${state.reputation}`,
    unlockText: nextUnlock
      ? `Next unlock at Reputation ${nextUnlock.reputation}: ${nextUnlock.text}`
      : "Nothing is unlocked next.",
  };
}

function awardTutorialProfessionProgress(professionId, xp, reputation, rewardMessage) {
  const state = getTutorialProfessionState(professionId);
  state.xp += xp;
  state.reputation += reputation;
  state.completed += 1;

  while (state.xp >= getProfessionXpRequired(state.level)) {
    state.xp -= getProfessionXpRequired(state.level);
    state.level += 1;
  }

  if (rewardMessage) {
    statusTextEl.textContent = rewardMessage;
  }
}

function createTutorialNpc(professionId, x, y) {
  const profession = TUTORIAL_PROFESSIONS[professionId];
  tutorialNpcs.push({
    id: professionId,
    professionId,
    name: profession.label,
    x,
    y,
    radius: 22,
    color: profession.color,
    speed: 92,
    kind: "professionGuide",
  });
}

function createSpecialTutorialNpc(npcConfig) {
  tutorialNpcs.push({
    radius: 22,
    speed: 92,
    ...npcConfig,
  });
}

function resetShootingRangeTutorial() {
  tutorialRangeTargets.length = 0;
  shootingRangeTutorial.state = "idle";
  shootingRangeTutorial.started = false;
  shootingRangeTutorial.completed = false;
  shootingRangeTutorial.hits = 0;
  shootingRangeTutorial.introSeen = false;
  tutorialRangeTargets.push(
    {
      id: "rangeTargetNear",
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

function resetTutorialRangeTargets() {
  for (const target of tutorialRangeTargets) {
    target.hit = false;
    target.destroyed = false;
    target.hp = target.maxHp;
  }
}

function resetTutorialObjects() {
  tutorialPlots.length = 0;
  tutorialSites.length = 0;

  tutorialPlots.push({
    id: "farmerPlot",
    x: TUTORIAL_WORLD.spawnX - 300,
    y: TUTORIAL_WORLD.spawnY + 80,
    w: 92,
    h: 92,
    state: "empty",
    timer: 0,
    active: false,
  });

  tutorialSites.push(
    {
      id: "explorerWaypoint",
      professionId: "explorer",
      kind: "landmark",
      x: TUTORIAL_WORLD.spawnX - 420,
      y: TUTORIAL_WORLD.spawnY - 260,
      radius: 26,
      active: false,
      discovered: false,
      label: "Old Waypoint",
    },
    {
      id: "craftsmanOre",
      professionId: "craftsman",
      kind: "pickup",
      x: TUTORIAL_WORLD.rockX + 56,
      y: TUTORIAL_WORLD.rockY - 18,
      radius: 14,
      active: false,
      collected: false,
      resourceKey: "ore",
      label: "Ore Sample",
    },
    {
      id: "scholarShard",
      professionId: "scholar",
      kind: "pickup",
      x: TUTORIAL_WORLD.spawnX + 70,
      y: TUTORIAL_WORLD.spawnY - 310,
      radius: 14,
      active: false,
      collected: false,
      resourceKey: "arcaneDust",
      label: "Arcane Shard",
    }
  );
}

function initializeShootingRange() {
  createSpecialTutorialNpc({
    id: SHOOTING_INSTRUCTOR_ID,
    professionId: null,
    kind: "shootingInstructor",
    name: "Shooting Instructor",
    x: getShootingRangeConfig().instructorStartX,
    y: getShootingRangeConfig().instructorStartY,
    color: "#d88444",
    targetX: getShootingRangeConfig().instructorStartX,
    targetY: getShootingRangeConfig().instructorStartY,
  });
  resetShootingRangeTutorial();
}

function populateTutorialWorld() {
  tutorialNpcs.length = 0;
  createTutorialNpc("explorer", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY - 280);
  createTutorialNpc("scholar", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY - 170);
  createTutorialNpc("farmer", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY - 60);
  createTutorialNpc("merchant", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY + 50);
  createTutorialNpc("craftsman", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY + 160);
  createTutorialNpc("mercenary", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY + 270);
  initializeShootingRange();
  restoreMercenaryTrainingTask();
  resetTutorialObjects();
  if (!player.tutorialPathsUnlocked) {
    pickups.push({
      id: nextId(),
      type: "tutorialScroll",
      x: TUTORIAL_WORLD.spawnX - 120,
      y: TUTORIAL_WORLD.spawnY + 120,
      radius: 20,
      collected: false,
    });
  }
}

function restoreMercenaryTrainingTask() {
  const task = getTutorialProfessionState("mercenary").activeTask;
  if (task?.status !== "active") return;
  const raider = createUnit("skeleton",
    player.inVillageWorld ? 940 + VILLAGE_WORLD.offset.x : TUTORIAL_WORLD.spawnX + 400,
    player.inVillageWorld ? 1500 + VILLAGE_WORLD.offset.y : TUTORIAL_WORLD.spawnY + 10, false);
  raider.displayName = "Training Raider";
  raider.tutorialProfessionId = "mercenary";
  task.enemyId = raider.id;
}

function startTutorialProfessionTask(professionId) {
  const state = getTutorialProfessionState(professionId);
  if (state.activeTask && state.activeTask.status !== "completed") {
    return false;
  }

  if (professionId === "farmer") {
    player.tutorialResources.seeds += 1;
    const plot = tutorialPlots.find((entry) => entry.id === "farmerPlot");
    if (plot) {
      plot.active = true;
      plot.state = "empty";
      plot.timer = 0;
    }
    state.activeTask = { id: "farmerStarter", status: "active" };
  } else if (professionId === "mercenary") {
    state.activeTask = { id: "mercenaryStarter", status: "active" };
    restoreMercenaryTrainingTask();
  } else if (professionId === "explorer") {
    const site = tutorialSites.find((entry) => entry.id === "explorerWaypoint");
    if (site) {
      site.active = true;
      site.discovered = false;
    }
    state.activeTask = { id: "explorerStarter", status: "active" };
  } else if (professionId === "merchant") {
    state.activeTask = { id: "merchantStarter", status: "active" };
  } else if (professionId === "craftsman") {
    const site = tutorialSites.find((entry) => entry.id === "craftsmanOre");
    if (site) {
      site.active = true;
      site.collected = false;
    }
    state.activeTask = { id: "craftsmanStarter", status: "active" };
  } else if (professionId === "scholar") {
    const site = tutorialSites.find((entry) => entry.id === "scholarShard");
    if (site) {
      site.active = true;
      site.collected = false;
    }
    state.activeTask = { id: "scholarStarter", status: "active" };
  }

  return true;
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

function initializeVillage(roadStartY = playerBase.y + playerBase.h) {
  villagePaths.push(
    { x: 132, y: roadStartY, w: VILLAGE_ROAD_WIDTH, h: 1220 - roadStartY },
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

function addForestRectProp(type, x, y, w, h, collidable = true) {
  villageProps.push({ type, x, y, w, h, collidable, shape: "rect" });
}

function addForestCircleProp(type, x, y, radius, collidable = true) {
  villageProps.push({ type, x, y, radius, collidable, shape: "circle" });
}

function spawnForestTrees() {
  const clusterCenters = [
    [1040, 1140], [1160, 860], [1370, 1040], [1560, 930], [1720, 770],
    [1870, 900], [2000, 1090], [2140, 1320], [1990, 480], [1550, 460],
  ];
  for (const [centerX, centerY] of clusterCenters) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const radius = 60 + (index % 3) * 18;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      trees.push({
        id: nextId(),
        x,
        y,
        radius: 22 + (index % 2) * 4,
        wood: 25,
      });
    }
  }
}

function spawnForestStones() {
  const points = [
    [1028, 1032], [1184, 786], [1318, 1148], [1492, 688], [1638, 982],
    [1756, 838], [1882, 1044], [2044, 1182], [2126, 1368], [1942, 574],
    [1684, 456], [1438, 522],
  ];
  for (const [x, y] of points) {
    stones.push({
      id: nextId(),
      x,
      y,
      radius: 20,
    });
  }
}

function initializeForest() {
  villagePaths.push(
    { x: 520, y: 1242, w: 360, h: 58 },
    { x: 842, y: 1010, w: 58, h: 288 },
    { x: 872, y: 980, w: 262, h: 56 },
    { x: 1098, y: 850, w: 58, h: 186 },
    { x: 1128, y: 822, w: 306, h: 52 },
    { x: 1400, y: 700, w: 54, h: 174 },
    { x: 1422, y: 674, w: 370, h: 50 },
    { x: 1760, y: 600, w: 52, h: 124 },
    { x: 1504, y: 1038, w: 54, h: 176 },
    { x: 1532, y: 1188, w: 362, h: 46 },
    { x: 1864, y: 1092, w: 44, h: 142 },
    { x: 1888, y: 1070, w: 156, h: 40 }
  );

  spawnForestTrees();
  spawnForestStones();

  const forestScenery = [
    { type: "bush", x: 972, y: 960, radius: 18, collidable: false },
    { type: "bush", x: 1250, y: 846, radius: 20, collidable: false },
    { type: "bush", x: 1440, y: 790, radius: 18, collidable: false },
    { type: "bush", x: 1658, y: 688, radius: 18, collidable: false },
    { type: "bush", x: 1772, y: 974, radius: 20, collidable: false },
    { type: "bush", x: 2144, y: 1126, radius: 20, collidable: false },
    { type: "stump", x: 1092, y: 934, w: 26, h: 18, collidable: false },
    { type: "stump", x: 1578, y: 1094, w: 28, h: 18, collidable: false },
    { type: "wreckage", x: 1188, y: 1000, w: 44, h: 14, collidable: false },
    { type: "wreckage", x: 1714, y: 1182, w: 52, h: 14, collidable: false },
    { type: "cart", x: 1320, y: 832, w: 54, h: 28, collidable: true },
    { type: "cart", x: 1518, y: 1198, w: 54, h: 28, collidable: true },
  ];

  for (const prop of forestScenery) {
    if (prop.shape === "circle" || typeof prop.radius === "number") {
      addForestCircleProp(prop.type, prop.x, prop.y, prop.radius, prop.collidable);
    } else {
      addForestRectProp(prop.type, prop.x, prop.y, prop.w, prop.h, prop.collidable);
    }
  }

  for (const camp of FOREST_CAMPS) {
    for (const prop of camp.props) {
      if (typeof prop.radius === "number") {
        addForestCircleProp(prop.type, prop.x, prop.y, prop.radius, prop.collidable);
      } else {
        addForestRectProp(prop.type, prop.x, prop.y, prop.w, prop.h, prop.collidable);
      }
    }
  }
}

function hasInventoryItem(itemType) {
  return inventory.some((item) => item.type === itemType);
}

function addInventoryItem(item) {
  if (hasInventoryItem(item.type)) {
    return;
  }
  inventory.push(item);
  updateInventoryUI();
}

function rollContractLootPickup(contractId) {
  const contract = getContractConfig(contractId);
  if (!contract || Math.random() > contract.rewards.lootChance) {
    return false;
  }

  const lootType = contract.rewards.lootTable[Math.floor(Math.random() * contract.rewards.lootTable.length)];
  const loot = {
    enemyHelmet: { type: "enemyHelmet", armorValue: 80, radius: 18 },
    rareHelmet: { type: "rareHelmet", armorValue: 85, radius: 18 },
    healthBuff: { type: "healthBuff", healthValue: 20, radius: 18 },
    weaponBuff: { type: "weaponBuff", damageValue: 2, radius: 18 },
  }[lootType];

  if (!loot) {
    return false;
  }

  spawnPickupDrop(loot, hero.x + 28, hero.y - 6);
  spawnTextPopup(hero.x, hero.y - 42, "Bonus loot dropped", "rgba(255, 228, 154, 1)", 1.4);
  return true;
}

function completeMercenaryContractTurnIn(contractId) {
  const contract = getContractConfig(contractId);
  if (!contract) {
    return;
  }

  player.money += contract.rewards.gold;
  awardPlayerXp(contract.rewards.xp, hero.x, hero.y);
  awardTutorialProfessionProgress(
    "mercenary",
    contract.rewards.mercenaryXp,
    contract.rewards.mercenaryReputation,
    "Mercenary contract completed. Reputation increased."
  );
  rollContractLootPickup(contractId);
  quest.completedContractIds.push(contractId);
  quest.activeContractId = null;
  quest.activeContractStage = "idle";
  quest.progress = null;
  ensureContractAvailability();
  updateInventoryUI();
  updateQuestUI();
  spawnTextPopup(hero.x, hero.y - 24, `+${contract.rewards.gold} Gold`, "rgba(255, 219, 146, 1)", 1.4);
  statusTextEl.textContent = `${contract.title} completed.`;
}

function getContractProgressText(contract) {
  const lines = [];
  for (const [kind, required] of Object.entries(contract.requirements)) {
    const label = kind === "goblin"
      ? "Goblins"
      : kind === "goblinArcher"
        ? "Archers"
        : "Ogre";
    const current = Math.min(required, quest.progress?.[kind] || 0);
    lines.push(`${label}: ${current}/${required}`);
  }
  return lines.join("\n");
}

function registerContractKill(enemy) {
  const contract = getActiveContract();
  if (!contract || quest.activeContractStage !== "active" || enemy.campId !== contract.campId) {
    return;
  }

  const required = contract.requirements[enemy.kind];
  if (!required) {
    return;
  }

  quest.progress[enemy.kind] = Math.min(required, (quest.progress[enemy.kind] || 0) + 1);
  const isComplete = Object.entries(contract.requirements).every(([kind, amount]) => (quest.progress[kind] || 0) >= amount);
  updateQuestUI();
  if (isComplete) {
    finishMercenaryContractObjective();
  }
}

function getQuestObjectiveText() {
  if (player.inVillageWorld) {
    if (shootingRangeTutorial.started && !shootingRangeTutorial.completed) {
      return shootingRangeTutorial.state === "leading"
        ? "Follow the Shooting Instructor."
        : `Hit the targets: ${shootingRangeTutorial.hits}/2`;
    }
    const task = getTutorialProfessionState("mercenary").activeTask;
    if (task) return task.status === "readyToTurnIn"
      ? "Return to the Mercenary for your reward."
      : "Defeat the training raider east of the village.";
    return "Talk to the Mercenary or visit the shooting range on the far right of the map.";
  }
  const activeContract = getActiveContract();
  if (player.inTutorialWorld) {
    if (activeContract && quest.activeContractStage === "active") {
      return `${activeContract.title}\n${getContractProgressText(activeContract)}`;
    }
    if (activeContract && quest.activeContractStage === "readyToTurnIn") {
      return `${activeContract.title}\nReturn to the Mercenary Captain.`;
    }
    if (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp")) {
      return "Explore off the main forest paths to find the hidden goblin camp.";
    }
    if (shootingRangeTutorial.started && !shootingRangeTutorial.completed) {
      if (shootingRangeTutorial.state === "leading") {
        return "Follow the Shooting Instructor.";
      }
      return `Hit the targets: ${shootingRangeTutorial.hits}/2`;
    }
    const activeTasks = Object.entries(tutorialProfessionState)
      .filter(([, state]) => state.activeTask && state.activeTask.status !== "completed")
      .map(([professionId]) => `${TUTORIAL_PROFESSIONS[professionId].label}: ${TUTORIAL_PROFESSIONS[professionId].taskTitle}`);
    return activeTasks.length ? activeTasks.slice(0, 2).join(" • ") : "Talk to the guides to learn each career path.";
  }

  if (activeContract && quest.activeContractStage === "active") {
    return `${activeContract.title}\n${getContractProgressText(activeContract)}`;
  }
  if (activeContract && quest.activeContractStage === "readyToTurnIn") {
    return `${activeContract.title}\nReturn to the Mercenary Captain.`;
  }
  if (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp")) {
    return "Explore off the main forest paths to find the hidden goblin camp.";
  }
  return "No contract posted right now.";
}

function updateQuestUI() {
  if (player.inVillageWorld) {
    questPanelEl.classList.remove("hidden");
    questTitleEl.textContent = "Village";
    questObjectiveEl.textContent = getQuestObjectiveText();
    return;
  }
  if (player.inTutorialWorld) {
    const showingContract = Boolean(getActiveContract()) || (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp"));
    const visible = player.tutorialPathsUnlocked || showingContract;
    questPanelEl.classList.toggle("hidden", !visible);
    if (!visible) {
      return;
    }
    questPanelEl.classList.remove("hidden");
    questTitleEl.textContent = showingContract ? "Mercenary Contract" : "Tutorial Paths";
    questObjectiveEl.textContent = getQuestObjectiveText();
    return;
  }
  const visible = Boolean(getActiveContract()) || (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp"));
  questPanelEl.classList.toggle("hidden", !visible);
  if (!visible) {
    return;
  }
  questTitleEl.textContent = "Mercenary Contract";
  questObjectiveEl.textContent = getQuestObjectiveText();
}

function updateInventoryUI() {
  inventoryListEl.textContent = "";

  const resources = [
    { label: "Wood", value: player.wood },
    { label: "Gold", value: player.money },
    { label: "Seeds", value: player.tutorialResources.seeds },
    { label: "Wheat", value: player.tutorialResources.wheat },
    { label: "Ore", value: player.tutorialResources.ore },
    { label: "Arcane Dust", value: player.tutorialResources.arcaneDust },
  ];

  for (const resource of resources) {
    if (resource.value <= 0 && resource.label !== "Wood" && resource.label !== "Gold") {
      continue;
    }
    const itemEl = document.createElement("div");
    itemEl.className = "inventory-item resource-item";
    itemEl.innerHTML = `<span>${resource.label}</span><strong>${resource.value}</strong>`;
    inventoryListEl.appendChild(itemEl);
  }

  if (!inventory.length) {
    const emptyEl = document.createElement("span");
    emptyEl.className = "inventory-empty";
    emptyEl.textContent = "No items yet";
    inventoryListEl.appendChild(emptyEl);
    return;
  }

  for (const item of inventory) {
    const itemEl = document.createElement("div");
    itemEl.className = "inventory-item";
    itemEl.textContent = `${item.name} • ${item.description}`;
    inventoryListEl.appendChild(itemEl);
  }
}

function isHeroNearVillager() {
  return !player.inVillageWorld && distance(hero, villager) <= 80;
}

function isDialogueOpen() {
  return Boolean(quest.activeDialogue || tutorialDialogue.npcId);
}

function getNearbyTutorialNpc() {
  let closest = null;
  let closestDistance = Infinity;

  for (const npc of tutorialNpcs) {
    const dist = distance(hero, npc);
    if (dist <= 90 && dist < closestDistance) {
      closest = npc;
      closestDistance = dist;
    }
  }

  return closest;
}

function getShootingInstructor() {
  return getTutorialNpcById(SHOOTING_INSTRUCTOR_ID);
}

function closeTutorialDialogue() {
  tutorialDialogue.npcId = null;
  tutorialDialogue.text = "";
  tutorialDialogue.options = [];
  tutorialDialogue.progressView = null;
  tutorialDialogue.taskOffered = false;
}

function getTutorialNpcById(npcId) {
  return tutorialNpcs.find((npc) => npc.id === npcId) || null;
}

function buildTutorialDialogueOptions(npc) {
  if (npc.kind === "shootingInstructor") {
    return [
      { id: "work", label: "1. Ask About Work" },
      { id: "progress", label: "3. View Progress" },
      { id: "leave", label: "4. Leave" },
    ];
  }

  const state = getTutorialProfessionState(npc.professionId);
  const options = [
    { id: "work", label: "1. Ask About Work" },
    { id: "progress", label: "3. View Progress" },
    { id: "leave", label: "4. Leave" },
  ];

  if (state.activeTask) {
    options.splice(1, 0, {
      id: "turnIn",
      label: "2. Turn In Task",
      disabled: state.activeTask.status !== "readyToTurnIn",
    });
  } else if (tutorialDialogue.taskOffered && !state.activeTask) {
    options.splice(1, 0, { id: "accept", label: "2. Accept Task" });
  }

  return options;
}

function openTutorialNpcMenu(npc, text = null, taskOffered = false, progressView = null) {
  if (npc.kind === "shootingInstructor") {
    tutorialDialogue.npcId = npc.id;
    tutorialDialogue.text = text || "I cover ranged combat. Ask about work and I will walk you through a short live-fire lesson.";
    tutorialDialogue.progressView = progressView;
    tutorialDialogue.taskOffered = false;
    tutorialDialogue.options = buildTutorialDialogueOptions(npc);
    shootingRangeTutorial.introSeen = true;
    updateDialogueUI();
    return;
  }

  const profession = TUTORIAL_PROFESSIONS[npc.professionId];
  const state = getTutorialProfessionState(npc.professionId);
  tutorialDialogue.npcId = npc.id;
  tutorialDialogue.text = text || (!state.introSeen ? profession.intro : profession.workText);
  tutorialDialogue.progressView = progressView;
  tutorialDialogue.taskOffered = taskOffered;
  tutorialDialogue.options = buildTutorialDialogueOptions(npc);
  state.introSeen = true;
  updateDialogueUI();
}

function completeTutorialProfessionTask(professionId) {
  const state = getTutorialProfessionState(professionId);
  if (!state.activeTask || state.activeTask.status !== "active") {
    return;
  }
  state.activeTask.status = "readyToTurnIn";
  spawnTextPopup(hero.x, hero.y - 26, `${TUTORIAL_PROFESSIONS[professionId].label} task ready`, "rgba(255, 238, 196, 1)", 1.1);
  updateQuestUI();
}

function turnInTutorialProfessionTask(professionId) {
  const state = getTutorialProfessionState(professionId);
  const profession = TUTORIAL_PROFESSIONS[professionId];
  if (!state.activeTask || state.activeTask.status !== "readyToTurnIn") {
    return false;
  }

  if (professionId === "farmer" && player.tutorialResources.wheat > 0) {
    player.tutorialResources.wheat -= 1;
    player.tutorialResources.seeds += 2;
  } else if (professionId === "merchant") {
    player.wood = Math.max(0, player.wood - 25);
    player.money += 35;
  } else if (professionId === "craftsman" && player.tutorialResources.ore > 0) {
    player.tutorialResources.ore -= 1;
    player.weaponBonusStat += 4;
  } else if (professionId === "scholar" && player.tutorialResources.arcaneDust > 0) {
    player.tutorialResources.arcaneDust -= 1;
    player.bonusAbilityDamage += 2;
  } else if (professionId === "mercenary") {
    player.money += 30;
  } else if (professionId === "explorer") {
    player.money += 15;
  }

  awardPlayerXp(profession.taskXp || 0);
  awardTutorialProfessionProgress(professionId, 12, 1, `${profession.label}: ${profession.rewardText}`);
  state.activeTask.status = "completed";
  state.activeTask = null;
  updateInventoryUI();
  updateStatsUI();
  updateQuestUI();
  return true;
}

function handleTutorialNpcOption(optionId) {
  const npc = getTutorialNpcById(tutorialDialogue.npcId);
  if (!npc) {
    return;
  }

  if (npc.kind === "shootingInstructor") {
    if (optionId === "leave") {
      closeTutorialDialogue();
      updateDialogueUI();
      statusTextEl.textContent = getCharacterStatus();
      return;
    }

    if (optionId === "work") {
      if (shootingRangeTutorial.completed) {
        openTutorialNpcMenu(npc, "Clean work. You cleared the range. Head to the main world when you are ready.");
        return;
      }
      if (!shootingRangeTutorial.started) {
        resetTutorialRangeTargets();
        shootingRangeTutorial.hits = 0;
        shootingRangeTutorial.started = true;
        shootingRangeTutorial.state = "leading";
        const shootingLine = getShootingLine();
        npc.targetX = shootingLine.x - npc.radius - 12;
        npc.targetY = shootingLine.y + shootingLine.h - npc.radius;
        spawnTextPopup(npc.x, npc.y - 30, "Follow me.", "rgba(255, 226, 148, 1)", 1.2);
        closeTutorialDialogue();
        updateDialogueUI();
        statusTextEl.textContent = "Instructor: Follow me to the range.";
        updateQuestUI();
        return;
      }
      if (shootingRangeTutorial.state === "leading") {
        openTutorialNpcMenu(npc, "Stay with me. We are moving to the firing line.");
      } else {
        openTutorialNpcMenu(npc, `Take the shots. Hit the targets: ${shootingRangeTutorial.hits}/2.`);
      }
      return;
    }

    if (optionId === "progress") {
      if (shootingRangeTutorial.completed) {
        openTutorialNpcMenu(npc, "Both targets were hit.");
      } else if (!shootingRangeTutorial.started) {
        openTutorialNpcMenu(npc, "Lesson not started. Ask about work to begin.");
      } else if (shootingRangeTutorial.state === "leading") {
        openTutorialNpcMenu(npc, "Current step: follow me to the shooting position.");
      } else {
        openTutorialNpcMenu(npc, `Current step: hit the targets. Progress ${shootingRangeTutorial.hits}/2.`);
      }
      return;
    }
  }

  const profession = TUTORIAL_PROFESSIONS[npc.professionId];
  const state = getTutorialProfessionState(npc.professionId);
  if (optionId === "leave") {
    closeTutorialDialogue();
    updateDialogueUI();
    statusTextEl.textContent = getCharacterStatus();
    return;
  }

  if (optionId === "work") {
    openTutorialNpcMenu(npc, `${profession.workText} Task available: ${profession.taskTitle}.`, !state.activeTask);
    return;
  }

  if (optionId === "progress") {
    openTutorialNpcMenu(
      npc,
      `Completed tasks ${state.completed}. Review your current standing below.`,
      false,
      buildProfessionProgressView(npc.professionId)
    );
    return;
  }

  if (optionId === "turnIn") {
    if (turnInTutorialProfessionTask(npc.professionId)) {
      openTutorialNpcMenu(npc, `Good work. ${profession.rewardText}`);
    } else {
      openTutorialNpcMenu(npc, `You still need to finish: ${profession.taskTitle}.`);
    }
    return;
  }

  if (!state.activeTask) {
    startTutorialProfessionTask(npc.professionId);
    closeTutorialDialogue();
    updateDialogueUI();
    statusTextEl.textContent = `Task accepted: ${profession.taskTitle}.`;
  } else if (npc.professionId === "merchant" && player.wood >= 25) {
    completeTutorialProfessionTask("merchant");
    openTutorialNpcMenu(npc, "You have the wood. Ask about work again to turn it in.");
  } else {
    openTutorialNpcMenu(npc, `Current task: ${profession.taskTitle}.`);
  }
  updateInventoryUI();
  updateQuestUI();
}

function getQuestDialogueLines(dialogueKey, contractId = null) {
  const contract = contractId ? getContractConfig(contractId) : null;
  if (dialogueKey === "offerContract" && contract) {
    return contract.offerLines;
  }
  if (dialogueKey === "contractProgress" && contract) {
    const progressText = quest.activeContractStage === "active"
      ? getContractProgressText(contract).replace(/\n/g, ". ")
      : "Return to me for payment.";
    return [...contract.progressLines, progressText];
  }
  if (dialogueKey === "completeContract" && contract) {
    return contract.completionLines;
  }
  if (dialogueKey === "discoverHidden") {
    return [
      "You cleared the first camp, but there is nothing else on my board yet.",
      "Scout off the road. If you uncover another nest, I will post the harder contract.",
    ];
  }
  return [
    "The forest is quiet for the moment.",
    "Check back after you discover another threat.",
  ];
}

function openQuestDialogue(dialogueKey, action = null, contractId = null) {
  quest.activeDialogue = dialogueKey;
  quest.dialogueIndex = 0;
  quest.dialogueAction = action;
  quest.dialogueContractId = contractId;
  updateDialogueUI();
}

function closeQuestDialogue() {
  quest.activeDialogue = null;
  quest.dialogueIndex = 0;
  quest.dialogueAction = null;
  quest.dialogueContractId = null;
  updateDialogueUI();
}

function updateDialogueUI() {
  const open = isDialogueOpen();
  dialoguePanelEl.classList.toggle("hidden", !open);
  if (!open) {
    dialogueProgressEl.classList.add("hidden");
    dialogueOptionsEl.classList.add("hidden");
    dialogueOptionsEl.textContent = "";
    return;
  }

  if (tutorialDialogue.npcId) {
    const npc = getTutorialNpcById(tutorialDialogue.npcId);
    dialogueSpeakerEl.textContent = npc?.name || "Guide";
    dialogueTextEl.textContent = tutorialDialogue.text;
    dialogueHintEl.textContent = "";
    dialogueHintEl.classList.add("hidden");
    if (tutorialDialogue.progressView) {
      dialogueProgressLabelEl.textContent = tutorialDialogue.progressView.label;
      dialogueProgressValueEl.textContent = tutorialDialogue.progressView.value;
      dialogueProgressFillEl.style.width = `${Math.round(tutorialDialogue.progressView.percent * 100)}%`;
      dialogueProgressReputationEl.textContent = tutorialDialogue.progressView.reputationText;
      dialogueProgressUnlockEl.textContent = tutorialDialogue.progressView.unlockText;
      dialogueProgressEl.classList.remove("hidden");
    } else {
      dialogueProgressEl.classList.add("hidden");
      dialogueProgressFillEl.style.width = "0%";
    }
    dialogueOptionsEl.textContent = "";
    dialogueOptionsEl.classList.remove("hidden");
    const optionSlots = new Array(4).fill(null);
    for (const option of tutorialDialogue.options) {
      const match = option.label.match(/^(\d+)\./);
      const slotIndex = match ? Number(match[1]) - 1 : -1;
      if (slotIndex >= 0 && slotIndex < optionSlots.length) {
        optionSlots[slotIndex] = option;
      }
    }
    for (const option of optionSlots) {
      if (!option) {
        const spacer = document.createElement("div");
        spacer.className = "dialogue-option-spacer";
        spacer.setAttribute("aria-hidden", "true");
        dialogueOptionsEl.appendChild(spacer);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dialogue-option";
      if (option.id === "leave") {
        button.classList.add("dialogue-option-leave");
      } else if (option.id === "turnIn") {
        button.classList.add(option.disabled ? "dialogue-option-turn-in-disabled" : "dialogue-option-turn-in-ready");
      }
      if (option.disabled) {
        button.disabled = true;
      }
      button.textContent = option.label;
      if (!option.disabled) {
        button.addEventListener("click", () => {
          handleTutorialNpcOption(option.id);
        });
      }
      dialogueOptionsEl.appendChild(button);
    }
    return;
  }

  const lines = getQuestDialogueLines(quest.activeDialogue, quest.dialogueContractId);
  dialogueProgressEl.classList.add("hidden");
  dialogueOptionsEl.classList.add("hidden");
  dialogueOptionsEl.textContent = "";
  dialogueHintEl.classList.remove("hidden");
  dialogueSpeakerEl.textContent = villager.name;
  dialogueTextEl.textContent = lines[quest.dialogueIndex] || "";
  const isLastLine = quest.dialogueIndex >= lines.length - 1;
  if (quest.dialogueAction === "acceptContract" && isLastLine) {
    dialogueHintEl.textContent = "Press Space to accept contract";
  } else if (quest.dialogueAction === "turnInContract" && isLastLine) {
    dialogueHintEl.textContent = "Press Space to claim reward";
  } else {
    dialogueHintEl.textContent = "Press Space to continue";
  }
}

function beginVillagerInteraction() {
  if (!isHeroNearVillager()) {
    return false;
  }

  const activeContract = getActiveContract();
  if (activeContract && quest.activeContractStage === "readyToTurnIn") {
    openQuestDialogue("completeContract", "turnInContract", activeContract.id);
  } else if (activeContract) {
    openQuestDialogue("contractProgress", null, activeContract.id);
  } else if (quest.availableContractIds.length > 0) {
    openQuestDialogue("offerContract", "acceptContract", quest.availableContractIds[0]);
  } else if (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp")) {
    openQuestDialogue("discoverHidden");
  } else {
    openQuestDialogue("noContract");
  }

  return true;
}

function beginTutorialNpcInteraction() {
  const npc = getNearbyTutorialNpc();
  if (!npc) {
    return false;
  }

  openTutorialNpcMenu(npc);
  return true;
}

function advanceQuestDialogue() {
  if (!isDialogueOpen()) {
    return false;
  }

  const lines = getQuestDialogueLines(quest.activeDialogue, quest.dialogueContractId);
  const isLastLine = quest.dialogueIndex >= lines.length - 1;
  if (!isLastLine) {
    quest.dialogueIndex += 1;
    updateDialogueUI();
    return true;
  }

  if (quest.dialogueAction === "acceptContract" && quest.dialogueContractId) {
    startMercenaryContract(quest.dialogueContractId);
    statusTextEl.textContent = `Contract accepted: ${getContractConfig(quest.dialogueContractId)?.title || "Mercenary contract"}.`;
  } else if (quest.dialogueAction === "turnInContract" && quest.dialogueContractId) {
    completeMercenaryContractTurnIn(quest.dialogueContractId);
  }

  closeQuestDialogue();
  return true;
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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function getCharacterStatus() {
  if (player.inVillageWorld) {
    const npc = getNearbyTutorialNpc();
    return npc
      ? `${npc.name} nearby. Press Space to talk.`
      : "Village. Visit the shooting range to the east, or walk onto a teleporter to travel.";
  }
  if (player.inTutorialWorld) {
    return "Training world. Talk to the guides with Space, or use a teleporter to leave.";
  }

  if (isDialogueOpen()) {
    return "Talking to the Mercenary Captain. Press Space to continue.";
  }

  if (isHeroNearTrader()) {
    return "Near the Trader. Press Space to buy weapon upgrades.";
  }

  if (isHeroNearVillager()) {
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

  if (isHeroNearShop()) {
    return "Near the Shop. Press Space to trade 25 wood for 25 gold.";
  }

  return "";
}

function updateTrainButton() {
  const selected = buildings.find((b) => b.id === player.selectedBuildingId && b.type === "barracks" && b.isPlayer);
  const show = Boolean(selected);
  trainSoldierBtn.classList.toggle("hidden", !show);
  trainSoldierBtn.disabled = player.money < 50 || !show;
}

function isPlayerBaseSelected() {
  return Boolean(playerBase && player.selectedBuildingId === playerBase.id);
}

function updateBuildBarracksButton() {
  buildBarracksBtn.disabled = !isPlayerBaseSelected() || player.isPlacingBuilding;
}

function canAimSoldierGrenade() {
  return player.hasSelectedCharacter &&
    !player.victory &&
    !player.loss &&
    !isInterfacePanelOpen() &&
    !player.isPlacingBuilding &&
    hero.selectedClass === "soldier" &&
    hero.grenadeCooldownRemaining <= 0;
}

function startGrenadeAim() {
  if (!canAimSoldierGrenade()) {
    return false;
  }
  grenadeAim.active = true;
  statusTextEl.textContent = "Grenade readied. Release G to throw.";
  return true;
}

function useBattleMedicine() {
  if (
    !player.hasSelectedCharacter ||
    hero.selectedClass !== "soldier" ||
    player.victory ||
    player.loss ||
    isInterfacePanelOpen() ||
    player.isPlacingBuilding ||
    hero.isDead ||
    hero.battleMedicineCooldownRemaining > 0
  ) {
    return false;
  }

  hero.hp = Math.min(hero.maxHp, hero.hp + SOLDIER_BATTLE_MEDICINE_HEAL);
  hero.battleMedicineBuffTimer = SOLDIER_BATTLE_MEDICINE_DURATION;
  hero.battleMedicineCooldownRemaining = SOLDIER_BATTLE_MEDICINE_COOLDOWN;
  hero.battleMedicineUseTimer = BATTLE_MEDICINE_USE_DURATION;
  hero.regenProgress = 0;
  hero.targetPos = null;
  hero.isMoving = false;
  spawnTextPopup(hero.x, hero.y - hero.radius - 28, `+${SOLDIER_BATTLE_MEDICINE_HEAL} HP`, "rgba(156, 245, 164, 1)", 1);
  spawnTextPopup(hero.x, hero.y - hero.radius - 6, `+${SOLDIER_BATTLE_MEDICINE_REGEN_BONUS} Regen`, "rgba(196, 255, 172, 1)", 1.2);
  statusTextEl.textContent = "Battle Medicine activated.";
  updateAbilityUI();
  return true;
}

function isUsingBattleMedicine() {
  return hero.selectedClass === "soldier" && hero.battleMedicineUseTimer > 0;
}

function isSoldierRifleShooting() {
  return hero.selectedClass === "soldier" &&
    hero.hasRifle &&
    hero.rifleFireMode === "automatic" &&
    mouse.leftDown &&
    !hero.isReloading &&
    hero.ammo > 0 &&
    hero.shootLockTimer <= 0 &&
    !player.isPlacingBuilding &&
    !isInterfacePanelOpen() &&
    !isUsingBattleMedicine();
}

function cancelGrenadeAim() {
  grenadeAim.active = false;
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

function startBarracksPlacement() {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (isInterfacePanelOpen()) {
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
  const selectedAbilityName = hero.selectedClass ? CHARACTER_OPTIONS[hero.selectedClass].abilityName : "";
  const showSlashAbility = Boolean(selectedAbilityName);
  const ready = hero.slashTimer <= 0;
  abilityNameEl.textContent = selectedAbilityName || "Choose Class";
  slashAbilityEl.classList.toggle("hidden", !showSlashAbility);
  slashAbilityEl.classList.toggle("ready", showSlashAbility && ready);
  slashAbilityEl.classList.toggle("cooldown", !showSlashAbility || !ready);
  slashCooldownTextEl.textContent = showSlashAbility && player.hasSelectedCharacter
    ? (ready ? "Ready" : `${hero.slashTimer.toFixed(1)}s`)
    : "Pick Hero";

  const showBattleMedicine = hero.selectedClass === "soldier";
  const battleMedicineReady = hero.battleMedicineCooldownRemaining <= 0;
  battleMedicineAbilityEl.classList.toggle("hidden", !showBattleMedicine);
  battleMedicineAbilityNameEl.textContent = hero.battleMedicineBuffTimer > 0 ? "Battle Medicine +" : "Battle Medicine";
  battleMedicineAbilityEl.classList.toggle("ready", showBattleMedicine && battleMedicineReady);
  battleMedicineAbilityEl.classList.toggle("cooldown", !showBattleMedicine || !battleMedicineReady);
  battleMedicineCooldownTextEl.textContent = !showBattleMedicine
    ? "Unavailable"
    : hero.battleMedicineBuffTimer > 0
      ? `${hero.battleMedicineBuffTimer.toFixed(1)}s buff`
      : battleMedicineReady
        ? "Ready"
        : `${hero.battleMedicineCooldownRemaining.toFixed(1)}s`;

  const showGrenade = hero.selectedClass === "soldier";
  const grenadeReady = hero.grenadeCooldownRemaining <= 0;
  grenadeAbilityEl.classList.toggle("hidden", !showGrenade);
  grenadeAbilityNameEl.textContent = "Grenade";
  grenadeAbilityEl.classList.toggle("ready", showGrenade && grenadeReady);
  grenadeAbilityEl.classList.toggle("cooldown", !showGrenade || !grenadeReady);
  grenadeCooldownTextEl.textContent = !showGrenade
    ? "Unavailable"
    : grenadeReady
      ? "Ready"
      : `${hero.grenadeCooldownRemaining.toFixed(1)}s`;

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

function isInterfacePanelOpen() {
  return player.shopOpen || player.traderOpen || player.weaponDetailsOpen;
}

function getWeaponUpgradeRules() {
  return {
    damage: { step: 2 },
    ammo: { step: 5 },
    reload: { step: 0.1 },
    range: { step: 40, meleeStep: 8 },
    fireRate: { rifleStep: 0.005, bowStep: 0.03, axeStep: 0.015, classStep: 0.2 },
  };
}

function getRifleDamage() {
  return 16 + player.bonusDamage + player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step;
}

function getRifleMaxAmmo() {
  return 30 + player.weaponDetailAmmoLevel * getWeaponUpgradeRules().ammo.step;
}

function getRifleReloadDuration() {
  return Math.max(0.4, 1.2 - player.weaponDetailReloadLevel * getWeaponUpgradeRules().reload.step);
}

function getRifleRange() {
  return GRID_SIZE * 5 + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step;
}

function getRifleFireInterval() {
  return Math.max(0.03, 0.08 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.rifleStep);
}

function getClassWeaponCooldown(selected) {
  return Math.max(0.5, (selected?.cooldown || 1) - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.classStep);
}

function getCurrentWeaponDetails() {
  const selected = getSelectedClassConfig();
  if (!selected) {
    return null;
  }

  if (hero.hasRifle) {
    return {
      type: "rifle",
      name: "M4 Rifle",
      meta: "Automatic rifle",
      damage: `${getRifleDamage()} / shot`,
      ammo: hero.isReloading ? `${hero.ammo}/${hero.maxAmmo} reloading` : `${hero.ammo}/${hero.maxAmmo}`,
      reload: `${hero.reloadDuration.toFixed(1)}s`,
      range: `${getRifleRange()}`,
      fireRate: `${(1 / getRifleFireInterval()).toFixed(1)} shots/s`,
      upgrades: { damage: true, ammo: true, reload: true, range: true, fireRate: true },
    };
  }

  if (hero.hasBow) {
    const bowRange = Math.round(canvas.width * 0.5) + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step;
    const bowFireInterval = Math.max(0.12, 0.45 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.bowStep);
    return {
      type: "bow",
      name: "Bow",
      meta: "Precision ranged weapon",
      damage: `${getBasicBowDamage()} / shot`,
      ammo: "Unlimited",
      reload: "None",
      range: `${bowRange}`,
      fireRate: `${(1 / bowFireInterval).toFixed(1)} shots/s`,
      upgrades: { damage: true, ammo: false, reload: false, range: true, fireRate: true },
    };
  }

  if (hero.hasAxe) {
    const axeSwingDuration = Math.max(0.08, 0.22 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.axeStep);
    const axeRange = 64 + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep;
    return {
      type: "axe",
      name: "Axe",
      meta: "Close-range melee weapon",
      damage: `${18 + player.bonusDamage + player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step} / swing`,
      ammo: "N/A",
      reload: "None",
      range: `${axeRange}`,
      fireRate: `${(1 / axeSwingDuration).toFixed(1)} swings/s`,
      upgrades: { damage: true, ammo: false, reload: false, range: true, fireRate: true },
    };
  }

  const classRange = selected.range && selected.range > 0
    ? selected.range + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step
    : selected.radius
      ? selected.radius + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep
      : 0;
  const classCooldown = getClassWeaponCooldown(selected);
  return {
    type: "class",
    name: selected.name || "Weapon",
    meta: "Class weapon",
    damage: `${getAbilityDamage(selected)}`,
    ammo: "N/A",
    reload: "None",
    range: classRange > 0 ? `${Math.round(classRange)}` : "Melee",
    fireRate: `${(1 / classCooldown).toFixed(1)} uses/s`,
    upgrades: { damage: true, ammo: false, reload: false, range: classRange > 0, fireRate: true },
  };
}

function syncWeaponDerivedStats() {
  hero.maxAmmo = getRifleMaxAmmo();
  hero.reloadDuration = getRifleReloadDuration();
  hero.axeSwingDuration = Math.max(0.08, 0.22 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.axeStep);
  if (hero.hasRifle) {
    hero.ammo = Math.min(hero.ammo, hero.maxAmmo);
  }
}

function setWeaponDetailEffect(element, text, visible) {
  element.textContent = text;
  element.classList.toggle("hidden", !visible);
}

function updateWeaponDetailsUI() {
  weaponDetailsPanelEl.classList.toggle("hidden", !player.weaponDetailsOpen);
  if (!player.weaponDetailsOpen) {
    return;
  }

  const details = getCurrentWeaponDetails();
  if (!details) {
    weaponDetailsNameEl.textContent = "No Weapon";
    weaponDetailsMetaEl.textContent = "Select a character to view weapon stats.";
    weaponDetailsDamageEl.textContent = "-";
    weaponDetailsAmmoEl.textContent = "-";
    weaponDetailsReloadEl.textContent = "-";
    weaponDetailsRangeEl.textContent = "-";
    weaponDetailsFireRateEl.textContent = "-";
    setWeaponDetailEffect(weaponDetailsDamageEffectEl, "", false);
    setWeaponDetailEffect(weaponDetailsAmmoEffectEl, "", false);
    setWeaponDetailEffect(weaponDetailsReloadEffectEl, "", false);
    setWeaponDetailEffect(weaponDetailsRangeEffectEl, "", false);
    setWeaponDetailEffect(weaponDetailsFireRateEffectEl, "", false);
    weaponDetailUpgradeEls.forEach((element) => {
      element.disabled = true;
    });
    return;
  }

  weaponDetailsNameEl.textContent = details.name;
  weaponDetailsMetaEl.textContent = details.meta;
  weaponDetailsDamageEl.textContent = details.damage;
  weaponDetailsAmmoEl.textContent = details.ammo;
  weaponDetailsReloadEl.textContent = details.reload;
  weaponDetailsRangeEl.textContent = details.range;
  weaponDetailsFireRateEl.textContent = details.fireRate;
  setWeaponDetailEffect(
    weaponDetailsDamageEffectEl,
    `+${player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step}`,
    player.weaponDetailDamageLevel > 0 && Boolean(details.upgrades?.damage)
  );
  setWeaponDetailEffect(
    weaponDetailsAmmoEffectEl,
    `+${player.weaponDetailAmmoLevel * getWeaponUpgradeRules().ammo.step}`,
    player.weaponDetailAmmoLevel > 0 && Boolean(details.upgrades?.ammo)
  );
  setWeaponDetailEffect(
    weaponDetailsReloadEffectEl,
    `-${(player.weaponDetailReloadLevel * getWeaponUpgradeRules().reload.step).toFixed(1)}s`,
    player.weaponDetailReloadLevel > 0 && Boolean(details.upgrades?.reload)
  );
  setWeaponDetailEffect(
    weaponDetailsRangeEffectEl,
    `+${player.weaponDetailRangeLevel * (details.type === "axe" || details.type === "class" && details.range === "Melee"
      ? getWeaponUpgradeRules().range.meleeStep
      : getWeaponUpgradeRules().range.step)}`,
    player.weaponDetailRangeLevel > 0 && Boolean(details.upgrades?.range)
  );
  const fireRateEffectStep = details.type === "rifle"
    ? getWeaponUpgradeRules().fireRate.rifleStep
    : details.type === "bow"
      ? getWeaponUpgradeRules().fireRate.bowStep
      : details.type === "axe"
        ? getWeaponUpgradeRules().fireRate.axeStep
        : getWeaponUpgradeRules().fireRate.classStep;
  setWeaponDetailEffect(
    weaponDetailsFireRateEffectEl,
    `-${(player.weaponDetailFireRateLevel * fireRateEffectStep).toFixed(1)}s`,
    player.weaponDetailFireRateLevel > 0 && Boolean(details.upgrades?.fireRate)
  );
  weaponDetailUpgradeEls.forEach((element) => {
    const upgradeId = element.dataset.weaponUpgrade;
    const allowed = Boolean(details.upgrades?.[upgradeId]);
    element.disabled = !allowed || player.upgradePoints <= 0;
  });
}

function openWeaponDetails() {
  if (!player.hasSelectedCharacter) {
    return;
  }
  closeShop();
  closeTrader();
  player.weaponDetailsOpen = true;
  updateWeaponDetailsUI();
}

function closeWeaponDetails() {
  player.weaponDetailsOpen = false;
  updateWeaponDetailsUI();
}

function applyWeaponDetailUpgrade(upgradeId) {
  const details = getCurrentWeaponDetails();
  if (!details || !details.upgrades?.[upgradeId]) {
    return;
  }
  if (player.upgradePoints <= 0) {
    statusTextEl.textContent = "You need an upgrade point.";
    return;
  }

  if (upgradeId === "damage") {
    player.weaponDetailDamageLevel += 1;
  } else if (upgradeId === "ammo") {
    player.weaponDetailAmmoLevel += 1;
  } else if (upgradeId === "reload") {
    player.weaponDetailReloadLevel += 1;
  } else if (upgradeId === "range") {
    player.weaponDetailRangeLevel += 1;
  } else if (upgradeId === "fireRate") {
    player.weaponDetailFireRateLevel += 1;
  } else {
    return;
  }

  player.upgradePoints -= 1;
  syncWeaponDerivedStats();
  updateUpgradeUI();
  updateStatsUI();
  updateWeaponDetailsUI();
  statusTextEl.textContent = `Weapon upgraded: ${upgradeId}.`;
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
  return (selected?.stats?.weapon || 0) +
    player.weaponBonusStat +
    player.bonusDamage +
    player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step;
}

function getBasicBowDamage() {
  return (CHARACTER_OPTIONS.archer?.damage || 0) + player.bonusDamage + player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step;
}

function getAbilityDamage(selected = getSelectedClassConfig()) {
  return (selected?.damage || 0) + player.weaponBonusDamage + player.bonusAbilityDamage + player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step;
}

function getHeroSpeed(selected = getSelectedClassConfig()) {
  return (selected?.agility || hero.speed || 0) + player.bonusSpeed;
}

function getHeroRegen(selected = getSelectedClassConfig()) {
  const baseRegen = selected?.stats?.regen || 0;
  return baseRegen + player.bonusRegen + (hero.battleMedicineBuffTimer > 0 ? SOLDIER_BATTLE_MEDICINE_REGEN_BONUS : 0);
}

function updateUpgradeUI() {
  upgradePointsEl.textContent = `Upgrade Points: ${player.upgradePoints}`;
  upgradePointsEl.classList.toggle("hidden", player.upgradePoints <= 0);
  upgradeActionEls.forEach((element) => {
    element.classList.toggle("hidden", player.upgradePoints <= 0);
  });
  updateWeaponDetailsUI();
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
  const stats = selected?.stats || { armor: 0, health: 0, weapon: 0, regen: 0 };
  const armor = getTotalArmor(selected);
  const damage = getDisplayedWeaponStat(selected);
  const maxHealth = hero.maxHp || stats.health;
  const currentHealth = Math.max(0, Math.round(hero.hp || 0));
  const speed = getHeroSpeed(selected) * getRoadSpeedMultiplier();
  const regen = getHeroRegen(selected);

  const portraitSrc = hero.hp < maxHealth / 2
    ? "./images/soldier-damage.png"
    : "./images/soldier-mugshot.png";
  if (playerPortraitEl.getAttribute("src") !== portraitSrc) {
    playerPortraitEl.src = portraitSrc;
    playerPortraitEl.alt = hero.hp < maxHealth / 2 ? "Injured soldier portrait" : "Soldier portrait";
  }

  armorValueEl.textContent = String(armor);
  healthValueEl.textContent = `${currentHealth}/${Math.round(maxHealth)}`;
  weaponValueEl.textContent = String(damage);
  speedValueEl.textContent = String(speed);
  regenValueEl.textContent = `${regen.toFixed(1)}/s`;
  armorFillEl.style.width = `${armor}%`;
  healthFillEl.style.width = maxHealth > 0 ? `${Math.min(100, Math.max(0, (hero.hp / maxHealth) * 100))}%` : "0%";
  weaponFillEl.style.width = `${Math.min(100, damage * 2)}%`;
  speedFillEl.style.width = `${Math.min(100, (speed / 300) * 100)}%`;
  regenFillEl.style.width = `${Math.min(100, regen * 20)}%`;
  updateEquipmentUI(selected, stats);
  updateWeaponDetailsUI();
}

function buildHelmetIcon(fill, stroke) {
  const detailStroke = stroke === "#000000" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.35)";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M16 31c0-10 7-18 16-18s16 8 16 18v8c0 2-2 4-4 4H20c-2 0-4-2-4-4z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M23 43v6h18v-6" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 29h16" stroke="${detailStroke}" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildBodyArmorIcon(fill, stroke) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M22 14h20l6 8-4 26H20l-4-26 6-8z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M26 14l6 8 6-8" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 30h16" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildWeaponOutlineIcon(stroke) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M20 45l8-8 3 3-8 8h-7v-7l8-8 3 3" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M31 34l14-14 4 4-14 14" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M47 18l3-3 1 1-3 3" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 41l-5 5" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
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
    equipmentWeaponIconEl.src = buildWeaponOutlineIcon("#000000");
    equipmentWeaponNameEl.textContent = "";
    equipmentWeaponMetaEl.textContent = "";
  }

  equipmentWeaponIconEl.style.opacity = equippedWeaponType ? "1" : "0.35";

  const equippedHelmetType = hero.latestPickup?.type === "helmet" ||
    hero.latestPickup?.type === "rareHelmet" ||
    hero.latestPickup?.type === "goldHelmet" ||
    hero.latestPickup?.type === "enemyHelmet"
    ? hero.latestPickup.type
    : hero.equippedHelmetType || (player.helmetBonusArmor > 0 ? "helmet" : null);

  const helmetArmorValue = getHelmetArmorValue();

  if (equippedHelmetType === "rareHelmet") {
    equipmentHelmetIconEl.src = buildHelmetIcon("#4ea0ff", "#d2efff");
    equipmentHelmetNameEl.textContent = "Rare Helmet";
    equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
  } else if (equippedHelmetType === "goldHelmet") {
    equipmentHelmetIconEl.src = buildHelmetIcon("#d3a63a", "#fff0b3");
    equipmentHelmetNameEl.textContent = "Gold Helmet";
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
    equipmentHelmetIconEl.src = buildHelmetIcon("rgba(0,0,0,0)", "#000000");
    equipmentHelmetNameEl.textContent = "None";
    equipmentHelmetMetaEl.textContent = "No helmet equipped";
  }

  equipmentHelmetIconEl.style.opacity = equippedHelmetType ? "1" : "0.35";

  if (selected && stats.armor > 0) {
    equipmentBodyArmorIconEl.src = buildBodyArmorIcon("#87a8bf", "#eef6ff");
    equipmentBodyArmorNameEl.textContent = "Standard Armor";
    equipmentBodyArmorMetaEl.textContent = `Base armor ${stats.armor + player.bonusArmor}`;
    equipmentBodyArmorIconEl.style.opacity = "1";
  } else {
    equipmentBodyArmorIconEl.src = buildBodyArmorIcon("rgba(0,0,0,0)", "#111111");
    equipmentBodyArmorNameEl.textContent = "";
    equipmentBodyArmorMetaEl.textContent = "";
    equipmentBodyArmorIconEl.style.opacity = "0.9";
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
  } else if (upgradeId === "speed") {
    player.bonusSpeed += 5;
    hero.speed += 5;
    statusTextEl.textContent = "Upgrade applied: +5 speed.";
  } else if (upgradeId === "regen") {
    player.bonusRegen += 0.5;
    statusTextEl.textContent = "Upgrade applied: +0.5 health regen.";
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

function isHeroOnTutorialTile() {
  return (
    hero.x >= TUTORIAL_TILE.x &&
    hero.x <= TUTORIAL_TILE.x + TUTORIAL_TILE.size &&
    hero.y >= TUTORIAL_TILE.y &&
    hero.y <= TUTORIAL_TILE.y + TUTORIAL_TILE.size
  );
}

function isHeroOnTutorialReturnTile() {
  return (
    hero.x >= TUTORIAL_WORLD.returnTileX &&
    hero.x <= TUTORIAL_WORLD.returnTileX + TUTORIAL_WORLD.returnTileSize &&
    hero.y >= TUTORIAL_WORLD.returnTileY &&
    hero.y <= TUTORIAL_WORLD.returnTileY + TUTORIAL_WORLD.returnTileSize
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

function prepareWorldTravel() {
  player.isPlacingBuilding = false;
  player.selectedUnits = [];
  player.selectedBuildingId = null;
  selectionBox = null;
  mouse.leftDown = false;
  cancelGrenadeAim();
  cancelHarvest();
  closeTutorialDialogue();
  closeQuestDialogue();
  closeShop();
  closeTrader();
  closeWeaponDetails();
  hero.targetPos = null;
  hero.lastMoveAngle = null;
  hero.abilityEffect = null;
  hero.rifleShotAnimationTimer = 0;
}

function activateVillageWorld() {
  prepareWorldTravel();
  clearWorldEntities();
  player.inVillageWorld = true;
  player.inTutorialWorld = false;
  player.inDodgeArena = false;
  playerBase = null;
  enemyBase = null;
  enemyHero = createEnemyHero(-1000, -1000);
  enemyHero.active = false;
  enemyHero.hp = 0;
  ensureContractAvailability();
  initializeVillage(1150);
  villagePaths.push(
    { x: 310, y: 1300, w: 100, h: 240 },
    { x: 310, y: 1558, w: 240, h: 116 }
  );
  const { x: offsetX, y: offsetY } = VILLAGE_WORLD.offset;
  for (const entity of [...buildings, ...trees, ...villagePaths, ...villageFields, ...villageProps]) {
    entity.x += offsetX;
    entity.y += offsetY;
  }
  for (const fence of villageFences) {
    fence.x1 += offsetX;
    fence.x2 += offsetX;
    fence.y1 += offsetY;
    fence.y2 += offsetY;
  }
  const range = VILLAGE_WORLD.range;
  const villageRoadX = 310 + offsetX;
  const villageRoadY = 1558 + offsetY;
  const rangeApproachY = range.y - 90;
  villagePaths.push(
    { x: villageRoadX, y: villageRoadY, w: 100, h: rangeApproachY + 64 - villageRoadY },
    { x: villageRoadX, y: rangeApproachY, w: range.x + 120 - villageRoadX, h: 64 },
    { x: range.x + 20, y: rangeApproachY, w: 100, h: 260 },
    { x: range.x + 120, y: range.y + 90, w: 430, h: 100 }
  );
  trader.x = MAIN_WORLD_TRADER_POSITION.x + offsetX;
  trader.y = MAIN_WORLD_TRADER_POSITION.y + offsetY;
  createTutorialNpc("mercenary", 530 + offsetX, 1290 + offsetY);
  initializeShootingRange();
  restoreMercenaryTrainingTask();
  hero.x = VILLAGE_WORLD.spawnX;
  hero.y = VILLAGE_WORLD.spawnY;
  hero.hp = hero.maxHp;
  updateCamera(1);
  overlayMessageEl.classList.add("hidden");
  statusTextEl.textContent = "Village. Press Space to talk to the Mercenary. The Shooting Instructor is at the range on the far right of the map.";
  updateQuestUI();
  updateInventoryUI();
  updateStatsUI();
  updateAbilityUI();
  updateTrainButton();
  updateBuildBarracksButton();
}

function getVillagePortals() {
  if (player.inVillageWorld) return VILLAGE_WORLD.portals;
  return [player.inTutorialWorld ? VILLAGE_RETURN_TILES.training : VILLAGE_RETURN_TILES.main];
}

function updateVillagePortals() {
  const portal = getVillagePortals().find((tile) =>
    hero.x >= tile.x && hero.x <= tile.x + tile.size &&
    hero.y >= tile.y && hero.y <= tile.y + tile.size
  );
  if (!portal) return false;
  if (portal.destination === "main") travelToMainWorld();
  else if (portal.destination === "training") activateTutorialWorld();
  else activateVillageWorld();
  return true;
}

function drawVillagePortals() {
  for (const portal of getVillagePortals()) {
    ctx.fillStyle = portal.destination === "training" ? "#5c4e91" : "#326f86";
    ctx.fillRect(portal.x, portal.y, portal.size, portal.size);
    ctx.strokeStyle = "#c1edff";
    ctx.lineWidth = 3;
    ctx.strokeRect(portal.x, portal.y, portal.size, portal.size);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 14px Chakra Petch";
    ctx.textAlign = "center";
    portal.label.forEach((line, index) => {
      ctx.fillText(line, portal.x + portal.size / 2, portal.y + portal.size / 2 + 5 + (index - (portal.label.length - 1) / 2) * 20);
    });
    ctx.font = "600 12px Chakra Petch";
    ctx.fillText("Walk here to travel", portal.x + portal.size / 2, portal.y - 10);
  }
}

function activateTutorialWorld() {
  if (player.inTutorialWorld) {
    return;
  }

  prepareWorldTravel();
  player.inVillageWorld = false;
  player.inTutorialWorld = true;
  Object.assign(trader, MAIN_WORLD_TRADER_POSITION);
  player.inDodgeArena = false;
  clearWorldEntities();

  trees.push({
    id: nextId(),
    x: TUTORIAL_WORLD.treeX,
    y: TUTORIAL_WORLD.treeY,
    radius: 28,
    wood: 25,
  });
  stones.push({
    id: nextId(),
    x: TUTORIAL_WORLD.rockX,
    y: TUTORIAL_WORLD.rockY,
    radius: 19,
  });

  enemyHero.active = false;
  enemyHero.hp = 0;
  enemyHero.x = -1000;
  enemyHero.y = -1000;

  hero.x = TUTORIAL_WORLD.spawnX;
  hero.y = TUTORIAL_WORLD.spawnY;
  hero.hp = hero.maxHp;
  hero.targetPos = null;
  hero.lastMoveAngle = null;
  hero.abilityEffect = null;
  populateTutorialWorld();

  overlayMessageEl.classList.add("hidden");
  updateCamera(1);
  statusTextEl.textContent = "Entered the training world.";
  updateQuestUI();
  updateInventoryUI();
  updateStatsUI();
  updateAbilityUI();
  updateTrainButton();
  updateBuildBarracksButton();
}

function travelToMainWorld() {
  prepareWorldTravel();
  initializeMainWorld();
  hero.x = PLAYER_BASE_SPAWN.x;
  hero.y = PLAYER_BASE_SPAWN.y;
  hero.hp = hero.maxHp;
  hero.targetPos = null;
  hero.lastMoveAngle = null;
  hero.abilityEffect = null;
  overlayMessageEl.classList.add("hidden");
  updateCamera(1);
  statusTextEl.textContent = "Entered the main world.";
  updateQuestUI();
  updateInventoryUI();
  updateStatsUI();
  updateAbilityUI();
  updateTrainButton();
  updateBuildBarracksButton();
}

function getNearbyTutorialPlot() {
  return tutorialPlots.find((plot) =>
    plot.active &&
    hero.x >= plot.x - 18 &&
    hero.x <= plot.x + plot.w + 18 &&
    hero.y >= plot.y - 18 &&
    hero.y <= plot.y + plot.h + 18
  ) || null;
}

function getNearbyTutorialSite() {
  return tutorialSites.find((site) => site.active && !site.collected && distance(hero, site) <= hero.radius + site.radius + 18) || null;
}

function handleTutorialInteraction() {
  const plot = getNearbyTutorialPlot();
  if (plot) {
    const farmerState = getTutorialProfessionState("farmer");
    if (plot.state === "empty" && player.tutorialResources.seeds > 0) {
      player.tutorialResources.seeds -= 1;
      plot.state = "growing";
      plot.timer = 4;
      statusTextEl.textContent = "Seeds planted. Wait for the crop to grow.";
      updateInventoryUI();
      return true;
    }
    if (plot.state === "ready") {
      plot.state = "harvested";
      player.tutorialResources.wheat += 1;
      if (farmerState.activeTask?.status === "active") {
        completeTutorialProfessionTask("farmer");
      }
      statusTextEl.textContent = "Crop harvested. Return to the Farmer.";
      updateInventoryUI();
      return true;
    }
  }

  const site = getNearbyTutorialSite();
  if (site?.kind === "pickup") {
    player.tutorialResources[site.resourceKey] += 1;
    site.collected = true;
    const professionId = site.professionId;
    if (getTutorialProfessionState(professionId).activeTask?.status === "active") {
      completeTutorialProfessionTask(professionId);
    }
    statusTextEl.textContent = `${site.label} collected.`;
    updateInventoryUI();
    return true;
  }

  return false;
}

function moveTutorialNpcToward(npc, x, y, dt) {
  const dx = x - npc.x;
  const dy = y - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 2) {
    npc.x = x;
    npc.y = y;
    return true;
  }
  const step = Math.min(dist, npc.speed * dt);
  npc.x += (dx / dist) * step;
  npc.y += (dy / dist) * step;
  return false;
}

function completeShootingRangeTutorial() {
  if (shootingRangeTutorial.completed) {
    return;
  }

  shootingRangeTutorial.completed = true;
  shootingRangeTutorial.state = "completed";
  awardPlayerXp(SHOOTING_RANGE_TUTORIAL_XP);
  const instructor = getShootingInstructor();
  if (instructor) {
    openTutorialNpcMenu(instructor, "Good shooting. Both targets are down.");
  }
  statusTextEl.textContent = getCharacterStatus();
  updateQuestUI();
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
  updateQuestUI();
  if (shootingRangeTutorial.hits >= tutorialRangeTargets.length) {
    completeShootingRangeTutorial();
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
  if (shootingRangeTutorial.state === "shootTargets" || shootingRangeTutorial.state === "completed") {
    registerTutorialTargetHit(target);
  }
  spawnTextPopup(
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
      spawnTextPopup(
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
    spawnDamagePopup(target, damage);
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

function updateTutorialWorldSystems(dt) {
  for (const plot of tutorialPlots) {
    if (!plot.active || plot.state !== "growing") {
      continue;
    }
    plot.timer = Math.max(0, plot.timer - dt);
    if (plot.timer === 0) {
      plot.state = "ready";
    }
  }

  const waypoint = tutorialSites.find((site) => site.id === "explorerWaypoint");
  if (
    waypoint?.active &&
    !waypoint.discovered &&
    distance(hero, waypoint) <= hero.radius + waypoint.radius + 22
  ) {
    waypoint.discovered = true;
    completeTutorialProfessionTask("explorer");
    statusTextEl.textContent = "Landmark discovered. Return to the Explorer.";
  }

  const instructor = getShootingInstructor();
  if (instructor && shootingRangeTutorial.state === "leading") {
    const heroDistance = distance(hero, instructor);
    if (heroDistance <= 220) {
      const arrived = moveTutorialNpcToward(instructor, instructor.targetX, instructor.targetY, dt);
      if (arrived) {
        shootingRangeTutorial.state = "shootTargets";
        spawnTextPopup(instructor.x, instructor.y - 30, "Hit both targets.", "rgba(255, 226, 148, 1)", 1.2);
        openTutorialNpcMenu(instructor, "Stand behind the thick brown firing line and shoot both targets. I will wait at this end.");
        statusTextEl.textContent = "Instructor: Hold here and shoot both targets.";
        updateQuestUI();
      }
    }
  }
}

function spawnDodgeArenaBullet() {
  const headshotConfig = buildProjectileHeadshotConfig("arenaBullet");
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
      applyRangedProjectileHit(hero, bullet);
      dodgeArenaBullets.splice(index, 1);
      continue;
    }
    if (bullet.y > DODGE_ARENA.y + DODGE_ARENA.h + 24) {
      awardPlayerXp(DODGE_ARENA_DODGE_XP, bullet.x, bullet.y);
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
  hero.grenadeCooldownRemaining = 0;
  hero.battleMedicineCooldownRemaining = 0;
  hero.battleMedicineBuffTimer = 0;
  hero.battleMedicineUseTimer = 0;
  hero.weaponPickupCooldown = 0;
  hero.hasRifle = hero.selectedClass === "soldier";
  hero.rifleFireMode = "automatic";
  hero.rifleCooldown = 0;
  hero.rifleShotAnimationTimer = 0;
  syncWeaponDerivedStats();
  hero.ammo = hero.hasRifle ? hero.maxAmmo : 0;
  hero.isReloading = false;
  hero.reloadTimer = 0;
  hero.isDead = false;
  hero.deathTimer = 0;
  hero.dashTimer = 0;
  hero.regenProgress = 0;
  hero.dashCooldown = selectedClass?.dashCooldown || 0;
  hero.dashCooldownRemaining = 0;
  cancelGrenadeAim();
  heroProjectiles.length = 0;
  heroGrenades.length = 0;
  grenadeShockwaves.length = 0;
  hero.maxHp = (selectedClass?.stats?.health || 150) + player.bonusHealth;
  hero.hp = hero.maxHp;
  hero.x = player.inVillageWorld ? VILLAGE_WORLD.spawnX : player.inTutorialWorld ? TUTORIAL_WORLD.spawnX : PLAYER_BASE_SPAWN.x;
  hero.y = player.inVillageWorld ? VILLAGE_WORLD.spawnY : player.inTutorialWorld ? TUTORIAL_WORLD.spawnY : PLAYER_BASE_SPAWN.y;
  hero.targetPos = null;
  cancelHarvest();
  closeShop();
  closeTrader();
  closeWeaponDetails();
  updateStatsUI();
  statusTextEl.textContent = player.inVillageWorld ? "You respawned in the village." : player.inTutorialWorld ? "You respawned in the tutorial world." : "You respawned at base.";
  spawnTextPopup(hero.x, hero.y - 30, "Respawned!", "rgba(196, 234, 255, 1)", 1.4);
}

function openShop() {
  if (!isHeroNearShop()) {
    statusTextEl.textContent = "Move closer to the Shop first.";
    return;
  }
  player.shopOpen = true;
  player.weaponDetailsOpen = false;
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
  player.weaponDetailsOpen = false;
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

  if (target === enemyHero && target.equippedArmorValue > 0) {
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
    headshotMultiplier: config.headshotMultiplier ?? 2,
  };
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
    const extraDamage = baseDamage * Math.max(0, headshotMultiplier - 1);
    finalDamage = baseDamage + (extraDamage * (1 - helmetProtection));
  }

  finalDamage = Math.max(1, Math.round(finalDamage));
  dealDamage(target, finalDamage, true);

  if (isHeadshot) {
    const popupPoint = getDamagePopupPoint(target);
    spawnTextPopup(popupPoint.x, popupPoint.y - 22, "HEADSHOT", "rgba(255, 132, 132, 1)", 0.8);
  }
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

function damageEnemiesInRadiusFromPoint(centerX, centerY, damage, radius) {
  const center = { x: centerX, y: centerY };
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const dist = distance(center, enemies[i]);
    if (dist <= radius) {
      const scaledDamage = Math.max(8, Math.round(damage * (1 - dist / radius * 0.6)));
      dealDamage(enemies[i], scaledDamage, true);
    }
  }
  if (enemyHero.active) {
    const dist = distance(center, enemyHero);
    if (dist <= radius) {
      const scaledDamage = Math.max(8, Math.round(damage * (1 - dist / radius * 0.6)));
      dealDamage(enemyHero, scaledDamage, true);
    }
  }
  for (const building of buildings) {
    if (!building.isPlayer) {
      const dist = distance(center, getEntityTargetPoint(building));
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
      if (harvestTreeId === tree.id) {
        cancelHarvest();
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
      destroyTutorialRangeTarget(target, "grenade");
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
  const particles = [];
  const particleCount = 34;
  for (let index = 0; index < particleCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distanceScale = 0.45 + Math.random() * 0.75;
    particles.push({
      angle,
      targetRadius: SOLDIER_GRENADE_RADIUS * distanceScale,
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
    radius: SOLDIER_GRENADE_RADIUS,
    ttl: 0.22,
    maxTtl: 0.22,
    particles,
  });
  damageEnemiesInRadiusFromPoint(grenade.targetX, grenade.targetY, SOLDIER_GRENADE_DAMAGE + player.weaponBonusDamage, SOLDIER_GRENADE_RADIUS);
  destroyEnvironmentInRadius(grenade.targetX, grenade.targetY, SOLDIER_GRENADE_RADIUS);
  spawnTextPopup(grenade.targetX, grenade.targetY - 18, "BOOM", "rgba(255, 210, 138, 1)", 0.5);
}

function useSoldierGrenade(targetX, targetY) {
  if (
    !player.hasSelectedCharacter ||
    player.victory ||
    player.loss ||
    hero.selectedClass !== "soldier" ||
    hero.grenadeCooldownRemaining > 0
  ) {
    return false;
  }

  const target = getClampedGrenadeTarget(targetX, targetY);
  if (target.distance < 24) {
    return false;
  }

  hero.facingAngle = Math.atan2(target.y - hero.y, target.x - hero.x);
  hero.grenadeCooldownRemaining = SOLDIER_GRENADE_COOLDOWN;
  const travelTime = clamp(0.22 + target.distance / 700, 0.22, 0.65);
  heroGrenades.push({
    x: hero.x,
    y: hero.y,
    startX: hero.x,
    startY: hero.y,
    targetX: target.x,
    targetY: target.y,
    radius: 8,
    ttl: travelTime,
    maxTtl: travelTime,
    arcHeight: Math.max(26, Math.min(70, target.distance * 0.12)),
  });
  cancelGrenadeAim();
  statusTextEl.textContent = "Grenade out.";
  updateAbilityUI();
  return true;
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
    stopOnHit: true,
    style: config.style || "arrow",
    projectileType,
    canHeadshot: config.canHeadshot ?? true,
    headshotChance: config.headshotChance ?? headshotConfig.headshotChance,
    headshotMultiplier: config.headshotMultiplier ?? headshotConfig.headshotMultiplier,
  };
}

function buildArcherArrowProjectile(damageOverride = null) {
  const archerClass = CHARACTER_OPTIONS.archer || {};
  return spawnAbilityProjectile({
    damage: damageOverride ?? getAbilityDamage(archerClass),
    width: archerClass.width || 10,
    range: Math.round(canvas.width * 0.5) + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step,
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
    entity.y = clamp(entity.y + (dy / distanceToRect) * overlap, radius, getWorldHeight() - radius);
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
    entity.y = clamp(entity.y, radius, getWorldHeight() - radius);
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
      hero.y = clamp(hero.y + (dy / distanceToObstacle) * overlap, hero.radius, getWorldHeight() - hero.radius);
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
      hero.y = clamp(hero.y + (dy / dist) * overlap, hero.radius, getWorldHeight() - hero.radius);
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

  if (tryHitTutorialRangeTarget(projectile)) {
    return;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (!projectile.hitIds.has(enemies[i].id) && distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
      applyRangedProjectileHit(enemies[i], projectile);
      projectile.hitIds.add(enemies[i].id);
    }
  }

  if (!projectile.hitIds.has(enemyHero.id) && distance(projectile, enemyHero) <= projectile.radius + enemyHero.radius) {
    applyRangedProjectileHit(enemyHero, projectile);
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

  if (tryHitTutorialRangeTarget(projectile)) {
    return;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (distance(projectile, enemies[i]) <= projectile.radius + enemies[i].radius) {
      applyRangedProjectileHit(enemies[i], projectile);
      projectile.active = false;
      return;
    }
  }

  if (distance(projectile, enemyHero) <= projectile.radius + enemyHero.radius) {
    applyRangedProjectileHit(enemyHero, projectile);
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

function fireEnemyProjectile(attacker, target) {
  const targetPoint = getEntityTargetPoint(target);
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
      if (intersectsTree(projectile, projectile.radius, tree)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      for (const stone of stones) {
        if (intersectsStone(projectile, projectile.radius, stone)) {
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
      dealDamage(hero, projectile.damage, true);
      enemyProjectiles.splice(index, 1);
      continue;
    }

    let hitUnit = false;
    for (const unit of units) {
      if (distance(projectile, unit) <= projectile.radius + unit.radius) {
        dealDamage(unit, projectile.damage, true);
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
  for (const camp of FOREST_CAMPS) {
    if (!camp.hidden || hasDiscoveredCamp(camp.id)) {
      continue;
    }
    if (distance(hero, camp.center) <= camp.discoveryRadius) {
      markCampDiscovered(camp.id);
      statusTextEl.textContent = "Hidden Goblin Camp discovered.";
      break;
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
    type === "goldHelmet" ||
    type === "enemyHelmet" ||
    type === "axe" ||
    type === "rifle" ||
    type === "bow" ||
    type === "tutorialScroll";
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
  if (pickup.type === "tutorialScroll") {
    player.tutorialPathsUnlocked = true;
    statusTextEl.textContent = "Quest started: Tutorial Paths.";
    spawnTextPopup(pickup.x, pickup.y - 24, "Quest: Tutorial Paths", "rgba(255, 236, 184, 1)", 1.2);
    updateQuestUI();
    return;
  }

  if (pickup.type === "helmet" || pickup.type === "rareHelmet" || pickup.type === "goldHelmet" || pickup.type === "enemyHelmet") {
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
    } else if (pickup.type === "goldHelmet") {
      spawnTextPopup(pickup.x, pickup.y - 22, "Gold Helmet equipped!", "rgba(255, 226, 148, 1)", 1.8);
      spawnTextPopup(pickup.x, pickup.y + 4, `Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(255, 244, 196, 1)", 1.8);
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
    syncWeaponDerivedStats();
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
    hero.rifleFireMode = "automatic";
    hero.weaponPickupCooldown = 0.8;
    syncWeaponDerivedStats();
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
    syncWeaponDerivedStats();
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
  if (preview.x < 40 || preview.y < 40 || preview.x + preview.w > WORLD.width - 40 || preview.y + preview.h > getWorldHeight() - 40) {
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
  hero.slashCooldown = (!hero.hasRifle && !hero.hasBow && !hero.hasAxe)
    ? getClassWeaponCooldown(selectedClass)
    : selectedClass.cooldown;
  hero.slashTimer = hero.slashCooldown;
  hero.slashArcTimer = selectedClass.effect === "burst" ? 0.42 : 0.22;
  hero.abilityEffect = { ...selectedClass, aimAngle: hero.facingAngle };

  if (selectedClass.effect === "cone") {
    hero.slashRadius = selectedClass.radius + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep;
    hero.slashHalfAngle = selectedClass.halfAngle;
    damageEnemiesInCone(getAbilityDamage(selectedClass), hero.slashRadius, selectedClass.halfAngle);
  } else if (selectedClass.effect === "line") {
    damageEnemiesInLine(
      getAbilityDamage(selectedClass),
      selectedClass.range + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step,
      selectedClass.width
    );
  } else if (selectedClass.effect === "burst") {
    const burstBaseAngle = hero.abilityEffect.aimAngle;
    const shots = buildBurstShots(
      selectedClass.range + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step,
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
    damageEnemiesInRadius(
      getAbilityDamage(selectedClass),
      selectedClass.radius + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep
    );
  }

  updateAbilityUI();
  return true;
}

function useAxeSwing() {
  if (!player.hasSelectedCharacter || player.victory || player.loss || !hero.hasAxe) {
    return;
  }

  hero.axeSwingTimer = hero.axeSwingDuration;
  damageEnemiesInCone(
    18 + player.bonusDamage + player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step,
    64 + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep,
    Math.PI / 3
  );
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
  if (!hero.hasRifle || hero.isReloading || isUsingBattleMedicine()) {
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
  if (!hero.hasRifle || hero.isReloading || hero.rifleCooldown > 0 || hero.ammo <= 0 || hero.shootLockTimer > 0 || isUsingBattleMedicine()) {
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
    ...spawnBurstProjectile({ angleOffset: 0, range: getRifleRange() }, getRifleDamage(), 18),
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
  hero.bowCooldown = Math.max(0.12, 0.45 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.bowStep);
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

function getWorldHeight() {
  return player.inVillageWorld ? VILLAGE_WORLD.height : WORLD.height;
}

function isHeroOnRoad() {
  if (player.inTutorialWorld || player.inDodgeArena) return false;
  if (villagePaths.some((path) =>
    hero.x >= path.x && hero.x <= path.x + path.w &&
    hero.y >= path.y && hero.y <= path.y + path.h
  )) return true;
  return !player.inVillageWorld && hero.y >= MAIN_LANE_Y - 90 && hero.y <= MAIN_LANE_Y + 90;
}

function getRoadSpeedMultiplier() {
  return isHeroOnRoad() ? ROAD_SPEED_MULTIPLIER : 1;
}

function updateCamera(dt) {
  camera.x = clamp(hero.x - canvas.width / 2, 0, Math.max(0, WORLD.width - canvas.width));
  camera.y = clamp(hero.y - canvas.height / 2, 0, Math.max(0, getWorldHeight() - canvas.height));
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
  hero.grenadeCooldownRemaining = Math.max(0, hero.grenadeCooldownRemaining - dt);
  hero.battleMedicineCooldownRemaining = Math.max(0, hero.battleMedicineCooldownRemaining - dt);
  hero.battleMedicineBuffTimer = Math.max(0, hero.battleMedicineBuffTimer - dt);
  hero.battleMedicineUseTimer = Math.max(0, hero.battleMedicineUseTimer - dt);
  hero.shootLockTimer = Math.max(0, hero.shootLockTimer - dt);
  hero.weaponPickupCooldown = Math.max(0, hero.weaponPickupCooldown - dt);
  hero.rifleCooldown = Math.max(0, hero.rifleCooldown - dt);
  hero.rifleShotAnimationTimer = Math.max(0, hero.rifleShotAnimationTimer - dt);
  hero.dashTimer = Math.max(0, hero.dashTimer - dt);
  hero.dashCooldownRemaining = Math.max(0, hero.dashCooldownRemaining - dt);
  if (hero.isReloading) {
    hero.reloadTimer = Math.max(0, hero.reloadTimer - dt);
    if (hero.reloadTimer === 0) {
      hero.isReloading = false;
      hero.ammo = hero.maxAmmo;
    }
  }
  const regenRate = getHeroRegen();
  if (regenRate > 0 && hero.hp > 0 && hero.hp < hero.maxHp) {
    hero.regenProgress += regenRate * dt;
    const missingHp = hero.maxHp - hero.hp;
    const wholeHpRestored = Math.min(Math.floor(hero.regenProgress), Math.floor(missingHp));
    if (wholeHpRestored > 0) {
      hero.hp = Math.min(hero.maxHp, hero.hp + wholeHpRestored);
      hero.regenProgress -= wholeHpRestored;
      spawnTextPopup(hero.x, hero.y - hero.radius - 18, `+${wholeHpRestored} HP`, "rgba(156, 245, 164, 1)", 0.9);
    }
  } else if (hero.hp >= hero.maxHp) {
    hero.regenProgress = 0;
  }
  if (isSoldierRifleShooting()) {
    hero.facingAngle = Math.atan2(mouse.worldY - hero.y, mouse.worldX - hero.x);
  }
  hero.isMoving = false;
  if (isDialogueOpen()) {
    updateInventoryUI();
    statusTextEl.textContent = getCharacterStatus();
    updateAbilityUI();
    return;
  }
  if (mouse.leftDown && !player.isPlacingBuilding && !isInterfacePanelOpen() && !isUsingBattleMedicine()) {
    if (hero.hasRifle) {
      if (hero.rifleFireMode === "automatic") {
        spawnHeroBullet(mouse.worldX, mouse.worldY);
      }
    } else if (hero.hasBow) {
      spawnHeroBowShot(mouse.worldX, mouse.worldY);
    }
  }
  updateGrenades(dt);
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

  if (isInterfacePanelOpen()) {
    updateInventoryUI();
    updateStatsUI();
    updateAbilityUI();
    return;
  }

  const dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  const dy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
  const movementSpeedMultiplier = getRoadSpeedMultiplier() * (isSoldierRifleShooting() ? 0.5 : 1);

  if (isUsingBattleMedicine()) {
    hero.isMoving = false;
  } else if (hero.dashTimer > 0) {
    hero.x = clamp(hero.x + Math.cos(hero.lastMoveAngle) * hero.dashSpeed * dt, hero.radius, WORLD.width - hero.radius);
    hero.y = clamp(hero.y + Math.sin(hero.lastMoveAngle) * hero.dashSpeed * dt, hero.radius, getWorldHeight() - hero.radius);
    resolveHeroObstacleCollisions();
    hero.isMoving = true;
  } else if (dx || dy) {
    const mag = Math.hypot(dx, dy);
    hero.lastMoveAngle = Math.atan2(dy / mag, dx / mag);
    if (!isSoldierRifleShooting()) {
      hero.facingAngle = hero.lastMoveAngle;
    }
    hero.x = clamp(hero.x + (dx / mag) * hero.speed * movementSpeedMultiplier * dt, hero.radius, WORLD.width - hero.radius);
    hero.y = clamp(hero.y + (dy / mag) * hero.speed * movementSpeedMultiplier * dt, hero.radius, getWorldHeight() - hero.radius);
    resolveHeroObstacleCollisions();
    hero.isMoving = true;
    if (hero.isHarvesting) {
      cancelHarvest();
    }
  }

  if (hero.isMoving) {
    hero.runAnimationTimer += dt;
  } else {
    hero.runAnimationTimer = 0;
  }

  if (updateVillagePortals()) {
    return;
  }
  const inMainWorld = !player.inTutorialWorld && !player.inVillageWorld;
  if (inMainWorld && !SPAWN_WAVE_TILE.triggered && isHeroOnSpawnWaveTile()) {
    spawnSkeletonWave();
  }

  if (inMainWorld && isHeroOnSpawnStreamTile()) {
    SPAWN_STREAM_TILE.timer += dt;
    while (SPAWN_STREAM_TILE.timer >= SPAWN_STREAM_TILE.interval) {
      spawnSingleSkeleton();
      SPAWN_STREAM_TILE.timer -= SPAWN_STREAM_TILE.interval;
    }
  } else {
    SPAWN_STREAM_TILE.timer = 0;
  }

  if (inMainWorld && !player.inDodgeArena && isHeroOnDodgeArenaTile()) {
    enterDodgeArena();
  }

  if (inMainWorld && isHeroOnTutorialTile()) {
    activateTutorialWorld();
    return;
  }

  if (player.inTutorialWorld && isHeroOnTutorialReturnTile()) {
    travelToMainWorld();
    return;
  }

  if (player.inTutorialWorld || player.inVillageWorld) {
    updateTutorialWorldSystems(dt);
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

  updateInventoryUI();
  statusTextEl.textContent = getCharacterStatus();
  updateStatsUI();
  updateAbilityUI();
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

function getForestEnemyTarget(unit) {
  if (!unit.spawnerId) {
    return null;
  }

  const aggroRange = unit.aggroRange || 220;
  if (distance(unit, hero) > aggroRange) {
    unit.targetUnitId = null;
    unit.targetBuildingId = null;
    return null;
  }

  return hero;
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
      target = !unit.isPlayer && unit.spawnerId
        ? getForestEnemyTarget(unit)
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
          fireEnemyProjectile(unit, target);
        } else {
          dealDamage(target, unit.damage, unit.isPlayer);
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
  unit.y = clamp(unit.y + (dy / dist) * unit.speed * dt, unit.radius, getWorldHeight() - unit.radius);
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
      queueEnemyRespawn(enemies[i]);
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

    if (enemy.tutorialProfessionId === "mercenary") {
      completeTutorialProfessionTask("mercenary");
    }

    registerContractKill(enemy);
    queueEnemyRespawn(enemy);
    awardPlayerXp(enemy.xpReward || 0, enemy.x, enemy.y);
    if (enemy.campId === "hiddenCamp" && Math.random() < 0.28) {
      const lootOptions = [
        { type: "enemyHelmet", armorValue: 80, radius: 18 },
        { type: "weaponBuff", damageValue: 2, radius: 18 },
        { type: "healthBuff", healthValue: 20, radius: 18 },
      ];
      spawnPickupDrop(lootOptions[Math.floor(Math.random() * lootOptions.length)], enemy.x + 10, enemy.y);
    }
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
  if (!player.inTutorialWorld && !player.inVillageWorld) {
    updateDodgeArena(dt);
  }
  updateHeroProjectiles(dt);
  updateEnemyProjectiles(dt);
  updateUnits(dt, units, enemies, buildings.filter((b) => !b.isPlayer));
  updateUnits(dt, enemies, [hero, ...units], buildings.filter((b) => b.isPlayer));
  if (!player.inTutorialWorld && !player.inVillageWorld) {
    updateForestSystems(dt);
    cleanupDeathZoneEntities();
  }
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
  ctx.fillRect(0, 0, WORLD.width, getWorldHeight());

  if (player.inVillageWorld) {
    drawVillageGround();
    return;
  }

  if (player.inTutorialWorld) {
    ctx.fillStyle = COLORS.tutorialTile;
    ctx.fillRect(TUTORIAL_WORLD.returnTileX, TUTORIAL_WORLD.returnTileY, TUTORIAL_WORLD.returnTileSize, TUTORIAL_WORLD.returnTileSize);
    ctx.strokeStyle = "rgba(255, 234, 193, 0.6)";
    ctx.lineWidth = 3;
    ctx.strokeRect(TUTORIAL_WORLD.returnTileX, TUTORIAL_WORLD.returnTileY, TUTORIAL_WORLD.returnTileSize, TUTORIAL_WORLD.returnTileSize);
    ctx.fillStyle = "#fff4da";
    ctx.font = "700 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("MAIN", TUTORIAL_WORLD.returnTileX + TUTORIAL_WORLD.returnTileSize / 2, TUTORIAL_WORLD.returnTileY + 38);
    ctx.fillText("WORLD", TUTORIAL_WORLD.returnTileX + TUTORIAL_WORLD.returnTileSize / 2, TUTORIAL_WORLD.returnTileY + 60);
    return;
  }

  ctx.fillStyle = COLORS.path;
  ctx.fillRect(0, MAIN_LANE_Y - 90, WORLD.width, 180);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let x = 0; x < WORLD.width; x += 120) {
    ctx.fillRect(x, 0, 2, getWorldHeight());
  }
  for (let y = 0; y < getWorldHeight(); y += 120) {
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

  ctx.fillStyle = COLORS.tutorialTile;
  ctx.fillRect(TUTORIAL_TILE.x, TUTORIAL_TILE.y, TUTORIAL_TILE.size, TUTORIAL_TILE.size);
  ctx.strokeStyle = "rgba(255, 234, 193, 0.6)";
  ctx.lineWidth = 3;
  ctx.strokeRect(TUTORIAL_TILE.x, TUTORIAL_TILE.y, TUTORIAL_TILE.size, TUTORIAL_TILE.size);
  ctx.fillStyle = "#fff4da";
  ctx.fillText("TUTOR", TUTORIAL_TILE.x + TUTORIAL_TILE.size / 2, TUTORIAL_TILE.y + 34);
  ctx.fillText("IAL", TUTORIAL_TILE.x + TUTORIAL_TILE.size / 2, TUTORIAL_TILE.y + 54);

  ctx.fillStyle = "rgba(39, 76, 36, 0.94)";
  ctx.fillRect(FOREST_REGION.x, FOREST_REGION.y, FOREST_REGION.w, FOREST_REGION.h);
  for (const clearing of FOREST_CLEARINGS) {
    ctx.beginPath();
    ctx.fillStyle = clearing.color;
    ctx.arc(clearing.x, clearing.y, clearing.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(26, 51, 24, 0.38)";
  ctx.lineWidth = 4;
  ctx.strokeRect(FOREST_REGION.x, FOREST_REGION.y, FOREST_REGION.w, FOREST_REGION.h);
  ctx.fillStyle = "rgba(231, 242, 195, 0.82)";
  ctx.font = "700 18px Chakra Petch";
  ctx.fillText("FOREST FRONTIER", FOREST_REGION.x + 180, FOREST_REGION.y + 34);

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

  drawVillageGround();
}

function drawVillageGround() {
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
  const scaleY = mapHeight / getWorldHeight();
  const toMapX = (x) => x * scaleX;
  const toMapY = (y) => y * scaleY;

  minimapCtx.clearRect(0, 0, mapWidth, mapHeight);
  minimapCtx.fillStyle = "#19301f";
  minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

  if (player.inVillageWorld) {
    minimapCtx.fillStyle = "#9b895b";
    for (const path of villagePaths) {
      minimapCtx.fillRect(toMapX(path.x), toMapY(path.y), path.w * scaleX, path.h * scaleY);
    }
    minimapCtx.fillStyle = "#d7bf97";
    for (const building of buildings) {
      minimapCtx.fillRect(toMapX(building.x), toMapY(building.y), building.w * scaleX, building.h * scaleY);
    }
    for (const portal of getVillagePortals()) {
      minimapCtx.fillStyle = "#83d9ff";
      minimapCtx.fillRect(toMapX(portal.x), toMapY(portal.y), portal.size * scaleX, portal.size * scaleY);
    }
    minimapCtx.strokeStyle = "#d5b47c";
    const range = VILLAGE_WORLD.range;
    minimapCtx.strokeRect(toMapX(range.x), toMapY(range.y), range.w * scaleX, range.h * scaleY);
    for (const npc of tutorialNpcs) {
      minimapCtx.fillStyle = npc.color;
      minimapCtx.fillRect(toMapX(npc.x) - 2, toMapY(npc.y) - 2, 4, 4);
    }
    minimapCtx.fillStyle = "#9de0ff";
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(hero.x), toMapY(hero.y), 3, 0, Math.PI * 2);
    minimapCtx.fill();
    return;
  }

  for (const portal of getVillagePortals()) {
    minimapCtx.fillStyle = "#83d9ff";
    minimapCtx.fillRect(toMapX(portal.x), toMapY(portal.y), portal.size * scaleX, portal.size * scaleY);
  }

  if (player.inTutorialWorld) {
    minimapCtx.fillStyle = "rgba(95, 77, 47, 0.95)";
    minimapCtx.fillRect(
      toMapX(TUTORIAL_WORLD.returnTileX),
      toMapY(TUTORIAL_WORLD.returnTileY),
      TUTORIAL_WORLD.returnTileSize * scaleX,
      TUTORIAL_WORLD.returnTileSize * scaleY
    );

    minimapCtx.fillStyle = "rgba(64, 120, 67, 0.85)";
    for (const tree of trees) {
      minimapCtx.fillRect(toMapX(tree.x) - 1, toMapY(tree.y) - 1, 3, 3);
    }

    minimapCtx.fillStyle = "rgba(158, 170, 184, 0.8)";
    for (const stone of stones) {
      minimapCtx.fillRect(toMapX(stone.x) - 1, toMapY(stone.y) - 1, 3, 3);
    }

    minimapCtx.fillStyle = "#9de0ff";
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(hero.x), toMapY(hero.y), 3, 0, Math.PI * 2);
    minimapCtx.fill();
    return;
  }

  minimapCtx.fillStyle = "rgba(208, 188, 132, 0.36)";
  minimapCtx.fillRect(0, toMapY(MAIN_LANE_Y - 90), mapWidth, Math.max(10, 180 * scaleY));
  minimapCtx.fillStyle = "rgba(40, 88, 42, 0.92)";
  minimapCtx.fillRect(toMapX(FOREST_REGION.x), toMapY(FOREST_REGION.y), FOREST_REGION.w * scaleX, FOREST_REGION.h * scaleY);

  minimapCtx.fillStyle = "rgba(133, 112, 74, 0.72)";
  for (const path of villagePaths) {
    minimapCtx.fillRect(toMapX(path.x), toMapY(path.y), Math.max(2, path.w * scaleX), Math.max(2, path.h * scaleY));
  }

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

  minimapCtx.fillStyle = "#ffd87c";
  minimapCtx.beginPath();
  minimapCtx.arc(toMapX(villager.x), toMapY(villager.y), 3, 0, Math.PI * 2);
  minimapCtx.fill();

  for (const camp of FOREST_CAMPS) {
    if (!camp.iconVisibleFromStart && !hasDiscoveredCamp(camp.id)) {
      continue;
    }
    minimapCtx.fillStyle = camp.id === "hiddenCamp" ? "#d6f08a" : "#ffb978";
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(camp.center.x), toMapY(camp.center.y), 3.5, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.strokeStyle = "rgba(45, 28, 14, 0.75)";
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(toMapX(camp.center.x) - 3, toMapY(camp.center.y) - 3, 6, 6);
  }

  for (const pickup of pickups) {
    if (pickup.collected || distance(hero, pickup) > MINIMAP_NEARBY_RADIUS * 1.25) {
      continue;
    }
    minimapCtx.fillStyle = pickup.type === "rareHelmet"
      ? "#6db5ff"
      : pickup.type === "goldHelmet"
        ? "#e1bb55"
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

  if (pickup.type === "tutorialScroll") {
    ctx.fillStyle = "#e6d3a4";
    ctx.beginPath();
    ctx.ellipse(pickup.x, pickup.y, 19, 13, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6736";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#b18853";
    ctx.fillRect(pickup.x - 16, pickup.y - 8, 5, 16);
    ctx.fillRect(pickup.x + 11, pickup.y - 8, 5, 16);
    ctx.strokeStyle = "rgba(110, 76, 39, 0.55)";
    ctx.beginPath();
    ctx.moveTo(pickup.x - 8, pickup.y - 3);
    ctx.lineTo(pickup.x + 8, pickup.y - 3);
    ctx.moveTo(pickup.x - 8, pickup.y + 2);
    ctx.lineTo(pickup.x + 8, pickup.y + 2);
    ctx.stroke();
    drawNameplate(pickup.x, pickup.y - 34, "Quest: Tutorial Paths", "rgba(56, 39, 20, 0.82)");
    return;
  }

  if (pickup.type === "helmet" || pickup.type === "rareHelmet" || pickup.type === "goldHelmet" || pickup.type === "enemyHelmet") {
    const fill = pickup.type === "rareHelmet"
      ? "#3f89d8"
      : pickup.type === "goldHelmet"
        ? "#d3a63a"
        : pickup.type === "enemyHelmet"
          ? "#4f9e58"
          : "#8795a8";
    const stroke = pickup.type === "rareHelmet"
      ? "#b8e1ff"
      : pickup.type === "goldHelmet"
        ? "#fff0b3"
        : pickup.type === "enemyHelmet"
          ? "#d3ffb5"
          : "#dce5ef";
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
  if (isHeroNearTrader()) {
    ctx.fillText("TRADER", trader.x, trader.y - 34);
  }
}

function drawVillager() {
  if (player.inVillageWorld) return;
  ctx.beginPath();
  ctx.fillStyle = "#c45d44";
  ctx.arc(villager.x, villager.y, villager.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#472216";
  ctx.arc(villager.x, villager.y - 7, villager.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff1cf";
  ctx.font = "700 14px Chakra Petch";
  ctx.textAlign = "center";
  if (isHeroNearVillager()) {
    ctx.fillText("MERCENARY CAPTAIN", villager.x, villager.y - 34);
  }
}

function drawTutorialNpcs() {
  for (const npc of tutorialNpcs) {
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3ead0";
    ctx.beginPath();
    ctx.arc(npc.x, npc.y - 8, npc.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    if (distance(hero, npc) <= 90) {
      drawNameplate(npc.x, npc.y - 40, npc.name, "rgba(15, 33, 24, 0.9)");
    }
    if (npc.kind === "shootingInstructor") {
      if (distance(hero, npc) <= 90 && shootingRangeTutorial.started && !shootingRangeTutorial.completed) {
        const label = shootingRangeTutorial.state === "leading"
          ? "Follow me"
          : `Targets ${shootingRangeTutorial.hits}/2`;
        drawNameplate(npc.x, npc.y - 64, label, "rgba(33, 24, 15, 0.9)");
      }
      continue;
    }

    const professionState = getTutorialProfessionState(npc.professionId);
    const xpRequired = getProfessionXpRequired(professionState.level);
    const reputationProgress = clamp(professionState.xp / xpRequired, 0, 1);
    if (distance(hero, npc) <= 90) {
      drawNameplate(
        npc.x,
        npc.y - 88,
        `${professionState.xp}/${xpRequired} XP`,
        "rgba(33, 24, 15, 0.9)"
      );
      drawNameplate(
        npc.x,
        npc.y - 64,
        `Reputation ${professionState.reputation}`,
        "rgba(33, 24, 15, 0.9)",
        reputationProgress,
        npc.color
      );
    }
  }
}

function drawTutorialObjects() {
  if (player.inVillageWorld) {
    const range = VILLAGE_WORLD.range;
    ctx.fillStyle = "rgba(118, 95, 62, 0.3)";
    ctx.fillRect(range.x, range.y, range.w, range.h);
    ctx.strokeStyle = "#806541";
    ctx.lineWidth = 4;
    ctx.strokeRect(range.x, range.y, range.w, range.h);
    ctx.fillStyle = "#3f3424";
    ctx.font = "700 18px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("SHOOTING RANGE", range.x + 390, range.y - 20);
  }
  if (player.inTutorialWorld || player.inVillageWorld) {
    const shootingLine = getShootingLine();
    ctx.fillStyle = "#5c492a";
    ctx.fillRect(shootingLine.x, shootingLine.y, shootingLine.w, shootingLine.h);
    ctx.fillStyle = "rgba(92, 73, 42, 0.55)";
    ctx.fillRect(getShootingRangeConfig().targetLaneX - 18, getShootingRangeConfig().farTargetY - 42, 174, 12);

    for (const target of tutorialRangeTargets) {
      if (target.destroyed) {
        ctx.fillStyle = "#5f4023";
        ctx.fillRect(target.x - 4, target.y + 22, 8, 28);
        ctx.strokeStyle = "rgba(155, 84, 58, 0.9)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(target.x - 15, target.y + 16);
        ctx.lineTo(target.x + 15, target.y + 28);
        ctx.moveTo(target.x - 12, target.y + 28);
        ctx.lineTo(target.x + 12, target.y + 14);
        ctx.stroke();
        continue;
      }

      ctx.fillStyle = "#5f4023";
      ctx.fillRect(target.x - 4, target.y + 16, 8, 34);
      ctx.fillStyle = target.hit ? "#7c2f2f" : "#e8dec0";
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = target.hit ? "#bd4a4a" : "#c13d3d";
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = target.hit ? "#f0bb76" : "#f3d392";
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const plot of tutorialPlots) {
    if (!plot.active) {
      continue;
    }
    ctx.fillStyle = plot.state === "ready" ? "#91c95f" : plot.state === "growing" ? "#7c5b34" : "#6b4c2f";
    ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
    ctx.strokeStyle = "rgba(255, 240, 210, 0.28)";
    ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
    if (plot.state === "growing") {
      ctx.fillStyle = "#8fd46d";
      ctx.fillRect(plot.x + 18, plot.y + 20, 10, 34);
      ctx.fillRect(plot.x + 42, plot.y + 16, 10, 38);
      ctx.fillRect(plot.x + 64, plot.y + 22, 10, 30);
    } else if (plot.state === "ready") {
      ctx.fillStyle = "#dfcb6a";
      for (let x = plot.x + 16; x < plot.x + plot.w - 12; x += 16) {
        ctx.fillRect(x, plot.y + 14, 8, 52);
      }
    }
  }

  for (const site of tutorialSites) {
    if (!site.active || site.collected) {
      continue;
    }
    ctx.beginPath();
    ctx.fillStyle = site.kind === "landmark" ? "rgba(108, 214, 208, 0.9)" : site.resourceKey === "ore" ? "rgba(188, 200, 218, 0.95)" : "rgba(205, 148, 255, 0.95)";
    ctx.arc(site.x, site.y, site.radius, 0, Math.PI * 2);
    ctx.fill();
    drawNameplate(site.x, site.y - 30, site.label, "rgba(20, 24, 30, 0.88)");
  }
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

  if (prop.type === "tent") {
    ctx.fillStyle = "#7e5b38";
    ctx.beginPath();
    ctx.moveTo(prop.x, prop.y + prop.h);
    ctx.lineTo(prop.x + prop.w / 2, prop.y);
    ctx.lineTo(prop.x + prop.w, prop.y + prop.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(48, 26, 12, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#4b2e1a";
    ctx.fillRect(prop.x + prop.w / 2 - 7, prop.y + prop.h - 18, 14, 18);
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

  if (prop.type === "cart") {
    ctx.fillStyle = "#6f4b2a";
    ctx.fillRect(prop.x, prop.y + 6, prop.w, prop.h - 6);
    ctx.strokeStyle = "#2f1d10";
    ctx.lineWidth = 2;
    ctx.strokeRect(prop.x, prop.y + 6, prop.w, prop.h - 6);
    ctx.fillStyle = "#8f643c";
    ctx.fillRect(prop.x + 4, prop.y, prop.w - 8, 10);
    ctx.beginPath();
    ctx.arc(prop.x + 10, prop.y + prop.h, 8, 0, Math.PI * 2);
    ctx.arc(prop.x + prop.w - 10, prop.y + prop.h, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#2f1d10";
    ctx.fill();
    return;
  }

  if (prop.type === "wreckage" || prop.type === "stump") {
    ctx.fillStyle = prop.type === "stump" ? "#6f4f31" : "#7f6747";
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    ctx.strokeStyle = "rgba(59, 40, 18, 0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
    return;
  }

  if (prop.type === "banner") {
    ctx.fillStyle = "#5a3920";
    ctx.fillRect(prop.x + prop.w / 2 - 2, prop.y, 4, prop.h);
    ctx.fillStyle = "#b74234";
    ctx.beginPath();
    ctx.moveTo(prop.x + prop.w / 2 + 2, prop.y + 4);
    ctx.lineTo(prop.x + prop.w, prop.y + 10);
    ctx.lineTo(prop.x + prop.w / 2 + 2, prop.y + 18);
    ctx.closePath();
    ctx.fill();
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
    return;
  }

  if (prop.type === "campfire") {
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 164, 84, 0.88)";
    ctx.arc(prop.x, prop.y, prop.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 236, 168, 0.92)";
    ctx.arc(prop.x, prop.y - 1, prop.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (prop.type === "bush") {
    ctx.beginPath();
    ctx.fillStyle = "#3c7c38";
    ctx.arc(prop.x, prop.y, prop.radius, 0, Math.PI * 2);
    ctx.fill();
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

  if (helmetType === "goldHelmet") {
    return { fill: "#d3a63a", stroke: "#fff0b3" };
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
  const isRifleShooting = isSoldierRifleShooting();
  const isSemiAutoShooting = hero.hasRifle && hero.rifleFireMode === "semi" && hero.rifleShotAnimationTimer > 0;
  const isUsingMedicine = isUsingBattleMedicine();
  const isReloading = hero.hasRifle && hero.isReloading && hero.ammo === 0;
  const runningFrames = [
    soldierRunningTransitionImage,
    soldierRunningImage,
    soldierRunningTransitionImage,
    soldierRunningRightFootImage,
  ];
  const runningFrameNames = [
    "soldierRunningTransition",
    "soldierRunning",
    "soldierRunningTransition",
    "soldierRunningRightFoot",
  ];
  const runningFrame = runningFrames[Math.floor(hero.runAnimationTimer / 0.3) % runningFrames.length];
  const runningFrameName = runningFrameNames[Math.floor(hero.runAnimationTimer / 0.3) % runningFrameNames.length];
  const image = isUsingMedicine
    ? soldierMedkitImage
    : (isBurstShooting || isRifleShooting || isSemiAutoShooting)
      ? soldierShootingImage
    : hero.isMoving
      ? runningFrame
    : isReloading
      ? soldierReloadingImage
      : soldierIdleImage;
  const animationName = isUsingMedicine
    ? "soldierMedkit"
    : (isBurstShooting || isRifleShooting || isSemiAutoShooting)
      ? "soldierShooting"
      : hero.isMoving
        ? runningFrameName
      : isReloading
        ? "soldierReloading"
        : "soldierIdle";
  const shootingAngle = isRifleShooting
    ? Math.atan2(mouse.worldY - hero.y, mouse.worldX - hero.x)
    : isSemiAutoShooting
      ? hero.rifleShotAngle
      : hero.facingAngle;
  const facingAngle = hero.lastMoveAngle ?? shootingAngle ?? hero.facingAngle ?? 0;
  const spriteFacingAngle = image === soldierShootingImage
    ? (shootingAngle ?? hero.facingAngle ?? 0)
    : facingAngle;
  const isFacingLeft = Math.cos(spriteFacingAngle) < 0;
  if (animationName !== lastSoldierAnimationName) {
    console.log("Soldier animation changed:", animationName);
    lastSoldierAnimationName = animationName;
  }
  if (!image.complete || image.naturalWidth <= 0) {
    drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
    return;
  }

  const size = 54;
  ctx.save();
  ctx.translate(hero.x, hero.y);
  if (
    image === soldierRunningImage ||
    image === soldierRunningTransitionImage ||
    image === soldierRunningRightFootImage
  ) {
    if (isFacingLeft) {
      ctx.scale(-1, 1);
    }
  } else if (
    image === soldierIdleImage ||
    image === soldierReloadingImage ||
    image === soldierMedkitImage ||
    image === soldierShootingImage
  ) {
    if (isFacingLeft) {
      ctx.scale(-1, 1);
    }
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

function drawNameplate(
  x,
  y,
  name,
  fillStyle = "rgba(15, 33, 24, 0.88)",
  textFillRatio = null,
  progressColor = "#ffd36b",
  borderStyle = "rgba(255, 245, 210, 0.28)",
  textColor = "#fff5d2",
  font = "700 14px Chakra Petch"
) {
  if (!name) {
    return;
  }

  ctx.font = font;
  ctx.textAlign = "center";
  const paddingX = 10;
  const width = ctx.measureText(name).width + paddingX * 2;
  const height = 22;
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.fillStyle = fillStyle;
  ctx.fillRect(left, top, width, height);
  if (typeof textFillRatio === "number") {
    const clampedRatio = clamp(textFillRatio, 0, 1);
    if (clampedRatio > 0) {
      ctx.fillStyle = progressColor;
      ctx.fillRect(left, top, width * clampedRatio, height);
    }
  }
  ctx.strokeStyle = borderStyle;
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);
  ctx.fillStyle = textColor;
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

function drawHeroGrenades() {
  for (const grenade of heroGrenades) {
    const progress = 1 - grenade.ttl / grenade.maxTtl;
    const arcOffset = Math.sin(progress * Math.PI) * grenade.arcHeight;
    ctx.beginPath();
    ctx.fillStyle = "#61726d";
    ctx.arc(grenade.x, grenade.y - arcOffset, grenade.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#c8d2cf";
    ctx.arc(grenade.x - 2, grenade.y - arcOffset - 2, Math.max(2, grenade.radius * 0.32), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrenadeShockwaves() {
  for (const shockwave of grenadeShockwaves) {
    const progress = 1 - shockwave.ttl / shockwave.maxTtl;
    const alpha = 1 - progress;
    const coreRadius = 8 + progress * 18;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 220, 132, ${alpha * 0.48})`;
    ctx.arc(shockwave.x, shockwave.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    for (const particle of shockwave.particles || []) {
      const traveled = particle.targetRadius * Math.min(1, progress * 1.45) * particle.speedScale;
      const spreadX = Math.cos(particle.angle) * traveled + Math.cos(particle.angle + Math.PI / 2) * particle.drift * progress;
      const spreadY = Math.sin(particle.angle) * traveled + Math.sin(particle.angle + Math.PI / 2) * particle.drift * progress;
      const size = Math.max(0.8, particle.size * (1 - progress * 0.45));

      ctx.beginPath();
      ctx.fillStyle = `rgba(${particle.color}, ${alpha})`;
      ctx.arc(shockwave.x + spreadX, shockwave.y + spreadY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGrenadeAimArc() {
  if (!grenadeAim.active) {
    return;
  }

  const target = getClampedGrenadeTarget(mouse.worldX, mouse.worldY);
  if (target.distance < 24) {
    return;
  }

  const midX = (hero.x + target.x) / 2;
  const midY = (hero.y + target.y) / 2;
  const arcHeight = Math.max(26, Math.min(70, target.distance * 0.12));
  const controlY = midY - arcHeight * 2.2;

  ctx.beginPath();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = grenadeAim.primed ? "rgba(255, 226, 170, 0.95)" : "rgba(255, 214, 138, 0.82)";
  ctx.lineWidth = 3;
  ctx.moveTo(hero.x, hero.y - 10);
  ctx.quadraticCurveTo(midX, controlY, target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 186, 86, 0.16)";
  ctx.arc(target.x, target.y, SOLDIER_GRENADE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 227, 168, 0.8)";
  ctx.lineWidth = 2;
  ctx.arc(target.x, target.y, SOLDIER_GRENADE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 244, 210, 0.95)";
  ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
  ctx.fill();
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
  const nearbyTutorialNpc = getNearbyTutorialNpc();
  if (nearbyTutorialNpc && !isDialogueOpen()) {
    ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
    ctx.fillRect(nearbyTutorialNpc.x - 58, nearbyTutorialNpc.y + 34, 116, 26);
    ctx.fillStyle = "#fff5d2";
    ctx.font = "600 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("Press Space", nearbyTutorialNpc.x, nearbyTutorialNpc.y + 52);
    return;
  }

  const tutorialPlot = getNearbyTutorialPlot();
  if (tutorialPlot && !isDialogueOpen()) {
    ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
    ctx.fillRect(tutorialPlot.x - 8, tutorialPlot.y - 38, 116, 26);
    ctx.fillStyle = "#fff5d2";
    ctx.font = "600 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("Press E", tutorialPlot.x + tutorialPlot.w / 2, tutorialPlot.y - 20);
    return;
  }

  const tutorialSite = getNearbyTutorialSite();
  if (tutorialSite && !isDialogueOpen()) {
    ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
    ctx.fillRect(tutorialSite.x - 52, tutorialSite.y - 68, 104, 26);
    ctx.fillStyle = "#fff5d2";
    ctx.font = "600 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("Press E", tutorialSite.x, tutorialSite.y - 50);
    return;
  }

  if (isHeroNearVillager() && !isDialogueOpen()) {
    ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
    ctx.fillRect(villager.x - 58, villager.y + 34, 116, 26);
    ctx.fillStyle = "#fff5d2";
    ctx.font = "600 16px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("Press Space", villager.x, villager.y + 52);
    return;
  }

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
  drawVillagePortals();

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

  drawTutorialObjects();
  drawTutorialNpcs();

  drawTrader();
  drawVillager();

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
  drawHarvestProgress();
  drawSlashArc();
  drawGrenadeAimArc();
  drawGrenadeShockwaves();
  drawHeroGrenades();
  drawHeroProjectiles();
  for (const projectile of enemyProjectiles) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.angle);
    ctx.strokeStyle = "#725127";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.fillStyle = "#d2d9dd";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
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
    } else if (unit.kind === "goblinArcher") {
      drawEntityCircle(unit, "#7a4b2d", "#d8bf7f");
      ctx.strokeStyle = "#4b2d18";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(unit.x - 2, unit.y, unit.radius - 5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else if (unit.kind === "ogre") {
      drawEntityCircle(unit, "#6d3c28", "#d6a16c");
      ctx.strokeStyle = "rgba(62, 30, 18, 0.75)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(unit.x - 12, unit.y + 6);
      ctx.lineTo(unit.x + 12, unit.y + 6);
      ctx.stroke();
    } else {
      drawEntityCircle(unit, isBoss ? "#5b2a2a" : COLORS.enemy, isBoss ? "#ff9f7b" : "#ef9494");
    }
    drawHealthBar(unit.x, unit.y - (isBoss || unit.kind === "ogre" ? 36 : 28), isBoss || unit.kind === "ogre" ? 70 : 44, unit.hp / unit.maxHp);
    if (isBoss) {
      ctx.fillStyle = "#ffe0b0";
      ctx.font = "700 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("BOSS", unit.x, unit.y - 44);
    } else if (unit.campId && distance(hero, unit) <= 150) {
      ctx.fillStyle = unit.campId === "hiddenCamp" ? "#dff5b0" : "#ffd8aa";
      ctx.font = "700 14px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText(unit.kind === "ogre" ? "OGRE" : unit.kind === "goblinArcher" ? "ARCHER" : "GOBLIN", unit.x, unit.y - 36);
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

  if (isDialogueOpen()) {
    if (tutorialDialogue.npcId) {
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
    selectBuilding(playerBase);
    return;
  }

  if (key === "b") {
    if (isPlayerBaseSelected()) {
      startBarracksPlacement();
    }
    return;
  }

  if (key === "g") {
    if (!event.repeat) {
      startGrenadeAim();
    }
    return;
  }

  if (key === "x") {
    if (!event.repeat && toggleRifleFireMode()) {
      return;
    }
  }

  if (key === "q") {
    if (!event.repeat) {
      useBattleMedicine();
    }
    return;
  }

  if (key === "e") {
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
    cancelGrenadeAim();
    updateBuildBarracksButton();
    statusTextEl.textContent = getCharacterStatus();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
  if (key === "g" && grenadeAim.active) {
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

  if (selectionBox) {
    selectionBox.x2 = mouse.worldX;
    selectionBox.y2 = mouse.worldY;
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
  if (isInterfacePanelOpen()) {
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
  updateInventoryUI();
  updateTrainButton();
  statusTextEl.textContent = "Sold 25 wood for 25 gold.";
  updateShopUI();
});

trainSoldierBtn.addEventListener("click", () => {
  if (!player.hasSelectedCharacter) {
    return;
  }
  if (isInterfacePanelOpen()) {
    return;
  }
  const barracks = buildings.find((building) => building.id === player.selectedBuildingId && building.isPlayer);
  if (!barracks || player.money < 50) {
    return;
  }
  player.money -= 50;
  updateInventoryUI();
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
  updateInventoryUI();
  updateStatsUI();
  updateTraderUI();
  statusTextEl.textContent = "Weapon enhanced. +10 weapon, +5 ability damage.";
});

closeTraderBtn.addEventListener("click", () => {
  closeTrader();
});

weaponDetailsBtnEl.addEventListener("click", () => {
  if (player.weaponDetailsOpen) {
    closeWeaponDetails();
  } else {
    openWeaponDetails();
  }
});

closeWeaponDetailsBtn.addEventListener("click", () => {
  closeWeaponDetails();
});

weaponDetailUpgradeEls.forEach((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyWeaponDetailUpgrade(element.dataset.weaponUpgrade);
  });
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
  hero.regenProgress = 0;
  hero.dashTimer = 0;
  hero.dashCooldown = selectedClass.dashCooldown || 0;
  hero.dashCooldownRemaining = 0;
  hero.hasAxe = false;
  hero.axeSwingTimer = 0;
  hero.hasBow = classId === "archer";
  hero.bowCooldown = 0;
  hero.grenadeCooldownRemaining = 0;
  hero.battleMedicineCooldownRemaining = 0;
  hero.battleMedicineBuffTimer = 0;
  hero.battleMedicineUseTimer = 0;
  hero.weaponPickupCooldown = 0;
  hero.hasRifle = classId === "soldier";
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
  characterSelectEl.classList.add("hidden");
  statusTextEl.textContent = classId === "soldier"
    ? `${selectedClass.name} selected. Walk near a tree and press E to harvest wood. Press F for Burst Shot and G for Grenade.`
    : `${selectedClass.name} selected. Walk near a tree and press E to harvest wood.`;
  updateQuestUI();
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

    classCardEl.append(portraitEl, nameEl);

    if (selectedClass.abilityName) {
      const abilityEl = document.createElement("span");
      abilityEl.textContent = classId === "soldier"
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

initializeGame();
