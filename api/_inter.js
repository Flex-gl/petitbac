import { createIfAbsent, getJson, updateVersioned, redis } from './_redis.js';
import { InterError, beginMatch, play, chooseRank, draw, passDrawn, announce, abandon, continueMatch, publicView, transferPlayer, defaultRules, absorbPending } from '../games/inter/engine.js';

const GAME_TTL = 604800;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const RECORD_SCRIPT = `
if redis.call('SET', KEYS[1], '1', 'NX', 'EX', 31536000) == false then return 0 end
local players = cjson.decode(ARGV[1])
local winner = ARGV[2]
local playedAt = ARGV[3]
for _, player in ipairs(players) do
  local key = 'arena:inter:player:' .. player.id
  local raw = redis.call('GET', key)
  local stat = raw and cjson.decode(raw) or { id = player.id, games = 0, wins = 0, penalties = 0 }
  stat.name = player.name
  stat.games = tonumber(stat.games or 0) + 1
  stat.wins = tonumber(stat.wins or 0) + (player.id == winner and 1 or 0)
  stat.penalties = tonumber(stat.penalties or 0) + tonumber(player.penalties or 0)
  stat.lastPlayed = playedAt
  redis.call('SET', key, cjson.encode(stat))
  redis.call('ZADD', 'arena:inter:leaderboard', stat.wins, player.id)
end
return 1
`;

export { InterError };

function cleanName(value) {
  const name = String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (name.length < 2) throw new InterError('Choisis un pseudo ou un nom d’au moins deux lettres.');
  return name;
}

function roomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, byte => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('');
}

function normalizedCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function keyFor(code) {
  return `arena:inter:${code}`;
}

function rulesFrom(input) {
  const maxPlayers = [2, 3, 4, 5, 6].includes(Number(input.maxPlayers)) ? Number(input.maxPlayers) : 4;
  const rounds = [1, 3, 5].includes(Number(input.rounds)) ? Number(input.rounds) : 1;
  const initialHand = Number(input.initialHand);
  return defaultRules({
    maxPlayers,
    rounds,
    initialHand: initialHand >= 1 && initialHand <= 8 ? initialHand : 4
  });
}

function blankPlayer(id, name) {
  return { id, name, ready: false, hand: [], abandoned: false, announced: false, oneCard: false, matchScore: 0, roundPoints: 0, penaltiesReceived: 0, cardsPlayed: 0, seenAt: Date.now(), connected: true };
}

async function remember(game) {
  if (game.status !== 'finished') return;
  const players = game.players.filter(player => !player.abandoned).map(player => ({ id: player.id, name: player.name, penalties: player.penaltiesReceived || 0 }));
  await redis('EVAL', RECORD_SCRIPT, '1', `arena:inter:recorded:${game.code}:${game.startedAt}`, JSON.stringify(players), String(game.winnerId || ''), new Date().toISOString());
}

function maybeLaunch(game, force) {
  if (game.status !== 'lobby') return;
  const present = game.players.filter(player => !player.abandoned);
  const ready = present.length >= game.rules.minPlayers && present.every(player => player.ready);
  const full = present.length === game.rules.maxPlayers;
  if (ready && (full || force)) {
    const started = beginMatch(present.map(player => ({ id: player.id, name: player.name })), game.rules);
    const code = game.code;
    const hostId = game.hostId;
    const hostSecret = game.hostSecret;
    const version = game.version;
    const createdAt = game.createdAt;
    Object.assign(game, started);
    game.code = code;
    game.hostId = hostId;
    game.hostSecret = hostSecret;
    game.version = version;
    game.createdAt = createdAt;
    game.kind = 'inter';
    for (const player of game.players) player.seenAt = Date.now();
  }
}

function touch(game, playerId) {
  const player = game.players.find(entry => entry.id === playerId);
  if (player) {
    player.seenAt = Date.now();
    player.connected = true;
  }
  const now = Date.now();
  for (const entry of game.players) entry.connected = Boolean(entry.seenAt && now - entry.seenAt < 25000);
}

export async function createInter(input) {
  const name = cleanName(input.name);
  const id = String(input.playerId || crypto.randomUUID()).slice(0, 80);
  const rules = rulesFrom(input);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = roomCode();
    const game = {
      kind: 'inter',
      code,
      version: 0,
      status: 'lobby',
      phase: 'lobby',
      hostId: id,
      hostSecret: crypto.randomUUID(),
      rules,
      players: [{ ...blankPlayer(id, name), ready: false }],
      log: [],
      createdAt: Date.now(),
      private: true
    };
    if (await createIfAbsent(keyFor(code), game, GAME_TTL)) return game;
  }
  throw new InterError('Impossible de réserver un code de salon. Réessaie.', 503);
}

