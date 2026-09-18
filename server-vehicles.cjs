// Existing village Humvee and loadouts, owned by the room in multiplayer.
const weapons = {
  machineGun:{ammo:300,damage:50,speed:720,radius:15,range:1200,interval:160,chance:0.18},
  grenade40:{ammo:75,damage:120,speed:1000,radius:12,range:850,interval:2000,style:'grenade',explosion:{radius:110,damage:120,falloff:true}},
  howitzer50:{ammo:15,damage:600,speed:2400,radius:19,range:1600,interval:3000,explosion:{radius:200,damage:600,falloff:true}},
};
function createVehicles(spawnId) {
  const id=`${spawnId}:humvee:1`;
  return new Map([[id,{id,type:'humvee',x:1460,y:1010,w:150,h:89,hp:1000,maxHp:1000,
    worldId:'village',driverId:null,selectable:false,isPlayer:false,dead:false,
    mountedWeapon:'machineGun',weaponAmmo:{machineGun:300,grenade40:75,howitzer50:15},ammo:300,maxAmmo:300,
    fireUntil:0,missileUntil:0,tech:null,techActive:false,repairUntil:0,ramContacts:new Set(),
    radius:70,movement:{x:1535,y:1054.5,worldId:'village'}}]]);
}
module.exports={createVehicles,vehicleWeapons:weapons};
