// Presentation-only allowlist. Never relay damage, health, target IDs or gameplay objects.
const number = (min = -10000, max = 10000) => value => Number.isFinite(value) && value >= min && value <= max;
const boolean = value => typeof value === 'boolean';
const choice = (...values) => value => values.includes(value);
const angle = number(-Math.PI * 2, Math.PI * 2);
const timer = number(0, 1000000);
const optional = rule => value => value === undefined || rule(value);
const nullable = rule => value => value === null || rule(value);
const object = shape => value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid action object');
  return Object.fromEntries(Object.entries(shape).flatMap(([key, rule]) => {
    const result = rule(value[key]);
    if (result === false) throw Error(`Invalid action ${key}`);
    return value[key] === undefined ? [] : [[key, result === true ? value[key] : result]];
  }));
};
const list = (rule, max) => value => {
  if (!Array.isArray(value) || value.length > max) throw Error('Invalid action list');
  return value.map(rule);
};
const point = {x: number(), y: number()};
const projectile = object({...point, angle, radius: number(0, 100),
  style: optional(choice('arrow', 'engineerBolt', 'explosiveBolt', 'smartMissile', 'bullet')),
  armorPenetration: optional(number(0, 1))});
const maybeObject = rule => value => value === null ? null : rule(value);
const sanitizeActions = object({
  worldId: choice('village', 'main', 'tutorial', 'waves', 'arena'),
  aimAngle: angle, facingAngle: angle, lastMoveAngle: nullable(angle),
  animation: choice('idle', 'run', 'shoot', 'reload', 'medicine', 'dead'),
  runAnimationTimer: timer, isMoving: boolean, isDead: boolean,
  hasRifle: boolean, hasBow: boolean, hasAxe: boolean,
  rifleFireMode: choice('semi', 'automatic'), rifleShotAnimationTimer: timer, rifleShotAngle: angle,
  rifleShooting: boolean, bowShooting: boolean, isReloading: boolean, reloadTimer: timer,
  battleMedicineUseTimer: timer, adrenalineTimer: timer, hunterMarkTimer: timer,
  slashArcTimer: timer, axeSwingTimer: timer, axeSwingDuration: timer,
  abilityEffect: maybeObject(object({effect: optional(choice('cone', 'nova', 'line', 'burst', 'projectile', 'mark', 'engineerBolt')),
    aimAngle: angle, radius: number(0, 2000), halfAngle: number(0, Math.PI),
    range: number(0, 3000), pendingShots: list(object({}), 32), projectiles: list(projectile, 64)})),
  projectiles: list(projectile, 64),
  grenades: list(object({...point, ttl: timer, maxTtl: number(0.001, 100), radius: number(0, 100),
    arcCurve: optional(choice('quadratic')), arcHeight: number(0, 500)}), 16),
  shockwaves: list(object({...point, ttl: timer, maxTtl: number(0.001, 100), coreScale: optional(number(0, 100)),
    particles: list(object({targetRadius: number(0, 2000), speedScale: number(0, 100), angle,
      drift: number(), size: number(0, 100), color: value => typeof value === 'string' && /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(value)}), 64)}), 16),
  deployables: list(object({...point, kind: choice('repairStation', 'autoTurret'), ttl: timer, angle}), 16),
  markTarget: maybeObject(object({...point, markerY: number()})),
});
module.exports = {sanitizeActions};
