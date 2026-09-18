import { PLAYER_BASE_SPAWN, QUEST_ID, TUTORIAL_WORLD } from "./constants.js";
export { multiplayer } from "./multiplayer.js";

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
  inventoryOpen: false,
  backpack: [],
  backpackCapacity: 8,
  shopOpen: false,
  traderOpen: false,
  weaponDetailsOpen: false,
  inDodgeArena: false,
  inTutorialWorld: false,
  inVillageWorld: false,
  inWaveWorld: false,
  dodgeArenaReturnX: PLAYER_BASE_SPAWN.x + 40,
  dodgeArenaReturnY: PLAYER_BASE_SPAWN.y,
  weaponBonusStat: 0,
  weaponBonusDamage: 0,
  weaponDetailDamageLevel: 0,
  weaponDetailAmmoLevel: 0,
  weaponDetailReloadLevel: 0,
  weaponDetailRangeLevel: 0,
  weaponDetailFireRateLevel: 0,
  bonusArmor: 0,
  bonusHealth: 0,
  bonusDamage: 0,
  bonusSpeed: 0,
  bonusRegen: 0,
  bonusAbilityDamage: 0,
  helmetBonusArmor: 0,
  tutorialResources: {
    seeds: 0,
    wheat: 0,
    ore: 0,
    arcaneDust: 0,
  },
  tutorialPathsUnlocked: false,
};

const camera = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0, leftDown: false };
const keys = new Set();
const grenadeAim = { active: false };

let entityId = 1;

function nextId() {
  return entityId++;
}

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
  sprintTimer: 0,
  sprintCooldownRemaining: 0,
  dashCooldown: 0,
  dashCooldownRemaining: 0,
  dashSpeed: 680,
  dashDuration: 0.18,
  selectedClass: null,
  vehicleId: null,
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
  grenadeCooldownRemaining: 0,
  battleMedicineCooldownRemaining: 0,
  battleMedicineBuffTimer: 0,
  battleMedicineUseTimer: 0,
  adrenalineTimer: 0,
  hunterMarkTimer: 0,
  hunterMarkTargetId: null,
  shootLockTimer: 0,
  weaponPickupCooldown: 0,
  hasRifle: false,
  rifleCooldown: 0,
  rifleShotAnimationTimer: 0,
  rifleShotAngle: 0,
  rifleFireMode: "automatic",
  isMoving: false,
  runAnimationTimer: 0,
  isDead: false,
  deathTimer: 0,
  deathDuration: 0.7,
  regenProgress: 0,
  ammo: 0,
  maxAmmo: 30,
  isReloading: false,
  reloadTimer: 0,
  reloadDuration: 1.2,
};

const villager = {
  x: 530,
  y: 1290,
  radius: 20,
  name: "Mercenary Captain",
};

const quest = {
  id: QUEST_ID,
  activeContractId: null,
  activeContractStage: "idle",
  availableContractIds: ["knownCamp"],
  completedContractIds: [],
  discoveredCampIds: [],
  progress: null,
  activeDialogue: null,
  dialogueIndex: 0,
  dialogueAction: null,
  dialogueContractId: null,
};

const inventory = [];
const trees = [];
const stones = [];
const buildings = [];
const units = [];
const enemies = [];
const heroProjectiles = [];
const heroGrenades = [];
const grenadeShockwaves = [];
const damagePopups = [];
const sparkEffects = [];
const dodgeArenaBullets = [];
const villageFields = [];
const villagePaths = [];
const villageFences = [];
const villageProps = [];
const trader = {
  x: 177,
  y: 1500,
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

// Mutable references shared across systems; never copy these into individual modules.
const runtime = {
  CHARACTER_OPTIONS: {},
  ENEMY_OPTIONS: {},
  harvestTreeId: null,
  playerBase: null,
  enemyBase: null,
  enemyHero: null,
  lastSoldierAnimationName: null,
  selectedInventoryAbilityName: null,
  draggedInventoryAbility: null,
  draggedHumveeWeapon: null,
  draggedHumveeTech: null,
  draggedBackpackHelmetIndex: null,
  helmetSwapFeedbackTimeout: undefined,
};

const inventoryAbilityOrders = new Map();

const humveeExhaustParticles = [];

const tutorialPlots = [];

const tutorialSites = [];

const tutorialRangeTargets = [];

const trainingAmmoStockpile = {
  x: TUTORIAL_WORLD.spawnX + 300,
  y: TUTORIAL_WORLD.spawnY + 10,
  size: 96,
  occupantId: null,
};

const waveMode = { wave: 0, timer: 0, completed: false };

const shootingRangeTutorial = {
  movingTargets: false,
  state: "idle",
  started: false,
  completed: false,
  hits: 0,
  introSeen: false,
};

const enemyProjectiles = [];

const forestEnemySpawners = [];

const forestRespawnQueue = [];

const engineerDeployables = [];

const tutorialProfessionState = {};

export {
  buildings,
  camera,
  damagePopups,
  dodgeArenaBullets,
  enemies,
  enemyProjectiles,
  engineerDeployables,
  forestEnemySpawners,
  forestRespawnQueue,
  grenadeAim,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  humveeExhaustParticles,
  inventory,
  inventoryAbilityOrders,
  keys,
  mouse,
  nextId,
  pickups,
  player,
  quest,
  runtime,
  shootingRangeTutorial,
  sparkEffects,
  stones,
  trader,
  trainingAmmoStockpile,
  trees,
  tutorialPlots,
  tutorialProfessionState,
  tutorialRangeTargets,
  tutorialSites,
  units,
  villageFences,
  villageFields,
  villagePaths,
  villageProps,
  villager,
  waveMode,
};
