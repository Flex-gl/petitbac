import { api } from './api.js';
import { haptic, showSheet, toast } from './ui.js';
import { playCue } from './inter-audio.js';
import { interSetupScreen, interInviteScreen, interLobbyScreen, interSoloScreen, interTableScreen, interBetweenScreen, interFinalScreen, interRulesHtml } from './screens/inter.js';
import { animateTable, captureTable, launchOwnPlay, clearFlights } from './inter-motion.js';
import { celebrate, clearCelebration } from './fireworks.js';
import { showKombo, watchKombo } from './kombo.js';

function stackOrder(cards, center) {
  if (!center || cards.length < 2) return cards;
  const weight = card => {
    const sameSuit = card.suit === center.suit;
    const sameColor = Boolean(card.red) === Boolean(center.red);
    if (sameSuit && sameColor) return 0;
    if (sameSuit || sameColor) return 1;
    return 2;
  };
  return [...cards].sort((a, b) => weight(a) - weight(b));
}

const sessionKey = 'petitbac.inter.session';
const soundKey = 'petitbac.inter.sound';
const hapticKey = 'petitbac.inter.haptic';
let ctx = null;
let lastLog = '';
let lastTurn = '';
let pollTimer = null;
let pollBusy = false;
let source = null;
let acting = false;
let lastPollToast = 0;
let painted = null;
let roomEpoch = 0;

function readSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); }
  catch { return null; }
}

export function attachInter(context) { ctx = context; }
export function interPathCode() {
  const match = location.pathname.match(/^\/i\/([A-Za-z0-9]{6})\/?$/);
  return match ? match[1].toUpperCase() : '';
}
export function loadInterSession() { return readSession(); }

function prefs() {
  return { sound: localStorage.getItem(soundKey) !== '0', haptic: localStorage.getItem(hapticKey) !== '0' };
}

function remember(game, paused = false) {
  if (!game?.code || ctx.state.page !== 'inter-room') return;
  if (game.hostSecret) localStorage.setItem(`petitbac.inter.secret.${game.code}`, game.hostSecret);
  const secret = localStorage.getItem(`petitbac.inter.secret.${game.code}`) || '';
  const me = game.players?.find(player => player.id === ctx.playerId);
  localStorage.setItem(sessionKey, JSON.stringify({ code: game.code, host: game.hostId === ctx.playerId, name: me?.name || ctx.state.name, paused, savedAt: Date.now(), secret }));
}

function signature(game) {
  if (!game) return '';
  const me = game.players?.find(player => player.id === ctx.playerId);
  return [game.version, game.status, game.phase, game.round, game.turnPlayerId, game.pendingDraw, game.mustResolveDraw, game.requestedRank, game.center?.id, game.deckCount, (game.playable || []).join('.'), me?.hand?.map(card => card.id).join('.') || '', game.players.map(player => `${player.id}:${player.cardCount}:${player.ready}:${player.connected}`).join('|'), game.log?.at(-1)?.at || ''].join('~');
}

function cueFor(game) {
  const entry = game.log?.at(-1);
  if (!entry || `${entry.type}:${entry.at}` === lastLog) return;
  lastLog = `${entry.type}:${entry.at}`;
  watchKombo(game, prefs().haptic);
  const enabled = prefs();
  if (entry.type === 'PLAYER_PLAYED_CARD') {
    const joker = entry.cards?.some(card => card.rank === 'JOKER');
    playCue(joker ? 'joker' : 'play', enabled.sound);
    if (enabled.haptic) haptic(joker ? [20, 30, 20] : 12);
  } else if (entry.type === 'PLAYER_DREW_CARDS') {
    playCue(entry.reason === 'penalty' ? 'penalty' : 'draw', enabled.sound);
    if (enabled.haptic) haptic(entry.reason === 'penalty' ? [30, 40, 30] : 8);
  } else if (entry.type === 'PLAYER_WON') {
    playCue('win', enabled.sound);
    if (enabled.haptic) haptic([20, 40, 20, 40, 60]);
  } else   if (entry.type === 'PLAYER_SKIPPED' && enabled.haptic) haptic(16);
  if (game.turnPlayerId !== lastTurn) {
    lastTurn = game.turnPlayerId || '';
    if (game.yourTurn) playCue('turn', enabled.sound);
  }
}

export function stopInter() {
  clearTimeout(pollTimer);
  source?.close();
  source = null;
  pollTimer = null;
}

function schedule(delay = 700) {
  clearTimeout(pollTimer);
  if (ctx.state.page !== 'inter-room') return;
  pollTimer = setTimeout(poll, delay);
}

function applyGame(next) {
  const current = ctx.state.interGame;
  if (!next || (current && next.code === current.code && (next.version || 0) < (current.version || 0))) return;
  const changed = signature(next) !== signature(current);
  ctx.state.interGame = next;
  if (!changed) return;
  remember(next, false);
  cueFor(next);
  return ctx.render();
}

