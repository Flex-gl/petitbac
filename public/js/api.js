function traceHeaders() {
  let device = '';
  let name = '';
  try {
    device = localStorage.getItem('petitbac.deviceId') || '';
    if (!device) {
      device = crypto.randomUUID();
      localStorage.setItem('petitbac.deviceId', device);
    }
    name = localStorage.getItem('petitbac.playerName') || '';
  } catch { /* stockage fermé */ }
  return {
    ...(device ? { 'x-petitbac-device': device } : {}),
    ...(name ? { 'x-petitbac-name': encodeURIComponent(name).slice(0, 180) } : {})
  };
}

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...traceHeaders(), ...options.headers }, cache: 'no-store' });
  } catch {
    throw new Error('Connexion interrompue. Vérifie ton réseau puis réessaie.');
  }
  const body = await response.json().catch(() => ({}));
  const fallback = response.status === 504 ? 'Le serveur a mis trop de temps. Réessaie.' : `Le serveur a répondu ${response.status}.`;
  if (!response.ok) {
    if (body.banned && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('petitbac-banned'));
    throw new Error(body.error || fallback);
  }
  return body;
}

export const api = {
  game(code, playerId, signal) {
    const query = new URLSearchParams({ code, playerId });
    return request(`/api/game?${query}`, { signal });
  },
  action(data) {
    return request('/api/game', { method: 'POST', body: JSON.stringify(data) });
  },
  inter(code, playerId, signal) {
    const query = new URLSearchParams({ code, playerId });
    return request(`/api/inter?${query}`, { signal });
  },
  interAction(data) {
    return request('/api/inter', { method: 'POST', body: JSON.stringify(data) });
  },
  quiz(code, playerId, signal) {
    const query = new URLSearchParams({ code, playerId });
    return request(`/api/quiz?${query}`, { signal });
  },
  quizMeta(signal) {
    return request('/api/quiz?meta=1', { signal });
  },
  quizAction(data) {
    return request('/api/quiz', { method: 'POST', body: JSON.stringify(data) });
  },
  scores(playerId, options = {}) {
    const params = new URLSearchParams();
    if (playerId) params.set('playerId', playerId);
    if (options.game) params.set('game', options.game);
    const query = params.toString();
    return request(`/api/scores${query ? `?${query}` : ''}`, { signal: options.signal });
  },
  admin(data) {
    return request('/api/admin', {
      method: 'POST',
      headers: { 'x-admin-key': sessionStorage.getItem('petitbac.adminKey') || '' },
      body: JSON.stringify(data)
    });
  }
};
