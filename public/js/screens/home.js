import { esc, icon, scoreCard, shell } from '../ui.js';

export function homeScreen({ top = [], scoresState = 'loading', online = true, canInstall = false, profile = null, savedRoom = null, gameMode = 'petitbac', savedInter = null }) {
  const inter = gameMode === 'inter';
  const cards = scoresState === 'loading'
    ? `<div class="leader-card skeleton skeleton-card" aria-label="Chargement du classement"></div><div class="leader-card skeleton skeleton-card" aria-hidden="true"></div>`
    : top.length
      ? top.map((player, index) => scoreCard(player, index, gameMode)).join('')
      : `<div class="empty-state">${inter ? 'Les victoires INTER apparaissent à la fin d’une partie.' : 'Les scores apparaissent à la fin d’une partie et restent enregistrés.'}</div>`;
  const install = canInstall ? `<div class="install-badge">${icon('install', 18)}<span>À installer sur ton écran d’accueil</span><button data-action="install">Installer</button></div>` : '';
  const welcome = profile ? `<div class="notice-row">${icon('spark', 16)}<span>Re-bienvenue ${esc(profile.name)} · ${inter ? `${Number(profile.wins || 0)} victoire${Number(profile.wins) === 1 ? '' : 's'} INTER` : `${Number(profile.totalScore || 0)} points cumulés`}</span></div>` : '';
  const resume = savedRoom ? `<button class="btn btn-secondary" data-action="resume">${icon('crown', 16)}Reprendre ${esc(savedRoom.code)}${savedRoom.host ? ' · tu es l’hôte' : ''}</button>` : '';
  const resumeInter = savedInter ? `<button class="btn btn-secondary" data-action="ix-resume">${icon('spark', 16)}Reprendre INTER ${esc(savedInter.code)}${savedInter.host ? ' · tu es l’hôte' : ''}</button>` : '';
  const picker = `<div class="game-picker" role="radiogroup" aria-label="Choisir un jeu"><button type="button" class="game-card ${inter ? '' : 'is-selected'}" data-action="pick-game" data-game="petitbac" aria-pressed="${!inter}"><span class="game-card-kicker">Lettres</span><strong>Petit Bac</strong><span>Une lettre, dix catégories</span></button><button type="button" class="game-card ${inter ? 'is-selected' : ''}" data-action="pick-game" data-game="inter" aria-pressed="${inter}"><span class="game-card-art" aria-hidden="true"><span class="mini-card red">♥</span><span class="mini-card">♠</span><span class="mini-card red">♦</span></span><span class="game-card-kicker">Jeu de cartes</span><strong>INTER</strong><span>Couleur, valeur, cartes spéciales</span></button></div>`;
  const actions = inter
    ? `<button class="btn btn-primary" data-action="ix-setup">${icon('plus')}Créer une partie</button><button class="btn btn-secondary" data-action="ix-join">${icon('users')}Rejoindre une salle<span style="margin-left:auto;color:var(--muted2)">${icon('arrow',16)}</span></button>${resumeInter}`
    : `<button class="btn btn-primary" data-action="create">${icon('plus')}Créer une partie</button><button class="btn btn-secondary" data-action="join">${icon('users')}Rejoindre une salle<span style="margin-left:auto;color:var(--muted2)">${icon('arrow',16)}</span></button>${resume}`;
  const scoreNote = scoresState === 'error' ? `<p class="form-note">Le classement en ligne n’a pas répondu. Les scores déjà vus sur cet appareil restent affichés.</p>` : '';
  const content = `<div class="hero"><div class="eyebrow">Poséidon - Del'Hiver</div><h1 class="display">Fais chauffer<br><span class="gradient-text">tes neurones.</span></h1><p class="intro">${inter ? 'INTER, le jeu de cartes.<br>Même enseigne, même valeur, effets cumulés.' : 'Le Petit Bac entre amis, en direct.<br>Une lettre. Dix catégories. Zéro temps mort.'}</p>${inter ? '' : '<div class="hero-art" aria-hidden="true"><span class="hero-orbit"></span><span class="hero-letter">A</span></div>'}${picker}<div class="home-actions">${actions}</div>${install}${welcome}<div class="notice-row"><span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'Connecté à l’arène' : 'Hors ligne · accueil et règles disponibles'}</span></div></div><section aria-labelledby="top-title"><div class="section-heading"><h2 class="section-title" id="top-title">${inter ? 'Les légendes d’INTER' : 'Les légendes de l’arène'}</h2><button class="section-link" data-action="rankings">Tout voir ${icon('arrow',14)}</button></div>${scoreNote}<div class="leader-track" aria-label="Top 10 des joueurs">${cards}</div></section>`;
  return shell(content, { active: 'home' });
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
