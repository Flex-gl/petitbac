const SUITS = [
  { id: 'hearts', symbol: '♥', red: true },
  { id: 'diamonds', symbol: '♦', red: true },
  { id: 'clubs', symbol: '♣', red: false },
  { id: 'spades', symbol: '♠', red: false }
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const DEMAND_RANKS = RANKS.slice();
export const RANK_LABELS = { A: 'AS', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', J: 'VALET', Q: 'DAME', K: 'ROI', JOKER: 'JOKER' };

const DEFAULT_SCORES = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 25, 9: 9, 10: 10, J: 10, Q: 10, K: 10, JOKER: 50 };

export class InterError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function defaultRules(overrides = {}) {
  const scores = { ...DEFAULT_SCORES, ...(overrides.scores || {}) };
  return {
    initialHand: 4,
    minPlayers: 2,
    maxPlayers: 6,
    drawCount: 1,
    stackTwos: true,
    stackTens: true,
    stackJokers: true,
    aceSkips: true,
    eightWild: true,
    jokerDraw: 5,
    twoDraw: 2,
    tenDraw: 4,
    jackEffect: null,
    queenEffect: null,
    kingEffect: null,
    lastCardPenalty: 0,
    rounds: 1,
    ...overrides,
    scores
  };
}

export function cardLabel(card) {
  if (!card) return '';
  if (card.rank === 'JOKER') return 'JOKER';
  const suit = SUITS.find(entry => entry.id === card.suit);
  return `${suit?.symbol || ''} ${RANK_LABELS[card.rank] || card.rank}`;
}

function cardType(rank) {
  if (rank === 'JOKER') return 'joker';
  if (rank === 'A') return 'stop';
  if (rank === '2' || rank === '10') return 'draw';
  if (rank === '8') return 'demand';
  return 'normal';
}

function cardEffect(rank) {
  if (rank === 'A') return 'skip';
  if (rank === '2') return 'draw2';
  if (rank === '8') return 'demand';
  if (rank === '10') return 'draw4';
  if (rank === 'JOKER') return 'draw5';
  return null;
}

export function createDeck() {
  const cards = {};
  const ids = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = `${rank}-${suit.id}`;
      cards[id] = { id, rank, suit: suit.id, red: suit.red, symbol: suit.symbol, type: cardType(rank), effect: cardEffect(rank) };
      ids.push(id);
    }
  }
  for (const id of ['joker-1', 'joker-2']) {
    cards[id] = { id, rank: 'JOKER', suit: 'joker', red: false, symbol: '★', type: 'joker', effect: 'draw5' };
    ids.push(id);
  }
  return { cards, ids };
}

export function shuffle(list, random = Math.random) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function log(state, entry) {
  state.log.push({ ...entry, at: Date.now(), turn: state.turnCount || 0 });
  if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
}

function activeIndexes(state) {
  return state.players.map((player, index) => index).filter(index => !state.players[index].abandoned);
}

function playerById(state, playerId) {
  const player = state.players.find(entry => entry.id === playerId && !entry.abandoned);
  if (!player) throw new InterError('Tu ne fais pas partie de cette partie.', 403);
  return player;
}

function centerId(state) {
  const pile = state.discard || [];
  return pile[pile.length - 1] || null;
}

function centerCard(state) {
  const id = centerId(state);
  return id ? state.cards[id] : null;
}

function isWild(rank, rules) {
  return (rank === '8' && rules.eightWild) || rank === 'JOKER';
}

function isDemandEscape(rank, rules) {
  return isWild(rank, rules) || (rank === 'A' && rules.aceSkips) || rank === '2' || rank === '10';
}

function canStack(state, rank) {
  if (state.penaltyKind === 'two' && rank === '2' && state.rules.stackTwos) return true;
  if (state.penaltyKind === 'ten' && rank === '10' && state.rules.stackTens) return true;
  if (state.penaltyKind === 'joker' && rank === 'JOKER' && state.rules.stackJokers) return true;
  return false;
}

