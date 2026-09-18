// Real Chromium smoke checks. Requires Google Chrome on macOS.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createGameServer} = require('../server.js');
const os = require('node:os');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'timberline-browser-'));
let browser;
const {server, io} = createGameServer((request, response) => {
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
const connections = [];
const disconnections = [];
io.on('connection', socket => {
  connections.push(socket.id);
  socket.on('network:test', payload => socket.emit('network:reply', payload));
  socket.on('disconnect', () => disconnections.push(socket.id));
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
  io.close();
  process.exitCode = code;
}
(async () => {
  await new Promise((resolve, reject) => {server.on('error', reject); server.listen(0, '127.0.0.1', resolve);});
  browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-pipe', '--user-data-dir=' + profile, 'about:blank'],
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
  const networkResult = await send('Runtime.evaluate', {expression: `(async () => {
    const network = await import('./network.js');
    const nextEvent = event => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {off(); reject(new Error('Timed out: ' + event));}, 5000);
      const off = network.on(event, value => {clearTimeout(timeout); off(); resolve(value);});
    });
    if (!network.isConnected()) await nextEvent('connect');
    if (!network.getLocalPlayerId()) await nextEvent('player:identity');
    const firstPlayerId = network.getLocalPlayerId();
    const firstId = network.getSocketId();
    network.connect(); // Must reuse the existing connection.
    const reply = nextEvent('network:reply');
    if (!network.send('network:test', {message: 'hello'})) throw new Error('Send failed');
    if ((await reply).message !== 'hello') throw new Error('Event payload mismatch');
    const disconnected = nextEvent('disconnect');
    network.disconnect();
    await disconnected;
    if (network.isConnected() || network.getSocketId()) throw new Error('Still connected');
    if (network.getLocalPlayerId() || network.getPlayers().size) throw new Error('Stale player registry after disconnect');
    if (network.send('network:test', {message: 'offline'})) throw new Error('Offline send succeeded');
    const reconnected = nextEvent('connect');
    network.connect();
    await reconnected;
    if (!network.getLocalPlayerId()) await nextEvent('player:identity');
    if (network.getLocalPlayerId() === firstPlayerId) throw new Error('Reconnected with stale player ID');
    if (network.getPlayers().size !== 1 || !network.getLocalPlayer().isLocal) throw new Error('Invalid reconnected player state');
    if (network.getSocketId() === firstId) throw new Error('Expected a new session');
    return {firstId, secondId: network.getSocketId()};
  })()`, awaitPromise: true, returnByValue: true}, sessionId);
  if (networkResult.exceptionDetails) throw new Error(JSON.stringify(networkResult.exceptionDetails));
  const {firstId, secondId} = networkResult.result.value;
  assert.deepEqual(connections, [firstId, secondId]);
  // Server-side close notification may arrive after the browser-side event.
  const waitForDisconnect = async socketId => {
    const until = Date.now() + 5000;
    while (!disconnections.includes(socketId) && Date.now() < until) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(disconnections.includes(socketId), 'Server did not observe disconnect');
    assert.equal(io.sockets.sockets.has(socketId), false);
  };
  await waitForDisconnect(firstId);
  console.log('Browser networking checks passed: connect, event round trip, disconnect, reconnect');
  const roomChecks = require('./rooms-browser.cjs');
  const roomResult = await send('Runtime.evaluate', {
    expression: `(${roomChecks.toString()})()`, awaitPromise: true, returnByValue: true,
  }, sessionId);
  if (roomResult.exceptionDetails) throw new Error(JSON.stringify(roomResult.exceptionDetails));
  console.log(roomResult.result.value);
  await require('./spawn-browser.cjs')(send, sessionId, `http://127.0.0.1:${server.address().port}/`);
  const checks = `
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
  await send('Browser.close');
  await waitForDisconnect(secondId);
  cleanup(0);
})().catch(error => {console.error(error); cleanup(1);});
