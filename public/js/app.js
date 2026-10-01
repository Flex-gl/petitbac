import { APP_VERSION } from './version.js';
import { api } from './api.js';
import { esc, haptic, icon, pageHead, shell, showSheet, toast } from './ui.js';
import { homeScreen, rankingsScreen } from './screens/home.js';
import { attachInter, followInter, handleInterAction, interPathCode, leaveInter, loadInterSession, openInterRules, renderInter, stopInter, submitInterCreate, submitInterJoin } from './inter-session.js';

document.documentElement.dataset.appVersion = APP_VERSION;
window.dispatchEvent(new CustomEvent('petitbac-version', { detail: APP_VERSION }));

const root = document.querySelector('#app');
const idStorage = 'petitbac.playerId';
const nameStorage = 'petitbac.playerName';
const rankStorage = 'petitbac.leaderboard';
const sessionKey = 'petitbac.session';
const profileKey = 'petitbac.profile';
const playerId = localStorage.getItem(idStorage) || crypto.randomUUID();
localStorage.setItem(idStorage, playerId);

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}
function loadStoredRanks() {
  const stored = readJson(rankStorage);
  return Array.isArray(stored) ? stored : [];
}
function loadSession() { return readJson(sessionKey); }

const state = {
  page: 'home', name: localStorage.getItem(nameStorage) || '', game: null, code: '',
  top: loadStoredRanks(), profile: readJson(profileKey),
  scoresState: loadStoredRanks().length ? 'ready' : 'loading',
  savedRoom: null, gameMode: 'petitbac', interGame: null, savedInter: null,
  online: navigator.onLine, deferredPrompt: null, sheet: null, pollTimer: null,
  roomSignature: '', pollBusy: false, priorGameStatus: null, lastReveal: '',
  lastRankRefresh: 0, roomError: '', pollFailures: 0, eventSource: null, usingSse: false,
  clockOffset: 0
};
let validateAnswer = null;
let celebrate = () => {};
let playRevealTone = () => {};

async function loadGameFeatures() {
  if (validateAnswer) return;
  const [dictionary, effects] = await Promise.all([import('./dict.js'), import('./corrector.js')]);
  validateAnswer = dictionary.validateAnswer;
  celebrate = effects.celebrate;
  playRevealTone = effects.playRevealTone;
}

function splash() {
  root.innerHTML = `<div class="splash"><div class="splash-mark"><span>P</span></div><p>POSÉIDON · DEL'HIVER</p></div>`;
}

function roomSignature(game) {
  if (!game) return '';
  if (game.status === 'lobby') return `lobby:${game.players.map(player => player.id).join(',')}:${game.chat?.length || 0}`;
  if (game.status === 'playing') return `playing:${game.round}:${Boolean(game.submissions?.[playerId])}`;
  if (game.status === 'correcting') {
    const active = game.correction?.activeWord;
    return `correcting:${game.round}:${game.correction?.categoryIndex}:${game.correction?.playerIndex}:${active?.revealedAt || ''}:${active?.phase || ''}:${active?.result?.hostValid ?? ''}:${active?.contested ? 1 : 0}:${active?.voteCount || 0}:${active?.result?.badge || ''}:${active?.result?.points || 0}:${game.players.map(player => player.score).join(',')}`;
  }
  if (game.status === 'between') return `between:${game.round}`;
  return `finished:${game.matchId}`;
}

