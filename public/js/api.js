async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, cache: 'no-store' });
  } catch {
    throw new Error('Connexion interrompue. Vérifie ton réseau puis réessaie.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Le serveur a répondu ${response.status}.`);
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
  scores(playerId, signal) {
    const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
    return request(`/api/scores${query}`, { signal });
  }
};
