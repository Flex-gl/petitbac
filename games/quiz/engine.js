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
export const REVEAL_MS = 4500;
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
  const folded = options.map(option => option.toLocaleLowerCase('fr'));
  const unique = new Set(folded.filter(Boolean));
  const complete = options.every(Boolean) && unique.size === 4 && folded.includes(answer.toLocaleLowerCase('fr'));
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
  if (!question || question.deleted || !question.actif) return false;
  try {
    const clean = cleanQuestion(question, question.id);
    return clean.actif === 1;
  } catch {
    return false;
  }
}

export function selectQuestions(pool, { count, category = 'toutes', difficulty = 'toutes', used = [], recent = [], random = Math.random } = {}) {
  const wanted = Math.min(30, Math.max(1, Number(count) || 10));
  const eligible = pool.filter(question => {
    if (!playable(question)) return false;
    if (category && category !== 'toutes' && question.categorie !== category) return false;
    if (difficulty && difficulty !== 'toutes' && question.difficulte !== difficulty) return false;
    return true;
  });
  const usedSet = new Set(used.map(String));
  const recentSet = new Set(recent.map(String));
  const unused = eligible.filter(question => !usedSet.has(String(question.id)));
  const fresh = unused.filter(question => !recentSet.has(String(question.id)));
  const source = fresh.length >= wanted ? fresh : unused;
  if (source.length < wanted) {
    throw new QuizError(`Pas assez de questions pour ce filtre (${source.length} disponibles, ${wanted} demandées).`);
  }
  const copy = [...source];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  const picked = [];
  const seen = new Set();
  for (const question of copy) {
    const id = String(question.id);
    if (seen.has(id)) continue;
    seen.add(id);
    picked.push(packQuestion(question));
    if (picked.length === wanted) break;
  }
  return picked;
}

function packQuestion(question) {
  const options = [question.option_a, question.option_b, question.option_c, question.option_d];
  const correct = options.findIndex(option => option.toLocaleLowerCase('fr') === question.reponse_correcte.toLocaleLowerCase('fr'));
  return {
    id: String(question.id),
    categorie: question.categorie,
    difficulte: question.difficulte,
    prompt: question.question,
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
    minPlayers: 2,
    maxPlayers: maxPlayers >= 2 && maxPlayers <= 20 ? maxPlayers : 20
  };
}

export function openQuestion(game, now) {
  const card = game.deck[game.cursor];
  if (!card) return finish(game, now);
  game.status = 'playing';
  game.openedAt = now;
  game.closesAt = now + game.rules.seconds * 1000;
  game.revealUntil = 0;
  for (const player of game.players) {
    player.choice = null;
    player.answeredAt = 0;
    player.locked = false;
    player.gained = 0;
  }
  return game;
}

function grade(game, now) {
  const card = game.deck[game.cursor];
  if (!card || card.graded) return;
  const duration = game.rules.seconds * 1000;
  for (const player of activePlayers(game)) {
    const choice = Number.isInteger(player.choice) ? player.choice : null;
    if (choice === null) {
      player.blank += 1;
      player.gained = 0;
      continue;
    }
    const elapsed = Math.min(duration, Math.max(0, (player.answeredAt || now) - game.openedAt));
    player.timeSum += elapsed;
    player.answeredCount += 1;
    if (choice === card.correct) {
      const gained = pointsFor(elapsed, duration);
      player.correct += 1;
      player.score += gained;
      player.gained = gained;
    } else {
      player.wrong += 1;
      player.gained = 0;
    }
  }
  card.graded = true;
}

function finish(game, now) {
  grade(game, now);
  game.status = 'finished';
  game.finishedAt = now;
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
  if (game.status === 'playing') {
    const waiting = activePlayers(game).filter(player => !player.locked);
    const expired = now >= game.closesAt + ANSWER_GRACE_MS;
    if (expired || waiting.length === 0) {
      grade(game, Math.min(now, game.closesAt));
      game.status = 'reveal';
      game.revealUntil = now + REVEAL_MS;
    }
    return game;
  }
  if (game.status === 'reveal' && now >= (game.revealUntil || 0)) {
    game.cursor += 1;
    if (game.cursor >= game.deck.length) return finish(game, now);
    return openQuestion(game, now);
  }
  return game;
}

