// Real Chromium smoke checks. Requires Google Chrome on macOS.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'timberline-browser-'));
let browser;
const server = http.createServer((request, response) => {
  const filename = path.join(root, new URL(request.url, 'http://localhost').pathname === '/' ? 'index.html' : new URL(request.url, 'http://localhost').pathname);
  if (!filename.startsWith(root + path.sep)) {response.writeHead(403).end(); return;}
  try {
    let content = fs.readFileSync(filename);
    if (filename === path.join(root, 'game.js')) {
      content = content.toString().replace(/initializeGame\(\);\s*$/, 'initializeGame().then(() => { window.gameReady = true; });')
        + '\nimport * as testState from "./modules/state.js";'
        + '\nimport * as testConstants from "./modules/constants.js";'
        + '\nimport * as testMath from "./modules/math.js";'
        + '\nconst testBindings = {...testState, ...testMath, ...testConstants, ...systems};'
        + '\nwindow.runGameChecks = code => eval("const {" + Object.keys(testBindings).join(",") + "} = testBindings;\\n" + code);';
    }
    response.setHeader('Content-Type', ({'.js':'application/javascript', '.html':'text/html', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png'})[path.extname(filename)] || 'application/octet-stream');
    response.end(content);
  } catch {response.writeHead(404).end();}
});
const pending = new Map();
const errors = [];
let id = 0;
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, {resolve, reject});
    browser.stdio[3].write(JSON.stringify({id: requestId, method, params, sessionId}) + '\0');
  });
}
const deadline = setTimeout(() => {console.error('Browser check timed out'); cleanup(1);}, 45000);
function cleanup(code) {
  clearTimeout(deadline);
  const removeProfile = () => fs.rmSync(profile, {recursive: true, force: true});
  if (browser && browser.exitCode === null) {
    browser.once('exit', removeProfile);
    browser.kill();
  } else {
    removeProfile();
  }
  server.close();
  process.exitCode = code;
}
(async () => {
  await new Promise((resolve, reject) => {server.on('error', reject); server.listen(0, '127.0.0.1', resolve);});
  browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--remote-debugging-pipe', '--user-data-dir=' + profile, 'about:blank'],
    {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']});
  browser.on('error', error => {console.error(error); cleanup(1);});
  let buffer = '';
  browser.stdio[4].on('data', data => {
    buffer += data.toString();
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      if (message.id) {
        const task = pending.get(message.id); pending.delete(message.id);
        if (message.error) task?.reject(new Error(JSON.stringify(message.error))); else task?.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args);
    }
  });
  const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
  const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
  await send('Runtime.enable', {}, sessionId);
  await send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/`}, sessionId);
  const ready = await send('Runtime.evaluate', {expression: `new Promise(resolve => { const timer = setInterval(() => { if(window.gameReady) {clearInterval(timer); resolve(true);} }, 20); })`, awaitPromise: true, returnByValue: true}, sessionId);
  if (ready.exceptionDetails) throw new Error(JSON.stringify(ready.exceptionDetails));
  const checks = `
    if ([...document.querySelectorAll('.class-card')].map(card => card.dataset.class).join(',') !== 'soldier,custom,archer') throw new Error('Character picker must show only Soldier, Custom and Archer');
    player.displayName = 'BrowserTest';
    for (const classId of Object.keys(runtime.CHARACTER_OPTIONS)) {
      selectCharacter(classId);
      render(); update(0.016);
    }
    selectCharacter('soldier');
    activateTutorialWorld(); render(); update(0.016);
    const instructor = getTutorialNpcById('shootingInstructor');
    hero.x = instructor.x; hero.y = instructor.y;
    beginTutorialNpcInteraction();
    for (let i=0; i<5; i++) advanceShootingInstructorDialogue();
    render();
    activateWaveWorld(); updateWaveMode(3); render(); update(0.016);
    activateVillageWorld(); render(); update(0.016);
    travelToMainWorld(); render(); update(0.016);
    enterDodgeArena(); updateDodgeArena(0.1); render(); leaveDodgeArena();
    toggleInventoryScreen(); render(); toggleInventoryScreen();
    keys.clear();
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key:'d', code:'KeyD', bubbles:true}));
    if (!keys.has('d')) throw new Error('Movement key not registered');
    document.body.dispatchEvent(new KeyboardEvent('keyup', {key:'d', code:'KeyD', bubbles:true}));
    if (keys.has('d')) throw new Error('Movement key not released');
    clearWorldEntities(); hero.hp = hero.maxHp;
    const vehicle = createBuilding('humvee', 400, 400, false, {w:100, h:60, hp:800, maxHp:800});
    enterHumvee(vehicle); keys.add('d'); updateHumveeDriving(0.1); keys.clear();
    for (const weapon of ['machineGun', 'grenade40', 'howitzer50']) {
      toggleInventoryScreen(); equipHumveeWeapon(weapon); toggleInventoryScreen();
      vehicle.gunCooldown = 0;
      if (!fireHumveeGun(vehicle.x + 350, vehicle.y)) throw new Error('Vehicle weapon did not fire');
      if (weapon !== 'machineGun' && !Number.isFinite(vehicle.recoilStartedAt)) throw new Error('Invalid recoil clock');
      render();
    }
    teleportHumvee(activateTutorialWorld); render(); exitHumvee();
    saveCharacterProgress();
    if (!restoreCharacterProgress('soldier')) throw new Error('Save restore failed');
    'Browser smoke checks passed';
  `;
  const result = await send('Runtime.evaluate', {expression: `window.runGameChecks(${JSON.stringify(checks)})`, returnByValue: true}, sessionId);
  if (result.exceptionDetails) errors.push(result.exceptionDetails);
  if (errors.length) throw new Error(JSON.stringify(errors, null, 2));
  console.log(result.result.value);
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function reloadGame() {
    await evaluate('window.gameReady = false');
    await send('Page.reload', {}, sessionId);
    await evaluate(`new Promise(resolve => { const timer = setInterval(() => {
      if (window.gameReady) { clearInterval(timer); resolve(true); }
    }, 20); })`);
  }
  async function check(code) { await evaluate(`window.runGameChecks(${JSON.stringify(code)})`); }
  await check(`
    player.displayName = 'MenuTest'; savePlayerName(player.displayName);
    selectCharacter('engineer', {newGame: true});
    player.xp = 23; player.money = 450; player.bonusHealth = 20;
    player.backpack = [{type: 'helmet'}];
    tutorialProfessionState.mercenary.xp = 15;
    saveCharacterProgress();
  `);
  await reloadGame();
  await check(`
    if (mainMenuEl.classList.contains('hidden') || !classStepEl.classList.contains('hidden')) throw new Error('Returning player must see main menu');
    if (!savedGameSummaryEl.textContent.includes('Engineer')) throw new Error('Saved character missing');
    continueGameBtnEl.click();
    if (hero.selectedClass !== 'engineer' || player.xp !== 23 || player.money !== 450 || player.bonusHealth !== 20 || player.backpack.length !== 1) throw new Error('Continue lost progress');
  `);
  await reloadGame();
  await check(`
    newGameBtnEl.click(); cancelNewGameBtnEl.click();
    if (mainMenuEl.classList.contains('hidden') || getSavedCharacter().stats.money !== 450) throw new Error('Cancel changed save');
    newGameBtnEl.click();
    document.querySelector('[data-class="soldier"]').click();
    if (hero.selectedClass !== 'soldier' || player.xp !== 0 || player.money !== 0 || player.level !== 1 || player.bonusHealth !== 0 || player.backpack.length !== 0 || tutorialProfessionState.mercenary.xp !== 0) throw new Error('New game did not reset progress');
    player.money = 123; saveCharacterProgress();
  `);
  await reloadGame();
  await check(`
    if (getSavedCharacter().classId !== 'soldier') throw new Error('New character was not remembered');
    newGameBtnEl.click(); document.querySelector('[data-class="soldier"]').click();
    if (player.money !== 0 || player.xp !== 0 || player.backpack.length !== 0) throw new Error('New game restored old class progress');
  `);
  await reloadGame();
  await check(`
    continueGameBtnEl.click();
    if (hero.selectedClass !== 'soldier' || player.money !== 0) throw new Error('Fresh game was not saved');
  `);
  if (errors.length) throw new Error(JSON.stringify(errors, null, 2));
  console.log('Main menu, reload/continue, cancellation and new-game reset checks passed.');
  await send('Browser.close');
  cleanup(0);
})().catch(error => {console.error(error); cleanup(1);});
