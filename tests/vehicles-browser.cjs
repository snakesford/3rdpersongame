const assert=require('node:assert/strict');
module.exports=async function(evaluate,wait,first,second) {
  const move=async(x,y)=>evaluate(first,`(async()=>{
    const {hero}=await import('./modules/state.js');
    while(Math.hypot(hero.x-${x},hero.y-${y})>1) {
      const dx=${x}-hero.x,dy=${y}-hero.y,d=Math.hypot(dx,dy),step=Math.min(16,d);
      hero.x+=dx/d*step;hero.y+=dy/d*step;await new Promise(r=>setTimeout(r,50));
    }
    await new Promise(r=>setTimeout(r,150));
  })()`);
  const start=await evaluate(first,"window.runGameChecks('({x:hero.x,y:hero.y})')");
  await move(1535,1120);
  await evaluate(first,"window.runGameChecks('enterHumvee(getNearbyHumvee())')");
  for(const session of [first,second]) await wait(session,'network.getCombatState().vehicles[0].driverId!==null');
  assert.equal(await evaluate(first,"window.runGameChecks('hero.vehicleId')"),await evaluate(second,"window.runGameChecks('buildings.find(b=>b.type===\"humvee\").id')"));
  await evaluate(second,"import('./network.js').then(n=>n.sendCombatAction({kind:'vehicle',operation:'enter',vehicleId:n.getCombatState().vehicles[0].id,angle:0}))");
  await wait(second,'network.getCombatState().players.find(p=>p.id===network.getLocalPlayerId()).sequence>0');
  assert.equal(await evaluate(second,"window.runGameChecks('hero.vehicleId')"),null);
  const before=await evaluate(second,"import('./network.js').then(n=>n.getCombatState().vehicles[0].y)");
  await evaluate(first,`(async()=>{
    const key=type=>document.body.dispatchEvent(new KeyboardEvent(type,{key:'s',code:'KeyS',bubbles:true}));
    key('keydown');await new Promise(r=>setTimeout(r,350));key('keyup');
  })()`);
  await wait(second,`network.getCombatState().vehicles[0].y>${before+10}`);
  await evaluate(first,"window.runGameChecks('fireHumveeGun(hero.x,hero.y-800)')");
  for(const session of [first,second]) await wait(session,'network.getCombatState().vehicles[0].ammo===299');
  await evaluate(first,"import('./network.js').then(n=>n.sendCombatAction({kind:'vehicle',operation:'equip',weapon:'howitzer50',angle:0}))");
  for(const session of [first,second]) await wait(session,'network.getCombatState().vehicles[0].mountedWeapon==="howitzer50" && network.getCombatState().vehicles[0].ammo===15');
  const driveTo=(x,y,world)=>evaluate(first,`(async()=>{
    const {hero,buildings,player}=await import('./modules/state.js');
    const {getPlayerWorldId}=await import('./modules/multiplayer.js');
    const deadline=Date.now()+7000;
    while(getPlayerWorldId(player)===${JSON.stringify(world)}) {
      const v=buildings.find(v=>v.id===hero.vehicleId),dx=${x}-(v.x+v.w/2),dy=${y}-(v.y+v.h/2),d=Math.hypot(dx,dy);
      if(d<1) break;
      if(Date.now()>deadline) throw Error('Vehicle approach timed out');
      const step=Math.min(16,d);v.x+=dx/d*step;v.y+=dy/d*step;
      await new Promise(r=>setTimeout(r,50));
    }
  })()`);
  const departureY=await evaluate(first,"window.runGameChecks('hero.y')");
  await driveTo(980,departureY,'village');
  await driveTo(980,410,'village');
  await driveTo(1110,410,'village');
  for(const session of [first,second]) await wait(session,'network.getCombatState().vehicles[0].worldId==="main"');
  await driveTo(845,740,'main');
  await driveTo(845,895,'main');
  for(const session of [first,second]) await wait(session,'network.getCombatState().vehicles[0].worldId==="village"');
  await driveTo(1535,1054.5,'village');
  await evaluate(first,"window.runGameChecks('exitHumvee()')");
  for(const session of [first,second]) await wait(session,'network.getCombatState().vehicles[0].driverId===null');
  assert.equal(await evaluate(first,"window.runGameChecks('hero.vehicleId')"),null);
  await move(start.x,start.y);
  console.log('Two-browser vehicles: shared vehicle, exclusive driver, driving, fire/ammo, weapon switching, teleporter round trip and exit passed');
};
