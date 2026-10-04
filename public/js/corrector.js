import { CATEGORIES } from './dict.js';

export function categoryInfo(id) { return CATEGORIES.find(category => category.id === id) || { id, label: id, icon: 'tag' }; }

export function playRevealTone(kind = 'reveal') {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const context = window.__arenaAudio || (window.__arenaAudio = new Audio());
    if (context.state === 'suspended') context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'good' ? 740 : kind === 'bad' ? 220 : 520;
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .17);
  } catch { /* Le son est un bonus ; le jeu reste utilisable sans audio. */ }
}

export function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '90', pointerEvents: 'none' });
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const colors = ['#d0bcff', '#4cd7f6', '#4edea3', '#a078ff', '#ffffff'];
  const pieces = Array.from({ length: 105 }, () => ({ x: innerWidth * (.18 + Math.random() * .64), y: -20 - Math.random() * innerHeight * .4, vx: (Math.random() - .5) * 5, vy: 2 + Math.random() * 4, size: 4 + Math.random() * 5, spin: Math.random() * 6, color: colors[Math.floor(Math.random() * colors.length)] }));
  let frame = 0;
  const paint = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const piece of pieces) {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += .035;
      piece.spin += .09;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.spin);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * .7);
      ctx.restore();
    }
    frame += 1;
    if (frame < 130) requestAnimationFrame(paint);
    else canvas.remove();
  };
  requestAnimationFrame(paint);
}
