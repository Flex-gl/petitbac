import { createIfAbsent, getJson, redis, updateVersioned } from './_redis.js';
import { importQuestions, rowsFromCsv } from '../games/quiz/csv.js';
import { QuizError, abandon, advance, answer, beginQuiz, cleanQuestion, createPlayer, prepareRestart, publicView, rematch, rulesFrom, selectIds, selectQuestions, skipSolo, summarize } from '../games/quiz/engine.js';

const GAME_TTL = 604800;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EXTRAS_KEY = 'arena:quiz:extras';
const OVERRIDES_KEY = 'arena:quiz:overrides';
const CATALOG_KEY = 'arena:quiz:catalog';

const RECORD_SCRIPT = `
if redis.call('SET', KEYS[1], '1', 'NX', 'EX', 31536000) == false then return 0 end
local players = cjson.decode(ARGV[1])
local winners = cjson.decode(ARGV[2])
local playedAt = ARGV[3]
for _, player in ipairs(players) do
  local key = 'arena:quiz:player:' .. player.id
  local raw = redis.call('GET', key)
  local stat = raw and cjson.decode(raw) or { id = player.id, games = 0, wins = 0, totalScore = 0, bestScore = 0, correct = 0, wrong = 0, blank = 0 }
  local score = tonumber(player.score or 0)
  stat.name = player.name
  stat.games = tonumber(stat.games or 0) + 1
  stat.wins = tonumber(stat.wins or 0) + (winners[player.id] and 1 or 0)
  stat.totalScore = tonumber(stat.totalScore or 0) + score
  stat.bestScore = math.max(tonumber(stat.bestScore or 0), score)
  stat.correct = tonumber(stat.correct or 0) + tonumber(player.correct or 0)
  stat.wrong = tonumber(stat.wrong or 0) + tonumber(player.wrong or 0)
  stat.blank = tonumber(stat.blank or 0) + tonumber(player.blank or 0)
  stat.lastPlayed = playedAt
  redis.call('SET', key, cjson.encode(stat))
  redis.call('ZADD', 'arena:quiz:leaderboard', stat.wins, player.id)
end
return 1
`;

export { QuizError };

function cleanName(value) {
  const name = String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (name.length < 2) throw new QuizError('Choisis un pseudo ou un nom d’au moins deux lettres.');
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
  return `arena:quiz:${code}`;
}

function fingerprint(game) {
  return [
    game.status,
    game.cursor,
    game.revealUntil || 0,
    game.hostId,
    game.statsMarked ? 1 : 0,
    game.seenMarked ? 1 : 0,
    (game.players || []).map(player => `${player.id}:${player.score}:${player.locked}:${player.abandoned}:${player.ready}:${player.connected}:${player.name}`).join('|')
  ].join('~');
}

function touch(game, playerId) {
  const now = Date.now();
  for (const player of game.players) {
    if (player.id === playerId) player.seenAt = now;
    player.connected = Boolean(player.seenAt && now - player.seenAt < 25000) && !player.abandoned;
  }
}

let poolCache = null;
let poolCachedAt = 0;

function forgetPool() {
  poolCache = null;
  poolCachedAt = 0;
}

async function loadCatalog() {
  if (poolCache && Date.now() - poolCachedAt < 30000) return poolCache;
  const [catalog, extras, overrides] = await Promise.all([getJson(CATALOG_KEY), getJson(EXTRAS_KEY), getJson(OVERRIDES_KEY)]);
  const extraList = Array.isArray(extras) ? extras : [];
  const patches = overrides && typeof overrides === 'object' ? overrides : {};
  const source = Array.isArray(catalog?.items) ? catalog.items : [];
  const items = source.map(item => ({ ...item }));
  for (const extra of extraList) {
    if (!extra?.id) continue;
    items.push({ id: String(extra.id), categorie: extra.categorie, difficulte: extra.difficulte, actif: extra.actif ? 1 : 0, chunk: -1 });
  }
  for (const [id, patch] of Object.entries(patches)) {
    if (!patch || typeof patch !== 'object') continue;
    const current = items.find(item => String(item.id) === String(id));
    const next = {
      id: String(id),
      categorie: patch.categorie || current?.categorie || '',
      difficulte: patch.difficulte || current?.difficulte || '',
      actif: patch.deleted ? 0 : patch.actif === 0 || patch.actif === false ? 0 : (patch.actif ?? current?.actif ?? 0),
      deleted: Boolean(patch.deleted),
      chunk: current?.chunk ?? -1
    };
    if (current) Object.assign(current, next);
    else items.push(next);
  }
  poolCache = { chunks: Number(catalog?.chunks) || 0, items, extras: extraList, overrides: patches };
  poolCachedAt = Date.now();
  return poolCache;
}

