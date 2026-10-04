import { esc, icon, shell } from '../ui.js';
export { quizRulesHtml } from './guide.js';

const LEVELS = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };

function doorShell(content) {
  return shell(content, { active: 'home' });
}

export function quizDoorScreen({ top = [], scoresState = 'loading', online = true, profile = null }) {
  const cards = scoresState === 'loading'
    ? `<div class="leader-card skeleton skeleton-card" aria-label="Chargement du classement"></div>`
    : top.length
      ? top.map((player, index) => scoreLine(player, index)).join('')
      : `<div class="empty-state">Les victoires Quiz Battle apparaissent à la fin d’une partie.</div>`;
  const welcome = profile ? `<div class="notice-row">${icon('spark', 16)}<span>Re-bienvenue ${esc(profile.name)} · ${Number(profile.wins || 0)} victoire${Number(profile.wins) === 1 ? '' : 's'}</span></div>` : '';
  const content = `<div class="hero qz-hero"><div class="eyebrow">Questions</div><h1 class="display">Quiz Battle</h1><p class="intro">Même question. Quatre réponses. Seul ou à plusieurs.</p><div class="game-cover"><img src="/covers/quiz.jpg" alt=""></div><div class="home-actions"><button class="btn btn-primary" data-action="qz-solo">${icon('spark')}Jouer seul</button><button class="btn btn-secondary" data-action="qz-setup">${icon('plus')}Créer un salon</button><button class="btn btn-secondary" data-action="qz-join">${icon('users')}Rejoindre une salle<span style="margin-left:auto;color:var(--muted2)">${icon('arrow', 16)}</span></button><button class="btn btn-secondary" data-action="qz-admin">${icon('rules', 16)}Banque de questions</button></div>${welcome}<div class="notice-row"><span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'Connecté à l’arène' : 'Hors ligne · accueil et règles disponibles'}</span></div></div><section aria-labelledby="quiz-top"><div class="section-heading"><h2 class="section-title" id="quiz-top">Les légendes de Quiz Battle</h2><button class="section-link" data-action="rankings">Tout voir ${icon('arrow', 14)}</button></div><div class="leader-track" aria-label="Top 10 Quiz Battle">${cards}</div></section>`;
  return doorShell(content);
}

function scoreLine(player, index) {
  const wins = Number(player.wins || 0);
  const games = Number(player.games || 0);
  const best = Number(player.bestScore || 0);
  return `<article class="leader-card"><span class="leader-badge">${String(index + 1).padStart(2, '0')}</span><span class="leader-copy"><b class="leader-name">${esc(player.name)}</b><span class="leader-meta">${games} partie${games > 1 ? 's' : ''} · record ${best} pts</span></span><span class="leader-score">${wins} ${wins > 1 ? 'victoires' : 'victoire'}</span></article>`;
}

export function quizSetupScreen(name = '', meta = null, solo = false) {
  const categories = meta?.byCategory ? Object.keys(meta.byCategory).sort((a, b) => a.localeCompare(b, 'fr')) : [];
  const options = ['toutes', ...categories].map(id => `<option value="${esc(id)}">${id === 'toutes' ? 'Toutes' : `${esc(id)} · ${meta.byCategory[id]}`}</option>`).join('');
  const active = solo ? 'Seul, sans victoire au classement.' : meta ? `${meta.active} questions prêtes` : 'Tu peux déjà choisir Toutes.';
  const players = solo ? '' : `<div class="field"><span class="field-label">Joueurs maximum</span><div class="segmented" data-choice="maxPlayers">${segments([4, 8, 12, 20], 20)}</div></div>`;
  const content = `<div class="page-head"><button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button><div><h1>${solo ? 'Jouer seul' : 'Quiz Battle'}</h1><p>${esc(active)}</p></div></div><form id="quiz-create" class="qz-form" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" placeholder="Ex. Alex Martin" value="${esc(name)}" required></label><div class="field"><span class="field-label">Nombre de questions</span><div class="segmented" data-choice="questions">${segments([5, 10, 15, 20], 10)}</div></div><div class="field"><span class="field-label">Difficulté</span><div class="segmented" data-choice="difficulty">${segments([['toutes', 'Toutes'], ['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']], 'toutes')}</div></div><label class="field"><span class="field-label">Catégorie</span><select class="text-input" name="category">${options}</select></label><div class="field"><span class="field-label">Temps par question</span><div class="segmented" data-choice="seconds">${segments([[5, '5 s'], [10, '10 s'], [15, '15 s'], [20, '20 s'], [30, '30 s']], 10)}</div></div>${players}<div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">${solo ? 'Commencer' : 'Créer la partie'} ${icon('arrow', 17)}</button></form>`;
  return shell(content, { nav: false });
}

