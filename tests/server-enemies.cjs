const assert=require('node:assert/strict');
const {createCombat}=require('../multiplayer-combat.cjs');
const {createEnemies}=require('../server-enemies.cjs');
const players=new Map([
  ['a',{id:'a',selectedCharacter:'soldier',movement:{x:1168,y:1000,worldId:'main',onFoot:true}}],
  ['b',{id:'b',selectedCharacter:'soldier',movement:{x:1300,y:1000,worldId:'main',onFoot:true}}],
]);
const combat=createCombat({spawnId:'test',players},{now:0,random:()=>1});
combat.advance(50);
let snapshot=combat.snapshot();
assert.equal(new Set(snapshot.enemies.map(e=>e.id)).size,snapshot.enemies.length);
const goblin=snapshot.enemies.find(e=>e.kind==='goblin' && e.x===1168);
assert.equal(goblin.targetId,'a');assert.ok(goblin.y<1068,'Server moves enemy');
players.get('a').movement.worldId='village';
combat.advance(100);
assert.equal(combat.snapshot().enemies.find(e=>e.id===goblin.id).targetId,'b','Retarget after travel');
players.get('a').movement.worldId='main';
for(let i=1;i<=4;i++) {
  assert.equal(combat.act('a',{kind:'fire',angle:Math.PI/2,spawnId:'test',sequence:i,damage:999},i*100).ok,true);
  combat.advance(i*100+90);
}
snapshot=combat.snapshot();
assert.equal(snapshot.enemies.find(e=>e.id===goblin.id).hp,0);
assert.equal(snapshot.enemies.find(e=>e.id===goblin.id).isDead,true);
assert.equal(snapshot.events.filter(e=>e.type==='death' && e.targetId===goblin.id).length,1);
assert.ok(snapshot.events.some(e=>e.type==='hit' && e.sourceId===goblin.id),'Enemy attack damages server player health');
combat.advance(2000);
assert.ok(!combat.snapshot().enemies.some(e=>e.id===goblin.id),'Dead enemy removed');
const same=combat.snapshot();same.enemies[0].hp=999;
assert.notEqual(combat.snapshot().enemies[0].hp,999,'Snapshots cannot mutate server enemies');
const waves=createEnemies('waves-test');
const wavePlayers=[{id:'p',movement:{x:1200,y:950,worldId:'waves'}}];
waves.update(0,0,wavePlayers,()=>{});waves.update(3000,0,wavePlayers,()=>{});
assert.equal(waves.snapshot(3000).length,3);
for(const e of waves.entities.values()) {e.dead=true;e.hp=0;}
waves.update(3100,0,wavePlayers,()=>{});waves.update(6100,0,wavePlayers,()=>{});
assert.equal(waves.snapshot(6100).filter(e=>!e.isDead).length,5);
players.delete('a');players.get('b').movement.worldId='village';combat.remove('a');combat.advance(2100);
assert.ok(combat.snapshot().enemies.every(e=>e.targetId===null),'No stale/cross-world targets');
const rangedPlayers=new Map([['p',{id:'p',selectedCharacter:'soldier',movement:{x:1718,y:666,worldId:'main',onFoot:true}}]]);
const ranged=createCombat({spawnId:'ranged',players:rangedPlayers},{now:0,random:()=>1});
ranged.advance(50);
assert.ok(ranged.snapshot().projectiles.some(p=>p.style==='arrow'),'Enemy ranged attacks are server projectiles');
ranged.advance(800);
assert.ok(ranged.snapshot().events.some(e=>e.type==='hit' && e.targetId==='p'),'Enemy arrow damages player on server');
console.log('Server enemies: spawning, IDs, movement, retargeting, attacks, damage, death, waves and snapshot isolation passed');