async function questionsByIds(ids, catalog) {
  const wanted = new Set(ids.map(String));
  const numbers = [...new Set(catalog.items.filter(item => wanted.has(String(item.id)) && item.chunk >= 0).map(item => item.chunk))];
  const chunks = await Promise.all(numbers.map(number => getJson(`arena:quiz:chunk:${number}`)));
  const byId = new Map();
  for (const chunk of chunks) {
    if (!chunk || typeof chunk !== 'object') continue;
    for (const [id, question] of Object.entries(chunk)) byId.set(String(id), question);
  }
  for (const extra of catalog.extras) if (extra?.id) byId.set(String(extra.id), extra);
  for (const [id, patch] of Object.entries(catalog.overrides)) {
    if (!patch || typeof patch !== 'object') continue;
    const current = byId.get(String(id)) || { id: String(id) };
    byId.set(String(id), { ...current, ...patch, id: String(id) });
  }
  return ids.map(id => byId.get(String(id))).filter(Boolean);
}

async function loadQuestions() {
  const catalog = await loadCatalog();
  return questionsByIds(catalog.items.map(item => item.id), catalog);
}

async function recentIds(players) {
  const lists = await Promise.all(players.map(player => getJson(`arena:quiz:seen:${player.id}`)));
  return [...new Set(lists.flatMap(list => Array.isArray(list) ? list.map(String) : []))];
}

async function drawDeck(game) {
  const catalog = await loadCatalog();
  if (!catalog.items.length) throw new QuizError('La banque de questions n’est pas encore disponible.', 503);
  const recent = await recentIds(game.players.filter(player => !player.abandoned));
  const ids = selectIds(catalog.items, {
    count: game.rules.questions,
    category: game.rules.category,
    difficulty: game.rules.difficulty,
    used: game.seenIds || [],
    recent
  });
  const questions = await questionsByIds(ids, catalog);
  if (questions.length < ids.length) throw new QuizError('Certaines questions sont introuvables.', 503);
  return selectQuestions(questions, { count: questions.length });
}

async function remember(game) {
  if (game.skipped || game.status !== 'finished' || game.statsMarked) return;
  const players = game.players.filter(player => !player.abandoned).map(player => ({
    id: player.id,
    name: player.name,
    score: player.score || 0,
    correct: player.correct || 0,
    wrong: player.wrong || 0,
    blank: player.blank || 0
  }));
  const winners = players.length >= 2 ? Object.fromEntries((game.winnerIds || []).map(id => [id, true])) : {};
  await redis('EVAL', RECORD_SCRIPT, '1', `arena:quiz:recorded:${game.code}:${game.startedAt}`, JSON.stringify(players), JSON.stringify(winners), new Date().toISOString());
  game.statsMarked = true;
}

async function markSeen(game) {
  if (game.status !== 'finished' || game.seenMarked) return;
  const deck = game.deck || [];
  const shown = game.skipped ? deck.slice(0, Math.max(0, (game.cursor || 0) + 1)) : deck;
  const ids = shown.map(card => String(card.id));
  for (const player of game.players) {
    if (player.abandoned) continue;
    const key = `arena:quiz:seen:${player.id}`;
    const previous = await getJson(key);
    const next = [...ids, ...(Array.isArray(previous) ? previous.map(String).filter(id => !ids.includes(id)) : [])].slice(0, 4000);
    await redis('SET', key, JSON.stringify(next));
  }
  game.seenMarked = true;
}

async function persist(key, game, version) {
  if (game.status === 'finished') {
    await remember(game);
    await markSeen(game);
  }
  if (await updateVersioned(key, { version }, game, GAME_TTL)) {
    game.version = version + 1;
    return game;
  }
  return null;
}

export async function quizMeta() {
  const catalog = await loadCatalog();
  return summarize(catalog.items);
}

export async function createQuiz(input) {
  const name = cleanName(input.name);
  const id = String(input.playerId || crypto.randomUUID()).slice(0, 80);
  const rules = rulesFrom(input);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = roomCode();
    const game = {
      kind: 'quiz',
      code,
      version: 0,
      status: 'lobby',
      hostId: id,
      hostSecret: crypto.randomUUID(),
      rules,
      players: [createPlayer(id, name)],
      deck: [],
      cursor: 0,
      seenIds: [],
      createdAt: Date.now()
    };
    if (await createIfAbsent(keyFor(code), game, GAME_TTL)) return game;
  }
  throw new QuizError('Impossible de réserver un code de salon. Réessaie.', 503);
}

