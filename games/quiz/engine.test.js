import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advance, answer, beginQuiz, createPlayer, plainPrompt, pointsFor, prepareRestart, publicView, questionSubject, rematch, rulesFrom, selectIds, selectQuestions, skipSolo, QuizError } from './engine.js';
import { importQuestions, parseCsv, rowsFromCsv } from './csv.js';

function sample(id, answer = 'Dakar') {
  return {
    id,
    categorie: 'Géographie',
    difficulte: 'facile',
    question: `Quelle est la capitale associée à ${id} ?`,
    reponse_correcte: answer,
    option_a: 'Dakar',
    option_b: 'Accra',
    option_c: 'Rabat',
    option_d: 'Tunis',
    explication: '',
    actif: 1
  };
}

function lobby(now = 1_000_000) {
  const game = {
    kind: 'quiz',
    code: 'QUIZ01',
    version: 0,
    status: 'lobby',
    hostId: 'anna',
    hostSecret: 'secret',
    rules: { questions: 2, seconds: 10, difficulty: 'toutes', category: 'toutes', minPlayers: 2, maxPlayers: 20 },
    players: [createPlayer('anna', 'Anna'), createPlayer('leo', 'Léo')],
    deck: [],
    cursor: 0,
    seenIds: [],
    createdAt: now
  };
  const deck = selectQuestions([sample('q1', 'Dakar'), sample('q2', 'Accra'), sample('q3', 'Rabat')], { count: 2, random: () => 0.2 });
  return beginQuiz(game, deck, now);
}

test('le score dépend de la justesse et de la vitesse, côté serveur', () => {
  assert.equal(pointsFor(0, 10000), 100);
  assert.equal(pointsFor(10000, 10000), 60);
  assert.ok(pointsFor(2000, 10000) > pointsFor(8000, 10000));
  assert.ok(pointsFor(8000, 10000) >= 60);
});

test('une partie ne répète pas une question et cache la bonne réponse', () => {
  const pool = ['q1', 'q2', 'q3', 'q4'].map((id, index) => sample(id, ['Dakar', 'Accra', 'Rabat', 'Tunis'][index]));
  const first = selectQuestions(pool, { count: 2, used: ['q1'], recent: ['q2'], random: () => 0.1 });
  assert.equal(new Set(first.map(card => card.id)).size, 2);
  assert.ok(first.every(card => card.id !== 'q1' && card.id !== 'q2'));
  const game = lobby();
  const view = publicView(game, 'leo', game.openedAt + 1000);
  assert.equal(view.question.correct, undefined);
  assert.equal(view.question.correctText, undefined);
  assert.equal(view.deck, undefined);
  assert.equal(JSON.stringify(view).includes('reponse_correcte'), false);
  assert.equal(view.hostSecret, '');
  assert.equal(publicView(game, 'anna').hostSecret, 'secret');
});

test('une réponse juste rapide vaut plus qu’une réponse lente, et une erreur vaut zéro', () => {
  const game = lobby(5_000);
  const correct = game.deck[0].correct;
  const waiting = publicView(game, 'leo', game.openedAt + 200);
  assert.equal(waiting.question.verdict, '');
  assert.equal(waiting.question.correct, undefined);
  const leoClock = game.players[1].closesAt;
  answer(game, 'anna', correct, 0, game.openedAt + 500);
  const mine = publicView(game, 'anna', game.openedAt + 600);
  const his = publicView(game, 'leo', game.openedAt + 600);
  assert.equal(mine.flash.good, true);
  assert.equal(mine.question.index, 2);
  assert.equal(mine.question.correct, undefined);
  assert.equal(his.question.index, 1);
  assert.equal(his.question.verdict, '');
  assert.equal(his.question.closesAt, leoClock);
  answer(game, 'leo', correct, 0, game.openedAt + 8000);
  assert.equal(game.status, 'playing');
  assert.equal(game.cursor, 1);
  assert.ok(game.players[0].score > game.players[1].score);
  assert.ok(game.players[0].score <= 100);
  assert.ok(game.players[1].score >= 60);
  const wrong = game.deck[game.cursor].correct === 0 ? 1 : 0;
  answer(game, 'anna', wrong, game.cursor, game.openedAt + 1000);
  answer(game, 'leo', wrong, game.cursor, game.openedAt + 1000);
  assert.equal(game.status, 'finished');
  assert.equal(game.players[0].wrong, 1);
  const review = publicView(game, 'anna').review;
  assert.equal(review.length, 2);
  assert.equal(review[1].good, false);
  assert.equal(publicView(game, 'leo').review[1].choice === review[1].choice, true);
  assert.equal(JSON.stringify(publicView(game, 'leo')).includes(game.players[0].name) && publicView(game, 'leo').review.every(item => item.choice === publicView(game, 'leo').review.find(row => row.index === item.index).choice), true);
});