function assertPlaying(state, playerId) {
  if (state.status !== 'playing') throw new InterError('La partie n’est pas en cours.');
  const player = playerById(state, playerId);
  if (state.players[state.turnIndex]?.id !== playerId) throw new InterError('Ce n’est pas ton tour.', 403);
  if (state.phase === 'demand') throw new InterError('La valeur demandée n’a pas encore été choisie.');
  return player;
}

export function isLegal(state, playerId, cardIds) {
  if (state.status !== 'playing' || state.phase !== 'play') return false;
  if (state.players[state.turnIndex]?.id !== playerId) return false;
  if (!Array.isArray(cardIds) || !cardIds.length) return false;
  const unique = [...new Set(cardIds)];
  if (unique.length !== cardIds.length) return false;
  const player = state.players.find(entry => entry.id === playerId && !entry.abandoned);
  if (!player || !unique.every(id => player.hand.includes(id))) return false;
  const chosen = unique.map(id => state.cards[id]).filter(Boolean);
  if (chosen.length !== unique.length) return false;
  if (!chosen.every(card => card.rank === chosen[0].rank)) return false;
  const rank = chosen[0].rank;
  const center = centerCard(state);
  if (!center) return false;
  if (state.pendingDraw > 0) return canStack(state, rank);
  if (state.requestedRank) return rank === state.requestedRank || isDemandEscape(rank, state.rules);
  if (isWild(rank, state.rules)) return true;
  if (rank === center.rank) return true;
  if (chosen.length === 1 && chosen[0].suit === center.suit && center.suit !== 'joker') return true;
  const stackable = rank === 'A' || rank === '2' || rank === '10';
  return stackable && chosen.some(card => card.suit === center.suit && card.suit !== 'joker');
}

export function playableIds(state, playerId) {
  const player = state.players.find(entry => entry.id === playerId);
  if (!player) return [];
  const groups = new Map();
  for (const id of player.hand) {
    const rank = state.cards[id]?.rank;
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(id);
  }
  const allowed = [];
  for (const id of player.hand) {
    const same = groups.get(state.cards[id].rank);
    if (isLegal(state, playerId, [id]) || (same.length > 1 && isLegal(state, playerId, same))) allowed.push(id);
  }
  return allowed;
}

function hasAnyLegal(state, playerId) {
  return playableIds(state, playerId).length > 0;
}

function refill(state, random) {
  if (state.discard.length <= 1) return false;
  const top = state.discard.pop();
  state.deck = shuffle(state.discard, random);
  state.discard = [top];
  log(state, { type: 'DECK_RECYCLED', playerId: null, count: state.deck.length });
  return true;
}

function take(state, count, random) {
  const drawn = [];
  for (let index = 0; index < count; index += 1) {
    if (!state.deck.length) refill(state, random);
    if (!state.deck.length) break;
    drawn.push(state.deck.pop());
  }
  return drawn;
}

function passTurn(state) {
  const order = activeIndexes(state);
  if (order.length <= 1) {
    concludeMatch(state, order[0]);
    return;
  }
  let cursor = order.indexOf(state.turnIndex);
  if (cursor < 0) cursor = 0;
  for (let guard = 0; guard < order.length + state.pendingSkip + 4; guard += 1) {
    cursor = (cursor + 1) % order.length;
    const next = state.players[order[cursor]];
    if (state.pendingSkip > 0) {
      state.pendingSkip -= 1;
      log(state, { type: 'PLAYER_SKIPPED', playerId: next.id, name: next.name });
      continue;
    }
    state.turnIndex = order[cursor];
    state.turnCount += 1;
    state.mustResolveDraw = false;
    state.drewThisTurn = false;
    return;
  }
}

function handPoints(state, player) {
  return player.hand.reduce((total, id) => total + Number(state.rules.scores[state.cards[id]?.rank] || 0), 0);
}

function concludeRound(state, winner) {
  for (const player of state.players) {
    if (player.abandoned) continue;
    const points = player.id === winner?.id ? 0 : handPoints(state, player);
    player.roundPoints = points;
    player.matchScore = (player.matchScore || 0) + points;
  }
  state.winnerId = winner?.id || null;
  log(state, { type: 'PLAYER_WON', playerId: winner?.id || null, name: winner?.name || '', round: state.round });
  if (state.round >= state.rules.rounds) concludeMatch(state, state.players.findIndex(player => player.id === winner?.id));
  else {
    state.status = 'between';
    state.phase = 'between';
    state.nextRoundAt = Date.now() + 5000;
  }
}

