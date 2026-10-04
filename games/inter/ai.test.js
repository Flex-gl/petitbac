import test from 'node:test';
import assert from 'node:assert/strict';
import { beginMatch } from './engine.js';
import { applyPoseidon, choosePoseidon, normalizeLevel } from './ai.js';

test('les trois niveaux de Poséidon ne jouent qu’un coup permis', () => {
  assert.equal(normalizeLevel('dur'), 'medium');
  for (const level of ['easy', 'medium', 'hard']) {
    const state = beginMatch([{ id: 'humain', name: 'Amina' }, { id: 'poseidon', name: 'Poséidon' }], { rounds: 1 });
    let steps = 0;
    while (state.status === 'playing' && steps < 180) {
      const player = state.players[state.turnIndex];
      const choice = choosePoseidon(state, player.id, level);
      assert.ok(['play', 'draw', 'pass', 'choose', 'announce'].includes(choice.type));
      applyPoseidon(state, player.id, level);
      steps += 1;
    }
    assert.ok(steps < 180);
    assert.notEqual(state.status, 'playing');
  }
});
