const assert = require('node:assert/strict');
const {createCombat, weapons} = require('../multiplayer-combat.cjs');
function setup(first='soldier',second='soldier',random=()=>1) {
  const players=new Map([['a',{id:'a',selectedCharacter:first,movement:{x:100,y:100,worldId:'village',onFoot:true}}],
    ['b',{id:'b',selectedCharacter:second,movement:{x:260,y:100,worldId:'village',onFoot:true}}]]);
  const room={players,spawnId:'spawn'};
  const combat=createCombat(room,{now:0,random});
  let sequence=0;
  return {room,combat,act:(kind,time=0,extra={})=>combat.act('a',{spawnId:'spawn',sequence:++sequence,kind,angle:0,...extra},time),
    read:()=>combat.snapshot(),state:id=>combat.snapshot().players.find(p=>p.id===id)};
}
{
  const t=setup();
  assert.equal(t.act('fire',0,{damage:999,hp:999,ammo:999,headshot:true,targetId:'b',x:260}).ok,true);
  assert.equal(t.state('a').ammo,29);
  assert.equal(t.state('b').hp,120,'No instant hitscan damage');
  assert.equal(t.act('fire',1).ok,false,'Server cooldown');
  t.combat.advance(250);
  assert.equal(t.state('b').hp,104,'Client damage/headshot values ignored');
  const hit=t.read().events.find(e=>e.type==='hit');
  assert.equal(hit.damage,16); assert.equal(hit.headshot,false);
  assert.equal(t.act('reload',251).ok,true);
  assert.equal(t.act('fire',400).ok,false);
  t.combat.advance(1450); assert.equal(t.state('a').ammo,29);
  t.combat.advance(1451); assert.equal(t.state('a').ammo,30);
  assert.equal(t.act('fire',1452,{spawnId:'old'}).ok,false);
  assert.equal(t.combat.act('a',{spawnId:'spawn',sequence:1,kind:'fire',angle:0},1453).ok,false);
  assert.equal(t.combat.act('outsider',{spawnId:'spawn',sequence:1,kind:'fire',angle:0},1454).ok,false);
  assert.equal(t.act('fire',1455,{angle:NaN}).ok,false);
}
{
  const t=setup('bountyHunter','soldier',()=>0);
  t.act('fire');t.combat.advance(250);
  assert.equal(t.state('b').hp,70);
  assert.equal(t.read().events.find(e=>e.type==='hit').headshot,true);
}
{
  const t=setup(); t.act('fire',0,{angle:Math.PI/2});t.combat.advance(1000);
  assert.equal(t.state('b').hp,120,'Miss');
  t.room.players.get('b').movement.worldId='main';
  t.act('fire',1001);t.combat.advance(1300);
  assert.equal(t.state('b').hp,120,'No cross-world hit');
}
{
  const t=setup(); t.act('fire');
  t.room.players.get('b').movement.y=400;
  t.combat.advance(500);assert.equal(t.state('b').hp,120,'Target can dodge a projectile');
}
{
  const t=setup('mage');t.room.players.get('b').movement.x=200;
  assert.equal(t.act('ability',0,{slot:'F'}).ok,true);
  assert.equal(t.state('b').hp,90);
  assert.equal(t.act('ability',1,{slot:'F'}).ok,false);
  assert.equal(t.act('fire',2).ok,false,'Wrong weapon');
  assert.equal(t.act('ability',3,{slot:'G'}).ok,false,'Wrong class ability');
}
{
  const t=setup('soldier','soldier',()=>0);
  for (let i=0;i<4;i++) {assert.equal(t.act('fire',i*300).ok,true);t.combat.advance(i*300+250);}
  assert.equal(t.state('b').hp,0);assert.equal(t.state('b').isDead,true);
  assert.equal(t.combat.act('b',{kind:'fire',angle:Math.PI,spawnId:'spawn',sequence:1},1200).ok,false);
  t.combat.advance(10000);assert.equal(t.state('b').hp,0,'No client-timed respawn or dead regeneration');
  assert.equal(t.read().events.filter(e=>e.type==='death').length,1);
}
{
  const t=setup();t.room.players.get('b').movement.y=1000;
  for(let i=0;i<30;i++) assert.equal(t.act('fire',i*81).ok,true);
  assert.equal(t.state('a').ammo,0);assert.equal(t.state('a').isReloading,true);
  assert.equal(t.act('fire',2500).ok,false);
  t.combat.advance(29*81+1200);assert.equal(t.state('a').ammo,30);
}
{
  const t=setup('engineer');
  assert.equal(t.act('ability',0,{slot:'Q'}).ok,true);
  assert.equal(t.act('ability',1,{slot:'G'}).ok,true);
  t.combat.advance(100); assert.equal(t.read().deployables.length,2);
  t.combat.remove('a');t.room.players.delete('a');t.combat.advance(1000);
  assert.equal(t.read().projectiles.length,0);assert.equal(t.read().deployables.length,0);
}
assert.equal(weapons.soldier.speed,720);assert.equal(weapons.soldier.damage,16);
{
  const t=setup('soldier');
  assert.equal(t.act('ability',0,{slot:'G',distance:160}).ok,true);
  assert.equal(t.state('b').hp,120);
  t.combat.advance(650);
  assert.ok(t.state('b').hp<120,'Server grenade explosion hits');
  assert.equal(t.act('ability',651,{slot:'G',distance:160}).ok,false);
  assert.equal(t.act('ability',7000,{slot:'G',distance:Infinity}).ok,false);
}
{
  const t=setup('bountyHunter');
  assert.equal(t.act('ability',0,{slot:'F'}).ok,true);
  t.act('fire',1);t.combat.advance(251);
  assert.equal(t.read().events.find(e=>e.type==='hit').damage,25,'Server mark increases damage');
}
{
  const t=setup('swordsman');t.room.players.get('b').movement.x=150;
  t.act('ability',0,{slot:'F',angle:Math.PI});
  assert.equal(t.state('b').hp,120,'Cone must face target');
  t.act('ability',5000,{slot:'F'});assert.equal(t.state('b').hp,85);
}
{
  const t=setup('soldier');
  t.combat.act('b',{kind:'fire',angle:Math.PI,spawnId:'spawn',sequence:1},0);
  t.combat.advance(250);assert.equal(t.state('a').hp,104);
  assert.equal(t.act('ability',251,{slot:'Q',heal:999}).ok,true);
  assert.equal(t.state('a').hp,120);assert.equal(t.act('ability',252,{slot:'Q'}).ok,false);
  assert.equal(t.act('fire',253).ok,false,'Medicine prevents shooting');
}
console.log('Server combat: projectile travel/dodging, hits, headshots, damage, ammo, reloads, cooldowns, abilities, deaths, validation and cleanup passed');