test('le serveur refuse une seconde réponse, une ancienne question et un temps dépassé', () => {
  const game = lobby(9_000);
  const correct = game.deck[0].correct;
  answer(game, 'anna', correct, 0, game.openedAt + 1000);
  assert.throws(() => answer(game, 'anna', correct === 0 ? 1 : 0, 0, game.openedAt + 1200), /déjà passée/);
  assert.throws(() => answer(game, 'leo', correct, 4, game.openedAt + 1200), /déjà passée/);
  assert.throws(() => answer(game, 'leo', correct, 0, game.closesAt + 2000), /écoulé/);
  assert.equal(game.players[1].locked, false);
});

test('sans réponse, le joueur marque zéro et la question se ferme toute seule', () => {
  const game = lobby(12_000);
  advance(game, game.closesAt + 1201);
  assert.equal(game.status, 'playing');
  assert.equal(game.cursor, 1);
  assert.equal(game.players[0].blank, 1);
  assert.equal(game.players[0].gained, 0);
  assert.equal(game.players[0].score, 0);
});

test('une réponse dans le délai de grâce reste comptée', () => {
  const game = lobby(40_000);
  const correct = game.deck[0].correct;
  answer(game, 'anna', correct, 0, game.closesAt + 400);
  answer(game, 'leo', correct, 0, game.openedAt + 1000);
  assert.equal(game.players[0].correct, 1);
  assert.equal(game.players[0].score, 60);
  assert.equal(game.players[0].review[0].gained, 60);
});

test('la revanche pioche d’autres questions', () => {
  const game = lobby(20_000);
  advance(game, game.closesAt + 1201);
  advance(game, game.closesAt + 1201);
  assert.equal(game.status, 'finished');
  const seen = new Set(game.seenIds);
  const pool = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id, index) => sample(id, ['Dakar', 'Accra', 'Rabat', 'Tunis'][index % 4]));
  const fresh = selectQuestions(pool, { count: 2, used: [...seen], random: () => 0.4 });
  rematch(game, fresh, 30_000);
  assert.equal(game.status, 'playing');
  assert.ok(game.deck.every(card => !seen.has(card.id)));
  assert.equal(game.players[0].score, 0);
});

test('une manche prend le même nombre de questions dans chaque catégorie', () => {
  const categories = ['Géographie', 'Sciences & Technologie', 'Histoire & Culture', 'Sport', 'Arts'];
  const pool = categories.flatMap(categorie => Array.from({ length: 12 }, (_, index) => ({
    ...sample(`${categorie}-${index}`),
    categorie,
    question: `Quelle réponse retient-on pour ${categorie} ${index} ?`
  })));
  const picked = selectQuestions(pool, { count: 10, random: () => 0.3 });
  const mix = {};
  for (const card of picked) mix[card.categorie] = (mix[card.categorie] || 0) + 1;
  assert.equal(picked.length, 10);
  assert.deepEqual(Object.values(mix).sort((a, b) => a - b), [2, 2, 2, 2, 2]);
  const sport = selectQuestions(pool, { count: 4, category: 'Sport', random: () => 0.2 });
  assert.equal(sport.length, 4);
  assert.ok(sport.every(card => card.categorie === 'Sport'));
});

test('une manche ne reprend ni la même ville ni une catégorie déjà épuisée', () => {
  const cities = ['Kinshasa', 'Goma', 'Matadi', 'Kisangani'].flatMap(city => ([
    { ...sample(`pays-${city}`), question: `Dans quel pays se trouve « ${city} » ?` },
    { ...sample(`cont-${city}`), question: `Sur quel continent se trouve « ${city} » ?` }
  ]));
  const picked = selectQuestions(cities, { count: 4, random: () => 0.2 });
  assert.equal(picked.length, 4);
  assert.equal(new Set(picked.map(questionSubject)).size, 4);
  const sport = Array.from({ length: 4 }, (_, index) => ({ ...sample(`sport-${index}`), categorie: 'Sport', question: `Quel score retient le sport ${index} ?` }));
  const geo = Array.from({ length: 12 }, (_, index) => ({ ...sample(`geo-${index}`), question: `Quel lieu retient la géographie ${index} ?` }));
  const again = selectQuestions([...sport, ...geo], { count: 6, recent: sport.map(item => item.id), random: () => 0.3 });
  assert.equal(again.length, 6);
  assert.ok(again.every(card => card.categorie === 'Géographie'));
});

test('le filtre de questions s’arrête s’il n’y en a pas assez', () => {
  assert.throws(() => selectQuestions([sample('q1')], { count: 5 }), QuizError);
});