export async function createSolo(input) {
  const name = cleanName(input.name);
  const id = String(input.playerId || crypto.randomUUID()).slice(0, 80);
  const rules = rulesFrom({ ...input, maxPlayers: 1 });
  const player = createPlayer(id, name);
  const deck = await drawDeck({ rules, players: [player], seenIds: [] });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = roomCode();
    const game = {
      kind: 'quiz',
      code,
      version: 0,
      status: 'lobby',
      hostId: id,
      hostSecret: crypto.randomUUID(),
      rules,
      players: [player],
      deck: [],
      cursor: 0,
      seenIds: [],
      createdAt: Date.now(),
      startedAt: Date.now()
    };
    beginQuiz(game, deck, Date.now());
    if (await createIfAbsent(keyFor(code), game, GAME_TTL)) return game;
  }
  throw new QuizError('Impossible de lancer la partie. Réessaie.', 503);
}

export async function getQuiz(codeValue, viewerId = '') {
  const code = normalizedCode(codeValue);
  if (code.length !== 6) throw new QuizError('Le code doit contenir six caractères.');
  const key = keyFor(code);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const game = await getJson(key);
    if (!game || game.kind !== 'quiz') throw new QuizError('Ce salon n’existe plus. Vérifie le code.', 404);
    const version = game.version || 0;
    const before = fingerprint(game);
    if (viewerId) touch(game, viewerId);
    advance(game, Date.now());
    if (fingerprint(game) === before) {
      if (game.status === 'finished') {
        await remember(game);
        await markSeen(game);
        if (fingerprint(game) !== before && await updateVersioned(key, { version }, game, GAME_TTL)) game.version = version + 1;
      }
      return game;
    }
    const saved = await persist(key, game, version);
    if (saved) return saved;
  }
  throw new QuizError('Le salon reçoit beaucoup de mises à jour. Réessaie dans un instant.', 409);
}

export async function mutateQuiz(input) {
  const code = normalizedCode(input.code);
  if (code.length !== 6) throw new QuizError('Le code doit contenir six caractères.');
  const key = keyFor(code);
  const playerId = String(input.playerId || '').slice(0, 80);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const game = await getJson(key);
    if (!game || game.kind !== 'quiz') throw new QuizError('Ce salon n’existe plus. Vérifie le code.', 404);
    const version = game.version || 0;
    const action = String(input.action || '');
    if (action === 'reclaim') {
      if (!game.hostSecret || String(input.hostSecret || '') !== game.hostSecret) throw new QuizError('Tu ne peux pas reprendre ce salon.', 403);
      const host = game.players.find(player => player.id === game.hostId);
      if (host && playerId) {
        host.id = playerId;
        if (input.name) host.name = cleanName(input.name);
        game.hostId = playerId;
      }
    } else if (action === 'join') {
      const name = cleanName(input.name);
      if (game.status !== 'lobby') throw new QuizError('La partie a déjà commencé.');
      const existing = game.players.find(player => player.id === playerId);
      if (!existing && game.players.length >= game.rules.maxPlayers) throw new QuizError('Ce salon est complet.');
      if (existing) existing.name = name;
      else game.players.push(createPlayer(playerId, name));
    } else if (action === 'start') {
      if (game.hostId !== playerId) throw new QuizError('Seul l’hôte peut lancer la partie.', 403);
      if (game.status !== 'lobby') throw new QuizError('La partie a déjà commencé.');
      if (game.players.filter(player => !player.abandoned).length < 1) throw new QuizError('Il faut au moins un joueur.');
      game.startedAt = Date.now();
      game.statsMarked = false;
      game.seenMarked = false;
      beginQuiz(game, await drawDeck(game), Date.now());
    } else if (action === 'answer') {
      const raw = input.choice;
      const choice = typeof raw === 'string' && /^[ABCD]$/i.test(raw) ? 'ABCD'.indexOf(raw.toUpperCase()) : Number(raw);
      answer(game, playerId, choice, Number(input.cursor), Date.now());
    } else if (action === 'abandon') {
      if (!game.solo && game.status !== 'lobby') throw new QuizError('On ne quitte pas une partie à plusieurs.', 403);
      abandon(game, playerId, Date.now());
    } else if (action === 'restart') {
      if (!game.solo || game.hostId !== playerId) throw new QuizError('Recommencer en plein jeu n’est possible qu’en solo.', 403);
      prepareRestart(game);
      beginQuiz(game, await drawDeck(game), Date.now());
    } else if (action === 'drop') {
      if (!game.solo || game.hostId !== playerId) throw new QuizError('Quitter en plein jeu n’est possible qu’en solo.', 403);
      skipSolo(game, Date.now());
    } else if (action === 'rematch') {
      if (game.hostId !== playerId) throw new QuizError('Seul l’hôte peut lancer la revanche.', 403);
      game.startedAt = Date.now();
      game.statsMarked = false;
      game.seenMarked = false;
      rematch(game, await drawDeck(game), Date.now());
    } else if (action === 'ping') {
      touch(game, playerId);
    } else {
      throw new QuizError('Action inconnue.');
    }
    touch(game, playerId);
    advance(game, Date.now());
    const saved = await persist(key, game, version);
    if (saved) return saved;
  }
  throw new QuizError('Le salon reçoit beaucoup de mises à jour. Réessaie dans un instant.', 409);
}

