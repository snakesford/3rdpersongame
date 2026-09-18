const assert = require('node:assert/strict');

module.exports = async function checkMovement(evaluate, wait, first, second) {
  const read = session => evaluate(session, `(async () => {
    const n = await import('./network.js');
    const {multiplayer} = await import('./modules/multiplayer.js');
    const remote = n.getRemotePlayers()[0];
    return {remote, drawn: multiplayer.getRenderState(remote.id),
      local: window.runGameChecks('({x:hero.x,y:hero.y,hp:hero.hp})')};
  })()`);
  const key = (session, type, value) => evaluate(session, `document.body.dispatchEvent(new KeyboardEvent('${type}', {key:'${value}', code:'Key${value.toUpperCase()}', bubbles:true}))`);
  for (const [sender, receiver, direction] of [[first, second, 'a'], [second, first, 'd']]) {
    const before = await read(sender);
    try {
      await key(sender, 'keydown', direction);
      await wait(receiver, `network.getRemotePlayers()[0]?.movement?.isMoving && Math.abs(network.getRemotePlayers()[0].movement.x - ${before.local.x}) > 25`);
      const moving = await read(receiver);
      assert.equal(moving.remote.movement.isMoving, true);
      assert.ok(direction === 'a' ? Math.cos(moving.remote.movement.facingAngle) < 0 : Math.cos(moving.remote.movement.facingAngle) > 0);
      // Verify the renderer uses the moving record's location, not spawnPosition.
      const draw = await evaluate(receiver, `(async () => {
        const {ctx} = await import('./modules/dom.js');
        const n = await import('./network.js');
        const names = []; const fillText = ctx.fillText;
        ctx.fillText = function(text, x, y, ...rest) {if (text.startsWith(n.getRemotePlayers()[0].name + ' ·')) names.push({x,y}); return fillText.call(this,text,x,y,...rest);};
        try {window.runGameChecks('render()');} finally {ctx.fillText = fillText;}
        return names[0];
      })()`);
      assert.ok(draw && Math.abs(draw.x - moving.remote.spawnPosition.x) > 1, 'Remote rendering stayed at spawn');
    } catch (error) {
      console.error('Movement failure state', await read(sender), await read(receiver), await evaluate(sender, `window.runGameChecks('({keys:[...keys],moving:hero.isMoving,inventory:player.inventoryOpen,selected:player.hasSelectedCharacter,angle:hero.lastMoveAngle})')`));
      throw error;
    } finally { await key(sender, 'keyup', direction); }
    await wait(receiver, '!network.getRemotePlayers()[0].movement.isMoving');
    const stopped = await read(sender);
    await wait(receiver, `Math.abs(network.getRemotePlayers()[0].movement.x - ${stopped.local.x}) < 0.01`);
    await evaluate(receiver, 'new Promise(resolve => setTimeout(resolve, 120))');
    const remote = await read(receiver);
    assert.ok(Math.abs(remote.drawn.x - stopped.local.x) < 0.01, 'Remote did not settle at final position');
    assert.equal(remote.drawn.isMoving, false);
  }
  const security = await evaluate(first, `(async () => {
    const n = await import('./network.js');
    const {io} = await import('/socket.io/socket.io.esm.min.js');
    const outsider = io({forceNew:true});
    await new Promise(resolve => outsider.on('connect', resolve));
    await new Promise(resolve => outsider.emit('room:create', null, resolve));
    const request = (event, payload) => new Promise(resolve => n.send(event, payload, resolve));
    const leaks = [];
    outsider.on('player:movement', value => leaks.push(value));
    try {
      const m = { ...window.runGameChecks('({x:hero.x,y:hero.y,facingAngle:hero.facingAngle,lastMoveAngle:hero.lastMoveAngle})'),
        isMoving:false,onFoot:true,worldId:'village',spawnId:n.getRoom().spawnId,sequence:100000 };
      const outsiderResult = await new Promise(resolve => outsider.emit('player:movement', m, resolve));
      const badNumber = await request('player:movement', {...m,x:'invalid'});
      const badSpawn = await request('player:movement', {...m,spawnId:'old-spawn'});
      const good = await request('player:movement', {...m,id:n.getRemotePlayers()[0].id,roomCode:'OTHER',hp:0,attack:true});
      const stale = await request('player:movement', {...m,x:0});
      await new Promise(resolve => setTimeout(resolve,150));
      return {outsiderResult,badNumber,badSpawn,good,stale,leaks};
    } finally {outsider.disconnect();}
  })()`);
  assert.equal(security.outsiderResult.ok, false);
  assert.equal(security.badNumber.ok, false);
  assert.equal(security.badSpawn.ok, false);
  assert.equal(security.good.ok, true);
  assert.equal(security.stale.ok, false);
  assert.deepEqual(security.leaks, []);
  await wait(second, 'network.getRemotePlayers()[0].movement.sequence === 100000');
  const final = await read(second);
  assert.equal(final.remote.movement.id, final.remote.id, 'Movement impersonated the receiver');
  assert.equal(final.remote.movement.hp, undefined);
  assert.equal(final.remote.movement.attack, undefined);
  assert.ok(final.local.hp > 0, 'Movement changed combat state');
  console.log('Two-browser movement checks passed: keyboard movement both ways, direction, rendered positions, stopping, validation, isolation, no combat');
};
