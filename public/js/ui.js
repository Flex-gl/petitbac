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
  wifiOff: '<path d="m3 3 18 18M5 12.5a11 11 0 0 1 12-1.6M8.5 16a5.5 5.5 0 0 1 5-.9M12 19h.01"/>'
};

export function icon(name, size = 20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`; }
export function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
export function shell(content, options = {}) {
  const nav = options.nav === false ? '' : `<nav class="bottom-nav" aria-label="Navigation principale"><button class="nav-item ${options.active === 'home' ? 'active' : ''}" data-action="home">${icon('home')}<span>Accueil</span></button><button class="nav-item ${options.active === 'rank' ? 'active' : ''}" data-action="rankings">${icon('trophy')}<span>Scores</span></button><button class="nav-item" data-action="rules">${icon('rules')}<span>Règles</span></button></nav>`;
  return `<div class="app-shell ${options.wide ? 'wide' : ''}"><header class="topbar"><a class="brand" href="/" data-action="home" aria-label="Petit Bac Arena, accueil"><span class="brand-mark">B</span><span class="brand-name">PETIT BAC<span class="brand-tag">ARENA</span></span></a>${options.right || ''}</header><main id="main" class="view-enter">${content}</main>${nav}</div><div class="toast" role="status" aria-live="polite"></div>`;
}
export function pageHead(title, subtitle, back = true) { return `<div class="page-head">${back ? `<button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button>` : ''}<div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>`; }
export function button(label, action, style = 'primary', extra = '') { return `<button class="btn btn-${style} ${extra}" data-action="${action}">${label}</button>`; }
export function haptic(pattern = 12) { if ('vibrate' in navigator && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(pattern); }
export function toast(message) { const node = document.querySelector('.toast'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(window.__arenaToast); window.__arenaToast = setTimeout(() => node.classList.remove('show'), 2400); }
export function navIcon(name) { return icon(name, 19); }
export function scoreCard(player, index) {
  const medals = ['01', '02', '03'];
  return `<article class="leader-card"><span class="leader-rank">${medals[index] || `#${index + 1}`}</span><span class="leader-score">${Number(player.totalScore || 0)} pts</span><b class="leader-name">${esc(player.name)}</b><span class="leader-meta">${Number(player.wins || 0)} victoire${player.wins === 1 ? '' : 's'} · ${Number(player.games || 0)} parties</span><span class="leader-crown">♛</span></article>`;
}
export function showSheet(title, inner, onClose) {
  const backdrop = document.createElement('div');
  const returnFocus = document.activeElement;
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<section class="bottom-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-handle"></div><button class="sheet-close" aria-label="Fermer">${icon('close')}</button><h2 class="sheet-title">${esc(title)}</h2>${inner}</section>`;
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKeydown); onClose?.(); returnFocus?.focus?.({ preventScroll: true }); };
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
