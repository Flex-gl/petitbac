import { api } from './api.js';
import { celebrate, clearCelebration } from './fireworks.js';
import { showSheet, toast } from './ui.js';
import { quizAdminScreen, quizDoorScreen, quizFinalScreen, quizInviteScreen, quizLobbyScreen, quizRulesHtml, quizSetupScreen, quizTableScreen } from './screens/quiz.js';

const sessionKey = 'petitbac.quiz.session';
const adminKey = 'petitbac.quiz.admin';
let ctx = null;
let pollTimer = null;
let pollBusy = false;
let source = null;
let acting = false;
let lastPollToast = 0;
let roomEpoch = 0;
let clockOffset = 0;
let tickTimer = null;
let admin = blankAdmin();

function blankAdmin() {
  return { page: 1, q: '', categorie: '', difficulte: '', notice: '', editing: null, summary: null, questions: [], pages: 1, total: 0 };
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); }
  catch { return null; }
}

export function attachQuiz(context) { ctx = context; }
export function quizPathCode() {
  const match = location.pathname.match(/^\/q\/([A-Za-z0-9]{6})\/?$/);
  return match ? match[1].toUpperCase() : '';
}
export function loadQuizSession() { return readSession(); }

function choice(name, fallback) {
  return document.querySelector(`[data-choice="${name}"] .segment[aria-pressed="true"]`)?.dataset.value || fallback;
}

function remember(game, paused = false) {
  if (!game?.code || ctx.state.page !== 'quiz-room') return;
  if (game.hostSecret) localStorage.setItem(`petitbac.quiz.secret.${game.code}`, game.hostSecret);
  const secret = localStorage.getItem(`petitbac.quiz.secret.${game.code}`) || '';
  const me = game.players?.find(player => player.id === ctx.playerId);
  localStorage.setItem(sessionKey, JSON.stringify({ code: game.code, host: game.hostId === ctx.playerId, name: me?.name || ctx.state.name, paused, savedAt: Date.now(), secret }));
}

function signature(game) {
  if (!game) return '';
  return [
    game.status,
    game.question?.index || 0,
    game.question?.locked ? 1 : 0,
    game.question?.verdict || '',
    game.flash?.cursor ?? '',
    game.players.map(player => `${player.id}:${player.score}:${player.locked}:${player.abandoned}:${player.name}`).join('|'),
    (game.standings || []).map(row => row.score).join('.')
  ].join('~');
}

let colorHold = 0;

function paintChoice(flash) {
  const button = document.querySelector(`[data-action="qz-answer"][data-cursor="${flash.cursor}"][data-choice="${'ABCD'.indexOf(flash.choice)}"]`);
  if (!button) return false;
  button.classList.add(flash.good ? 'is-good' : 'is-bad');
  document.querySelectorAll('[data-action="qz-answer"]').forEach(node => { node.disabled = true; });
  return true;
}

export function stopQuiz() {
  clearTimeout(pollTimer);
  clearInterval(tickTimer);
  source?.close();
  source = null;
  pollTimer = null;
  tickTimer = null;
}

function schedule(delay = 700) {
  clearTimeout(pollTimer);
  if (ctx.state.page !== 'quiz-room') return;
  pollTimer = setTimeout(poll, delay);
}

function applyGame(next, options = {}) {
  const current = ctx.state.quizGame;
  if (!next || (current && next.code === current.code && (next.version || 0) < (current.version || 0))) return;
  if (Number.isFinite(next.serverNow)) clockOffset = next.serverNow - Date.now();
  const changed = signature(next) !== signature(current);
  const flash = next.flash;
  const showing = document.querySelector('[data-action="qz-answer"]');
  const moved = !current?.question || !next.question || next.question.index !== current.question.index || next.status === 'finished';
  if (!options.now && flash && showing && String(showing.dataset.cursor) === String(flash.cursor) && moved && Date.now() >= colorHold) {
    paintChoice(flash);
    colorHold = Date.now() + 280;
    ctx.state.quizGame = next;
    setTimeout(() => applyGame(ctx.state.quizGame, { now: true }), 280);
    return;
  }
  if (!options.now && Date.now() < colorHold) {
    ctx.state.quizGame = next;
    return;
  }
  ctx.state.quizGame = next;
  if (!changed && !options.now) return;
  remember(next, false);
  if (next.status !== 'finished') ctx.state.quizDetail = false;
  return ctx.render();
}

