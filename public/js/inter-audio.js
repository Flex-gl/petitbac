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
let playing = false;

export function musicWanted() {
  try { return localStorage.getItem('petitbac.music') !== '0'; }
  catch { return true; }
}

export function isMusicPlaying() {
  return playing;
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

async function startBed() {
  if (bed || playing) return;
  playing = true;
  try {
    const node = audio();
    if (node.state !== 'running') await node.resume();
    if (!musicWanted()) { playing = false; return; }
    if (bed) return;
    const master = node.createGain();
    const filter = node.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    master.gain.setValueAtTime(0.0001, node.currentTime);
    master.gain.exponentialRampToValueAtTime(0.06, node.currentTime + 0.6);
    filter.connect(master);
    master.connect(node.destination);
    const oscs = [
      tone(node, filter, 220, 'sine', 0.5),
      tone(node, filter, 277.18, 'sine', 0.22),
      tone(node, filter, 329.63, 'triangle', 0.16)
    ];
    bed = { oscs, master };
    document.documentElement.dataset.audio = node.state;
  } catch {
    playing = false;
  }
}

function stopBed() {
  playing = false;
  document.documentElement.dataset.audio = 'off';
  if (!bed) return;
  const current = bed;
  bed = null;
  const node = audio();
  const now = node.currentTime;
  current.master.gain.cancelScheduledValues(now);
  const level = Math.max(current.master.gain.value, 0.0001);
  current.master.gain.setValueAtTime(level, now);
  current.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  setTimeout(() => {
    current.oscs.forEach(oscillator => { try { oscillator.stop(); } catch { /* déjà arrêté */ } });
    try { current.master.disconnect(); } catch { /* déjà retiré */ }
  }, 520);
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
  const start = event => {
    if (event.target?.closest?.('[data-action="music"]')) return;
    window.removeEventListener('pointerdown', start);
    startBed();
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
