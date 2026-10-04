import { esc, icon, scoreCard, shell } from '../ui.js';

const CATALOG = [
  { id: 'petitbac', lane: 'letters', mark: 'A', art: 'letters', badge: 'Lettres', title: 'Petit Bac', text: 'Dix catégories', status: 'Prêt' },
  { id: 'inter', lane: 'cards', mark: 'I', art: 'cards', badge: 'Cartes', title: 'INTER', text: 'Enseigne et valeur', status: 'Prêt' },
  { id: 'next', lane: 'soon', mark: '+', art: 'soon', badge: 'À venir', title: 'Prochain jeu', text: 'Place réservée', status: 'Bientôt' }
];

function matches(query, ...parts) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return parts.join(' ').toLowerCase().includes(q);
}

export function hubScreen({ online = true, canInstall = false, savedRoom = null, savedInter = null, profile = null, interProfile = null, name = '', filter = 'all', query = '' }) {
  const you = name.trim() ? esc(name.trim().slice(0, 2).toUpperCase()) : 'TO';
  const points = Number(profile?.totalScore || 0);
  const wins = Number(interProfile?.wins || 0);
  const shown = CATALOG.filter(game => (filter === 'all' || game.lane === filter) && matches(query, game.title, game.text, game.badge));
  const games = shown.map(game => {
    const body = `<span class="nx-lib-top"><span class="nx-cover nx-art-${game.art}">${game.mark}</span><span class="nx-badge">${game.badge}</span></span><span class="nx-lib-copy"><strong>${game.title}</strong><span>${game.text}</span></span><span class="nx-lib-foot"><span class="nx-dotline">${game.status}</span><span class="nx-go" aria-hidden="true">${icon('play', 14)}</span></span>`;
    return game.id === 'next'
      ? `<article class="nx-lib-card is-soon" data-hub-item="${esc(`${game.title} ${game.text} ${game.badge}`)}">${body}</article>`
      : `<button type="button" class="nx-lib-card" data-action="open-game" data-game="${game.id}" data-hub-item="${esc(`${game.title} ${game.text} ${game.badge}`)}">${body}</button>`;
  }).join('') || `<p class="nx-empty">Aucun jeu pour cette recherche.</p>`;
  const filters = [['all', 'Tous'], ['letters', 'Lettres'], ['cards', 'Cartes']]
    .map(([id, label]) => `<button type="button" class="nx-filter" data-action="hub-filter" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('');
  const jumps = [
    savedRoom ? { action: 'resume', art: 'letters', tag: 'Reprise', title: 'Petit Bac', meta: `Salle ${savedRoom.code}`, when: 'En cours' } : null,
    savedInter ? { action: 'ix-resume', art: 'cards', tag: 'Reprise', title: 'INTER', meta: `Salle ${savedInter.code}`, when: 'En cours' } : null,
    { action: 'open-game', game: 'petitbac', art: 'letters', tag: 'Lettres', title: 'Petit Bac', meta: 'Entre amis', when: 'Prêt' },
    { action: 'open-game', game: 'inter', art: 'cards', tag: 'Cartes', title: 'INTER', meta: 'Face à face', when: 'Prêt' },
    { action: 'ix-solo', art: 'poseidon', tag: 'IA', title: 'Poséidon', meta: '3 niveaux', when: 'Seul' }
  ].filter(item => item && matches(query, item.title, item.meta, item.tag));
  const shelf = jumps.map(item => `<button type="button" class="nx-jump" data-action="${item.action}" ${item.game ? `data-game="${item.game}"` : ''} data-hub-item="${esc(`${item.title} ${item.meta} ${item.tag}`)}"><span class="nx-jump-art nx-art-${item.art}"><span class="nx-jump-tag">${item.tag}</span><span class="nx-jump-play" aria-hidden="true">${icon('play', 16)}</span></span><span class="nx-jump-copy"><strong>${esc(item.title)}</strong><span><em>${esc(item.meta)}</em><em>${item.when}</em></span></span></button>`).join('');
  const install = canInstall ? `<button type="button" class="nx-pill nx-pill-violet" data-action="install">${icon('install', 14)}Installer</button>` : '';
  const content = `<div class="nx">
    <section class="nx-ribbon" aria-label="État de l’arène">
      <span class="nx-pill"><i class="nx-ping ${online ? '' : 'is-off'}"></i><b>${online ? 'Connecté' : 'Hors ligne'}</b></span>
      <span class="nx-pill"><b>2 jeux</b><span>ouverts</span></span>
      <span class="nx-pill nx-pill-cyan">${icon('spark', 14)}<b>IA</b><span>3 niveaux</span></span>
      ${install}
    </section>
    <section class="nx-hero" aria-label="Partie contre Poséidon">
      <div class="nx-hero-art">
        <span class="nx-watermark" aria-hidden="true">P</span>
        <span class="nx-scrim"></span>
        <div class="nx-hero-top">
          <span class="nx-pill"><i class="nx-ping"></i>Face à face</span>
          <span class="nx-pill nx-pill-cyan">3 niveaux</span>
        </div>
        <div class="nx-hero-copy">
          <div class="nx-hero-meta"><span class="nx-tag">Cartes · IA</span><span>${icon('spark', 14)} Règles intactes</span></div>
          <h1>Poséidon</h1>
          <div class="nx-squad">
            <span class="nx-faces" aria-hidden="true"><b>${you}</b><b class="is-ai">IA</b></span>
            <span>Partie prête</span>
          </div>
          <button type="button" class="nx-launch" data-action="ix-solo">${icon('play', 22)}Lancer la partie</button>
        </div>
      </div>
    </section>
    <section class="nx-banner">
      <div class="nx-banner-top">
        <span class="nx-banner-mark">${icon('trophy', 22)}</span>
        <div><span class="nx-kicker">Classements</span><h2>Deux tableaux</h2></div>
        <span class="nx-count">${points} pts</span>
      </div>
      <div class="nx-banner-foot">
        <span>${icon('spark', 14)} ${points} pts · ${wins} victoire${wins === 1 ? '' : 's'}</span>
        <button type="button" class="nx-join" data-action="rankings">Ouvrir</button>
      </div>
    </section>
    <section class="nx-block">
      <div class="nx-head"><h2>Reprendre</h2><span>${jumps.length} prêt${jumps.length > 1 ? 's' : ''}</span></div>
      <div class="nx-shelf">${shelf}</div>
    </section>
    <section class="nx-block">
      <div class="nx-head"><h2>Bibliothèque</h2><span class="nx-count-badge">2 jeux</span></div>
      <div class="nx-filters" role="toolbar" aria-label="Filtrer les jeux">${filters}</div>
      <div class="nx-grid">${games}</div>
      <div class="nx-storage">
        <div><span>${icon('spark', 14)} Arène</span><b>2 / 3 places</b></div>
        <div class="nx-bar" aria-hidden="true"><i style="width:66%"></i></div>
      </div>
    </section>
  </div>`;
  return shell(content, { active: 'home', chrome: 'deck', query });
}

export function lettersScreen({ top = [], scoresState = 'loading', online = true, profile = null, savedRoom = null }) {
  const cards = boardCards(top, scoresState, 'petitbac');
  const resume = savedRoom ? `<button class="btn btn-secondary" data-action="resume">${icon('crown', 16)}Reprendre ${esc(savedRoom.code)}${savedRoom.host ? ' · tu es l’hôte' : ''}</button>` : '';
  const welcome = profile ? `<div class="notice-row">${icon('spark', 16)}<span>Re-bienvenue ${esc(profile.name)} · ${Number(profile.totalScore || 0)} points cumulés</span></div>` : '';
  const scoreNote = scoresState === 'error' ? `<p class="form-note">Le classement en ligne n’a pas répondu. Les scores déjà vus sur cet appareil restent affichés.</p>` : '';
  const content = `<div class="hero"><div class="eyebrow">Lettres</div><h1 class="display">Petit Bac</h1><p class="intro">Une lettre. Dix catégories. Zéro temps mort.</p><div class="hero-art" aria-hidden="true"><span class="hero-orbit"></span><span class="hero-letter">A</span></div><div class="home-actions"><button class="btn btn-primary" data-action="create">${icon('plus')}Créer une partie</button><button class="btn btn-secondary" data-action="join">${icon('users')}Rejoindre une salle<span style="margin-left:auto;color:var(--muted2)">${icon('arrow',16)}</span></button>${resume}</div>${welcome}<div class="notice-row"><span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'Connecté à l’arène' : 'Hors ligne · accueil et règles disponibles'}</span></div></div><section aria-labelledby="top-title"><div class="section-heading"><h2 class="section-title" id="top-title">Les légendes du Petit Bac</h2><button class="section-link" data-action="rankings">Tout voir ${icon('arrow',14)}</button></div>${scoreNote}<div class="leader-track" aria-label="Top 10 des joueurs">${cards}</div></section>`;
  return shell(content, { active: 'home' });
}

export function cardsScreen({ top = [], scoresState = 'loading', online = true, profile = null, savedInter = null }) {
  const cards = boardCards(top, scoresState, 'inter');
  const resume = savedInter ? `<button class="btn btn-secondary" data-action="ix-resume">${icon('spark', 16)}Reprendre ${esc(savedInter.code)}${savedInter.host ? ' · tu es l’hôte' : ''}</button>` : '';
  const welcome = profile ? `<div class="notice-row">${icon('spark', 16)}<span>Re-bienvenue ${esc(profile.name)} · ${Number(profile.wins || 0)} victoire${Number(profile.wins) === 1 ? '' : 's'}</span></div>` : '';
  const scoreNote = scoresState === 'error' ? `<p class="form-note">Le classement en ligne n’a pas répondu. Les scores déjà vus sur cet appareil restent affichés.</p>` : '';
  const content = `<div class="hero"><div class="eyebrow">Cartes</div><h1 class="display">INTER</h1><p class="intro">Même enseigne, même valeur, effets cumulés.<br>Ou une partie contre Poséidon.</p><div class="home-actions"><button class="btn btn-primary" data-action="ix-solo">${icon('spark')}Jouer contre Poséidon</button><button class="btn btn-secondary" data-action="ix-setup">${icon('plus')}Créer un salon</button><button class="btn btn-secondary" data-action="ix-join">${icon('users')}Rejoindre une salle<span style="margin-left:auto;color:var(--muted2)">${icon('arrow',16)}</span></button>${resume}</div>${welcome}<div class="notice-row"><span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'Connecté à l’arène' : 'Hors ligne · accueil et règles disponibles'}</span></div></div><section aria-labelledby="top-title"><div class="section-heading"><h2 class="section-title" id="top-title">Les légendes d’INTER</h2><button class="section-link" data-action="rankings">Tout voir ${icon('arrow',14)}</button></div>${scoreNote}<div class="leader-track" aria-label="Top 10 INTER">${cards}</div></section>`;
  return shell(content, { active: 'home' });
}

function boardCards(top, scoresState, mode) {
  if (scoresState === 'loading') return `<div class="leader-card skeleton skeleton-card" aria-label="Chargement du classement"></div><div class="leader-card skeleton skeleton-card" aria-hidden="true"></div>`;
  if (!top.length) return `<div class="empty-state">${mode === 'inter' ? 'Les victoires INTER apparaissent à la fin d’une partie.' : 'Les scores apparaissent à la fin d’une partie et restent enregistrés.'}</div>`;
  return top.map((player, index) => scoreCard(player, index, mode)).join('');
}

export function rankingsScreen(top = [], profile = null, mode = 'petitbac') {
  const inter = mode === 'inter';
  const rows = top.length ? top.map((player, index) => {
    const detail = inter
      ? `${Number(player.wins || 0)} victoire${Number(player.wins) === 1 ? '' : 's'} · ${Number(player.games || 0)} parties · ${Number(player.penalties || 0)} cartes ramassées`
      : `${Number(player.wins || 0)} victoire${player.wins === 1 ? '' : 's'} · ${Number(player.games || 0)} parties · record ${Number(player.bestScore || 0)} pts`;
    const points = inter ? Number(player.wins || 0) : Number(player.totalScore || 0);
    return `<div class="rank-row"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}</div><div class="rank-stats">${detail}</div></div><span class="rank-points">${points}</span></div>`;
  }).join('') : `<div class="empty-state">${inter ? 'Aucune partie INTER terminée pour l’instant.' : 'Aucune partie terminée pour l’instant. Le classement reste enregistré après chaque salon.'}</div>`;
  const own = profile
    ? inter
      ? `<section class="surface stats-card" aria-label="Tes statistiques INTER"><div><div class="stat-num">${Number(profile.wins || 0)}</div><div class="stat-label">Victoires</div></div><div><div class="stat-num">${Number(profile.games || 0)}</div><div class="stat-label">Parties</div></div><div><div class="stat-num">${Number(profile.penalties || 0)}</div><div class="stat-label">Cartes ramassées</div></div></section>`
      : `<section class="surface stats-card" aria-label="Tes statistiques"><div><div class="stat-num">${Number(profile.totalScore || 0)}</div><div class="stat-label">Points cumulés</div></div><div><div class="stat-num">${Number(profile.games || 0)}</div><div class="stat-label">Parties jouées</div></div><div><div class="stat-num">${Number(profile.wins || 0)}</div><div class="stat-label">Victoires</div></div></section>`
    : '';
  const title = inter ? 'Classement INTER' : 'Classement global';
  const subtitle = inter ? 'Les victoires de toutes les parties de cartes' : 'Les points cumulés de toutes les parties';
  return shell(`<div class="page-head"><div><div class="eyebrow">Hall of fame</div><h1>${title}</h1><p>${subtitle}</p></div></div>${own}<div class="rank-list">${rows}</div><p class="footer-note">Poséidon - Del'Hiver</p>`, { active: 'rank' });
}
