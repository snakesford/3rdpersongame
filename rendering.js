import { clamp, distance } from "./modules/math.js";
import {
  buildings,
  camera,
  damagePopups,
  enemies,
  enemyProjectiles,
  grenadeAim,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  mouse,
  pickups,
  player,
  runtime,
  shootingRangeTutorial,
  sparkEffects,
  stones,
  trees,
  tutorialPlots,
  tutorialRangeTargets,
  tutorialSites,
  units,
  villageFences,
  villageFields,
  villagePaths,
  villageProps,
} from "./modules/state.js";
import { canvas, ctx, minimapCanvas, minimapCtx } from "./modules/dom.js";
import {
  COLORS,
  DEATH_ZONE,
  DEFAULT_ENEMY_NAME,
  DODGE_ARENA,
  DODGE_ARENA_TILE,
  MAIN_LANE_Y,
  MINIMAP_NEARBY_RADIUS,
  SOLDIER_GRENADE_RADIUS,
  SPAWN_STREAM_TILE,
  SPAWN_WAVE_TILE,
  TUTORIAL_TILE,
  TUTORIAL_WORLD,
  VILLAGE_WORLD,
  WORLD,
} from "./modules/constants.js";
import {
  archerDeadImage,
  archerImage,
  archerRunningImage,
  archerShootingImage,
  bowImage,
  grenadeImage,
  humveeImage,
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

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createRenderingSystem(services) {
  const viewport = { width: 0, height: 0, pixelRatio: 1 };

  function resizeCanvas() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    viewport.pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(viewport.width * viewport.pixelRatio);
    canvas.height = Math.round(viewport.height * viewport.pixelRatio);
    ctx.setTransform(canvas.width / viewport.width, 0, 0, canvas.height / viewport.height, 0, 0);
    // Setting canvas dimensions resets the context, including smoothing settings.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  function initializeCanvas() {
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  function screenToWorld(x, y) {
    return { x: x + camera.x, y: y + camera.y };
  }

  function updateCamera(dt) {
    camera.x = clamp(hero.x - viewport.width / 2, 0, Math.max(0, WORLD.width - viewport.width));
    camera.y = clamp(hero.y - viewport.height / 2, 0, Math.max(0, services.getWorldHeight() - viewport.height));
  }

  function drawBackground() {
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, 0, WORLD.width, services.getWorldHeight());
    if (player.inWaveWorld) return;

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
      ctx.fillRect(x, 0, 2, services.getWorldHeight());
    }
    for (let y = 0; y < services.getWorldHeight(); y += 120) {
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
    ctx.fillRect(services.FOREST_REGION.x, services.FOREST_REGION.y, services.FOREST_REGION.w, services.FOREST_REGION.h);
    for (const clearing of services.FOREST_CLEARINGS) {
      ctx.beginPath();
      ctx.fillStyle = clearing.color;
      ctx.arc(clearing.x, clearing.y, clearing.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(26, 51, 24, 0.38)";
    ctx.lineWidth = 4;
    ctx.strokeRect(services.FOREST_REGION.x, services.FOREST_REGION.y, services.FOREST_REGION.w, services.FOREST_REGION.h);
    ctx.fillStyle = "rgba(231, 242, 195, 0.82)";
    ctx.font = "700 18px Chakra Petch";
    ctx.fillText("FOREST FRONTIER", services.FOREST_REGION.x + 180, services.FOREST_REGION.y + 34);

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
    const scaleY = mapHeight / services.getWorldHeight();
    const toMapX = (x) => x * scaleX;
    const toMapY = (y) => y * scaleY;

    minimapCtx.clearRect(0, 0, mapWidth, mapHeight);
    minimapCtx.fillStyle = "#19301f";
    minimapCtx.fillRect(0, 0, mapWidth, mapHeight);
    if (player.inWaveWorld) {
      for (const entity of [hero, ...enemies]) {
        if (entity.hp <= 0) continue;
        minimapCtx.fillStyle = entity === hero ? "#9de0ff" : "#ff7878";
        minimapCtx.beginPath();
        minimapCtx.arc(toMapX(entity.x), toMapY(entity.y), 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }
      return;
    }

    if (player.inVillageWorld) {
      minimapCtx.fillStyle = "#9b895b";
      for (const path of villagePaths) {
        minimapCtx.fillRect(toMapX(path.x), toMapY(path.y), path.w * scaleX, path.h * scaleY);
      }
      minimapCtx.fillStyle = "#d7bf97";
      for (const building of buildings) {
        minimapCtx.fillRect(toMapX(building.x), toMapY(building.y), building.w * scaleX, building.h * scaleY);
      }
      for (const portal of services.getVillagePortals()) {
        minimapCtx.fillStyle = "#83d9ff";
        minimapCtx.fillRect(toMapX(portal.x), toMapY(portal.y), portal.size * scaleX, portal.size * scaleY);
      }
      minimapCtx.strokeStyle = "#d5b47c";
      const range = VILLAGE_WORLD.range;
      minimapCtx.strokeRect(toMapX(range.x), toMapY(range.y), range.w * scaleX, range.h * scaleY);
      services.drawTutorialNpcMinimap(toMapX, toMapY);
      minimapCtx.fillStyle = "#9de0ff";
      minimapCtx.beginPath();
      minimapCtx.arc(toMapX(hero.x), toMapY(hero.y), 3, 0, Math.PI * 2);
      minimapCtx.fill();
      return;
    }

    for (const portal of services.getVillagePortals()) {
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
    minimapCtx.fillRect(toMapX(services.FOREST_REGION.x), toMapY(services.FOREST_REGION.y), services.FOREST_REGION.w * scaleX, services.FOREST_REGION.h * scaleY);

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

    services.drawMainNpcMinimap(toMapX, toMapY);

    for (const camp of services.FOREST_CAMPS) {
      if (!camp.iconVisibleFromStart && !services.hasDiscoveredCamp(camp.id)) {
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

    if (runtime.enemyHero.active) {
      minimapCtx.fillStyle = "#ff7f7f";
      minimapCtx.beginPath();
      minimapCtx.arc(toMapX(runtime.enemyHero.x), toMapY(runtime.enemyHero.y), 3.5, 0, Math.PI * 2);
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
      Math.max(8, viewport.width * scaleX),
      Math.max(8, viewport.height * scaleY)
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
      const shootingLine = services.getShootingLine();
      const targetTiles = [
        { tile: services.getMovingTargetTile(), label: "MOVING", active: shootingRangeTutorial.movingTargets },
        { tile: services.getStaticTargetTile(), label: "STATIC", active: !shootingRangeTutorial.movingTargets },
      ];
      for (const { tile, label, active } of targetTiles) {
        ctx.fillStyle = active ? "#42735d" : "#486f91";
        ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
        ctx.strokeStyle = "#c1edff";
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x, tile.y, tile.size, tile.size);
        ctx.fillStyle = "#fff";
        ctx.font = "700 11px Chakra Petch";
        ctx.textAlign = "center";
        ctx.fillText(label, tile.x + tile.size / 2, tile.y + 24);
        ctx.fillText("TARGETS", tile.x + tile.size / 2, tile.y + 40);
        if (distance(hero, { x: tile.x + 32, y: tile.y + 32 }) <= 100) {
          ctx.fillText(active ? "Active" : "Step here to activate", tile.x + 32, tile.y - 10);
        }
      }
      ctx.fillStyle = "#5c492a";
      ctx.fillRect(shootingLine.x, shootingLine.y, shootingLine.w, shootingLine.h);
      ctx.fillStyle = "rgba(92, 73, 42, 0.55)";
      ctx.fillRect(services.getShootingRangeConfig().targetLaneX - 18, services.getShootingRangeConfig().farTargetY - 42, 174, 12);

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
    if (!helmetType || services.getHelmetArmorValue() <= 0) {
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

  function drawHeroSprite(image, x, y, size) {
    const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  }

  function drawSoldierHero() {
    const isBurstShooting = hero.abilityEffect?.effect === "burst" &&
      Boolean(hero.abilityEffect?.pendingShots && hero.abilityEffect.pendingShots.length > 0);
    const isRifleShooting = services.isSoldierRifleShooting();
    const isSemiAutoShooting = hero.hasRifle && hero.rifleFireMode === "semi" && hero.rifleShotAnimationTimer > 0;
    const isUsingMedicine = services.isUsingBattleMedicine();
    const isReloading = hero.hasRifle && hero.isReloading;
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
      : isReloading
        ? soldierReloadingImage
        : (isBurstShooting || isRifleShooting || isSemiAutoShooting)
          ? soldierShootingImage
          : hero.isMoving
            ? runningFrame
            : soldierIdleImage;
    const animationName = isUsingMedicine
      ? "soldierMedkit"
      : isReloading
        ? "soldierReloading"
        : (isBurstShooting || isRifleShooting || isSemiAutoShooting)
          ? "soldierShooting"
          : hero.isMoving
            ? runningFrameName
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
    if (animationName !== runtime.lastSoldierAnimationName) {
      console.log("Soldier animation changed:", animationName);
      runtime.lastSoldierAnimationName = animationName;
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
    // Use stationary dimensions, with a little extra width for running poses.
    const stationaryWidth = soldierIdleImage.naturalWidth || 1122;
    const stationaryHeight = soldierIdleImage.naturalHeight || 1402;
    const stationaryScale = size / Math.max(stationaryWidth, stationaryHeight);
    const runningWidthScale = runningFrames.includes(image) ? 1.30 : 1;
    const width = stationaryWidth * stationaryScale * runningWidthScale;
    const height = stationaryHeight * stationaryScale;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
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
      drawHeroSprite(archerDeadImage, hero.x, hero.y, size);
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
    drawHeroSprite(image, 0, 0, size);
    ctx.restore();
  }

  function drawBuilding(building) {
    if (building.type === "humvee") {
      ctx.save();
      if (humveeImage.complete && humveeImage.naturalWidth > 0) {
        // Fit the full source image inside the vehicle bounds without cropping or stretching.
        ctx.save();
        if ((hero.vehicleId === building.id || building.driverId) && building.hp > 0) {
          const vibrationTime = services.lastTimestamp / 1000;
          ctx.translate(Math.sin(vibrationTime * 71) * 0.24, Math.sin(vibrationTime * 89) * 0.36);
        }
        if (building.recoilDuration) {
          const elapsed = Math.max(0, services.lastTimestamp - building.recoilStartedAt);
          const strength = building.recoilAmplitude * Math.max(0, 1 - elapsed / building.recoilDuration);
          ctx.translate(Math.cos(elapsed * 0.075) * strength, Math.sin(elapsed * 0.095) * strength * 0.75);
        }
        const pivotX = building.x + building.w / 2;
        const pivotY = building.y + building.h / 2;
        ctx.translate(pivotX, pivotY - (building.rockLift || 0));
        ctx.rotate(building.rockTilt || 0);
        ctx.translate(-pivotX, -pivotY);
        ctx.translate(building.x + (building.facingLeft ? building.w : 0), building.y);
        if (building.facingLeft) ctx.scale(-1, 1);
        const spriteScale = Math.min(building.w / humveeImage.naturalWidth, building.h / humveeImage.naturalHeight);
        const spriteWidth = humveeImage.naturalWidth * spriteScale;
        const spriteHeight = humveeImage.naturalHeight * spriteScale;
        ctx.drawImage(humveeImage, (building.w - spriteWidth) / 2, building.h - spriteHeight, spriteWidth, spriteHeight);
        services.drawHumveeFire(building);
        ctx.restore();
      }
      drawHealthBar(building.x + building.w / 2, building.y - 18, 150, building.hp / building.maxHp);
      drawNameplate(building.x + building.w / 2, building.y - 34,
        `Humvee${building.driverId ? " · Driver" : ""} • ${Math.max(0, Math.ceil(building.hp))} / ${building.maxHp} HP`, "rgba(15, 33, 24, 0.9)");
      ctx.restore();
      return;
    }
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
      const arcOffset = (grenade.arcCurve === "quadratic" ? 4 * progress * (1 - progress) : Math.sin(progress * Math.PI)) * grenade.arcHeight;
      if (grenadeImage.complete && grenadeImage.naturalWidth > 0) {
        const size = grenade.radius * 3;
        const scale = size / Math.max(grenadeImage.naturalWidth, grenadeImage.naturalHeight);
        const width = grenadeImage.naturalWidth * scale;
        const height = grenadeImage.naturalHeight * scale;
        ctx.drawImage(grenadeImage, grenade.x - width / 2, grenade.y - arcOffset - height / 2, width, height);
        continue;
      }
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
      const coreRadius = (8 + progress * 18) * (shockwave.coreScale || 1);

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

    if (services.isBountyHunter()) {
      ctx.save(); ctx.strokeStyle = "#f4bc65"; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(hero.x, hero.y);
      const angle = Math.atan2(mouse.worldY - hero.y, mouse.worldX - hero.x);
      const range = Math.min(600, Math.hypot(mouse.worldX - hero.x, mouse.worldY - hero.y));
      const aimX = hero.x + Math.cos(angle) * range, aimY = hero.y + Math.sin(angle) * range;
      ctx.lineTo(aimX, aimY); ctx.stroke();
      ctx.beginPath(); ctx.arc(aimX, aimY, 80, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); return;
    }
    const target = services.getClampedGrenadeTarget(mouse.worldX, mouse.worldY);
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

  function drawHeroProjectiles() {
    for (const projectile of heroProjectiles) {
      if (projectile.style === "engineerBolt") {
        services.drawEngineerBolt(projectile);
        continue;
      }
      if (projectile.style === "explosiveBolt") {
        drawArrowProjectile(projectile);
        continue;
      }
      if (projectile.style === "smartMissile") {
        services.drawSmartMissile(projectile);
        continue;
      }
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

  function drawModeHint() {
    const vehicle = services.getOccupiedHumvee() || services.getNearbyHumvee();
    if (vehicle && player.hasSelectedCharacter && !hero.isDead && !services.isInterfacePanelOpen()) {
      drawNameplate(vehicle.x + vehicle.w / 2, vehicle.y + vehicle.h + 24,
        hero.vehicleId !== null ? "E · Exit" : vehicle.driverId ? "E · Take control" : "E", "rgba(15, 33, 24, 0.9)");
      return;
    }
    if (services.drawTutorialNpcHint()) return;

    const tutorialPlot = services.getNearbyTutorialPlot();
    if (tutorialPlot && !services.isDialogueOpen()) {
      ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
      ctx.fillRect(tutorialPlot.x - 8, tutorialPlot.y - 38, 116, 26);
      ctx.fillStyle = "#fff5d2";
      ctx.font = "600 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("Press E", tutorialPlot.x + tutorialPlot.w / 2, tutorialPlot.y - 20);
      return;
    }

    const tutorialSite = services.getNearbyTutorialSite();
    if (tutorialSite && !services.isDialogueOpen()) {
      ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
      ctx.fillRect(tutorialSite.x - 52, tutorialSite.y - 68, 104, 26);
      ctx.fillStyle = "#fff5d2";
      ctx.font = "600 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("Press E", tutorialSite.x, tutorialSite.y - 50);
      return;
    }

    if (services.drawVillagerHint()) return;

    const nearbyPickup = services.getNearbyPickup();
    if (nearbyPickup) {
      ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
      ctx.fillRect(nearbyPickup.x - 52, nearbyPickup.y - 72, 104, 26);
      ctx.fillStyle = "#fff5d2";
      ctx.font = "600 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("Press E", nearbyPickup.x, nearbyPickup.y - 54);
      return;
    }

    const tree = services.getNearbyTree();
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
    if (viewport.pixelRatio !== (window.devicePixelRatio || 1)) {
      resizeCanvas();
    }
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawBackground();
    services.drawVillagePortals();
    services.drawTrainingAmmoStockpile();

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
    services.drawTutorialNpcs();
    services.drawTrainingDriver();

    services.drawVillager();

    services.drawHumveeExhaust();
    for (const building of buildings) {
      drawBuilding(building);
    }
    services.drawTrader();

    if (hero.vehicleId === null) {
      if (hero.selectedClass === "stickman") {
        drawHeroStickFigure();
      } else if (hero.selectedClass === "soldier") {
        drawSoldierHero();
      } else if (services.isEngineer()) {
        services.drawEngineerHero();
      } else if (services.isBountyHunter()) {
        services.drawBountyHunter();
      } else if (hero.selectedClass === "archer") {
        drawArcherHero();
      } else {
        drawEntityCircle(hero, COLORS.hero, COLORS.heroAccent);
      }
      drawHealthBar(hero.x, hero.y - 34, 60, hero.hp / hero.maxHp);
    }
    services.drawEngineerDeployables();
    services.drawBountyEffects();
    services.drawDodgeArenaBullets();
    drawHarvestProgress();
    drawSlashArc();
    drawGrenadeAimArc();
    services.drawHumveeGrenadeAim();
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

    if (runtime.enemyHero.active) {
      drawEntityCircle(runtime.enemyHero, COLORS.enemy, runtime.enemyHero.equippedArmorValue >= 80 ? "#86db7e" : "#f2b0b0");
      drawHealthBar(runtime.enemyHero.x, runtime.enemyHero.y - 34, 60, runtime.enemyHero.hp / runtime.enemyHero.maxHp);
      drawNameplate(runtime.enemyHero.x, runtime.enemyHero.y - 50, runtime.enemyHero.displayName || DEFAULT_ENEMY_NAME, "rgba(56, 18, 18, 0.9)");
    }

    drawDamagePopups();
    services.drawBuildPreview();
    services.drawSelectionBox();
    drawModeHint();

    ctx.restore();
    drawMinimap();
  }

  return {
    viewport,
    resizeCanvas,
    initializeCanvas,
    screenToWorld,
    updateCamera,
    drawBackground,
    drawVillageGround,
    drawMinimap,
    drawTree,
    drawStone,
    drawPickup,
    drawTutorialObjects,
    drawVillageProp,
    isVillageBuildingType,
    drawEntityCircle,
    getHeroHelmetStyle,
    drawHeroStickFigure,
    drawHeroSprite,
    drawSoldierHero,
    drawArcherHero,
    drawBuilding,
    drawHealthBar,
    drawNameplate,
    drawHarvestProgress,
    drawSlashArc,
    drawArrowProjectile,
    drawHeroGrenades,
    drawGrenadeShockwaves,
    drawGrenadeAimArc,
    drawBulletProjectile,
    drawHeroProjectiles,
    drawDamagePopups,
    drawSparkEffects,
    drawModeHint,
    render,
  };
}

export { createRenderingSystem };