async function render() {
  if (state.page === 'home') {
    root.innerHTML = homeScreen({ top: state.top, scoresState: state.scoresState, online: state.online, canInstall: Boolean(state.deferredPrompt) || !matchMedia('(display-mode: standalone)').matches, profile: state.profile, savedRoom: state.savedRoom, gameMode: state.gameMode, savedInter: state.savedInter });
  } else if (state.page === 'setup') {
    await loadGameFeatures();
    const { setupScreen } = await import('./screens/setup.js');
    root.innerHTML = setupScreen(state.name);
  } else if (state.page === 'rankings') {
    root.innerHTML = rankingsScreen(state.top, state.profile);
  } else if (state.page === 'invite') {
    root.innerHTML = inviteScreen(state.code);
  } else if (String(state.page).startsWith('inter')) {
    await renderInter(root);
  } else if (state.page === 'room' && state.game) {
    await loadGameFeatures();
    const screens = await import('./screens/room.js');
    if (state.game.status === 'lobby') root.innerHTML = screens.lobbyScreen(state.game, playerId);
    else if (state.game.status === 'playing') root.innerHTML = screens.playScreen(state.game, playerId);
    else if (state.game.status === 'correcting') root.innerHTML = screens.correctionScreen(state.game, playerId);
    else if (state.game.status === 'between') root.innerHTML = screens.betweenScreen(state.game);
    else root.innerHTML = screens.finalScreen(state.game, playerId);
    if (state.game.status === 'lobby') renderQr();
    else if (state.game.status === 'playing') restoreDraft(state.game);
  }
  if (state.roomError && state.page === 'room') {
    const main = root.querySelector('#main');
    if (main) main.insertAdjacentHTML('afterbegin', `<div class="error-panel" role="alert">${esc(state.roomError)}</div>`);
    state.roomError = '';
  }
  updateTimers();
  updateChatIfOpen();
}

