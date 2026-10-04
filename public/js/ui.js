const ICONS = {
  spark: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
  back: '<path d="m15 18-6-6 6-6"/><path d="M9 12h12"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/>',
  trophy: '<path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/>',
  rules: '<path d="M5 4h14v17H5z"/><path d="M8 8h8M8 12h8m-8 4h5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7.9a4 4 0 0 1 0 7.8M20 21v-2a4 4 0 0 0-3-3.87"/>',
  plus: '<path d="M12 5v14m-7-7h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  crown: '<path d="m2 8 5 4 5-8 5 8 5-4-2 12H4L2 8Z"/><path d="M4 17h16"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  install: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  wifi: '<path d="M5 12.5a11 11 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19h.01"/>',
  wifiOff: '<path d="m3 3 18 18M5 12.5a11 11 0 0 1 12-1.6M8.5 16a5.5 5.5 0 0 1 5-.9M12 19h.01"/>',
  user: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.5 3.6 8.5s-1.2 5.9-3.6 8.5c-2.4-2.6-3.6-5.5-3.6-8.5s1.2-5.9 3.6-8.5Z"/>',
  city: '<path d="M4 20V9.5L9 7v13M10 20V5l6 2.5V20M3 20h18M12.2 9h.01M12.2 12.5h.01M12.2 16h.01"/>',
  paw: '<circle cx="7.2" cy="9" r="1.35"/><circle cx="10.6" cy="6.6" r="1.35"/><circle cx="14.4" cy="7.4" r="1.35"/><circle cx="16.8" cy="10.6" r="1.25"/><path d="M8.4 13.8c.7-1.5 2-2.3 3.6-2.3s2.9.8 3.6 2.3c.7 1.4.1 3.1-1.7 3.8-.9.4-1.9.2-1.9.2s-1 .2-1.9-.2c-1.8-.7-2.4-2.4-1.7-3.8Z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18"/>',
  leaf: '<path d="M5 19c7.5 0 14-7 14-14-7 0-14 6.5-14 14Z"/><path d="M8.5 15.5c2-2 4.5-4.5 7.5-6.5"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m12 12-8-4.5M12 12l8-4.5M12 12v9"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.2a2.2 2.2 0 0 0 0-4.4H12a1.8 1.8 0 0 1 0-3.6 8.5 8.5 0 0 0 0-9Z"/><circle cx="8" cy="10" r=".7" fill="currentColor" stroke="none"/><circle cx="9.2" cy="7.2" r=".7" fill="currentColor" stroke="none"/><circle cx="12.4" cy="6.6" r=".7" fill="currentColor" stroke="none"/>',
  tag: '<path d="M20 13.2 12.8 20a1.8 1.8 0 0 1-2.5 0L4 13.7V4h9.7l6.3 6.3a1.8 1.8 0 0 1 0 2.5Z"/><circle cx="8.2" cy="8.2" r="1.1"/>',
  sport: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5C9.8 18.1 8.7 15.2 8.7 12S9.8 5.9 12 3.5ZM3.8 9.2h16.4M3.8 14.8h16.4"/>',
  scale: '<path d="M12 4v15M8 20h8M12 7l6.5 3.2L16 16.2a3.1 3.1 0 0 1-5.9 0L12 10.2M12 7 5.5 10.2 8 16.2a3.1 3.1 0 0 0 5.9 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
  moon: '<path d="M20 14.6A7.6 7.6 0 0 1 9.4 4 6.2 6.2 0 1 0 20 14.6Z"/>',
  music: '<path d="M9 18V5.5L20 3v12.2"/><circle cx="6.2" cy="18" r="2.6"/><circle cx="17.2" cy="15.2" r="2.6"/>',
  musicOff: '<path d="m3 3 18 18M9 18V9.5M9 5.5 16.2 4M16.2 8.2V4"/><circle cx="6.2" cy="18" r="2.6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  play: '<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>'
};

