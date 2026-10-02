import { getJson, interLeaderboard, leaderboard } from './_redis.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Méthode non prise en charge.' }), { status: 405, headers });
  try {
    const url = new URL(request.url);
    const inter = url.searchParams.get('game') === 'inter';
    const playerId = url.searchParams.has('playerId') ? String(url.searchParams.get('playerId')).slice(0, 80) : '';
    const [top, profile] = await Promise.all([
      inter ? interLeaderboard() : leaderboard(),
      playerId ? getJson(inter ? `arena:inter:player:${playerId}` : `arena:player:${playerId}`) : null
    ]);
    return new Response(JSON.stringify({ top, profile, updatedAt: Date.now() }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Classement indisponible.' }), { status: error.status || 500, headers });
  }
}
