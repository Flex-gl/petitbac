export class QuizError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const CATEGORIES = [
  'Culture générale',
  'RDC',
  'Afrique',
  'Histoire',
  'Géographie',
  'Sciences',
  'Technologie',
  'Informatique',
  'Sport',
  'Musique',
  'Cinéma',
  'Littérature',
  'Langues',
  'Arts',
  'Divers'
];

export const DIFFICULTIES = ['facile', 'moyen', 'difficile'];
export const REVEAL_MS = 0;
export const ANSWER_GRACE_MS = 1200;
export const SCORE_FAST = 100;
export const SCORE_SLOW = 60;

const LETTERS = ['A', 'B', 'C', 'D'];

export function difficultyLabel(value) {
  if (value === 'facile') return 'Facile';
  if (value === 'difficile') return 'Difficile';
  if (value === 'moyen') return 'Moyen';
  return 'Toutes';
}

export function pointsFor(elapsed, duration) {
  const span = Math.max(1, Number(duration) || 1);
  const ratio = Math.min(1, Math.max(0, Number(elapsed) / span));
  return SCORE_SLOW + Math.round((SCORE_FAST - SCORE_SLOW) * (1 - ratio));
}

export function cleanQuestion(input, id) {
  const question = String(input?.question || '').replace(/[<>\u0000-\u001f]/g, '').trim();
  const answer = String(input?.reponse_correcte || input?.reponse || '').replace(/[<>\u0000-\u001f]/g, '').trim();
  const categorie = String(input?.categorie || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 60);
  const difficulte = DIFFICULTIES.includes(input?.difficulte) ? input.difficulte : '';
  const options = LETTERS.map(letter => String(input?.[`option_${letter.toLowerCase()}`] || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 180));
  const explanation = String(input?.explication || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 400);
  if (question.length < 8) throw new QuizError('La question est trop courte.');
  if (!answer) throw new QuizError('Une question doit avoir une réponse.');
  if (!categorie) throw new QuizError('Choisis une catégorie.');
  if (!difficulte) throw new QuizError('Choisis une difficulté.');
  const folded = options.map(option => option.toLowerCase());
  const unique = new Set(folded.filter(Boolean));
  const complete = options.every(Boolean) && unique.size === 4 && folded.includes(answer.toLowerCase());
  const actif = complete && input?.actif !== 0 && input?.actif !== false && input?.actif !== '0' ? 1 : 0;
  return {
    id: String(id || input?.id || '').slice(0, 40),
    categorie,
    difficulte,
    question: question.slice(0, 280),
    reponse_correcte: answer.slice(0, 180),
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    explication: explanation,
    actif
  };
}

export function playable(question) {
  if (!question || question.deleted) return false;
  if (question.actif === 0 || question.actif === false || question.actif === '0') return false;
  const options = [question.option_a, question.option_b, question.option_c, question.option_d].map(option => String(option || '').trim());
  if (!String(question.question || '').trim() || options.some(option => !option)) return false;
  const answer = String(question.reponse_correcte || '').trim().toLowerCase();
  const folded = options.map(option => option.toLowerCase());
  return Boolean(answer) && new Set(folded).size === 4 && folded.includes(answer);
}

export function summarize(items = []) {
  const byCategory = {};
  const byDifficulty = { facile: 0, moyen: 0, difficile: 0 };
  let active = 0;
  for (const item of items) {
    if (!item || item.deleted || !item.actif) continue;
    active += 1;
    byCategory[item.categorie] = (byCategory[item.categorie] || 0) + 1;
    if (byDifficulty[item.difficulte] != null) byDifficulty[item.difficulte] += 1;
  }
  const known = new Set([...CATEGORIES, ...Object.keys(byCategory)]);
  return {
    active,
    total: items.filter(item => item && !item.deleted).length,
    byCategory,
    byDifficulty,
    categories: [...known]
  };
}

function shuffle(list, random) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function questionSubject(item) {
  const prompt = plainPrompt(item?.question || item?.prompt || '');
  const names = [...prompt.matchAll(/«\s*([^»]+?)\s*»/g)].map(match => match[1].trim().toLowerCase()).filter(Boolean);
  return names.sort().join('|');
}

