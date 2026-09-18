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
const paths = ['modules/constants.js','modules/assets.js','modules/dom.js','modules/state.js','inputs.js','npcs.js','game.js'];
const source = paths.map(path => fs.readFileSync(path, 'utf8').replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";/g, '').replace(/export\s*\{[\s\S]*?\};/g, '')).join('\n').replace(/initializeGame\(\);\s*$/, 'globalThis.ready = initializeGame();');
vm.runInContext(source, context);
(async () => {
 await context.ready;
 vm.runInContext(`
 player.displayName = 'WaveTest'; selectCharacter('soldier');
 activateTutorialWorld();
 assert.ok(getVillagePortals().includes(WAVE_MODE_TILE));
 hero.x = WAVE_MODE_TILE.x - hero.radius + 1; hero.y = WAVE_MODE_TILE.y + 48;
 update(0.016);
 assert.equal(player.inWaveWorld, true, 'Touching tile edge enters wave map');
 assert.equal(player.inTutorialWorld, false);
 assert.equal(enemies.length, 0, 'Arrival has a preparation countdown');
 for (const entities of [trees, stones, buildings, units, pickups, tutorialNpcs, tutorialPlots, tutorialSites, tutorialRangeTargets, villagePaths, villageProps, forestEnemySpawners]) assert.equal(entities.length, 0);
 assert.equal(enemyHero.active, false);
 assert.equal(playerBase, null); assert.equal(enemyBase, null);
 assert.equal(getVillagePortals().length, 0); assert.equal(getHumveeTravelTiles().length, 0);
 hero.x = trader.x; hero.y = trader.y; assert.equal(isHeroNearTrader(), false);
 hero.x = villager.x; hero.y = villager.y; assert.equal(isHeroNearVillager(), false);
 hero.y = MAIN_LANE_Y; assert.equal(isHeroOnRoad(), false);
 hero.x = DEATH_ZONE.x + 30; hero.y = DEATH_ZONE.y + 30;
 update(0.016); assert.equal(hero.hp, hero.maxHp, 'No invisible main-world death zone');
 render();
 updateWaveMode(3);
 assert.equal(waveMode.wave, 1); assert.equal(enemies.length, 3);
 const beforeDistance = distance(enemies[0], hero);
 updateUnits(0.1, enemies, [hero], []);
 assert.ok(distance(enemies[0], hero) < beforeDistance, 'Wave enemies pursue the player');
 updateWaveMode(30); assert.equal(enemies.length, 3, 'Living enemies block the next wave');
 enemies.slice(1).forEach(enemy => enemy.hp = 0); cleanupDefeatedEnemies(); updateWaveMode(1);
 assert.equal(waveMode.wave, 1); assert.equal(enemies.length, 1);
 enemies[0].hp = 0; cleanupDefeatedEnemies(); updateWaveMode(0.016);
 assert.equal(waveMode.timer, 3);
 updateWaveMode(3); assert.equal(waveMode.wave, 2); assert.equal(enemies.length, 5);
 enemies.forEach(enemy => enemy.hp = 0); cleanupDefeatedEnemies(); updateWaveMode(0.016);
 assert.equal(waveMode.completed, true); assert.match(getWaveModeStatus(), /complete/);
 updateWaveMode(3); assert.equal(player.inTutorialWorld, true); assert.equal(player.inWaveWorld, false);
 assert.equal(enemies.length, 0, 'No third wave');
 activateWaveWorld(); updateWaveMode(3);
 hero.isDead = true; hero.hp = 0; updateWaveMode(10); assert.equal(waveMode.wave, 1);
 respawnHero(); assert.equal(player.inWaveWorld, true); assert.equal(hero.isDead, false);
 assert.equal(waveMode.wave, 0); assert.equal(enemies.length, 0); assert.equal(hero.x, WAVE_MODE.spawnX);
 updateWaveMode(3); assert.equal(enemies.length, 3);
 activateVillageWorld(); assert.equal(player.inWaveWorld, false); assert.equal(waveMode.wave, 0);
 activateWaveWorld(); travelToMainWorld(); assert.equal(player.inWaveWorld, false); render();
 `, context);
 console.log('Wave mode entry, empty map, pursuit, two-wave progression, completion, retry and travel tests passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
