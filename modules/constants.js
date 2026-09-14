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
const TUTORIAL_TILE = {
  x: PLAYER_BASE_SPAWN.x + 420,
  y: PLAYER_BASE_SPAWN.y + 110,
  size: 90,
};
const TUTORIAL_WORLD = {
  spawnX: WORLD.width / 2,
  spawnY: WORLD.height / 2 + 140,
  treeX: WORLD.width / 2 - 150,
  treeY: WORLD.height / 2,
  rockX: WORLD.width / 2 + 160,
  rockY: WORLD.height / 2 + 30,
  returnTileX: WORLD.width / 2,
  returnTileY: WORLD.height / 2 + 320,
  returnTileSize: 96,
};
const VILLAGE_LAYOUT_OFFSET = { x: WORLD.width / 2 - 460, y: -1070 };
const VILLAGE_RANGE = { x: WORLD.width - 650, y: 1300, w: 570, h: 220 };
const VILLAGE_WORLD = {
  height: 2800,
  offset: VILLAGE_LAYOUT_OFFSET,
  spawnX: VILLAGE_RANGE.x + 60,
  spawnY: VILLAGE_RANGE.y - 50,
  range: VILLAGE_RANGE,
  portals: [
    { x: 330, y: 1440, size: 80, destination: "main", label: ["MAIN", "WORLD"] },
    { x: 450, y: 1575, size: 80, destination: "training", label: ["TRAINING", "WORLD"] },
  ].map((portal) => ({ ...portal, x: portal.x + VILLAGE_LAYOUT_OFFSET.x, y: portal.y + VILLAGE_LAYOUT_OFFSET.y })),
};
const VILLAGE_RETURN_TILES = {
  main: { x: 800, y: 850, size: 90, destination: "village", label: ["VILLAGE"] },
  training: { x: 1360, y: 1270, size: 96, destination: "village", label: ["VILLAGE"] },
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
  path: "#a8875b",
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
  tutorialTile: "#5f4d2f",
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

const UPGRADE_OPTIONS = [
  { id: "health", label: "Health", description: "+10 max HP" },
  { id: "armor", label: "Armor", description: "+3 body armor" },
  { id: "speed", label: "Speed", description: "+5 speed" },
  { id: "regen", label: "Regen", description: "+0.5 health regen" },
  { id: "ability", label: "Ability", description: "+3 ability damage" },
  { id: "helmet", label: "Helmet", description: "+3 helmet armor" },
];

const DEFAULT_ENEMY_NAME = "Enemy Hero";
const MINIMAP_NEARBY_RADIUS = 360;
const PLAYER_NAME_STORAGE_KEY = "timberlineCommandPlayerName";
const SOLDIER_GRENADE_RANGE = GRID_SIZE * 4;
const SOLDIER_GRENADE_RADIUS = 110;
const SOLDIER_GRENADE_DAMAGE = 42;
const SOLDIER_GRENADE_COOLDOWN = 6;
const SOLDIER_BATTLE_MEDICINE_HEAL = 50;
const SOLDIER_BATTLE_MEDICINE_REGEN_BONUS = 2;
const SOLDIER_BATTLE_MEDICINE_DURATION = 10;
const SOLDIER_BATTLE_MEDICINE_COOLDOWN = 20;
const DODGE_ARENA_DODGE_XP = 1;
const RANGED_HEADSHOT_CONFIG = {
  bullet: {
    headshotChance: 0.18,
    headshotMultiplier: 2,
  },
  arrow: {
    headshotChance: 0.22,
    headshotMultiplier: 2,
  },
  arenaBullet: {
    headshotChance: 0.16,
    headshotMultiplier: 2,
  },
};
const HELMET_HEADSHOT_PROTECTION = {
  helmet: 0.2,
  rareHelmet: 0.45,
  enemyHelmet: 0.6,
  goldHelmet: 0.75,
};
const QUEST_ID = "goblinTrouble";
const GOLD_HELMET_ARMOR = 95;
const QUEST_DIALOGUES = {
  intro: [
    "Please help us. A goblin has been causing trouble near the edge of the village.",
    "Can you hunt it down and keep the village safe?",
  ],
  inProgress: [
    "That goblin is still out there. Please take care of it.",
  ],
  readyToTurnIn: [
    "You did it. The village is safe again.",
    "Take this Gold Helmet as thanks for helping us.",
  ],
  completed: [
    "You already saved us. Thank you again for dealing with the goblin.",
  ],
};

export {
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
};
