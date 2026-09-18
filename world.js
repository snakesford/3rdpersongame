import { clamp, distance } from "./modules/math.js";
import {
  buildings,
  damagePopups,
  dodgeArenaBullets,
  enemies,
  enemyProjectiles,
  forestEnemySpawners,
  forestRespawnQueue,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  humveeExhaustParticles,
  mouse,
  nextId,
  pickups,
  player,
  runtime,
  sparkEffects,
  stones,
  trader,
  trainingAmmoStockpile,
  trees,
  tutorialPlots,
  tutorialRangeTargets,
  tutorialSites,
  units,
  villageFences,
  villageFields,
  villagePaths,
  villageProps,
  waveMode,
} from "./modules/state.js";
import {
  DEATH_ZONE,
  DODGE_ARENA,
  MAIN_LANE_Y,
  PLAYER_BASE_SPAWN,
  SPAWN_STREAM_TILE,
  SPAWN_WAVE_TILE,
  TUTORIAL_TILE,
  TUTORIAL_WORLD,
  VILLAGE_RETURN_TILES,
  VILLAGE_ROAD_WIDTH,
  VILLAGE_WORLD,
  WORLD,
} from "./modules/constants.js";
import { inputState } from "./inputs.js";
import { ctx, overlayMessageEl, statusTextEl } from "./modules/dom.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createWorldSystem(services) {
  const ROAD_SPEED_MULTIPLIER = 1.3;

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

  function getCampConfig(campId) {
    return FOREST_CAMPS.find((camp) => camp.id === campId) || null;
  }

  function clearWorldEntities() {
    Object.assign(waveMode, { wave: 0, timer: 0, completed: false });
    services.clearEngineerDeployables();
    services.npcState.trainingDriver = null;
    trainingAmmoStockpile.occupantId = null;
    humveeExhaustParticles.length = 0;
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
    services.tutorialNpcs.length = 0;
    tutorialPlots.length = 0;
    tutorialSites.length = 0;
    tutorialRangeTargets.length = 0;
    forestEnemySpawners.length = 0;
    forestRespawnQueue.length = 0;
  }

  function initializeMainWorld() {
    clearWorldEntities();
    Object.assign(trader, services.MAIN_WORLD_TRADER_POSITION);
    services.ensureContractAvailability();
    SPAWN_WAVE_TILE.triggered = false;
    SPAWN_STREAM_TILE.timer = 0;
    DODGE_ARENA.timer = 0;
    player.inWaveWorld = false;
    player.inTutorialWorld = false;
    player.inVillageWorld = false;
    player.inDodgeArena = false;
    player.selectedUnits = [];
    player.selectedBuildingId = null;

    spawnTrees();
    spawnStones();
    runtime.playerBase = services.createBuilding("playerBase", 60, MAIN_LANE_Y - 100, true);
    runtime.playerBase.hp = 900;
    runtime.playerBase.maxHp = 900;
    runtime.playerBase.w = 180;
    runtime.playerBase.h = 200;
    initializeVillage();
    // Spare helmets just north of the main-world village.
    [
      { type: "enemyHelmet", armorValue: 80, x: 250 },
      { type: "helmet", armorValue: 60, x: 330 },
      { type: "goldHelmet", armorValue: 100, x: 410 },
    ].forEach((helmet) => {
      services.spawnPickupDrop({ type: helmet.type, armorValue: helmet.armorValue, radius: 18 }, helmet.x, 1150);
    });
    initializeForest();
    runtime.enemyBase = services.createBuilding("enemyBase", WORLD.width - 290, getWorldHeight() - 320, false);
    runtime.enemyBase.hp = 800;
    runtime.enemyBase.maxHp = 800;
    runtime.enemyBase.w = 180;
    runtime.enemyBase.h = 200;
    services.initializeEnemyForces();
    services.initializeForestEncounterSpawners();
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

  function populateTutorialWorld() {
    services.populateTutorialNpcs();
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

  function addVillageRectProp(type, x, y, w, h, collidable = true) {
    villageProps.push({ type, x, y, w, h, collidable, shape: "rect" });
  }

  function addVillageCircleProp(type, x, y, radius, collidable = true) {
    villageProps.push({ type, x, y, radius, collidable, shape: "circle" });
  }

  function initializeVillage(roadStartY = runtime.playerBase.y + runtime.playerBase.h) {
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

    services.createBuilding("villageHouse", 86, 1232, true, { w: 102, h: 86, hp: 500, maxHp: 500, selectable: false });
    services.createBuilding("villageHouse", 210, 1362, true, { w: 96, h: 82, hp: 500, maxHp: 500, selectable: false });
    services.createBuilding("villageHouse", 352, 1246, true, { w: 94, h: 84, hp: 500, maxHp: 500, selectable: false });
    services.createBuilding("well", 254, 1212, true, { w: 62, h: 62, hp: 350, maxHp: 350, selectable: false });
    services.createBuilding("blacksmith", 420, 1360, true, { w: 134, h: 104, hp: 650, maxHp: 650, selectable: false });
    services.createBuilding("market", 118, 1450, true, { w: 118, h: 82, hp: 400, maxHp: 400, selectable: false });

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

  function prepareWorldTravel() {
    if (hero.vehicleId !== null) services.exitHumvee();
    player.isPlacingBuilding = false;
    player.selectedUnits = [];
    player.selectedBuildingId = null;
    inputState.selectionBox = null;
    mouse.leftDown = false;
    services.cancelGrenadeAim();
    cancelHarvest();
    services.closeTutorialDialogue();
    services.closeQuestDialogue();
    services.closeShop();
    services.closeTrader();
    services.closeWeaponDetails();
    hero.targetPos = null;
    hero.lastMoveAngle = null;
    hero.abilityEffect = null;
    hero.rifleShotAnimationTimer = 0;
  }

  function activateVillageWorld() {
    prepareWorldTravel();
    clearWorldEntities();
    player.inVillageWorld = true;
    player.inWaveWorld = false;
    player.inTutorialWorld = false;
    player.inDodgeArena = false;
    runtime.playerBase = null;
    runtime.enemyBase = null;
    runtime.enemyHero = services.createEnemyHero(-1000, -1000);
    runtime.enemyHero.active = false;
    runtime.enemyHero.hp = 0;
    services.ensureContractAvailability();
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
    services.createBuilding("humvee", range.x - 290, range.y - 290, false, {
      w: 150,
      h: 89,
      hp: 1000,
      maxHp: 1000,
      selectable: false,
    });
    const villageRoadX = 310 + offsetX;
    const villageRoadY = 1558 + offsetY;
    const rangeApproachY = range.y - 90;
    villagePaths.push(
      { x: villageRoadX, y: villageRoadY, w: 100, h: rangeApproachY + 64 - villageRoadY },
      { x: villageRoadX, y: rangeApproachY, w: range.x + 120 - villageRoadX, h: 64 },
      { x: range.x + 20, y: rangeApproachY, w: 100, h: 260 },
      { x: range.x + 120, y: range.y + 90, w: 430, h: 100 }
    );
    trader.x = services.MAIN_WORLD_TRADER_POSITION.x + offsetX;
    trader.y = services.MAIN_WORLD_TRADER_POSITION.y + offsetY;
    services.createTutorialNpc("mercenary", 530 + offsetX, 1290 + offsetY);
    services.initializeShootingRange();
    services.restoreMercenaryTrainingTask();
    hero.x = VILLAGE_WORLD.spawnX;
    hero.y = VILLAGE_WORLD.spawnY;
    hero.hp = hero.maxHp;
    services.updateCamera(1);
    overlayMessageEl.classList.add("hidden");
    statusTextEl.textContent = "Village. Press Space to talk to the Mercenary. The Shooting Instructor is at the range on the far right of the map.";
    services.updateQuestUI();
    services.updateInventoryUI();
    services.updateStatsUI();
    services.updateAbilityUI();
    services.updateTrainButton();
    services.updateBuildBarracksButton();
  }

  function getVillagePortals() {
    if (player.inWaveWorld) return [];
    if (player.inTutorialWorld) return [VILLAGE_RETURN_TILES.training, services.WAVE_MODE_TILE];
    if (player.inVillageWorld) return VILLAGE_WORLD.portals;
    return [player.inTutorialWorld ? VILLAGE_RETURN_TILES.training : VILLAGE_RETURN_TILES.main];
  }

  function updateVillagePortals() {
    const portal = getVillagePortals().find((tile) =>
      (tile.destination === "waves"
        ? Math.hypot(hero.x - clamp(hero.x, tile.x, tile.x + tile.size), hero.y - clamp(hero.y, tile.y, tile.y + tile.size)) <= hero.radius
        : hero.x >= tile.x && hero.x <= tile.x + tile.size &&
          hero.y >= tile.y && hero.y <= tile.y + tile.size)
    );
    if (!portal) return false;
    if (portal.destination === "main") travelToMainWorld();
    else if (portal.destination === "training") activateTutorialWorld();
    else if (portal.destination === "waves") services.activateWaveWorld();
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
    player.inWaveWorld = false;
    player.inTutorialWorld = true;
    Object.assign(trader, services.MAIN_WORLD_TRADER_POSITION);
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

    runtime.enemyHero.active = false;
    runtime.enemyHero.hp = 0;
    runtime.enemyHero.x = -1000;
    runtime.enemyHero.y = -1000;

    hero.x = TUTORIAL_WORLD.spawnX;
    hero.y = TUTORIAL_WORLD.spawnY;
    hero.hp = hero.maxHp;
    hero.targetPos = null;
    hero.lastMoveAngle = null;
    hero.abilityEffect = null;
    populateTutorialWorld();

    overlayMessageEl.classList.add("hidden");
    services.updateCamera(1);
    statusTextEl.textContent = "Entered the training world.";
    services.updateQuestUI();
    services.updateInventoryUI();
    services.updateStatsUI();
    services.updateAbilityUI();
    services.updateTrainButton();
    services.updateBuildBarracksButton();
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
    services.updateCamera(1);
    statusTextEl.textContent = "Entered the main world.";
    services.updateQuestUI();
    services.updateInventoryUI();
    services.updateStatsUI();
    services.updateAbilityUI();
    services.updateTrainButton();
    services.updateBuildBarracksButton();
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
      const farmerState = services.getTutorialProfessionState("farmer");
      if (plot.state === "empty" && player.tutorialResources.seeds > 0) {
        player.tutorialResources.seeds -= 1;
        plot.state = "growing";
        plot.timer = 4;
        statusTextEl.textContent = "Seeds planted. Wait for the crop to grow.";
        services.updateInventoryUI();
        return true;
      }
      if (plot.state === "ready") {
        plot.state = "harvested";
        player.tutorialResources.wheat += 1;
        if (farmerState.activeTask?.status === "active") {
          services.completeTutorialProfessionTask("farmer");
        }
        statusTextEl.textContent = "Crop harvested. Return to the Farmer.";
        services.updateInventoryUI();
        return true;
      }
    }

    const site = getNearbyTutorialSite();
    if (site?.kind === "pickup") {
      player.tutorialResources[site.resourceKey] += 1;
      site.collected = true;
      const professionId = site.professionId;
      if (services.getTutorialProfessionState(professionId).activeTask?.status === "active") {
        services.completeTutorialProfessionTask(professionId);
      }
      statusTextEl.textContent = `${site.label} collected.`;
      services.updateInventoryUI();
      return true;
    }

    return false;
  }

  function updateTutorialWorldSystems(dt) {
    services.updateShootingRangeTargets(dt);

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
      services.completeTutorialProfessionTask("explorer");
      statusTextEl.textContent = "Landmark discovered. Return to the Explorer.";
    }

    services.updateShootingInstructor(dt);
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

  function getNearbyTree() {
    return trees.find((tree) => distance(hero, tree) <= hero.radius + tree.radius + 20) || null;
  }

  function startHarvest() {
    const tree = getNearbyTree();
    if (!tree || hero.isHarvesting) {
      return;
    }
    hero.isHarvesting = true;
    hero.harvestProgress = 0;
    runtime.harvestTreeId = tree.id;
  }

  function cancelHarvest() {
    hero.isHarvesting = false;
    hero.harvestProgress = 0;
    runtime.harvestTreeId = null;
  }

  function getWorldHeight() {
    return player.inVillageWorld ? VILLAGE_WORLD.height : WORLD.height;
  }

  function isHeroOnRoad() {
    if (player.inWaveWorld || player.inTutorialWorld || player.inDodgeArena) return false;
    if (villagePaths.some((path) =>
      hero.x >= path.x && hero.x <= path.x + path.w &&
      hero.y >= path.y && hero.y <= path.y + path.h
    )) return true;
    return !player.inVillageWorld && hero.y >= MAIN_LANE_Y - 90 && hero.y <= MAIN_LANE_Y + 90;
  }

  function getRoadSpeedMultiplier() {
    return isHeroOnRoad() ? ROAD_SPEED_MULTIPLIER : 1;
  }

  function updatePlayerWorldInteractions(dt) {
    if (updateVillagePortals()) {
      return true;
    }
    const inMainWorld = !player.inTutorialWorld && !player.inVillageWorld && !player.inWaveWorld;
    if (inMainWorld && !SPAWN_WAVE_TILE.triggered && services.isHeroOnSpawnWaveTile()) {
      services.spawnSkeletonWave();
    }

    if (inMainWorld && services.isHeroOnSpawnStreamTile()) {
      SPAWN_STREAM_TILE.timer += dt;
      while (SPAWN_STREAM_TILE.timer >= SPAWN_STREAM_TILE.interval) {
        services.spawnSingleSkeleton();
        SPAWN_STREAM_TILE.timer -= SPAWN_STREAM_TILE.interval;
      }
    } else {
      SPAWN_STREAM_TILE.timer = 0;
    }

    if (inMainWorld && !player.inDodgeArena && services.isHeroOnDodgeArenaTile()) {
      services.enterDodgeArena();
    }

    if (inMainWorld && isHeroOnTutorialTile()) {
      activateTutorialWorld();
      return true;
    }

    if (player.inTutorialWorld && isHeroOnTutorialReturnTile()) {
      travelToMainWorld();
      return true;
    }

    if (player.inTutorialWorld || player.inVillageWorld) {
      updateTutorialWorldSystems(dt);
    }

    return false;
  }

  function updateHarvest(dt) {
    if (hero.isHarvesting) {
      const tree = trees.find((t) => t.id === runtime.harvestTreeId);
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
        services.queueEnemyRespawn(enemies[i]);
        enemies.splice(i, 1);
      }
    }

    if (runtime.enemyHero.active && isInsideDeathZone(runtime.enemyHero)) {
      runtime.enemyHero.active = false;
      runtime.enemyHero.hp = 0;
    }
  }

  return {
    ROAD_SPEED_MULTIPLIER,
    FOREST_REGION,
    FOREST_CLEARINGS,
    FOREST_CAMPS,
    getCampConfig,
    clearWorldEntities,
    initializeMainWorld,
    resetTutorialObjects,
    populateTutorialWorld,
    spawnTrees,
    spawnStones,
    addVillageRectProp,
    addVillageCircleProp,
    initializeVillage,
    addForestRectProp,
    addForestCircleProp,
    spawnForestTrees,
    spawnForestStones,
    initializeForest,
    isHeroOnTutorialTile,
    isHeroOnTutorialReturnTile,
    prepareWorldTravel,
    activateVillageWorld,
    getVillagePortals,
    updateVillagePortals,
    drawVillagePortals,
    activateTutorialWorld,
    travelToMainWorld,
    getNearbyTutorialPlot,
    getNearbyTutorialSite,
    handleTutorialInteraction,
    updateTutorialWorldSystems,
    intersectsBuilding,
    intersectsTree,
    intersectsStone,
    resolveCircleAgainstRect,
    resolveHeroObstacleCollisions,
    getNearbyTree,
    startHarvest,
    cancelHarvest,
    getWorldHeight,
    isHeroOnRoad,
    getRoadSpeedMultiplier,
    updatePlayerWorldInteractions,
    updateHarvest,
    isInsideDeathZone,
    cleanupDeathZoneEntities,
  };
}

export { createWorldSystem };