function concludeMatch(state, winnerIndex) {
  if (state.status === 'finished') return;
  const standing = state.players.filter(player => !player.abandoned).map(player => ({ id: player.id, score: player.matchScore || 0, cards: player.hand.length }));
  standing.sort((a, b) => a.score - b.score || a.cards - b.cards);
  state.winnerId = standing[0]?.id || state.players[winnerIndex]?.id || null;
  state.status = 'finished';
  state.phase = 'finished';
  state.finishedAt = Date.now();
}

function addPenalty(state, kind, amount) {
  if (state.penaltyKind && state.penaltyKind !== kind) state.pendingDraw = 0;
  state.penaltyKind = kind;
  state.pendingDraw += amount;
}

export function deal(state, random = Math.random) {
  const pack = createDeck();
  state.cards = pack.cards;
  state.deck = shuffle(pack.ids, random);
  state.discard = [];
  state.pendingDraw = 0;
  state.pendingSkip = 0;
  state.penaltyKind = null;
  state.requestedRank = null;
  state.phase = 'play';
  state.openingDemand = false;
  state.demandOwnerId = null;
  state.mustResolveDraw = false;
  state.drewThisTurn = false;
  state.lastPlayCount = 1;
  state.turnCount = 1;
  const handSize = Math.max(1, Number(state.rules.initialHand) || 4);
  for (const player of state.players) {
    if (player.abandoned) continue;
    player.hand = [];
    player.announced = false;
    player.oneCard = false;
    player.roundPoints = 0;
    for (let index = 0; index < handSize && state.deck.length; index += 1) player.hand.push(state.deck.pop());
    player.oneCard = player.hand.length === 1;
  }
  const starter = activeIndexes(state);
  state.turnIndex = starter[(state.round - 1) % starter.length] || 0;
  if (!state.deck.length) throw new InterError('Le paquet est trop petit pour cette distribution.');
  state.discard.push(state.deck.pop());
  const opening = centerCard(state);
  if (opening?.rank === '8' && state.rules.eightWild) {
    state.phase = 'demand';
    state.openingDemand = true;
    state.demandOwnerId = state.players[state.turnIndex].id;
  }
  state.status = 'playing';
  if (!state.startedAt) state.startedAt = Date.now();
  log(state, { type: 'ROUND_DEALT', playerId: null, round: state.round, center: opening?.id });
  return state;
}

export function beginMatch(players, rules = defaultRules(), random = Math.random) {
  const state = {
    status: 'playing',
    round: 1,
    rules: defaultRules(rules),
    players: players.map(player => ({
      id: player.id,
      name: player.name,
      hand: [],
      abandoned: false,
      announced: false,
      oneCard: false,
      matchScore: 0,
      roundPoints: 0,
      penaltiesReceived: 0,
      cardsPlayed: 0
    })),
    log: [],
    winnerId: null,
    startedAt: Date.now(),
    finishedAt: null
  };
  return deal(state, random);
}

