import { getJson, leaderboard } from './_redis.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Méthode non prise en charge.' }), { status: 405, headers });
  try {
    const url = new URL(request.url);
    const [top, profile] = await Promise.all([
      leaderboard(),
      url.searchParams.has('playerId') ? getJson(`arena:player:${String(url.searchParams.get('playerId')).slice(0, 80)}`) : null
    ]);
    return new Response(JSON.stringify({ top, profile, updatedAt: Date.now() }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Classement indisponible.' }), { status: error.status || 500, headers });
  }
}