async function poll() {
  if (pollBusy || ctx.state.page !== 'quiz-room') return;
  const epoch = roomEpoch;
  pollBusy = true;
  try {
    const data = await api.quiz(ctx.state.code, ctx.playerId);
    if (epoch !== roomEpoch || ctx.state.page !== 'quiz-room') return;
    await applyGame(data.game);
  } catch (error) {
    if (Date.now() - lastPollToast > 8000) {
      lastPollToast = Date.now();
      toast(error.message);
    }
  } finally {
    pollBusy = false;
    const status = ctx.state.quizGame?.status;
    schedule(status === 'playing' || status === 'reveal' ? 450 : 1400);
  }
}

function connectStream() {
  if (source || !('EventSource' in window) || ctx.state.page !== 'quiz-room') return;
  const query = new URLSearchParams({ code: ctx.state.code, playerId: ctx.playerId, stream: '1' });
  source = new EventSource(`/api/quiz?${query}`);
  source.onmessage = event => {
    try {
      const next = JSON.parse(event.data).game;
      if (ctx.state.page !== 'quiz-room' || !next) return;
      applyGame(next);
    } catch { /* message ignoré */ }
  };
  source.onerror = () => { source?.close(); source = null; schedule(1200); };
}

function armTimer() {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    const node = document.querySelector('[data-qz-closes]');
    if (!node) return;
    const left = Math.max(0, Math.ceil((Number(node.dataset.qzCloses) - (Date.now() + clockOffset)) / 1000));
    const label = node.querySelector('[data-qz-left]');
    if (label) label.textContent = String(left).padStart(2, '0');
    node.classList.toggle('is-low', left <= 3 && left > 0);
  }, 200);
}

export async function openQuiz(game) {
  ctx.state.page = 'quiz-room';
  ctx.state.gameMode = 'quiz';
  ctx.state.quizGame = game;
  ctx.state.code = game.code;
  ctx.state.savedQuiz = null;
  ctx.state.quizDetail = false;
  remember(game, false);
  stopQuiz();
  history.replaceState(null, '', `/q/${encodeURIComponent(game.code)}`);
  await ctx.render();
  connectStream();
  schedule(350);
  armTimer();
}

export async function followQuiz(rawCode, options = {}) {
  const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length !== 6) return;
  try {
    const data = await api.quiz(code, ctx.playerId);
    const game = data.game;
    if (options.dropFinished && game.status === 'finished') {
      localStorage.removeItem(sessionKey);
      ctx.state.savedQuiz = null;
      return;
    }
    if (game.players.some(player => player.id === ctx.playerId)) return openQuiz(game);
    const stored = readSession();
    const secret = localStorage.getItem(`petitbac.quiz.secret.${code}`) || (stored?.code === code ? stored.secret : '');
    if (secret) {
      try {
        const reclaimed = await api.quizAction({ action: 'reclaim', code, playerId: ctx.playerId, name: ctx.state.name || undefined, hostSecret: secret });
        toast('Tu as repris le salon Quiz Battle.');
        return openQuiz(reclaimed.game);
      } catch (error) {
        if (game.status !== 'lobby') { toast(error.message); return; }
      }
    }
    if (game.status !== 'lobby') { toast('La partie Quiz Battle a déjà commencé.'); return; }
    ctx.state.page = 'quiz-invite';
    ctx.state.code = code;
    ctx.state.gameMode = 'quiz';
    await ctx.render();
  } catch (error) {
    if (String(error.message || '').includes('n’existe plus')) {
      const stored = readSession();
      if (stored?.code === code) localStorage.removeItem(sessionKey);
    }
    toast(error.message);
  }
}

