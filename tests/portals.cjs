const {ready,run}=require('./harness.cjs');
const {routes,isPortalTravel}=require('../portal-travel.cjs');
const {createCombat}=require('../multiplayer-combat.cjs');
const assert=require('node:assert/strict');
(async()=>{
  await ready;
  run("player.displayName='PortalTest'; selectCharacter('soldier')");
  for (const route of routes.filter(r=>r.tile)) {
    const activate={village:'activateVillageWorld()',main:'travelToMainWorld()',tutorial:'activateTutorialWorld()'}[route.from];
    const actual=run(`${activate}; hero.x=${route.tile.x+route.tile.size/2};hero.y=${route.tile.y+route.tile.size/2};
      updatePlayerWorldInteractions(0);
      ({x:hero.x,y:hero.y,worldId:player.inDodgeArena?'arena':player.inWaveWorld?'waves':player.inVillageWorld?'village':player.inTutorialWorld?'tutorial':'main'})`);
    assert.equal(actual.worldId,route.to);
    assert.equal(actual.x,route.spawn.x);assert.equal(actual.y,route.spawn.y);
    const previous={worldId:route.from,x:route.tile.x,y:route.tile.y};
    assert.equal(isPortalTravel(previous,actual),true);
    assert.equal(isPortalTravel({...previous,x:0,y:0},actual),false);
    assert.equal(isPortalTravel(previous,{...actual,x:0,y:0}),false);
  }
  const room={spawnId:'spawn',players:new Map([['a',{id:'a',selectedCharacter:'soldier',movement:{x:100,y:100,worldId:'village',onFoot:true}}]])};
  const combat=createCombat(room,{now:0});
  combat.act('a',{spawnId:'spawn',sequence:1,kind:'fire',angle:0},0);
  const before=combat.snapshot().players[0];
  combat.travel('a');
  const after=combat.snapshot();
  assert.equal(after.projectiles.length,0);
  assert.deepEqual(after.players[0],before,'Travel must not refill health/ammo or reset cooldowns');
  console.log('Portal destination parity, travel validation and combat-state preservation passed');
})().catch(error=>{console.error(error);process.exitCode=1});