export function icon(name, size = 20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`; }
export function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
export function shell(content, options = {}) {
  const deck = options.chrome === 'deck';
  const homeLabel = deck ? 'Hub' : 'Accueil';
  const nav = options.nav === false ? '' : `<nav class="bottom-nav" aria-label="Navigation principale"><button class="nav-item ${options.active === 'home' ? 'active' : ''}" data-action="home">${icon(deck ? 'spark' : 'home')}<span>${homeLabel}</span></button><button class="nav-item ${options.active === 'rank' ? 'active' : ''}" data-action="rankings">${icon('trophy')}<span>Scores</span></button><button class="nav-item" data-action="rules">${icon('rules')}<span>Règles</span></button></nav>`;
  const enter = options.enter === false ? '' : 'view-enter';
  const theme = `<button type="button" class="icon-btn theme-toggle" data-action="theme" aria-label="Changer le thème"><span class="theme-icon theme-icon-sun">${icon('sun', 18)}</span><span class="theme-icon theme-icon-moon">${icon('moon', 18)}</span></button>`;
  const music = `<button type="button" class="icon-btn music-toggle" data-action="music" aria-label="Musique de fond"><span class="music-icon music-icon-on">${icon('music', 18)}</span><span class="music-icon music-icon-off">${icon('musicOff', 18)}</span></button>`;
  const header = deck
    ? `<header class="nx-top"><div class="nx-top-row"><a class="nx-id" href="/" data-action="home" aria-label="Poséidon - Del'Hiver, accueil"><span class="nx-avatar">P<i></i></span><span class="nx-lvl">Arène</span><span class="nx-title">Poséidon</span></a><div class="top-tools">${music}${theme}</div></div><label class="nx-search">${icon('search', 18)}<input data-hub-search type="search" placeholder="Petit Bac, INTER, Poséidon…" value="${esc(options.query || '')}" aria-label="Chercher un jeu"></label></header>`
    : `<header class="topbar"><a class="brand" href="/" data-action="home" aria-label="Poséidon - Del'Hiver, accueil"><span class="brand-mark">P</span><span class="brand-name">Poséidon<span class="brand-tag">Del'Hiver</span></span></a><div class="top-tools">${music}${theme}${options.right || ''}</div></header>`;
  return `<div class="app-shell ${options.wide ? 'wide' : ''} ${deck ? 'is-deck' : ''}">${header}<main id="main" class="${enter}">${content}</main>${nav}</div><div class="toast" role="status" aria-live="polite"></div>`;
}
export function pageHead(title, subtitle, back = true, extra = '') { return `<div class="page-head${extra ? ` ${extra}` : ''}">${back ? `<button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button>` : ''}<div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>`; }
export function button(label, action, style = 'primary', extra = '') { return `<button class="btn btn-${style} ${extra}" data-action="${action}">${label}</button>`; }
export function haptic(pattern = 12) { if ('vibrate' in navigator && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(pattern); }
export function toast(message) { const node = document.querySelector('.toast'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(window.__arenaToast); window.__arenaToast = setTimeout(() => node.classList.remove('show'), 2400); }
export function navIcon(name) { return icon(name, 19); }
export function scoreCard(player, index, mode = 'petitbac') {
  const place = String(index + 1).padStart(2, '0');
  const inter = mode === 'inter';
  const score = inter ? Number(player.wins || 0) : Number(player.totalScore || 0);
  const unit = inter ? (score > 1 ? 'victoires' : 'victoire') : 'pts';
  const meta = inter
    ? `${Number(player.games || 0)} partie${Number(player.games) > 1 ? 's' : ''} · ${Number(player.penalties || 0)} cartes ramassées`
    : `${Number(player.wins || 0)} victoire${player.wins === 1 ? '' : 's'} · ${Number(player.games || 0)} parties`;
  return `<article class="leader-card"><span class="leader-badge">${place}</span><span class="leader-copy"><b class="leader-name">${esc(player.name)}</b><span class="leader-meta">${meta}</span></span><span class="leader-score">${score} ${unit}</span></article>`;
}
export function showSheet(title, inner, onClose) {
  const backdrop = document.createElement('div');
  const returnFocus = document.activeElement;
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<section class="bottom-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-handle"></div><button class="sheet-close" aria-label="Fermer">${icon('close')}</button><h2 class="sheet-title">${esc(title)}</h2>${inner}</section>`;
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    document.removeEventListener('keydown', onKeydown);
    onClose?.();
    returnFocus?.focus?.({ preventScroll: true });
  };
  const close = () => {
    if (backdrop.classList.contains('is-closing')) return;
    backdrop.classList.add('is-closing');
    const sheet = backdrop.querySelector('.bottom-sheet');
    const timer = setTimeout(finish, 520);
    sheet?.addEventListener('animationend', () => { clearTimeout(timer); finish(); }, { once: true });
  };
  const onKeydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...backdrop.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  backdrop.addEventListener('click', event => { if (event.target === backdrop || event.target.closest('.sheet-close')) close(); });
  document.addEventListener('keydown', onKeydown);
  document.body.append(backdrop);
  backdrop.querySelector('input,button')?.focus({ preventScroll: true });
  return { element: backdrop, close };
}
