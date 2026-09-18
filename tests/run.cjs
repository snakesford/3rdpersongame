const {spawnSync} = require('node:child_process');
for (const test of ['engineer', 'bounty-hunter', 'wave-mode', 'npcs', 'systems', 'movement-state', 'actions', 'server-combat', 'server-enemies', 'pickups', 'portals', 'vehicles', 'disconnects']) {
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', `tests/${test}.cjs`], {stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
