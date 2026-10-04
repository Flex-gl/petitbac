import { api } from './api.js';
import { adminScreen } from './screens/admin.js';

const keyName = 'petitbac.adminKey';
let ctx = null;
const desk = { unlocked: false, devices: [], boards: {}, tab: 'people', filter: 'players', query: '', notice: '', openKey: '', openId: '', shown: 6 };

export function attachAdmin(context) {
  ctx = context;
}

export function renderAdmin(root) {
  root.innerHTML = adminScreen(desk);
}

export function submitAdminSearch(form) {
  desk.query = form.elements.q.value;
  desk.openKey = '';
  desk.openId = '';
  desk.shown = 6;
  return ctx.render();
}

export async function submitAdminKey(form) {
  const errorNode = form.querySelector('[data-form-error]');
  const key = form.elements.key.value.trim();
  if (key.length < 4) { errorNode.textContent = 'Entre la clé d’administration.'; return; }
  sessionStorage.setItem(keyName, key);
  form.querySelector('[type="submit"]').disabled = true;
  try {
    await loadAdmin();
  } catch (error) {
    sessionStorage.removeItem(keyName);
    errorNode.textContent = error.message;
    form.querySelector('[type="submit"]').disabled = false;
  }
}

export async function handleAdminAction(button) {
  const action = button.dataset.action;
  if (action === 'adm-home') {
    ctx.state.page = 'home';
    history.replaceState(null, '', '/');
    return ctx.render();
  }
  if (action === 'adm-tab') {
    desk.tab = button.dataset.tab || 'people';
    desk.openKey = '';
    desk.openId = '';
    desk.shown = 6;
    return ctx.render();
  }
  if (action === 'adm-filter') {
    desk.filter = button.dataset.filter || 'players';
    desk.openKey = '';
    desk.openId = '';
    desk.shown = 6;
    return ctx.render();
  }
  if (action === 'adm-more') {
    desk.shown += 6;
    return ctx.render();
  }
  if (action === 'adm-open') {
    const key = button.dataset.id || '';
    desk.openKey = desk.openKey === key ? '' : key;
    desk.openId = '';
    return ctx.render();
  }
  if (action === 'adm-device') {
    desk.openId = desk.openId === button.dataset.id ? '' : button.dataset.id;
    return ctx.render();
  }
  if (action === 'adm-block' || action === 'adm-unblock' || action === 'adm-block-ip' || action === 'adm-unblock-ip') {
    const scope = button.closest('.adm-phone') || button.closest('.adm-group-foot');
    const reason = scope?.querySelector('[data-reason]')?.value || '';
    button.disabled = true;
    try {
      await api.admin({
        action: action.includes('unblock') ? 'unblock' : 'block',
        deviceId: button.dataset.id || '',
        ip: button.dataset.ip || '',
        reason
      });
      const notice = action.includes('unblock') ? 'Accès rouvert.' : 'Accès fermé.';
      await loadAdmin();
      desk.notice = notice;
      return ctx.render();
    } catch (error) {
      desk.notice = error.message;
      button.disabled = false;
      return ctx.render();
    }
  }
}

async function loadAdmin() {
  const data = await api.admin({ action: 'overview' });
  desk.unlocked = true;
  desk.devices = data.devices || [];
  desk.boards = data.boards || {};
  desk.notice = '';
  ctx.state.page = 'admin';
  return ctx.render();
}

export async function openAdmin() {
  ctx.state.page = 'admin';
  if (!sessionStorage.getItem(keyName)) return ctx.render();
  try { await loadAdmin(); }
  catch (error) {
    sessionStorage.removeItem(keyName);
    desk.unlocked = false;
    desk.notice = error.message;
    return ctx.render();
  }
}