async function poll() {
  if (pollBusy || ctx.state.page !== 'inter-room') return;
  const epoch = roomEpoch;
  pollBusy = true;
  try {
    const data = await api.inter(ctx.state.code, ctx.playerId);
    if (epoch !== roomEpoch || ctx.state.page !== 'inter-room') return;
    await applyGame(data.game);
  } catch (error) {
    if (Date.now() - lastPollToast > 8000) {
      lastPollToast = Date.now();
      toast(error.message);
    }
  } finally {
    pollBusy = false;
    schedule(ctx.state.interGame?.status === 'playing' ? 500 : 1200);
  }
}

function connectStream() {
  if (source || !('EventSource' in window) || ctx.state.page !== 'inter-room') return;
  const query = new URLSearchParams({ code: ctx.state.code, playerId: ctx.playerId, stream: '1' });
  source = new EventSource(`/api/inter?${query}`);
  source.onmessage = event => {
    try {
      const next = JSON.parse(event.data).game;
      if (ctx.state.page !== 'inter-room' || !next) return;
      applyGame(next);
    } catch { /* message ignoré */ }
  };
  source.onerror = () => { source?.close(); source = null; schedule(1200); };
}

export async function openInter(game) {
  painted = null;
  ctx.state.page = 'inter-room';
  ctx.state.interGame = game;
  ctx.state.code = game.code;
  ctx.state.savedInter = null;
  remember(game, false);
  stopInter();
  history.replaceState(null, '', `/i/${encodeURIComponent(game.code)}`);
  await ctx.render();
  connectStream();
  schedule(400);
}

export async function followInter(rawCode, options = {}) {
  const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length !== 6) return;
  try {
    const data = await api.inter(code, ctx.playerId);
    const game = data.game;
    if (options.dropFinished && game.status === 'finished') {
      localStorage.removeItem(sessionKey);
      ctx.state.savedInter = null;
      return;
    }
    if (game.players.some(player => player.id === ctx.playerId)) return openInter(game);
    const stored = readSession();
    const secret = localStorage.getItem(`petitbac.inter.secret.${code}`) || (stored?.code === code ? stored.secret : '');
    if (secret) {
      try {
        const reclaimed = await api.interAction({ action: 'reclaim', code, playerId: ctx.playerId, name: ctx.state.name || undefined, hostSecret: secret });
        toast('Tu as repris le salon INTER.');
        return openInter(reclaimed.game);
      } catch (error) {
        if (game.status !== 'lobby') { toast(error.message); return; }
      }
    }
    if (game.status !== 'lobby') { toast('La partie INTER a déjà commencé.'); return; }
    ctx.state.page = 'inter-invite';
    ctx.state.code = code;
    await ctx.render();
  } catch (error) {
    if (String(error.message || '').includes('n’existe plus')) {
      const stored = readSession();
      if (stored?.code === code) localStorage.removeItem(sessionKey);
    }
    toast(error.message);
    if (ctx.state.page === 'home') ctx.render();
  }
}

export async function leaveInter(pause = true) {
  roomEpoch += 1;
  stopInter();
  painted = null;
  ctx.state.page = 'cards';
  ctx.state.interGame = null;
  ctx.state.code = '';
  ctx.state.savedInter = null;
  localStorage.removeItem(sessionKey);
  history.replaceState(null, '', '/');
  return ctx.render();
}

export function openInterRules() {
  ctx.state.sheet?.close?.();
  ctx.state.sheet = showSheet('Règles du jeu', interRulesHtml(), () => { ctx.state.sheet = null; });
}

async function run(action, extra = {}) {
  if (acting) return null;
  acting = true;
  try {
    const data = await api.interAction({ action, code: ctx.state.code, playerId: ctx.playerId, ...extra });
    if (ctx.state.page !== 'inter-room' && action !== 'join' && action !== 'create') return data.game;
    await applyGame(data.game);
    return data.game;
  } catch (error) {
    toast(error.message);
    return null;
  } finally {
    acting = false;
  }
}

