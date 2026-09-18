import { bountyHunterSprite, engineerSprite } from "./modules/assets.js";
import { clamp, distance } from "./modules/math.js";
import {
  buildings,
  enemies,
  engineerDeployables,
  grenadeAim,
  grenadeShockwaves,
  hero,
  heroGrenades,
  heroProjectiles,
  mouse,
  nextId,
  player,
  runtime,
  stones,
  trees,
  units,
} from "./modules/state.js";
import {
  abilityNameEl,
  battleMedicineAbilityEl,
  battleMedicineAbilityNameEl,
  battleMedicineCooldownTextEl,
  ctx,
  dashAbilityEl,
  dashAbilityNameEl,
  dashCooldownTextEl,
  grenadeAbilityEl,
  grenadeAbilityNameEl,
  grenadeCooldownTextEl,
  slashAbilityEl,
  slashCooldownTextEl,
  statusTextEl,
} from "./modules/dom.js";
import {
  SOLDIER_BATTLE_MEDICINE_COOLDOWN,
  SOLDIER_BATTLE_MEDICINE_DURATION,
  SOLDIER_BATTLE_MEDICINE_HEAL,
  SOLDIER_BATTLE_MEDICINE_REGEN_BONUS,
  SOLDIER_GRENADE_COOLDOWN,
} from "./modules/constants.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createAbilitiesSystem(services) {
  const SPRINT_DURATION = 5;

  const SPRINT_COOLDOWN = 10;

  const SPRINT_SPEED_MULTIPLIER = 2.5;

  const BATTLE_MEDICINE_USE_DURATION = 0.9;

  function canAimSoldierGrenade() {
    return player.hasSelectedCharacter &&
      !player.victory &&
      !player.loss &&
      !services.isInterfacePanelOpen() &&
      !player.isPlacingBuilding &&
      hero.selectedClass === "soldier" &&
      hero.grenadeCooldownRemaining <= 0;
  }

  function startGrenadeAim() {
    if (isEngineer()) return placeAutoTurret();
    if (isBountyHunter()) {
      if (canUseBountyAbility("G") && hero.grenadeCooldownRemaining <= 0) grenadeAim.active = true;
      return;
    }
    if (hero.vehicleId !== null) return false;
    if (!canAimSoldierGrenade()) {
      return false;
    }
    grenadeAim.active = true;
    statusTextEl.textContent = `Grenade readied. Release ${services.getOrderedInventoryAbilities().find((ability) => ability.actionKey === "G")?.key || "G"} to throw.`;
    return true;
  }

  function useBattleMedicine() {
    if (isEngineer()) return placeRepairStation();
    if (isBountyHunter()) return useAdrenalineShot();
    if (hero.vehicleId !== null) return false;
    if (
      !player.hasSelectedCharacter ||
      hero.selectedClass !== "soldier" ||
      player.victory ||
      player.loss ||
      services.isInterfacePanelOpen() ||
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
    services.spawnTextPopup(hero.x, hero.y - hero.radius - 28, `+${SOLDIER_BATTLE_MEDICINE_HEAL} HP`, "rgba(156, 245, 164, 1)", 1);
    services.spawnTextPopup(hero.x, hero.y - hero.radius - 6, `+${SOLDIER_BATTLE_MEDICINE_REGEN_BONUS} Regen`, "rgba(196, 255, 172, 1)", 1.2);
    statusTextEl.textContent = "Battle Medicine activated.";
    updateAbilityUI();
    return true;
  }

  function isUsingBattleMedicine() {
    return hero.selectedClass === "soldier" && hero.battleMedicineUseTimer > 0;
  }

  function cancelGrenadeAim() {
    grenadeAim.active = false;
  }

  function updateAbilityUI() {
    document.querySelectorAll(".ability-chip").forEach((chip) => {
      chip.style.opacity = hero.vehicleId !== null ? "0.35" : "";
      chip.setAttribute("aria-disabled", String(hero.vehicleId !== null));
    });
    const vehicle = services.getOccupiedHumvee();
    const missileChip = document.getElementById("smartMissileAbility");
    const techChip = document.getElementById("humveeTechAbility");
    techChip.classList.toggle("hidden", !vehicle?.tech);
    techChip.style.opacity = "";
    techChip.setAttribute("aria-disabled", String(!vehicle?.tech));
    techChip.classList.toggle("ready", Boolean(vehicle?.techActive));
    document.getElementById("humveeTechName").textContent = services.HUMVEE_TECH[vehicle?.tech]?.name || "Tech";
    document.getElementById("humveeTechStatus").textContent = vehicle?.techActive ? "Active" : "Off · Press Q";
    missileChip.classList.toggle("hidden", !vehicle);
    missileChip.style.opacity = "";
    missileChip.setAttribute("aria-disabled", String(!vehicle || vehicle.smartMissileCooldown > 0));
    missileChip.classList.toggle("ready", Boolean(vehicle && vehicle.smartMissileCooldown <= 0));
    missileChip.classList.toggle("cooldown", Boolean(vehicle && vehicle.smartMissileCooldown > 0));
    document.getElementById("smartMissileCooldownText").textContent = vehicle?.smartMissileCooldown > 0
      ? `${vehicle.smartMissileCooldown.toFixed(1)}s` : "Ready";
    const sprint = services.getOrderedInventoryAbilities().find((ability) => ability.name === "Sprint");
    const sprintChip = document.getElementById("sprintAbility");
    sprintChip.classList.toggle("hidden", Boolean(vehicle) || !sprint);
    sprintChip.classList.toggle("ready", hero.sprintCooldownRemaining <= 0);
    sprintChip.classList.toggle("cooldown", hero.sprintCooldownRemaining > 0);
    sprintChip.querySelector(".ability-icon").textContent = sprint?.key || "";
    document.getElementById("sprintCooldownText").textContent = hero.sprintTimer > 0
      ? `Active ${hero.sprintTimer.toFixed(1)}s`
      : hero.sprintCooldownRemaining > 0 ? `${hero.sprintCooldownRemaining.toFixed(1)}s` : "Ready";
    for (const ability of services.getOrderedInventoryAbilities()) {
      const keyLabel = {
        F: "#slashAbility .ability-icon",
        Q: "#battleMedicineAbility .ability-key",
        G: "#grenadeAbility .ability-key",
        Shift: "#dashAbility .ability-icon",
      }[ability.actionKey];
      if (keyLabel) document.querySelector(keyLabel).textContent = ability.key;
    }
    const selectedAbilityName = hero.selectedClass ? runtime.CHARACTER_OPTIONS[hero.selectedClass].abilityName : "";
    const showSlashAbility = !vehicle && services.getOrderedInventoryAbilities().some(a => a.actionKey === "F");
    const ready = hero.slashTimer <= 0;
    abilityNameEl.textContent = selectedAbilityName || "Choose Class";
    slashAbilityEl.classList.toggle("hidden", !showSlashAbility);
    slashAbilityEl.classList.toggle("ready", showSlashAbility && ready);
    slashAbilityEl.classList.toggle("cooldown", !showSlashAbility || !ready);
    slashCooldownTextEl.textContent = showSlashAbility && player.hasSelectedCharacter
      ? (ready ? "Ready" : `${hero.slashTimer.toFixed(1)}s`)
      : "Pick Hero";

    const showBattleMedicine = !vehicle && ["soldier", "bountyHunter", "engineer"].includes(hero.selectedClass) && services.getOrderedInventoryAbilities().some(a => a.actionKey === "Q");
    const battleMedicineReady = hero.battleMedicineCooldownRemaining <= 0;
    battleMedicineAbilityEl.classList.toggle("hidden", !showBattleMedicine);
    battleMedicineAbilityNameEl.textContent = isEngineer() ? "Repair Station" : isBountyHunter() ? "Adrenaline Shot" : hero.battleMedicineBuffTimer > 0 ? "Battle Medicine +" : "Battle Medicine";
    battleMedicineAbilityEl.classList.toggle("ready", showBattleMedicine && battleMedicineReady);
    battleMedicineAbilityEl.classList.toggle("cooldown", !showBattleMedicine || !battleMedicineReady);
    battleMedicineCooldownTextEl.textContent = !showBattleMedicine
      ? "Unavailable"
      : hero.battleMedicineBuffTimer > 0
        ? `${hero.battleMedicineBuffTimer.toFixed(1)}s buff`
        : battleMedicineReady
          ? "Ready"
          : `${hero.battleMedicineCooldownRemaining.toFixed(1)}s`;

    const showGrenade = !vehicle && ["soldier", "bountyHunter", "engineer"].includes(hero.selectedClass) && services.getOrderedInventoryAbilities().some(a => a.actionKey === "G");
    const grenadeReady = hero.grenadeCooldownRemaining <= 0;
    grenadeAbilityEl.classList.toggle("hidden", !showGrenade);
    grenadeAbilityNameEl.textContent = isEngineer() ? "Auto Turret" : isBountyHunter() ? "Explosive Bolt" : "Grenade";
    grenadeAbilityEl.classList.toggle("ready", showGrenade && grenadeReady);
    grenadeAbilityEl.classList.toggle("cooldown", !showGrenade || !grenadeReady);
    grenadeCooldownTextEl.textContent = !showGrenade
      ? "Unavailable"
      : grenadeReady
        ? "Ready"
        : `${hero.grenadeCooldownRemaining.toFixed(1)}s`;

    for (const [element, name] of [[battleMedicineAbilityEl, battleMedicineAbilityNameEl.textContent.replace(" +", "")], [grenadeAbilityEl, grenadeAbilityNameEl.textContent]]) {
      const img = element.querySelector("img");
      const path = services.getInventoryAbilityIcon({name});
      if (img.getAttribute("src") !== path) img.src = path;
      img.alt = name;
    }
    const markIcon = slashAbilityEl.querySelector(".ability-icon");
    markIcon.style.backgroundImage = isEngineer() ? "url('./images/bolt-shot.svg')" : isBountyHunter() ? "url('./images/hunters-mark.svg')" : "";
    markIcon.style.backgroundSize = "contain";
    if (isBountyHunter() && hero.adrenalineTimer > 0) battleMedicineCooldownTextEl.textContent = `${hero.adrenalineTimer.toFixed(1)}s boost · ${hero.battleMedicineCooldownRemaining.toFixed(1)}s cooldown`;
    if (isEngineer()) {
      const station = engineerDeployables.find(d => d.kind === "repairStation");
      const turret = getEngineerTurret();
      if (station) battleMedicineCooldownTextEl.textContent = `${station.ttl.toFixed(1)}s active · ${hero.battleMedicineCooldownRemaining.toFixed(1)}s cooldown`;
      if (turret) grenadeCooldownTextEl.textContent = `${Math.ceil(turret.hp)} HP · ${hero.grenadeCooldownRemaining > 0 ? hero.grenadeCooldownRemaining.toFixed(1) + "s" : "Ready"}`;
    }
    const showDash = !vehicle && hero.selectedClass === "robot";
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

  function isEngineer() { return hero.selectedClass === "engineer"; }

  function isBountyHunter() { return hero.selectedClass === "bountyHunter"; }

  function useSoldierGrenade(targetX, targetY) {
    if (isBountyHunter()) return fireExplosiveBolt(targetX, targetY);
    if (hero.vehicleId !== null) return false;
    if (
      !player.hasSelectedCharacter ||
      player.victory ||
      player.loss ||
      hero.selectedClass !== "soldier" ||
      hero.grenadeCooldownRemaining > 0
    ) {
      return false;
    }

    const target = services.getClampedGrenadeTarget(targetX, targetY);
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

  function useSlash(targetX = null, targetY = null) {
    if (hero.vehicleId !== null) return false;
    if (!player.hasSelectedCharacter || player.victory || player.loss || hero.slashTimer > 0) {
      return false;
    }

    const selectedClass = runtime.CHARACTER_OPTIONS[hero.selectedClass];
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
    if (selectedClass.effect === "engineerBolt") return useEngineerBoltShot();
    if (selectedClass.effect === "mark") return useHuntersMark();
    hero.slashCooldown = (!hero.hasRifle && !hero.hasBow && !hero.hasAxe)
      ? services.getClassWeaponCooldown(selectedClass)
      : selectedClass.cooldown;
    hero.slashTimer = hero.slashCooldown;
    hero.slashArcTimer = selectedClass.effect === "burst" ? 0.42 : 0.22;
    hero.abilityEffect = { ...selectedClass, aimAngle: hero.facingAngle };

    if (selectedClass.effect === "cone") {
      hero.slashRadius = selectedClass.radius + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.meleeStep;
      hero.slashHalfAngle = selectedClass.halfAngle;
      services.damageEnemiesInCone(services.getAbilityDamage(selectedClass), hero.slashRadius, selectedClass.halfAngle);
    } else if (selectedClass.effect === "line") {
      services.damageEnemiesInLine(
        services.getAbilityDamage(selectedClass),
        selectedClass.range + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.step,
        selectedClass.width
      );
    } else if (selectedClass.effect === "burst") {
      const burstBaseAngle = hero.abilityEffect.aimAngle;
      const shots = services.buildBurstShots(
        selectedClass.range + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.step,
        selectedClass.rounds,
        selectedClass.spreadAngle,
        selectedClass.shotAnglesDegrees
      );
      hero.abilityEffect.pendingShots = shots.map((shot, index) => ({
        ...shot,
        baseAngle: burstBaseAngle,
        damage: services.getAbilityDamage(selectedClass),
        width: selectedClass.width,
        delay: index * 0.045,
      }));
      hero.abilityEffect.projectiles = [];
    } else if (selectedClass.effect === "projectile") {
      hero.abilityEffect.projectiles = [services.buildArcherArrowProjectile(services.getAbilityDamage(selectedClass))];
    } else if (selectedClass.effect === "nova") {
      services.damageEnemiesInRadius(
        services.getAbilityDamage(selectedClass),
        selectedClass.radius + player.weaponDetailRangeLevel * services.getWeaponUpgradeRules().range.meleeStep
      );
    }

    updateAbilityUI();
    return true;
  }

  function useSprint() {
    if (hero.vehicleId !== null) return false;
    if (!player.hasSelectedCharacter || player.victory || player.loss || hero.hp <= 0
      || services.isInterfacePanelOpen() || hero.sprintCooldownRemaining > 0
      || !services.getOrderedInventoryAbilities().some((ability) => ability.name === "Sprint")) {
      return false;
    }
    hero.sprintTimer = SPRINT_DURATION;
    hero.sprintCooldownRemaining = SPRINT_COOLDOWN;
    statusTextEl.textContent = `Sprint activated: +150% movement speed for ${SPRINT_DURATION} seconds.`;
    updateAbilityUI();
    return true;
  }

  function useRobotDash() {
    if (hero.vehicleId !== null) return false;
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
      services.cancelHarvest();
    }
    statusTextEl.textContent = "Dash activated.";
    return true;
  }

  function updatePlayerCombatTimers(dt) {
    hero.adrenalineTimer = Math.max(0, hero.adrenalineTimer - dt);
    hero.hunterMarkTimer = Math.max(0, hero.hunterMarkTimer - dt);
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
    hero.sprintTimer = Math.max(0, hero.sprintTimer - dt);
    hero.sprintCooldownRemaining = Math.max(0, hero.sprintCooldownRemaining - dt);
    hero.dashCooldownRemaining = Math.max(0, hero.dashCooldownRemaining - dt);
    services.updateReload(dt);
  }

  function updateActiveAbility(dt) {
    if (hero.abilityEffect?.effect === "burst") {
      const pendingShots = hero.abilityEffect.pendingShots || [];
      const projectiles = hero.abilityEffect.projectiles || [];

      for (let index = pendingShots.length - 1; index >= 0; index -= 1) {
        pendingShots[index].delay -= dt;
        if (pendingShots[index].delay <= 0) {
          projectiles.push(services.spawnBurstProjectile(pendingShots[index], pendingShots[index].damage, pendingShots[index].width));
          pendingShots.splice(index, 1);
        }
      }

      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        services.updateBurstProjectile(projectiles[index], dt);
        if (!projectiles[index].active) {
          projectiles.splice(index, 1);
        }
      }
    } else if (hero.abilityEffect?.effect === "projectile") {
      const projectiles = hero.abilityEffect.projectiles || [];
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        services.updateAbilityProjectile(projectiles[index], dt);
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

  }

  function bountyTargets() {
    return [...enemies, runtime.enemyHero, ...buildings.filter(b => !b.isPlayer)].filter(t => t.hp > 0 && t.active !== false);
  }

  function canUseBountyAbility(key) {
    return isBountyHunter() && player.hasSelectedCharacter && hero.hp > 0 && !hero.isDead
      && hero.vehicleId === null && !player.isPlacingBuilding && !player.victory && !player.loss && !services.isInterfacePanelOpen()
      && services.getOrderedInventoryAbilities().some(a => a.actionKey === key);
  }

  function useHuntersMark() {
    if (!canUseBountyAbility("F") || hero.slashTimer > 0) return false;
    // This game aims with the cursor; mark only the enemy actually under it.
    const target = bountyTargets().find(t => t.w
      ? mouse.worldX >= t.x && mouse.worldX <= t.x + t.w && mouse.worldY >= t.y && mouse.worldY <= t.y + t.h
      : Math.hypot(t.x - mouse.worldX, t.y - mouse.worldY) <= t.radius + 12);
    if (!target) { statusTextEl.textContent = "Aim at an enemy to use Hunter’s Mark."; return false; }
    hero.hunterMarkTargetId = target.id;
    hero.hunterMarkTimer = 8;
    hero.slashTimer = 12;
    updateAbilityUI();
    return true;
  }

  function useAdrenalineShot() {
    if (!canUseBountyAbility("Q") || hero.battleMedicineCooldownRemaining > 0) return false;
    const healed = Math.min(30, hero.maxHp - hero.hp);
    hero.hp += healed;
    hero.adrenalineTimer = 6;
    hero.battleMedicineCooldownRemaining = 20;
    services.spawnTextPopup(hero.x, hero.y - 42, `+${healed} HP · Adrenaline`, "#a4f7cd", 1);
    updateAbilityUI();
    services.updateStatsUI();
    return true;
  }

  function fireExplosiveBolt(targetX, targetY) {
    if (!canUseBountyAbility("G") || hero.grenadeCooldownRemaining > 0 || !grenadeAim.active) return false;
    const range = Math.hypot(targetX - hero.x, targetY - hero.y);
    if (range < 1) return false;
    hero.facingAngle = Math.atan2(targetY - hero.y, targetX - hero.x);
    heroProjectiles.push({ ...services.spawnAbilityProjectile({damage: 45, range: Math.min(range, 600), speed: 900,
      width: 8, canHeadshot: false, style: "explosiveBolt"}), sourceClass: "bountyHunter" });
    hero.grenadeCooldownRemaining = 8;
    cancelGrenadeAim();
    updateAbilityUI();
    return true;
  }

  function detonateExplosiveBolt(projectile, directTarget = null) {
    if (directTarget) services.dealDamage(directTarget, 45, true, projectile.sourceClass);
    for (const target of bountyTargets()) {
      if (target !== directTarget && distance(projectile, services.getEntityTargetPoint(target)) <= 80) {
        services.dealDamage(target, 25, true, projectile.sourceClass);
      }
    }
    grenadeShockwaves.push({x: projectile.x, y: projectile.y, radius: 80, ttl: 0.25, maxTtl: 0.25, coreScale: 1,
      particles: Array.from({length: 20}, (_, i) => ({angle: i * Math.PI / 10, targetRadius: 80, speedScale: 1, drift: 0, size: 3, color: "255, 194, 88"}))});
    projectile.active = false;
  }

  function updateExplosiveBolt(projectile, dt) {
    // Substeps prevent a fast bolt from skipping a target at low frame rates.
    const travel = Math.min(projectile.speed * dt, projectile.maxDistance - projectile.traveled);
    const steps = Math.max(1, Math.ceil(travel / 4));
    for (let i = 0; i < steps && projectile.active; i++) {
      projectile.x += Math.cos(projectile.angle) * travel / steps;
      projectile.y += Math.sin(projectile.angle) * travel / steps;
      projectile.traveled += travel / steps;
      if (trees.some(t => services.intersectsTree(projectile, projectile.radius, t)) || stones.some(t => services.intersectsStone(projectile, projectile.radius, t))) {
        detonateExplosiveBolt(projectile); return;
      }
      const target = bountyTargets().find(t => t.w ? services.intersectsBuilding(projectile, projectile.radius, t)
        : distance(projectile, t) <= projectile.radius + t.radius);
      if (target) { detonateExplosiveBolt(projectile, target); return; }
      if (services.tryHitTutorialRangeTarget(projectile)) { detonateExplosiveBolt(projectile); return; }
    }
    if (projectile.traveled >= projectile.maxDistance - 0.001) detonateExplosiveBolt(projectile);
  }

  function drawBountyHunter(subject = hero) {
    ctx.save();
    ctx.translate(subject.x, subject.y);
    if (Math.cos(subject.facingAngle) < 0) ctx.scale(-1, 1);
    const bob = subject.isMoving ? Math.sin(subject.runAnimationTimer * 12) * 2 : 0;
    if (bountyHunterSprite.complete && bountyHunterSprite.naturalWidth) ctx.drawImage(bountyHunterSprite, -30, -66 + bob, 60, 90);
    else services.drawEntityCircle({x: 0, y: 0, radius: subject.radius}, "#79583b", "#dbad68");
    ctx.restore();
  }

  function drawBountyEffects(subject = hero, markTarget = null) {
    if (subject.selectedClass !== "bountyHunter" || subject.isDead || (subject === hero && hero.hp <= 0)) return;
    const local = subject === hero;
    const visualHero = subject;
    ctx.save();
    if (visualHero.adrenalineTimer > 0) {
      ctx.strokeStyle = "#8ff5cd"; ctx.lineWidth = 2;
      ctx.globalAlpha = 0.45 + Math.sin(visualHero.adrenalineTimer * 12) * 0.2;
      ctx.beginPath(); ctx.ellipse(visualHero.x, visualHero.y + 12, 28, 12, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = visualHero.adrenalineTimer * 4 + i * Math.PI * 2 / 5;
        ctx.fillStyle = "#b5ffe3"; ctx.fillRect(visualHero.x + Math.cos(a) * 24, visualHero.y - 10 + Math.sin(a) * 20, 3, 6);
      }
    }
    const target = local ? hero.hunterMarkTimer > 0 && bountyTargets().find(t => t.id === hero.hunterMarkTargetId) : markTarget;
    if (target) {
      const point = local ? services.getEntityTargetPoint(target) : target;
      const y = local ? target.y - (target.radius || 20) - 34 : target.markerY;
      ctx.globalAlpha = 1; ctx.strokeStyle = "#ffc36e"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(point.x, y, 10, 0, Math.PI * 2);
      ctx.moveTo(point.x - 16, y); ctx.lineTo(point.x + 16, y);
      ctx.moveTo(point.x, y - 16); ctx.lineTo(point.x, y + 16); ctx.stroke();
      ctx.fillStyle = "#fff0c4"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${visualHero.hunterMarkTimer.toFixed(1)}s`, point.x, y - 20);
    }
    ctx.restore();
  }

  const ENGINEER = Object.freeze({stationDuration: 12, stationCooldown: 25, stationRadius: 150,
    healing: 6, vehicleRepair: 12, turretCooldown: 30, turretHp: 100, turretRange: 320,
    turretDamage: 10, turretInterval: 0.6, boltCooldown: 2, armorPenetration: 0.5});

  function clearEngineerDeployables() { engineerDeployables.length = 0; }

  function getEngineerTurret() { return engineerDeployables.find(d => d.kind === "autoTurret" && d.hp > 0); }

  function canUseEngineerAbility(key) {
    return isEngineer() && player.hasSelectedCharacter && hero.hp > 0 && !hero.isDead
      && hero.vehicleId === null && !player.isPlacingBuilding && !player.victory && !player.loss
      && !services.isInterfacePanelOpen() && !services.isDialogueOpen()
      && services.getOrderedInventoryAbilities().some(a => a.actionKey === key);
  }

  function buildEngineerProjectile(origin, angle, damage, range, armorPenetration = 0, turretId = null) {
    return {x: origin.x, y: origin.y, angle, speed: 800, radius: 4, width: 8,
      damage, baseDamage: damage, traveled: 0, maxDistance: range, active: true,
      style: "engineerBolt", sourceClass: "engineer", projectileType: "bullet", canHeadshot: false, armorPenetration, turretId};
  }

  function useEngineerBoltShot() {
    if (!canUseEngineerAbility("F") || hero.slashTimer > 0) return false;
    heroProjectiles.push(buildEngineerProjectile(hero, hero.facingAngle, services.getAbilityDamage(),
      services.getSelectedClassConfig().range, ENGINEER.armorPenetration));
    hero.slashTimer = ENGINEER.boltCooldown;
    hero.rifleShotAnimationTimer = 0.15;
    updateAbilityUI();
    return true;
  }

  function placeRepairStation() {
    if (!canUseEngineerAbility("Q") || hero.battleMedicineCooldownRemaining > 0) return false;
    engineerDeployables.push({id: nextId(), kind: "repairStation", isPlayer: true,
      x: hero.x, y: hero.y, radius: 18, ttl: ENGINEER.stationDuration});
    hero.battleMedicineCooldownRemaining = ENGINEER.stationCooldown;
    statusTextEl.textContent = "Repair Station deployed: nearby allies and vehicles regenerate health for 12 seconds.";
    updateAbilityUI();
    return true;
  }

  function placeAutoTurret() {
    if (!canUseEngineerAbility("G") || hero.grenadeCooldownRemaining > 0) return false;
    for (let i = engineerDeployables.length - 1; i >= 0; i--) {
      if (engineerDeployables[i].kind === "autoTurret") engineerDeployables.splice(i, 1);
    }
    engineerDeployables.push({id: nextId(), kind: "autoTurret", isPlayer: true,
      x: hero.x, y: hero.y, radius: 18, hp: ENGINEER.turretHp, maxHp: ENGINEER.turretHp,
      attackTimer: 0, angle: hero.facingAngle});
    hero.grenadeCooldownRemaining = ENGINEER.turretCooldown;
    statusTextEl.textContent = "Auto Turret deployed. It will defend this position until destroyed or replaced.";
    updateAbilityUI();
    return true;
  }

  function isFriendlyEngineerTarget(target) {
    return target === hero || target.isPlayer === true || target.playerOwned === true || target.id === hero.vehicleId;
  }

  function engineerTargets() {
    // Unclaimed Humvees are neutral vehicles in the existing world.
    return bountyTargets().filter(t => !isFriendlyEngineerTarget(t) && (t.type !== "humvee" || t.hostile === true));
  }

  function isRepairableVehicle(target) {
    return target.isVehicle === true || ["humvee", "tank", "vehicle"].includes(target.type || target.kind);
  }

  function distanceToRepairTarget(station, target) {
    return target.w !== undefined ? Math.hypot(station.x - clamp(station.x, target.x, target.x + target.w),
      station.y - clamp(station.y, target.y, target.y + target.h)) : distance(station, target);
  }

  function engineerHasLineOfSight(origin, target) {
    const point = services.getEntityTargetPoint(target);
    const length = distance(origin, point);
    const steps = Math.max(1, Math.ceil(length / 8));
    for (let i = 1; i < steps; i++) {
      const p = {x: origin.x + (point.x - origin.x) * i / steps, y: origin.y + (point.y - origin.y) * i / steps};
      if (trees.some(t => services.intersectsTree(p, 2, t)) || stones.some(t => services.intersectsStone(p, 2, t))
        || buildings.some(b => b !== target && b.hp > 0 && services.intersectsBuilding(p, 2, b))) return false;
    }
    return true;
  }

  function updateEngineerDeployables(dt) {
    for (let i = engineerDeployables.length - 1; i >= 0; i--) {
      const deployable = engineerDeployables[i];
      if (deployable.kind === "repairStation") {
        const activeDt = Math.min(dt, deployable.ttl);
        const recipients = [hero, ...units, ...engineerDeployables.filter(d => d.kind === "autoTurret"),
          ...buildings.filter(b => isFriendlyEngineerTarget(b) && isRepairableVehicle(b))];
        for (const target of new Set(recipients)) {
          if (!isFriendlyEngineerTarget(target) || target.hp <= 0 || !Number.isFinite(target.maxHp)) continue;
          if (distanceToRepairTarget(deployable, target) <= ENGINEER.stationRadius) {
            target.hp = Math.min(target.maxHp, target.hp + (isRepairableVehicle(target) ? ENGINEER.vehicleRepair : ENGINEER.healing) * activeDt);
          }
        }
        deployable.ttl = Math.max(0, deployable.ttl - dt);
        if (deployable.ttl === 0) engineerDeployables.splice(i, 1);
        continue;
      }
      if (deployable.hp <= 0 || (!player.inVillageWorld && !player.inTutorialWorld && !player.inWaveWorld && services.isInsideDeathZone(deployable))) {
        services.spawnTextPopup(deployable.x, deployable.y - 30, "Turret destroyed", "#efb07a", 0.8);
        engineerDeployables.splice(i, 1);
        continue;
      }
      deployable.attackTimer = Math.max(0, deployable.attackTimer - dt);
      const target = engineerTargets().filter(t => distance(deployable, services.getEntityTargetPoint(t)) <= ENGINEER.turretRange)
        .sort((a, b) => distance(deployable, services.getEntityTargetPoint(a)) - distance(deployable, services.getEntityTargetPoint(b)))
        .find(t => engineerHasLineOfSight(deployable, t));
      if (!target) continue;
      const point = services.getEntityTargetPoint(target);
      deployable.angle = Math.atan2(point.y - deployable.y, point.x - deployable.x);
      if (deployable.attackTimer === 0) {
        heroProjectiles.push(buildEngineerProjectile(deployable, deployable.angle, ENGINEER.turretDamage,
          ENGINEER.turretRange, 0, deployable.id));
        deployable.attackTimer = ENGINEER.turretInterval;
      }
    }
  }

  function updateEngineerProjectile(projectile, dt) {
    const travel = Math.min(projectile.speed * dt, projectile.maxDistance - projectile.traveled);
    const steps = Math.max(1, Math.ceil(travel / 4));
    for (let i = 0; i < steps && projectile.active; i++) {
      projectile.x += Math.cos(projectile.angle) * travel / steps;
      projectile.y += Math.sin(projectile.angle) * travel / steps;
      projectile.traveled += travel / steps;
      if (trees.some(t => services.intersectsTree(projectile, projectile.radius, t))
        || stones.some(t => services.intersectsStone(projectile, projectile.radius, t))) { projectile.active = false; return; }
      const target = engineerTargets().find(t => t.w ? services.intersectsBuilding(projectile, projectile.radius, t)
        : distance(projectile, t) <= projectile.radius + t.radius);
      if (target) {
        const damage = services.engineerDamageAfterArmor(target, projectile.damage, projectile.armorPenetration);
        services.applyRangedProjectileHit(target, {...projectile, baseDamage: damage});
        projectile.active = false; return;
      }
      if (services.tryHitTutorialRangeTarget(projectile)) return;
    }
    if (projectile.traveled >= projectile.maxDistance - 0.001) projectile.active = false;
  }

  function drawEngineerHero(subject = hero) {
    ctx.save(); ctx.translate(subject.x, subject.y);
    if (Math.cos(subject.facingAngle) < 0) ctx.scale(-1, 1);
    const bob = subject.isMoving ? Math.sin(subject.runAnimationTimer * 12) * 2 : 0;
    if (engineerSprite.complete && engineerSprite.naturalWidth) ctx.drawImage(engineerSprite, -30, -66 + bob, 60, 90);
    else services.drawEntityCircle({x: 0, y: 0, radius: subject.radius}, "#a17938", "#e8c885");
    ctx.restore();
  }

  function drawEngineerBolt(projectile) {
    ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(projectile.angle);
    ctx.strokeStyle = projectile.armorPenetration ? "#fff0b3" : "#c5d4db"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = "#83939c"; ctx.fillRect(-12, -4, 4, 8);
    ctx.restore();
  }

  function drawEngineerDeployables(visuals = engineerDeployables) {
    for (const d of visuals) {
      ctx.save(); ctx.translate(d.x, d.y);
      ctx.lineWidth = 3; ctx.strokeStyle = "#35332d";
      if (d.kind === "repairStation") {
        ctx.fillStyle = "rgba(109, 208, 158, 0.08)";
        ctx.beginPath(); ctx.arc(0, 0, ENGINEER.stationRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(128, 222, 174, 0.4)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "#b7924e"; ctx.fillRect(-19, -14, 38, 28);
        ctx.strokeStyle = "#383b34"; ctx.lineWidth = 3; ctx.strokeRect(-19, -14, 38, 28);
        ctx.fillStyle = "#c9ffe2"; ctx.fillRect(-3, -10, 6, 20); ctx.fillRect(-10, -3, 20, 6);
        ctx.fillStyle = "#d8f7e4"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`REPAIR ${d.ttl.toFixed(1)}s`, 0, -25);
      } else if (visuals !== engineerDeployables || d.hp > 0) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-23, 20); ctx.moveTo(0, 0); ctx.lineTo(23, 20); ctx.moveTo(0, 0); ctx.lineTo(0, -23); ctx.stroke();
        ctx.rotate(d.angle); ctx.fillStyle = "#ad8848"; ctx.fillRect(-14, -12, 28, 24); ctx.strokeRect(-14, -12, 28, 24);
        ctx.fillStyle = "#66747c"; ctx.fillRect(8, -5, 28, 10); ctx.strokeRect(8, -5, 28, 10);
      }
      ctx.restore();
      if (visuals === engineerDeployables && d.kind === "autoTurret" && d.hp > 0) services.drawHealthBar(d.x, d.y - 32, 46, d.hp / d.maxHp);
    }
  }

  return {
    SPRINT_DURATION,
    SPRINT_COOLDOWN,
    SPRINT_SPEED_MULTIPLIER,
    BATTLE_MEDICINE_USE_DURATION,
    canAimSoldierGrenade,
    startGrenadeAim,
    useBattleMedicine,
    isUsingBattleMedicine,
    cancelGrenadeAim,
    updateAbilityUI,
    isEngineer,
    isBountyHunter,
    useSoldierGrenade,
    useSlash,
    useSprint,
    useRobotDash,
    updatePlayerCombatTimers,
    updateActiveAbility,
    bountyTargets,
    canUseBountyAbility,
    useHuntersMark,
    useAdrenalineShot,
    fireExplosiveBolt,
    detonateExplosiveBolt,
    updateExplosiveBolt,
    drawBountyHunter,
    drawBountyEffects,
    ENGINEER,
    clearEngineerDeployables,
    getEngineerTurret,
    canUseEngineerAbility,
    buildEngineerProjectile,
    useEngineerBoltShot,
    placeRepairStation,
    placeAutoTurret,
    isFriendlyEngineerTarget,
    engineerTargets,
    isRepairableVehicle,
    distanceToRepairTarget,
    engineerHasLineOfSight,
    updateEngineerDeployables,
    updateEngineerProjectile,
    drawEngineerHero,
    drawEngineerBolt,
    drawEngineerDeployables,
  };
}

export { createAbilitiesSystem };
