const assert = require('node:assert/strict');
module.exports = async function checkCombat(evaluate, wait, first, second) {
  const play=(session,code)=>evaluate(session,`window.runGameChecks(${JSON.stringify(code)})`);
  const state=session=>evaluate(session,"import('./network.js').then(n=>n.getCombatState())");
  await wait(second,'network.getCombatState()?.players.length === 2');
  const identities=await evaluate(first,"import('./network.js').then(n=>({local:n.getLocalPlayerId(),remote:n.getRemotePlayers()[0].id}))");
  const aim=await evaluate(first,`import('./network.js').then(n=>n.getRemotePlayers()[0].movement)`);
  const before=await play(first,'({ammo:hero.ammo,hp:hero.hp})');
  await play(first,`hero.rifleFireMode='semi'; mouse.worldX=${aim.x}; mouse.worldY=${aim.y}; spawnHeroBullet(mouse.worldX,mouse.worldY)`);
  await wait(second,`network.getCombatState().events.some(e=>e.type==='hit' && e.sourceId==='${identities.local}')`);
  const after=await state(second),hit=after.events.find(e=>e.type==='hit');
  assert.equal(hit.sourceId,identities.local);assert.equal(hit.targetId,identities.remote);
  assert.ok([9,18].includes(hit.damage),'Base soldier damage with engineer armor, including server headshots');
  assert.equal(after.players.find(p=>p.id===identities.local).ammo,before.ammo-1);
  await wait(first,`network.getCombatState().events.some(e=>e.id===${hit.id})`);
  assert.deepEqual((await state(first)).events.find(e=>e.id===hit.id),hit,'Both players receive identical hit result');
  assert.equal(await play(first,'heroProjectiles.length'),0,'No duplicate client projectile simulation');
  // Client-side health and ammo edits must be overwritten, even with an open menu.
  await play(second,'hero.hp=9999;hero.ammo=9999;player.inventoryOpen=true');
  await wait(second,"window.runGameChecks('hero.hp < 9999 && hero.ammo <= hero.maxAmmo')");
  await play(second,'player.inventoryOpen=false');
  await play(first,'startReload(true)');
  await wait(second,`network.getCombatState().players.find(p=>p.id==='${identities.local}').isReloading`);
  await wait(first,'!network.getCombatState().players.find(p=>p.id===network.getLocalPlayerId()).isReloading');
  assert.equal(await play(first,'hero.ammo'),30);
  // Burst visuals must come from a server-approved cast. Aim away for this check.
  await play(first,'useSlash(hero.x,hero.y-400)');
  await wait(second,`network.getCombatState().events.some(e=>e.type==='action' && e.slot==='F')`);
  const drawn=await evaluate(second,`(async()=>{
    const {ctx}=await import('./modules/dom.js');const assets=await import('./modules/assets.js');await assets.soldierShootingImage.decode();
    const images=[],original=ctx.drawImage;ctx.drawImage=function(img,...args){images.push(img.src);return original.call(this,img,...args)};
    try{window.runGameChecks('drawRemotePlayers()')}finally{ctx.drawImage=original}return images;
  })()`);
  assert.ok(drawn.some(src=>src.endsWith('/soldier-shooting.png')),'Remote draws authoritative shooting pose');
  await play(second,'placeRepairStation()');
  await wait(first,"network.getCombatState().deployables.some(d=>d.kind==='repairStation')");
  // Wrong room, identity spoofing, stale spawn, replay and invented combat fields.
  const security=await evaluate(first,`(async()=>{
    const n=await import('./network.js');const {io}=await import('/socket.io/socket.io.esm.min.js');
    const outsider=io({forceNew:true});await new Promise(r=>outsider.on('connect',r));
    await new Promise(r=>outsider.emit('room:create',null,r));const leaks=[];outsider.on('combat:state',s=>leaks.push(s));
    const request=p=>new Promise(r=>n.send('combat:action',p,r));
    const p={kind:'fire',angle:-Math.PI/2,spawnId:n.getRoom().spawnId,sequence:100000};
    try {
      const outside=await new Promise(r=>outsider.emit('combat:action',p,r));
      const invalid=await request({...p,angle:'invalid'});const staleSpawn=await request({...p,spawnId:'old'});
      await new Promise(r=>setTimeout(r,500));
      const good=await request({...p,id:n.getRemotePlayers()[0].id,targetId:n.getRemotePlayers()[0].id,damage:9999,ammo:9999,hp:9999,headshot:true});
      const replay=await request(p);await new Promise(r=>setTimeout(r,80));
      return {outside,invalid,staleSpawn,good,replay,leaks};
    } finally {outsider.disconnect()}
  })()`);
  assert.equal(security.outside.ok,false);assert.equal(security.invalid.ok,false);assert.equal(security.staleSpawn.ok,false);
  assert.equal(security.good.ok,true);assert.equal(security.replay.ok,false);assert.deepEqual(security.leaks,[]);
  // Use legitimate aimed requests until the server declares death; client damage is ignored.
  await evaluate(first,`(async()=>{
    const n=await import('./network.js');const target=n.getRemotePlayers()[0].movement;
    const local=window.runGameChecks('({x:hero.x,y:hero.y})');
    const angle=Math.atan2(target.y-local.y,target.x-local.x);
    for(let i=1;i<=30;i++){
      if(n.getCombatState().players.find(p=>p.id!==n.getLocalPlayerId()).isDead) break;
      await new Promise(r=>n.send('combat:action',{kind:'fire',angle,spawnId:n.getRoom().spawnId,sequence:100000+i},r));
      await new Promise(r=>setTimeout(r,100));
    }
  })()`);
  await wait(second,'network.getCombatState().players.find(p=>p.id===network.getLocalPlayerId()).isDead');
  await wait(first,'network.getCombatState().players.find(p=>p.id!==network.getLocalPlayerId()).isDead');
  assert.equal(await play(second,'hero.hp'),0);assert.equal(await play(second,'hero.isDead'),true);
  await evaluate(second,'new Promise(r=>setTimeout(r,900))');
  assert.equal(await play(second,'hero.isDead'),true,'Client death timer must not respawn');
  const denied=await evaluate(second,`(async()=>{const n=await import('./network.js');return new Promise(r=>n.send('combat:action',
    {kind:'fire',angle:0,spawnId:n.getRoom().spawnId,sequence:900000},r));})()`);
  assert.equal(denied.ok,false);
  console.log('Two-browser authoritative combat passed: both-player hit results, base damage, server ammo/reload/abilities, rendering, corrections, isolation, replay rejection and death');
};
