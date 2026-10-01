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

const TRACK = '/audio/fond.mp3';
let bed = null;
let playing = false;

export function musicWanted() {
  try { return localStorage.getItem('petitbac.music') !== '0'; }
  catch { return true; }
}

export function isMusicPlaying() {
  return playing && bed && !bed.paused;
}

function track() {
  if (!bed) {
    bed = new Audio(TRACK);
    bed.loop = true;
    bed.preload = 'auto';
    bed.volume = 0.38;
  }
  return bed;
}

async function startBed() {
  if (isMusicPlaying()) return true;
  try {
    const node = track();
    node.loop = true;
    node.volume = 0.38;
    await node.play();
    if (!musicWanted()) {
      node.pause();
      playing = false;
      document.documentElement.dataset.audio = 'off';
      return false;
    }
    playing = true;
    document.documentElement.dataset.audio = 'running';
    return true;
  } catch {
    playing = false;
    document.documentElement.dataset.audio = 'off';
    return false;
  }
}

function stopBed() {
  playing = false;
  document.documentElement.dataset.audio = 'off';
  if (!bed) return;
  bed.pause();
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
    startBed().then(ok => { if (ok) window.removeEventListener('pointerdown', start); });
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
