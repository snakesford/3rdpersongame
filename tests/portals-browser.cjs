const assert = require('node:assert/strict');
module.exports = async function checkPortals(evaluate, wait, first, second) {
  for (const [from,to,x,y] of [
    ['village','main',1110,410], ['main','village',845,895],
    ['village','tutorial',1230,545], ['tutorial','village',1408,1318],
  ]) {
    await evaluate(first, `(async () => {
      const {hero,player}=await import('./modules/state.js');
      const {getPlayerWorldId}=await import('./modules/multiplayer.js');
      if (getPlayerWorldId(player)!=='${from}') throw Error('Unexpected starting world');
      const key=(type,value)=>document.body.dispatchEvent(new KeyboardEvent(type,{key:value,code:'Key'+value.toUpperCase(),bubbles:true}));
      async function walk(axis,target) {
        const sign=Math.sign(target-hero[axis]);
        const value=axis==='x'?(sign>0?'d':'a'):(sign>0?'s':'w');
        const until=Date.now()+8000;
        key('keydown',value);
        try {
          while(getPlayerWorldId(player)==='${from}' && (target-hero[axis])*sign>0) {
            if(Date.now()>until) throw Error('Walk blocked at '+JSON.stringify({x:hero.x,y:hero.y,world:getPlayerWorldId(player),axis,target}));
            await new Promise(r=>setTimeout(r,20));
          }
        } finally {key('keyup',value);}
      }
      // Follow clear approaches. Use real keyboard input and normal collisions.
      await walk('x',${x});
      await walk('y',${y});
      await new Promise(r=>setTimeout(r,80));
      if(getPlayerWorldId(player)!=='${to}') throw Error('Portal failed: ${from} -> '+getPlayerWorldId(player));
    })()`);
    await wait(second, `network.getRemotePlayers()[0].movement.worldId === '${to}'`);
    assert.equal(await evaluate(first,"import('./modules/combat-session.js').then(m=>m.combatSession.active)"),true);
    if (to === 'main') {
      for (const session of [first,second]) await evaluate(session, `(async()=>{
        const n=await import('./network.js'); window.enemySamples=[];
        window.stopEnemySamples=n.on('combat:state',s=>window.enemySamples.push({revision:s.revision,enemies:s.enemies}));
      })()`);
      await wait(second,'window.enemySamples.length >= 3');
      const samples=[];
      for (const session of [first,second]) samples.push(await evaluate(session,'window.stopEnemySamples(); window.enemySamples'));
      const common=samples[0].find(a=>samples[1].some(b=>b.revision===a.revision));
      assert.ok(common?.enemies.length > 0,'Server spawns main-world enemies');
      assert.deepEqual(common,samples[1].find(b=>b.revision===common.revision),'Both clients receive identical enemy state');
    }
  }
  console.log('Keyboard teleporter round trips passed with normal collisions: village/main and village/training, synchronized in both browsers');
};
