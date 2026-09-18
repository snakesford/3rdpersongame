const assert = require('node:assert/strict');
module.exports = async function checkActions(evaluate, wait, first, second) {
  const play = (session, code) => evaluate(session, `window.runGameChecks(${JSON.stringify(code)})`);
  await wait(second, 'network.getRemotePlayers()[0]?.actions');
  const before = await play(second, 'JSON.stringify({hp:hero.hp,ammo:hero.ammo,projectiles:heroProjectiles.length})');
  await play(first, `hero.hasRifle=true; hero.ammo=30; hero.maxAmmo=30; hero.isReloading=false;
    hero.rifleCooldown=0; hero.rifleFireMode='semi'; mouse.worldX=hero.x-200; mouse.worldY=hero.y+100;
    spawnHeroBullet(mouse.worldX,mouse.worldY); hero.rifleShotAnimationTimer=0.8;`);
  await wait(second, "network.getRemotePlayers()[0].actions?.animation === 'shoot'");
  const shot = await evaluate(second, `(async () => {
    const n = await import('./network.js'); const {ctx} = await import('./modules/dom.js');
    const assets = await import('./modules/assets.js'); await assets.soldierShootingImage.decode();
    const drawn=[]; const original=ctx.drawImage;
    ctx.drawImage=function(img,...args){drawn.push(img.src); return original.call(this,img,...args);};
    try {window.runGameChecks('drawRemotePlayers()');} finally {ctx.drawImage=original;}
    return {actions:n.getRemotePlayers()[0].actions,drawn};
  })()`);
  assert.ok(shot.actions.aimAngle > 2);
  assert.ok(shot.drawn.some(src => src.endsWith('/soldier-shooting.png')), JSON.stringify(shot.drawn));
  await play(first, 'startReload(true)');
  await wait(second, "network.getRemotePlayers()[0].actions?.animation === 'reload'");
  await wait(second, '!network.getRemotePlayers()[0].actions.isReloading');
  await play(first, 'hero.slashTimer=0; useSlash(hero.x+300,hero.y)');
  await wait(second, "network.getRemotePlayers()[0].actions?.abilityEffect?.effect === 'burst'");
  await play(second, 'hero.battleMedicineCooldownRemaining=0; placeRepairStation()');
  await wait(first, "network.getRemotePlayers()[0].actions?.deployables?.some(d => d.kind === 'repairStation')");
  assert.equal(await play(second, 'JSON.stringify({hp:hero.hp,ammo:hero.ammo,projectiles:heroProjectiles.length})'), before,
    'Remote actions entered local combat state');
  const security = await evaluate(first, `(async () => {
    const n=await import('./network.js');
    const {getCharacterActions}=await import('./game.js');
    const request=p=>new Promise(resolve=>n.send('player:actions',p,resolve));
    const p={...getCharacterActions(),spawnId:n.getRoom().spawnId,sequence:100000};
    const bad=await request({...p,aimAngle:'invalid'});
    const old=await request({...p,spawnId:'old'});
    const good=await request({...p,id:n.getRemotePlayers()[0].id,hp:0,damage:999});
    const stale=await request(p);
    return {bad,old,good,stale};
  })()`);
  assert.equal(security.bad.ok,false);
  assert.equal(security.old.ok,false);
  assert.equal(security.good.ok,true);
  assert.equal(security.stale.ok,false);
  await wait(second,'network.getRemotePlayers()[0].actions.sequence === 100000');
  const received=await evaluate(second,"import('./network.js').then(n=>n.getRemotePlayers()[0])");
  assert.equal(received.actions.id,received.id);
  assert.equal(received.actions.hp,undefined);
  assert.equal(received.actions.damage,undefined);
  console.log('Two-browser actions: aim, rendered shooting pose, reload start/finish, burst, deployable, validation and no multiplayer damage passed');
};
