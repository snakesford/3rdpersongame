const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {ready, run} = require('./harness.cjs');
(async () => {
  await ready;
  // A missing service may only break a rare ability or produce NaN in a drawing.
  const serviceNames = new Set(run('Object.keys(systems)'));
  const visited = new Set();
  function checkModule(filename, chain = []) {
    filename = path.resolve(filename);
    assert.ok(!chain.includes(filename), `Circular import: ${[...chain, filename].join(' -> ')}`);
    if (visited.has(filename)) return;
    const source = fs.readFileSync(filename, 'utf8');
    for (const match of source.matchAll(/\bservices\.(\w+)/g)) {
      assert.ok(serviceNames.has(match[1]), `${filename}: missing service ${match[1]}`);
    }
    for (const match of source.matchAll(/import\s+[\s\S]*?\sfrom\s+"([^"]+)"/g)) {
      checkModule(path.resolve(path.dirname(filename), match[1]), [...chain, filename]);
    }
    visited.add(filename);
  }
  checkModule('game.js');
  run(`
    player.displayName = 'SystemsTest'; selectCharacter('soldier');
    travelToMainWorld(); clearWorldEntities(); runtime.enemyHero.active = false;
    hero.x = 500; hero.y = 500; hero.hp = hero.maxHp;
    hero.ammo = hero.maxAmmo; hero.rifleCooldown = 0;
    assert.equal(spawnHeroBullet(700, 500), true);
    const afterShot = hero.ammo;
    assert.equal(spawnHeroBullet(700, 500), false, 'Fire interval blocks immediate second shot');
    assert.equal(hero.ammo, afterShot);
    assert.equal(startReload(), false, 'Automatic reload waits for empty magazine');
    assert.equal(startReload(true), true);
    updateReload(hero.reloadDuration / 2);
    assert.equal(hero.isReloading, true);
    assert.equal(hero.ammo, afterShot);
    updateReload(hero.reloadDuration / 2);
    assert.equal(hero.isReloading, false); assert.equal(hero.ammo, hero.maxAmmo);
    assert.equal(calculateHeadshotDamage(20, 2, 0), 40);
    assert.equal(calculateHeadshotDamage(20, 2, 0.5), 30);
    assert.equal(calculateHeadshotDamage(20, 2, 1), 20);
    toggleRifleFireMode(); assert.equal(hero.rifleFireMode, 'semi');
    mouse.leftDown = true; mouse.worldX = 700; mouse.worldY = 500;
    updateHero(0.2); assert.equal(hero.ammo, hero.maxAmmo, 'Holding semi-auto trigger does not fire');
    toggleRifleFireMode(); updateHero(0.2);
    assert.equal(hero.ammo, hero.maxAmmo - 1, 'Automatic fire responds to held trigger');
    mouse.leftDown = false;

    const blastTarget = createUnit('skeleton', 800, 500, false); blastTarget.hp = 200;
    const distantTarget = createUnit('skeleton', 1100, 500, false); distantTarget.hp = 200;
    explodeGrenade({targetX: 800, targetY: 500, damage: 50, explosionRadius: 100});
    assert.equal(blastTarget.hp, 150); assert.equal(distantTarget.hp, 200);
    assert.ok(grenadeShockwaves.length > 0);
    enemies.length = 0; heroProjectiles.length = 0;

    runtime.playerBase = createBuilding('playerBase', 50, 50, true);
    selectBuilding(runtime.playerBase); player.wood = 99;
    startBarracksPlacement(); assert.equal(player.isPlacingBuilding, false);
    player.wood = 100; startBarracksPlacement(); assert.equal(player.isPlacingBuilding, true);
    assert.equal(isValidBarracksPlacement(20, 20), false);
    assert.equal(isValidBarracksPlacement(600, 600), true);
    camera.x = 0; camera.y = 0;
    document.getElementById('gameCanvas').listeners.mousedown({button: 0, offsetX: 600, offsetY: 600});
    assert.equal(player.wood, 0); assert.equal(player.isPlacingBuilding, false);
    const barracks = buildings.find(b => b.type === 'barracks'); assert.ok(barracks);
    assert.equal(isValidBarracksPlacement(600, 600), false, 'Buildings cannot overlap');
    selectBuilding(barracks); player.money = 50;
    document.getElementById('trainSoldierBtn').listeners.click();
    assert.equal(player.money, 0); assert.equal(units.length, 1);
    document.getElementById('trainSoldierBtn').listeners.click();
    assert.equal(units.length, 1, 'Insufficient gold prevents training');
    const soldier = units[0];
    selectUnitsInBox({x1: soldier.x+5, y1: soldier.y+5, x2: soldier.x-5, y2: soldier.y-5});
    assert.deepEqual(player.selectedUnits, [soldier.id]);
    setSelectedUnitsMoveTarget(900, 900);
    const start = {x: soldier.x, y: soldier.y};
    updateUnits(0.1, units, [], []);
    assert.ok(distance(start, soldier) > 0);
    const opponent = createUnit('skeleton', soldier.x+20, soldier.y, false);
    const targetHp = opponent.hp;
    setSelectedUnitsAttackTarget(opponent); updateUnits(0.1, units, enemies, []);
    assert.equal(opponent.hp, targetHp-10);
    assert.equal(soldier.targetUnitId, opponent.id);
    enemies.length = 0;

    const shop = createBuilding('shop', 1000, 1000, true);
    hero.x = shop.x+shop.w/2; hero.y = shop.y+shop.h/2;
    player.wood = 25; player.money = 0;
    openShop(); assert.equal(player.shopOpen, true);
    document.getElementById('shopSellWoodBtn').listeners.click();
    assert.equal(player.wood, 0); assert.equal(player.money, 25);
    document.getElementById('shopSellWoodBtn').listeners.click();
    assert.equal(player.money, 25); closeShop();

    player.level = 1; player.xp = 0; player.upgradePoints = 0;
    awardPlayerXp(125);
    assert.equal(player.level, 3); assert.equal(player.xp, 0); assert.equal(player.upgradePoints, 2);
    const oldDamage = getRifleDamage(); applyWeaponDetailUpgrade('damage');
    assert.equal(player.upgradePoints, 1); assert.ok(getRifleDamage() > oldDamage);
    saveCharacterProgress(); player.weaponDetailDamageLevel = 0;
    assert.equal(restoreCharacterProgress('soldier'), true);
    assert.ok(getRifleDamage() > oldDamage);

    clearWorldEntities(); hero.hp = hero.maxHp;
    const vehicle = createBuilding('humvee', 400, 400, false, {w:100, h:60, hp:800, maxHp:800});
    enterHumvee(vehicle); keys.add('d'); const oldX = vehicle.x;
    updateHumveeDriving(0.1); keys.clear(); assert.ok(vehicle.x > oldX);
    toggleInventoryScreen(); equipHumveeWeapon('howitzer50'); toggleInventoryScreen();
    assert.equal(vehicle.mountedWeapon, 'howitzer50');
    gameLoop(1234);
    assert.equal(systems.lastTimestamp, 1234);
    assert.equal(fireHumveeGun(vehicle.x+300, vehicle.y), true);
    assert.ok(Number.isFinite(vehicle.recoilStartedAt), 'Vehicle recoil reads the live frame clock');
    assert.equal(vehicle.recoilStartedAt, 1234);
    render();
    assert.equal(teleportHumvee(activateTutorialWorld), true);
    assert.equal(getOccupiedHumvee(), vehicle);
    assert.equal(buildings.filter(b => b.type === 'humvee').length, 1);
    assert.equal(player.inTutorialWorld, true);
    exitHumvee(); assert.equal(hero.vehicleId, null);
    render(); update(0.016);
  `);
  console.log('Module dependencies, combat, building/training, RTS, economy, progression and vehicle checks passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
