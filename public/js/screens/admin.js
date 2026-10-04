import { esc, icon, scoreCard, shell } from '../ui.js';

const GAMES = [
  ['petitbac', 'Petit Bac'],
  ['inter', 'INTER'],
  ['quiz', 'Quiz']
];
const VIEWS = [
  ['people', 'Personnes'],
  ['ips', 'Adresses'],
  ...GAMES
];
const FILTERS = [
  ['players', 'Joueurs'],
  ['all', 'Tous'],
  ['live', 'Actifs'],
  ['blocked', 'Bloqués']
];
const LIVE_MS = 15 * 60 * 1000;
const PAGE_SIZE = 6;

const COUNTRIES = { CD: 'RD Congo', CG: 'Congo', FR: 'France', BE: 'Belgique', CI: 'Côte d’Ivoire', CM: 'Cameroun', SN: 'Sénégal', ML: 'Mali', BF: 'Burkina Faso', GN: 'Guinée', GA: 'Gabon', US: 'États-Unis', CA: 'Canada', GB: 'Royaume-Uni', DE: 'Allemagne', CH: 'Suisse', MA: 'Maroc', TN: 'Tunisie', DZ: 'Algérie', ZA: 'Afrique du Sud', AO: 'Angola', KE: 'Kenya', NG: 'Nigeria', GH: 'Ghana', RW: 'Rwanda', UG: 'Ouganda', TZ: 'Tanzanie', BR: 'Brésil', CN: 'Chine', IN: 'Inde', ES: 'Espagne', IT: 'Italie', PT: 'Portugal', NL: 'Pays-Bas', FI: 'Finlande' };

function when(value) {
  const time = Number(value || 0);
  if (!time) return '—';
  return new Intl.DateTimeFormat('fr', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
}

function ago(value, now = Date.now()) {
  const time = Number(value || 0);
  if (!time) return 'jamais vu';
  const minutes = Math.round((now - time) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `il y a ${days} j`;
  return when(time);
}

function countLabel(total, one, many) {
  return `${total} ${total > 1 ? many : one}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function norm(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function countryName(code) {
  const text = String(code || '').trim();
  return COUNTRIES[text] || text;
}

function place(device) {
  const country = countryName(device.country);
  return [device.city, device.region, country].filter(Boolean).join(' · ');
}

function deviceTitle(device) {
  const model = device.model && device.model !== device.brand ? device.model : '';
  const brand = device.brand && device.os && device.os.toLowerCase().startsWith(String(device.brand).toLowerCase()) ? '' : device.brand;
  return [brand, model].filter(Boolean).join(' · ') || 'Appareil';
}

function deviceSystem(device) {
  return [device.os, device.kind].filter(Boolean).join(' · ');
}

function phone(device) {
  return [deviceTitle(device), device.os].filter(Boolean).join(' · ');
}

export function groupDevices(devices, mode = 'people') {
  const list = Array.isArray(devices) ? devices : [];
  if (mode === 'ips') {
    const buckets = new Map();
    for (const device of list) {
      const key = device.ip || '';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(device);
    }
    return [...buckets.values()].map(members => ({
      id: `ip:${members[0].ip || 'none'}`,
      devices: members
    }));
  }
  const parent = list.map((_, index) => index);
  const find = index => {
    let cursor = index;
    while (parent[cursor] !== cursor) cursor = parent[cursor];
    parent[index] = cursor;
    return cursor;
  };
  const unite = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[a] = b;
  };
  const seen = new Map();
  list.forEach((device, index) => {
    const tokens = [
      ...(device.names || []).map(name => `n:${norm(name)}`),
      ...(device.playerIds || []).map(id => `p:${norm(id)}`)
    ].filter(token => token.length > 2);
    for (const token of tokens) {
      if (seen.has(token)) unite(index, seen.get(token));
      else seen.set(token, index);
    }
  });
  const buckets = new Map();
  list.forEach((device, index) => {
    const named = (device.names || []).some(Boolean) || (device.playerIds || []).some(Boolean);
    const key = named ? `who:${find(index)}` : `solo:${device.id || index}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(device);
  });
  return [...buckets.values()].map(members => ({
    id: members.map(device => device.id).sort().join('|'),
    devices: members
  }));
}