function segments(items, selected) {
  return items.map(item => {
    const value = Array.isArray(item) ? item[0] : item;
    const label = Array.isArray(item) ? item[1] : item;
    return `<button type="button" class="segment" data-value="${esc(value)}" aria-pressed="${String(value) === String(selected)}">${esc(label)}</button>`;
  }).join('');
}

export function quizInviteScreen(code) {
  const content = `<div class="page-head"><button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button><div><h1>Tu es invité</h1><p>Entre ton pseudo. Le salon est déjà dans le lien.</p></div></div><form id="quiz-join" novalidate><p class="notice">Salon <strong>${esc(code)}</strong></p><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" placeholder="Ex. Alex Martin" required autofocus></label><input type="hidden" name="code" value="${esc(code)}"><div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">Rejoindre le salon ${icon('arrow', 17)}</button></form>`;
  return shell(content, { nav: false });
}

export function quizLobbyScreen(game, playerId) {
  const present = game.players.filter(player => !player.abandoned);
  const meHost = game.hostId === playerId;
  const max = game.rules?.maxPlayers || 20;
  const list = present.map(player => `<li><span>${esc(player.name)}</span>${player.host ? '<em>Hôte</em>' : ''}</li>`).join('');
  const start = meHost ? `<button class="btn btn-primary btn-full" data-action="qz-start">${present.length < 2 ? 'Jouer seul' : 'Commencer la partie'}</button>` : `<p class="form-note">En attente de l’hôte.</p>`;
  const content = `<section class="qz"><div class="page-head"><button class="back-btn" data-action="qz-leave" aria-label="Quitter">${icon('back')}</button><div><div class="eyebrow">Quiz Battle</div><h1>Salon ${esc(game.code)}</h1><p>${present.length}/${max} joueurs</p></div></div><ul class="qz-people">${list}</ul><p class="form-note">${esc(filterLine(game.rules))}</p><div class="home-actions">${start}<button class="btn btn-secondary" data-action="qz-copy" data-copy="link">Inviter</button></div></section>`;
  return shell(content, { nav: false });
}

function filterLine(rules = {}) {
  const category = !rules.category || rules.category === 'toutes' ? 'Toutes les catégories' : rules.category;
  const difficulty = !rules.difficulty || rules.difficulty === 'toutes' ? 'Toutes les difficultés' : (LEVELS[rules.difficulty] || rules.difficulty);
  return `${rules.questions || 10} questions · ${difficulty} · ${category} · ${rules.seconds || 10} s`;
}

export function quizTableScreen(game) {
  const question = game.question;
  const options = (question?.options || []).map((option, index) => {
    const mine = question.choice === option.key;
    const good = mine && question.verdict === 'good';
    const bad = mine && question.verdict === 'bad';
    const state = good ? 'is-good' : bad ? 'is-bad' : mine ? 'is-mine' : '';
    return `<button type="button" class="qz-option ${state}" data-action="qz-answer" data-choice="${index}" data-cursor="${question.index - 1}" ${question.locked ? 'disabled' : ''}><span class="qz-letter">${option.key}</span><span>${esc(option.text)}</span></button>`;
  }).join('');
  const soloTools = game.solo ? `<div class="qz-live-tools"><button type="button" class="btn btn-secondary btn-sm" data-action="qz-restart">Recommencer</button><button type="button" class="btn btn-secondary btn-sm" data-action="qz-quit">Quitter</button></div>` : '';
  const content = `<section class="qz"><div class="qz-top"><span>${question?.index || 1} / ${question?.total || game.rules?.questions || 10}</span><span>${esc(question?.categorie || '')}</span></div><h1 class="qz-prompt">${esc(question?.prompt || '')}</h1><div class="qz-timer" data-qz-closes="${question?.closesAt || 0}"><b data-qz-left>--</b><span>secondes</span></div><div class="qz-options">${options}</div>${soloTools}</section>`;
  return shell(content, { nav: false, enter: false });
}

