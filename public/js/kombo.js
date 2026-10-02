import { haptic } from './ui.js';

const SPECS = {
  2: { phrase: 'avant goût', each: 2, tone: 'two', pulse: [14, 24, 14] },
  10: { phrase: 'Oko yoka moto', each: 4, tone: 'ten', pulse: [18, 28, 18, 36] },
  JOKER: { phrase: 'Azanga mawa', each: 5, tone: 'joker', pulse: [22, 36, 22, 36, 48] }
};
const VARIANTS = ['sweep', 'bloom', 'cut', 'rise'];

let layer = null;
let timer = 0;
let recentRank = '';
let recentAt = 0;
let seenLog = false;
let lastLogAt = 0;
const heat = { rank: '', until: 0, chain: 0 };
const lastVariant = { two: '', ten: '', joker: '' };

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sparks(tone, rich) {
  const count = rich ? 6 : tone === 'joker' ? 14 : tone === 'ten' ? 12 : 8;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = (rich ? 90 : 70) + Math.random() * (rich ? 70 : 110);
    return `<i class="kombo-spark" style="--x:${Math.cos(angle) * distance}px;--y:${Math.sin(angle) * distance}px"></i>`;
  }).join('');
}

function rings(power) {
  return Array.from({ length: Math.min(3, power) }, (_, index) => `<span class="kombo-ring" style="--i:${index}"></span>`).join('');
}

function pickVariant(tone) {
  const pool = VARIANTS.filter(name => name !== lastVariant[tone]);
  const choice = pool[Math.floor(Math.random() * pool.length)];
  lastVariant[tone] = choice;
  return choice;
}

function charge(rank, count) {
  const now = Date.now();
  const chained = heat.rank === rank && now < heat.until;
  heat.chain = chained ? heat.chain + 1 : 0;
  heat.rank = rank;
  heat.until = now + 12000;
  return { cards: count, chain: heat.chain, power: Math.min(4, count + heat.chain) };
}

export function showKombo(rank, { count = 1, buzz = true } = {}) {
  const spec = SPECS[rank];
  if (!spec || count < 1) return;
  const now = Date.now();
  if (rank === recentRank && now - recentAt < 1400) return;
  recentRank = rank;
  recentAt = now;
  const { cards, chain, power } = charge(rank, count);
  const rich = cards > 1 || chain > 0;
  const variant = rich ? pickVariant(spec.tone) : '';
  layer?.remove();
  clearTimeout(timer);
  const amount = spec.each * cards;
  const mark = cards > 1 ? `<p class="kombo-mark">×${cards}</p>` : '';
  const encore = chain > 0 ? ' · encore' : '';
  const echo = power >= 3 ? `<p class="kombo-echo" aria-hidden="true">${spec.phrase}</p>` : '';
  const node = document.createElement('div');
  node.className = `kombo is-${spec.tone}${rich ? ` is-rich is-${variant} is-x${power}` : ''}${reduced() ? ' is-still' : ''}`;
  node.style.setProperty('--ox', `${Math.random() < 0.5 ? -28 : 28}px`);
  node.setAttribute('role', 'status');
  node.innerHTML = `${rich ? rings(power) : ''}${sparks(spec.tone, rich)}<div class="kombo-plate">${mark}<p class="kombo-kicker">Ramasse ${amount}${encore}</p><div class="kombo-word">${echo}<p class="kombo-phrase">${spec.phrase}</p></div></div>`;
  document.body.appendChild(node);
  layer = node;
  const felt = document.querySelector('.felt');
  felt?.classList.add('is-kombo', `is-kombo-${spec.tone}`);
  if (rich) felt?.classList.add('is-kombo-rich');
  if (buzz) haptic(rich ? [...spec.pulse, 16, 28].slice(0, 8) : spec.pulse);
  timer = setTimeout(() => {
    node.remove();
    if (layer === node) layer = null;
    document.querySelector('.felt')?.classList.remove('is-kombo', 'is-kombo-two', 'is-kombo-ten', 'is-kombo-joker', 'is-kombo-rich');
  }, reduced() ? 1200 : rich ? 2100 : 1750);
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