export async function leaveQuiz(pause = true) {
  roomEpoch += 1;
  stopQuiz();
  ctx.state.page = pause ? 'quiz-door' : 'home';
  ctx.state.quizGame = null;
  ctx.state.code = '';
  ctx.state.savedQuiz = null;
  localStorage.removeItem(sessionKey);
  history.replaceState(null, '', '/');
  return ctx.render();
}

export function openQuizRules() {
  ctx.state.sheet?.close?.();
  ctx.state.sheet = showSheet('Règles de Quiz Battle', quizRulesHtml(), () => { ctx.state.sheet = null; });
}

export function openQuizJoin() {
  const inner = `<form id="quiz-join" novalidate><label class="field"><span class="field-label">Pseudo ou nom complet</span><input class="text-input" name="name" maxlength="40" minlength="2" autocomplete="name" placeholder="Ex. Alex Martin" value="${escName()}" required></label><label class="field"><span class="field-label">Code de la salle</span><input class="text-input" name="code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" required style="text-transform:uppercase;letter-spacing:.16em;font-weight:800"></label><div class="error-note" data-form-error role="status"></div><button class="btn btn-primary btn-full" type="submit">Entrer dans le salon ${''}</button></form>`;
  ctx.state.sheet = showSheet('Rejoindre Quiz Battle', inner, () => { ctx.state.sheet = null; });
}

