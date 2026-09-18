const assert=require('node:assert/strict');
module.exports=async function checkPickups(evaluate,wait,first,second) {
  const item=await evaluate(first,"import('./network.js').then(n=>n.getCombatState().pickups.find(p=>p.type==='enemyHelmet' && p.worldId==='main'))");
  assert.ok(item?.id);
  await wait(second,`network.getCombatState().pickups.some(p=>p.id===${JSON.stringify(item.id)})`);
  await evaluate(first,`(async()=>{
    const {hero}=await import('./modules/state.js');
    const key=type=>document.body.dispatchEvent(new KeyboardEvent(type,{key:'s',code:'KeyS',bubbles:true}));
    key('keydown');
    try {const until=Date.now()+6000;while(hero.y<1125){if(Date.now()>until)throw Error('Walk to helmet blocked');await new Promise(r=>setTimeout(r,20));}}
    finally{key('keyup')}
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'e',code:'KeyE',bubbles:true}));
    document.body.dispatchEvent(new KeyboardEvent('keyup',{key:'e',code:'KeyE',bubbles:true}));
  })()`);
  for(const session of [first,second]) await wait(session,`!network.getCombatState().pickups.some(p=>p.id===${JSON.stringify(item.id)})`);
  assert.equal(await evaluate(first,"window.runGameChecks('hero.equippedHelmetType')"),'enemyHelmet');
  await evaluate(second,`import('./network.js').then(n=>n.sendCombatAction({kind:'collect',angle:0,pickupId:${JSON.stringify(item.id)}}))`);
  await wait(second,'network.getCombatState().players.find(p=>p.id===network.getLocalPlayerId()).sequence > 0');
  assert.equal(await evaluate(second,"window.runGameChecks('hero.equippedHelmetType')"),null,'Second player receives no duplicate item');
  console.log('Two-browser pickup check passed: E collection, equipment update, global removal and duplicate rejection');
};