export function quizHoldScreen(game) {
  const seconds = game.rules?.seconds || 10;
  const score = game.you?.score ?? 0;
  const content = `<section class="qz qz-final"><p class="qz-kicker">Ton tour est fini</p><h1>${score} pts</h1><p class="qz-winner">Les autres gardent leurs ${seconds} secondes. Ta série ne bouge plus.</p></section>`;
  return shell(content, { nav: false });
}

export function quizFinalScreen(game, playerId, detail = false) {
  const winners = (game.standings || []).filter(row => (game.winnerIds || []).includes(row.id));
  const solo = Boolean(game.solo);
  const title = solo ? 'Résultat' : winners.length > 1 ? 'Vainqueurs' : 'Vainqueur';
  const mine = (game.standings || []).find(row => row.id === playerId) || game.standings?.[0];
  const names = solo ? `${esc(mine?.name || '')} · ${mine?.score ?? 0} pts` : winners.map(row => esc(row.name)).join(', ') || '—';
  const rows = (game.standings || []).map(row => `<li><b>${row.rank}</b><span>${esc(row.name)}</span><strong>${row.score}</strong></li>`).join('');
  const review = (game.review || []).map(item => {
    const mark = item.blank ? 'Sans réponse' : item.good ? 'Juste' : 'Erreur';
    const yours = item.blank ? 'Pas de réponse' : `${item.choice}. ${item.choiceText}`;
    return `<li class="${item.good ? 'is-good' : 'is-bad'}"><b>${item.index}</b><span><strong>${esc(item.prompt)}</strong><em>${mark} · ${esc(yours)}</em><em>Réponse : ${esc(item.correct)}. ${esc(item.correctText)}</em></span></li>`;
  }).join('');
  const board = detail
    ? `<div class="qz-board"><ol class="qz-rank qz-review">${review || '<li>Aucune réponse enregistrée.</li>'}</ol></div>`
    : `<ol class="qz-rank qz-rank-final">${rows}</ol>`;
  const meHost = game.hostId === playerId;
  const revenge = !solo && meHost && !detail ? `<button class="btn btn-primary" data-action="qz-rematch">Revanche</button>` : '';
  const again = solo ? 'qz-solo' : 'qz-setup';
  const content = `<section class="qz qz-final"><p class="qz-kicker">${solo ? 'Partie seul' : 'Quiz terminé'}</p><h1>${detail ? 'Mes réponses' : title}</h1>${detail ? '' : `<p class="qz-winner">${names}</p>`}${board}<div class="home-actions"><button class="btn btn-secondary" data-action="qz-detail">${detail ? 'Classement' : 'Mes réponses'}</button>${revenge}<button class="btn btn-secondary" data-action="${again}">${solo ? 'Rejouer seul' : 'Nouvelle partie'}</button><button class="btn btn-secondary" data-action="qz-hub">Retour aux jeux</button></div></section>`;
  return shell(content, { nav: false });
}

