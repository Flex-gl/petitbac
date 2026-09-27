import { categoryInfo } from '../corrector.js';
import { esc, icon, pageHead, shell } from '../ui.js';

function leaveRoomButton() {
  return `<button class="btn btn-secondary" data-action="leave">${icon('close', 16)}Quitter le salon</button>`;
}

function avatar(name) { return `<span class="avatar" aria-hidden="true">${esc(String(name || '?').slice(0, 1).toUpperCase())}</span>`; }

function timerRing(endAt, duration, id = 'round-timer') {
  return `<div class="timer" id="${id}" data-timer-end="${Number(endAt)}" data-duration="${Number(duration)}" aria-label="Temps restant"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="timer-track" cx="28" cy="28" r="24"></circle><circle class="timer-value" cx="28" cy="28" r="24"></circle></svg><span data-timer-text>--</span></div>`;
}

export function lobbyScreen(game, viewerId) {
  const host = game.hostId === viewerId;
  const canStart = game.players.length >= 2;
  const players = game.players.map((player, index) => `<div class="player-row">${avatar(player.name)}<span class="player-name">${esc(player.name)}${player.id === viewerId ? ' <span style="color:var(--muted2);font-weight:500">(toi)</span>' : ''}<small class="player-sub">Joueur ${index + 1}</small></span>${player.id === game.hostId ? `<span class="host-mark" title="Hôte">${icon('crown', 18)}</span>` : ''}</div>`).join('');
  const shareUrl = `${location.origin}/s/${encodeURIComponent(game.code)}`;
  const categories = game.config.categories.map(id => categoryInfo(id).label).join(' · ');
  const content = `${pageHead('La salle est prête', 'Invite tes amis avec le code ou le QR.') }<section class="code-card"><div class="eyebrow">Code de la salle</div><button class="room-code" data-action="copy-code" aria-label="Copier le code ${esc(game.code)}">${esc(game.code)}</button><p class="code-label">Le lien demande le pseudo, sans redemander le code.</p><p class="invite-url">${esc(shareUrl)}</p><div class="qr-box" id="qr-code"><span class="qr-placeholder">Préparation du<br>QR code…</span></div><button class="btn btn-secondary btn-sm" data-action="copy-link">${icon('copy', 15)}Partager le lien</button></section><section class="room-section"><div class="section-heading"><h2 class="section-title">Les joueurs</h2><span class="online-pill"><span class="status-dot"></span>${game.players.length} / 12</span></div><div class="surface" style="padding:5px 15px">${players}</div></section><section class="notice room-section"><strong>${game.config.rounds} manches</strong> · ${game.config.duration} secondes<br><span style="color:var(--muted)">${esc(categories)}</span></section><div class="room-actions">${host ? `<button class="btn btn-primary pulse-host" data-action="start" ${canStart ? '' : 'disabled'}>${icon('spark')}Lancer la partie</button>${canStart ? '' : '<p class="form-note" style="text-align:center">Deux joueurs minimum pour lancer la partie.</p>'}` : '<div class="waiting-banner">En attente du lancement par l’hôte…</div>'}<button class="btn btn-secondary" data-action="chat">${icon('message')}Ouvrir le chat</button>${leaveRoomButton()}</div>`;
  return shell(content, { nav: false, right: `<span class="online-pill"><span class="status-dot"></span>En ligne</span>` });
}

export function playScreen(game, viewerId) {
  const mine = game.submissions?.[viewerId];
  const left = Math.max(0, Math.ceil((game.roundEndsAt - Date.now()) / 1000));
  const fields = game.config.categories.map(id => {
    const category = categoryInfo(id);
    return `<label class="answer-field" data-answer-field="${esc(id)}"><span class="answer-top"><span class="cat-icon">${icon(category.icon, 16)}</span>${esc(category.label)}</span><input class="answer-input" data-answer="${esc(id)}" name="${esc(id)}" maxlength="45" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" placeholder="Une réponse en ${esc(game.letter)}…" ${mine ? 'disabled' : ''}></label>`;
  }).join('');
  const content = `${pageHead('À toi de jouer', `${game.players.length} joueurs dans la salle`, false)}<div class="game-top"><span class="round-tag">Manche ${game.round} / ${game.config.rounds}</span>${timerRing(game.roundEndsAt, game.config.duration)}</div><div class="letter-stage"><div class="letter-card" aria-label="Lettre ${esc(game.letter)}">${esc(game.letter)}</div></div>${mine ? `<div class="waiting-banner">${icon('check', 17)} Ta grille est envoyée. La correction démarre dès que tous les joueurs ont validé.</div>` : `<form id="answer-form"><div class="category-list">${fields}</div><div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full game-submit" type="submit">Valider ma grille ${icon('arrow', 17)}</button></form>`}<div class="section-heading"><h2 class="section-title">Scores de la partie</h2><span class="round-tag">${game.players.length} joueurs</span></div><div class="surface" style="padding:5px 15px">${game.players.slice().sort((a, b) => b.score - a.score).map(player => `<div class="player-row">${avatar(player.name)}<span class="player-name">${esc(player.name)}${player.id === viewerId ? ' (toi)' : ''}${player.id === game.hostId ? ' · hôte' : ''}</span><strong style="margin-left:auto;font:700 14px 'Space Grotesk';color:var(--cyan)">${player.score} pts</strong></div>`).join('')}</div><div class="room-actions">${leaveRoomButton()}</div>`;
  return shell(content, { nav: false, right: timerRing(game.roundEndsAt, game.config.duration, 'top-timer') });
}

