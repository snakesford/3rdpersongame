// Runs inside Chrome against the real server and lobby UI.
module.exports = async function checkRooms() {
  const network = await import('./network.js');
  const {io} = await import('/socket.io/socket.io.esm.min.js');
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
      const client = io({forceNew: true});
      clients.push(client);
      await until(() => client.connected);
    }
    const [guest, outsider, otherGuest, contender] = clients;
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
    assert(memberMessages[0].senderId === network.getSocketId(), 'Sender identity was spoofed');
    assert(memberMessages[0].data.marker === 'isolation', 'Message was not delivered');
    document.getElementById('leaveGameBtn').click();
    await until(() => !network.getRoom() && !document.getElementById('joinGameBtn').disabled);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert(otherMessages.length === 0 && otherStates.length === 0, 'Cross-room event leak');

    document.getElementById('roomCodeInput').value = code.toLowerCase();
    document.getElementById('joinGameForm').requestSubmit();
    await until(() => network.getRoom()?.players.length === 2);
    member.disconnect();
    await until(() => network.getRoom()?.players.length === 1);
    assert((await request(rejected, 'room:join', {code})).ok, 'Disconnect did not free a slot');
    await request(rejected, 'room:leave');
    await network.leaveRoom();
    assert(!(await request(rejected, 'room:join', {code})).ok, 'Empty room was not deleted');
    return 'Browser room checks passed: lobby create/join, capacity race, isolation, leave, disconnect, empty-room cleanup';
  } finally {
    clients.forEach(socket => socket.disconnect());
    if (network.getRoom()) await network.leaveRoom();
  }
};
