import { esc, icon, pageHead, shell } from '../ui.js';

const RANK_LABELS = { A: 'AS', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', J: 'VALET', Q: 'DAME', K: 'ROI', JOKER: 'JOKER' };
const DEMAND_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

function jokerPortrait(smile) {
  const eyes = smile
    ? '<path d="M20 34c1.6 2.4 4.2 2.4 5.8 0M36 34c1.6 2.4 4.2 2.4 5.8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    : '<path d="M20 33h6M36 31.5c2.2 1.4 4.6 1.2 6.2-.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const mouth = smile
    ? '<path d="M22 44c3.2 7 14.8 7 18 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
    : '<path d="M24 46c2.4 1.6 6.2 2.4 12 .2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
  return `<svg class="joker-portrait" viewBox="0 0 64 72" aria-hidden="true"><path d="M22 26c2-8 18-8 20 0-3-3-17-3-20 0z" fill="#e2b657"/><circle cx="32" cy="15" r="2.6" fill="#e2b657"/><circle cx="32" cy="38" r="16" fill="#fff6ea" stroke="currentColor" stroke-width="1.7"/>${eyes}<circle cx="24.2" cy="38" r="1.3" fill="currentColor"/><circle cx="39.8" cy="38" r="1.3" fill="currentColor"/>${mouth}</svg>`;
}

function cardFace(card, { playable = false, dim = false, inert = false } = {}) {
  const joker = card.rank === 'JOKER';
  const classes = ['playing-card', card.red ? 'is-red' : 'is-black', joker ? 'is-joker' : '', card.type !== 'normal' ? 'is-special' : '', playable ? 'is-playable' : '', dim ? 'is-dim' : ''].filter(Boolean).join(' ');
  const mark = joker ? 'J' : card.rank;
  const smile = joker && card.face !== 'wry';
  const inner = joker
    ? `<span class="card-corner">★<small>${esc(mark)}</small></span><span class="joker-body">${jokerPortrait(smile)}<span class="joker-sign">Del'hiver</span></span><span class="card-corner card-corner-br">★<small>${esc(mark)}</small></span>`
    : `<span class="card-corner"><b>${esc(mark)}</b><small>${esc(card.symbol)}</small></span><span class="card-suit">${esc(card.symbol)}</span><span class="card-corner card-corner-br"><b>${esc(mark)}</b><small>${esc(card.symbol)}</small></span>`;
  const label = joker ? `Joker ${card.red ? 'rouge' : 'noir'}, Del'hiver` : `${card.symbol} ${RANK_LABELS[card.rank] || card.rank}`;
  if (inert || !playable) return `<div class="${classes}" data-card="${esc(card.id)}" aria-label="${esc(label)}">${inner}</div>`;
  return `<button type="button" class="${classes}" data-action="ix-play" data-card="${esc(card.id)}" aria-label="${esc(label)}">${inner}</button>`;
}

export function cardFlightHtml(card) {
  return cardFace(card, { inert: true });
}

function seat(player, active) {
  const status = player.abandoned ? 'Abandon' : player.bot ? 'IA' : !player.connected ? 'Hors ligne' : player.cardCount === 1 ? 'Dernière carte' : `${player.cardCount} carte${player.cardCount > 1 ? 's' : ''}`;
  return `<div class="seat-chip ${active ? 'is-turn' : ''} ${player.bot ? 'is-bot' : ''}" data-player="${esc(player.id)}"><span class="avatar" aria-hidden="true">${esc(player.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(player.name)}</strong><span>${status}</span></span></div>`;
}

const AI_LABEL = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

export function interSoloScreen(name) {
  const levels = [['easy', 'Facile'], ['medium', 'Moyen'], ['hard', 'Difficile']].map(([value, label]) => `<button type="button" class="segment" data-choice="level" data-value="${value}" aria-pressed="${value === 'medium'}">${label}</button>`).join('');
  const content = `${pageHead('Contre Poséidon', 'Une partie en face à face. Le niveau change la façon de jouer, pas les règles.')}<form id="inter-solo" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" required value="${esc(name)}" placeholder="Ex. Alex Martin"></label><div class="field"><span class="field-label">Niveau</span><div class="segmented" data-choice="level">${levels}</div></div><p class="notice">Facile pose au hasard. Moyen joue proprement. Difficile garde les 8 et les jokers, et vise la main adverse.</p><div class="error-note" data-form-error role="status"></div><div class="form-footer"><button class="btn btn-primary btn-full" type="submit">Lancer la partie ${icon('arrow', 17)}</button></div></form>`;
  return shell(content, { nav: false });
}

export function interSetupScreen(name) {
  const players = [2, 3, 4, 5, 6].map(count => `<button type="button" class="segment" data-choice="maxPlayers" data-value="${count}" aria-pressed="${count === 4}">${count}</button>`).join('');
  const content = `${pageHead('Nouvelle partie INTER', 'Salon privé. Le code suffit pour inviter.')}<form id="inter-create" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" required value="${esc(name)}" placeholder="Ex. Alex Martin"></label><div class="field"><span class="field-label">Nombre de joueurs</span><div class="segmented" data-choice="maxPlayers">${players}</div></div><p class="notice">Partie privée · 4 cartes chacun · après chaque manche, l’hôte choisit d’en lancer une autre.</p><div class="error-note" data-form-error role="status"></div><div class="form-footer"><button class="btn btn-primary btn-full" type="submit">Créer le salon ${icon('arrow', 17)}</button></div></form>`;
  return shell(content, { nav: false });
}

export function interInviteScreen(code) {
  const content = `${pageHead('Tu es invité à INTER', 'Entre ton pseudo. Le code est déjà dans le lien.')}<form id="inter-join" novalidate><p class="notice">Salon <strong>${esc(code)}</strong> · partie privée</p><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" required placeholder="Ex. Alex Martin"></label><input type="hidden" name="code" value="${esc(code)}"><div class="error-note" data-form-error role="status"></div><div class="form-footer"><button class="btn btn-primary btn-full" type="submit">Rejoindre ${icon('arrow', 17)}</button></div></form>`;
  return shell(content, { nav: false });
}

export function interLobbyScreen(game, viewerId) {
  const host = game.hostId === viewerId;
  const me = game.players.find(player => player.id === viewerId);
  const rows = game.players.map(player => `<div class="player-row"><span class="avatar" aria-hidden="true">${esc(player.name.slice(0, 1).toUpperCase())}</span><span class="player-name">${esc(player.name)}${player.id === viewerId ? ' <span style="color:var(--muted2);font-weight:500">(toi)</span>' : ''}<small class="player-sub">${player.ready ? 'Prêt' : 'Pas prêt'}${player.connected ? '' : ' · hors ligne'}</small></span>${player.id === game.hostId ? `<span class="host-mark">${icon('crown', 18)}</span>` : ''}</div>`).join('');
  const allReady = game.players.length >= 2 && game.players.every(player => player.ready);
  const share = `${location.origin}/i/${encodeURIComponent(game.code)}`;
  const content = `${pageHead('Salon INTER', 'Chacun appuie sur Prêt. La partie part quand la salle est pleine, ou quand l’hôte lance.')}<section class="code-card"><div class="eyebrow">Code privé</div><button class="room-code" data-action="ix-copy" data-copy="code">${esc(game.code)}</button><p class="invite-url">${esc(share)}</p><button class="btn btn-secondary btn-sm" data-action="ix-copy" data-copy="link">${icon('copy', 15)}Partager le lien</button></section><section class="room-section"><div class="section-heading"><h2 class="section-title">Joueurs</h2><span class="online-pill">${game.players.length} / ${game.rules.maxPlayers}</span></div><div class="surface" style="padding:5px 15px">${rows}</div></section><div class="room-actions"><button class="btn ${me?.ready ? 'btn-secondary' : 'btn-primary'}" data-action="ix-ready">${me?.ready ? 'Annuler prêt' : 'Prêt'}</button>${host ? `<button class="btn btn-primary" data-action="ix-start" ${allReady ? '' : 'disabled'}>${icon('spark')}Lancer</button>` : ''}<button class="btn btn-secondary" data-action="ix-rules">${icon('rules')}Règles du jeu</button><button class="btn btn-secondary" data-action="ix-leave">${icon('close', 16)}Quitter le salon</button></div>`;
  return shell(content, { nav: false });
}

function banners(game, viewerId) {
  const turnName = game.players.find(player => player.id === game.turnPlayerId)?.name || '';
  const lines = [];
  if ((game.freePlay || game.center?.rank === 'JOKER') && game.yourTurn) lines.push(['Joker · n’importe quelle carte', 'is-you']);
  else if (game.phase === 'demand' && game.demandOwnerId === viewerId) lines.push(['Choisis une valeur', 'is-you']);
  else if (game.mustResolveDraw && game.yourTurn) lines.push(['Pose ou passe', 'is-you']);
  else if (game.yourTurn && game.pendingDraw > 0) lines.push(['Pénalité en cours', 'is-you']);
  else if (game.yourTurn && !(game.playable || []).length) lines.push(['Aucune carte · pioche', 'is-you']);
  else if (game.yourTurn) lines.push(['À toi de jouer', 'is-you']);
  else if (turnName) lines.push([turnName, '']);
  if (game.pendingDraw > 0) lines.push([`+${game.pendingDraw}`, 'is-alert']);
  const received = [...(game.log || [])].reverse().find(entry => entry.type === 'PLAYER_DREW_CARDS' && entry.reason === 'penalty');
  if (received && Date.now() - received.at < 5000) lines.push([`${received.name} +${received.count}`, 'is-alert']);
  if (game.requestedRank) lines.push([RANK_LABELS[game.requestedRank], 'is-alert']);
  const skipped = [...(game.log || [])].reverse().find(entry => entry.type === 'PLAYER_SKIPPED');
  if (skipped && Date.now() - skipped.at < 5000) lines.push([`Stop · ${skipped.name}`, 'is-alert']);
  for (const player of game.players) if (player.cardCount === 1 && !player.abandoned) lines.push([`Dernière · ${player.name}`, 'is-alert']);
  return `<div class="inter-status" role="status">${lines.map(([text, kind]) => `<p class="${kind}">${esc(text)}</p>`).join('')}</div>`;
}

function arranged(players, viewerId) {
  const start = Math.max(0, players.findIndex(player => player.id === viewerId));
  const ordered = players.map((player, index) => ({ player, offset: (index - start + players.length) % players.length }));
  const buckets = { north: [], west: [], east: [], me: [] };
  for (const entry of ordered) {
    if (entry.offset === 0) buckets.me.push(entry.player);
    else if (players.length === 2) buckets.north.push(entry.player);
    else if (entry.offset === 1) buckets.east.push(entry.player);
    else if (entry.offset === players.length - 1) buckets.west.push(entry.player);
    else buckets.north.push(entry.player);
  }
  return buckets;
}

export function interTableScreen(game, viewerId, { enter = true } = {}) {
  const me = game.players.find(player => player.id === viewerId);
  const seats = arranged(game.players, viewerId);
  const zone = (list, area) => `<div class="seat seat-${area}">${list.map(player => seat(player, player.id === game.turnPlayerId)).join('')}</div>`;
  const hand = (me?.hand || []).slice().sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank) || a.suit.localeCompare(b.suit));
  const playable = new Set(game.playable || []);
  const canAct = game.yourTurn && game.phase === 'play';
  const cards = hand.map(card => cardFace(card, { playable: canAct && playable.has(card.id), dim: canAct && !playable.has(card.id) })).join('');
  const ownedRanks = [...new Set(hand.map(card => card.rank).filter(rank => DEMAND_RANKS.includes(rank)))].sort((a, b) => DEMAND_RANKS.indexOf(a) - DEMAND_RANKS.indexOf(b));
  const demand = game.phase === 'demand' && game.demandOwnerId === viewerId
    ? `<div class="demand-grid" role="group" aria-label="Valeur demandée">${ownedRanks.map(rank => `<button type="button" data-action="ix-choose" data-rank="${rank}">${esc(RANK_LABELS[rank])}</button>`).join('')}</div>`
    : '';
  const center = game.center ? cardFace(game.center, { inert: true }) : '<div class="card-back" aria-hidden="true"></div>';
  const canDraw = canAct && !game.mustResolveDraw;
  const penaltyForMe = game.pendingDraw > 0 && !game.freePlay;
  const drawLabel = penaltyForMe ? `Piocher ${game.pendingDraw}` : 'Piocher';
  const drawFace = penaltyForMe ? `+${game.pendingDraw}` : 'Piocher';
  const pile = canDraw
    ? `<button type="button" class="card-back" data-action="ix-draw" aria-label="${esc(drawLabel)}"><span class="card-back-label">${esc(drawFace)}</span></button>`
    : `<div class="card-back" aria-hidden="true"></div>`;
  const tools = `<div class="inter-tools">${iconButton('ix-sound', 'Son')}${iconButton('ix-haptic', 'Vibrations')}</div>`;
  const actions = `<div class="inter-actions">${game.mustResolveDraw && game.yourTurn ? '<button class="btn btn-secondary" data-action="ix-pass">Passer mon tour</button>' : ''}${me?.cardCount === 1 && !me.announced ? '<button class="btn btn-primary" data-action="ix-announce">INTER</button>' : ''}<button class="btn btn-secondary" data-action="ix-rules">Règles</button><button class="btn btn-secondary" data-action="ix-abandon">Abandonner</button></div>`;
  const level = AI_LABEL[game.ai?.level];
  const manche = `${Number(game.rules.rounds) > 0 ? `Manche ${game.round} / ${game.rules.rounds}` : `Manche ${game.round}`}${level ? ` · Poséidon ${level}` : ''}`;
  const crowd = hand.length >= 13 ? 'is-crowd' : hand.length >= 9 ? 'is-packed' : hand.length >= 6 ? 'is-full' : '';
  const content = `<div class="table-bar">${pageHead('INTER', manche, false, 'is-compact')}${tools}</div>${banners(game, viewerId)}${demand}<div class="inter-table">${zone(seats.north, 'north')}${zone(seats.west, 'west')}<div class="felt"><div class="pile" data-role="center"><span>Défausse</span>${center}${game.lastPlayCount > 1 ? `<span>${game.lastPlayCount} cartes</span>` : ''}</div><div class="pile" data-role="draw"><span>Pioche</span>${pile}<span>${game.deckCount}</span></div></div>${zone(seats.east, 'east')}<div class="seat seat-me"><div class="hand-fan ${crowd}" data-count="${hand.length}" aria-label="Tes cartes">${cards || '<p>Plus de cartes</p>'}</div>${actions}</div></div>`;
  return shell(content, { nav: false, wide: true, enter });
}

