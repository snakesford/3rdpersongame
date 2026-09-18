import { combatSession } from './modules/combat-session.js';
import { clamp, distance } from "./modules/math.js";
import {
  buildings,
  enemies,
  hero,
  heroGrenades,
  heroProjectiles,
  humveeExhaustParticles,
  mouse,
  player,
  runtime,
  stones,
  trees,
  tutorialRangeTargets,
  villageFences,
  villageProps,
} from "./modules/state.js";
import { DODGE_ARENA_TILE, TUTORIAL_TILE, TUTORIAL_WORLD, WORLD } from "./modules/constants.js";
import { ctx, statusTextEl } from "./modules/dom.js";
import { exhaustImage, fireImage } from "./modules/assets.js";
import { getMovementInput } from "./inputs.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createVehiclesSystem(services) {
  const HUMVEE_WEAPONS = {
    machineGun: { name: "Mounted Gun", ammo: 300, damage: 50, width: 30, speed: 720, radius: 0, range: 1200 },
    grenade40: { name: "40mm Grenade Launcher", ammo: 75, damage: 120, width: 42, speed: 1000, radius: 110, interval: 2, range: 850 },
    howitzer50: { name: "50mm Howitzer Cannon", ammo: 15, damage: 600, width: 38, speed: 2400, radius: 200, interval: 3, range: 1600 },
  };

  const HUMVEE_TECH = {
    trophy: { name: "Trophy System", description: "40% chance to completely block each incoming attack." },
    repair: { name: "Repair Kit", description: "Restores 10 HP per second after 5 seconds without taking damage." },
  };

  const SMART_MISSILE = { count: 6, damage: 150, blastRadius: 95, targetRange: 700, speed: 600, cooldown: 12, range: 1500 };

  function vehicleRequest(operation, extra={}) {
    const v=getOccupiedHumvee(), x=v?v.x+v.w/2:hero.x, y=v?v.y+v.h*0.2:hero.y;
    return combatSession.send?.({kind:'vehicle',operation,angle:Math.atan2(mouse.worldY-y,mouse.worldX-x),distance:Math.hypot(mouse.worldX-x,mouse.worldY-y),...extra}) || false;
  }

  function updateHumveeInventory() {
    const vehicle = getOccupiedHumvee();
    const tab = document.getElementById("inventoryHumveeTab");
    tab.classList.toggle("hidden", !vehicle);
    if (!vehicle) {
      if (tab.getAttribute("aria-selected") === "true") services.selectInventoryTab("equipment");
      return;
    }
    document.getElementById("inventoryHumveeHealth").textContent = `${Math.max(0, Math.ceil(vehicle.hp))} / ${vehicle.maxHp}`;
    document.getElementById("inventoryHumveeAmmo").textContent = `${vehicle.ammo} / ${vehicle.maxAmmo}`;
    document.getElementById("inventoryHumveeDamage").textContent = String(HUMVEE_WEAPONS[vehicle.mountedWeapon].damage);
    document.querySelector("[data-humvee-slot] .inventory-ability-name").textContent = HUMVEE_WEAPONS[vehicle.mountedWeapon].name;
    document.querySelector('[data-humvee-slot="2"] .inventory-ability-name').textContent = HUMVEE_TECH[vehicle.tech]?.name || "Empty";
  }

  function selectHumveeAbilitySlot(slot) {
    document.querySelectorAll("[data-humvee-slot]").forEach((entry) => {
      entry.setAttribute("aria-pressed", String(entry === slot));
    });
    const details = document.getElementById("inventoryHumveeDetails");
    const title = document.createElement("h2");
    if (slot.dataset.humveeSlot === "2") {
      title.textContent = "Tech";
      const options = document.createElement("ul");
      options.className = "inventory-humvee-weapons";
      const vehicle = getOccupiedHumvee();
      for (const [id, tech] of Object.entries(HUMVEE_TECH)) {
        const option = document.createElement("li");
        option.textContent = `${tech.name}${vehicle.tech === id ? " (Equipped)" : ""} — ${tech.description} Press Q while driving to toggle on/off.`;
        option.draggable = true;
        option.tabIndex = 0;
        option.setAttribute("role", "button");
        option.setAttribute("aria-pressed", String(vehicle.tech === id));
        option.title = "Drag onto the Tech slot, or click to equip";
        option.addEventListener("dragstart", (event) => {
          runtime.draggedHumveeTech = { id, vehicleId: vehicle.id };
          event.dataTransfer.setData("text/plain", id);
          event.dataTransfer.effectAllowed = "move";
        });
        option.addEventListener("dragend", () => { runtime.draggedHumveeTech = null; slot.classList.remove("ability-drop-ready"); });
        option.addEventListener("click", () => equipHumveeTech(id));
        option.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); equipHumveeTech(id); }
        });
        options.appendChild(option);
      }
      details.replaceChildren(title, options);
      return;
    }
    if (slot.dataset.humveeSlot !== "0") {
      title.textContent = "Secondary — Smart Missile";
      const description = document.createElement("p");
      description.textContent = `Press F while driving to launch ${SMART_MISSILE.count} homing missiles at the nearest target within ${SMART_MISSILE.targetRange} units. Each detonates for up to ${SMART_MISSILE.damage} area damage with fragmentation. With no target, missiles launch in random directions. ${SMART_MISSILE.cooldown}-second cooldown.`;
      details.replaceChildren(title, description);
      return;
    }
    title.textContent = "Primary Weapons";
    const weapons = document.createElement("ul");
    weapons.className = "inventory-humvee-weapons";
    const vehicle = getOccupiedHumvee();
    for (const [id, config] of Object.entries(HUMVEE_WEAPONS)) {
      if (id === vehicle.mountedWeapon) continue;
      const weapon = document.createElement("li");
      weapon.textContent = `${config.name} · ${vehicle.weaponAmmo[id]} rounds`;
      weapon.draggable = true;
      weapon.tabIndex = 0;
      weapon.setAttribute("role", "button");
      weapon.title = "Drag onto the Primary slot, or click to equip";
      weapon.addEventListener("dragstart", (event) => {
        runtime.draggedHumveeWeapon = { id, vehicleId: vehicle.id };
        event.dataTransfer.setData("text/plain", id);
        event.dataTransfer.effectAllowed = "move";
      });
      weapon.addEventListener("dragend", () => { runtime.draggedHumveeWeapon = null; slot.classList.remove("ability-drop-ready"); });
      weapon.addEventListener("click", () => equipHumveeWeapon(id));
      weapon.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); equipHumveeWeapon(id); }
      });
      weapons.appendChild(weapon);
    }
    details.replaceChildren(title, weapons);
  }

  function equipHumveeTech(id) {
    const vehicle = getOccupiedHumvee();
    if (!vehicle || !player.inventoryOpen || !HUMVEE_TECH[id]) return;
    if (combatSession.active) return vehicleRequest('tech',{tech:id});
    if (vehicle.tech !== id) vehicle.techActive = false;
    vehicle.tech = id;
    updateHumveeInventory();
    selectHumveeAbilitySlot(document.querySelector('[data-humvee-slot="2"]'));
  }

  function toggleHumveeTech() {
    const vehicle = getOccupiedHumvee();
    if (!vehicle?.tech || vehicle.hp <= 0 || hero.hp <= 0 || services.isInterfacePanelOpen()
      || player.victory || player.loss) return false;
    if (combatSession.active) return vehicleRequest('toggleTech');
    vehicle.techActive = !vehicle.techActive;
    services.spawnTextPopup(vehicle.x + vehicle.w / 2, vehicle.y - 25,
      `${HUMVEE_TECH[vehicle.tech].name}: ${vehicle.techActive ? "Active" : "Off"}`,
      "rgba(156, 225, 255, 1)", 1.1);
    services.updateAbilityUI();
    return true;
  }

  function updateHumveeTech(dt) {
    for (const vehicle of buildings) {
      if (vehicle.type !== "humvee" || vehicle.hp <= 0) continue;
      const repairTime = Math.max(0, dt - vehicle.repairDelay);
      vehicle.repairDelay = Math.max(0, vehicle.repairDelay - dt);
      if (vehicle.techActive && vehicle.tech === "repair" && repairTime > 0) {
        vehicle.hp = Math.min(vehicle.maxHp, vehicle.hp + 10 * repairTime);
      }
    }
  }

  function equipHumveeWeapon(id) {
    const vehicle = getOccupiedHumvee();
    if (!vehicle || !player.inventoryOpen || !HUMVEE_WEAPONS[id]) return;
    if (combatSession.active) return vehicleRequest('equip',{weapon:id});
    vehicle.weaponAmmo[vehicle.mountedWeapon] = vehicle.ammo;
    vehicle.mountedWeapon = id;
    vehicle.ammo = vehicle.weaponAmmo[id];
    vehicle.maxAmmo = HUMVEE_WEAPONS[id].ammo;
    updateHumveeInventory();
    selectHumveeAbilitySlot(document.querySelector("[data-humvee-slot]"));
  }

  function registerVehicleInventoryControls() {
    document.querySelectorAll("[data-humvee-slot]").forEach((slot) => {
      slot.addEventListener("click", () => selectHumveeAbilitySlot(slot));
      const canDrop = () => {
        const dragged = slot.dataset.humveeSlot === "2" ? runtime.draggedHumveeTech
          : slot.dataset.humveeSlot === "0" ? runtime.draggedHumveeWeapon : null;
        return player.inventoryOpen && dragged && getOccupiedHumvee()?.id === dragged.vehicleId;
      };
      slot.addEventListener("dragover", (event) => {
        if (!canDrop()) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        slot.classList.add("ability-drop-ready");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("ability-drop-ready"));
      slot.addEventListener("drop", (event) => {
        if (!canDrop()) return;
        event.preventDefault();
        if (slot.dataset.humveeSlot === "2") equipHumveeTech(runtime.draggedHumveeTech.id);
        else equipHumveeWeapon(runtime.draggedHumveeWeapon.id);
        runtime.draggedHumveeWeapon = null;
        runtime.draggedHumveeTech = null;
        slot.classList.remove("ability-drop-ready");
      });
    });
  }

  function getOccupiedHumvee() {
    return buildings.find((building) => building.id === hero.vehicleId && building.type === "humvee") || null;
  }

  function getNearbyHumvee() {
    return buildings.find((building) => building.type === "humvee" && building.hp > 0
      && Math.hypot(hero.x - clamp(hero.x, building.x, building.x + building.w),
        hero.y - clamp(hero.y, building.y, building.y + building.h)) <= hero.radius + 36) || null;
  }

  function exitHumvee() {
    if (combatSession.active) return vehicleRequest('exit');
    const vehicle = getOccupiedHumvee();
    hero.vehicleId = null;
    if (vehicle) {
      hero.x = clamp(vehicle.x + vehicle.w / 2, hero.radius, WORLD.width - hero.radius);
      hero.y = clamp(vehicle.y + vehicle.h + hero.radius + 8, hero.radius, services.getWorldHeight() - hero.radius);
      services.resolveHeroObstacleCollisions();
    }
    mouse.leftDown = false;
    hero.isMoving = false;
    services.updateAbilityUI();
  }

  function enterHumvee(vehicle) {
    if (combatSession.active) return vehicleRequest('enter',{vehicleId:vehicle?.id});
    if (!vehicle || vehicle.hp <= 0 || hero.isDead || hero.hp <= 0) return;
    if (vehicle.driverId) {
      if (services.npcState.trainingDriver?.id !== vehicle.driverId) return;
      services.releaseDriverVehicle();
      // Use the player's clear approach position as the Driver's exit point.
      services.npcState.trainingDriver.x = hero.x;
      services.npcState.trainingDriver.y = hero.y;
      services.spawnTextPopup(services.npcState.trainingDriver.x, services.npcState.trainingDriver.y - 30, "Driver ejected",
        "rgba(170, 225, 255, 1)", 1.2);
    }
    services.cancelHarvest();
    services.cancelGrenadeAim();
    mouse.leftDown = false;
    player.isPlacingBuilding = false;
    hero.sprintTimer = 0;
    hero.dashTimer = 0;
    hero.slashArcTimer = 0;
    hero.abilityEffect = null;
    hero.battleMedicineUseTimer = 0;
    hero.isReloading = false;
    hero.vehicleId = vehicle.id;
    vehicle.playerOwned = true;
    hero.x = vehicle.x + vehicle.w / 2;
    hero.y = vehicle.y + vehicle.h / 2;
    services.updateAbilityUI();
    statusTextEl.textContent = "Driving Humvee. WASD to move. E to exit. Abilities disabled.";
  }

  function getHumveeRamTargets() {
    return [...enemies.filter((enemy) => enemy.hp > 0 && enemy.active !== false),
      ...(runtime.enemyHero?.active && runtime.enemyHero.hp > 0 ? [runtime.enemyHero] : [])];
  }

  function humveeTargetDistance(vehicle, target, x = vehicle.x, y = vehicle.y) {
    return Math.hypot(target.x - clamp(target.x, x, x + vehicle.w),
      target.y - clamp(target.y, y, y + vehicle.h));
  }

  function moveHumveeWithRamming(vehicle, x, y) {
    if (!canMoveHumvee(vehicle, x, y, true)) return;
    vehicle.ramContacts ??= new Set();
    let blocked = false;
    for (const target of getHumveeRamTargets()) {
      if (humveeTargetDistance(vehicle, target, x, y) >= target.radius) continue;
      const boss = target.kind === "boss";
      if (boss) blocked = true;
      if (vehicle.ramContacts.has(target.id)) continue;
      vehicle.ramContacts.add(target.id);
      const damage = boss ? 150 : target.radius <= 20 ? target.hp : 200;
      services.dealDamage(target, damage, true);
      services.spawnTextPopup(target.x, target.y - target.radius - 18, boss ? "RAM HIT" : "RUN OVER",
        "rgba(255, 210, 138, 1)", 0.8);
    }
    if (!blocked) {
      vehicle.x = x;
      vehicle.y = y;
    }
  }

  function canMoveHumvee(vehicle, x, y, ignoreBosses = false) {
    if (x < 0 || y < 0 || x + vehicle.w > WORLD.width || y + vehicle.h > services.getWorldHeight()) return false;
    const overlapsRect = (rect) => x < rect.x + rect.w && x + vehicle.w > rect.x
      && y < rect.y + rect.h && y + vehicle.h > rect.y;
    if (buildings.some((other) => other !== vehicle && other.hp > 0 && overlapsRect(other))) return false;
    if (villageProps.some((prop) => prop.collidable && prop.shape === "rect" && overlapsRect(prop))) return false;
    const circles = villageProps.filter((prop) => prop.collidable && prop.shape !== "rect");
    if (circles.some((circle) => Math.hypot(circle.x - clamp(circle.x, x, x + vehicle.w),
      circle.y - clamp(circle.y, y, y + vehicle.h)) < circle.radius)) return false;
    if (!ignoreBosses && getHumveeRamTargets().some((target) => target.kind === "boss"
      && humveeTargetDistance(vehicle, target, x, y) < target.radius)) return false;
    return !villageFences.some((fence) => overlapsRect({
      x: Math.min(fence.x1, fence.x2) - 3, y: Math.min(fence.y1, fence.y2) - 3,
      w: Math.abs(fence.x2 - fence.x1) + 6, h: Math.abs(fence.y2 - fence.y1) + 6,
    }));
  }

  function humveeOverlapsTree(vehicle, x = vehicle.x, y = vehicle.y) {
    return trees.some((tree) => Math.hypot(
      tree.x - clamp(tree.x, x, x + vehicle.w),
      tree.y - clamp(tree.y, y, y + vehicle.h)
    ) < tree.radius);
  }

  function crushHumveeTrees(vehicle) {
    for (let index = trees.length - 1; index >= 0; index -= 1) {
      const tree = trees[index];
      if (tree.x - tree.radius < vehicle.x || tree.x + tree.radius > vehicle.x + vehicle.w
        || tree.y - tree.radius < vehicle.y || tree.y + tree.radius > vehicle.y + vehicle.h) continue;
      if (runtime.harvestTreeId === tree.id) services.cancelHarvest();
      trees.splice(index, 1);
      services.spawnTextPopup(tree.x, tree.y - tree.radius - 10, "Tree down", "rgba(201, 255, 184, 1)", 0.8);
    }
  }

  function getSmartMissileTarget(origin, ownerId, range = SMART_MISSILE.targetRange, includeTrainingTargets = true) {
    const targets = [
      ...enemies.filter((enemy) => enemy.hp > 0 && enemy.active !== false),
      ...(runtime.enemyHero?.active && runtime.enemyHero.hp > 0 ? [runtime.enemyHero] : []),
      ...buildings.filter((building) => building.id !== ownerId && !building.isPlayer && building.hp > 0
        && ["enemyBase", "barracks"].includes(building.type)),
      ...(includeTrainingTargets ? tutorialRangeTargets.filter((target) => !target.destroyed) : []),
    ];
    let nearest = null;
    let nearestDistance = range;
    for (const target of targets) {
      const dist = distance(origin, services.getEntityTargetPoint(target));
      if (dist <= nearestDistance) { nearest = target; nearestDistance = dist; }
    }
    return nearest;
  }

  function useSmartMissile() {
    const vehicle = getOccupiedHumvee();
    if (!vehicle || vehicle.hp <= 0 || hero.hp <= 0 || !player.hasSelectedCharacter
      || services.isInterfacePanelOpen() || player.victory || player.loss || vehicle.smartMissileCooldown > 0) return false;
    if (combatSession.active) return vehicleRequest('missile');
    const origin = { x: vehicle.x + vehicle.w / 2, y: vehicle.y + vehicle.h * 0.2 };
    const target = getSmartMissileTarget(origin, vehicle.id);
    const point = target ? services.getEntityTargetPoint(target) : null;
    const baseAngle = point ? Math.atan2(point.y - origin.y, point.x - origin.x) : Math.random() * Math.PI * 2;
    for (let index = 0; index < SMART_MISSILE.count; index += 1) {
      const angle = target ? baseAngle + (index - (SMART_MISSILE.count - 1) / 2) * 0.32
        : baseAngle + index * Math.PI * 2 / SMART_MISSILE.count + (Math.random() - 0.5) * 0.3;
      heroProjectiles.push({
        x: origin.x, y: origin.y, angle, speed: SMART_MISSILE.speed, radius: 6,
        width: 14, damage: SMART_MISSILE.damage, explosionRadius: SMART_MISSILE.blastRadius,
        ownerId: vehicle.id, target, style: "smartMissile", traveled: 0,
        maxDistance: SMART_MISSILE.range, active: true,
      });
    }
    vehicle.smartMissileCooldown = SMART_MISSILE.cooldown;
    services.updateAbilityUI();
    statusTextEl.textContent = "Smart Missile: six missiles launched!";
    return true;
  }

  function updateSmartMissile(projectile, dt) {
    const target = projectile.target;
    if (!target || target.hp <= 0 || target.destroyed || target.active === false) {
      projectile.target = getSmartMissileTarget(projectile, projectile.ownerId);
    }
    if (projectile.target) {
      const point = services.getEntityTargetPoint(projectile.target);
      const desired = Math.atan2(point.y - projectile.y, point.x - projectile.x);
      const difference = Math.atan2(Math.sin(desired - projectile.angle), Math.cos(desired - projectile.angle));
      projectile.angle += distance(projectile, point) < 120 ? difference : clamp(difference, -5 * dt, 5 * dt);
    }
    updateHumveeShell(projectile, dt);
  }

  function getHumveeGrenadeTarget(vehicle, targetX, targetY) {
    const startX = vehicle.x + vehicle.w / 2;
    const startY = vehicle.y + vehicle.h * 0.2;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.hypot(dx, dy);
    const range = Math.min(distance, HUMVEE_WEAPONS.grenade40.range);
    const scale = distance > 0 ? range / distance : 0;
    return { startX, startY, x: startX + dx * scale, y: startY + dy * scale,
      distance: range, arcHeight: clamp(range * 0.18, 30, 110) };
  }

  function fireHumveeGun(targetX, targetY) {
    const vehicle = getOccupiedHumvee();
    if (!vehicle || hero.hp <= 0 || services.isInterfacePanelOpen()) return false;
    if (combatSession.active) {
      const x=vehicle.x+vehicle.w/2,y=vehicle.y+vehicle.h*0.2;
      if(vehicle.gunCooldown>0 || vehicle.ammo<=0) return false;
      return vehicleRequest('fire',{angle:Math.atan2(targetY-y,targetX-x),distance:Math.hypot(targetX-x,targetY-y)});
    }
    return fireHumveeWeapon(vehicle, targetX, targetY);
  }

  function fireHumveeWeapon(vehicle, targetX, targetY) {
    if (!vehicle || vehicle.hp <= 0 || vehicle.ammo <= 0 || vehicle.gunCooldown > 0
      || player.victory || player.loss) return false;
    const x = vehicle.x + vehicle.w / 2;
    const y = vehicle.y + vehicle.h * 0.2;
    if (Math.hypot(targetX - x, targetY - y) < 1) return false;
    const angle = Math.atan2(targetY - y, targetX - x);
    const weapon = HUMVEE_WEAPONS[vehicle.mountedWeapon];
    if (vehicle.mountedWeapon === "grenade40") {
      const target = getHumveeGrenadeTarget(vehicle, targetX, targetY);
      const travelTime = Math.max(0.25, target.distance / weapon.speed);
      heroGrenades.push({
        x, y, startX: x, startY: y, targetX: target.x, targetY: target.y,
        radius: 12, arcHeight: target.arcHeight, arcCurve: "quadratic",
        ttl: travelTime, maxTtl: travelTime, damage: weapon.damage,
        explosionRadius: weapon.radius, ownerId: vehicle.id,
      });
    } else {
      const range = weapon.radius ? Math.min(weapon.range, Math.hypot(targetX - x, targetY - y)) : weapon.range;
      const projectile = services.spawnBurstProjectile({ baseAngle: angle, angleOffset: 0, range }, weapon.damage, weapon.width);
      projectile.speed = weapon.speed;
      projectile.explosionRadius = weapon.radius;
      projectile.ownerId = vehicle.id;
      projectile.damagesTrees = vehicle.mountedWeapon === "machineGun";
      if (weapon.radius) projectile.canHeadshot = false;
      projectile.x = x;
      projectile.y = y;
      projectile.hitIds.add(vehicle.id);
      heroProjectiles.push(projectile);
    }
    vehicle.ammo -= 1;
    vehicle.weaponAmmo[vehicle.mountedWeapon] = vehicle.ammo;
    vehicle.gunCooldown = weapon.interval || services.getRifleFireInterval() * 2;
    if (vehicle.mountedWeapon === "grenade40" || vehicle.mountedWeapon === "howitzer50") {
      const heavyRecoil = vehicle.mountedWeapon === "howitzer50";
      vehicle.recoilStartedAt = services.lastTimestamp;
      vehicle.recoilDuration = heavyRecoil ? 450 : 250;
      vehicle.recoilAmplitude = heavyRecoil ? 7 : 3;
    }
    return true;
  }

  function updateHumveeExhaust(dt) {
    for (let index = humveeExhaustParticles.length - 1; index >= 0; index -= 1) {
      const particle = humveeExhaustParticles[index];
      particle.ttl -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.ttl <= 0) humveeExhaustParticles.splice(index, 1);
    }
    for (const vehicle of buildings) {
      if (vehicle.type !== "humvee") continue;
      if (vehicle.hp <= 0 || (vehicle.id !== hero.vehicleId && !vehicle.driverId)) {
        vehicle.exhaustTimer = 0;
        continue;
      }
      vehicle.exhaustTimer = (vehicle.exhaustTimer || 0) - dt;
      while (vehicle.exhaustTimer <= 0) {
        const direction = vehicle.facingLeft ? 1 : -1;
        humveeExhaustParticles.push({
          x: vehicle.x + (vehicle.facingLeft ? vehicle.w + 2 : -2),
          y: vehicle.y + vehicle.h * 0.78,
          vx: direction * (26 + Math.random() * 18),
          vy: -10 - Math.random() * 12,
          size: 24 + Math.random() * 10,
          angle: Math.random() * Math.PI * 2,
          ttl: 1.2,
          maxTtl: 1.2,
        });
        vehicle.exhaustTimer += 0.12;
      }
    }
  }

  function drawHumveeExhaust() {
    if (!exhaustImage.complete || exhaustImage.naturalWidth === 0) return;
    ctx.save();
    for (const particle of humveeExhaustParticles) {
      const progress = 1 - particle.ttl / particle.maxTtl;
      const size = particle.size + progress * 38;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.55;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle);
      ctx.drawImage(exhaustImage, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();
  }

  function updateHumveeRockTilt(dt) {
    for (const vehicle of buildings) {
      if (vehicle.type !== "humvee") continue;
      const angle = vehicle.driveAngle ?? (vehicle.facingLeft ? Math.PI : 0);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const centerX = vehicle.x + vehicle.w / 2;
      const centerY = vehicle.y + vehicle.h / 2;
      let targetTilt = 0;
      let targetLift = 0;
      for (const rock of stones) {
        const closestX = clamp(rock.x, vehicle.x, vehicle.x + vehicle.w);
        const closestY = clamp(rock.y, vehicle.y, vehicle.y + vehicle.h);
        if (Math.hypot(rock.x - closestX, rock.y - closestY) >= rock.radius) continue;
        const extent = rock.radius + Math.abs(dx) * vehicle.w / 2 + Math.abs(dy) * vehicle.h / 2;
        const progress = clamp(((centerX - rock.x) * dx + (centerY - rock.y) * dy) / extent, -1, 1);
        const lift = Math.cos(progress * Math.PI / 2) * Math.min(8, rock.radius * 0.3);
        if (lift > targetLift) {
          targetLift = lift;
          targetTilt = Math.sin(progress * Math.PI) * 0.2 * (vehicle.facingLeft ? -1 : 1);
        }
      }
      const smoothing = 1 - Math.exp(-12 * dt);
      vehicle.rockTilt = (vehicle.rockTilt || 0) + (targetTilt - (vehicle.rockTilt || 0)) * smoothing;
      vehicle.rockLift = (vehicle.rockLift || 0) + (targetLift - (vehicle.rockLift || 0)) * smoothing;
    }
  }

  function updateHumveeDriving(dt) {
    const vehicle = getOccupiedHumvee();
    if (!vehicle || vehicle.hp <= 0 || hero.hp <= 0) {
      exitHumvee();
      return;
    }
    vehicle.gunCooldown = Math.max(0, vehicle.gunCooldown - dt);
    vehicle.smartMissileCooldown = Math.max(0, vehicle.smartMissileCooldown - dt);
    if (!services.isInterfacePanelOpen() && !player.victory && !player.loss) {
      vehicle.ramContacts ??= new Set();
      const ramTargets = combatSession.active ? [] : getHumveeRamTargets();
      for (const id of vehicle.ramContacts) {
        const target = ramTargets.find((entry) => entry.id === id);
        if (!target || humveeTargetDistance(vehicle, target) > target.radius + 12) vehicle.ramContacts.delete(id);
      }
      const { dx, dy } = getMovementInput();
      const length = Math.hypot(dx, dy) || 1;
      const travel = 320 * services.getRoadSpeedMultiplier() * dt;
      // Small steps prevent driving through thin obstacles during long frames.
      const steps = Math.max(1, Math.ceil(travel / 8));
      for (let step = 0; step < steps; step += 1) {
        const stepX = dx / length * travel / steps;
        const stepY = dy / length * travel / steps;
        const speedMultiplier = humveeOverlapsTree(vehicle)
          || humveeOverlapsTree(vehicle, vehicle.x + stepX, vehicle.y + stepY) ? 0.75 : 1;
        const nextX = vehicle.x + stepX * speedMultiplier;
        if (nextX !== vehicle.x) {
          if(combatSession.active) {if(canMoveHumvee(vehicle,nextX,vehicle.y,true)) vehicle.x=nextX;}
          else moveHumveeWithRamming(vehicle, nextX, vehicle.y);
        }
        const nextY = vehicle.y + stepY * speedMultiplier;
        if (nextY !== vehicle.y) {
          if(combatSession.active) {if(canMoveHumvee(vehicle,vehicle.x,nextY,true)) vehicle.y=nextY;}
          else moveHumveeWithRamming(vehicle, vehicle.x, nextY);
        }
        if ((dx || dy) && !combatSession.active) crushHumveeTrees(vehicle);
      }
      if (dx) vehicle.facingLeft = dx < 0;
      if (dx || dy) vehicle.driveAngle = Math.atan2(dy, dx);
    }
    hero.x = vehicle.x + vehicle.w / 2;
    hero.y = vehicle.y + vehicle.h / 2;
    hero.isMoving = false;
    vehicle.portalCooldown = Math.max(0, (vehicle.portalCooldown || 0) - dt);
    if (!services.isInterfacePanelOpen() && !player.victory && !player.loss && updateHumveePortals(vehicle)) return;
    if (mouse.leftDown) fireHumveeGun(mouse.worldX, mouse.worldY);
    statusTextEl.textContent = `Humvee ammo: ${vehicle.ammo}/${vehicle.maxAmmo}. WASD to move. ${vehicle.mountedWeapon === "grenade40" ? "Hold left-click to aim and auto-fire." : "Hold left-click to fire."} E to exit.`;
    services.updateAbilityUI();
  }

  function getHumveeTravelTiles() {
    const tiles = services.getVillagePortals().map((tile) => ({ ...tile }));
    if (player.inTutorialWorld) {
      tiles.push({ x: TUTORIAL_WORLD.returnTileX, y: TUTORIAL_WORLD.returnTileY,
        size: TUTORIAL_WORLD.returnTileSize, destination: "main" });
    } else if (!player.inVillageWorld && !player.inWaveWorld) {
      tiles.push({ ...TUTORIAL_TILE, destination: "training" });
      if (!player.inDodgeArena) tiles.push({ ...DODGE_ARENA_TILE, destination: "arena" });
    }
    return tiles;
  }

  function humveeOverlapsTile(vehicle, tile) {
    return vehicle.x < tile.x + tile.size && vehicle.x + vehicle.w > tile.x
      && vehicle.y < tile.y + tile.size && vehicle.y + vehicle.h > tile.y;
  }

  function teleportHumvee(travel) {
    const vehicle = getOccupiedHumvee();
    if (!vehicle) return false;
    // World initialization clears entities; retain this vehicle and its state.
    hero.vehicleId = null;
    travel();
    for (let index = buildings.length - 1; index >= 0; index -= 1) {
      if (buildings[index].type === "humvee") buildings.splice(index, 1);
    }
    buildings.push(vehicle);
    const arrivalX = hero.x - vehicle.w / 2;
    const arrivalY = hero.y - vehicle.h / 2;
    const tiles = getHumveeTravelTiles();
    let arrival = null;
    // Search outward from the destination spawn for a clear parking space.
    for (let radius = 0; radius <= Math.max(WORLD.width, services.getWorldHeight()) && !arrival; radius += 40) {
      for (let dx = -radius; dx <= radius && !arrival; dx += 40) {
        for (const dy of radius === 0 ? [0] : [-radius, radius]) {
          const x = arrivalX + dx;
          const y = arrivalY + dy;
          if (canMoveHumvee(vehicle, x, y) && !tiles.some((tile) => humveeOverlapsTile({ ...vehicle, x, y }, tile))) {
            arrival = { x, y };
            break;
          }
        }
      }
    }
    vehicle.x = arrival?.x ?? clamp(arrivalX, 0, WORLD.width - vehicle.w);
    vehicle.y = arrival?.y ?? clamp(arrivalY, 0, services.getWorldHeight() - vehicle.h);
    vehicle.portalCooldown = 1;
    vehicle.rockTilt = 0;
    vehicle.rockLift = 0;
    if(combatSession.active) hero.vehicleId=vehicle.id;
    else enterHumvee(vehicle);
    hero.x=vehicle.x+vehicle.w/2; hero.y=vehicle.y+vehicle.h/2;
    services.updateCamera(1);
    return true;
  }

  function updateHumveePortals(vehicle) {
    if (vehicle.portalCooldown > 0) return false;
    const tile = getHumveeTravelTiles().find((entry) => humveeOverlapsTile(vehicle, entry));
    if (!tile) return false;
    const travel = {
      main: services.travelToMainWorld,
      training: services.activateTutorialWorld,
      village: services.activateVillageWorld,
      arena: services.enterDodgeArena,
      waves: services.activateWaveWorld,
    }[tile.destination];
    return travel ? teleportHumvee(travel) : false;
  }

  function updateHumveeShell(projectile, dt) {
    const travel = Math.min(projectile.speed * dt, projectile.maxDistance - projectile.traveled);
    const steps = Math.max(1, Math.ceil(travel / 6));
    for (let step = 0; step < steps; step += 1) {
      projectile.x += Math.cos(projectile.angle) * travel / steps;
      projectile.y += Math.sin(projectile.angle) * travel / steps;
      projectile.traveled += travel / steps;
      const hitsCircle = (target) => distance(projectile, target) <= projectile.radius + target.radius;
      const hit = trees.some(hitsCircle) || stones.some(hitsCircle)
        || enemies.some((enemy) => enemy.hp > 0 && hitsCircle(enemy))
        || (runtime.enemyHero.active && runtime.enemyHero.hp > 0 && hitsCircle(runtime.enemyHero))
        || tutorialRangeTargets.some((target) => !target.destroyed && hitsCircle(target))
        || buildings.some((building) => building.id !== projectile.ownerId && building.hp > 0
          && services.intersectsBuilding(projectile, projectile.radius, building));
      if (hit || projectile.traveled >= projectile.maxDistance - 0.001
        || projectile.x < 0 || projectile.y < 0 || projectile.x > WORLD.width || projectile.y > services.getWorldHeight()) {
        projectile.active = false;
        services.explodeGrenade({ targetX: projectile.x, targetY: projectile.y, damage: projectile.damage,
          explosionRadius: projectile.explosionRadius, ownerId: projectile.ownerId });
        return;
      }
    }
  }

  function getHumveeFireCount(hp) {
    return hp > 0 && hp < 400 ? Math.min(8, Math.ceil((400 - hp) / 50)) : 0;
  }

  function drawHumveeFire(vehicle) {
    const count = getHumveeFireCount(vehicle.hp);
    if (!count || !fireImage.complete || fireImage.naturalWidth === 0) return;
    const anchors = [
      [0.83, 0.66], [0.15, 0.72], [0.52, 0.78], [0.7, 0.52],
      [0.3, 0.66], [0.94, 0.82], [0.05, 0.85], [0.46, 0.48],
    ];
    const intensity = (400 - vehicle.hp) / 400;
    const time = services.lastTimestamp / 1000;
    ctx.save();
    for (let index = 0; index < count; index += 1) {
      const [x, y] = anchors[index];
      const flicker = Math.sin(time * 13 + index * 2.1);
      const height = 25 + intensity * 20 + flicker * 3;
      const width = height * fireImage.naturalWidth / fireImage.naturalHeight;
      ctx.globalAlpha = 0.8 + Math.sin(time * 17 + index) * 0.15;
      ctx.drawImage(fireImage, x * vehicle.w - width / 2 + flicker,
        y * vehicle.h - height, width, height);
    }
    ctx.restore();
  }

  function drawHumveeGrenadeAim() {
    const vehicle = getOccupiedHumvee();
    if (!vehicle || vehicle.mountedWeapon !== "grenade40" || !mouse.leftDown || services.isInterfacePanelOpen()) return;
    const target = getHumveeGrenadeTarget(vehicle, mouse.worldX, mouse.worldY);
    const ready = vehicle.ammo > 0 && vehicle.gunCooldown <= 0;
    ctx.save();
    ctx.strokeStyle = ready ? "rgba(255, 226, 170, 0.95)" : "rgba(255, 120, 100, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(target.startX, target.startY);
    ctx.quadraticCurveTo((target.startX + target.x) / 2,
      (target.startY + target.y) / 2 - target.arcHeight * 2, target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 186, 86, 0.16)";
    ctx.arc(target.x, target.y, HUMVEE_WEAPONS.grenade40.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "#fff4d2";
    ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSmartMissile(projectile) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.angle);
    ctx.fillStyle = "rgba(255, 165, 62, 0.75)";
    ctx.beginPath();
    ctx.moveTo(-11, -4);
    ctx.lineTo(-30 - Math.random() * 8, 0);
    ctx.lineTo(-11, 4);
    ctx.fill();
    ctx.fillStyle = "#b6c1bd";
    ctx.fillRect(-11, -4, 20, 8);
    ctx.fillStyle = "#e6ba6e";
    ctx.beginPath();
    ctx.moveTo(9, -4);
    ctx.lineTo(17, 0);
    ctx.lineTo(9, 4);
    ctx.fill();
    ctx.fillStyle = "#687d72";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-13, -9);
    ctx.lineTo(-13, 9);
    ctx.fill();
    ctx.restore();
  }

  return {
    HUMVEE_WEAPONS,
    HUMVEE_TECH,
    SMART_MISSILE,
    updateHumveeInventory,
    selectHumveeAbilitySlot,
    equipHumveeTech,
    toggleHumveeTech,
    updateHumveeTech,
    equipHumveeWeapon,
    registerVehicleInventoryControls,
    getOccupiedHumvee,
    getNearbyHumvee,
    exitHumvee,
    enterHumvee,
    getHumveeRamTargets,
    humveeTargetDistance,
    moveHumveeWithRamming,
    canMoveHumvee,
    humveeOverlapsTree,
    crushHumveeTrees,
    getSmartMissileTarget,
    useSmartMissile,
    updateSmartMissile,
    getHumveeGrenadeTarget,
    fireHumveeGun,
    fireHumveeWeapon,
    updateHumveeExhaust,
    drawHumveeExhaust,
    updateHumveeRockTilt,
    updateHumveeDriving,
    getHumveeTravelTiles,
    humveeOverlapsTile,
    teleportHumvee,
    updateHumveePortals,
    updateHumveeShell,
    getHumveeFireCount,
    drawHumveeFire,
    drawHumveeGrenadeAim,
    drawSmartMissile,
  };
}

export { createVehiclesSystem };