export function answer(game, playerId, choice, cursor, now = Date.now()) {
  if (game.status !== 'playing') throw new QuizError('Cette question est fermée.');
  if (Number(cursor) !== game.cursor) throw new QuizError('Cette question est déjà passée.');
  const player = game.players.find(entry => entry.id === playerId && !entry.abandoned);
  if (!player) throw new QuizError('Tu ne fais pas partie de cette partie.', 403);
  if (player.locked) throw new QuizError('Ta réponse est déjà enregistrée.');
  if (now > game.closesAt + ANSWER_GRACE_MS) {
    advance(game, now);
    throw new QuizError('Le temps est écoulé.');
  }
  const picked = Number(choice);
  if (!Number.isInteger(picked) || picked < 0 || picked > 3) throw new QuizError('Choisis une des quatre réponses.');
  player.choice = picked;
  player.answeredAt = Math.min(now, game.closesAt);
  player.locked = true;
  advance(game, now > game.closesAt ? game.closesAt : now);
  return game;
}

export function beginQuiz(game, deck, now = Date.now()) {
  if (game.status !== 'lobby') throw new QuizError('La partie a déjà commencé.');
  if (activePlayers(game).length < game.rules.minPlayers) throw new QuizError('Il faut au moins deux joueurs.');
  if (!Array.isArray(deck) || deck.length < 1) throw new QuizError('Aucune question disponible.');
  const ids = deck.map(card => card.id);
  if (new Set(ids).size !== ids.length) throw new QuizError('La sélection contient une question en double.');
  game.deck = deck;
  game.seenIds = [...new Set([...(game.seenIds || []), ...ids])];
  game.cursor = 0;
  for (const player of game.players) Object.assign(player, blankStats(), { choice: null, answeredAt: 0, locked: false, gained: 0, ready: true });
  return openQuestion(game, now);
}

export function rematch(game, deck, now = Date.now()) {
  if (game.status !== 'finished') throw new QuizError('La revanche se lance à la fin de la partie.');
  game.players = activePlayers(game);
  game.status = 'lobby';
  return beginQuiz(game, deck, now);
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

export function publicView(game, viewerId, now = Date.now()) {
  const copy = game;
  const me = copy.players.find(player => player.id === viewerId) || null;
  const card = copy.deck?.[copy.cursor] || null;
  const showAnswer = copy.status === 'reveal' || copy.status === 'finished';
  const question = card && copy.status !== 'lobby' ? {
    index: copy.cursor + 1,
    total: copy.deck.length,
    categorie: card.categorie,
    difficulte: difficultyLabel(card.difficulte),
    prompt: card.prompt,
    options: card.options.map((text, index) => ({ key: LETTERS[index], text })),
    closesAt: copy.closesAt || 0,
    locked: Boolean(me?.locked),
    choice: me?.locked ? LETTERS[me.choice] : ''
  } : null;
  if (question && showAnswer && card) {
    question.correct = LETTERS[card.correct];
    question.correctText = card.options[card.correct];
    question.gained = me?.gained || 0;
    question.explication = card.explication || '';
  }
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
      gained: showAnswer ? me.gained : 0,
      rate: rate(me),
      averageMs: averageMs(me)
    } : null,
    question,
    standings: copy.status === 'lobby' ? [] : standings(copy).map(row => {
      if (copy.status !== 'finished') return row;
      const player = copy.players.find(entry => entry.id === row.id);
      const total = row.correct + row.wrong + row.blank;
      return {
        ...row,
        rate: total ? Math.round((row.correct / total) * 100) : 0,
        averageMs: player?.answeredCount ? Math.round(player.timeSum / player.answeredCount) : 0
      };
    }),
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
    choice: null,
    answeredAt: 0,
    locked: false,
    gained: 0,
    ...blankStats()
  };
}

export { LETTERS };