export function quizAdminScreen({ summary = null, questions = [], page = 1, pages = 1, total = 0, query = '', category = '', difficulty = '', notice = '', editing = null }) {
  const counts = summary?.byCategory ? Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([name, count]) => `<li><span>${esc(name)}</span><b>${count}</b></li>`).join('') : '';
  const cats = summary?.categories || [];
  const catOptions = ['', ...cats].map(name => `<option value="${esc(name)}" ${name === category ? 'selected' : ''}>${name ? esc(name) : 'Toutes les catégories'}</option>`).join('');
  const rows = questions.map(question => `<article class="qz-admin-card"><header><b>${esc(question.categorie)}</b><span>${esc(LEVELS[question.difficulte] || question.difficulte)}</span><em>${question.actif ? 'Publiée' : 'Inactive'}</em></header><p>${esc(question.question)}</p><p class="form-note">Bonne réponse : ${esc(question.reponse_correcte)}</p><div class="qz-admin-actions"><button type="button" class="btn btn-secondary btn-sm" data-action="qz-edit" data-id="${esc(question.id)}">Modifier</button><button type="button" class="btn btn-secondary btn-sm" data-action="qz-toggle" data-id="${esc(question.id)}">${question.actif ? 'Désactiver' : 'Activer'}</button><button type="button" class="btn btn-secondary btn-sm" data-action="qz-remove" data-id="${esc(question.id)}">Supprimer</button></div></article>`).join('') || `<div class="empty-state">Aucune question pour ce filtre.</div>`;
  const editor = editing ? `<form id="quiz-edit" class="qz-form"><input type="hidden" name="id" value="${esc(editing.id)}"><label class="field"><span class="field-label">Catégorie</span><input class="text-input" name="categorie" value="${esc(editing.categorie)}" required></label><label class="field"><span class="field-label">Difficulté</span><select class="text-input" name="difficulte"><option value="facile" ${editing.difficulte === 'facile' ? 'selected' : ''}>Facile</option><option value="moyen" ${editing.difficulte === 'moyen' ? 'selected' : ''}>Moyen</option><option value="difficile" ${editing.difficulte === 'difficile' ? 'selected' : ''}>Difficile</option></select></label><label class="field"><span class="field-label">Question</span><textarea class="text-input" name="question" rows="3" required>${esc(editing.question)}</textarea></label><label class="field"><span class="field-label">Bonne réponse</span><input class="text-input" name="reponse_correcte" value="${esc(editing.reponse_correcte)}" required></label>${['a', 'b', 'c', 'd'].map(letter => `<label class="field"><span class="field-label">Option ${letter.toUpperCase()}</span><input class="text-input" name="option_${letter}" value="${esc(editing[`option_${letter}`] || '')}" required></label>`).join('')}<label class="field"><span class="field-label">Explication</span><input class="text-input" name="explication" value="${esc(editing.explication || '')}"></label><input type="hidden" name="actif" value="1"><div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">Enregistrer</button></form>` : '';
  const content = `<div class="page-head"><button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button><div><div class="eyebrow">Administration</div><h1>Banque</h1><p>${summary ? `${summary.active} questions jouables` : 'Connexion…'}</p></div></div><section class="qz"><form id="quiz-admin-key" class="qz-form"><label class="field"><span class="field-label">Clé d’administration</span><input class="text-input" name="key" type="password" autocomplete="current-password" placeholder="QUIZ_ADMIN_KEY"></label><button class="btn btn-secondary btn-sm" type="submit">Ouvrir</button></form>${notice ? `<p class="notice">${esc(notice)}</p>` : ''}<ul class="qz-counts">${counts}</ul><form id="quiz-filter" class="qz-form"><label class="field"><span class="field-label">Recherche</span><input class="text-input" name="q" value="${esc(query)}" placeholder="Mot, réponse, ville…"></label><label class="field"><span class="field-label">Catégorie</span><select class="text-input" name="categorie">${catOptions}</select></label><label class="field"><span class="field-label">Difficulté</span><select class="text-input" name="difficulte"><option value="">Toutes</option><option value="facile" ${difficulty === 'facile' ? 'selected' : ''}>Facile</option><option value="moyen" ${difficulty === 'moyen' ? 'selected' : ''}>Moyen</option><option value="difficile" ${difficulty === 'difficile' ? 'selected' : ''}>Difficile</option></select></label><button class="btn btn-secondary" type="submit">Filtrer</button></form><p class="form-note">${total} question${total > 1 ? 's' : ''} · page ${page}/${pages}</p><div class="qz-admin-list">${rows}</div><div class="home-actions">${page > 1 ? `<button class="btn btn-secondary" data-action="qz-page" data-page="${page - 1}">Précédent</button>` : ''}${page < pages ? `<button class="btn btn-secondary" data-action="qz-page" data-page="${page + 1}">Suivant</button>` : ''}</div>${editor}<form id="quiz-import" class="qz-form"><label class="field"><span class="field-label">Importer un CSV</span><input class="text-input" name="file" type="file" accept=".csv,text/csv,text/plain"></label><div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">Importer</button><p class="form-note">Les quatre options peuvent rester vides : la question est alors inactive jusqu’à vérification. Les doublons sont ignorés.</p></form></section>`;
  return shell(content, { nav: false });
}
