import { APP_VERSION } from './version.js';
import { api } from './api.js';
import { esc, haptic, icon, pageHead, shell, showSheet, toast } from './ui.js';
import { cardsScreen, hubScreen, lettersScreen, rankingsScreen } from './screens/home.js';
import { guideArticleScreen, guideCatalogScreen, petitbacRulesHtml } from './screens/guide.js';
import { armMusic, setMusic } from './inter-audio.js';
import { celebrate as celebrateVictory, clearCelebration } from './fireworks.js';
import { attachInter, followInter, handleInterAction, interPathCode, leaveInter, loadInterSession, openInterRules, renderInter, stopInter, submitInterCreate, submitInterJoin, submitInterSolo } from './inter-session.js';
import { attachQuiz, followQuiz, handleQuizAction, leaveQuiz, loadQuizSession, openQuizRules, quizPathCode, renderQuiz, stopQuiz, submitQuizCreate, submitQuizEdit, submitQuizFilter, submitQuizImport, submitQuizJoin, submitQuizKey } from './quiz-session.js';
import { attachAdmin, handleAdminAction, openAdmin, renderAdmin, submitAdminKey, submitAdminSearch } from './admin-session.js';
import { bannedScreen } from './screens/admin.js';

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
function loadList(key) {
  const stored = readJson(key);
  return Array.isArray(stored) ? stored : [];
}
function loadSession() { return readJson(sessionKey); }

const state = {
  page: 'home', name: localStorage.getItem(nameStorage) || '', game: null, code: '',
  top: loadStoredRanks(), profile: readJson(profileKey),
  interTop: loadList('petitbac.inter.leaderboard'), interProfile: readJson('petitbac.inter.profile'),
  quizTop: loadList('petitbac.quiz.leaderboard'), quizProfile: readJson('petitbac.quiz.profile'),
  quizGame: null, savedQuiz: null, quizMeta: null,
  scoresState: loadStoredRanks().length ? 'ready' : 'loading',
  savedRoom: null, gameMode: 'petitbac', interGame: null, savedInter: null, hubFilter: 'all', hubQuery: '',
  online: navigator.onLine, deferredPrompt: null, sheet: null, pollTimer: null,
  roomSignature: '', pollBusy: false, priorGameStatus: null, lastReveal: '',
  lastRankRefresh: 0, roomError: '', pollFailures: 0, eventSource: null, usingSse: false,
  clockOffset: 0
};
let roomEpoch = 0;
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
  root.innerHTML = `<div class="splash"><div class="loader-mark" aria-hidden="true"><span class="loader-ring"></span><span class="loader-letter"><img src="/icons/mark.png" alt=""></span></div><p>POSÉIDON · DEL'HIVER</p><b class="loader-caption">Ouverture de l’arène</b></div>`;
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
  if (state.page === 'banned') {
    root.innerHTML = bannedScreen();
    return;
  }
  if (state.page === 'admin') {
    renderAdmin(root);
    return;
  }
  if (state.page === 'home') {
    root.innerHTML = hubScreen({ online: state.online, canInstall: Boolean(state.deferredPrompt) || !matchMedia('(display-mode: standalone)').matches, profile: state.profile, interProfile: state.interProfile, quizProfile: state.quizProfile, name: state.name, filter: state.hubFilter, query: state.hubQuery });
  } else if (state.page === 'letters') {
    root.innerHTML = lettersScreen({ top: state.top, scoresState: state.scoresState, online: state.online, profile: state.profile });
  } else if (state.page === 'cards') {
    root.innerHTML = cardsScreen({ top: state.interTop, scoresState: state.scoresState, online: state.online, profile: state.interProfile });
  } else if (state.page === 'guide') {
    root.innerHTML = guideCatalogScreen();
  } else if (state.page === 'guide-read') {
    root.innerHTML = guideArticleScreen(state.guideGame, state.guideKind);
  } else if (state.page === 'setup') {
    await loadGameFeatures();
    const { setupScreen } = await import('./screens/setup.js');
    root.innerHTML = setupScreen(state.name);
  } else if (state.page === 'rankings') {
    const board = state.gameMode === 'inter' ? state.interTop : state.gameMode === 'quiz' ? state.quizTop : state.top;
    const profile = state.gameMode === 'inter' ? state.interProfile : state.gameMode === 'quiz' ? state.quizProfile : state.profile;
    root.innerHTML = rankingsScreen(board, profile, state.gameMode);
  } else if (state.page === 'invite') {
    root.innerHTML = inviteScreen(state.code);
  } else if (String(state.page).startsWith('quiz')) {
    await renderQuiz(root);
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
    if (state.game.status === 'finished') celebrateVictory(`pb:${state.game.matchId || state.code}`, { finale: true });
    else clearCelebration();
  }
  if (state.roomError && state.page === 'room') {
    const main = root.querySelector('#main');
    if (main) main.insertAdjacentHTML('afterbegin', `<div class="error-panel" role="alert">${esc(state.roomError)}</div>`);
    state.roomError = '';
  }
  const quizFinale = state.page === 'quiz-room' && state.quizGame?.status === 'finished';
  if (!String(state.page).startsWith('inter') && !(state.page === 'room' && state.game?.status === 'finished') && !quizFinale) clearCelebration();
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
    const [letters, cards, quiz] = await Promise.allSettled([api.scores(playerId), api.scores(playerId, { game: 'inter' }), api.scores(playerId, { game: 'quiz' })]);
    if (letters.status === 'rejected' && cards.status === 'rejected' && quiz.status === 'rejected') throw letters.reason;
    if (letters.status === 'fulfilled') {
      state.top = letters.value.top || [];
      state.profile = letters.value.profile || state.profile;
      localStorage.setItem(rankStorage, JSON.stringify(state.top));
      if (state.profile) localStorage.setItem(profileKey, JSON.stringify(state.profile));
    }
    if (cards.status === 'fulfilled') {
      state.interTop = cards.value.top || [];
      state.interProfile = cards.value.profile || state.interProfile;
      localStorage.setItem('petitbac.inter.leaderboard', JSON.stringify(state.interTop));
      if (state.interProfile) localStorage.setItem('petitbac.inter.profile', JSON.stringify(state.interProfile));
    }
    if (quiz.status === 'fulfilled') {
      state.quizTop = quiz.value.top || [];
      state.quizProfile = quiz.value.profile || state.quizProfile;
      localStorage.setItem('petitbac.quiz.leaderboard', JSON.stringify(state.quizTop));
      if (state.quizProfile) localStorage.setItem('petitbac.quiz.profile', JSON.stringify(state.quizProfile));
    }
    state.scoresState = 'ready';
    state.lastRankRefresh = Date.now();
    if (['home', 'letters', 'cards', 'quiz-door', 'rankings'].includes(state.page)) await render();
  } catch {
    state.scoresState = state.top.length ? 'ready' : 'error';
    state.online = navigator.onLine;
    if (['home', 'letters', 'cards', 'quiz-door', 'rankings'].includes(state.page)) await render();
  }
}