export async function handleInterAction(button) {
  const action = button.dataset.action;
  if (action === 'ix-play') {
    const id = button.dataset.card;
    const game = ctx.state.interGame;
    const hand = game?.players?.find(player => player.id === ctx.playerId)?.hand || [];
    const card = hand.find(entry => entry.id === id);
    if (!card || !game.playable?.includes(id)) return;
    const sameRank = card.rank === 'JOKER'
      ? [card]
      : hand.filter(entry => entry.rank === card.rank && game.playable.includes(entry.id));
    const cards = stackOrder(sameRank, game.center);
    const cardIds = cards.map(entry => entry.id);
    if (card.rank === '2' || card.rank === '10' || card.rank === 'JOKER') showKombo(card.rank, { count: cards.length, buzz: prefs().haptic });
    const cancelFlight = launchOwnPlay(cards);
    const played = await run('play', { cardIds });
    if (!played) cancelFlight();
    return played;
  }
  if (action === 'ix-draw') return run('draw');
  if (action === 'ix-pass') return run('pass');
  if (action === 'ix-choose') return run('choose', { rank: button.dataset.rank });
  if (action === 'ix-announce') return run('announce');
  if (action === 'ix-ready') return run('ready');
  if (action === 'ix-start') return run('start');
  if (action === 'ix-abandon') return run('abandon');
  if (action === 'ix-continue') return run('continue');
  if (action === 'ix-finish') return run('finish');
  if (action === 'ix-leave') return leaveInter(true);
  if (action === 'ix-rules') return openInterRules();
  if (action === 'ix-sound') {
    localStorage.setItem(soundKey, prefs().sound ? '0' : '1');
    toast(prefs().sound ? 'Son activé' : 'Son coupé');
    return;
  }
  if (action === 'ix-haptic') {
    localStorage.setItem(hapticKey, prefs().haptic ? '0' : '1');
    toast(prefs().haptic ? 'Vibrations activées' : 'Vibrations coupées');
    return;
  }
  if (action === 'ix-copy') {
    const game = ctx.state.interGame;
    const value = button.dataset.copy === 'link' ? `${location.origin}/i/${game?.code}` : game?.code;
    try { await navigator.clipboard.writeText(value); toast('Copié'); }
    catch { toast(value); }
  }
}

export async function submitInterCreate(form) {
  const name = String(form.elements.name.value || '').trim();
  const errorNode = form.querySelector('[data-form-error]');
  if (name.length < 2) { errorNode.textContent = 'Entre un pseudo ou un nom d’au moins deux lettres.'; return; }
  const maxPlayers = Number(document.querySelector('[data-choice="maxPlayers"] .segment[aria-pressed="true"]')?.dataset.value || 4);
  ctx.state.name = name;
  localStorage.setItem('petitbac.playerName', name);
  form.querySelector('[type="submit"]').disabled = true;
  try {
    const data = await api.interAction({ action: 'create', playerId: ctx.playerId, name, maxPlayers, initialHand: 4 });
    await openInter(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

export async function submitInterSolo(form) {
  const name = String(form.elements.name.value || '').trim();
  const errorNode = form.querySelector('[data-form-error]');
  const level = document.querySelector('[data-choice="level"] .segment[aria-pressed="true"]')?.dataset.value || 'medium';
  if (name.length < 2) { errorNode.textContent = 'Entre un pseudo ou un nom d’au moins deux lettres.'; return; }
  ctx.state.name = name;
  localStorage.setItem('petitbac.playerName', name);
  form.querySelector('[type="submit"]').disabled = true;
  try {
    const data = await api.interAction({ action: 'solo', playerId: ctx.playerId, name, level });
    await openInter(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

export async function submitInterJoin(form) {
  const name = String(form.elements.name.value || '').trim();
  const code = String(form.elements.code.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const errorNode = form.querySelector('[data-form-error]');
  if (name.length < 2) { errorNode.textContent = 'Entre un pseudo ou un nom d’au moins deux lettres.'; return; }
  if (code.length !== 6) { errorNode.textContent = 'Le code doit contenir six caractères.'; return; }
  ctx.state.name = name;
  localStorage.setItem('petitbac.playerName', name);
  form.querySelector('[type="submit"]').disabled = true;
  try {
    const data = await api.interAction({ action: 'join', playerId: ctx.playerId, name, code });
    ctx.state.sheet?.close?.();
    await openInter(data.game);
  } catch (error) {
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

export async function renderInter(root) {
  const game = ctx.state.interGame;
  if (!game || game.status !== 'playing') clearFlights();
  const previous = painted;
  const before = document.querySelector('.inter-table') ? captureTable() : null;
  const continuous = previous?.status === 'playing' && game?.status === 'playing' && previous.code === game?.code;
  const dealt = previous && previous.code === game?.code && previous.status !== 'playing' && game?.status === 'playing';
  if (ctx.state.page === 'inter-setup') root.innerHTML = interSetupScreen(ctx.state.name);
  else if (ctx.state.page === 'inter-solo') root.innerHTML = interSoloScreen(ctx.state.name);
  else if (ctx.state.page === 'inter-invite') root.innerHTML = interInviteScreen(ctx.state.code);
  else if (!game) root.innerHTML = interSetupScreen(ctx.state.name);
  else if (game.status === 'lobby') root.innerHTML = interLobbyScreen(game, ctx.playerId);
  else if (game.status === 'between') root.innerHTML = interBetweenScreen(game, ctx.playerId);
  else if (game.status === 'finished') root.innerHTML = interFinalScreen(game);
  else root.innerHTML = interTableScreen(game, ctx.playerId, { enter: !(continuous || dealt) });
  if (game?.status === 'playing') animateTable(before, previous, game, ctx.playerId);
  if (game && (game.status === 'between' || game.status === 'finished')) celebrate(`${game.code}:${game.status}:${game.round}`, { finale: game.status === 'finished' });
  else clearCelebration();
  painted = game || null;
}
