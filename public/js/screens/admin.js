import { esc, icon, scoreCard, shell } from '../ui.js';

const GAMES = [
  ['petitbac', 'Petit Bac'],
  ['inter', 'INTER'],
  ['quiz', 'Quiz']
];

function when(value) {
  const time = Number(value || 0);
  if (!time) return '—';
  return new Intl.DateTimeFormat('fr', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
}

const COUNTRIES = { CD: 'RD Congo', CG: 'Congo', FR: 'France', BE: 'Belgique', CI: 'Côte d’Ivoire', CM: 'Cameroun', SN: 'Sénégal', ML: 'Mali', BF: 'Burkina Faso', GN: 'Guinée', GA: 'Gabon', US: 'États-Unis', CA: 'Canada', GB: 'Royaume-Uni', DE: 'Allemagne', CH: 'Suisse', MA: 'Maroc', TN: 'Tunisie', DZ: 'Algérie', ZA: 'Afrique du Sud', AO: 'Angola', KE: 'Kenya', NG: 'Nigeria', GH: 'Ghana', RW: 'Rwanda', UG: 'Ouganda', TZ: 'Tanzanie', BR: 'Brésil', CN: 'Chine', IN: 'Inde', ES: 'Espagne', IT: 'Italie', PT: 'Portugal', NL: 'Pays-Bas' };

function place(device) {
  const country = COUNTRIES[device.country] || device.country;
  return [device.city, device.region, country].filter(Boolean).join(' · ') || 'Lieu non transmis';
}

function phone(device) {
  const model = device.model && device.model !== device.brand ? device.model : '';
  return [device.brand, model].filter(Boolean).join(' · ') || 'Appareil';
}

export function bannedScreen() {
  const content = `<section class="adm adm-block"><p class="qz-kicker">Accès fermé</p><h1>Cet appareil est bloqué</h1><p>Tu ne peux plus ouvrir Petit Bac, INTER ni Quiz Battle depuis ce téléphone. Si c’est une erreur, demande le déblocage.</p></section>`;
  return shell(content, { nav: false });
}

export function adminScreen({ unlocked = false, devices = [], boards = {}, tab = 'devices', query = '', notice = '', openId = '' } = {}) {
  if (!unlocked) {
    const content = `<section class="adm"><div class="page-head"><div><div class="eyebrow">Poséidon</div><h1>Administration</h1><p>Écris la clé dans le champ, puis ouvre la salle. Les joueurs n’ont pas cet écran.</p></div></div><form id="admin-key" class="qz-form"><label class="field"><span class="field-label">Clé d’administration</span><input class="text-input" name="key" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required></label><div class="error-note" data-form-error role="status">${esc(notice)}</div><button class="btn btn-primary btn-full" type="submit">Ouvrir ${icon('arrow', 17)}</button></form></section>`;
    return shell(content, { nav: false, wide: true });
  }
  const needle = query.trim().toLowerCase();
  const visible = devices.filter(device => {
    if (!needle) return true;
    return [device.names?.join(' '), phone(device), place(device), device.ip, device.game].join(' ').toLowerCase().includes(needle);
  });
  const cities = new Set(devices.map(device => device.city).filter(Boolean));
  const blocked = devices.filter(device => device.blocked || device.ipBlocked).length;
  const stats = `<div class="adm-stats"><article><b>${devices.length}</b><span>Appareils suivis</span></article><article><b>${blocked}</b><span>Bloqués ici</span></article><article><b>${cities.size}</b><span>Villes vues</span></article></div>`;
  const tabs = `<div class="adm-tabs"><button type="button" class="segment" data-action="adm-tab" data-tab="devices" aria-pressed="${tab === 'devices'}">Appareils</button>${GAMES.map(([id, label]) => `<button type="button" class="segment" data-action="adm-tab" data-tab="${id}" aria-pressed="${tab === id}">${label}</button>`).join('')}</div>`;
  const body = tab === 'devices' ? deviceList(visible, openId) : boardList(boards[tab] || [], tab);
  const content = `<section class="adm"><div class="page-head"><button class="back-btn" data-action="adm-home" aria-label="Retour">${icon('back')}</button><div><div class="eyebrow">Administration</div><h1>La salle</h1><p>Connexions, classements, blocages. La ville vient de la connexion, pas du GPS.</p></div></div>${notice ? `<p class="notice">${esc(notice)}</p>` : ''}${stats}${tabs}<form id="admin-search" class="qz-form"><label class="field"><span class="field-label">Chercher</span><input class="text-input" name="q" value="${esc(query)}" placeholder="Nom, ville, marque, adresse…"></label></form>${body}</section>`;
  return shell(content, { nav: false, wide: true });
}

function deviceList(devices, openId) {
  if (!devices.length) return `<div class="empty-state">Les téléphones apparaissent dès qu’ils ouvrent l’arène.</div>`;
  return `<div class="adm-list">${devices.map(device => deviceCard(device, openId === device.id)).join('')}</div>`;
}

function deviceCard(device, open) {
  const names = (device.names || []).join(', ') || 'Sans pseudo';
  const state = device.blocked ? 'Téléphone bloqué' : device.ipBlocked ? 'Adresse bloquée' : 'Autorisé';
  const visits = (device.visits || []).map(visit => `<li><b>${esc(when(visit.at))}</b><span>${esc(visit.game || 'Jeu')} · ${esc([visit.city, visit.country].filter(Boolean).join(' · ') || 'Lieu non transmis')} · ${esc(visit.ip || 'adresse inconnue')}</span></li>`).join('');
  const detail = open ? `<div class="adm-detail"><p>Première visite ${esc(when(device.firstSeen))} · ${Number(device.hits || 0)} passage${Number(device.hits) > 1 ? 's' : ''} retenu${Number(device.hits) > 1 ? 's' : ''}</p><p>Identifiants ${esc((device.playerIds || []).join(', ') || '—')}</p><ul>${visits}</ul><label class="field"><span class="field-label">Motif</span><input class="text-input" data-reason maxlength="80" placeholder="Ex. triche, insultes"></label><div class="adm-actions">${device.blocked ? `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-unblock" data-id="${esc(device.id)}">Débloquer le téléphone</button>` : `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-block" data-id="${esc(device.id)}">Bloquer ce téléphone</button>`}${device.ip ? device.ipBlocked ? `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-unblock-ip" data-ip="${esc(device.ip)}">Débloquer l’adresse</button>` : `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-block-ip" data-ip="${esc(device.ip)}">Bloquer cette adresse IP</button>` : ''}</div><p class="form-note">Bloquer l’adresse ferme aussi les autres téléphones qui partagent la même connexion.</p></div>` : '';
  return `<article class="adm-card ${device.blocked || device.ipBlocked ? 'is-blocked' : ''}"><header><div><b>${esc(names)}</b><span>${esc(phone(device))} · ${esc(device.kind || '')}</span></div><em>${esc(state)}</em></header><p>${esc(place(device))}</p><p class="adm-meta">${esc(device.ip || 'Adresse inconnue')} · ${esc(device.game || 'Jeu')} · ${esc(when(device.lastSeen))}</p><button type="button" class="btn btn-secondary btn-sm" data-action="adm-open" data-id="${esc(device.id)}">${open ? 'Fermer' : 'Voir les passages'}</button>${detail}</article>`;
}

function boardList(rows, mode) {
  if (!rows.length) return `<div class="empty-state">Ce classement est encore vide.</div>`;
  return `<div class="leader-track">${rows.map((player, index) => scoreCard(player, index, mode)).join('')}</div>`;
}