export function play(state, playerId, cardIds, random = Math.random) {
  const player = assertPlaying(state, playerId);
  if (!isLegal(state, playerId, cardIds)) throw new InterError('Ce coup n’est pas autorisé.', 403);
  const chosen = cardIds.map(id => state.cards[id]);
  const before = player.hand.length;
  for (const id of cardIds) {
    player.hand = player.hand.filter(cardId => cardId !== id);
    state.discard.push(id);
  }
  player.cardsPlayed += cardIds.length;
  state.lastPlayCount = cardIds.length;
  state.mustResolveDraw = false;
  state.drewThisTurn = false;
  const rank = chosen[0].rank;
  state.requestedRank = null;
  if (rank === 'A' && state.rules.aceSkips) state.pendingSkip += cardIds.length;
  else if (rank === '2') addPenalty(state, 'two', state.rules.twoDraw * cardIds.length);
  else if (rank === '10') addPenalty(state, 'ten', state.rules.tenDraw * cardIds.length);
  else if (rank === 'JOKER') addPenalty(state, 'joker', state.rules.jokerDraw * cardIds.length);
  else if (rank === '8' && state.rules.eightWild) {
    state.phase = 'demand';
    state.openingDemand = false;
    state.demandOwnerId = player.id;
  }
  log(state, { type: 'PLAYER_PLAYED_CARD', playerId, name: player.name, cards: chosen.map(card => card.id), penalty: state.pendingDraw, skip: state.pendingSkip });
  if (player.hand.length === 1) player.oneCard = true;
  if (player.hand.length === 0) {
    const forgot = before === 1 && player.oneCard && !player.announced && state.rules.lastCardPenalty > 0;
    if (forgot) {
      const drawn = take(state, state.rules.lastCardPenalty, random);
      player.hand.push(...drawn);
      player.penaltiesReceived += drawn.length;
      player.oneCard = player.hand.length === 1;
      log(state, { type: 'PLAYER_DREW_CARDS', playerId, name: player.name, count: drawn.length, reason: 'last-card' });
    } else {
      concludeRound(state, player);
      return state;
    }
  }
  if (state.phase === 'demand') return state;
  passTurn(state);
  return state;
}

export function chooseRank(state, playerId, rank) {
  if (state.status !== 'playing' || state.phase !== 'demand') throw new InterError('Aucune valeur n’est à demander.');
  if (state.demandOwnerId !== playerId) throw new InterError('Tu ne choisis pas la valeur.', 403);
  if (!DEMAND_RANKS.includes(rank)) throw new InterError('Cette valeur n’existe pas.');
  state.requestedRank = rank;
  state.phase = 'play';
  log(state, { type: 'PLAYER_REQUESTED_VALUE', playerId, name: playerById(state, playerId).name, rank });
  const opening = state.openingDemand;
  state.openingDemand = false;
  if (!opening) passTurn(state);
  return state;
}

export function draw(state, playerId, random = Math.random) {
  const player = assertPlaying(state, playerId);
  if (state.pendingDraw > 0) {
    const count = state.pendingDraw;
    const drawn = take(state, count, random);
    player.hand.push(...drawn);
    player.penaltiesReceived += drawn.length;
    player.oneCard = player.hand.length === 1;
    state.pendingDraw = 0;
    state.penaltyKind = null;
    log(state, { type: 'PLAYER_DREW_CARDS', playerId, name: player.name, count: drawn.length, reason: 'penalty' });
    passTurn(state);
    return state;
  }
  if (state.drewThisTurn || state.mustResolveDraw) throw new InterError('Tu as déjà pioché. Pose une carte ou passe.');
  const drawn = take(state, Math.max(1, state.rules.drawCount), random);
  player.hand.push(...drawn);
  player.oneCard = player.hand.length === 1;
  state.drewThisTurn = true;
  log(state, { type: 'PLAYER_DREW_CARDS', playerId, name: player.name, count: drawn.length, reason: 'choice' });
  if (hasAnyLegal(state, playerId)) state.mustResolveDraw = true;
  else passTurn(state);
  return state;
}

export function passDrawn(state, playerId) {
  assertPlaying(state, playerId);
  if (!state.mustResolveDraw) throw new InterError('Tu n’as pas de carte piochée à laisser.');
  state.mustResolveDraw = false;
  passTurn(state);
  return state;
}

export function announce(state, playerId) {
  if (state.status !== 'playing') throw new InterError('La partie n’est pas en cours.');
  const player = playerById(state, playerId);
  if (player.hand.length !== 1) throw new InterError('Tu annonces INTER quand il te reste une carte.');
  player.announced = true;
  log(state, { type: 'PLAYER_ANNOUNCED', playerId, name: player.name });
  return state;
}

export function abandon(state, playerId) {
  const player = state.players.find(entry => entry.id === playerId);
  if (!player || player.abandoned) throw new InterError('Tu ne fais pas partie de cette partie.', 403);
  if (state.status === 'lobby') {
    state.players = state.players.filter(entry => entry.id !== playerId);
    return state;
  }
  player.abandoned = true;
  player.hand = [];
  log(state, { type: 'PLAYER_ABANDONED', playerId, name: player.name });
  const left = state.players.filter(entry => !entry.abandoned);
  if (state.status === 'playing' && left.length <= 1) concludeMatch(state, state.players.findIndex(entry => entry.id === left[0]?.id));
  else if (state.status === 'playing' && state.players[state.turnIndex]?.id === playerId) passTurn(state);
  return state;
}