function drawSome(list, wanted, random, seen, subjects) {
  const picked = [];
  for (const item of shuffle(list, random)) {
    const id = String(item.id);
    if (seen.has(id)) continue;
    const subject = questionSubject(item);
    if (subject && subjects.has(subject)) continue;
    seen.add(id);
    if (subject) subjects.add(subject);
    picked.push(item);
    if (picked.length === wanted) break;
  }
  return picked;
}

function chooseItems(eligible, wanted, used, recent, random) {
  const usedSet = new Set(used.map(String));
  const recentSet = new Set(recent.map(String));
  const seen = new Set();
  const picked = takeFrom(eligible, wanted, usedSet, recentSet, random, seen, new Set(), true);
  if (picked.length < wanted) throw new QuizError(`Pas assez de questions pour ce filtre (${picked.length} disponibles, ${wanted} demandées).`);
  return picked;
}

function takeFrom(list, quota, usedSet, recentSet, random, seen, subjects, allowRecent) {
  if (quota <= 0) return [];
  const unused = list.filter(item => !usedSet.has(String(item.id)));
  const fresh = unused.filter(item => !recentSet.has(String(item.id)));
  const picked = drawSome(fresh, quota, random, seen, subjects);
  if (allowRecent && picked.length < quota) picked.push(...drawSome(unused, quota - picked.length, random, seen, subjects));
  return picked;
}

