import { esc, icon, pageHead, shell } from '../ui.js';

const RANK_LABELS = { A: 'AS', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', J: 'VALET', Q: 'DAME', K: 'ROI', JOKER: 'JOKER' };
const DEMAND_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

function cardFace(card, { playable = false, dim = false, inert = false } = {}) {
  const classes = ['playing-card', card.red ? 'is-red' : 'is-black', card.type !== 'normal' ? 'is-special' : '', playable ? 'is-playable' : '', dim ? 'is-dim' : ''].filter(Boolean).join(' ');
  const mark = card.rank === 'JOKER' ? '★' : card.rank;
  const inner = `<span class="card-corner">${esc(card.symbol)}<small>${esc(mark)}</small></span><span class="card-suit">${esc(card.symbol)}</span><span class="card-corner card-corner-br">${esc(card.symbol)}<small>${esc(mark)}</small></span>`;
  const label = `${card.symbol} ${RANK_LABELS[card.rank] || card.rank}`;
  if (inert || !playable) return `<div class="${classes}" aria-label="${esc(label)}">${inner}</div>`;
  return `<button type="button" class="${classes}" data-action="ix-play" data-card="${esc(card.id)}" aria-label="${esc(label)}">${inner}</button>`;
}

function seat(player, active) {
  const status = player.abandoned ? 'Abandon' : !player.connected ? 'Hors ligne' : player.cardCount === 1 ? 'Dernière carte' : `${player.cardCount} carte${player.cardCount > 1 ? 's' : ''}`;
  return `<div class="seat-chip ${active ? 'is-turn' : ''}"><span class="avatar" aria-hidden="true">${esc(player.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(player.name)}</strong><span>${status}</span></span></div>`;
}

export function interSetupScreen(name) {
  const players = [2, 3, 4, 5, 6].map(count => `<button type="button" class="segment" data-choice="maxPlayers" data-value="${count}" aria-pressed="${count === 4}">${count}</button>`).join('');
  const rounds = [1, 3, 5].map(count => `<button type="button" class="segment" data-choice="rounds" data-value="${count}" aria-pressed="${count === 1}">${count}</button>`).join('');
  const content = `${pageHead('Nouvelle partie INTER', 'Salon privé. Le code suffit pour inviter.')}<form id="inter-create" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" required value="${esc(name)}" placeholder="Ex. Alex Martin"></label><div class="field"><span class="field-label">Nombre de joueurs</span><div class="segmented" data-choice="maxPlayers">${players}</div></div><div class="field"><span class="field-label">Manches</span><div class="segmented" data-choice="rounds">${rounds}</div></div><p class="notice">Partie privée · 4 cartes chacun · le reste forme la pioche.</p><div class="error-note" data-form-error role="status"></div><div class="form-footer"><button class="btn btn-primary btn-full" type="submit">Créer le salon ${icon('arrow', 17)}</button></div></form>`;
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
  if (game.phase === 'demand' && game.demandOwnerId === viewerId) lines.push(['Choisis la valeur demandée.', 'is-you']);
  else if (game.mustResolveDraw && game.yourTurn) lines.push(['Tu as pioché. Pose une carte ou passe ton tour.', 'is-you']);
  else if (game.yourTurn) lines.push(['C’est ton tour', 'is-you']);
  else if (turnName) lines.push([`Tour de ${turnName}`, '']);
  if (game.pendingDraw > 0) lines.push([`+${game.pendingDraw} cartes à subir`, 'is-alert']);
  if (game.requestedRank) lines.push([`Le prochain joueur doit jouer : ${RANK_LABELS[game.requestedRank]}`, 'is-alert']);
  const skipped = [...(game.log || [])].reverse().find(entry => entry.type === 'PLAYER_SKIPPED');
  if (skipped && Date.now() - skipped.at < 5000) lines.push([`STOP — Tour passé · ${skipped.name}`, 'is-alert']);
  for (const player of game.players) if (player.cardCount === 1 && !player.abandoned) lines.push([`DERNIÈRE CARTE ! ${player.name}`, 'is-alert']);
  return `<div class="inter-status">${lines.map(([text, kind]) => `<p class="${kind}">${esc(text)}</p>`).join('')}</div>`;
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

export function interTableScreen(game, viewerId) {
  const me = game.players.find(player => player.id === viewerId);
  const seats = arranged(game.players, viewerId);
  const zone = (list, area) => `<div class="seat seat-${area}">${list.map(player => seat(player, player.id === game.turnPlayerId)).join('')}</div>`;
  const hand = (me?.hand || []).slice().sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank) || a.suit.localeCompare(b.suit));
  const playable = new Set(game.playable || []);
  const canAct = game.yourTurn && game.phase === 'play';
  const cards = hand.map(card => cardFace(card, { playable: canAct && playable.has(card.id), dim: canAct && !playable.has(card.id) })).join('');
  const demand = game.phase === 'demand' && game.demandOwnerId === viewerId
    ? `<div class="demand-grid" role="group" aria-label="Valeur demandée">${DEMAND_RANKS.map(rank => `<button type="button" data-action="ix-choose" data-rank="${rank}">${esc(RANK_LABELS[rank])}</button>`).join('')}</div>`
    : '';
  const center = game.center ? cardFace(game.center, { inert: true }) : '<div class="card-back" aria-hidden="true"></div>';
  const canDraw = canAct && !game.mustResolveDraw;
  const drawLabel = game.pendingDraw > 0 ? `Piocher ${game.pendingDraw}` : 'Piocher';
  const drawFace = game.pendingDraw > 0 ? `+${game.pendingDraw}` : 'Piocher';
  const pile = canDraw
    ? `<button type="button" class="card-back" data-action="ix-draw" aria-label="${esc(drawLabel)}"><span class="card-back-label">${esc(drawFace)}</span></button>`
    : `<div class="card-back" aria-hidden="true"></div>`;
  const tools = `<div class="inter-tools" style="display:flex;gap:8px;justify-content:flex-end">${iconButton('ix-sound', 'Son')}${iconButton('ix-haptic', 'Vibrations')}</div>`;
  const actions = `<div class="inter-actions">${game.mustResolveDraw && game.yourTurn ? '<button class="btn btn-secondary" data-action="ix-pass">Passer mon tour</button>' : ''}${me?.cardCount === 1 && !me.announced ? '<button class="btn btn-primary" data-action="ix-announce">INTER</button>' : ''}<button class="btn btn-secondary" data-action="ix-rules">Règles</button><button class="btn btn-secondary" data-action="ix-abandon">Abandonner</button></div>`;
  const content = `${pageHead('INTER', `Manche ${game.round} / ${game.rules.rounds}`, false)}${tools}${banners(game, viewerId)}${demand}<div class="inter-table">${zone(seats.north, 'north')}${zone(seats.west, 'west')}<div class="felt"><div class="pile"><span>Défausse</span>${center}${game.lastPlayCount > 1 ? `<span>${game.lastPlayCount} cartes</span>` : ''}</div><div class="pile"><span>Pioche</span>${pile}<span>${game.deckCount}</span></div></div>${zone(seats.east, 'east')}<div class="seat seat-me"><div class="hand-fan" aria-label="Tes cartes">${cards || '<p>Plus de cartes</p>'}</div>${actions}</div></div>`;
  return shell(content, { nav: false, wide: true });
}