test('l’import refuse un doublon et une question sans réponse', () => {
  const existing = [sample('q1')];
  const csv = 'categorie,difficulte,question,reponse,option_a,option_b,option_c,option_d,actif\nGéographie,facile,Quelle est la capitale associée à q1 ?,Dakar,Dakar,Accra,Rabat,Tunis,1\nSport,facile,Quel sport se joue avec un ballon rond ?,Football,Football,Rugby,Tennis,Boxe,1\nSport,facile,Question incomplète,,Football,Rugby,Tennis,Boxe,1\n';
  assert.equal(parseCsv(csv).length, 4);
  const result = importQuestions(existing, rowsFromCsv(csv), () => 'x9');
  assert.equal(result.duplicates, 1);
  assert.equal(result.imported.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.imported[0].question.includes('ballon'), true);
});

test('la banque contient plus de dix mille questions distinctes, en UTF-8', () => {
  const bank = JSON.parse(readFileSync(new URL('../../data/quiz/bank.json', import.meta.url), 'utf8'));
  assert.ok(bank.questions.length >= 10000);
  assert.equal(new Set(bank.questions.map(question => question.id)).size, bank.questions.length);
  assert.equal(new Set(bank.questions.map(question => question.question.toLowerCase())).size, bank.questions.length);
  assert.equal(bank.questions.some(question => /testez vos connaissances|question quiz battle|\(série\s*\d+\)/i.test(question.question)), false);
  assert.ok(bank.questions.some(question => question.categorie === 'Géographie' && question.question.includes('é')));
  const broken = bank.questions.filter(question => {
    const options = [question.option_a, question.option_b, question.option_c, question.option_d];
    const distinct = new Set(options.map(option => option.toLowerCase()));
    return !question.actif || distinct.size !== 4 || !options.some(option => option.toLowerCase() === question.reponse_correcte.toLowerCase());
  });
  assert.equal(broken.length, 0);
  const started = Date.now();
  const picked = selectQuestions(bank.questions, { count: 10, random: () => 0.42 });
  assert.equal(picked.length, 10);
  assert.ok(picked.every(card => card.correct >= 0 && card.correct <= 3 && card.options.length === 4));
  const mix = {};
  for (const card of picked) mix[card.categorie] = (mix[card.categorie] || 0) + 1;
  const spread = Object.values(mix);
  assert.ok(spread.length > 1);
  assert.ok(Math.max(...spread) - Math.min(...spread) <= 1);
  assert.ok((mix['Géographie'] || 0) <= 3);
  assert.ok(Date.now() - started < 1500);
  const ids = selectIds(bank.questions.map(question => ({ id: question.id, categorie: question.categorie, difficulte: question.difficulte, actif: question.actif })), { count: 10, random: () => 0.2 });
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  const preferred = selectIds(bank.questions.slice(0, 6).map(question => ({ id: question.id, categorie: question.categorie, difficulte: question.difficulte, actif: question.actif })), {
    count: 2,
    recent: bank.questions.slice(0, 5).map(question => question.id),
    random: () => 0.9
  });
  assert.ok(preferred.includes(bank.questions[5].id));
});

test('un joueur seul peut commencer, sans adversaire', () => {
  const game = {
    kind: 'quiz',
    code: 'SOLO01',
    version: 0,
    status: 'lobby',
    hostId: 'anna',
    hostSecret: 'secret',
    rules: rulesFrom({ questions: 5, seconds: 10, maxPlayers: 1, difficulty: 'toutes', category: 'toutes' }),
    players: [createPlayer('anna', 'Anna')],
    deck: [],
    cursor: 0,
    seenIds: [],
    createdAt: 1_000
  };
  assert.equal(game.rules.minPlayers, 1);
  assert.equal(game.rules.maxPlayers, 1);
  const deck = selectQuestions([sample('q1'), sample('q2'), sample('q3')], { count: 2, random: () => 0.2 });
  beginQuiz(game, deck, 1_000);
  assert.equal(game.status, 'playing');
  assert.equal(game.solo, true);
  const view = publicView(game, 'anna', game.openedAt + 100);
  assert.equal(view.solo, true);
  assert.equal(view.question.correct, undefined);
  answer(game, 'anna', game.deck[0].correct, 0, game.openedAt + 300);
  assert.equal(game.status, 'playing');
  assert.equal(game.cursor, 1);
  assert.equal(game.players[0].correct, 1);
  assert.equal(publicView(game, 'anna').flash.good, true);
  assert.throws(() => prepareRestart({ ...game, solo: false, status: 'playing' }), /solo/);
  assert.throws(() => skipSolo({ ...game, solo: false, status: 'playing' }), /solo/);
  assert.equal(plainPrompt('Testez vos connaissances : Quelle est la capitale du Ghana ? (série 2)'), 'Quelle est la capitale du Ghana ?');
});