const badgeClass = { unique: 'unique', duplicate: 'duplicate', invalid: 'invalid', unknown: 'unknown', missed: 'missed', accepted: 'unique', pending: 'pending' };
function badge(result) {
  return `<span class="result-badge ${badgeClass[result.badge] || ''}">${esc(result.label || 'Révélé')}${result.points ? ` <span class="points">+${result.points}</span>` : ''}</span>`;
}

const HINTS = {
  known: 'Présent dans le lexique',
  unknown: 'Absent du lexique',
  letter: 'Ne commence pas par la lettre de la manche'
};

function correctionDesk(game, viewerId, active) {
  if (!active?.result) return '';
  const result = active.result;
  const host = game.hostId === viewerId;
  const mine = result.playerId === viewerId;
  const word = result.word ? `« ${esc(result.word)} »` : 'aucune réponse';
  const hint = HINTS[result.hint] ? `<p class="appeal-sub">${HINTS[result.hint]}</p>` : '';
  if (active.phase === 'review' && result.needsHost) {
    if (host) {
      return `<section class="appeal-box judge-box"><div class="appeal-head">${icon('crown', 16)} À toi de corriger</div><p class="appeal-sub">Réponse de ${esc(result.playerName)} : ${word}</p>${hint}<div class="appeal-actions"><button class="btn btn-secondary btn-sm" data-action="judge" data-valid="false">Refuser</button><button class="btn btn-primary btn-sm" data-action="judge" data-valid="true">Valider</button></div></section>`;
    }
    return `<div class="waiting-banner">${icon('crown', 16)} L’hôte corrige la réponse de ${esc(result.playerName)}.</div>`;
  }
  if (active.phase === 'contest') {
    const decision = result.hostValid ? 'validée' : 'refusée';
    const clock = `<strong data-decision-end="${Number(active.contestEndsAt)}">${Math.max(0, Math.ceil((active.contestEndsAt - Date.now()) / 1000))}</strong>`;
    if (host) {
      return `<section class="appeal-box"><div class="appeal-head">${icon('check', 16)} Réponse ${decision}</div><p class="appeal-sub">${esc(result.playerName)} · ${word}. Les autres peuvent contester pendant ${clock} s.</p><button class="btn btn-primary btn-full" data-action="next">Réponse suivante ${icon('arrow', 16)}</button></section>`;
    }
    if (mine) return `<div class="waiting-banner">L’hôte a ${decision} ta réponse. Les autres peuvent la contester.</div>`;
    return `<section class="appeal-box"><div class="appeal-head">${icon('scale', 16)} Correction de l’hôte</div><p class="appeal-sub">${esc(result.playerName)} · ${word} a été ${decision}. Contestation possible pendant ${clock} s.</p><button class="btn btn-secondary btn-full" data-action="contest">Contester</button></section>`;
  }
  if (active.phase === 'appeal') {
    const head = `<div class="appeal-head">${icon('scale', 16)} Contestation <span class="appeal-count">${active.voteCount || 0} / ${game.players.length}</span></div><p class="appeal-sub">${word} de ${esc(result.playerName)} est contesté. La majorité tranche.</p>`;
    if (active.viewerVoted) return `<section class="appeal-box">${head}<div class="waiting-banner" style="margin:0">Ton vote est enregistré.</div></section>`;
    return `<section class="appeal-box">${head}<div class="appeal-actions"><button class="btn btn-secondary btn-sm" data-action="vote" data-valid="false">Refuser</button><button class="btn btn-primary btn-sm" data-action="vote" data-valid="true">Valider</button></div></section>`;
  }
  return '';
}