function iconButton(action, label) {
  return `<button class="btn btn-secondary btn-sm" data-action="${action}" aria-label="${label}">${label}</button>`;
}

export function interBetweenScreen(game) {
  const winner = game.players.find(player => player.id === game.winnerId);
  const rows = game.ranking.map((player, index) => `<div class="rank-row"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}</div><div class="rank-stats">${player.cardCount} carte${player.cardCount > 1 ? 's' : ''} · ${player.roundPoints} pts</div></div></div>`).join('');
  const content = `${pageHead('Manche terminée', 'La suivante commence toute seule.', false)}<div class="correction-hero"><div class="correction-kicker">Vainqueur de la manche</div><h2 class="correction-category">${winner ? esc(winner.name) : 'Égalité'}</h2></div><div class="rank-list">${rows}</div>`;
  return shell(content, { nav: false });
}

export function interFinalScreen(game) {
  const winner = game.players.find(player => player.id === game.winnerId);
  const duration = game.finishedAt && game.startedAt ? Math.max(1, Math.round((game.finishedAt - game.startedAt) / 1000)) : 0;
  const rows = game.ranking.map((player, index) => `<div class="rank-row ${player.id === game.winnerId ? 'is-winner' : ''}"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}</div><div class="rank-stats">${player.cardCount} carte${player.cardCount > 1 ? 's' : ''} · ${player.penaltiesReceived} cartes de pénalité · score ${player.matchScore}</div></div><span class="rank-points">${player.matchScore}</span></div>`).join('');
  const content = `${pageHead('Victoire', `${game.turnCount} tours · ${duration} s`, false)}<div class="correction-hero"><div class="correction-kicker">${icon('trophy', 18)} Victoire</div><h2 class="correction-category">${winner ? esc(winner.name) : 'Partie terminée'}</h2><p class="correction-caption">${game.round} manche${game.round > 1 ? 's' : ''} · le score le plus bas l’emporte</p></div><div class="rank-list">${rows}</div><div class="room-actions"><button class="btn btn-secondary" data-action="ix-rules">Règles du jeu</button><button class="btn btn-secondary" data-action="ix-leave">Quitter</button></div>`;
  return shell(content, { nav: false, wide: true });
}

export function interRulesHtml() {
  return `<p class="sheet-copy">Pose une carte de la même enseigne ou de la même valeur. Tu peux poser ensemble plusieurs cartes de la même valeur.</p><ol class="rules-list"><li>Chacun reçoit 4 cartes. Une carte est retournée au centre, le reste est la pioche.</li><li>As : bloque autant de joueurs que d’as posés.</li><li>2 : le suivant pioche 2 cartes, cumulables, et perd son tour.</li><li>8 : se pose sur tout. Tu demandes la valeur que le suivant doit jouer.</li><li>10 : le suivant pioche 4 cartes, cumulables, et perd son tour.</li><li>Joker : se pose à tout moment. Le suivant pioche 5 cartes, cumulables.</li><li>Valet, dame et roi se jouent comme des cartes normales.</li><li>Tu peux piocher même si une carte est jouable. Une seule pioche par tour : ensuite tu poses ou tu passes. Si la pioche est vide, la défausse est mélangée, sauf la carte visible.</li><li>À une carte, annonce INTER. La manche s’arrête quand un joueur n’a plus de carte.</li><li>Score des cartes restantes : As 1, 8 vaut 25, têtes 10, Joker 50. Le plus bas total gagne.</li></ol>`;
}
