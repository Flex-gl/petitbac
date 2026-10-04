import { esc, icon, scoreCard, shell } from '../ui.js';

const CATALOG = [
  { id: 'petitbac', lane: 'letters', mark: 'A', badge: 'Lettres', title: 'Petit Bac', text: 'Dix catégories', status: 'Entre amis' },
  { id: 'inter', lane: 'cards', mark: 'I', badge: 'Cartes', title: 'INTER', text: 'Enseigne et valeur', status: 'Face à face' },
  { id: 'next', lane: 'soon', mark: '+', badge: 'À venir', title: 'Prochain jeu', text: 'Place réservée', status: 'Bientôt' }
];

export function hubScreen({ online = true, canInstall = false, savedRoom = null, savedInter = null, profile = null, interProfile = null, name = '', filter = 'all' }) {
  const shown = CATALOG.filter(game => filter === 'all' || game.lane === filter);
  const games = shown.map(game => {
    const body = `<span class="deck-card-top"><span class="deck-glyph deck-glyph-${game.id}">${game.mark}</span><span class="deck-badge">${game.badge}</span></span><span class="deck-card-copy"><strong>${game.title}</strong><span>${game.text}</span></span><span class="deck-card-foot"><span class="deck-status-line"><i></i>${game.status}</span><span class="deck-play" aria-hidden="true">${icon('arrow', 16)}</span></span>`;
    return game.id === 'next'
      ? `<div class="deck-card is-soon">${body}</div>`
      : `<button type="button" class="deck-card" data-action="open-game" data-game="${game.id}">${body}</button>`;
  }).join('');
  const filters = [
    ['all', 'Tous'],
    ['letters', 'Lettres'],
    ['cards', 'Cartes']
  ].map(([id, label]) => `<button type="button" class="deck-filter" data-action="hub-filter" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('');
  const resumes = [
    savedRoom ? { action: 'resume', kicker: 'Lettres', title: 'Petit Bac', meta: savedRoom.code } : null,
    savedInter ? { action: 'ix-resume', kicker: 'Cartes', title: 'INTER', meta: savedInter.code } : null
  ].filter(Boolean);
  const shelf = resumes.length ? `<section class="deck-block"><div class="deck-head"><h2>Reprendre</h2><span>${resumes.length}</span></div><div class="deck-shelf deck-bleed">${resumes.map(item => `<button type="button" class="deck-resume" data-action="${item.action}"><span class="deck-badge">${item.kicker}</span><strong>${item.title}</strong><span>Salle ${esc(item.meta)}</span></button>`).join('')}</div></section>` : '';
  const points = Number(profile?.totalScore || 0);
  const wins = Number(interProfile?.wins || 0);
  const player = name.trim().length >= 2 ? `<span class="deck-chip">${esc(name.trim())}</span>` : '';
  const install = canInstall ? `<button type="button" class="deck-chip deck-chip-btn" data-action="install">${icon('install', 14)}Installer</button>` : '';
  const content = `<div class="deck">
    <div class="deck-row deck-bleed" aria-label="État de l’arène">
      <span class="deck-chip"><i class="deck-live ${online ? '' : 'is-off'}"></i>${online ? 'Connecté' : 'Hors ligne'}</span>
      <span class="deck-chip">2 jeux</span>
      ${player}${install}
    </div>
    <section class="deck-poster" aria-label="Partie contre Poséidon">
      <div class="deck-poster-top">
        <span class="deck-pill"><i class="deck-live"></i>Face à face</span>
        <span class="deck-pill deck-pill-gold">3 niveaux</span>
      </div>
      <div class="deck-poster-copy">
        <span class="deck-kicker">Cartes · IA</span>
        <h1>Poséidon</h1>
        <p>Facile, moyen ou difficile. Les règles d’INTER restent les mêmes.</p>
        <button type="button" class="btn btn-primary deck-launch" data-action="ix-solo">${icon('spark', 18)}Lancer la partie</button>
      </div>
    </section>
    <section class="deck-spot">
      <div class="deck-spot-main">
        <span class="deck-spot-mark">${icon('trophy', 20)}</span>
        <div>
          <span class="deck-kicker">Classements</span>
          <h2>Deux tableaux</h2>
        </div>
      </div>
      <p>Petit Bac en points. INTER en victoires. Rien n’est mélangé.</p>
      <button type="button" class="btn btn-secondary btn-sm" data-action="rankings">Ouvrir</button>
    </section>
    ${shelf}
    <section class="deck-block">
      <div class="deck-head"><h2>Bibliothèque</h2><span>2 jeux</span></div>
      <div class="deck-row deck-bleed" role="toolbar" aria-label="Filtrer les jeux">${filters}</div>
      <div class="deck-grid">${games}</div>
      <div class="deck-meter">
        <div><span>Petit Bac</span><b>${points} pts</b></div>
        <div><span>INTER</span><b>${wins} victoire${wins === 1 ? '' : 's'}</b></div>
      </div>
    </section>
  </div>`;
  return shell(content, { active: 'home' });
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
