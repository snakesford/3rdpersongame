// Optional multiplayer adapter. Importing game systems alone keeps single-player
// behavior intact; only a spawned, connected room installs this transport.
export const combatSession = {
  active: false,
  send: null,
  snapshot: null,
  receivedAt: 0,
  update(snapshot) {
    if (this.snapshot?.spawnId === snapshot.spawnId && this.snapshot.revision >= snapshot.revision) return false;
    this.snapshot = snapshot;
    this.receivedAt = Date.now();
    return true;
  },
  clear() { this.active = false; this.send = null; this.snapshot = null; },
  player(id) { return this.snapshot?.players.find(p => p.id === id) || null; },
};