function assertAdmin(key) {
  const expected = process.env.QUIZ_ADMIN_KEY || '';
  if (!expected) throw new QuizError('Définis QUIZ_ADMIN_KEY dans Vercel pour modifier la banque.', 403);
  if (String(key || '') !== expected) throw new QuizError('Clé d’administration refusée.', 403);
}

export async function adminQuiz(input) {
  assertAdmin(input.key);
  const action = String(input.action || '');
  if (action === 'admin-list') return adminList(input);
  if (action === 'admin-save') return adminSave(input);
  if (action === 'admin-toggle') return adminToggle(input);
  if (action === 'admin-remove') return adminRemove(input);
  if (action === 'admin-import') return adminImport(input);
  throw new QuizError('Action d’administration inconnue.');
}

async function writeOverrides(overrides) {
  await redis('SET', OVERRIDES_KEY, JSON.stringify(overrides));
  forgetPool();
}

export async function adminList(input) {
  const questions = await loadQuestions();
  const summary = summarize(questions);
  const query = String(input.q || '').trim().toLowerCase();
  const category = String(input.categorie || '');
  const difficulty = String(input.difficulte || '');
  const filtered = questions.filter(question => {
    if (category && question.categorie !== category) return false;
    if (difficulty && question.difficulte !== difficulty) return false;
    if (!query) return true;
    return `${question.question} ${question.reponse_correcte}`.toLowerCase().includes(query);
  });
  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number(input.page) || 1));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize).map(question => ({
    id: question.id,
    categorie: question.categorie,
    difficulte: question.difficulte,
    question: question.question,
    reponse_correcte: question.reponse_correcte,
    option_a: question.option_a || '',
    option_b: question.option_b || '',
    option_c: question.option_c || '',
    option_d: question.option_d || '',
    explication: question.explication || '',
    actif: question.actif ? 1 : 0,
    deleted: Boolean(question.deleted),
    origine: question.origine || ''
  }));
  return { summary, page, pages, total: filtered.length, questions: slice };
}

async function adminSave(input) {
  const clean = cleanQuestion(input, input.id);
  if (!clean.id) throw new QuizError('Cette question n’a pas d’identifiant.');
  const overrides = (await getJson(OVERRIDES_KEY)) || {};
  overrides[clean.id] = { ...clean, deleted: false, origine: 'admin' };
  await writeOverrides(overrides);
  return { question: overrides[clean.id], summary: summarize((await loadCatalog()).items) };
}

async function adminToggle(input) {
  const id = String(input.id || '');
  const questions = await loadQuestions();
  const current = questions.find(question => question.id === id);
  if (!current) throw new QuizError('Question introuvable.', 404);
  const nextActive = current.actif ? 0 : 1;
  const clean = cleanQuestion({ ...current, actif: nextActive }, id);
  if (nextActive && !clean.actif) throw new QuizError('Complète les quatre réponses, dont la bonne, avant de publier.');
  const overrides = (await getJson(OVERRIDES_KEY)) || {};
  overrides[id] = { ...current, ...clean, deleted: false };
  await writeOverrides(overrides);
  return { id, actif: clean.actif, summary: summarize((await loadCatalog()).items) };
}

async function adminRemove(input) {
  const id = String(input.id || '');
  const questions = await loadQuestions();
  const current = questions.find(question => question.id === id);
  if (!current) throw new QuizError('Question introuvable.', 404);
  const overrides = (await getJson(OVERRIDES_KEY)) || {};
  overrides[id] = { ...current, deleted: true, actif: 0 };
  await writeOverrides(overrides);
  return { id, summary: summarize((await loadCatalog()).items) };
}

async function adminImport(input) {
  const csv = String(input.csv || '');
  if (csv.length > 1_500_000) throw new QuizError('Le fichier dépasse la taille acceptée.');
  const records = rowsFromCsv(csv);
  if (!records.length) throw new QuizError('Aucune ligne à importer.');
  if (records.length > 400) throw new QuizError('Importe au maximum 400 questions à la fois.');
  const existing = await loadQuestions();
  const result = importQuestions(existing, records, index => `x${Date.now().toString(36)}${index}`);
  if (result.imported.length) {
    const extras = (await getJson(EXTRAS_KEY)) || [];
    await redis('SET', EXTRAS_KEY, JSON.stringify([...(Array.isArray(extras) ? extras : []), ...result.imported]));
    forgetPool();
  }
  return {
    imported: result.imported.length,
    duplicates: result.duplicates,
    inactive: result.inactive,
    errors: result.errors.slice(0, 30),
    summary: summarize((await loadCatalog()).items)
  };
}

export function presentQuiz(game, viewerId) {
  return publicView(game, viewerId, Date.now());
}
