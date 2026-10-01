let context;

function audio() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume();
  return context;
}

function blip(frequency, duration, type = 'sine', gain = 0.05, delay = 0) {
  const node = audio();
  const start = node.currentTime + delay;
  const oscillator = node.createOscillator();
  const volume = node.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume);
  volume.connect(node.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

let bed = null;

export function musicWanted() {
  try { return localStorage.getItem('petitbac.music') !== '0'; }
  catch { return true; }
}

function tone(node, destination, frequency, type, level) {
  const oscillator = node.createOscillator();
  const amp = node.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  amp.gain.value = level;
  oscillator.connect(amp);
  amp.connect(destination);
  oscillator.start();
  return oscillator;
}

function startBed() {
  if (bed) return;
  const node = audio();
  const master = node.createGain();
  const filter = node.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 880;
  filter.Q.value = 0.4;
  master.gain.setValueAtTime(0.0001, node.currentTime);
  master.gain.exponentialRampToValueAtTime(0.028, node.currentTime + 1.8);
  filter.connect(master);
  master.connect(node.destination);
  const oscs = [
    tone(node, filter, 220, 'sine', 0.45),
    tone(node, filter, 220.35, 'sine', 0.28),
    tone(node, filter, 329.63, 'triangle', 0.12),
    tone(node, filter, 440, 'sine', 0.06)
  ];
  bed = { oscs, master };
}

function stopBed() {
  if (!bed) return;
  const current = bed;
  bed = null;
  const node = audio();
  const now = node.currentTime;
  current.master.gain.cancelScheduledValues(now);
  current.master.gain.setValueAtTime(Math.max(current.master.gain.value, 0.0001), now);
  current.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  setTimeout(() => {
    current.oscs.forEach(oscillator => { try { oscillator.stop(); } catch { /* déjà arrêté */ } });
    try { current.master.disconnect(); } catch { /* déjà retiré */ }
  }, 760);
}

export function setMusic(on) {
  try { localStorage.setItem('petitbac.music', on ? '1' : '0'); } catch { /* stockage indisponible */ }
  document.documentElement.dataset.music = on ? 'on' : 'off';
  if (on) startBed();
  else stopBed();
}

export function armMusic() {
  const on = musicWanted();
  document.documentElement.dataset.music = on ? 'on' : 'off';
  if (!on) return;
  const start = () => {
    startBed();
    window.removeEventListener('pointerdown', start);
  };
  window.addEventListener('pointerdown', start);
}

export function playCue(kind, enabled) {
  if (!enabled) return;
  try {
    if (kind === 'play') blip(540, 0.08, 'triangle', 0.04);
    else if (kind === 'draw') blip(320, 0.1, 'sine', 0.04);
    else if (kind === 'penalty') { blip(210, 0.12, 'sawtooth', 0.03); blip(160, 0.16, 'sawtooth', 0.03, 0.1); }
    else if (kind === 'joker') { blip(620, 0.08, 'triangle', 0.04); blip(860, 0.12, 'triangle', 0.04, 0.08); }
    else if (kind === 'turn') blip(470, 0.05, 'sine', 0.025);
    else if (kind === 'win') { blip(523, 0.1, 'triangle', 0.04); blip(659, 0.1, 'triangle', 0.04, 0.1); blip(784, 0.18, 'triangle', 0.05, 0.2); }
  } catch { /* le son reste optionnel */ }
}
