import { cardFlightHtml } from './screens/inter.js';

const EASE = 'cubic-bezier(.22,.75,.2,1)';
const live = new Map();

function reduced() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function box(selector) {
  return document.querySelector(selector)?.getBoundingClientRect() || null;
}

function cardSized(rect) {
  if (!rect) return null;
  if (rect.width >= 56 && rect.height >= 80) return rect;
  const width = 74;
  const height = 104;
  return {
    left: rect.left + rect.width / 2 - width / 2,
    top: rect.top + rect.height / 2 - height / 2,
    width,
    height
  };
}

export function captureTable() {
  const cards = new Map();
  document.querySelectorAll('.inter-table [data-card]').forEach(el => {
    cards.set(el.dataset.card, el.getBoundingClientRect());
  });
  const seats = new Map();
  document.querySelectorAll('.seat-chip[data-player]').forEach(el => {
    seats.set(el.dataset.player, el.getBoundingClientRect());
  });
  return {
    cards,
    center: box('[data-role="center"] .playing-card') || box('[data-role="center"]'),
    draw: box('[data-role="draw"] .card-back') || box('[data-role="draw"]'),
    seats
  };
}

function spawn(html, from, to, delay, { arc = -32, fade = false, hold = false, id = '' } = {}) {
  const ghost = document.createElement('div');
  ghost.className = 'card-flight';
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  ghost.innerHTML = html;
  document.body.appendChild(ghost);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  const scale = Math.max(0.82, Math.min(1.08, to.width / Math.max(from.width, 1)));
  const tilt = Math.max(-7, Math.min(7, dx * 0.015));
  const anim = ghost.animate([
    { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', opacity: 1 },
    { transform: `translate3d(${dx * 0.52}px, ${dy * 0.42 + arc}px, 0) rotate(${tilt}deg) scale(${(1 + scale) / 2})`, opacity: 1, offset: 0.58 },
    { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${tilt * 0.25}deg) scale(${scale})`, opacity: fade ? 0 : 1 }
  ], { duration: 540, delay, easing: EASE, fill: 'forwards' });
  const record = { el: ghost, done: false, acknowledged: !hold, finished: null, remove };
  function remove() {
    anim.cancel();
    ghost.remove();
    if (id) live.delete(id);
  }
  record.finished = anim.finished.then(() => {
    record.done = true;
    if (record.acknowledged) {
      ghost.remove();
      if (id) live.delete(id);
    }
  }).catch(() => {});
  if (id) live.set(id, record);
  return record;
}

function slide(el, first) {
  const last = el.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  if (Math.hypot(dx, dy) < 1.5) return;
  const lift = el.classList.contains('is-playable') ? -14 : 0;
  el.animate([
    { transform: `translate3d(${dx}px, ${dy + lift}px, 0)` },
    { transform: `translate3d(0, ${lift}px, 0)` }
  ], { duration: 420, easing: EASE });
}

function fresh(previous, next) {
  const seen = new Set((previous?.log || []).map(entry => `${entry.type}|${entry.at}|${entry.playerId}|${entry.reason || ''}|${(entry.cards || []).map(card => card.id).join('.')}`));
  return (next.log || []).filter(entry => !seen.has(`${entry.type}|${entry.at}|${entry.playerId}|${entry.reason || ''}|${(entry.cards || []).map(card => card.id).join('.')}`));
}

function hand(game, viewerId) {
  return game?.players?.find(player => player.id === viewerId)?.hand || [];
}

function backHtml() {
  return '<div class="card-back" aria-hidden="true"></div>';
}

export function launchOwnPlay(cards) {
  if (reduced() || !cards?.length) return () => {};
  const center = cardSized(box('[data-role="center"] .playing-card') || box('[data-role="center"]'));
  if (!center) return () => {};
  const launched = [];
  cards.forEach((card, index) => {
    const source = document.querySelector(`.hand-fan [data-card="${card.id}"]`);
    if (!source) return;
    const from = source.getBoundingClientRect();
    source.classList.add('is-leaving');
    const top = index === cards.length - 1;
    launched.push(card.id);
    spawn(cardFlightHtml(card), from, center, index * 70, { arc: -42, fade: !top, hold: true, id: card.id });
  });
  return () => {
    launched.forEach(id => live.get(id)?.remove());
    launched.forEach(id => document.querySelector(`.hand-fan [data-card="${id}"]`)?.classList.remove('is-leaving'));
  };
}

function revealCenter(centerEl) {
  if (!centerEl) return;
  centerEl.style.visibility = '';
  centerEl.classList.add('is-landing');
  const felt = document.querySelector('.felt');
  if (!felt) return;
  felt.classList.remove('is-hit');
  void felt.offsetWidth;
  felt.classList.add('is-hit');
}

function settleOwnFlights(centerEl, centerId) {
  if (!live.size) return false;
  let waited = false;
  for (const [id, record] of live) {
    const mine = id === centerId;
    record.acknowledged = true;
    waited = true;
    const finish = () => {
      if (record.done) record.el.remove();
      live.delete(id);
      if (mine) revealCenter(centerEl);
    };
    if (record.done) finish();
    else record.finished.then(finish);
    if (mine && centerEl) centerEl.style.visibility = 'hidden';
  }
  return waited;
}

function deal(game, viewerId) {
  const draw = cardSized(box('[data-role="draw"] .card-back') || box('[data-role="draw"]'));
  const centerEl = document.querySelector('[data-role="center"] .playing-card');
  if (centerEl) {
    centerEl.style.visibility = 'hidden';
    centerEl.classList.add('is-flip');
    setTimeout(() => { centerEl.style.visibility = ''; }, 180);
  }
  if (!draw) return;
  hand(game, viewerId).forEach((card, index) => {
    const el = document.querySelector(`.hand-fan [data-card="${card.id}"]`);
    if (!el) return;
    el.style.visibility = 'hidden';
    const to = el.getBoundingClientRect();
    spawn(cardFlightHtml(card), draw, to, 80 * index, { arc: -16 }).finished.then(() => {
      el.style.visibility = '';
      el.classList.add('is-dealt');
    });
  });
}

export function animateTable(before, previous, next, viewerId) {
  if (!next || next.status !== 'playing' || reduced()) return;
  if (!previous || previous.code !== next.code) return;
  if (previous.status !== 'playing') {
    deal(next, viewerId);
    return;
  }
  const centerEl = document.querySelector('[data-role="center"] .playing-card');
  const centerTo = cardSized(centerEl?.getBoundingClientRect() || box('[data-role="center"]'));
  const drawFrom = cardSized(before?.draw || box('[data-role="draw"] .card-back'));
  const events = fresh(previous, next);
  const playedIds = new Set(events.filter(entry => entry.type === 'PLAYER_PLAYED_CARD').flatMap(entry => (entry.cards || []).map(card => card.id)));
  const incoming = hand(next, viewerId).filter(card => !before?.cards?.has(card.id) && !previous.players?.find(player => player.id === viewerId)?.hand?.some(owned => owned.id === card.id));
  incoming.forEach(card => {
    const el = document.querySelector(`.hand-fan [data-card="${card.id}"]`);
    if (el) el.style.visibility = 'hidden';
  });
  document.querySelectorAll('.hand-fan [data-card]').forEach(el => {
    if (incoming.some(card => card.id === el.dataset.card)) return;
    const first = before?.cards?.get(el.dataset.card);
    if (first) slide(el, first);
  });
  const centerSame = previous.center?.id && previous.center.id === next.center?.id && !playedIds.has(next.center.id);
  if (centerSame && centerEl && before?.cards?.get(next.center.id)) slide(centerEl, before.cards.get(next.center.id));
  const ownsFlight = settleOwnFlights(centerEl, next.center?.id);
  let delay = 0;
  events.forEach(entry => {
    if (entry.type === 'PLAYER_PLAYED_CARD') {
      const cards = entry.cards || [];
      if (cards.some(card => live.has(card.id))) return;
      const fromSeat = cardSized(before?.seats?.get(entry.playerId));
      cards.forEach((card, index) => {
        const from = cardSized(before?.cards?.get(card.id)) || fromSeat;
        if (!from || !centerTo) return;
        const top = card.id === next.center?.id;
        if (top && centerEl) centerEl.style.visibility = 'hidden';
        spawn(cardFlightHtml(card), from, centerTo, delay + index * 75, { arc: entry.playerId === viewerId ? -42 : -26, fade: !top }).finished.then(() => {
          if (top) revealCenter(centerEl);
        });
      });
      delay += 75 * Math.max(cards.length - 1, 0) + 360;
    } else if (entry.type === 'PLAYER_DREW_CARDS') {
      const mine = entry.playerId === viewerId;
      const seat = document.querySelector(`.seat-chip[data-player="${entry.playerId}"]`);
      const target = mine ? null : cardSized(seat?.getBoundingClientRect());
      if (mine) {
        incoming.slice(0, 6).forEach((card, index) => {
          const el = document.querySelector(`.hand-fan [data-card="${card.id}"]`);
          if (!el) return;
          if (!drawFrom) {
            el.style.visibility = '';
            return;
          }
          spawn(cardFlightHtml(card), drawFrom, el.getBoundingClientRect(), delay + index * 85, { arc: -18 }).finished.then(() => {
            el.style.visibility = '';
            el.classList.add('is-dealt');
          });
        });
        incoming.slice(6).forEach(card => {
          const el = document.querySelector(`.hand-fan [data-card="${card.id}"]`);
          if (!el) return;
          el.style.visibility = '';
          el.classList.add('is-dealt');
        });
      } else if (drawFrom && target) {
        const count = Math.min(entry.count || 1, 5);
        for (let index = 0; index < count; index += 1) {
          spawn(backHtml(), drawFrom, target, delay + index * 80, { arc: -20, fade: true });
        }
      }
      delay += 90 * Math.min(entry.count || 1, 5);
    } else if (entry.type === 'PLAYER_SKIPPED') {
      const seat = document.querySelector(`.seat-chip[data-player="${entry.playerId}"]`);
      if (seat) {
        window.setTimeout(() => seat.classList.add('is-passed'), delay);
      }
    }
  });
  if (!events.some(entry => entry.type === 'PLAYER_DREW_CARDS' && entry.playerId === viewerId)) {
    incoming.forEach(card => {
      const el = document.querySelector(`.hand-fan [data-card="${card.id}"]`);
      if (!el) return;
      el.style.visibility = '';
    });
  }
  if (previous.turnPlayerId !== next.turnPlayerId && next.turnPlayerId) {
    document.querySelector(`.seat-chip[data-player="${next.turnPlayerId}"]`)?.classList.add('is-arriving');
  }
}
