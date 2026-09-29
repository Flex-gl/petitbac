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
