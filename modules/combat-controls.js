import {combatSession} from './combat-session.js';
import {hero, mouse, player, grenadeAim, heroProjectiles, heroGrenades, grenadeShockwaves, engineerDeployables} from './state.js';

export function installCombatControls(systems) {
  const request = (kind, slot=null, x=mouse.worldX, y=mouse.worldY) => {
    if (hero.isDead || hero.vehicleId !== null || player.inventoryOpen || player.victory || player.loss) return false;
    const dx=(x ?? mouse.worldX)-hero.x, dy=(y ?? mouse.worldY)-hero.y;
    return combatSession.send?.({kind,slot,angle:Math.atan2(dy,dx),distance:Math.hypot(dx,dy)}) || false;
  };
  const wrap = (name, handler) => {
    const singlePlayer = systems[name];
    systems[name] = (...args) => combatSession.active ? handler(...args) : singlePlayer(...args);
  };
  for (const name of ['spawnHeroBullet','spawnHeroBowShot']) wrap(name, (x,y) => {
    if (hero.isReloading || hero.rifleCooldown>0 || hero.battleMedicineUseTimer>0) return false;
    return request('fire',null,x,y);
  });
  wrap('startReload', () => request('reload'));
  wrap('useSlash', (x,y) => request('ability','F',x,y));
  for (const name of ['useBattleMedicine','useAdrenalineShot','placeRepairStation']) wrap(name, () => request('ability','Q'));
  for (const name of ['useEngineerBoltShot','useHuntersMark']) wrap(name, () => request('ability','F'));
  wrap('placeAutoTurret', () => request('ability','G'));
  wrap('startGrenadeAim', () => {
    if (hero.selectedClass === 'engineer') return request('ability','G');
    if (!hero.isDead && ['soldier','bountyHunter'].includes(hero.selectedClass) && hero.grenadeCooldownRemaining<=0) {
      grenadeAim.active=true; return true;
    }
    return false;
  });
  for (const name of ['useSoldierGrenade','fireExplosiveBolt']) wrap(name, (x,y) => {
    grenadeAim.active=false;
    return request('ability','G',x,y);
  });
  wrap('useSprint', () => request('ability','Shift'));
  wrap('useRobotDash', () => request('ability','dash',hero.x+Math.cos(hero.lastMoveAngle || 0)*100,hero.y+Math.sin(hero.lastMoveAngle || 0)*100));
  // No client-side combat simulations, healing, pickups or vehicle weapons in a room.
  for (const name of ['useAxeSwing','updateReload','updateActiveAbility','updateHeroProjectiles','updateGrenades',
    'updateEngineerDeployables','dealDamage','respawnHero','updateAutomaticPickups',
    'initializeEnemyForces','initializeForestEncounterSpawners','spawnSkeletonWave','spawnSingleSkeleton',
    'enterHumvee','fireHumveeGun','useSmartMissile']) wrap(name, () => false);
  wrap('updatePlayerCombatTimers', dt => {
    // Only presentation countdowns advance locally. Server snapshots correct them.
    for (const field of ['rifleShotAnimationTimer','battleMedicineUseTimer','adrenalineTimer','sprintTimer','dashTimer']) {
      hero[field]=Math.max(0,hero[field]-dt);
    }
  });
  wrap('isSoldierRifleShooting', () => hero.selectedClass==='soldier' && hero.rifleShotAnimationTimer>0 && !hero.isDead);
  systems.clearLocalCombatEffects = () => {
    heroProjectiles.length=0; heroGrenades.length=0; grenadeShockwaves.length=0; engineerDeployables.length=0;
    hero.abilityEffect=null; grenadeAim.active=false;
  };
}
