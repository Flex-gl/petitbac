import { DEMAND_RANKS, announce, chooseRank, draw, isLegal, passDrawn, play } from './engine.js';

const LEVELS = new Set(['easy', 'medium', 'hard']);

export function normalizeLevel(level) {
  return LEVELS.has(level) ? level : 'medium';
}

function cardsOf(state, playerId) {
  const player = state.players.find(entry => entry.id === playerId);
  return (player?.hand || []).map(id => state.cards[id]).filter(Boolean);
}

function demandRank(state, playerId, level) {
  const mine = cardsOf(state, playerId);
  const ranks = [...new Set(mine.map(card => card.rank).filter(rank => DEMAND_RANKS.includes(rank)))];
  if (!ranks.length) return null;
  if (level === 'easy') return ranks[Math.floor(Math.random() * ranks.length)];
  const opponent = state.players.find(entry => entry.id !== playerId && !entry.abandoned);
  const held = rank => (level === 'hard' && opponent ? (opponent.hand || []).filter(id => state.cards[id]?.rank === rank).length : 0);
  const owned = rank => mine.filter(card => card.rank === rank).length;
  return ranks.sort((a, b) => held(a) - held(b) || owned(b) - owned(a))[0];
}

function legalMoves(state, playerId) {
  const grouped = new Map();
  for (const card of cardsOf(state, playerId)) {
    if (!grouped.has(card.rank)) grouped.set(card.rank, []);
    grouped.get(card.rank).push(card.id);
  }
  const moves = [];
  const seen = new Set();
  const add = ids => {
    if (!isLegal(state, playerId, ids)) return;
    const key = ids.slice().sort().join(',');
    if (seen.has(key)) return;
    seen.add(key);
    moves.push(ids);
  };
  for (const [rank, ids] of grouped) {
    if (rank !== 'JOKER' && ids.length > 1) add(ids);
    for (const id of ids) add([id]);
  }
  return moves;
}

function weigh(state, playerId, ids, level) {
  const cards = ids.map(id => state.cards[id]);
  const rank = cards[0].rank;
  const center = state.cards[state.discard.at(-1)];
  let score = ids.length * 12;
  if (rank === 'JOKER') score -= level === 'hard' ? 36 : level === 'medium' ? 16 : 2;
  if (rank === '8') score -= level === 'hard' ? 22 : level === 'medium' ? 8 : 0;
  if (rank === '2' || rank === '10' || rank === 'A') score += level === 'easy' ? 2 : 8;
  if (center && rank === center.rank) score += 5;
  if (level === 'hard') {
    const opponent = state.players.find(entry => entry.id !== playerId && !entry.abandoned);
    if (opponent && opponent.hand.length <= 2 && (rank === 'A' || rank === '2' || rank === '10' || rank === 'JOKER')) score += 24;
  }
  if (level === 'easy') score += Math.random() * 28;
  else if (level === 'medium') score += Math.random() * 6;
  return score;
}

export function choosePoseidon(state, playerId, level = 'medium') {
  const skill = normalizeLevel(level);
  if (state.phase === 'demand' && state.demandOwnerId === playerId) {
    const rank = demandRank(state, playerId, skill);
    if (rank) return { type: 'choose', rank };
  }
  const player = state.players.find(entry => entry.id === playerId);
  if (player?.hand.length === 1 && !player.announced) return { type: 'announce' };
  const moves = legalMoves(state, playerId);
  if (!moves.length) return state.mustResolveDraw ? { type: 'pass' } : { type: 'draw' };
  let pool = skill === 'easy' ? moves.filter(ids => ids.length === 1) : moves;
  if (skill === 'hard') {
    const sets = pool.filter(ids => ids.length > 1);
    if (sets.length) pool = sets;
  }
  if (!pool.length) pool = moves;
  pool.sort((a, b) => weigh(state, playerId, b, skill) - weigh(state, playerId, a, skill));
  return { type: 'play', cardIds: pool[0] };
}

export function applyPoseidon(state, playerId, level) {
  const choice = choosePoseidon(state, playerId, level);
  if (choice.type === 'announce') announce(state, playerId);
  else if (choice.type === 'choose') chooseRank(state, playerId, choice.rank);
  else if (choice.type === 'play') play(state, playerId, choice.cardIds);
  else if (choice.type === 'draw') draw(state, playerId);
  else if (choice.type === 'pass') passDrawn(state, playerId);
  return choice;
}
