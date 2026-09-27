import { esc, icon, scoreCard, shell } from '../ui.js';

export function homeScreen({ top = [], scoresState = 'loading', online = true, canInstall = false, profile = null, savedRoom = null }) {
  const cards = scoresState === 'loading'
    ? `<div class="leader-card skeleton skeleton-card" aria-label="Chargement du classement"></div><div class="leader-card skeleton skeleton-card" aria-hidden="true"></div>`
    : top.length
      ? top.map(scoreCard).join('')
      : `<div class="empty-state">Les scores apparaissent à la fin d’une partie et restent enregistrés.</div>`;
  const install = canInstall ? `<div class="install-badge">${icon('install', 18)}<span>À installer sur ton écran d’accueil</span><button data-action="install">Installer</button></div>` : '';
  const welcome = profile ? `<div class="notice-row">${icon('spark', 16)}<span>Re-bienvenue ${esc(profile.name)} · ${Number(profile.totalScore || 0)} points cumulés</span></div>` : '';
  const resume = savedRoom ? `<button class="btn btn-secondary" data-action="resume">${icon('crown', 16)}Reprendre ${esc(savedRoom.code)}${savedRoom.host ? ' · tu es l’hôte' : ''}</button>` : '';
  const scoreNote = scoresState === 'error' ? `<p class="form-note">Le classement en ligne n’a pas répondu. Les scores déjà vus sur cet appareil restent affichés.</p>` : '';
  const content = `<div class="hero"><div class="eyebrow">Poséidon - Del'Hiver</div><h1 class="display">Fais chauffer<br><span class="gradient-text">tes neurones.</span></h1><p class="intro">Le Petit Bac entre amis, en direct.<br>Une lettre. Dix catégories. Zéro temps mort.</p><div class="hero-art" aria-hidden="true"><span class="hero-orbit"></span><span class="hero-letter">A</span></div><div class="home-actions"><button class="btn btn-primary" data-action="create">${icon('plus')}Créer une partie</button><button class="btn btn-secondary" data-action="join">${icon('users')}Rejoindre une salle<span style="margin-left:auto;color:var(--muted2)">${icon('arrow',16)}</span></button>${resume}</div>${install}${welcome}<div class="notice-row"><span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'Connecté à l’arène' : 'Hors ligne · accueil et règles disponibles'}</span></div></div><section aria-labelledby="top-title"><div class="section-heading"><h2 class="section-title" id="top-title">Les légendes de l’arène</h2><button class="section-link" data-action="rankings">Tout voir ${icon('arrow',14)}</button></div>${scoreNote}<div class="leader-track" aria-label="Top 10 des joueurs">${cards}</div></section>`;
  return shell(content, { active: 'home' });
}

export function rankingsScreen(top = [], profile = null) {
  const rows = top.length ? top.map((player, index) => `<div class="rank-row"><span class="rank-medal">${index + 1}</span><div><div class="rank-player">${esc(player.name)}</div><div class="rank-stats">${Number(player.wins || 0)} victoire${player.wins === 1 ? '' : 's'} · ${Number(player.games || 0)} parties · record ${Number(player.bestScore || 0)} pts</div></div><span class="rank-points">${Number(player.totalScore || 0)}</span></div>`).join('') : '<div class="empty-state">Aucune partie terminée pour l’instant. Le classement reste enregistré après chaque salon.</div>';
  const own = profile ? `<section class="surface stats-card" aria-label="Tes statistiques"><div><div class="stat-num">${Number(profile.totalScore || 0)}</div><div class="stat-label">Points cumulés</div></div><div><div class="stat-num">${Number(profile.games || 0)}</div><div class="stat-label">Parties jouées</div></div><div><div class="stat-num">${Number(profile.wins || 0)}</div><div class="stat-label">Victoires</div></div></section>` : '';
  return shell(`<div class="page-head"><div><div class="eyebrow">Hall of fame</div><h1>Classement global</h1><p>Les points cumulés de toutes les parties</p></div></div>${own}<div class="rank-list">${rows}</div><p class="footer-note">Poséidon - Del'Hiver</p>`, { active: 'rank' });
}
