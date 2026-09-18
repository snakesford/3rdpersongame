// Runs inside Chrome against the real server and lobby UI.
module.exports = async function checkRooms() {
  const network = await import('./network.js');
  const {io} = await import('/socket.io/socket.io.esm.min.js');
  const {createPlayerRegistry} = await import('./modules/multiplayer.js');
  const {player, hero} = await import('./modules/state.js');
  const originalHeroId = hero.id;
  const registries = new Map();
  const clients = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const until = async condition => {
    const deadline = Date.now() + 5000;
    while (!condition()) {
      if (Date.now() > deadline) throw new Error('Room check timed out');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  const request = (socket, event, payload = null) => new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error, result) => error ? reject(error) : resolve(result));
  });
  try {
    for (let i = 0; i < 4; i++) {
      const client = io({forceNew: true, autoConnect: false});
      const registry = createPlayerRegistry();
      registries.set(client, registry);
      client.on('player:identity', ({id}) => registry.setIdentity(id));
      client.on('room:state', room => registry.setRoomPlayers(room?.players));
      client.on('disconnect', () => registry.reset());
      clients.push(client);
      client.connect();
      await until(() => client.connected && registry.localPlayerId);
    }
    const [guest, outsider, otherGuest, contender] = clients;
    const localId = network.getLocalPlayerId();
    const allIds = [localId, ...clients.map(client => registries.get(client).localPlayerId)];
    assert(new Set(allIds).size === 5 && allIds.every(Boolean), 'Player IDs are not unique');
    assert(localId !== network.getSocketId(), 'Player ID tied to transport ID');
    assert(network.getPlayers().size === 1 && network.getLocalPlayer().isLocal, 'Missing local identity outside room');
    document.getElementById('createGameBtn').click();
    await until(() => network.getRoom() && !document.getElementById('leaveGameBtn').disabled);
    const code = network.getRoom().code;
    assert(/^[A-HJ-NP-Z2-9]{6}$/.test(code), 'Invalid generated code');
    assert(document.getElementById('roomStatus').textContent.includes(code), 'Code not visible');
    const results = await Promise.all([guest, contender].map(socket => request(socket, 'room:join', {code: code.toLowerCase()})));
    assert(results.filter(result => result.ok).length === 1, 'Concurrent joins exceeded capacity');
    const member = results[0].ok ? guest : contender;
    const rejected = results[0].ok ? contender : guest;
    await until(() => network.getRoom().players.length === 2);
    const memberRegistry = registries.get(member);
    const memberId = memberRegistry.localPlayerId;
    await until(() => memberRegistry.players.size === 2);
    assert(network.getLocalPlayerId() === localId, 'Room join changed local identity');
    assert(network.getPlayers().size === 2, 'Client roster does not support multiple players');
    assert(network.getRemotePlayers()[0].id === memberId, 'Incorrect remote player');
    assert(!network.getRemotePlayers()[0].isLocal, 'Remote player marked local');
    assert(memberRegistry.getLocalPlayer().id === memberId && memberRegistry.getLocalPlayer().isLocal, 'Peer local identity incorrect');
    assert(memberRegistry.getRemotePlayers()[0].id === localId, 'Peer perspective is reversed');
    assert(network.getLocalPlayer() !== player && network.getRemotePlayers()[0] !== hero, 'Network identity aliases gameplay state');
    assert(document.querySelectorAll('#roomPlayers [data-local="true"]').length === 1, 'Lobby local player label missing');
    assert(document.querySelectorAll('#roomPlayers [data-local="false"]').length === 1, 'Lobby remote player label missing');
    const copiedRoom = network.getRoom();
    copiedRoom.players[0].id = 'forged';
    network.getPlayers().clear();
    assert(network.getPlayers().size === 2 && network.getRoom().players[0].id !== 'forged', 'Public snapshots mutate network state');
    assert(!(await request(member, 'room:create')).ok, 'Player joined two rooms');
    assert(!(await request(rejected, 'room:join', {code: {bad: true}})).ok, 'Malformed code accepted');
    assert(!(await request(rejected, 'room:join', {code: 'AAAAAA'})).ok, 'Missing room accepted');
    assert(!(await request(rejected, 'room:message', {code})).ok, 'Nonmember sent a message');

    const other = await request(outsider, 'room:create');
    assert(other.ok && other.room.code !== code, 'Room codes collided');
    assert((await request(otherGuest, 'room:join', {code: other.room.code})).ok, 'Second room join failed');
    const memberMessages = [], otherMessages = [], otherStates = [];
    member.on('room:message', value => memberMessages.push(value));
    for (const socket of [outsider, otherGuest, rejected]) {
      socket.on('room:message', value => otherMessages.push(value));
      socket.on('room:state', value => otherStates.push(value));
    }
    await network.sendRoomMessage({code: other.room.code, senderId: outsider.id, marker: 'isolation'});
    await until(() => memberMessages.length === 1);
    assert(memberMessages[0].senderId === localId, 'Sender identity was spoofed');
    assert(memberMessages[0].data.marker === 'isolation', 'Message was not delivered');
    document.getElementById('leaveGameBtn').click();
    await until(() => !network.getRoom() && !document.getElementById('joinGameBtn').disabled);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert(otherMessages.length === 0 && otherStates.length === 0, 'Cross-room event leak');
    assert(network.getPlayers().size === 1 && network.getLocalPlayerId() === localId, 'Leave did not clear only remote players');
    assert(!network.getPlayers().has(registries.get(outsider).localPlayerId), 'Other room player leaked into registry');

    document.getElementById('roomCodeInput').value = code.toLowerCase();
    document.getElementById('joinGameForm').requestSubmit();
    await until(() => network.getRoom()?.players.length === 2);
    const departures=[];
    const stopDepartures=network.on('player:left', event=>departures.push(event));
    member.disconnect();
    await until(() => network.getRoom()?.players.length === 1);
    await until(()=>departures.some(event=>event.id===memberId));
    stopDepartures();
    assert(departures.length===1 && departures[0].reason==='disconnected', 'Missing or duplicate disconnect notification');
    assert(document.getElementById('roomStatus').textContent.includes('disconnected'), 'Disconnect notification not visible');
    assert(!network.getPlayers().has(memberId), 'Disconnected remote player retained');
    assert(memberRegistry.localPlayerId === null && memberRegistry.players.size === 0, 'Disconnect did not reset peer registry');
    assert((await request(rejected, 'room:join', {code})).ok, 'Disconnect did not free a slot');
    await request(rejected, 'room:leave');
    await network.leaveRoom();
    assert(hero.id === originalHeroId, 'Networking changed local gameplay entity ID');
    assert(network.getLocalPlayerId() === localId && network.getRemotePlayers().length === 0, 'Identity changed across room operations');
    assert(!(await request(rejected, 'room:join', {code})).ok, 'Empty room was not deleted');
    outsider.disconnect();
    otherGuest.disconnect();
    await new Promise(resolve=>setTimeout(resolve,100));
    assert(!(await request(rejected, 'room:join', {code:other.room.code})).ok, 'Abrupt disconnects retained an empty room');
    return 'Browser room and player checks passed: unique IDs, local/remote perspectives, roster cleanup, lobby, capacity race, isolation';
  } finally {
    clients.forEach(socket => socket.disconnect());
    if (network.getRoom()) await network.leaveRoom();
  }
};