function iconButton(action, label) {
  return `<button class="btn btn-secondary btn-sm" data-action="${action}" aria-label="${label}">${label}</button>`;
}

export function interBetweenScreen(game, viewerId) {
  const winner = game.players.find(player => player.id === game.winnerId);
  const host = game.hostId === viewerId;
  const rows = game.ranking.map((player, index) => `<div class="rank-row"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}</div><div class="rank-stats">${player.cardCount} carte${player.cardCount > 1 ? 's' : ''} · ${player.roundPoints} cette manche · ${player.matchScore} au total</div></div></div>`).join('');
  const choice = host
    ? `<div class="room-actions"><button class="btn btn-primary" data-action="ix-continue">Lancer une autre manche</button><button class="btn btn-secondary" data-action="ix-finish">Clore la partie</button></div>`
    : `<p class="notice">L’hôte choisit de lancer une autre manche, ou de clore la partie.</p>`;
  const content = `${pageHead('Manche terminée', 'Rien ne repart tout seul.', false)}<div class="correction-hero"><div class="correction-kicker">Vainqueur de la manche</div><h2 class="correction-category">${winner ? esc(winner.name) : 'Égalité'}</h2></div><div class="rank-list">${rows}</div>${choice}`;
  return shell(content, { nav: false, wide: true });
}

