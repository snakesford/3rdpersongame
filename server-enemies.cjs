const options = require('./enemy-options.json');

// Room-owned state; no client event can create or modify these records.
function createEnemies(spawnId) {
  const entities = new Map(), initialized = new Set();
  let nextId = 0, wave = 0, nextWaveAt = null, streamAt = 0, tileSpawned = false;
  function spawn(kind, x, y, worldId) {
    const config = options[kind];
    const enemy = {id:`${spawnId}:enemy:${++nextId}`, kind, radius:config.radius,
      hp:config.hp, maxHp:config.hp, dead:false, targetId:null, attackAt:0, attackingUntil:0,
      movement:{x,y,worldId,onFoot:true}};
    entities.set(enemy.id, enemy);
    return enemy;
  }
  function update(now, dt, players, attack) {
    const worlds = new Set(players.map(p => p.movement.worldId));
    if (worlds.has('main') && !initialized.has('main')) {
      initialized.add('main');
      for (const [kind,x,y] of [['boss',1200,700],['enemySoldier',2100,1220],
        ['enemyHero',2150,1150],['goblin',1168,1068],['goblin',1288,920],
        ['goblin',1464,930],['goblin',1612,782],['goblinArcher',1378,1106],['goblinArcher',1718,876]]) spawn(kind,x,y,'main');
    }
    const onTile = (x,y) => players.some(p => p.movement.worldId==='main' &&
      p.movement.x>=x && p.movement.x<=x+90 && p.movement.y>=y && p.movement.y<=y+90);
    if (!tileSpawned && onTile(370,850)) {
      tileSpawned=true;
      for(let i=0;i<5;i++) spawn('skeleton',350+i*65,110,'main');
    }
    if (onTile(470,850) && now>=streamAt && [...entities.values()].filter(e=>!e.dead).length<64) {
      streamAt=now+500; spawn('skeleton',500,110,'main');
    }
    if(worlds.has('waves') && wave<2 && ![...entities.values()].some(e=>e.movement.worldId==='waves' && !e.dead)) {
      if(nextWaveAt===null) nextWaveAt=now+3000;
      if(now>=nextWaveAt) {
        const count=wave===0?3:5;
        for(let i=0;i<count;i++) {
          const angle=i*Math.PI*2/count;
          spawn('skeleton',1200+Math.cos(angle)*330,950+Math.sin(angle)*330,'waves');
        }
        wave++; nextWaveAt=null;
      }
    }
    for(const enemy of entities.values()) {
      if(enemy.dead) {enemy.targetId=null;continue;}
      const config=options[enemy.kind], pos=enemy.movement;
      const candidates=players.filter(p=>p.movement.worldId===pos.worldId)
        .map(p=>({player:p,distance:Math.hypot(p.movement.x-pos.x,p.movement.y-pos.y)}))
        .filter(t=>pos.worldId==='waves' || enemy.kind==='skeleton' || t.distance<=350)
        .sort((a,b)=>a.distance-b.distance || a.player.id.localeCompare(b.player.id));
      const target=candidates[0];
      enemy.targetId=target?.player.id || null;
      if(!target) continue;
      const angle=Math.atan2(target.player.movement.y-pos.y,target.player.movement.x-pos.x);
      const range=config.attackRange+18;
      const desired=config.preferredRange || range;
      const direction=target.distance>desired?1:config.retreatRange && target.distance<config.retreatRange?-1:0;
      const step=Math.min(config.speed*Math.min(dt,0.1),Math.abs(target.distance-desired));
      pos.x=Math.max(enemy.radius,Math.min(2400-enemy.radius,pos.x+Math.cos(angle)*step*direction));
      pos.y=Math.max(enemy.radius,Math.min(1900-enemy.radius,pos.y+Math.sin(angle)*step*direction));
      if(target.distance<=range && config.damage>0 && now>=enemy.attackAt) {
        enemy.attackAt=now+config.attackCooldown*1000;enemy.attackingUntil=now+150;
        attack(enemy,target.player,config,angle);
      }
    }
    // Keep death in snapshots briefly, then remove the corpse without reusing its ID.
    for(const [id,e] of entities) if(e.dead) {
      e.diedAt ??= now;
      if(now-e.diedAt>1000) entities.delete(id);
    }
  }
  function snapshot(now) {
    return [...entities.values()].map(e=>({id:e.id,kind:e.kind,...e.movement,radius:e.radius,
      hp:e.hp,maxHp:e.maxHp,isDead:e.dead,targetId:e.targetId,isAttacking:e.attackingUntil>now}));
  }
  return {entities,update,snapshot};
}
module.exports={createEnemies};
