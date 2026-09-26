import { createIfAbsent, getJson, updateVersioned, recordResults } from './_redis.js';
import { hasWord, CATEGORIES } from '../public/js/dict.js';

const GAME_TTL = 86400;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ALLOWED_DURATIONS = [60, 90, 120, 180];
const ALLOWED_ROUNDS = [3, 5, 10];

export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function cleanName(value) {
  const name = String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (name.length < 2) throw new GameError('Choisis un pseudo ou un nom d’au moins deux lettres.');
  return name;
}

function code() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, byte => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('');
}

function normalizedCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function player(game, id) {
  return game.players.find(entry => entry.id === id);
}

function requirePlayer(game, id) {
  const found = player(game, id);
  if (!found) throw new GameError('Tu ne fais pas partie de cette salle.', 403);
  return found;
}

function chooseLetter() {
  const common = 'AAAAAAAEEEEEEEEEEIIIIIIIOOOOOOOONNNNNNRRRRRRSSSSSTTTTTTLLLLUUUUUUDDDMMMCCCPPPBBGGFFHHVVJJJKKK';
  const pool = `${common}QWXYZ`;
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeAnswer(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim().replace(/[’']/g, ' ').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ');
}

function beginRound(game, now) {
  game.round += 1;
  game.status = 'playing';
  game.letter = chooseLetter();
  game.roundStartedAt = now;
  game.roundEndsAt = now + game.config.duration * 1000;
  game.submissions = {};
  game.correction = null;
  for (const entry of game.players) entry.roundScore = 0;
}

function prepareCorrection(game, now) {
  game.status = 'correcting';
  const allSubmitted = game.players.every(entry => game.submissions[entry.id]);
  game.correction = { categoryIndex: 0, playerIndex: 0, activeWord: null, categoryResults: {}, allSubmitted, startedAt: now };
  for (const entry of game.players) entry.roundScore = 0;
}

function categoryEvaluations(game, category) {
  return game.players.map(entry => {
    const raw = game.submissions[entry.id]?.answers?.[category] || '';
    const word = String(raw).trim();
    const normalized = normalizeAnswer(raw);
    const begins = Boolean(normalized && normalized.startsWith(game.letter.toLocaleLowerCase('fr')));
    const exists = begins && hasWord(category, raw);
    const empty = !word;
    return {
      playerId: entry.id,
      playerName: entry.name,
      word,
      normalized,
      begins,
      exists: Boolean(exists),
      hint: empty ? 'empty' : !begins ? 'letter' : exists ? 'known' : 'unknown',
      points: 0,
      badge: empty ? 'missed' : 'pending',
      label: empty ? 'Manqué' : 'En correction',
      needsHost: !empty,
      decided: empty,
      hostValid: null,
      accepted: false,
      locked: empty,
      appealable: false,
      votes: {}
    };
  });
}

function settlePoints(game, category, result) {
  const results = game.correction.categoryResults[category] || [];
  const peers = results.filter(entry => entry !== result && entry.accepted && entry.normalized === result.normalized);
  if (!peers.length) return Object.keys(game.submissions).length > 1 ? 2 : 1;
  for (const peer of peers) {
    if (peer.points <= 1) continue;
    const delta = peer.points - 1;
    const peerPlayer = requirePlayer(game, peer.playerId);
    peerPlayer.roundScore -= delta;
    peerPlayer.score -= delta;
    peer.points = 1;
    peer.badge = 'duplicate';
    peer.label = 'Doublon';
  }
  return 1;
}

function lockDecision(game, accepted, source = 'host') {
  const active = game.correction?.activeWord;
  const result = active?.result;
  if (!result || result.locked) return;
  result.locked = true;
  result.accepted = Boolean(accepted) && Boolean(result.word);
  result.appealable = false;
  if (result.accepted) {
    const points = settlePoints(game, active.category, result);
    result.points = points;
    result.badge = points > 1 ? 'unique' : 'duplicate';
    const voted = source === 'vote';
    result.label = points > 1 ? (voted ? 'Validé par vote' : 'Validé') : 'Doublon';
  } else if (!result.word) {
    result.points = 0;
    result.badge = 'missed';
    result.label = 'Manqué';
  } else {
    result.points = 0;
    result.badge = 'invalid';
    result.label = source === 'vote' ? 'Refusé par vote' : 'Refusé';
  }
  const participant = requirePlayer(game, result.playerId);
  participant.roundScore += result.points;
  participant.score += result.points;
}

function resolveAppeal(game) {
  const active = game.correction.activeWord;
  const result = active.result;
  const votes = result.votes || {};
  const approval = Object.values(votes).filter(Boolean).length;
  const rejection = Object.values(votes).filter(vote => vote === false).length;
  const threshold = Math.floor(game.players.length / 2) + 1;
  if (approval >= threshold) lockDecision(game, true, 'vote');
  else if (rejection >= threshold) lockDecision(game, false, 'vote');
  else lockDecision(game, Boolean(result.hostValid), 'host');
  active.appealClosedAt = Date.now();
}

function currentCategory(game) {
  return game.config.categories[game.correction.categoryIndex];
}

function advanceCorrection(game, now) {
  const correction = game.correction;
  correction.activeWord = null;
  correction.playerIndex += 1;
  if (correction.playerIndex >= game.players.length) {
    correction.playerIndex = 0;
    correction.categoryIndex += 1;
  }
  if (correction.categoryIndex >= game.config.categories.length) {
    for (const entry of game.players) entry.roundsPlayed = (entry.roundsPlayed || 0) + 1;
    if (game.round >= game.config.rounds) {
      game.status = 'finished';
      game.finishedAt = now;
      game.correction = null;
    } else {
      game.status = 'between';
      game.nextRoundAt = now + 7000;
      game.correction = null;
    }
  }
}

function tick(game, now) {
  if (game.status === 'playing' && (now >= game.roundEndsAt || game.players.every(entry => game.submissions[entry.id]))) {
    prepareCorrection(game, now);
  }
  if (game.status === 'correcting' && game.correction) {
    const correction = game.correction;
    if (!correction.activeWord) {
      const category = currentCategory(game);
      const results = correction.categoryResults[category] || (correction.categoryResults[category] = categoryEvaluations(game, category));
      const result = results[correction.playerIndex];
      correction.activeWord = {
        category,
        result,
        revealedAt: now,
        phase: result.needsHost ? 'review' : 'skip',
        autoAdvanceAt: result.needsHost ? null : now + 900
      };
    } else {
      const active = correction.activeWord;
      const votes = active.result.votes || {};
      const cast = Object.keys(votes).length;
      const approval = Object.values(votes).filter(Boolean).length;
      const rejection = Object.values(votes).filter(vote => vote === false).length;
      const threshold = Math.floor(game.players.length / 2) + 1;
      const remaining = game.players.length - cast;
      const decided = (approval >= threshold && approval > rejection + remaining) || (rejection >= threshold && rejection > approval + remaining) || cast >= game.players.length;
      if (active.phase === 'skip' && now >= active.autoAdvanceAt) advanceCorrection(game, now);
      else if (active.phase === 'contest' && !active.contested && now >= active.contestEndsAt) {
        lockDecision(game, Boolean(active.result.hostValid), 'host');
        advanceCorrection(game, now);
      } else if (active.phase === 'appeal' && (decided || now >= active.appealEndsAt)) {
        resolveAppeal(game);
        advanceCorrection(game, now);
      }
    }
  }
  if (game.status === 'between' && now >= game.nextRoundAt) beginRound(game, now);
  return game;
}

export async function getGame(codeValue) {
  const roomCode = normalizedCode(codeValue);
  if (roomCode.length !== 6) throw new GameError('Le code doit contenir six caractères.');
  const key = `arena:game:${roomCode}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const game = await getJson(key);
    if (!game) throw new GameError('Cette salle n’existe plus. Vérifie le code.', 404);
    const version = game.version || 0;
    const before = JSON.stringify({ status: game.status, round: game.round, correction: game.correction, nextRoundAt: game.nextRoundAt });
    tick(game, Date.now());
    const after = JSON.stringify({ status: game.status, round: game.round, correction: game.correction, nextRoundAt: game.nextRoundAt });
    if (before === after) {
      if (game.status === 'finished') await recordResults(game);
      return game;
    }
    if (await updateVersioned(key, { version }, game, GAME_TTL)) {
      if (game.status === 'finished') await recordResults(game);
      return game;
    }
  }
  return (await getJson(key));
}

export async function createGame(input) {
  const name = cleanName(input.name);
  const categories = [...new Set(Array.isArray(input.categories) ? input.categories : [])].filter(value => CATEGORIES.some(category => category.id === value));
  if (categories.length < 2) throw new GameError('Choisis au moins deux catégories.');
  const duration = Number(input.duration);
  const rounds = Number(input.rounds);
  if (!ALLOWED_DURATIONS.includes(duration) || !ALLOWED_ROUNDS.includes(rounds)) throw new GameError('La durée ou le nombre de manches est invalide.');
  const id = String(input.playerId || crypto.randomUUID()).slice(0, 80);
  const playerInfo = { id, name, score: 0, roundScore: 0, roundsPlayed: 0, joinedAt: Date.now() };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomCode = code();
    const game = { code: roomCode, matchId: crypto.randomUUID(), version: 0, status: 'lobby', hostId: id, config: { categories, duration, rounds }, players: [playerInfo], round: 0, submissions: {}, chat: [], createdAt: Date.now() };
    if (await createIfAbsent(`arena:game:${roomCode}`, game, GAME_TTL)) return game;
  }
  throw new GameError('Impossible de réserver un code de salle. Réessaie.', 503);
}

export async function mutateGame(input) {
  const roomCode = normalizedCode(input.code);
  if (roomCode.length !== 6) throw new GameError('Le code doit contenir six caractères.');
  const key = `arena:game:${roomCode}`;
  const playerId = String(input.playerId || '').slice(0, 80);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const game = await getJson(key);
    if (!game) throw new GameError('Cette salle n’existe plus. Vérifie le code.', 404);
    const version = game.version || 0;
    tick(game, Date.now());
    const action = String(input.action || '');
    if (action === 'join') {
      const name = cleanName(input.name);
      if (game.status !== 'lobby') throw new GameError('La partie a déjà commencé.');
      const returningPlayer = player(game, playerId);
      if (!returningPlayer && game.players.length >= 12) throw new GameError('Cette salle a atteint sa limite de 12 joueurs.');
      if (returningPlayer) returningPlayer.name = name;
      else game.players.push({ id: playerId || crypto.randomUUID(), name, score: 0, roundScore: 0, roundsPlayed: 0, joinedAt: Date.now() });
    } else {
      const current = requirePlayer(game, playerId);
      if (action === 'start') {
        if (game.hostId !== playerId) throw new GameError('Seul l’hôte peut démarrer la partie.', 403);
        if (game.status !== 'lobby') throw new GameError('La partie est déjà lancée.');
        if (game.players.length < 2) throw new GameError('Il faut au moins deux joueurs pour commencer.');
        beginRound(game, Date.now());
      } else if (action === 'submit') {
        if (game.status !== 'playing') throw new GameError('Cette manche est terminée.');
        if (game.submissions[playerId]) throw new GameError('Ta grille est déjà envoyée.');
        const answers = {};
        for (const category of game.config.categories) answers[category] = String(input.answers?.[category] || '').trim().slice(0, 45);
        game.submissions[playerId] = { answers, submittedAt: Date.now() };
        if (game.players.every(entry => game.submissions[entry.id])) prepareCorrection(game, Date.now());
      } else if (action === 'judge') {
        if (game.hostId !== playerId) throw new GameError('Seul l’hôte corrige les réponses.', 403);
        const active = game.correction?.activeWord;
        if (game.status !== 'correcting' || !active || active.phase !== 'review' || !active.result.needsHost) throw new GameError('Aucune réponse n’attend ta correction.');
        active.result.decided = true;
        active.result.hostValid = Boolean(input.valid);
        active.result.badge = active.result.hostValid ? 'unique' : 'invalid';
        active.result.label = active.result.hostValid ? 'Validé par l’hôte' : 'Refusé par l’hôte';
        active.phase = 'contest';
        active.contestEndsAt = Date.now() + 10000;
      } else if (action === 'contest') {
        const active = game.correction?.activeWord;
        if (game.status !== 'correcting' || !active || active.phase !== 'contest') throw new GameError('Cette correction ne peut plus être contestée.');
        if (playerId === game.hostId) throw new GameError('L’hôte ne conteste pas sa propre correction.', 403);
        active.contested = true;
        active.phase = 'appeal';
        active.result.appealable = true;
        active.result.votes = {};
        active.appealEndsAt = Date.now() + 15000;
        active.result.label = 'Contesté';
        active.result.badge = 'unknown';
      } else if (action === 'next') {
        if (game.hostId !== playerId) throw new GameError('Seul l’hôte passe à la réponse suivante.', 403);
        const active = game.correction?.activeWord;
        if (!active || active.phase !== 'contest' || active.contested) throw new GameError('Une contestation est en cours.');
        lockDecision(game, Boolean(active.result.hostValid), 'host');
        advanceCorrection(game, Date.now());
      } else if (action === 'vote') {
        const active = game.correction?.activeWord;
        if (game.status !== 'correcting' || !active || active.phase !== 'appeal') throw new GameError('Aucun appel n’est ouvert.');
        active.result.votes[playerId] = Boolean(input.valid);
        const approvals = Object.values(active.result.votes).filter(Boolean).length;
        const rejections = Object.values(active.result.votes).filter(vote => vote === false).length;
        const threshold = Math.floor(game.players.length / 2) + 1;
        const remaining = game.players.length - Object.keys(active.result.votes).length;
        const decided = (approvals >= threshold && approvals > rejections + remaining) || (rejections >= threshold && rejections > approvals + remaining) || Object.keys(active.result.votes).length >= game.players.length;
        if (decided) {
          resolveAppeal(game);
          advanceCorrection(game, Date.now());
        }
      } else if (action === 'chat') {
        const message = String(input.message || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 180);
        if (!message) throw new GameError('Écris un message avant de l’envoyer.');
        game.chat.push({ playerId, name: current.name, message, at: Date.now() });
        game.chat = game.chat.slice(-40);
      } else if (action === 'replay') {
        if (game.hostId !== playerId) throw new GameError('Seul l’hôte peut relancer une partie.', 403);
        if (game.status !== 'finished') throw new GameError('La partie n’est pas terminée.');
        game.players = game.players.map(entry => ({ ...entry, score: 0, roundScore: 0, roundsPlayed: 0 }));
        game.chat = [];
        game.matchId = crypto.randomUUID();
        game.status = 'lobby';
        game.round = 0;
        game.letter = null;
        game.roundEndsAt = null;
        game.nextRoundAt = null;
        game.submissions = {};
        game.correction = null;
      } else {
        throw new GameError('Action de jeu inconnue.');
      }
    }
    if (await updateVersioned(key, { version }, game, GAME_TTL)) {
      if (game.status === 'finished') await recordResults(game);
      return game;
    }
  }
  throw new GameError('La salle reçoit beaucoup de mises à jour. Réessaie dans un instant.', 409);
}

export function publicGame(game, viewerId = '') {
  if (!game) return game;
  let correction = game.correction;
  if (correction) {
    const category = game.config.categories[correction.categoryIndex];
    const all = correction.categoryResults?.[category] || [];
    const visibleResults = all.map((result, index) => {
      const revealed = index < correction.playerIndex || (index === correction.playerIndex && Boolean(correction.activeWord));
      if (revealed) return { ...result, votes: undefined, revealed: true };
      return { playerId: result.playerId, playerName: result.playerName, revealed: false };
    });
    const activeWord = correction.activeWord ? {
      ...correction.activeWord,
      result: { ...correction.activeWord.result, votes: undefined },
      voteCount: Object.keys(correction.activeWord.result.votes || {}).length,
      approvalCount: Object.values(correction.activeWord.result.votes || {}).filter(Boolean).length,
      viewerVoted: Object.hasOwn(correction.activeWord.result.votes || {}, viewerId)
    } : null;
    correction = { categoryIndex: correction.categoryIndex, playerIndex: correction.playerIndex, activeWord, visibleResults, startedAt: correction.startedAt };
  }
  return { ...game, correction, submissions: Object.fromEntries(Object.entries(game.submissions || {}).map(([id, submission]) => [id, { submittedAt: submission.submittedAt }])), serverNow: Date.now() };
}

export const config = { runtime: 'edge' };
export default function handler() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
