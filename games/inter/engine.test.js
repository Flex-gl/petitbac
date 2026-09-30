import test from 'node:test';
import assert from 'node:assert/strict';
import { beginMatch, play, draw, chooseRank, announce, abandon, continueMatch, publicView, isLegal, playableIds, createDeck, deal, defaultRules, transferPlayer, passDrawn } from './engine.js';

function table(hands, center, options = {}) {
  const pack = createDeck();
  const used = new Set();
  const takeId = token => {
    const id = token === 'JR' ? 'joker-1' : token === 'JB' ? 'joker-2' : `${token.slice(0, token.length - 1) === '10' ? '10' : token.slice(0, -1)}-${{ H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades' }[token.at(-1)]}`;
    const rank = token === 'JR' || token === 'JB' ? 'JOKER' : (token.startsWith('10') ? '10' : token.slice(0, -1));
    const suit = token === 'JR' || token === 'JB' ? 'joker' : { H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades' }[token.at(-1)];
    const real = Object.values(pack.cards).find(card => card.rank === rank && card.suit === suit && !used.has(card.id)) || pack.cards[id];
    used.add(real.id);
    return real.id;
  };
  const players = hands.map((hand, index) => ({
    id: `p${index + 1}`,
    name: `J${index + 1}`,
    hand: hand.map(takeId),
    abandoned: false,
    announced: false,
    oneCard: hand.length === 1,
    matchScore: 0,
    roundPoints: 0,
    penaltiesReceived: 0,
    cardsPlayed: 0
  }));
  const state = {
    status: 'playing',
    phase: 'play',
    round: 1,
    rules: defaultRules(options.rules),
    players,
    cards: pack.cards,
    deck: (options.deck || ['3H', '4H', '6H', '9D']).map(takeId),
    discard: [takeId(center)],
    turnIndex: options.turn || 0,
    pendingDraw: options.pendingDraw || 0,
    pendingSkip: 0,
    penaltyKind: options.penaltyKind || null,
    requestedRank: options.requestedRank || null,
    demandOwnerId: null,
    openingDemand: false,
    mustResolveDraw: false,
    lastPlayCount: 1,
    turnCount: 1,
    log: [],
    winnerId: null,
    startedAt: Date.now(),
    finishedAt: null
  };
  return state;
}

test('une carte de même enseigne ou de même valeur est acceptée', () => {
  const state = table([['3C', '7H', 'KD'], ['4S']], '7C');
  assert.equal(isLegal(state, 'p1', [state.players[0].hand[1]]), true);
  assert.equal(isLegal(state, 'p1', [state.players[0].hand[0]]), true);
  assert.equal(isLegal(state, 'p1', [state.players[0].hand[2]]), false);
});

test('deux 4 de trèfle et de pique se reconnaissent ensemble', () => {
  const state = table([['4C', '4S', '9H'], ['3D']], '7C');
  const fours = state.players[0].hand.slice(0, 2);
  assert.equal(isLegal(state, 'p1', [fours[0]]), true);
  assert.equal(isLegal(state, 'p1', [fours[1]]), false);
  assert.equal(isLegal(state, 'p1', fours), true);
  const allowed = playableIds(state, 'p1');
  assert.ok(fours.every(id => allowed.includes(id)));
  play(state, 'p1', fours);
  assert.equal(state.players[0].hand.length, 1);
  assert.equal(state.players[state.turnIndex].id, 'p2');
});

test('plusieurs cartes de même valeur se posent ensemble', () => {
  const state = table([['5H', '5D', '5S', '9C'], ['4S']], '5C');
  const ids = state.players[0].hand.slice(0, 3);
  assert.equal(isLegal(state, 'p1', ids), true);
  play(state, 'p1', ids);
  assert.equal(state.players[0].hand.length, 1);
  assert.equal(state.discard.at(-1), ids.at(-1));
  assert.equal(state.players[state.turnIndex].id, 'p2');
});

test('un as bloque le joueur suivant, et deux joueurs reviennent au poseur', () => {
  const state = table([['AC', '9H'], ['4S', '5S']], '7C');
  play(state, 'p1', [state.players[0].hand[0]]);
  assert.equal(state.phase, 'demand');
  chooseRank(state, 'p1', '9');
  assert.equal(state.players[state.turnIndex].id, 'p1');
  assert.ok(state.log.some(entry => entry.type === 'PLAYER_SKIPPED' && entry.playerId === 'p2'));
});

test('un as se pose sur tout et demande une valeur encore en main', () => {
  const state = table([['AS', '4C'], ['9D'], ['3S']], '7H');
  const ace = state.players[0].hand[0];
  assert.equal(isLegal(state, 'p1', [ace]), true);
  play(state, 'p1', [ace]);
  assert.equal(state.phase, 'demand');
  assert.throws(() => chooseRank(state, 'p1', 'K'), /possèdes/);
  chooseRank(state, 'p1', '4');
  assert.equal(state.requestedRank, '4');
  assert.equal(state.players[state.turnIndex].id, 'p3');
  assert.equal(isLegal(state, 'p3', [state.players[2].hand[0]]), false);
});

test('deux as bloquent deux joueurs sur trois', () => {
  const state = table([['AC', 'AH', '9C'], ['4S'], ['6D']], '7C');
  play(state, 'p1', state.players[0].hand.slice(0, 2));
  assert.equal(state.phase, 'demand');
  chooseRank(state, 'p1', '9');
  assert.equal(state.players[state.turnIndex].id, 'p1');
  assert.equal(state.log.filter(entry => entry.type === 'PLAYER_SKIPPED').length, 2);
});

test('les 2 se cumulent et le suivant les reçoit tout de suite', () => {
  const state = table([['2C', '2H', '9C'], ['2D', '4S'], ['6D', '6S']], '7C');
  play(state, 'p1', state.players[0].hand.slice(0, 2));
  assert.equal(state.pendingDraw, 0);
  assert.equal(state.players[1].hand.length, 6);
  assert.equal(state.players[1].penaltiesReceived, 4);
  assert.equal(state.players[state.turnIndex].id, 'p3');
  assert.ok(state.log.some(entry => entry.type === 'PLAYER_DREW_CARDS' && entry.reason === 'penalty' && entry.count === 4));
});

test('le 8 se pose librement et la valeur demandée s’impose', () => {
  const state = table([['8D', 'KS', '4C'], ['KH', '3S'], ['9D']], '7C');
  play(state, 'p1', [state.players[0].hand[0]]);
  assert.equal(state.phase, 'demand');
  assert.equal(state.players[state.turnIndex].id, 'p1');
  assert.throws(() => chooseRank(state, 'p1', 'Q'), /possèdes/);
  chooseRank(state, 'p1', 'K');
  assert.equal(state.requestedRank, 'K');
  assert.equal(state.players[state.turnIndex].id, 'p2');
  assert.equal(isLegal(state, 'p2', [state.players[1].hand[0]]), true);
  assert.equal(isLegal(state, 'p2', [state.players[1].hand[1]]), false);
  play(state, 'p2', [state.players[1].hand[0]]);
  assert.equal(state.requestedRank, null);
});

test('les 10 et les jokers arrivent tout de suite au suivant', () => {
  const deck = ['3H', '4H', '5D', '5C', '5S', '6D', '7H', '7S', '9H', '9C', 'QS', 'QD'];
  const tens = table([['10C', '10H', '3C'], ['9D'], ['6S']], '10D', { deck });
  play(tens, 'p1', tens.players[0].hand.slice(0, 2));
  assert.equal(tens.pendingDraw, 0);
  assert.equal(tens.players[1].hand.length, 9);
  assert.equal(tens.players[tens.turnIndex].id, 'p3');
  const jokers = table([['JR', 'JB', '4C'], ['9D'], ['6S']], '7C', { deck });
  play(jokers, 'p1', jokers.players[0].hand.slice(0, 2));
  assert.equal(jokers.pendingDraw, 0);
  assert.equal(jokers.players[1].hand.length, 11);
  assert.equal(jokers.players[jokers.turnIndex].id, 'p3');
});

test('valet, dame et roi n’ont pas d’effet', () => {
  const state = table([['JC', '4H'], ['4S']], '7C');
  play(state, 'p1', [state.players[0].hand[0]]);
  assert.equal(state.pendingDraw, 0);
  assert.equal(state.pendingSkip, 0);
  assert.equal(state.status, 'playing');
});

test('sans coup possible on pioche, et la pioche vide recycle la défausse sans la carte visible', () => {
  const state = table([['KH'], ['4S']], '7C', { deck: ['9D', '3S'] });
  state.deck = [];
  state.discard = ['2H', '4D', '7C'].map(token => {
    const suit = { H: 'hearts', D: 'diamonds', C: 'clubs' }[token.at(-1)];
    return Object.values(state.cards).find(card => card.rank === token.slice(0, -1) && card.suit === suit && !state.players.some(player => player.hand.includes(card.id))).id;
  });
  const center = state.discard.at(-1);
  draw(state, 'p1', () => 0);
  assert.equal(state.discard.at(-1), center);
  assert.equal(state.players[0].hand.length, 2);
  assert.ok(state.log.some(entry => entry.type === 'DECK_RECYCLED'));
});

test('on peut piocher même avec une carte jouable, une seule fois', () => {
  const state = table([['7H'], ['4S']], '7C');
  const before = state.turnIndex;
  draw(state, 'p1');
  assert.equal(state.players[0].hand.length, 2);
  assert.equal(state.turnIndex, before);
  assert.equal(state.mustResolveDraw, true);
  assert.throws(() => draw(state, 'p1'), /déjà pioché/);
});

test('la dernière carte et la victoire', () => {
  const state = table([['7H'], ['4S', '5S', 'KD']], '7C');
  assert.equal(state.players[0].oneCard, true);
  announce(state, 'p1');
  play(state, 'p1', [state.players[0].hand[0]]);
  assert.equal(state.status, 'finished');
  assert.equal(state.winnerId, 'p1');
  assert.equal(state.players[0].matchScore, 0);
  assert.ok(state.players[1].matchScore > 0);
  assert.ok(state.log.some(entry => entry.type === 'PLAYER_WON'));
});

test('une pénalité de dernière carte oubliée est configurable', () => {
  const state = table([['7H'], ['4S']], '7C', { rules: { lastCardPenalty: 2 }, deck: ['3H', '4D', '9S'] });
  play(state, 'p1', [state.players[0].hand[0]]);
  assert.equal(state.status, 'playing');
  assert.equal(state.players[0].hand.length, 2);
});

test('triche : mauvaise main, mauvais tour, cartes adverses invisibles', () => {
  const state = table([['7H', '3C'], ['AS', 'KD']], '7C');
  const hidden = state.players[1].hand[0];
  assert.throws(() => play(state, 'p1', [hidden]), /autorisé/);
  assert.throws(() => play(state, 'p2', [state.players[1].hand[0]]), /pas ton tour/);
  const view = publicView(state, 'p1');
  assert.equal(view.players[1].hand, undefined);
  assert.equal(view.players[0].hand.length, 2);
  assert.equal(JSON.stringify(view).includes(hidden), false);
  assert.deepEqual(view.deckCount >= 0, true);
  assert.equal(view.deck, undefined);
});

test('distribution, deux joueurs, reprise de siège et manche suivante', () => {
  const dealt = beginMatch([{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Boris' }], defaultRules({ initialHand: 4, rounds: 2 }), () => 0.5);
  assert.equal(dealt.players[0].hand.length, 4);
  assert.equal(dealt.players[1].hand.length, 4);
  assert.equal(dealt.deck.length, 54 - 8 - 1);
  assert.ok(dealt.discard.length === 1);
  transferPlayer(dealt, 'a', 'a2', 'Anna');
  assert.equal(dealt.players[0].id, 'a2');
  assert.equal(dealt.players[0].hand.length, 4);
  dealt.status = 'between';
  continueMatch(dealt, () => 0.2);
  assert.equal(dealt.round, 2);
  assert.equal(dealt.players[0].hand.length, 4);
});

test('un joueur qui pioche une carte jouable garde la main', () => {
  const state = table([['KH'], ['4S']], '7C', { deck: ['7D'] });
  draw(state, 'p1', () => 0);
  assert.equal(state.mustResolveDraw, true);
  assert.equal(state.players[state.turnIndex].id, 'p1');
  passDrawn(state, 'p1');
  assert.equal(state.players[state.turnIndex].id, 'p2');
});

test('abandonner à deux laisse la victoire au dernier', () => {
  const state = table([['7H'], ['4S']], '7C');
  abandon(state, 'p2');
  assert.equal(state.status, 'finished');
  assert.equal(state.winnerId, 'p1');
});

test('le paquet compte 54 cartes', () => {
  const pack = createDeck();
  assert.equal(pack.ids.length, 54);
  assert.equal(new Set(pack.ids).size, 54);
});

test('un salon en attente n’a pas encore de défausse', () => {
  const view = publicView({ status: 'lobby', phase: 'lobby', code: 'ABC123', hostId: 'h', rules: defaultRules(), players: [{ id: 'h', name: 'Hote', ready: false, hand: [] }], log: [] }, 'h');
  assert.equal(view.center, null);
  assert.equal(view.players[0].cardCount, 0);
  assert.equal(view.deckCount, 0);
});

test('deal ne mélange pas la logique de salon', () => {
  const state = { round: 1, rules: defaultRules({ initialHand: 4 }), players: [{ id: 'a', name: 'A', abandoned: false }, { id: 'b', name: 'B', abandoned: false }], log: [] };
  deal(state, () => 0.3);
  assert.equal(state.players[0].hand.length, 4);
  assert.equal(state.status, 'playing');
});
