const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const canvasContext = new Proxy({measureText: text => ({width: text.length * 8})}, {get: (target, key) => target[key] ?? noop});
function element() {
  const classes = new Set(['hidden']);
  return {style: {setProperty: noop}, dataset: {}, value: '', textContent: '', width: 240, height: 190,
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, force) {if (force) classes.add(x); else classes.delete(x);}},
    querySelector: element, querySelectorAll: () => [], replaceChildren: noop, remove: noop, removeAttribute: noop, addEventListener: noop, append: noop, appendChild: noop, focus: noop, setAttribute: noop,
    getAttribute() {return this.src;}, getContext: () => canvasContext, getBoundingClientRect: () => ({left: 0, top: 0}),
  };
}
const elements = new Map();
const storage = new Map();
const context = vm.createContext({console, assert, Math, Set, Map, setInterval: noop, ResizeObserver: class {observe() {}}, Image: class {},
  window: {location: {protocol: "http:"}, innerWidth: 1200, innerHeight: 800, addEventListener: noop},
  document: {getElementById(id) {if (!elements.has(id)) elements.set(id, element()); return elements.get(id);}, querySelectorAll: () => [], querySelector: element, createElement: element},
  localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)}, requestAnimationFrame: noop,
  fetch: async path => ({ok: true, json: async () => JSON.parse(fs.readFileSync(path, 'utf8'))}),
});
const paths = ['modules/constants.js','modules/assets.js','modules/dom.js','modules/state.js','game.js'];
const source = paths.map(path => fs.readFileSync(path, 'utf8').replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";/g, '').replace(/export\s*\{[\s\S]*?\};/g, '')).join('\n').replace(/initializeGame\(\);\s*$/, 'globalThis.ready = initializeGame();');
vm.runInContext(source, context);
(async () => {
 await context.ready;
 vm.runInContext(`
 player.displayName = 'EngineerTest'; selectCharacter('engineer');
 assert.equal(hero.maxHp, 120); assert.equal(getBaseArmor(), 75); assert.equal(getHeroSpeed(), 225);
 assert.equal(getCurrentWeaponDetails().name, 'Heavy Nail Gun'); assert.equal(getRifleDamage(), 12);
 assert.equal(hero.ammo, 16); assert.equal(hero.hasRifle, true);
 assert.equal(getInventoryAbilities().map(a => a.name).join(','), 'Bolt Shot,Repair Station,Auto Turret');
 assert.equal(getOrderedInventoryAbilities().map(a => a.key).join(','), 'F,Q,G');
 assert.equal(getInventoryAbilitySlots().filter(Boolean).length, 3);
 assert.equal(INVENTORY_ABILITY_SLOT_LEVELS.join(','), '1,1,1,2,4,6');
 render(); update(0.016);
 clearWorldEntities(); hero.x = 500; hero.y = 500; hero.hp = 120;
 enemyHero.active = false; enemyHero.hp = 0;
 const enemy = {id: nextId(), kind: 'test', x: 600, y: 500, radius: 18, hp: 300, maxHp: 300, xpReward: 10};
 enemies.push(enemy);
 assert.equal(useSlash(600, 500), true); assert.equal(hero.slashTimer, 2);
 assert.equal(useSlash(600, 500), false);
 updateHeroProjectiles(0.5); assert.equal(enemy.hp, 265, 'Unarmored Bolt Shot deals exactly 35');
 enemy.hp = 300; enemy.armor = 100; hero.slashTimer = 0;
 useSlash(600, 500); updateHeroProjectiles(0.5); assert.equal(enemy.hp, 277, '50% armor bypass yields 23 rounded damage');
 assert.ok(engineerDamageAfterArmor(enemy, 35, 0.5) > engineerDamageAfterArmor(enemy, 35, 0));
 enemy.armor = 0; enemy.hp = 300;
 assert.equal(spawnHeroBullet(600, 500), true); heroProjectiles.at(-1).headshotChance = 0;
 updateHeroProjectiles(0.5); assert.equal(enemy.hp, 288); assert.equal(hero.ammo, 15);
 const beforeArmor = hero.hp; dealDamage(hero, 35); assert.equal(beforeArmor - hero.hp, 20, 'Engineer armor mitigates incoming damage');
 hero.battleMedicineCooldownRemaining = 0; hero.hp = 50;
 const friend = createUnit('soldier', 540, 500, true); friend.hp = 40;
 const farFriend = createUnit('soldier', 660, 500, true); farFriend.hp = 40;
 const vehicle = createBuilding('humvee', 520, 500, false, {w: 100, h: 60, hp: 100, maxHp: 800});
 enterHumvee(vehicle); exitHumvee(); hero.x = 500; hero.y = 500;
 assert.equal(vehicle.playerOwned, true);
 const tank = createBuilding('tank', 530, 510, true, {w: 80, h: 60, hp: 100, maxHp: 1000});
 const hostileTank = createBuilding('tank', 530, 510, false, {w: 80, h: 60, hp: 100, maxHp: 1000});
 assert.equal(placeRepairStation(), true); assert.equal(hero.battleMedicineCooldownRemaining, 25);
 assert.equal(placeRepairStation(), false);
 updateEngineerDeployables(1);
 assert.equal(hero.hp, 56); assert.equal(friend.hp, 46); assert.equal(farFriend.hp, 40);
 assert.equal(vehicle.hp, 112); assert.equal(tank.hp, 112); assert.equal(hostileTank.hp, 100);
 assert.equal(enemy.hp, 288, 'Repair does not heal enemies');
 vehicle.hp = 0; friend.hp = 99; updateEngineerDeployables(1);
 assert.equal(vehicle.hp, 0, 'Destroyed vehicles are not revived'); assert.equal(friend.hp, 100);
 tank.hp = 100; updateEngineerDeployables(30);
 assert.equal(tank.hp, 220, 'Only the remaining 10 seconds of station life heal');
 assert.equal(engineerDeployables.length, 0);
 buildings.length = 0; units.length = 0; enemy.hp = 300;
 assert.equal(placeAutoTurret(), true); const firstTurret = getEngineerTurret();
 assert.equal(firstTurret.hp, 100); assert.equal(firstTurret.x, hero.x); assert.equal(hero.grenadeCooldownRemaining, 30);
 assert.equal(placeAutoTurret(), false); assert.equal(getEngineerTurret().id, firstTurret.id);
 updateEngineerDeployables(0.01); assert.equal(heroProjectiles.length, 1);
 updateHeroProjectiles(0.5); assert.equal(enemy.hp, 290);
 updateEngineerDeployables(0.1); assert.equal(heroProjectiles.length, 0, 'Turret observes fire interval');
 hero.grenadeCooldownRemaining = 0; assert.equal(placeAutoTurret(), true);
 assert.notEqual(getEngineerTurret().id, firstTurret.id);
 assert.equal(engineerDeployables.filter(d => d.kind === 'autoTurret').length, 1);
 const turret = getEngineerTurret(); hero.x = 850;
 enemy.x = turret.x + 20; enemy.y = turret.y; enemy.isPlayer = false; enemy.speed = 100;
 enemy.damage = 20; enemy.attackTimer = 0; enemy.attackCooldown = 1; enemy.attackRange = 34;
 enemy.spawnerId = 1; enemy.aggroRange = 220;
 assert.equal(getForestEnemyTarget(enemy).id, turret.id);
 updateUnits(0.1, enemies, [hero, turret], []); assert.equal(turret.hp, 80, 'Enemy melee attacks turret');
 enemyProjectiles.push({x: turret.x, y: turret.y, angle: 0, speed: 1, radius: 4, damage: 15, traveled: 0, maxDistance: 500});
 updateEnemyProjectiles(0.01); assert.equal(turret.hp, 65, 'Enemy ranged attacks turret');
 dealDamage(turret, 100); updateEngineerDeployables(0.01); assert.equal(getEngineerTurret(), undefined);
 hero.x = 500; hero.grenadeCooldownRemaining = 0; placeAutoTurret(); heroProjectiles.length = 0;
 enemy.x = 600; enemy.y = 500; stones.push({x: 550, y: 500, radius: 15});
 updateEngineerDeployables(1); assert.equal(heroProjectiles.length, 0, 'Turret cannot see through rocks');
 stones.length = 0; enemy.x = 900; updateEngineerDeployables(1); assert.equal(heroProjectiles.length, 0, 'Turret range enforced');
 enemy.x = 600; updateEngineerDeployables(1); assert.equal(heroProjectiles.length, 1);
 enemy.hp = 5; updateHeroProjectiles(1); const previousXp = player.xp; cleanupDefeatedEnemies();
 assert.equal(enemies.length, 0); assert.ok(player.xp > previousXp, 'Turret kills award player XP');
 hero.vehicleId = 123; hero.battleMedicineCooldownRemaining = 0; hero.slashTimer = 0;
 assert.equal(placeRepairStation(), false); assert.equal(useEngineerBoltShot(), false); hero.vehicleId = null;
 player.inventoryOpen = true; assert.equal(placeRepairStation(), false); player.inventoryOpen = false;
 player.level = 4; player.bonusHealth = 20; player.weaponDetailDamageLevel = 1;
 inventoryAbilityOrders.set('engineer', ['Auto Turret', 'Bolt Shot', 'Repair Station']);
 assert.equal(getOrderedInventoryAbilities()[0].actionKey, 'G');
 hero.battleMedicineCooldownRemaining = 25; hero.grenadeCooldownRemaining = 30; saveCharacterProgress();
 hero.battleMedicineCooldownRemaining = 0; hero.grenadeCooldownRemaining = 0; player.level = 1;
 assert.equal(restoreCharacterProgress('engineer'), true);
 assert.equal(player.level, 4); assert.equal(hero.maxHp, 140); assert.equal(getRifleDamage(), 14);
 assert.equal(hero.battleMedicineCooldownRemaining, 25); assert.equal(hero.grenadeCooldownRemaining, 30);
 assert.equal(getOrderedInventoryAbilities()[0].name, 'Auto Turret');
 render(); update(0.016);
 clearWorldEntities(); assert.equal(engineerDeployables.length, 0);
 hero.grenadeCooldownRemaining = 0; placeAutoTurret(); respawnHero(); assert.equal(engineerDeployables.length, 0);
 assert.equal(hero.hasRifle, true); assert.equal(hero.maxHp, 140);
 hero.grenadeCooldownRemaining = 0; placeAutoTurret(); selectCharacter('soldier');
 assert.equal(engineerDeployables.length, 0); assert.equal(getInventoryAbilities()[0].name, 'Burst Shot');
 selectCharacter('bountyHunter'); assert.equal(getInventoryAbilities()[0].name, 'Hunter’s Mark');
 `, context);
 for (const path of ['engineer-portrait.png','engineer-sprite.png','bolt-shot.svg','repair-station.svg','auto-turret.svg','nail-gun.svg']) assert.ok(fs.existsSync('images/' + path));
 console.log('Engineer combat, deployables, armor, allies/vehicles, enemy AI, progression, save/load and UI smoke tests passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