function escName() {
  return String(ctx.state.name || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function run(action, extra = {}) {
  if (acting) return null;
  acting = true;
  try {
    const data = await api.quizAction({ action, code: ctx.state.code, playerId: ctx.playerId, ...extra });
    if (ctx.state.page === 'quiz-room') await applyGame(data.game);
    return data.game;
  } catch (error) {
    toast(error.message);
    return null;
  } finally {
    acting = false;
  }
}

async function ensureMeta() {
  if (ctx.state.quizMeta) return ctx.state.quizMeta;
  try {
    const data = await api.quizMeta();
    ctx.state.quizMeta = data.meta;
  } catch { ctx.state.quizMeta = null; }
  return ctx.state.quizMeta;
}

export async function openQuizSetup(solo = false) {
  ctx.state.page = 'quiz-setup';
  ctx.state.quizSolo = Boolean(solo);
  ctx.state.gameMode = 'quiz';
  ctx.render();
  if (ctx.state.quizMeta) return;
  const meta = await ensureMeta();
  if (!meta || ctx.state.page !== 'quiz-setup' || ctx.state.quizSolo !== Boolean(solo)) return;
  const form = document.getElementById('quiz-create');
  if (form && document.activeElement && form.contains(document.activeElement)) return;
  return ctx.render();
}

export async function submitQuizCreate(form) {
  const name = String(form.elements.name.value || '').trim();
  const errorNode = form.querySelector('[data-form-error]');
  if (name.length < 2) { errorNode.textContent = 'Entre un pseudo ou un nom d’au moins deux lettres.'; return; }
  ctx.state.name = name;
  localStorage.setItem('petitbac.playerName', name);
  form.querySelector('[type="submit"]').disabled = true;
  try {
    const data = await api.quizAction({
      action: ctx.state.quizSolo ? 'solo' : 'create',
      playerId: ctx.playerId,
      name,
      questions: Number(choice('questions', 10)),
      difficulty: choice('difficulty', 'toutes'),
      category: form.elements.category.value || 'toutes',
      seconds: Number(choice('seconds', 10)),
      maxPlayers: ctx.state.quizSolo ? 1 : Number(choice('maxPlayers', 20))
    });
    await openQuiz(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

export async function submitQuizJoin(form) {
  const name = String(form.elements.name.value || '').trim();
  const code = String(form.elements.code.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const errorNode = form.querySelector('[data-form-error]');
  if (name.length < 2) { errorNode.textContent = 'Entre un pseudo ou un nom d’au moins deux lettres.'; return; }
  if (code.length !== 6) { errorNode.textContent = 'Le code doit contenir six caractères.'; return; }
  ctx.state.name = name;
  localStorage.setItem('petitbac.playerName', name);
  form.querySelector('[type="submit"]').disabled = true;
  try {
    const data = await api.quizAction({ action: 'join', playerId: ctx.playerId, name, code });
    ctx.state.sheet?.close?.();
    await openQuiz(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

function adminKeyValue() {
  return sessionStorage.getItem(adminKey) || '';
}

async function loadAdmin() {
  const key = adminKeyValue();
  if (!key) return;
  const data = await api.quizAction({ action: 'admin-list', key, q: admin.q, categorie: admin.categorie, difficulte: admin.difficulte, page: admin.page });
  admin.summary = data.summary;
  admin.questions = data.questions || [];
  admin.page = data.page || 1;
  admin.pages = data.pages || 1;
  admin.total = data.total || 0;
}

export async function openQuizAdmin() {
  ctx.state.page = 'quiz-admin';
  ctx.state.gameMode = 'quiz';
  try { await loadAdmin(); }
  catch (error) { admin.notice = error.message; }
  return ctx.render();
}

export async function submitQuizKey(form) {
  const key = String(form.elements.key.value || '').trim();
  if (key) sessionStorage.setItem(adminKey, key);
  try {
    await loadAdmin();
    admin.notice = admin.summary ? `${admin.summary.active} questions jouables.` : '';
  } catch (error) {
    admin.notice = error.message;
  }
  return ctx.render();
}

export async function submitQuizFilter(form) {
  admin.q = String(form.elements.q.value || '');
  admin.categorie = String(form.elements.categorie.value || '');
  admin.difficulte = String(form.elements.difficulte.value || '');
  admin.page = 1;
  admin.editing = null;
  try { await loadAdmin(); admin.notice = ''; }
  catch (error) { admin.notice = error.message; }
  return ctx.render();
}

export async function submitQuizEdit(form) {
  const errorNode = form.querySelector('[data-form-error]');
  const payload = {
    action: 'admin-save',
    key: adminKeyValue(),
    id: form.elements.id.value,
    categorie: form.elements.categorie.value,
    difficulte: form.elements.difficulte.value,
    question: form.elements.question.value,
    reponse_correcte: form.elements.reponse_correcte.value,
    option_a: form.elements.option_a.value,
    option_b: form.elements.option_b.value,
    option_c: form.elements.option_c.value,
    option_d: form.elements.option_d.value,
    explication: form.elements.explication.value,
    actif: 1
  };
  try {
    await api.quizAction(payload);
    admin.editing = null;
    admin.notice = 'Question enregistrée.';
    await loadAdmin();
    return ctx.render();
  } catch (error) {
    errorNode.textContent = error.message;
  }
}

export async function submitQuizImport(form) {
  const errorNode = form.querySelector('[data-form-error]');
  const file = form.elements.file.files?.[0];
  if (!file) { errorNode.textContent = 'Choisis un fichier CSV.'; return; }
  const csv = await file.text();
  form.querySelector('[type="submit"]').disabled = true;
  try {
    const result = await api.quizAction({ action: 'admin-import', key: adminKeyValue(), csv });
    admin.notice = `${result.imported} importée${result.imported > 1 ? 's' : ''} · ${result.duplicates} doublon${result.duplicates > 1 ? 's' : ''} ignoré${result.duplicates > 1 ? 's' : ''} · ${result.inactive} inactive${result.inactive > 1 ? 's' : ''}${result.errors?.length ? ` · ${result.errors.length} erreur${result.errors.length > 1 ? 's' : ''}` : ''}.`;
    await loadAdmin();
    return ctx.render();
  } catch (error) {
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

export async function handleQuizAction(button) {
  const action = button.dataset.action;
  if (action === 'qz-setup') return openQuizSetup(false);
  if (action === 'qz-solo') return openQuizSetup(true);
  if (action === 'qz-join') return openQuizJoin();
  if (action === 'qz-admin') return openQuizAdmin();
  if (action === 'qz-rules') return openQuizRules();
  if (action === 'qz-leave') return leaveQuiz(true);
  if (action === 'qz-hub') return leaveQuiz(false);
  if (action === 'qz-quit') {
    try { await api.quizAction({ action: 'drop', code: ctx.state.code, playerId: ctx.playerId }); }
    catch { /* la sortie locale suffit */ }
    return leaveQuiz(true);
  }
  if (action === 'qz-restart') return run('restart');
  if (action === 'qz-detail') {
    ctx.state.quizDetail = !ctx.state.quizDetail;
    return ctx.render();
  }
  if (action === 'qz-start') return run('start');
  if (action === 'qz-rematch') return run('rematch');
  if (action === 'qz-answer') {
    if (button.disabled) return;
    button.disabled = true;
    const saved = await run('answer', { choice: Number(button.dataset.choice), cursor: Number(button.dataset.cursor) });
    if (!saved && button.isConnected) button.disabled = false;
    return;
  }
  if (action === 'qz-copy') {
    const game = ctx.state.quizGame;
    const value = `${location.origin}/q/${game?.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Quiz Battle', text: `Rejoins le salon ${game?.code}`, url: value });
      else { await navigator.clipboard.writeText(value); toast('Lien copié'); }
    } catch (error) {
      if (error?.name !== 'AbortError') toast(value);
    }
    return;
  }
  if (action === 'qz-page') {
    admin.page = Number(button.dataset.page) || 1;
    try { await loadAdmin(); } catch (error) { admin.notice = error.message; }
    return ctx.render();
  }
  if (action === 'qz-edit') {
    admin.editing = admin.questions.find(question => question.id === button.dataset.id) || null;
    return ctx.render();
  }
  if (action === 'qz-toggle' || action === 'qz-remove') {
    try {
      await api.quizAction({ action: action === 'qz-toggle' ? 'admin-toggle' : 'admin-remove', key: adminKeyValue(), id: button.dataset.id });
      admin.notice = action === 'qz-toggle' ? 'Question mise à jour.' : 'Question retirée de la banque jouable.';
      await loadAdmin();
    } catch (error) { admin.notice = error.message; }
    return ctx.render();
  }
}

export async function renderQuiz(root) {
  const game = ctx.state.quizGame;
  if (ctx.state.page === 'quiz-door') root.innerHTML = quizDoorScreen({ top: ctx.state.quizTop, scoresState: ctx.state.scoresState, online: ctx.state.online, profile: ctx.state.quizProfile });
  else if (ctx.state.page === 'quiz-setup') root.innerHTML = quizSetupScreen(ctx.state.name, ctx.state.quizMeta, ctx.state.quizSolo);
  else if (ctx.state.page === 'quiz-invite') root.innerHTML = quizInviteScreen(ctx.state.code);
  else if (ctx.state.page === 'quiz-admin') root.innerHTML = quizAdminScreen(admin);
  else if (!game) root.innerHTML = quizSetupScreen(ctx.state.name, ctx.state.quizMeta, ctx.state.quizSolo);
  else if (game.status === 'lobby') root.innerHTML = quizLobbyScreen(game, ctx.playerId);
  else if (game.status === 'finished') root.innerHTML = quizFinalScreen(game, ctx.playerId, ctx.state.quizDetail);
  else root.innerHTML = quizTableScreen(game);
  if (ctx.state.page === 'quiz-room' && game?.status === 'finished') celebrate(`quiz:${game.code}`, { finale: true });
  else if (ctx.state.page === 'quiz-room') clearCelebration();
  armTimer();
}