export function correctionScreen(game, viewerId) {
  const correction = game.correction;
  const category = categoryInfo(game.config.categories[correction.categoryIndex]);
  const active = correction.activeWord;
  const revealed = correction.visibleResults || [];
  const rows = game.players.map((player, index) => {
    const result = revealed[index];
    const isActive = index === correction.playerIndex && Boolean(active);
    if (!result?.revealed) return `<div class="reveal-row"><span class="reveal-player">${esc(player.name)}</span><span class="reveal-word reveal-hidden">•••</span><span class="result-badge">À venir</span></div>`;
    return `<div class="reveal-row revealed ${isActive ? 'active' : ''}"><span class="reveal-player">${esc(result.playerName)}</span><span class="reveal-word">${result.word ? esc(result.word) : '<em style="color:var(--muted2)">—</em>'}</span>${badge(result)}</div>`;
  }).join('');
  const desk = correctionDesk(game, viewerId, active);
  const max = Math.max(1, ...game.players.map(player => player.score));
  const leaderScore = Math.max(0, ...game.players.map(player => player.score));
  const table = `<table class="score-table"><thead><tr><th>Joueur</th><th>Manche</th><th>Total</th></tr></thead><tbody>${game.players.slice().sort((a, b) => b.score - a.score).map(player => `<tr><td>${esc(player.name)}${player.id === viewerId ? ' · toi' : ''}</td><td>+${player.roundScore}</td><td>${player.score} pts</td></tr>`).join('')}</tbody></table>`;
  const host = game.hostId === viewerId;
  const content = `${pageHead('Correction en direct', `Manche ${game.round} · l’hôte corrige, les autres peuvent contester`, false)}<div class="correction-hero"><div class="correction-kicker">Catégorie ${correction.categoryIndex + 1} / ${game.config.categories.length}</div><h2 class="correction-category"><span class="cat-icon">${icon(category.icon, 28)}</span> ${esc(category.label)}</h2><p class="correction-caption">${active ? `Réponse de ${esc(active.result.playerName)}` : 'Prochaine réponse dans un instant…'}</p>${host ? '<p class="correction-caption">Tu es l’hôte : valide ou refuse la réponse affichée.</p>' : ''}</div><div class="reveal-board" aria-live="polite">${rows}</div>${desk}<div class="score-strip"><div class="score-strip-head"><span>Classement de la partie</span><span class="score-value">${leaderScore} pts en tête</span></div><div class="score-track"><div class="score-fill" style="--score-progress:${Math.min(100, leaderScore / max * 100) / 100}"></div></div></div>${table}<div class="notice">L’hôte valide ou refuse chaque réponse. Une contestation ouvre un vote : 2 points si le mot est unique, 1 point s’il est en doublon.</div><div class="room-actions">${leaveRoomButton()}</div>`;
  return shell(content, { nav: false });
}

function podium(players) {
  const sorted = players.slice().sort((a, b) => b.score - a.score);
  const order = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
  const classes = ['second', 'first', 'third'];
  const places = ['2', '1', '3'];
  return `<div class="podium">${order.map((player, index) => `<div class="podium-place ${classes[index]}"><div class="podium-player">${esc(player.name)}</div><div class="podium-score">${player.score} pts</div><span class="medal">${places[index]}</span><div class="podium-base">${places[index]}</div></div>`).join('')}</div>`;
}

export function betweenScreen(game) {
  const sorted = game.players.slice().sort((a, b) => b.roundScore - a.roundScore);
  const winner = sorted[0];
  const until = Math.max(0, Math.ceil((game.nextRoundAt - Date.now()) / 1000));
  const content = `${pageHead(`Manche ${game.round} terminée`, 'Les scores sont à jour.', false)}<div class="correction-hero"><div class="correction-kicker">Podium de la manche</div><h2 class="correction-category">${winner ? esc(winner.name) : 'Bien joué'}</h2><p class="correction-caption">Prochaine manche dans <strong data-between-countdown>${until}</strong> s</p></div>${podium(game.players.map(player => ({ ...player, score: player.roundScore })))}<section class="surface" style="padding:5px 15px">${sorted.map(player => `<div class="player-row">${avatar(player.name)}<span class="player-name">${esc(player.name)}<small class="player-sub">+${player.roundScore} cette manche</small></span><strong class="score-value" style="margin-left:auto;font:700 13px 'Space Grotesk';color:var(--cyan)">${player.score} pts</strong></div>`).join('')}</section><div class="waiting-banner">La partie continue automatiquement.</div><div class="room-actions">${leaveRoomButton()}</div>`;
  return shell(content, { nav: false });
}

export function finalScreen(game, viewerId) {
  const sorted = game.players.slice().sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isWinner = winner?.id === viewerId;
  const rows = sorted.map((player, index) => `<div class="rank-row"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}${player.id === viewerId ? ' · toi' : ''}</div><div class="rank-stats">${player.roundsPlayed || game.round} manches</div></div><span class="rank-points">${player.score} pts</span></div>`).join('');
  const replay = game.hostId === viewerId ? `<button class="btn btn-primary" data-action="replay">${icon('spark')}Rejouer avec les mêmes joueurs</button>` : '<div class="waiting-banner">L’hôte peut relancer une partie avec le même groupe.</div>';
  const content = `${pageHead('Partie terminée', 'Chaque mot a compté.', false)}<div class="correction-hero"><div class="correction-kicker">${isWinner ? 'Tu remportes la partie' : 'Vainqueur de l’arène'}</div><h2 class="correction-category">${winner ? esc(winner.name) : 'Bien joué'}</h2><p class="correction-caption">${winner?.score || 0} points · ${game.round} manches</p></div>${podium(game.players)}<div class="rank-list">${rows}</div><div class="room-actions">${replay}<button class="btn btn-secondary" data-action="rankings">${icon('trophy')}Voir le classement global</button>${leaveRoomButton()}</div>`;
  return shell(content, { nav: false });
}
