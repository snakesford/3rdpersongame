const assert = require('node:assert/strict');

module.exports = async function checkSpawn(send, firstSession, url) {
  const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
  const {sessionId: secondSession} = await send('Target.attachToTarget', {targetId, flatten: true});
  let secondClosed = false;
  const evaluate = async (session, expression) => {
    const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, session);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = (session, condition) => evaluate(session, `(async () => {
    const network = await import('./network.js');
    const deadline = Date.now() + 5000;
    while (!(${condition})) {
      if (Date.now() > deadline) throw new Error('Spawn condition timed out: ' + ${JSON.stringify(condition)});
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  })()`);
  const choose = (session, name, character) => evaluate(session, `(() => {
    document.getElementById('playerNameInput').value = ${JSON.stringify(name)};
    document.getElementById('confirmPlayerNameBtn').click();
    document.querySelector('[data-class="${character}"]').click();
  })()`);
  try {
    await send('Runtime.enable', {}, secondSession);
    await send('Page.navigate', {url}, secondSession);
    await wait(secondSession, 'window.gameReady && network.getLocalPlayerId()');
    await evaluate(firstSession, `window.runGameChecks('travelToMainWorld()')`);
    const code = await evaluate(firstSession, `(async () => {
      const network = await import('./network.js');
      return (await network.createRoom()).room.code;
    })()`);
    await choose(firstSession, 'Alpha', 'soldier');
    await wait(firstSession, 'network.getLocalPlayer()?.selectedCharacter === "soldier"');
    assert.equal(await evaluate(firstSession, `document.getElementById('characterSelect').classList.contains('hidden')`), false);
    await evaluate(secondSession, `(async () => {
      const network = await import('./network.js');
      await network.joinRoom(${JSON.stringify(code)});
      try {
        await network.readyPlayer({name: 'Invalid', selectedCharacter: '__proto__'});
        throw new Error('Invalid character accepted');
      } catch (error) {
        if (!error.message.includes('valid character')) throw error;
      }
      if (network.getRoom().spawnId) throw new Error('Spawned before both players chose characters');
    })()`);
    await choose(secondSession, 'Bravo', 'engineer');
    for (const session of [firstSession, secondSession]) {
      await wait(session, 'network.getRoom()?.spawnId && network.getRemotePlayers()[0]?.spawnPosition && document.getElementById("characterSelect").classList.contains("hidden")');
    }
    const inspect = session => evaluate(session, `(async () => {
      const network = await import('./network.js');
      const {ctx} = await import('./modules/dom.js');
      const text = [], sprites = [];
      const fillText = ctx.fillText, drawImage = ctx.drawImage;
      ctx.fillText = function(value, ...args) {text.push(value); return fillText.call(this, value, ...args);};
      ctx.drawImage = function(image, ...args) {sprites.push(image.src); return drawImage.call(this, image, ...args);};
      try { window.runGameChecks('render()'); } finally {ctx.fillText = fillText; ctx.drawImage = drawImage;}
      return {room: network.getRoom(), local: network.getLocalPlayer(), remote: network.getRemotePlayers()[0], text, sprites,
        game: window.runGameChecks('({x: hero.x, y: hero.y, village: player.inVillageWorld, character: hero.selectedClass})')};
    })()`);
    // Wait for the character image assets, then assert both render paths run.
    for (const session of [firstSession, secondSession]) {
      await evaluate(session, `(async () => {
        const assets = await import('./modules/assets.js');
        await Promise.all([assets.soldierIdleImage, assets.engineerSprite].map(image => image.decode()));
      })()`);
    }
    const first = await inspect(firstSession), second = await inspect(secondSession);
    assert.deepEqual(first.room, second.room, 'Clients received different spawn worlds/rosters');
    assert.equal(first.room.worldId, 'village');
    assert.equal(first.local.id, second.remote.id);
    assert.equal(second.local.id, first.remote.id);
    assert.equal(first.local.name, 'Alpha');
    assert.equal(second.local.name, 'Bravo');
    assert.notDeepEqual(first.local.spawnPosition, second.local.spawnPosition);
    for (const state of [first, second]) {
      assert.equal(state.game.village, true);
      assert.equal(state.game.character, state.local.selectedCharacter);
      assert.equal(state.game.x, state.local.spawnPosition.x);
      assert.equal(state.game.y, state.local.spawnPosition.y);
      assert.ok(state.text.includes(`${state.local.name} · You`));
      assert.ok(state.text.some(text => text.startsWith(state.remote.name + ' ·')));
      assert.ok(state.sprites.some(src => src.endsWith('/soldier-stationary.png')));
      assert.ok(state.sprites.some(src => src.endsWith('/engineer-sprite.png')));
    }
    // Duplicate readiness must not teleport a player who has since moved locally.
    await evaluate(firstSession, `(async () => {
      window.runGameChecks('hero.x += 20');
      const network = await import('./network.js');
      await network.readyPlayer({name: 'Alpha', selectedCharacter: 'soldier', spawnPosition: {x: -999, y: -999}, id: 'forged'});
    })()`);
    assert.equal((await inspect(firstSession)).game.x, first.game.x + 20);
    assert.deepEqual((await inspect(secondSession)).remote.spawnPosition, first.local.spawnPosition);
    await send('Target.closeTarget', {targetId});
    secondClosed = true;
    await wait(firstSession, 'network.getRemotePlayers().length === 0');
    console.log('Two-browser spawn checks passed: same world, IDs, names, characters, distinct positions, both sprites rendered, no duplicate spawn');
  } finally {
    await evaluate(firstSession, `(async () => {const network = await import('./network.js'); if (network.getRoom()) await network.leaveRoom();})()`);
    if (!secondClosed) await send('Target.closeTarget', {targetId});
  }
};