export function interFinalScreen(game) {
  const winner = game.players.find(player => player.id === game.winnerId);
  const duration = game.finishedAt && game.startedAt ? Math.max(1, Math.round((game.finishedAt - game.startedAt) / 1000)) : 0;
  const rows = game.ranking.map((player, index) => `<div class="rank-row ${player.id === game.winnerId ? 'is-winner' : ''}"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}</div><div class="rank-stats">${player.cardCount} carte${player.cardCount > 1 ? 's' : ''} · ${player.penaltiesReceived} cartes de pénalité · score ${player.matchScore}</div></div><span class="rank-points">${player.matchScore}</span></div>`).join('');
  const content = `${pageHead('Victoire', `${game.turnCount} tours · ${duration} s`, false)}<div class="correction-hero"><div class="correction-kicker">${icon('trophy', 18)} Victoire</div><h2 class="correction-category">${winner ? esc(winner.name) : 'Partie terminée'}</h2><p class="correction-caption">${game.round} manche${game.round > 1 ? 's' : ''} · le score le plus bas l’emporte</p></div><div class="rank-list">${rows}</div><div class="room-actions"><button class="btn btn-secondary" data-action="ix-rules">Règles du jeu</button><button class="btn btn-secondary" data-action="ix-leave">Quitter</button></div>`;
  return shell(content, { nav: false, wide: true });
}