function chooseBalanced(eligible, wanted, used, recent, random) {
  const groups = new Map();
  for (const item of eligible) {
    const key = String(item.categorie || 'Autres');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const names = [...groups.keys()];
  if (names.length <= 1) return chooseItems(eligible, wanted, used, recent, random);
  const usedSet = new Set(used.map(String));
  const recentSet = new Set(recent.map(String));
  const order = shuffle(names, random);
  const base = Math.floor(wanted / order.length);
  let extra = wanted % order.length;
  const seen = new Set();
  const subjects = new Set();
  const picked = [];
  for (const name of order) {
    const quota = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    picked.push(...takeFrom(groups.get(name), quota, usedSet, recentSet, random, seen, subjects, false));
  }
  if (picked.length < wanted) picked.push(...takeFrom(eligible, wanted - picked.length, usedSet, recentSet, random, seen, subjects, false));
  if (picked.length < wanted) picked.push(...takeFrom(eligible, wanted - picked.length, usedSet, recentSet, random, seen, subjects, true));
  if (picked.length < wanted) throw new QuizError(`Pas assez de questions pour ce filtre (${picked.length} disponibles, ${wanted} demandées).`);
  return shuffle(picked, random);
}

export function selectIds(pool, { count, category = 'toutes', difficulty = 'toutes', used = [], recent = [], random = Math.random } = {}) {
  const wanted = Math.min(30, Math.max(1, Number(count) || 10));
  const eligible = pool.filter(item => {
    if (!item || item.deleted || !item.actif) return false;
    if (category && category !== 'toutes' && item.categorie !== category) return false;
    if (difficulty && difficulty !== 'toutes' && item.difficulte !== difficulty) return false;
    return true;
  });
  return chooseBalanced(eligible, wanted, used, recent, random).map(item => String(item.id));
}

export function plainPrompt(value) {
  return String(value || '')
    .replace(/^\s*(révision|question quiz battle|défi de connaissances|question rapide|saurez-vous répondre|testez vos connaissances|à vous de jouer)\s*[:\-–]?\s*/i, '')
    .replace(/^dans un quiz de culture générale,\s*/i, '')
    .replace(/\s*\(série\s*\d+\)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function selectQuestions(pool, { count, category = 'toutes', difficulty = 'toutes', used = [], recent = [], random = Math.random } = {}) {
  const wanted = Math.min(30, Math.max(1, Number(count) || 10));
  const eligible = pool.filter(question => {
    if (!playable(question)) return false;
    if (category && category !== 'toutes' && question.categorie !== category) return false;
    if (difficulty && difficulty !== 'toutes' && question.difficulte !== difficulty) return false;
    return true;
  });
  return chooseBalanced(eligible, wanted, used, recent, random).map(packQuestion);
}

function packQuestion(question) {
  const options = [question.option_a, question.option_b, question.option_c, question.option_d];
  const answer = String(question.reponse_correcte || '').toLowerCase();
  const correct = options.findIndex(option => String(option || '').toLowerCase() === answer);
  return {
    id: String(question.id),
    categorie: question.categorie,
    difficulte: question.difficulte,
    prompt: plainPrompt(question.question),
    options,
    correct,
    explication: question.explication || ''
  };
}

function activePlayers(game) {
  return game.players.filter(player => !player.abandoned);
}

function blankStats() {
  return { score: 0, correct: 0, wrong: 0, blank: 0, timeSum: 0, answeredCount: 0 };
}

export function rulesFrom(input = {}) {
  const questions = Number(input.questions);
  const seconds = Number(input.seconds);
  const maxPlayers = Number(input.maxPlayers);
  const difficulty = input.difficulty === 'toutes' || DIFFICULTIES.includes(input.difficulty) ? input.difficulty : 'toutes';
  const category = String(input.category || 'toutes').slice(0, 60) || 'toutes';
  return {
    questions: questions >= 5 && questions <= 30 ? questions : 10,
    seconds: [5, 10, 15, 20, 30].includes(seconds) ? seconds : 10,
    difficulty,
    category,
    minPlayers: 1,
    maxPlayers: maxPlayers >= 1 && maxPlayers <= 20 ? maxPlayers : 20
  };
}

function seat(player, game, now) {
  if (!Number.isInteger(player.cursor)) player.cursor = Number.isInteger(game.cursor) ? game.cursor : 0;
  if (!player.closesAt) {
    player.openedAt = game.openedAt || now;
    player.closesAt = game.closesAt || player.openedAt + (game.rules?.seconds || 10) * 1000;
  }
  return player;
}

function release(player, now, seconds) {
  player.choice = null;
  player.answeredAt = 0;
  player.locked = false;
  player.gained = 0;
  player.openedAt = now;
  player.closesAt = now + seconds * 1000;
}

function gradeOne(game, player, now) {
  const card = game.deck[player.cursor];
  if (!card || player.review?.[player.cursor]) return;
  const duration = game.rules.seconds * 1000;
  const choice = Number.isInteger(player.choice) ? player.choice : null;
  let gained = 0;
  if (choice === null) {
    player.blank += 1;
    player.gained = 0;
  } else {
    const elapsed = Math.min(duration, Math.max(0, (player.answeredAt || now) - player.openedAt));
    player.timeSum += elapsed;
    player.answeredCount += 1;
    if (choice === card.correct) {
      gained = pointsFor(elapsed, duration);
      player.correct += 1;
      player.score += gained;
      player.gained = gained;
    } else {
      player.wrong += 1;
      player.gained = 0;
    }
  }
  if (!Array.isArray(player.review)) player.review = [];
  player.review[player.cursor] = { choice, good: choice !== null && choice === card.correct, gained, blank: choice === null };
}

function step(game, player, now) {
  gradeOne(game, player, now);
  player.cursor += 1;
  if (player.cursor >= game.deck.length) {
    player.locked = true;
    player.choice = null;
    player.closesAt = 0;
    return player;
  }
  release(player, now, game.rules.seconds);
  return player;
}

function allDone(game) {
  const deck = game.deck?.length || 0;
  return activePlayers(game).every(player => player.cursor >= deck);
}

function syncCursor(game) {
  const pending = activePlayers(game).filter(player => player.cursor < (game.deck?.length || 0));
  game.cursor = pending.length ? Math.min(...pending.map(player => player.cursor)) : (game.deck?.length || 0);
  const clocks = pending.map(player => player.closesAt).filter(Boolean);
  if (clocks.length) game.closesAt = Math.min(...clocks);
}

function finish(game, now) {
  game.status = 'finished';
  game.finishedAt = now;
  syncCursor(game);
  const ranked = [...activePlayers(game)].sort(comparePlayers);
  const best = ranked[0]?.score ?? 0;
  game.winnerIds = ranked.filter(player => player.score === best).map(player => player.id);
  game.winnerId = game.winnerIds[0] || '';
  return game;
}

function comparePlayers(a, b) {
  return (b.score - a.score) || (b.correct - a.correct) || a.name.localeCompare(b.name, 'fr');
}

export function advance(game, now = Date.now()) {
  if (!game || game.status === 'lobby' || game.status === 'finished') return game;
  if (game.status === 'reveal') game.status = 'playing';
  if (game.status !== 'playing') return game;
  for (const player of activePlayers(game)) {
    seat(player, game, now);
    if (player.cursor >= (game.deck?.length || 0)) continue;
    if (!player.locked && now >= player.closesAt + ANSWER_GRACE_MS) step(game, player, now);
  }
  if (allDone(game)) return finish(game, now);
  syncCursor(game);
  return game;
}

export function answer(game, playerId, choice, cursor, now = Date.now()) {
  if (game.status !== 'playing') throw new QuizError('Cette question est fermée.');
  const player = game.players.find(entry => entry.id === playerId && !entry.abandoned);
  if (!player) throw new QuizError('Tu ne fais pas partie de cette partie.', 403);
  seat(player, game, now);
  if (player.cursor >= game.deck.length) throw new QuizError('Cette question est fermée.');
  if (Number(cursor) !== player.cursor) throw new QuizError('Cette question est déjà passée.');
  if (player.locked) throw new QuizError('Ta réponse est déjà enregistrée.');
  if (now > player.closesAt + ANSWER_GRACE_MS) throw new QuizError('Le temps est écoulé.');
  const picked = Number(choice);
  if (!Number.isInteger(picked) || picked < 0 || picked > 3) throw new QuizError('Choisis une des quatre réponses.');
  player.choice = picked;
  player.answeredAt = Math.min(now, player.closesAt);
  player.locked = true;
  const card = game.deck[player.cursor];
  player.flash = { cursor: player.cursor, choice: picked, good: picked === card.correct };
  step(game, player, now);
  if (allDone(game)) return finish(game, now);
  syncCursor(game);
  return game;
}

export function beginQuiz(game, deck, now = Date.now()) {
  if (game.status !== 'lobby') throw new QuizError('La partie a déjà commencé.');
  const needed = game.rules.minPlayers || 1;
  if (activePlayers(game).length < needed) throw new QuizError(needed > 1 ? 'Il faut au moins deux joueurs.' : 'Il faut au moins un joueur.');
  game.solo = activePlayers(game).length < 2;
  if (!Array.isArray(deck) || deck.length < 1) throw new QuizError('Aucune question disponible.');
  const ids = deck.map(card => card.id);
  if (new Set(ids).size !== ids.length) throw new QuizError('La sélection contient une question en double.');
  game.deck = deck;
  game.seenIds = [...new Set([...(game.seenIds || []), ...ids])];
  game.cursor = 0;
  game.openedAt = now;
  game.closesAt = now + game.rules.seconds * 1000;
  game.revealUntil = 0;
  game.status = 'playing';
  for (const player of game.players) {
    Object.assign(player, blankStats(), { choice: null, answeredAt: 0, locked: false, gained: 0, ready: true, review: [], flash: null, cursor: 0 });
    release(player, now, game.rules.seconds);
  }
  return game;
}

export function rematch(game, deck, now = Date.now()) {
  if (game.status !== 'finished') throw new QuizError('La revanche se lance à la fin de la partie.');
  game.players = activePlayers(game);
  game.status = 'lobby';
  return beginQuiz(game, deck, now);
}

export function prepareRestart(game) {
  if (!game.solo) throw new QuizError('Recommencer en plein jeu n’est possible qu’en solo.');
  if (game.status === 'lobby') throw new QuizError('La partie n’a pas commencé.');
  game.status = 'lobby';
  game.skipped = false;
  game.statsMarked = false;
  game.seenMarked = false;
  game.winnerId = '';
  game.winnerIds = [];
  return game;
}

export function skipSolo(game, now = Date.now()) {
  if (!game.solo) throw new QuizError('Quitter en plein jeu n’est possible qu’en solo.');
  if (game.status === 'lobby' || game.status === 'finished') return game;
  game.skipped = true;
  game.status = 'finished';
  game.finishedAt = now;
  game.winnerId = '';
  game.winnerIds = [];
  return game;
}

export function abandon(game, playerId, now = Date.now()) {
  const player = game.players.find(entry => entry.id === playerId);
  if (!player) throw new QuizError('Tu ne fais pas partie de cette partie.', 403);
  if (game.status === 'lobby') {
    game.players = game.players.filter(entry => entry.id !== playerId);
    if (game.hostId === playerId && game.players[0]) game.hostId = game.players[0].id;
    return game;
  }
  player.abandoned = true;
  player.connected = false;
  if (game.hostId === playerId) {
    const next = activePlayers(game)[0];
    if (next) game.hostId = next.id;
  }
  advance(game, now);
  if (game.status !== 'finished' && activePlayers(game).length === 0) finish(game, now);
  return game;
}

export function standings(game) {
  return [...game.players].filter(player => !player.abandoned).sort(comparePlayers).map((player, index) => ({
    rank: index + 1,
    id: player.id,
    name: player.name,
    score: player.score,
    correct: player.correct,
    wrong: player.wrong,
    blank: player.blank
  }));
}

function rate(player) {
  const total = player.correct + player.wrong + player.blank;
  if (!total) return 0;
  return Math.round((player.correct / total) * 100);
}

function averageMs(player) {
  if (!player.answeredCount) return 0;
  return Math.round(player.timeSum / player.answeredCount);
}

function reviewFor(game, player) {
  if (!player || !Array.isArray(player.review)) return [];
  return player.review.map((entry, index) => {
    const card = game.deck?.[index];
    if (!card || !entry) return null;
    const choice = Number.isInteger(entry.choice) ? entry.choice : null;
    return {
      index: index + 1,
      prompt: plainPrompt(card.prompt),
      choice: choice === null ? '' : LETTERS[choice],
      choiceText: choice === null ? '' : card.options[choice] || '',
      correct: LETTERS[card.correct] || '',
      correctText: card.options[card.correct] || '',
      good: Boolean(entry.good),
      blank: Boolean(entry.blank),
      gained: entry.gained || 0,
      why: String(card.explication || '').trim()
    };
  }).filter(Boolean);
}

export function publicView(game, viewerId, now = Date.now()) {
  const copy = game;
  const me = copy.players.find(player => player.id === viewerId) || null;
  const cursor = Number.isInteger(me?.cursor) ? me.cursor : (copy.cursor || 0);
  const card = me && cursor < (copy.deck?.length || 0) ? copy.deck?.[cursor] : null;
  const question = card && copy.status === 'playing' ? {
    index: cursor + 1,
    total: copy.deck.length,
    categorie: card.categorie,
    difficulte: difficultyLabel(card.difficulte),
    prompt: plainPrompt(card.prompt),
    options: card.options.map((text, index) => ({ key: LETTERS[index], text })),
    closesAt: me.closesAt || copy.closesAt || 0,
    locked: Boolean(me.locked && me.flash?.cursor === cursor),
    choice: me.locked && me.flash?.cursor === cursor ? LETTERS[me.flash.choice] : '',
    verdict: me.locked && me.flash?.cursor === cursor ? (me.flash.good ? 'good' : 'bad') : ''
  } : null;
  const players = copy.players.map(player => ({
    id: player.id,
    name: player.name,
    score: player.score,
    ready: Boolean(player.ready),
    host: player.id === copy.hostId,
    connected: player.id === viewerId ? true : Boolean(player.connected),
    abandoned: Boolean(player.abandoned),
    locked: copy.status === 'playing' ? Boolean(player.locked) : false
  }));
  return {
    kind: 'quiz',
    code: copy.code,
    version: copy.version || 0,
    status: copy.status,
    phase: copy.status,
    hostId: copy.hostId,
    hostSecret: viewerId && viewerId === copy.hostId ? copy.hostSecret : '',
    rules: copy.rules,
    players,
    you: me ? {
      id: me.id,
      score: me.score,
      correct: me.correct,
      wrong: me.wrong,
      blank: me.blank,
      gained: 0,
      rate: copy.status === 'finished' ? rate(me) : 0,
      averageMs: copy.status === 'finished' ? averageMs(me) : 0
    } : null,
    question,
    flash: me?.flash ? { cursor: me.flash.cursor, choice: LETTERS[me.flash.choice] || '', good: Boolean(me.flash.good) } : null,
    review: copy.status === 'finished' && !copy.skipped ? reviewFor(copy, me) : [],
    standings: copy.status === 'finished' && !copy.skipped ? standings(copy).map(row => ({ rank: row.rank, id: row.id, name: row.name, score: row.score })) : [],
    solo: Boolean(copy.solo),
    winnerId: copy.status === 'finished' ? copy.winnerId : '',
    winnerIds: copy.status === 'finished' ? copy.winnerIds || [] : [],
    serverNow: now,
    revealUntil: copy.status === 'reveal' ? copy.revealUntil : 0,
    createdAt: copy.createdAt
  };
}

export function createPlayer(id, name) {
  return {
    id,
    name,
    ready: false,
    abandoned: false,
    connected: true,
    seenAt: Date.now(),
    cursor: 0,
    openedAt: 0,
    closesAt: 0,
    choice: null,
    answeredAt: 0,
    locked: false,
    gained: 0,
    ...blankStats()
  };
}

export { LETTERS };
