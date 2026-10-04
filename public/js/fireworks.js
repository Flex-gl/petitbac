const COLORS = ['#d0bcff', '#4cd7f6', '#4edea3', '#a078ff', '#ffffff'];
const MANCHE = [
  { at: 80, count: 42, speed: 4.1, life: 74 },
  { at: 520, count: 26, speed: 3.3, life: 68, side: -0.7 },
  { at: 760, count: 26, speed: 3.3, life: 68, side: 0.7 },
  { at: 1280, count: 34, speed: 3.6, life: 80 }
];
const FINALE = [
  { at: 60, count: 52, speed: 4.6, life: 88 },
  { at: 420, count: 30, speed: 3.5, life: 72, side: -0.74 },
  { at: 640, count: 30, speed: 3.5, life: 72, side: 0.74 },
  { at: 1080, count: 38, speed: 2.2, life: 108, willow: true },
  { at: 1620, count: 34, speed: 4, life: 78, side: -0.38 },
  { at: 1780, count: 34, speed: 4, life: 78, side: 0.38 },
  { at: 2280, count: 58, speed: 5, life: 96 }
];

let active = '';
let canvas = null;
let ctx = null;
let frame = 0;
let particles = [];
let rockets = [];
let started = 0;
let waves = [];
let fired = 0;
let onResize = null;

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function markHero() {
  document.querySelector('.correction-hero')?.classList.add('is-lit');
}

function point(side = 0) {
  const hero = document.querySelector('.correction-category');
  const box = hero?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
  const y = box ? Math.max(72, box.top + box.height * 0.2) : window.innerHeight * 0.24;
  return { x: x + side * window.innerWidth * 0.28, y: y + Math.abs(side) * 28 };
}

function burst(origin, count, speed, life, willow) {
  const palette = willow ? ['#d0bcff', '#efe8ff', '#4cd7f6'] : COLORS;
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.18;
    const velocity = speed * (0.45 + Math.random() * 0.75);
    particles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life,
      age: 0,
      size: (willow ? 2.1 : 2.6) + Math.random() * 2.2,
      color: palette[index % palette.length],
      gravity: willow ? 0.07 : 0.038 + Math.random() * 0.02,
      drag: willow ? 0.992 : 0.985
    });
  }
}

function launch(spec) {
  const origin = point(spec.side || 0);
  rockets.push({
    x: origin.x + (Math.random() - 0.5) * 24,
    y: Math.min(window.innerHeight - 12, origin.y + 180 + Math.random() * 80),
    tx: origin.x,
    ty: origin.y,
    age: 0,
    fly: 16 + Math.random() * 8,
    color: spec.willow ? '#d0bcff' : COLORS[rockets.length % COLORS.length],
    count: spec.count,
    speed: spec.speed,
    life: spec.life,
    willow: Boolean(spec.willow)
  });
}

function fit() {
  if (!canvas || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function stop() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  particles = [];
  rockets = [];
  waves = [];
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
  canvas?.remove();
  canvas = null;
  ctx = null;
}

function tick(now) {
  if (!ctx || !canvas) return;
  const elapsed = now - started;
  while (fired < waves.length && elapsed >= waves[fired].at) {
    launch(waves[fired]);
    fired += 1;
  }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  rockets = rockets.filter(rocket => {
    rocket.age += 1;
    const t = Math.min(1, rocket.age / rocket.fly);
    const x = rocket.x + (rocket.tx - rocket.x) * t;
    const y = rocket.y + (rocket.ty - rocket.y) * t;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = rocket.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rocket.x, rocket.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    rocket.x = x;
    rocket.y = y;
    if (t < 1) return true;
    burst({ x: rocket.tx, y: rocket.ty }, rocket.count, rocket.speed, rocket.life, rocket.willow);
    return false;
  });
  particles = particles.filter(spark => {
    spark.age += 1;
    if (spark.age > spark.life) return false;
    spark.vx *= spark.drag;
    spark.vy = spark.vy * spark.drag + spark.gravity;
    const previousX = spark.x;
    const previousY = spark.y;
    spark.x += spark.vx;
    spark.y += spark.vy;
    const fade = 1 - spark.age / spark.life;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.strokeStyle = spark.color;
    ctx.fillStyle = spark.color;
    ctx.lineWidth = spark.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(previousX, previousY);
    ctx.lineTo(spark.x, spark.y);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, fade * 0.35);
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * 2.2, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
  ctx.globalAlpha = 1;
  if (fired < waves.length || rockets.length || particles.length) frame = requestAnimationFrame(tick);
  else stop();
}

function begin(finale) {
  canvas = document.createElement('canvas');
  canvas.className = 'victory-sky';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  fit();
  onResize = () => fit();
  window.addEventListener('resize', onResize);
  waves = finale ? FINALE : MANCHE;
  fired = 0;
  started = performance.now();
  frame = requestAnimationFrame(tick);
}

export function celebrate(token, { finale = false } = {}) {
  if (!token) return clearCelebration();
  markHero();
  if (token === active) return;
  stop();
  active = token;
  if (reduced()) return;
  begin(finale);
}

export function clearCelebration() {
  active = '';
  stop();
}