export function interRulesHtml() {
  return `<p class="sheet-copy">Pose une carte de la même enseigne ou de la même valeur. Plusieurs cartes de la même valeur se posent ensemble dès que l’une d’elles va au centre. Celle du dessus inverse la couleur et l’enseigne du centre.</p><ol class="rules-list"><li>Chacun reçoit 4 cartes. Une carte est retournée au centre, le reste est la pioche. Si c’est un 2, un 10 ou un joker, le joueur qui doit commencer ramasse tout de suite et c’est le suivant qui joue. Après la manche, l’hôte choisit d’en lancer une autre.</li><li>As : seulement sur la même enseigne ou la même valeur. Il bloque autant de joueurs que d’as posés.</li><li>2 : seulement sur la même enseigne ou la même valeur. Le suivant reçoit 2 cartes tout de suite et perd son tour. Plusieurs 2 posés ensemble s’additionnent.</li><li>8 : se pose sur tout. Tu demandes une valeur que tu as encore en main.</li><li>10 : seulement sur la même enseigne ou la même valeur. Le suivant reçoit 4 cartes tout de suite et perd son tour. Plusieurs 10 posés ensemble s’additionnent.</li><li>Joker : un seul à la fois. Le suivant reçoit 5 cartes et passe son tour. On joue ensuite celui qui le suit, et il peut poser n’importe quelle carte. À deux, la main revient à celui qui a posé le joker, qui peut alors jouer ce qu’il veut. Le joker rouge sourit, le noir non. Les deux sont signés Del'hiver.</li><li>Valet, dame et roi se jouent comme des cartes normales.</li><li>Tu peux piocher même si une carte est jouable. Une seule pioche par tour : ensuite tu poses ou tu passes. Si la pioche est vide, la défausse est mélangée, sauf la carte visible.</li><li>À une carte, annonce INTER. La manche s’arrête quand un joueur n’a plus de carte.</li><li>Score des cartes restantes : As 1, 8 vaut 25, têtes 10, Joker 50. Le plus bas total gagne.</li></ol>`;
}
