const assert=require('node:assert/strict');
const {createCombat}=require('../multiplayer-combat.cjs');
function setup() {
  const room={spawnId:'test',players:new Map(['a','b'].map(id=>[id,{id,selectedCharacter:'soldier',movement:{x:1535,y:1120,worldId:'village',onFoot:true}}]))};
  const combat=createCombat(room,{now:0,random:()=>1}), seq={a:0,b:0};
  const act=(id,operation,extra={},time=0)=>combat.act(id,{spawnId:'test',sequence:++seq[id],kind:'vehicle',operation,angle:0,...extra},time);
  const read=()=>combat.snapshot().vehicles[0], vehicleId=read().id;
  return {room,combat,act,read,vehicleId};
}
{
  const t=setup();
  assert.equal(t.act('a','enter',{vehicleId:t.vehicleId}).ok,true);
  assert.equal(t.act('b','enter',{vehicleId:t.vehicleId}).ok,false,'Seat is exclusive');
  assert.equal(t.act('b','fire').ok,false,'Passenger cannot fire');
  assert.equal(t.act('b','equip',{weapon:'howitzer50'}).ok,false);
  assert.equal(t.act('a','fire',{damage:99999,ammo:999}).ok,true);
  assert.equal(t.read().ammo,299);
  assert.equal(t.act('a','fire').ok,false,'Cooldown enforced');
  assert.equal(t.act('a','equip',{weapon:'howitzer50'}).ok,true);
  assert.equal(t.act('a','fire',{distance:500},3001).ok,true);
  assert.equal(t.read().ammo,14);
  t.act('a','equip',{weapon:'machineGun'},3001);
  assert.equal(t.read().ammo,299,'Switching cannot refill ammo');
  t.room.players.get('b').movement.worldId='tutorial';
  assert.equal(t.act('a','missile',{},3001).ok,true);
  assert.equal(t.act('a','missile',{},3002).ok,false);
  const hp=t.combat.snapshot().players.find(p=>p.id==='b').hp;
  t.combat.moveVehicle('b',{x:999,y:999,worldId:'main'});
  assert.equal(t.read().worldId,'village','Non-driver cannot move vehicle');
  t.room.players.get('b').movement.y=1500;
  const pos={x:1635,y:1054.5,worldId:'village',onFoot:false};
  Object.assign(t.room.players.get('a').movement,pos);t.combat.moveVehicle('a',pos);
  assert.equal(t.read().x,1560);
  assert.equal(t.act('a','exit',{},3003).ok,true);
  assert.equal(t.read().driverId,null);
  assert.equal(t.room.players.get('a').movement.onFoot,true);
  assert.equal(t.act('a','fire',{},4000).ok,false);
  t.combat.advance(10000);
  Object.assign(t.room.players.get('b').movement,{x:1635,y:1120,worldId:'village'});
  assert.equal(t.act('b','enter',{vehicleId:t.vehicleId},10001).ok,true);
  t.combat.remove('b'); assert.equal(t.read().driverId,null,'Disconnect frees seat');
  assert.ok(hp>0);
}
{
  const t=setup();
  t.room.players.get('a').movement.x=100;
  assert.equal(t.act('a','enter',{vehicleId:t.vehicleId}).ok,false,'Range validated');
  t.room.players.get('a').movement.x=1535;t.room.players.get('a').movement.worldId='main';
  assert.equal(t.act('a','enter',{vehicleId:t.vehicleId}).ok,false,'World validated');
  t.room.players.get('a').movement.worldId='village';
  t.act('a','enter',{vehicleId:t.vehicleId});
  Object.assign(t.room.players.get('b').movement,{x:1300,y:1054.5});
  for(let i=0;i<65;i++) {
    assert.equal(t.combat.act('b',{spawnId:'test',kind:'fire',angle:0,sequence:i+1},i*1500).ok,true);
    t.combat.advance(i*1500+400);
  }
  assert.equal(t.read().hp,0,'Server applies weapon damage to vehicle');
  assert.equal(t.read().driverId,null,'Destruction releases driver');
  assert.equal(t.combat.snapshot().players.find(p=>p.id==='a').vehicleId,null);
  assert.equal(t.act('a','enter',{vehicleId:t.vehicleId},100000).ok,false,'Destroyed vehicle cannot be entered');
}
console.log('Vehicles: exclusive seats, range/world validation, driver permissions, ammo, cooldowns, movement, health, destruction and disconnect passed');
