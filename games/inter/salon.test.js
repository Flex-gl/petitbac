import test from 'node:test';
import assert from 'node:assert/strict';

process.env.KV_REST_API_URL = 'https://example.upstash.io';
process.env.KV_REST_API_TOKEN = 'test-token';

const store = new Map();
globalThis.fetch = async (_url, options) => {
  const command = JSON.parse(options.body);
  const [op] = command;
  let result = null;
  if (op === 'GET') result = store.has(command[1]) ? store.get(command[1]) : null;
  else if (op === 'SET') {
    const exists = store.has(command[1]);
    if (command.includes('NX') && exists) result = null;
    else { store.set(command[1], command[2]); result = 'OK'; }
  } else if (op === 'EVAL') {
    if (String(command[1]).includes('ZADD')) result = 1;
    else {
      const key = command[3];
      const version = command[4];
      const payload = command[5];
      if (!store.has(key)) result = -1;
      else if (Number(JSON.parse(store.get(key)).version || 0) !== Number(version)) result = 0;
      else { store.set(key, payload); result = 1; }
    }
  } else throw new Error(`Redis inattendu: ${op}`);
  return { ok: true, json: async () => ({ result }) };
};

const { createInter, createSolo, mutateInter, getInter, presentInter } = await import('../../api/_inter.js');

test('salon INTER : prêt, distribution, coup refusé, main cachée', async () => {
  const created = await createInter({ playerId: 'h1', name: 'Hote', maxPlayers: 2, rounds: 1 });
  await mutateInter({ action: 'join', code: created.code, playerId: 'g1', name: 'Invite' });
  await mutateInter({ action: 'ready', code: created.code, playerId: 'h1' });
  const started = await mutateInter({ action: 'ready', code: created.code, playerId: 'g1' });
  assert.equal(started.status, 'playing');
  assert.equal(started.players[0].hand.length, 4);
  assert.equal(started.deck.length, 54 - 8 - 1);
  const guestView = presentInter(await getInter(started.code), 'g1');
  const hidden = started.players[0].hand[0];
  assert.equal(guestView.players.find(player => player.id === 'h1').hand, undefined);
  assert.equal(JSON.stringify(guestView).includes(hidden), false);
  const host = started.players[started.turnIndex];
  const foreign = started.players.find(player => player.id !== host.id).hand[0];
  await assert.rejects(() => mutateInter({ action: 'play', code: created.code, playerId: host.id, cardIds: [foreign] }), /autorisé|pas ton tour/);
  const reclaimed = await mutateInter({ action: 'reclaim', code: created.code, playerId: 'h2', name: 'Hote', hostSecret: created.hostSecret });
  assert.equal(reclaimed.hostId, 'h2');
  assert.equal(reclaimed.players.find(player => player.id === 'h2').hand.length, 4);
});

test('une partie contre Poséidon démarre sans montrer sa main', async () => {
  const game = await createSolo({ playerId: 'h1', name: 'Amina', level: 'hard' });
  assert.equal(game.status, 'playing');
  assert.equal(game.ai.level, 'hard');
  assert.equal(game.players.find(player => player.bot).name, 'Poséidon');
  assert.notEqual(game.players[game.turnIndex].id, 'poseidon');
  const view = presentInter(await getInter(game.code), 'h1');
  assert.equal(view.players.find(player => player.id === 'poseidon').hand, undefined);
  assert.equal(view.ai.level, 'hard');
  assert.ok(view.players.find(player => player.id === 'h1').hand.length >= 1);
});