function describe(group, now) {
  const devices = [...group.devices].sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));
  const names = unique(devices.flatMap(device => device.names || []));
  const ips = unique(devices.map(device => device.ip));
  const games = unique(devices.flatMap(device => [device.game, ...(device.visits || []).map(visit => visit.game)]));
  const places = unique(devices.map(place));
  const systems = unique(devices.map(device => [deviceTitle(device), deviceSystem(device)].filter(Boolean).join(' · ')));
  const last = Math.max(0, ...devices.map(device => Number(device.lastSeen) || 0));
  const firsts = devices.map(device => Number(device.firstSeen) || 0).filter(Boolean);
  const hits = devices.reduce((sum, device) => sum + Number(device.hits || 0), 0);
  const titleNames = [...names].sort((a, b) => b.length - a.length);
  return {
    ...group,
    devices,
    names,
    ips,
    games,
    places,
    systems,
    last,
    first: firsts.length ? Math.min(...firsts) : 0,
    hits,
    titleName: titleNames[0] || '',
    aliases: titleNames.slice(1),
    named: names.length > 0,
    live: Boolean(last) && now - last < LIVE_MS,
    blocked: devices.some(device => device.blocked),
    ipBlocked: devices.some(device => device.ipBlocked)
  };
}

export function selectGroups(devices, { mode = 'people', filter = 'players', query = '', now = Date.now() } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  return groupDevices(devices, mode)
    .map(group => describe(group, now))
    .filter(group => {
      if (filter === 'players' && !group.named) return false;
      if (filter === 'live' && !group.live) return false;
      if (filter === 'blocked' && !group.blocked && !group.ipBlocked) return false;
      if (!needle) return true;
      const haystack = [
        group.names.join(' '),
        group.ips.join(' '),
        group.places.join(' '),
        group.games.join(' '),
        group.systems.join(' '),
        group.devices.map(device => device.os).join(' ')
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    })
    .sort((a, b) => b.last - a.last);
}

export function bannedScreen() {
  const content = `<section class="adm adm-block"><p class="qz-kicker">Accès fermé</p><h1>Cet appareil est bloqué</h1><p>Tu ne peux plus ouvrir Petit Bac, INTER ni Quiz Battle depuis ce téléphone. Si c’est une erreur, demande le déblocage.</p></section>`;
  return shell(content, { nav: false });
}

export function adminScreen({ unlocked = false, devices = [], boards = {}, tab = 'people', filter = 'players', query = '', notice = '', openKey = '', openId = '', shown = PAGE_SIZE } = {}) {
  if (!unlocked) {
    const content = `<section class="adm"><div class="page-head"><div><div class="eyebrow">Poséidon</div><h1>Administration</h1><p>Écris la clé dans le champ, puis ouvre la salle. Les joueurs n’ont pas cet écran.</p></div></div><form id="admin-key" class="qz-form"><label class="field"><span class="field-label">Clé d’administration</span><input class="text-input" name="key" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required></label><div class="error-note" data-form-error role="status">${esc(notice)}</div><button class="btn btn-primary btn-full" type="submit">Ouvrir ${icon('arrow', 17)}</button></form></section>`;
    return shell(content, { nav: false, wide: true });
  }
  const now = Date.now();
  const people = selectGroups(devices, { mode: 'people', filter: 'all', now });
  const addresses = selectGroups(devices, { mode: 'ips', filter: 'all', now });
  const named = people.filter(group => group.named).length;
  const live = people.filter(group => group.live).length;
  const blocked = devices.filter(device => device.blocked || device.ipBlocked).length;
  const stats = `<div class="adm-stats"><article><b>${named}</b><span>Personnes</span></article><article><b>${addresses.length}</b><span>Adresses</span></article><article><b>${devices.length}</b><span>Téléphones</span></article><article><b>${live}</b><span>Actifs · 15 min</span></article></div>`;
  const tabs = `<div class="adm-tabs" role="tablist">${VIEWS.map(([id, label]) => `<button type="button" class="adm-chip" data-action="adm-tab" data-tab="${id}" aria-pressed="${tab === id}">${label}</button>`).join('')}</div>`;
  const board = GAMES.some(([id]) => id === tab);
  const tools = board ? '' : `<div class="adm-tools"><form id="admin-search" class="qz-form"><label class="field"><span class="field-label">Chercher</span><input class="text-input" name="q" value="${esc(query)}" placeholder="Nom, ville, système, adresse…"></label></form><div class="adm-filters" role="group" aria-label="Filtrer la liste">${FILTERS.map(([id, label]) => `<button type="button" class="adm-chip" data-action="adm-filter" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div></div>`;
  const body = board ? boardList(boards[tab] || [], tab) : groupList(selectGroups(devices, { mode: tab, filter, query, now }), { tab, filter, openKey, openId, shown, now });
  const blockedNote = blocked ? `<p class="adm-count">${countLabel(blocked, 'téléphone ou adresse est fermé', 'téléphones ou adresses sont fermés')}.</p>` : '';
  const content = `<section class="adm"><div class="page-head"><button class="back-btn" data-action="adm-home" aria-label="Retour">${icon('back')}</button><div><div class="eyebrow">Administration</div><h1>La salle</h1><p>Personnes et adresses regroupées. La ville vient de la connexion, pas du GPS.</p></div></div>${notice ? `<p class="notice">${esc(notice)}</p>` : ''}${stats}${blockedNote}${tabs}${tools}${body}</section>`;
  return shell(content, { nav: false, wide: true });
}

function groupList(groups, { tab, filter, openKey, openId, shown, now }) {
  if (!groups.length) {
    const empty = filter === 'players'
      ? 'Aucun joueur nommé. Le filtre Tous montre aussi les visites sans pseudo.'
      : filter === 'live'
        ? 'Personne n’a ouvert l’arène dans les 15 dernières minutes.'
        : filter === 'blocked'
          ? 'Aucun téléphone ni adresse n’est bloqué.'
          : 'Les téléphones apparaissent dès qu’ils ouvrent l’arène.';
    return `<div class="empty-state">${empty}</div>`;
  }
  const visible = groups.slice(0, Math.max(PAGE_SIZE, Number(shown) || PAGE_SIZE));
  const rest = groups.length - visible.length;
  const unit = tab === 'ips' ? ['adresse', 'adresses'] : ['personne', 'personnes'];
  const scope = filter === 'players' ? 'joueurs nommés' : filter === 'live' ? 'vus depuis 15 min' : filter === 'blocked' ? 'accès fermés' : 'visites';
  const more = rest > 0 ? `<button type="button" class="btn btn-secondary adm-more" data-action="adm-more">Voir les ${Math.min(PAGE_SIZE, rest)} suivants</button>` : '';
  return `<p class="adm-count">${visible.length} ${visible.length > 1 ? unit[1] : unit[0]} sur ${groups.length} · ${scope}</p><div class="adm-groups">${visible.map(group => groupCard(group, { tab, open: openKey === group.id, openId, now })).join('')}</div>${more}`;
}

function groupCard(group, { tab, open, openId, now }) {
  const ipView = tab === 'ips';
  const title = ipView ? (group.ips[0] || 'Adresse inconnue') : (group.titleName || 'Visite sans pseudo');
  const mark = ipView ? '#' : (title.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').charAt(0) || '?').toUpperCase();
  const detail = ipView
    ? [group.places[0] || 'Lieu non transmis', countLabel(group.devices.length, 'téléphone', 'téléphones'), group.named ? countLabel(group.names.length, 'joueur', 'joueurs') : 'sans pseudo'].join(' · ')
    : [countLabel(group.devices.length, 'téléphone', 'téléphones'), countLabel(group.ips.length || 0, 'adresse', 'adresses'), group.systems[0] || group.places[0] || 'Appareil'].join(' · ');
  const played = group.games.filter(game => game !== 'Hall');
  const pills = [
    group.blocked || group.ipBlocked ? '<i class="is-stop">Bloqué</i>' : '',
    group.live ? '<i class="is-live">Actif</i>' : '',
    ...(played.length ? played : group.games).slice(0, 3).map(game => `<i>${esc(game)}</i>`)
  ].filter(Boolean).join('');
  const body = open ? groupBody(group, { ipView, openId, now }) : '';
  return `<article class="adm-group ${open ? 'is-open' : ''} ${group.blocked || group.ipBlocked ? 'is-blocked' : ''}"><button type="button" class="adm-group-toggle" data-action="adm-open" data-id="${esc(group.id)}" aria-expanded="${open}"><span class="adm-mark" aria-hidden="true">${esc(mark)}</span><span class="adm-group-copy"><b>${esc(title)}</b><span>${esc(detail)}</span></span><span class="adm-side"><span class="adm-pills">${pills}</span><time>${esc(ago(group.last, now))}</time></span></button>${body}</article>`;
}

function groupBody(group, { ipView, openId, now }) {
  const aliases = group.aliases.length ? `<p>Autres pseudos : ${esc(group.aliases.join(', '))}</p>` : '';
  const shared = !ipView && group.devices.length > 1 && group.ips.length === 1
    ? `<p>Ces téléphones partagent l’adresse ${esc(group.ips[0])}.</p>`
    : '';
  const summary = `<p>Première visite ${esc(when(group.first))} · dernière ${esc(when(group.last))} · ${countLabel(group.hits, 'passage retenu', 'passages retenus')}</p>`;
  const placeLine = group.places.length ? `<p>${esc(group.places.join(' · '))}</p>` : '';
  const phones = group.devices.map(device => phoneCard(device, { open: openId === device.id, now, shareIp: !ipView && group.ips.length === 1 })).join('');
  const foot = ipView || group.ips.length === 1 ? addressFoot(group) : '';
  return `<div class="adm-group-body">${summary}${placeLine}${aliases}${shared}<div class="adm-phones">${phones}</div>${foot}</div>`;
}

function phoneCard(device, { open, now, shareIp }) {
  const state = device.blocked ? 'Téléphone bloqué' : device.ipBlocked ? 'Adresse bloquée' : '';
  const where = [place(device) || 'Lieu non transmis', shareIp ? '' : device.ip, device.game, ago(device.lastSeen, now)].filter(Boolean).join(' · ');
  const visits = (device.visits || []).slice(0, 6).map(visit => `<li><b>${esc(when(visit.at))}</b><span>${esc(visit.game || 'Jeu')} · ${esc([visit.city, countryName(visit.country)].filter(Boolean).join(' · ') || 'Lieu non transmis')}</span></li>`).join('');
  const hidden = Math.max(0, (device.visits || []).length - 6);
  const detail = open ? `<div class="adm-detail"><p>Identifiants ${esc((device.playerIds || []).join(', ') || '—')}</p><ul>${visits || '<li><span>Aucun passage détaillé.</span></li>'}</ul>${hidden ? `<p class="form-note">${hidden} passage${hidden > 1 ? 's' : ''} plus ancien${hidden > 1 ? 's' : ''} restent en mémoire.</p>` : ''}<label class="field"><span class="field-label">Motif</span><input class="text-input" data-reason maxlength="80" placeholder="Ex. triche, insultes"></label><div class="adm-actions">${device.blocked ? `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-unblock" data-id="${esc(device.id)}">Débloquer le téléphone</button>` : `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-block" data-id="${esc(device.id)}">Bloquer ce téléphone</button>`}${shareIp || !device.ip ? '' : device.ipBlocked ? `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-unblock-ip" data-ip="${esc(device.ip)}">Débloquer l’adresse</button>` : `<button type="button" class="btn btn-secondary btn-sm" data-action="adm-block-ip" data-ip="${esc(device.ip)}">Bloquer cette adresse</button>`}</div></div>` : '';
  return `<article class="adm-phone ${device.blocked || device.ipBlocked ? 'is-blocked' : ''}"><header><div><b>${esc(deviceTitle(device))}</b><span>${esc(deviceSystem(device) || 'Système non reçu')}</span></div>${state ? `<em>${esc(state)}</em>` : ''}</header><p>${esc(where)}</p><button type="button" class="btn btn-secondary btn-sm" data-action="adm-device" data-id="${esc(device.id)}">${open ? 'Fermer' : 'Passages et blocage'}</button>${detail}</article>`;
}

function addressFoot(group) {
  const ip = group.ips[0];
  if (!ip) return '';
  const blocked = group.devices.some(device => device.ipBlocked);
  const action = blocked ? 'adm-unblock-ip' : 'adm-block-ip';
  const label = blocked ? 'Débloquer cette adresse' : 'Bloquer cette adresse';
  return `<div class="adm-group-foot"><label class="field"><span class="field-label">Motif pour l’adresse</span><input class="text-input" data-reason maxlength="80" placeholder="Ex. connexion partagée abusive"></label><button type="button" class="btn btn-secondary btn-sm" data-action="${action}" data-ip="${esc(ip)}">${label}</button><p class="form-note">${countLabel(group.devices.length, 'téléphone utilise', 'téléphones utilisent')} ${esc(ip)}. Fermer l’adresse les ferme tous.</p></div>`;
}

function boardList(rows, mode) {
  if (!rows.length) return `<div class="empty-state">Ce classement est encore vide.</div>`;
  return `<div class="leader-track">${rows.map((player, index) => scoreCard(player, index, mode)).join('')}</div>`;
}