export function continueMatch(state, random = Math.random) {
  if (state.status !== 'between') throw new InterError('La manche suivante n’est pas prête.');
  state.round += 1;
  state.status = 'playing';
  return deal(state, random);
}

export function transferPlayer(state, previousId, nextId, name) {
  const player = state.players.find(entry => entry.id === previousId);
  if (!player) throw new InterError('Le siège à reprendre est introuvable.', 404);
  player.id = nextId;
  if (name) player.name = name;
  if (state.hostId === previousId) state.hostId = nextId;
  if (state.demandOwnerId === previousId) state.demandOwnerId = nextId;
  if (state.winnerId === previousId) state.winnerId = nextId;
  return state;
}

function publicCard(state, id) {
  const card = state.cards?.[id];
  if (!card) return null;
  return { id: card.id, rank: card.rank, suit: card.suit, red: card.red, symbol: card.symbol, type: card.type, effect: card.effect };
}

export function publicView(state, viewerId = '') {
  const finished = state.status === 'finished' || state.status === 'between';
  const turnPlayer = state.players[state.turnIndex];
  const players = state.players.map(player => {
    const self = player.id === viewerId;
    const base = {
      id: player.id,
      name: player.name,
      ready: Boolean(player.ready),
      abandoned: Boolean(player.abandoned),
      announced: Boolean(player.announced),
      cardCount: player.hand?.length || 0,
      penaltiesReceived: player.penaltiesReceived || 0,
      cardsPlayed: player.cardsPlayed || 0,
      matchScore: player.matchScore || 0,
      roundPoints: player.roundPoints || 0,
      connected: Boolean(player.seenAt && Date.now() - player.seenAt < 25000),
      seenAt: player.seenAt || null
    };
    if (self || finished) base.hand = (player.hand || []).map(id => publicCard(state, id)).filter(Boolean);
    return base;
  });
  const ranking = players.filter(player => !player.abandoned).slice().sort((a, b) => a.matchScore - b.matchScore || a.cardCount - b.cardCount);
  return {
    kind: 'inter',
    code: state.code,
    version: state.version || 0,
    status: state.status,
    phase: state.phase || state.status,
    round: state.round || 0,
    rules: state.rules,
    hostId: state.hostId,
    hostSecret: state.hostId === viewerId ? state.hostSecret : undefined,
    players,
    center: publicCard(state, centerId(state)),
    lastPlayCount: state.lastPlayCount || 1,
    deckCount: state.deck?.length || 0,
    discardCount: state.discard?.length || 0,
    turnPlayerId: turnPlayer?.id || null,
    pendingDraw: state.pendingDraw || 0,
    penaltyKind: state.penaltyKind || null,
    pendingSkip: state.pendingSkip || 0,
    requestedRank: state.requestedRank || null,
    demandOwnerId: state.demandOwnerId || null,
    openingDemand: Boolean(state.openingDemand),
    mustResolveDraw: Boolean(state.mustResolveDraw),
    drewThisTurn: Boolean(state.drewThisTurn),
    playable: state.status === 'playing' ? playableIds(state, viewerId) : [],
    yourTurn: turnPlayer?.id === viewerId && state.status === 'playing',
    winnerId: state.winnerId || null,
    ranking,
    turnCount: state.turnCount || 0,
    startedAt: state.startedAt || null,
    finishedAt: state.finishedAt || null,
    nextRoundAt: state.nextRoundAt || null,
    log: (state.log || []).slice(-12).map(entry => ({
      type: entry.type,
      playerId: entry.playerId,
      name: entry.name || '',
      count: entry.count || 0,
      rank: entry.rank || null,
      penalty: entry.penalty || 0,
      reason: entry.reason || null,
      cards: entry.type === 'PLAYER_PLAYED_CARD' ? (entry.cards || []).map(id => publicCard(state, id)).filter(Boolean) : undefined,
      at: entry.at
    })),
    serverNow: Date.now()
  };
}
