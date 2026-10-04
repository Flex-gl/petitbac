import { esc, icon, scoreCard, shell } from '../ui.js';

const CATALOG = [
  { id: 'petitbac', kicker: 'Lettres', title: 'Petit Bac', text: 'Une lettre, dix catégories, entre amis.', live: true },
  { id: 'inter', kicker: 'Cartes', title: 'INTER', text: 'Couleur, valeur, et Poséidon en face à face.', live: true },
  { id: 'next', kicker: 'À venir', title: 'Prochain jeu', text: 'La place est prête pour un autre jeu.', live: false }
];

export function hubScreen({ online = true, canInstall = false, savedRoom = null, savedInter = null }) {
  const install = canInstall ? `<div class="install-badge">${icon('install', 18)}<span>À installer sur ton écran d’accueil</span><button data-action="install">Installer</button></div>` : '';
  const resume = savedRoom ? `<button class="btn btn-secondary" data-action="resume">${icon('crown', 16)}Reprendre Petit Bac ${esc(savedRoom.code)}</button>` : '';
  const resumeInter = savedInter ? `<button class="btn btn-secondary" data-action="ix-resume">${icon('spark', 16)}Reprendre INTER ${esc(savedInter.code)}</button>` : '';
  const games = CATALOG.map(game => game.live
    ? `<button type="button" class="hub-game" data-action="open-game" data-game="${game.id}"><span class="hub-kicker">${game.kicker}</span><strong>${game.title}</strong><span>${game.text}</span></button>`
    : `<div class="hub-game is-soon"><span class="hub-kicker">${game.kicker}</span><strong>${game.title}</strong><span>${game.text}</span></div>`).join('');
  const content = `<div class="hub"><div class="eyebrow">Poséidon · Del'Hiver</div><h1 class="display">Choisis<br><span class="gradient-text">ton jeu.</span></h1><p class="intro">Chaque jeu a sa salle, ses scores et ses règles.</p><div class="hub-grid">${games}</div><div class="home-actions">${resume}${resumeInter}</div>${install}<div class="notice-row"><span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'Connecté à l’arène' : 'Hors ligne · accueil et règles disponibles'}</span></div></div>`;
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