function renderQr() {
  const box = document.querySelector('#qr-code');
  if (!box || box.dataset.ready) return;
  box.dataset.ready = '1';
  const paint = () => {
    if (!window.QRCode || !document.body.contains(box)) return;
    box.replaceChildren();
    new window.QRCode(box, { text: `${location.origin}/s/${state.game.code}`, width: 108, height: 108, colorDark: '#171425', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  };
  if (window.QRCode) return paint();
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  script.async = true;
  script.onload = paint;
  script.onerror = () => { if (document.body.contains(box)) box.innerHTML = '<span class="qr-placeholder">Le code de salle fonctionne aussi sans QR.</span>'; };
  document.head.append(script);
}

function updateTimers() {
  const now = Date.now() + state.clockOffset;
  document.querySelectorAll('[data-timer-end]').forEach(timer => {
    const end = Number(timer.dataset.timerEnd);
    const duration = Number(timer.dataset.duration || 1);
    const left = Math.max(0, Math.ceil((end - now) / 1000));
    const label = timer.querySelector('[data-timer-text]');
    if (label) label.textContent = `${left}`;
    timer.style.setProperty('--progress', String(Math.min(1, left / duration)));
    timer.classList.toggle('danger', left <= 10);
  });
  const between = document.querySelector('[data-between-countdown]');
  if (between && state.game) between.textContent = String(Math.max(0, Math.ceil((state.game.nextRoundAt - now) / 1000)));
  document.querySelectorAll('[data-decision-end]').forEach(node => {
    node.textContent = String(Math.max(0, Math.ceil((Number(node.dataset.decisionEnd) - now) / 1000)));
  });
}

async function refreshScores(force = false) {
  if (!state.online || (!force && Date.now() - state.lastRankRefresh < 30000)) return;
  try {
    const data = await api.scores(playerId);
    state.top = data.top || [];
    state.profile = data.profile || state.profile;
    state.scoresState = 'ready';
    state.lastRankRefresh = Date.now();
    localStorage.setItem(rankStorage, JSON.stringify(state.top));
    if (state.profile) localStorage.setItem(profileKey, JSON.stringify(state.profile));
    if (state.page === 'home' || state.page === 'rankings') await render();
  } catch {
    state.scoresState = state.top.length ? 'ready' : 'error';
    state.online = navigator.onLine;
    if (state.page === 'home' || state.page === 'rankings') await render();
  }
}

function schedulePoll(delay) {
  clearTimeout(state.pollTimer);
  if (state.page !== 'room' || !state.code || state.game?.status === 'finished' || state.usingSse) return;
  state.pollTimer = setTimeout(pollRoom, delay);
}

async function pollRoom() {
  if (state.pollBusy || state.page !== 'room' || !state.code) return schedulePoll(900);
  state.pollBusy = true;
  try {
    const data = await api.game(state.code, playerId);
    const next = data.game;
    if (state.page !== 'room') return;
    state.clockOffset = (next.serverNow || Date.now()) - Date.now();
    state.pollFailures = 0;
    state.roomError = '';
    const signature = roomSignature(next);
    const changedView = signature !== state.roomSignature;
    const wasFinished = state.game?.status === 'finished';
    state.game = next;
    state.roomSignature = signature;
    state.online = true;
    rememberRoom(next);
    if (state.page !== 'room') return;
    if (changedView) {
      const active = next.correction?.activeWord;
      if (active && `${next.matchId}:${next.round}:${active.revealedAt}` !== state.lastReveal) {
        state.lastReveal = `${next.matchId}:${next.round}:${active.revealedAt}`;
        playRevealTone(active.result?.points ? 'good' : active.result?.word ? 'bad' : 'reveal');
      }
      await render();
    } else {
      updateTimers();
      updateChatIfOpen();
    }
    if (!wasFinished && next.status === 'finished') {
      closeSse();
      celebrate();
      haptic([30, 40, 50]);
      await refreshScores(true);
    }
  } catch (error) {
    state.roomError = error.message;
    state.pollFailures += 1;
    if (state.pollFailures >= 2) connectSse();
    if (!navigator.onLine) state.online = false;
    toast(error.message);
  } finally {
    state.pollBusy = false;
    const delay = state.game?.status === 'correcting' ? 500 : state.game?.status === 'lobby' ? 1200 : state.game?.status === 'between' ? 700 : 1200;
    if (!state.usingSse) schedulePoll(delay);
  }
}

function acceptStreamGame(game) {
  if (state.page !== 'room' || !game) return;
  const signature = roomSignature(game);
  const changedView = signature !== state.roomSignature;
  const wasFinished = state.game?.status === 'finished';
  if (state.page !== 'room') return;
  state.game = game;
  state.clockOffset = (game.serverNow || Date.now()) - Date.now();
  state.roomSignature = signature;
  rememberRoom(game);
  state.roomError = '';
  state.online = true;
  if (changedView) {
    const active = game.correction?.activeWord;
    if (active && `${game.matchId}:${game.round}:${active.revealedAt}` !== state.lastReveal) {
      state.lastReveal = `${game.matchId}:${game.round}:${active.revealedAt}`;
      playRevealTone(active.result?.points ? 'good' : active.result?.word ? 'bad' : 'reveal');
    }
    render();
  }
  if (!wasFinished && game.status === 'finished') {
    closeSse();
    celebrate();
    haptic([30, 40, 50]);
    refreshScores(true);
  }
}

function connectSse() {
  if (state.eventSource || !('EventSource' in window) || state.page !== 'room') return;
  const query = new URLSearchParams({ code: state.code, playerId, stream: '1' });
  const source = new EventSource(`/api/game?${query}`);
  state.eventSource = source;
  source.onopen = () => { state.usingSse = true; };
  source.onmessage = event => {
    try { acceptStreamGame(JSON.parse(event.data).game); }
    catch { toast('Le flux temps réel a reçu une réponse illisible.'); }
  };
  source.onerror = () => {
    closeSse();
    if (state.page === 'room') schedulePoll(1200);
  };
}

function closeSse() {
  state.eventSource?.close();
  state.eventSource = null;
  state.usingSse = false;
}

function enterRoom(game) {
  state.page = 'room';
  state.game = game;
  state.code = game.code;
  state.roomSignature = roomSignature(game);
  state.roomError = '';
  state.pollFailures = 0;
  state.savedRoom = null;
  rememberRoom(game);
  closeSse();
  state.sheet?.close?.();
  state.sheet = null;
  history.replaceState(null, '', `/s/${encodeURIComponent(game.code)}`);
  render();
  schedulePoll(100);
}

function rememberRoom(game) {
  if (!game?.code || state.page !== 'room') return;
  if (game.hostSecret) localStorage.setItem(`petitbac.hostSecret.${game.code}`, game.hostSecret);
  const secret = localStorage.getItem(`petitbac.hostSecret.${game.code}`) || '';
  localStorage.setItem(sessionKey, JSON.stringify({ code: game.code, host: game.hostId === playerId, name: state.name || game.players?.find(entry => entry.id === playerId)?.name || '', paused: false, savedAt: Date.now(), secret }));
}

function draftKey(game) {
  return `petitbac.draft.${game.code}.${game.matchId}.${game.round}`;
}

function restoreDraft(game) {
  if (game.submissions?.[playerId]) return;
  const draft = readJson(draftKey(game));
  if (!draft || typeof draft !== 'object') return;
  for (const input of document.querySelectorAll('[data-answer]')) {
    const value = draft[input.dataset.answer];
    if (value && !input.value) input.value = String(value);
  }
}

function pauseSession() {
  const session = loadSession();
  if (!session?.code) return;
  session.paused = true;
  localStorage.setItem(sessionKey, JSON.stringify(session));
  state.savedRoom = session;
}

function goHome(pauseRoom = false) {
  clearTimeout(state.pollTimer);
  closeSse();
  state.sheet?.close?.();
  state.sheet = null;
  state.page = 'home';
  state.game = null;
  if (pauseRoom) pauseSession();
  else state.savedRoom = loadSession();
  history.replaceState(null, '', '/');
  return render();
}

function roomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function inviteCode() {
  const params = new URL(location.href).searchParams;
  const fromPath = location.pathname.match(/^\/s\/([A-Za-z0-9]{6})\/?$/);
  return roomCode(params.get('join') || params.get('room') || fromPath?.[1] || '');
}

function openInterJoin() {
  const inner = `<form id="inter-join" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" placeholder="Ex. Alex Martin" value="${esc(state.name)}" required></label><label class="field"><span class="field-label">Code de la salle</span><input class="text-input" name="code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" required style="text-transform:uppercase;letter-spacing:.16em;font-weight:800"></label><div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">Entrer dans le salon ${icon('arrow', 17)}</button></form>`;
  state.sheet = showSheet('Rejoindre INTER', inner, () => { state.sheet = null; });
}

function openJoinSheet(initialCode = '') {
  const code = roomCode(initialCode);
  const locked = code.length === 6;
  const codeField = locked
    ? `<input type="hidden" name="code" value="${esc(code)}">`
    : `<label class="field"><span class="field-label">Code de la salle</span><input class="text-input" name="code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" value="${esc(initialCode)}" required style="text-transform:uppercase;letter-spacing:.16em;font-weight:800"></label>`;
  const inner = `<form id="join-form" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" placeholder="Ex. Alex Martin" value="${esc(state.name)}" required></label>${codeField}<div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">Entrer dans la salle ${icon('arrow', 17)}</button></form>`;
  state.sheet = showSheet(locked ? `Rejoindre ${code}` : 'Rejoindre une salle', inner, () => { state.sheet = null; });
}

async function followInvite(rawCode) {
  const code = roomCode(rawCode);
  if (code.length !== 6) return;
  try {
    const data = await api.game(code, playerId);
    const game = data.game;
    if (game.players.some(player => player.id === playerId)) {
      enterRoom(game);
      return;
    }
    const stored = loadSession();
    const secret = localStorage.getItem(`petitbac.hostSecret.${code}`) || (stored?.code === code ? stored.secret : '');
    if (secret) {
      try {
        const reclaimed = await api.action({ action: 'reclaim', code, playerId, name: state.name || undefined, hostSecret: secret });
        enterRoom(reclaimed.game);
        toast('Tu as repris le salon en tant qu’hôte.');
        return;
      } catch (error) {
        if (game.status !== 'lobby') { toast(error.message); return; }
      }
    }
    if (game.status !== 'lobby') {
      toast('La partie a déjà commencé.');
      return;
    }
    state.page = 'invite';
    state.code = code;
    await render();
  } catch (error) {
    if (String(error.message || '').includes('n’existe plus')) {
      const stored = loadSession();
      if (stored?.code === code) {
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(`petitbac.hostSecret.${code}`);
        state.savedRoom = null;
      }
    }
    toast(error.message);
    if (state.page === 'home') render();
  }
}

function inviteScreen(code) {
  const content = `${pageHead('Tu es invité', 'Entre ton pseudo ou ton nom. Le code de la salle est déjà dans le lien.')}<form id="join-form" novalidate><p class="notice">Salle <strong>${esc(code)}</strong></p><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" placeholder="Ex. Alex Martin" value="${esc(state.name)}" required autofocus></label><input type="hidden" name="code" value="${esc(code)}"><div class="error-note" data-form-error role="status"></div><div class="form-footer"><button class="btn btn-primary btn-full" type="submit">Rejoindre la salle ${icon('arrow', 17)}</button></div></form>`;
  return shell(content, { nav: false });
}

function openRules() {
  const inner = `<p class="sheet-copy">Le Petit Bac se joue en manches. L’hôte choisit les catégories, le temps et le nombre de tours. Une lettre apparaît : trouve un mot par catégorie avant la fin du compte à rebours.</p><ol class="rules-list"><li>Au moins deux catégories sont sélectionnées avant le départ.</li><li>Chaque mot doit commencer par la lettre de la manche.</li><li>Valide ta grille pour rejoindre l’attente. La correction démarre quand tout le monde a fini ou quand le temps est écoulé.</li><li>Celui qui a lancé le salon corrige chaque réponse, joueur après joueur. Tout le monde voit la correction en direct.</li><li>Les autres joueurs peuvent contester. Le vote du groupe tranche alors : une réponse unique vaut 2 points, un doublon 1 point.</li><li>Les manches s’enchaînent, puis le classement final est sauvegardé au classement global.</li></ol><p class="sheet-copy">Une arène signée Poséidon - Del'Hiver. Rejoins une salle avec le lien ou le QR.</p>`;
  state.sheet = showSheet('Règles du jeu', inner, () => { state.sheet = null; });
}

function openChat() {
  const messages = (state.game?.chat || []).map(item => `<div class="chat-line"><b>${esc(item.name)}</b>${esc(item.message)}</div>`).join('') || '<div class="empty-state">Aucun message pour le moment.</div>';
  const inner = `<div class="chat-list" id="chat-messages">${messages}</div><form class="chat-send" id="chat-form"><input class="text-input" name="message" maxlength="180" autocomplete="off" placeholder="Écrire un message…" aria-label="Message"><button class="btn btn-primary btn-sm" type="submit">Envoyer</button></form>`;
  state.sheet = showSheet('Chat de la salle', inner, () => { state.sheet = null; });
}

function updateChatIfOpen() {
  const list = document.querySelector('#chat-messages');
  if (!list || !state.game) return;
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 30;
  list.innerHTML = state.game.chat?.map(item => `<div class="chat-line"><b>${esc(item.name)}</b>${esc(item.message)}</div>`).join('') || '<div class="empty-state">Aucun message pour le moment.</div>';
  if (nearBottom) list.scrollTop = list.scrollHeight;
}

async function runAction(action, extra = {}) {
  if (!state.game) return false;
  haptic();
  try {
    const data = await api.action({ action, code: state.code, playerId, ...extra });
    if (state.page !== 'room') return false;
    state.game = data.game;
    state.roomSignature = roomSignature(data.game);
    rememberRoom(data.game);
    if (action === 'chat') updateChatIfOpen();
    else await render();
    return true;
  } catch (error) {
    toast(error.message);
    return false;
  }
}

async function createRoom(form) {
  const name = String(form.elements.name.value || '').trim();
  const categories = [...document.querySelectorAll('.category-chip[aria-pressed="true"]')].map(button => button.dataset.category);
  const duration = Number(document.querySelector('[data-choice="duration"] .segment[aria-pressed="true"]')?.dataset.value || 90);
  const rounds = Number(document.querySelector('[data-choice="rounds"] .segment[aria-pressed="true"]')?.dataset.value || 5);
  const errorNode = form.querySelector('[data-form-error]');
  if (name.length < 2) { errorNode.textContent = 'Entre un prénom d’au moins deux lettres.'; return; }
  if (categories.length < 2) { errorNode.textContent = 'Sélectionne au moins deux catégories.'; return; }
  errorNode.textContent = '';
  state.name = name;
  localStorage.setItem(nameStorage, name);
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const data = await api.action({ action: 'create', playerId, name, categories, duration, rounds });
    enterRoom(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    submit.disabled = false;
  }
}

async function joinRoom(form) {
  const name = String(form.elements.name.value || '').trim();
  const code = String(form.elements.code.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const errorNode = form.querySelector('[data-form-error]');
  if (name.length < 2) { errorNode.textContent = 'Entre un pseudo ou un nom d’au moins deux lettres.'; return; }
  if (code.length !== 6) { errorNode.textContent = 'Le code de salle doit contenir six caractères.'; return; }
  errorNode.textContent = '';
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const data = await api.action({ action: 'join', playerId, name, code });
    state.name = name;
    localStorage.setItem(nameStorage, name);
    state.sheet?.close();
    enterRoom(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    submit.disabled = false;
  }
}

async function submitAnswers(form) {
  const answers = Object.fromEntries([...form.querySelectorAll('[data-answer]')].map(input => [input.dataset.answer, input.value.trim()]));
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  if (await runAction('submit', { answers })) {
    if (state.game) localStorage.removeItem(draftKey(state.game));
  } else button.disabled = false;
}

async function handleSubmit(event) {
  const form = event.target;
  if (!form.matches('form')) return;
  event.preventDefault();
  if (form.id === 'create-form') return createRoom(form);
  if (form.id === 'join-form') return joinRoom(form);
  if (form.id === 'inter-create') return submitInterCreate(form);
  if (form.id === 'inter-join') return submitInterJoin(form);
  if (form.id === 'answer-form') return submitAnswers(form);
  if (form.id === 'chat-form') {
    const input = form.elements.message;
    const message = input.value.trim();
    if (message && await runAction('chat', { message })) input.value = '';
  }
}

async function handleAction(button) {
  const action = button.dataset.action;
  if (!action) return;
  if (action === 'theme') {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('petitbac.theme', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'light' ? '#f4f1fa' : '#100e1c';
    return;
  }
  if (['home', 'create', 'join', 'rankings', 'rules', 'back', 'install'].includes(action)) haptic();
  if (action === 'pick-game') {
    state.gameMode = button.dataset.game === 'inter' ? 'inter' : 'petitbac';
    return render();
  }
  if (action === 'ix-setup') { state.page = 'inter-setup'; return render(); }
  if (action === 'ix-join') return openInterJoin();
  if (action === 'ix-resume') {
    const session = loadInterSession();
    if (!session?.code) return;
    session.paused = false;
    localStorage.setItem('petitbac.inter.session', JSON.stringify(session));
    state.savedInter = null;
    return followInter(session.code);
  }
  if (String(action).startsWith('ix-')) return handleInterAction(button);
  if (action === 'home') {
    if (String(state.page).startsWith('inter')) return leaveInter(state.page === 'inter-room');
    return goHome(state.page === 'room');
  }
  if (action === 'leave') return goHome(true);
  if (action === 'resume') {
    const session = loadSession();
    if (!session?.code) return;
    session.paused = false;
    localStorage.setItem(sessionKey, JSON.stringify(session));
    state.savedRoom = null;
    return followInvite(session.code);
  }
  if (action === 'create') {
    state.page = 'setup';
    return render();
  }
  if (action === 'join') return openJoinSheet(inviteCode());
  if (action === 'rules') {
    if (state.gameMode === 'inter' || String(state.page).startsWith('inter')) return openInterRules();
    return openRules();
  }
  if (action === 'rankings') {
    if (state.page === 'room') { clearTimeout(state.pollTimer); closeSse(); }
    state.page = 'rankings';
    await refreshScores(true);
    return render();
  }
  if (action === 'back') {
    if (String(state.page).startsWith('inter')) return leaveInter(state.page === 'inter-room');
    if (state.page === 'setup' || state.page === 'rankings' || state.page === 'invite') {
      const session = loadSession();
      if (state.page === 'rankings' && session?.code && !session.paused) return followInvite(session.code);
      state.page = 'home';
      state.savedRoom = session?.code ? session : null;
      history.replaceState(null, '', '/');
      return render();
    }
    if (state.page === 'room') return goHome(true);
  }
  if (action === 'install') {
    if (state.deferredPrompt) { state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; state.deferredPrompt = null; await render(); }
    else state.sheet = showSheet('Installer Poséidon - Del\'Hiver', `<p class="sheet-copy">Sur iPhone ou iPad, touche <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>. Sur Android, ouvre le menu du navigateur et choisis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p>`, () => { state.sheet = null; });
    return;
  }
  if (action === 'start') return runAction('start');
  if (action === 'replay') return runAction('replay');
  if (action === 'judge') return runAction('judge', { valid: button.dataset.valid === 'true' });
  if (action === 'contest') return runAction('contest');
  if (action === 'next') return runAction('next');
  if (action === 'vote') return runAction('vote', { valid: button.dataset.valid === 'true' });
  if (action === 'chat') return openChat();
  if (action === 'copy-code' || action === 'copy-link') {
    const value = action === 'copy-code' ? state.game?.code : `${location.origin}/s/${state.game?.code}`;
    if (action === 'copy-link' && navigator.share) {
      try {
        await navigator.share({ title: 'Poséidon - Del\'Hiver', text: `Rejoins la salle ${state.game?.code}`, url: value });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try { await navigator.clipboard.writeText(value); toast(action === 'copy-code' ? 'Code copié !' : 'Lien d’invitation copié !'); }
    catch { toast(action === 'copy-code' ? `Code de salle : ${state.game?.code}` : value); }
    return;
  }
}

document.addEventListener('submit', handleSubmit);
document.addEventListener('click', event => {
  const chip = event.target.closest('[data-category]');
  if (chip) { chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true' ? 'true' : 'false'); haptic(8); return; }
  const segment = event.target.closest('.segment');
  if (segment) {
    segment.parentElement.querySelectorAll('.segment').forEach(item => item.setAttribute('aria-pressed', String(item === segment)));
    haptic(8);
    return;
  }
  const button = event.target.closest('[data-action]');
  if (button) {
    if (button.tagName === 'A' || button.tagName === 'BUTTON') event.preventDefault();
    handleAction(button);
  }
});
document.addEventListener('input', event => {
  const input = event.target.closest('[data-answer]');
  if (!input || !state.game) return;
  const draft = readJson(draftKey(state.game)) || {};
  draft[input.dataset.answer] = input.value;
  localStorage.setItem(draftKey(state.game), JSON.stringify(draft));
  const result = validateAnswer(input.dataset.answer, state.game.letter, input.value);
  const field = input.closest('.answer-field');
  field.classList.toggle('good', result.state === 'valid' || result.state === 'appeal');
  field.classList.toggle('bad', result.state === 'invalid');
  input.setAttribute('aria-invalid', String(result.state === 'invalid'));
});
document.addEventListener('pointerdown', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  button.append(ripple);
  setTimeout(() => ripple.remove(), 600);
});

addEventListener('online', () => { state.online = true; if (state.page === 'home') render(); if (state.page === 'room') pollRoom(); });
addEventListener('offline', () => { state.online = false; if (state.page === 'home') render(); });
addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.deferredPrompt = event; if (state.page === 'home') render(); });
addEventListener('appinstalled', () => { state.deferredPrompt = null; if (state.page === 'home') render(); });

setInterval(() => refreshScores(true), 30000);
setInterval(updateTimers, 250);
attachInter({ state, playerId, render });
splash();
setTimeout(async () => {
  state.page = 'home';
  await render();
  if (!navigator.connection?.saveData) {
    const prefetch = () => ['/js/screens/setup.js', '/js/screens/room.js'].forEach(path => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = path;
      document.head.append(link);
    });
    if ('requestIdleCallback' in window) requestIdleCallback(prefetch, { timeout: 2500 });
    else setTimeout(prefetch, 1400);
  }
  refreshScores(true);
  const interCode = interPathCode();
  const code = inviteCode();
  if (interCode) followInter(interCode);
  else if (code.length === 6) followInvite(code);
  else {
    const session = loadSession();
    const interSession = loadInterSession();
    const interFirst = interSession?.code && !interSession.paused && (!session?.code || session.paused || interSession.savedAt > (session.savedAt || 0));
    if (interFirst) followInter(interSession.code);
    else if (session?.code && !session.paused) followInvite(session.code);
    else {
      if (session?.code) state.savedRoom = session;
      if (interSession?.code) state.savedInter = interSession;
      if (state.page === 'home') render();
    }
  }
}, 620);
