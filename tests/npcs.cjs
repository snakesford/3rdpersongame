// Run with: node --experimental-vm-modules tests/npcs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const canvasContext = new Proxy({measureText: text => ({width: text.length * 8})}, {get: (target, key) => target[key] ?? noop});
function element() {
  const classes = new Set(['hidden']);
  return {style: {setProperty: noop}, dataset: {}, value: '', textContent: '', width: 240, height: 190,
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, force) {if (force) classes.add(x); else classes.delete(x);}},
    querySelector: element, querySelectorAll: () => [], replaceChildren: noop, remove: noop, removeAttribute: noop, addEventListener(type, handler) { (this.listeners ??= {})[type] = handler; }, append: noop, appendChild: noop, focus: noop, setAttribute: noop,
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
const npcChecks = `
player.displayName = 'NpcTest';
selectCharacter('soldier');
activateTutorialWorld();
assert.equal(tutorialNpcs.length, 7);
const merchant = getTutorialNpcById('merchant');
hero.x = merchant.x; hero.y = merchant.y;
assert.equal(beginTutorialNpcInteraction(), true);
assert.equal(tutorialDialogue.npcId, 'merchant');
handleTutorialNpcOption('work');
assert.equal(tutorialDialogue.taskOffered, true);
handleTutorialNpcOption('accept');
assert.equal(getTutorialProfessionState('merchant').activeTask.status, 'active');
completeTutorialProfessionTask('merchant');
beginTutorialNpcInteraction();
const goldBeforeTask = player.money;
const woodBeforeTask = player.wood;
handleTutorialNpcOption('turnIn');
assert.equal(player.money, goldBeforeTask + 35);
assert.equal(player.wood, woodBeforeTask - 25);
assert.equal(getTutorialProfessionState('merchant').activeTask, null);
handleTutorialNpcOption('turnIn');
assert.equal(player.money, goldBeforeTask + 35, 'Task reward cannot be claimed twice');
closeTutorialDialogue();
const instructor = getTutorialNpcById('shootingInstructor');
hero.x = instructor.x; hero.y = instructor.y;
assert.equal(beginTutorialNpcInteraction(), true);
for (let line = 0; line < 5; line++) advanceShootingInstructorDialogue();
assert.equal(shootingRangeTutorial.completed, true);
assert.equal(isDialogueOpen(), false);
const instructorStart = {x: instructor.x, y: instructor.y};
updateShootingInstructor(0.1);
assert.ok(distance(instructorStart, instructor) > 0);
drawTutorialNpcs(); drawTutorialNpcMinimap(x => x, y => y); drawTutorialNpcHint();

closeTutorialDialogue();
travelToMainWorld();
hero.x = villager.x; hero.y = villager.y;
assert.equal(beginVillagerInteraction(), true);
advanceQuestDialogue(); advanceQuestDialogue();
assert.equal(quest.activeContractId, 'knownCamp');
const contract = getActiveContract();
for (const [kind, amount] of Object.entries(contract.requirements)) {
  for (let kill = 0; kill < amount; kill++) registerContractKill({kind, campId: contract.campId});
}
assert.equal(quest.activeContractStage, 'readyToTurnIn');
const goldBeforeContract = player.money;
beginVillagerInteraction(); advanceQuestDialogue(); advanceQuestDialogue();
assert.equal(hasCompletedContract('knownCamp'), true);
assert.equal(player.money, goldBeforeContract + contract.rewards.gold);
drawVillager(); drawVillagerHint(); drawMainNpcMinimap(x => x, y => y);

hero.x = trader.x; hero.y = trader.y; player.money = 100;
openTrader(); assert.equal(player.traderOpen, true);
const weaponBefore = player.weaponBonusStat;
document.getElementById('buyWeaponUpgradeBtn').listeners.click();
assert.equal(player.money, 50);
assert.equal(player.weaponBonusStat, weaponBefore + 10);
hero.x += 300;
document.getElementById('buyWeaponUpgradeBtn').listeners.click();
assert.equal(player.money, 50, 'Cannot buy outside trader range');
assert.equal(player.traderOpen, false);
drawTrader();

activateTutorialWorld();
hero.x = TUTORIAL_WORLD.spawnX - 300 + 48;
hero.y = TUTORIAL_WORLD.spawnY + 130 + 48;
updateTrainingDriver(0);
assert.ok(npcState.trainingDriver, 'Walking onto the trigger spawns the driver');
drawTrainingDriver();
const driver = npcState.trainingDriver;
buildings.length = 0;
const vehicle = createBuilding('humvee', driver.x - 50, driver.y - 30, false, {w: 100, h: 60, hp: 800, maxHp: 800});
updateTrainingDriver(0.1);
assert.equal(driver.vehicleId, vehicle.id);
assert.equal(vehicle.driverId, driver.id);
releaseDriverVehicle();
assert.equal(driver.vehicleId, null);
assert.equal(vehicle.driverId, null);
activateWaveWorld();
assert.equal(npcState.trainingDriver, null);
assert.equal(tutorialNpcs.length, 0);
console.log('NPC module loading, dialogue, tasks, contracts, trader, instructor and driver tests passed.');
`;

const path = require('node:path');
const modules = new Map();
function loadModule(filename) {
  filename = path.resolve(filename);
  if (modules.has(filename)) return modules.get(filename);
  let source = fs.readFileSync(filename, 'utf8');
  if (filename === path.resolve('game.js')) {
    source = source.replace(/initializeGame\(\);\s*$/, 'await initializeGame();') + '\n' + npcChecks;
  }
  const module = new vm.SourceTextModule(source, {context, identifier: filename});
  modules.set(filename, module);
  return module;
}
(async () => {
  const game = loadModule('game.js');
  await game.link((specifier, referencingModule) => loadModule(path.resolve(path.dirname(referencingModule.identifier), specifier)));
  await game.evaluate();
})().catch(error => { console.error(error); process.exitCode = 1; });