export async function getInter(codeValue) {
  const code = normalizedCode(codeValue);
  if (code.length !== 6) throw new InterError('Le code doit contenir six caractères.');
  const key = keyFor(code);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const game = await getJson(key);
    if (!game) throw new InterError('Ce salon n’existe plus. Vérifie le code.', 404);
    const penaltyDue = game.status === 'playing' && game.phase !== 'demand' && game.pendingDraw > 0;
    const roundDue = game.status === 'between' && Date.now() >= (game.nextRoundAt || 0);
    if (!penaltyDue && !roundDue) {
      if (game.status === 'finished') await remember(game);
      return game;
    }
    const version = game.version || 0;
    if (roundDue) continueMatch(game);
    if (game.pendingDraw > 0 && game.phase !== 'demand') absorbPending(game);
    if (await updateVersioned(key, { version }, game, GAME_TTL)) {
      game.version = version + 1;
      return game;
    }
  }
  throw new InterError('Le salon reçoit beaucoup de mises à jour. Réessaie dans un instant.', 409);
}

export async function mutateInter(input) {
  const code = normalizedCode(input.code);
  if (code.length !== 6) throw new InterError('Le code doit contenir six caractères.');
  const key = keyFor(code);
  const playerId = String(input.playerId || '').slice(0, 80);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const game = await getJson(key);
    if (!game) throw new InterError('Ce salon n’existe plus. Vérifie le code.', 404);
    const version = game.version || 0;
    if (game.status === 'between' && Date.now() >= (game.nextRoundAt || 0)) continueMatch(game);
    const action = String(input.action || '');
    if (action === 'reclaim') {
      if (!game.hostSecret || String(input.hostSecret || '') !== game.hostSecret) throw new InterError('Tu ne peux pas reprendre ce salon.', 403);
      if (!game.players.some(player => player.id === playerId)) transferPlayer(game, game.hostId, playerId, input.name ? cleanName(input.name) : '');
    } else if (action === 'join') {
      const name = cleanName(input.name);
      if (game.status !== 'lobby') throw new InterError('La partie a déjà commencé.');
      const existing = game.players.find(player => player.id === playerId);
      if (!existing && game.players.length >= game.rules.maxPlayers) throw new InterError('Ce salon est complet.');
      if (existing) existing.name = name;
      else game.players.push(blankPlayer(playerId, name));
    } else if (action === 'ready') {
      const player = game.players.find(entry => entry.id === playerId);
      if (!player) throw new InterError('Tu ne fais pas partie de ce salon.', 403);
      if (game.status !== 'lobby') throw new InterError('La partie a déjà commencé.');
      player.ready = !player.ready;
      maybeLaunch(game, false);
    } else if (action === 'start') {
      if (game.hostId !== playerId) throw new InterError('Seul l’hôte peut lancer la partie.', 403);
      if (game.status !== 'lobby') throw new InterError('La partie a déjà commencé.');
      if (game.players.length < 2) throw new InterError('Il faut au moins deux joueurs.');
      if (!game.players.every(player => player.ready)) throw new InterError('Tout le monde doit être prêt.');
      maybeLaunch(game, true);
    } else if (action === 'play') {
      play(game, playerId, Array.isArray(input.cardIds) ? input.cardIds.map(String) : []);
    } else if (action === 'choose') {
      chooseRank(game, playerId, String(input.rank || ''));
    } else if (action === 'draw') {
      draw(game, playerId);
    } else if (action === 'pass') {
      passDrawn(game, playerId);
    } else if (action === 'announce') {
      announce(game, playerId);
    } else if (action === 'abandon') {
      abandon(game, playerId);
    } else if (action === 'ping') {
      touch(game, playerId);
    } else {
      throw new InterError('Action inconnue.');
    }
    touch(game, playerId);
    if (await updateVersioned(key, { version }, game, GAME_TTL)) {
      game.version = version + 1;
      if (game.status === 'finished') await remember(game);
      return game;
    }
  }
  throw new InterError('Le salon reçoit beaucoup de mises à jour. Réessaie dans un instant.', 409);
}

export function presentInter(game, viewerId = '') {
  return publicView(game, viewerId);
}

export const config = { runtime: 'edge' };
export default function handler() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
