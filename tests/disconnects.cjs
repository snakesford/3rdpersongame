const assert=require('node:assert/strict');
const {createCombat}=require('../multiplayer-combat.cjs');
const room={spawnId:'disconnect-test',players:new Map([
  ['a',{id:'a',selectedCharacter:'engineer',movement:{x:1535,y:1120,worldId:'village',onFoot:true}}],
  ['b',{id:'b',selectedCharacter:'bountyHunter',movement:{x:1535,y:1200,worldId:'village',onFoot:true}}],
])};
const combat=createCombat(room,{now:0,random:()=>1});
const sequence={a:0,b:0};
const act=(id,kind,extra={})=>combat.act(id,{spawnId:room.spawnId,sequence:++sequence[id],kind,angle:0,...extra},0);
assert.equal(act('a','ability',{slot:'Q'}).ok,true);
assert.equal(act('a','ability',{slot:'G'}).ok,true);
assert.equal(act('a','fire').ok,true);
assert.equal(act('b','ability',{slot:'F',angle:-Math.PI/2}).ok,true);
const vehicleId=combat.snapshot().vehicles[0].id;
assert.equal(act('a','vehicle',{operation:'enter',vehicleId}).ok,true);
assert.equal(act('a','vehicle',{operation:'fire'}).ok,true);
assert.equal(combat.snapshot().deployables.length,2);
assert.ok(combat.snapshot().projectiles.some(p=>p.ownerId==='a'));
room.players.delete('a'); // Same order as room disconnect cleanup.
combat.remove('a');
combat.remove('a'); // Cleanup is safe to repeat.
let snapshot=combat.snapshot();
assert.equal(snapshot.players.some(p=>p.id==='a'),false);
assert.equal(snapshot.vehicles[0].driverId,null);
assert.equal(snapshot.players[0].markId,null);
assert.equal(snapshot.players[0].hunterMarkTimer,0);
for(const field of ['projectiles','effects','deployables']) assert.equal(snapshot[field].some(p=>p.ownerId==='a'),false);
assert.equal(snapshot.events.some(e=>e.sourceId==='a' || e.targetId==='a'),false);
Object.assign(room.players.get('b').movement,{x:1535,y:1120});
assert.equal(act('b','vehicle',{operation:'enter',vehicleId}).ok,true,'Remaining player can claim released seat');
combat.advance(5000);
assert.equal(combat.snapshot().players.length,1,'Cleanup survives subsequent ticks');
// Enemy target references are cleared immediately, before another simulation tick.
const enemyRoom={spawnId:'enemy-disconnect',players:new Map([['a',{id:'a',selectedCharacter:'mage',movement:{x:500,y:110,worldId:'main',onFoot:true}}]])};
const enemyCombat=createCombat(enemyRoom,{now:0,random:()=>1});
enemyCombat.advance(1);
const enemy=enemyCombat.snapshot().enemies[0];
Object.assign(enemyRoom.players.get('a').movement,{x:enemy.x+100,y:enemy.y});
enemyCombat.advance(2);
assert.equal(enemyCombat.act('a',{spawnId:enemyRoom.spawnId,sequence:1,kind:'ability',slot:'F',angle:0},1).ok,true);
assert.ok(enemyCombat.snapshot().effects.length);
assert.ok(enemyCombat.snapshot().enemies.some(e=>e.targetId==='a'));
enemyRoom.players.delete('a');enemyCombat.remove('a');
snapshot=enemyCombat.snapshot();
assert.equal(snapshot.effects.length,0);
assert.equal(snapshot.enemies.some(e=>e.targetId==='a'),false);
console.log('Disconnect cleanup: character, driver seat reuse, projectiles, effects, deployables, marks, events and enemy targets passed');
