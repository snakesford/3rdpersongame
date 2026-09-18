const {randomInt} = require('node:crypto');
const {createEnemies} = require('./server-enemies.cjs');
const {createVehicles,vehicleWeapons} = require('./server-vehicles.cjs');
const characters = require('./character-options.json');

// Multiplayer-only base loadouts. Single-player combat.js and its upgrade rules
// remain independent. Speeds, radii, damage and headshot chances match base weapons.
const weapons = {
  soldier: {damage:16, ammo:30, interval:80, speed:720, radius:8.1, range:600, chance:0.18, multiplier:2},
  engineer: {damage:12, ammo:16, interval:280, speed:800, radius:4, range:600, chance:0.18, multiplier:2, style:'engineerBolt'},
  bountyHunter: {damage:20, ammo:8, interval:300, speed:720, radius:8.1, range:600, chance:0.18, multiplier:2.5},
  archer: {damage:42, ammo:0, interval:450, speed:820, radius:4.5, range:600, chance:0.22, multiplier:2, style:'arrow'},
};
const remaining = (end, now) => Math.max(0, (end - now) / 1000);
const normalize = a => Math.atan2(Math.sin(a), Math.cos(a));
function segmentHit(start, end, target, radius) {
  const dx=end.x-start.x, dy=end.y-start.y, ox=start.x-target.x, oy=start.y-target.y;
  const a=dx*dx+dy*dy, c=ox*ox+oy*oy-radius*radius;
  if (c <= 0) return 0;
  if (!a) return null;
  const b=2*(ox*dx+oy*dy), discriminant=b*b-4*a*c;
  if (discriminant < 0) return null;
  const t=(-b-Math.sqrt(discriminant))/(2*a);
  return t >= 0 && t <= 1 ? t : null;
}
function createCombat(room, {now = performance.now(), random = () => randomInt(0, 1000000)/1000000} = {}) {
  const states = new Map();
  const enemies = createEnemies(room.spawnId);
  const vehicles = createVehicles(room.spawnId);
  const driven = id => [...vehicles.values()].find(v=>v.driverId===id);
  function exitVehicle(id) {
    const v=driven(id), owner=room.players.get(id);
    if (!v) return;
    v.driverId=null; v.ramContacts.clear();
    if (owner) Object.assign(owner.movement,{x:v.x+v.w/2,y:Math.min(2782,v.y+v.h+26),onFoot:true});
  }
  const pickups = new Map(), lootWorlds = new Set();
  function spawnPickupDrop(item, position, delay=300) {
    const id = `${room.spawnId}:pickup:${++nextId}`;
    pickups.set(id, {id, ...item, x:position.x,y:position.y,worldId:position.worldId, radius:item.radius || 18, readyAt:clock+delay});
  }
  let clock = now, revision = 0, nextId = 0;
  let projectiles = [], effects = [], deployables = [], events = [];
  for (const player of room.players.values()) {
    const config=characters[player.selectedCharacter], weapon=weapons[player.selectedCharacter];
    states.set(player.id, {id:player.id, hp:config.stats.health, maxHp:config.stats.health,
      equippedHelmetType:null, equippedArmorValue:0, backpack:[], tutorialPathsUnlocked:false, bonusDamage:0,
      weaponType:weapon?.ammo ? 'rifle' : player.selectedCharacter==='archer' ? 'bow' : null,
      ammo:weapon?.ammo || 0, maxAmmo:weapon?.ammo || 0, dead:false, sequence:0,
      fireUntil:0, reloadUntil:0, F:0, Q:0, G:0, Shift:0, dash:0,
      shotUntil:0, shotAngle:0, medicineUntil:0, regenUntil:0, adrenalineUntil:0, markUntil:0, markId:null,
      sprintUntil:0, dashUntil:0});
  }
  const weaponFor = owner => {
    const state = states.get(owner.id);
    const weapon = state.weaponType==='rifle' ? weapons[owner.selectedCharacter]?.ammo ? weapons[owner.selectedCharacter] : weapons.soldier
      : state.weaponType==='bow' ? weapons.archer : null;
    return weapon ? {...weapon, damage:weapon.damage+state.bonusDamage} : null;
  };
  const livingPlayers = () => [...room.players.values()].filter(p => states.get(p.id)?.hp > 0 && p.movement?.onFoot);
  const targets = owner => (enemies.entities.has(owner.id) ? [...livingPlayers(),...[...vehicles.values()].filter(v=>v.hp>0)] :
    [...livingPlayers(), ...enemies.entities.values(),...vehicles.values()].filter(p => !p.dead))
    .filter(p => p.id !== owner.id && p.driverId !== owner.id && p.movement.worldId === owner.movement.worldId);
  const effect = (owner, data, duration=220) => effects.push({id:++nextId, ownerId:owner.id,
    worldId:owner.movement.worldId, x:owner.movement.x, y:owner.movement.y, until:clock+duration, ...data});
  function damage(owner, target, amount, headshot=false, penetration=null) {
    const state=states.get(target.id) || enemies.entities.get(target.id) || vehicles.get(target.id), source=states.get(owner.id);
    if (!state || state.dead) return;
    if (vehicles.has(target.id)) {
      if (state.techActive && state.tech==='trophy' && random()<0.4) return;
      state.repairUntil=clock+5000; headshot=false;
    }
    if (source?.markUntil > clock && source.markId === target.id) amount *= 1.25;
    if (penetration !== null || target.selectedCharacter === 'engineer') {
      amount *= 100/(100+Math.max(characters[target.selectedCharacter]?.stats.armor || 0,state.equippedArmorValue || 0)*(1-(penetration || 0)));
    }
    const dealt=Math.min(state.hp, Math.max(1, Math.round(amount)));
    state.hp=Math.max(0,state.hp-dealt);
    events.push({id:++nextId, type:'hit', sourceId:owner.id, targetId:target.id, damage:dealt,
      headshot, hp:state.hp, x:target.movement.x, y:target.movement.y});
    if (!state.hp) {
      if (vehicles.has(target.id) && state.driverId) exitVehicle(state.driverId);
      if (states.has(target.id)) exitVehicle(target.id);
      if (target.kind==='boss') spawnPickupDrop({type:'rareHelmet',armorValue:85},target.movement,0);
      else if (target.kind==='enemyHero') spawnPickupDrop({type:'enemyHelmet',armorValue:80},target.movement);
      else if (target.campId==='hiddenCamp' && random()<0.28) {
        const loot=[{type:'enemyHelmet',armorValue:80},{type:'weaponBuff',damageValue:2},{type:'healthBuff',healthValue:20}];
        spawnPickupDrop(loot[Math.floor(random()*loot.length)],target.movement);
      }
      if (states.has(target.id) && state.equippedHelmetType) {
        spawnPickupDrop({type:state.equippedHelmetType,armorValue:state.equippedArmorValue},target.movement);
        state.equippedHelmetType=null; state.equippedArmorValue=0;
      }
      state.dead=true; state.diedAt=clock; state.reloadUntil=0;
      state.medicineUntil=0; state.shotUntil=0; state.sprintUntil=0; state.dashUntil=0;
      events.push({id:++nextId,type:'death',sourceId:owner.id,targetId:target.id});
      // Cancel delayed casts and deployables, but already fired projectiles continue.
      projectiles=projectiles.filter(p => p.ownerId !== target.id || p.startsAt <= clock);
      deployables=deployables.filter(d => d.ownerId !== target.id);
    }
  }
  function projectile(owner, angle, config, delay=0, origin=owner.movement) {
    projectiles.push({id:++nextId,ownerId:owner.id,worldId:owner.movement.worldId,
      vehicleId:driven(owner.id)?.id || null,
      x:origin.x,y:origin.y,angle, traveled:0, startsAt:clock+delay,
      damage:config.damage,speed:config.speed,radius:config.radius,range:config.range,
      chance:config.chance || 0,multiplier:config.multiplier || 2, style:config.style || 'bullet',
      penetration:config.penetration ?? null, explosion:config.explosion ? {...config.explosion,vehicleId:driven(owner.id)?.id || null} : null});
  }
  function explosion(owner, point, config, direct=null) {
    effect(owner,{effect:'nova',x:point.x,y:point.y,radius:config.radius},250);
    for (const target of targets(owner)) {
      if (target.id===config.vehicleId) continue;
      const distance=Math.hypot(target.movement.x-point.x,target.movement.y-point.y);
      if (target.id === direct?.id) damage(owner,target,config.directDamage ?? 45);
      else if (distance <= config.radius) damage(owner,target,config.falloff
        ? Math.max(8,Math.round(config.damage*(1-distance/config.radius*0.6))) : config.damage);
    }
  }
  function advance(time) {
    const previous=clock;
    clock=Math.max(clock,time);
    const dt=(clock-previous)/1000;
    for (const [id,state] of states) {
      const owner=room.players.get(id);
      if (!owner || state.dead) continue;
      if (state.reloadUntil && state.reloadUntil <= clock) {state.ammo=state.maxAmmo; state.reloadUntil=0;}
      const regen=characters[owner.selectedCharacter].stats.regen || 0;
      state.hp=Math.min(state.maxHp,state.hp+regen*dt+Math.max(0,Math.min(clock,state.regenUntil)-previous)/1000*2);
    }
    for (const v of vehicles.values()) {
      if (v.hp>0 && v.techActive && v.tech==='repair') v.hp=Math.min(v.maxHp,v.hp+Math.max(0,clock-Math.max(previous,v.repairUntil))/1000*10);
    }
    for (const owner of room.players.values()) {
      const world=owner.movement?.worldId;
      if (lootWorlds.has(world)) continue;
      lootWorlds.add(world);
      if (world==='main') for (const [type,armorValue,x] of [['enemyHelmet',80,250],['helmet',60,330],['goldHelmet',100,410]]) {
        spawnPickupDrop({type,armorValue},{x,y:1150,worldId:world});
      }
      if (world==='tutorial') spawnPickupDrop({type:'tutorialScroll',radius:20},{x:1080,y:1210,worldId:world},0);
    }
    effects=effects.filter(e => e.until > clock);
    deployables=deployables.filter(d => room.players.has(d.ownerId) && !states.get(d.ownerId)?.dead && d.until > clock);
    for (const d of deployables) {
      const owner=room.players.get(d.ownerId), state=states.get(d.ownerId);
      if (owner.movement.worldId !== d.worldId) continue;
      if (d.kind === 'repairStation') {
        if (Math.hypot(owner.movement.x-d.x,owner.movement.y-d.y) <= 150) state.hp=Math.min(state.maxHp,state.hp+6*dt);
      } else {
        const target=targets(owner).find(p => Math.hypot(p.movement.x-d.x,p.movement.y-d.y) <= 320);
        if (target) {
          d.angle=Math.atan2(target.movement.y-d.y,target.movement.x-d.x);
          if (clock >= d.fireUntil) {
            projectile(owner,d.angle,{damage:10,speed:800,radius:4,range:320,style:'engineerBolt',penetration:0},0,d);
            d.fireUntil=clock+600;
          }
        }
      }
    }
    enemies.update(clock, dt, [...livingPlayers(),...[...vehicles.values()].filter(v=>v.hp>0)], (enemy,target,config,angle) => {
      events.push({id:++nextId,type:'enemy:attack',sourceId:enemy.id,targetId:target.id});
      if(config.attackStyle === 'ranged') projectile(enemy,angle,{damage:config.damage,
        speed:config.projectileSpeed,radius:config.projectileRadius,range:config.attackRange+100,style:'arrow'});
      else damage(enemy,target,config.damage);
    });
    const survivors=[];
    for (const p of projectiles) {
      const owner=room.players.get(p.ownerId) || enemies.entities.get(p.ownerId);
      if (!owner || owner.movement.worldId !== p.worldId || (states.get(owner.id)?.dead && p.startsAt > previous)) continue;
      if (p.startsAt > clock) {survivors.push(p); continue;}
      if (p.style==='smartMissile') {
        const target=targets(owner).filter(t=>t.id!==p.vehicleId && Math.hypot(t.movement.x-p.x,t.movement.y-p.y)<=700)
          .sort((a,b)=>Math.hypot(a.movement.x-p.x,a.movement.y-p.y)-Math.hypot(b.movement.x-p.x,b.movement.y-p.y))[0];
        if (target) {
          const turn=normalize(Math.atan2(target.movement.y-p.y,target.movement.x-p.x)-p.angle);
          p.angle+=Math.max(-5*dt,Math.min(5*dt,turn));
        }
      }
      const travel=Math.min(p.range-p.traveled,p.speed*Math.max(0,clock-Math.max(previous,p.startsAt))/1000);
      const end={x:p.x+Math.cos(p.angle)*travel,y:p.y+Math.sin(p.angle)*travel};
      let hit=null, fraction=Infinity;
      if (p.style !== 'grenade') for (const target of targets(owner)) {
        if(target.id===p.vehicleId) continue;
        const t=segmentHit(p,end,target.movement,(target.radius || 18)+p.radius);
        if (t !== null && t < fraction) {hit=target; fraction=t;}
      }
      p.traveled+=travel;
      if (hit) {
        p.x+=(end.x-p.x)*fraction; p.y+=(end.y-p.y)*fraction;
        if (p.explosion) explosion(owner,p,p.explosion,hit);
        else {
          const headshot=!vehicles.has(hit.id) && random() < p.chance;
          const helmet=states.get(hit.id)?.equippedHelmetType;
          const protection={helmet:0.2,rareHelmet:0.45,goldHelmet:0.75,enemyHelmet:0.6}[helmet] || 0;
          damage(owner,hit,p.damage*(headshot?1+(p.multiplier-1)*(1-protection):1),headshot,p.penetration);
        }
      } else {
        p.x=end.x; p.y=end.y;
        if (p.traveled >= p.range) {if (p.explosion) explosion(owner,p,p.explosion);}
        else survivors.push(p);
      }
    }
    projectiles=survivors;
  }
  function act(id, input, time) {
    advance(time);
    const owner=room.players.get(id), state=states.get(id);
    const reject=error=>({ok:false,error});
    if (!owner || !state || input?.spawnId !== room.spawnId) return reject('Combat requires the current room spawn.');
    if (!Number.isSafeInteger(input.sequence) || input.sequence <= state.sequence) return reject('Invalid or replayed action.');
    if (!['fire','reload','ability','collect','equipHelmet','vehicle'].includes(input.kind) || !Number.isFinite(input.angle) || Math.abs(input.angle)>Math.PI*2) return reject('Invalid combat action.');
    if (input.kind === 'ability' && !['F','Q','G','Shift','dash'].includes(input.slot)) return reject('Invalid ability.');
    // Consume valid sequence numbers even when cooldown/death rejects an action.
    state.sequence=input.sequence;
    if (input.kind==='vehicle' && !state.dead) return vehicleAction(owner,input);
    if (state.dead || !owner.movement?.onFoot) return reject('Cannot act while dead or in a vehicle.');
    const config=characters[owner.selectedCharacter], weapon=weaponFor(owner);
    const angle=normalize(input.angle), position=owner.movement;
    if (input.kind === 'equipHelmet') {
      if (!Number.isInteger(input.index) || !state.backpack[input.index]) return reject('Invalid backpack item.');
      const item=state.backpack[input.index];
      if(state.equippedHelmetType) state.backpack[input.index]={type:state.equippedHelmetType,armorValue:state.equippedArmorValue,radius:18};
      else state.backpack.splice(input.index,1);
      state.equippedHelmetType=item.type; state.equippedArmorValue=item.armorValue;
    } else if (input.kind === 'collect') {
      const item=pickups.get(input.pickupId);
      if (!item || item.worldId!==position.worldId || item.readyAt>clock ||
          Math.hypot(item.x-position.x,item.y-position.y)>18+item.radius+(['healthBuff','weaponBuff'].includes(item.type)?0:16)) return reject('Pickup is unavailable or too far away.');
      if (['helmet','rareHelmet','goldHelmet','enemyHelmet'].includes(item.type)) {
        if (state.equippedHelmetType && state.backpack.length>=8) return reject('Backpack full.');
        if (state.equippedHelmetType) state.backpack.push({type:state.equippedHelmetType,armorValue:state.equippedArmorValue,radius:18});
        state.equippedHelmetType=item.type; state.equippedArmorValue=item.armorValue;
      } else if (item.type==='tutorialScroll') state.tutorialPathsUnlocked=true;
      else if (item.type==='healthBuff') { state.maxHp+=item.healthValue; state.hp=state.maxHp; }
      else if (item.type==='weaponBuff') state.bonusDamage+=item.damageValue;
      else if (['axe','rifle','bow'].includes(item.type)) {
        if (state.weaponUntil>clock) return reject('Weapon pickup is on cooldown.');
        if(state.weaponType && state.weaponType!==item.type) spawnPickupDrop({type:state.weaponType},{...position,x:position.x+18});
        state.weaponType=item.type; state.weaponUntil=clock+800;
        state.maxAmmo=weaponFor(owner)?.ammo || 0; state.ammo=state.maxAmmo; state.reloadUntil=0;
      } else return reject('Invalid pickup type.');
      pickups.delete(item.id); // Synchronous claim: later collectors cannot receive this item.
      events.push({id:++nextId,type:'pickup:collected',sourceId:id,pickupId:item.id});
    } else if (input.kind === 'reload') {
      if (!state.maxAmmo || state.ammo >= state.maxAmmo || state.reloadUntil || state.medicineUntil>clock) return reject('Cannot reload now.');
      state.reloadUntil=clock+1200;
    } else if (input.kind === 'fire') {
      if (state.weaponType==='axe') {
        if(clock<state.fireUntil) return reject('Weapon is not ready.');
        state.fireUntil=clock+220;
        effect(owner,{effect:'cone',radius:64,halfAngle:Math.PI/3,aimAngle:angle});
        for(const target of targets(owner)) {
          const dx=target.movement.x-position.x,dy=target.movement.y-position.y;
          if(Math.hypot(dx,dy)<=64 && Math.abs(normalize(Math.atan2(dy,dx)-angle))<=Math.PI/3) damage(owner,target,18+state.bonusDamage);
        }
        return {ok:true};
      }
      if (!weapon) return reject('This character has no ranged weapon.');
      if (clock < state.fireUntil || state.reloadUntil || state.medicineUntil>clock || (state.maxAmmo && !state.ammo)) return reject('Weapon is not ready.');
      if (state.maxAmmo) state.ammo--;
      state.fireUntil=clock+weapon.interval; state.shotUntil=clock+150; state.shotAngle=angle;
      projectile(owner,angle,weapon);
      if (state.maxAmmo && !state.ammo) state.reloadUntil=clock+1200;
    } else {
      const slot=input.slot;
      if (clock < state[slot] || state.medicineUntil>clock) return reject('Ability is on cooldown.');
      if (slot === 'Shift') {state.Shift=clock+10000; state.sprintUntil=clock+5000;}
      else if (slot === 'dash' && owner.selectedCharacter === 'robot') {state.dash=clock+4000; state.dashUntil=clock+180; state.shotAngle=angle;}
      else if (slot === 'F' && config.effect) {
        if (config.effect === 'mark') {
          const target=targets(owner).find(t => {
            const distance=Math.hypot(t.movement.x-position.x,t.movement.y-position.y);
            return distance<=600 && Math.abs(normalize(Math.atan2(t.movement.y-position.y,t.movement.x-position.x)-angle))<=Math.atan2(30,distance);
          });
          if (!target) return reject('Aim at a target within range.');
          state.markId=target.id; state.markUntil=clock+8000;
        } else if (config.effect === 'burst') {
          config.shotAnglesDegrees.forEach((degrees,index)=>projectile(owner,angle+degrees*Math.PI/180,
            {...weapons.soldier,damage:config.damage,range:config.range},index*45));
          state.shotUntil=clock+420; state.shotAngle=angle;
        } else if (config.effect === 'projectile' || config.effect === 'engineerBolt') {
          projectile(owner,angle,config.effect === 'projectile' ? {...weapons.archer,damage:config.damage}
            : {damage:config.damage,speed:800,radius:4,range:600,style:'engineerBolt',penetration:0.5});
          state.shotUntil=clock+150; state.shotAngle=angle;
        } else {
          effect(owner,{effect:config.effect,radius:config.radius,halfAngle:config.halfAngle || 0,aimAngle:angle});
          for (const target of targets(owner)) {
            const dx=target.movement.x-position.x,dy=target.movement.y-position.y;
            if (Math.hypot(dx,dy)<=config.radius && (config.effect === 'nova' || Math.abs(normalize(Math.atan2(dy,dx)-angle))<=config.halfAngle)) damage(owner,target,config.damage);
          }
        }
        state.F=clock+config.cooldown*1000;
      } else if (slot === 'Q' && owner.selectedCharacter === 'soldier') {
        state.hp=Math.min(state.maxHp,state.hp+50);state.Q=clock+20000;state.medicineUntil=clock+900;state.regenUntil=clock+10000;
      } else if (slot === 'Q' && owner.selectedCharacter === 'bountyHunter') {
        state.hp=Math.min(state.maxHp,state.hp+30);state.Q=clock+20000;state.adrenalineUntil=clock+6000;
      } else if (owner.selectedCharacter === 'engineer' && ['Q','G'].includes(slot)) {
        const kind=slot==='Q'?'repairStation':'autoTurret';
        deployables=deployables.filter(d => d.ownerId!==id || d.kind!==kind);
        deployables.push({id:++nextId,ownerId:id,worldId:position.worldId,x:position.x,y:position.y,kind,angle,
          until:slot==='Q'?clock+12000:Infinity,fireUntil:clock});
        state[slot]=clock+(slot==='Q'?25000:30000);
      } else if (slot === 'G' && ['soldier','bountyHunter'].includes(owner.selectedCharacter)) {
        if (!Number.isFinite(input.distance) || input.distance<1) return reject('Invalid target distance.');
        const soldier=owner.selectedCharacter==='soldier', range=Math.min(input.distance,soldier?480:600);
        if (soldier && range<24) return reject('Grenade target is too close.');
        const duration=Math.min(0.65,0.22+range/700);
        projectile(owner,angle,{damage:0,speed:soldier?range/duration:900,radius:soldier?8:4,range,
          style:soldier?'grenade':'explosiveBolt',explosion:{radius:soldier?110:80,damage:soldier?42:25,falloff:soldier}});
        state.G=clock+(soldier?6000:8000);
      } else return reject('Ability unavailable for this character.');
    }
    events.push({id:++nextId,type:'action',sourceId:id,kind:input.kind,slot:input.slot || null,angle});
    return {ok:true};
  }
  function moveVehicle(id, position) {
    const v=driven(id);
    if (!v) return;
    const old={...v.movement};
    v.x=position.x-v.w/2; v.y=position.y-v.h/2; v.worldId=position.worldId;
    v.movement={x:position.x,y:position.y,worldId:position.worldId};
    if (old.worldId===position.worldId && (old.x!==position.x || old.y!==position.y)) {
      v.driveAngle=Math.atan2(position.y-old.y,position.x-old.x); v.facingLeft=position.x<old.x;
      const owner=room.players.get(id);
      for (const target of targets(owner).filter(t=>!vehicles.has(t.id))) {
        const near=Math.hypot(target.movement.x-position.x,target.movement.y-position.y)<70+(target.radius || 18);
        if (!near) v.ramContacts.delete(target.id);
        if (segmentHit(old,position,target.movement,70+(target.radius || 18))!==null && !v.ramContacts.has(target.id)) {
          v.ramContacts.add(target.id);
          damage(owner,target,target.kind==='boss'?150:(target.radius || 18)<=20?(states.get(target.id)||target).hp:200);
        }
      }
    }
  }
  function vehicleAction(owner,input) {
    const reject=error=>({ok:false,error}), state=states.get(owner.id);
    let v=driven(owner.id);
    if (input.operation==='enter') {
      const target=vehicles.get(input.vehicleId), p=owner.movement;
      if(v || !p.onFoot || !target || target.hp<=0 || target.driverId || target.worldId!==p.worldId ||
        Math.hypot(p.x-Math.max(target.x,Math.min(p.x,target.x+target.w)),p.y-Math.max(target.y,Math.min(p.y,target.y+target.h)))>54) return reject('Driver seat unavailable.');
      target.driverId=owner.id; Object.assign(p,target.movement,{onFoot:false});
      state.reloadUntil=0; state.medicineUntil=0; state.sprintUntil=0; state.dashUntil=0;
      return {ok:true};
    }
    if (!v || v.hp<=0) return reject('Only the driver can control this vehicle.');
    if (input.operation==='exit') {exitVehicle(owner.id); return {ok:true};}
    if (input.operation==='equip') {
      if (!Object.hasOwn(vehicleWeapons,input.weapon)) return reject('Unknown vehicle weapon.');
      v.mountedWeapon=input.weapon; v.ammo=v.weaponAmmo[input.weapon]; v.maxAmmo=vehicleWeapons[input.weapon].ammo;
    } else if (input.operation==='tech') {
      if (!['repair','trophy'].includes(input.tech)) return reject('Unknown vehicle tech.');
      if(v.tech!==input.tech) v.techActive=false;
      v.tech=input.tech;
    } else if (input.operation==='toggleTech') {
      if(!v.tech) return reject('No tech equipped.');
      v.techActive=!v.techActive;
    } else if (input.operation==='fire' || input.operation==='missile') {
      const origin={x:v.x+v.w/2,y:v.y+v.h*0.2}, angle=normalize(input.angle);
      if(input.operation==='missile') {
        if(clock<v.missileUntil) return reject('Missiles are on cooldown.');
        const target=targets(owner).filter(t=>Math.hypot(t.movement.x-origin.x,t.movement.y-origin.y)<=700)
          .sort((a,b)=>Math.hypot(a.movement.x-origin.x,a.movement.y-origin.y)-Math.hypot(b.movement.x-origin.x,b.movement.y-origin.y))[0];
        const base=target?Math.atan2(target.movement.y-origin.y,target.movement.x-origin.x):random()*Math.PI*2;
        for(let i=0;i<6;i++) projectile(owner,base+(target?(i-2.5)*0.32:i*Math.PI/3),
          {damage:150,speed:600,radius:6,range:1500,style:'smartMissile',explosion:{radius:95,damage:150,directDamage:150,falloff:true}},0,origin);
        v.missileUntil=clock+12000;
      } else {
        if(clock<v.fireUntil || v.ammo<=0) return reject('Vehicle weapon is not ready.');
        const config={...vehicleWeapons[v.mountedWeapon]};
        if(config.explosion) {
          if(!Number.isFinite(input.distance) || input.distance<1) return reject('Invalid target.');
          config.range=Math.min(config.range,input.distance);
          config.explosion={...config.explosion,directDamage:config.damage};
        }
        projectile(owner,angle,config,0,origin); v.ammo--; v.weaponAmmo[v.mountedWeapon]=v.ammo;
        v.fireUntil=clock+(v.mountedWeapon==='machineGun' ? (weapons[owner.selectedCharacter]?.ammo ? weapons[owner.selectedCharacter].interval : 80)*2 : config.interval);
      }
      v.aimAngle=angle;
      events.push({id:++nextId,type:'vehicle:attack',sourceId:owner.id,vehicleId:v.id,weapon:v.mountedWeapon});
    } else return reject('Unknown vehicle action.');
    return {ok:true};
  }
  function snapshot() {
    events = events.slice(-128);
    return {spawnId:room.spawnId,revision:++revision,serverTime:clock,
      enemies:enemies.snapshot(clock),
      vehicles:[...vehicles.values()].map(({ramContacts,movement,...v})=>({...v,weaponAmmo:{...v.weaponAmmo},
        gunCooldown:remaining(v.fireUntil,clock),smartMissileCooldown:remaining(v.missileUntil,clock)})),
      pickups:[...pickups.values()].map(({readyAt,...item})=>({...item,pickupDelay:remaining(readyAt,clock)})),
      players:[...states.values()].filter(s=>room.players.has(s.id)).map(s=>({id:s.id,hp:s.hp,maxHp:s.maxHp,
        vehicleId:driven(s.id)?.id || null,vehicleExitPosition:{x:room.players.get(s.id).movement.x,y:room.players.get(s.id).movement.y},
        equippedHelmetType:s.equippedHelmetType,equippedArmorValue:s.equippedArmorValue,
        backpack:s.backpack.map(item=>({...item})),tutorialPathsUnlocked:s.tutorialPathsUnlocked,bonusDamage:s.bonusDamage,
        ammo:s.ammo,maxAmmo:s.maxAmmo,isDead:s.dead,isReloading:!!s.reloadUntil,reloadTimer:remaining(s.reloadUntil,clock),
        rifleCooldown:remaining(s.fireUntil,clock),bowCooldown:remaining(s.fireUntil,clock),
        slashTimer:remaining(s.F,clock),battleMedicineCooldownRemaining:remaining(s.Q,clock),grenadeCooldownRemaining:remaining(s.G,clock),
        battleMedicineUseTimer:remaining(s.medicineUntil,clock),battleMedicineBuffTimer:remaining(s.regenUntil,clock),
        adrenalineTimer:remaining(s.adrenalineUntil,clock),hunterMarkTimer:remaining(s.markUntil,clock),markId:s.markId,
        rifleShotAnimationTimer:remaining(s.shotUntil,clock),rifleShotAngle:s.shotAngle,
        sprintTimer:remaining(s.sprintUntil,clock),sprintCooldownRemaining:remaining(s.Shift,clock),
        dashTimer:remaining(s.dashUntil,clock),dashCooldownRemaining:remaining(s.dash,clock),
        hasRifle:s.weaponType==='rifle',
        hasBow:s.weaponType==='bow',hasAxe:s.weaponType==='axe',sequence:s.sequence})),
      projectiles:projectiles.filter(p=>p.startsAt<=clock).map(p=>({id:p.id,ownerId:p.ownerId,worldId:p.worldId,x:p.x,y:p.y,
        angle:p.angle,radius:p.radius,style:p.style,armorPenetration:p.penetration || 0})),
      effects:effects.map(e=>({...e,ttl:remaining(e.until,clock)})),
      deployables:deployables.map(d=>({id:d.id,ownerId:d.ownerId,worldId:d.worldId,x:d.x,y:d.y,kind:d.kind,angle:d.angle,
        ttl:Number.isFinite(d.until)?remaining(d.until,clock):0})), events:events.map(event => ({...event}))};
  }
  function travel(id) {
    projectiles=projectiles.filter(p=>p.ownerId!==id); effects=effects.filter(e=>e.ownerId!==id);deployables=deployables.filter(d=>d.ownerId!==id);
  }
  function remove(id) {
    exitVehicle(id); states.delete(id); travel(id);
    for (const state of states.values()) if (state.markId===id) {state.markId=null; state.markUntil=0;}
    for (const enemy of enemies.entities.values()) if (enemy.targetId===id) enemy.targetId=null;
    for (const vehicle of vehicles.values()) vehicle.ramContacts.delete(id);
    events=events.filter(event=>event.sourceId!==id && event.targetId!==id);
  }
  return {act,advance,snapshot,remove,travel,driven,moveVehicle,isDead:id=>states.get(id)?.dead || false};
}
module.exports={createCombat, weapons, segmentHit};
