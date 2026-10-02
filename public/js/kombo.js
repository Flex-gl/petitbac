import { haptic } from './ui.js';

const SPECS = {
  2: { phrase: 'avant goût', each: 2, tone: 'two', pulse: [14, 24, 14] },
  10: { phrase: 'Oko yoka moto', each: 4, tone: 'ten', pulse: [18, 28, 18, 36] },
  JOKER: { phrase: 'Azanga mawa', each: 5, tone: 'joker', pulse: [22, 36, 22, 36, 48] }
};

let layer = null;
let timer = 0;
let recentRank = '';
let recentAt = 0;
let seenLog = false;
let lastLogAt = 0;

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sparks(tone) {
  const count = tone === 'joker' ? 18 : tone === 'ten' ? 16 : 10;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 120;
    return `<i class="kombo-spark" style="--x:${Math.cos(angle) * distance}px;--y:${Math.sin(angle) * distance}px"></i>`;
  }).join('');
}

export function showKombo(rank, { count = 1, buzz = true } = {}) {
  const spec = SPECS[rank];
  if (!spec || count < 1) return;
  const now = Date.now();
  if (rank === recentRank && now - recentAt < 1400) return;
  recentRank = rank;
  recentAt = now;
  layer?.remove();
  clearTimeout(timer);
  const amount = spec.each * count;
  const node = document.createElement('div');
  node.className = `kombo is-${spec.tone}${reduced() ? ' is-still' : ''}`;
  node.setAttribute('role', 'status');
  node.innerHTML = `${sparks(spec.tone)}<div class="kombo-plate"><p class="kombo-kicker">Ramasse ${amount}</p><p class="kombo-phrase">${spec.phrase}</p></div>`;
  document.body.appendChild(node);
  layer = node;
  document.querySelector('.felt')?.classList.add('is-kombo', `is-kombo-${spec.tone}`);
  if (buzz) haptic(spec.pulse);
  timer = setTimeout(() => {
    node.remove();
    if (layer === node) layer = null;
    document.querySelector('.felt')?.classList.remove('is-kombo', 'is-kombo-two', 'is-kombo-ten', 'is-kombo-joker');
  }, reduced() ? 1200 : 1750);
}

export function watchKombo(game, buzz = false) {
  const entries = game?.log || [];
  const newest = entries.reduce((max, entry) => Math.max(max, entry.at || 0), 0);
  if (!seenLog) {
    seenLog = true;
    if (!newest || Date.now() - newest > 4000) {
      lastLogAt = newest;
      return;
    }
  }
  const fresh = entries.filter(entry => (entry.at || 0) > lastLogAt);
  for (const entry of fresh) lastLogAt = Math.max(lastLogAt, entry.at || 0);
  const play = [...fresh].reverse().find(entry => entry.type === 'PLAYER_PLAYED_CARD' && SPECS[entry.cards?.[0]?.rank]);
  if (play) {
    const rank = play.cards[0].rank;
    showKombo(rank, { count: play.cards.filter(card => card.rank === rank).length, buzz });
    return;
  }
  const penalty = fresh.find(entry => entry.type === 'PLAYER_DREW_CARDS' && entry.reason === 'penalty');
  if (penalty && SPECS[game.center?.rank]) showKombo(game.center.rank, { count: 1, buzz });
}