function schedulePoll(delay) {
  clearTimeout(state.pollTimer);
  if (state.page !== 'room' || !state.code || state.game?.status === 'finished' || state.usingSse) return;
  state.pollTimer = setTimeout(pollRoom, delay);
}

async function pollRoom() {
  if (state.pollBusy || state.page !== 'room' || !state.code) return schedulePoll(900);
  const epoch = roomEpoch;
  state.pollBusy = true;
  try {
    const data = await api.game(state.code, playerId);
    const next = data.game;
    if (epoch !== roomEpoch || state.page !== 'room') return;
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

function forgetRoom() {
  localStorage.removeItem(sessionKey);
  state.savedRoom = null;
}

function goHome(pauseRoom = false, page = 'home') {
  roomEpoch += 1;
  clearTimeout(state.pollTimer);
  closeSse();
  state.sheet?.close?.();
  state.sheet = null;
  state.page = page;
  state.game = null;
  state.code = '';
  if (pauseRoom) forgetRoom();
  else state.savedRoom = null;
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

async function followInvite(rawCode, options = {}) {
  const code = roomCode(rawCode);
  if (code.length !== 6) return;
  try {
    const data = await api.game(code, playerId);
    const game = data.game;
    if (options.dropFinished && game.status === 'finished') {
      forgetRoom();
      return;
    }
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
  state.sheet = showSheet('Règles du Petit Bac', petitbacRulesHtml(), () => { state.sheet = null; });
}

function openHubChooser(kind) {
  const rankings = kind === 'rankings';
  const action = rankings ? 'rank-game' : 'rules-game';
  const inner = `<p class="sheet-copy">Chaque jeu garde ${rankings ? 'son classement' : 'ses règles'}.</p><div class="home-actions"><button class="btn btn-secondary" data-action="${action}" data-game="petitbac">Petit Bac</button><button class="btn btn-secondary" data-action="${action}" data-game="inter">INTER</button><button class="btn btn-secondary" data-action="${action}" data-game="quiz">Quiz Battle</button></div>`;
  state.sheet?.close?.();
  const sheet = showSheet(rankings ? 'Quel classement ?' : 'Quelles règles ?', inner, () => { if (state.sheet === sheet) state.sheet = null; });
  state.sheet = sheet;
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
  if (form.id === 'inter-solo') return submitInterSolo(form);
  if (form.id === 'quiz-create') return submitQuizCreate(form);
  if (form.id === 'quiz-join') return submitQuizJoin(form);
  if (form.id === 'quiz-admin-key') return submitQuizKey(form);
  if (form.id === 'quiz-filter') return submitQuizFilter(form);
  if (form.id === 'quiz-edit') return submitQuizEdit(form);
  if (form.id === 'quiz-import') return submitQuizImport(form);
  if (form.id === 'admin-key') return submitAdminKey(form);
  if (form.id === 'admin-search') return submitAdminSearch(form);
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
  if (action.startsWith('adm-')) return handleAdminAction(button);
  if (action === 'theme') {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('petitbac.theme', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'light' ? '#f3f0fa' : '#121318';
    return;
  }
  if (action === 'music') {
    setMusic(document.documentElement.dataset.audio !== 'running');
    return;
  }
  if (['home', 'create', 'join', 'rankings', 'rules', 'back', 'install'].includes(action)) haptic();
  if (action === 'hub-filter') {
    state.hubFilter = ['letters', 'cards', 'quiz'].includes(button.dataset.filter) ? button.dataset.filter : 'all';
    const typed = document.querySelector('[data-hub-search]');
    if (typed) state.hubQuery = typed.value;
    return render();
  }
  if (action === 'open-game') {
    const picked = button.dataset.game;
    state.gameMode = picked === 'inter' ? 'inter' : picked === 'quiz' ? 'quiz' : 'petitbac';
    state.page = state.gameMode === 'inter' ? 'cards' : state.gameMode === 'quiz' ? 'quiz-door' : 'letters';
    return render();
  }
  if (action === 'ix-solo') { state.page = 'inter-solo'; state.gameMode = 'inter'; return render(); }
  if (action === 'ix-setup') { state.page = 'inter-setup'; state.gameMode = 'inter'; return render(); }
  if (action === 'ix-join') return openInterJoin();
  if (String(action).startsWith('ix-')) return handleInterAction(button);
  if (String(action).startsWith('qz-')) return handleQuizAction(button);
  if (action === 'home') {
    if (state.page === 'inter-room') return leaveInter(true);
    if (state.page === 'quiz-room') return leaveQuiz(true);
    if (String(state.page).startsWith('inter') || String(state.page).startsWith('quiz')) { state.page = 'home'; return render(); }
    return goHome(state.page === 'room');
  }
  if (action === 'leave') return goHome(true, 'letters');
  if (action === 'create') {
    state.page = 'setup';
    return render();
  }
  if (action === 'join') return openJoinSheet(inviteCode());
  if (action === 'rank-game' || action === 'rules-game') {
    state.sheet?.close?.();
    const picked = button.dataset.game;
    state.gameMode = picked === 'inter' ? 'inter' : picked === 'quiz' ? 'quiz' : 'petitbac';
    if (action === 'rules-game') return state.gameMode === 'inter' ? openInterRules() : state.gameMode === 'quiz' ? openQuizRules() : openRules();
    if (state.page === 'room') { clearTimeout(state.pollTimer); closeSse(); }
    if (state.page === 'quiz-room') stopQuiz();
    if (state.page === 'inter-room') stopInter();
    state.page = 'rankings';
    await refreshScores(true);
    return render();
  }
  if (action === 'guide-open') {
    state.guideGame = ['petitbac', 'inter', 'quiz'].includes(button.dataset.game) ? button.dataset.game : 'petitbac';
    state.guideKind = button.dataset.kind === 'play' ? 'play' : 'rules';
    state.page = 'guide-read';
    return render();
  }
  if (action === 'rules') {
    const live = state.page === 'room' || state.page === 'inter-room' || state.page === 'quiz-room';
    if (!live) { state.page = 'guide'; return render(); }
    if (state.page === 'quiz-room') return openQuizRules();
    if (state.page === 'inter-room') return openInterRules();
    return openRules();
  }
  if (action === 'rankings') {
    if (state.page === 'home' || state.page === 'guide' || state.page === 'guide-read') return openHubChooser('rankings');
    if (state.page === 'room') { clearTimeout(state.pollTimer); closeSse(); }
    if (state.page === 'quiz-room') stopQuiz();
    if (state.page === 'inter-room') stopInter();
    state.page = 'rankings';
    await refreshScores(true);
    return render();
  }
  if (action === 'back') {
    if (state.page === 'guide-read') { state.page = 'guide'; return render(); }
    if (state.page === 'guide') { state.page = 'home'; return render(); }
    if (state.page === 'inter-setup' || state.page === 'inter-solo' || state.page === 'inter-invite') {
      state.page = 'cards';
      return render();
    }
    if (state.page === 'quiz-setup' || state.page === 'quiz-invite' || state.page === 'quiz-admin') {
      state.page = 'quiz-door';
      return render();
    }
    if (String(state.page).startsWith('inter')) return leaveInter(state.page === 'inter-room');
    if (state.page === 'quiz-room') return leaveQuiz(true);
    if (state.page === 'quiz-door') { state.page = 'home'; return render(); }
    if (state.page === 'letters' || state.page === 'cards') { state.page = 'home'; return render(); }
    if (state.page === 'setup' || state.page === 'rankings' || state.page === 'invite') {
      const session = loadSession();
      if (state.page === 'rankings' && session?.code && !session.paused) return followInvite(session.code);
      state.page = state.page === 'setup' ? 'letters' : state.gameMode === 'inter' ? 'cards' : state.gameMode === 'quiz' ? 'quiz-door' : 'home';
      state.savedRoom = null;
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
  const search = event.target.closest('[data-hub-search]');
  if (search) {
    state.hubQuery = search.value;
    const q = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-hub-item]').forEach(node => { node.hidden = Boolean(q) && !node.dataset.hubItem.toLowerCase().includes(q); });
    return;
  }
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
document.addEventListener('online', () => { state.online = true; if (state.page === 'home') render(); if (state.page === 'room') pollRoom(); });
addEventListener('offline', () => { state.online = false; if (state.page === 'home') render(); });
addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.deferredPrompt = event; if (state.page === 'home') render(); });
addEventListener('appinstalled', () => { state.deferredPrompt = null; if (state.page === 'home') render(); });

setInterval(() => refreshScores(true), 30000);
setInterval(updateTimers, 250);
attachInter({ state, playerId, render });
attachQuiz({ state, playerId, render });
attachAdmin({ state, render });
addEventListener('petitbac-banned', () => {
  if (state.page === 'admin' || /^\/admin\/?$/.test(location.pathname)) return;
  clearTimeout(state.pollTimer);
  closeSse();
  stopQuiz();
  stopInter();
  state.page = 'banned';
  render();
});
armMusic();
splash();
setTimeout(async () => {
  if (state.page === 'banned') return;
  if (/^\/admin\/?$/.test(location.pathname)) return openAdmin();
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
  const quizCode = quizPathCode();
  const interCode = interPathCode();
  const code = inviteCode();
  const rawQuiz = loadQuizSession();
  const rawInter = loadInterSession();
  const rawRoom = loadSession();
  const abandoned = (stored, current) => Boolean(stored?.paused && current && stored.code === current);
  if (rawQuiz?.paused) localStorage.removeItem('petitbac.quiz.session');
  if (rawInter?.paused) localStorage.removeItem('petitbac.inter.session');
  if (rawRoom?.paused) localStorage.removeItem(sessionKey);
  if (abandoned(rawQuiz, quizCode) || abandoned(rawInter, interCode) || abandoned(rawRoom, code)) {
    history.replaceState(null, '', '/');
  } else if (quizCode) followQuiz(quizCode);
  else if (interCode) followInter(interCode);
  else if (code.length === 6) followInvite(code);
  else {
    const live = stored => (stored?.code && !stored.paused ? stored : null);
    const resumable = [
      live(rawQuiz) ? { kind: 'quiz', at: rawQuiz.savedAt || 0, code: rawQuiz.code } : null,
      live(rawInter) ? { kind: 'inter', at: rawInter.savedAt || 0, code: rawInter.code } : null,
      live(rawRoom) ? { kind: 'letters', at: rawRoom.savedAt || 0, code: rawRoom.code } : null
    ].filter(Boolean).sort((a, b) => b.at - a.at)[0];
    if (resumable?.kind === 'quiz') followQuiz(resumable.code, { dropFinished: true });
    else if (resumable?.kind === 'inter') followInter(resumable.code, { dropFinished: true });
    else if (resumable?.kind === 'letters') followInvite(resumable.code, { dropFinished: true });
  }
}, 620);
