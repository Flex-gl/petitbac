import { getJson, interLeaderboard, leaderboard, quizLeaderboard } from './_redis.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Méthode non prise en charge.' }), { status: 405, headers });
  try {
    const url = new URL(request.url);
    const game = url.searchParams.get('game');
    const playerId = url.searchParams.has('playerId') ? String(url.searchParams.get('playerId')).slice(0, 80) : '';
    const board = game === 'inter' ? interLeaderboard : game === 'quiz' ? quizLeaderboard : leaderboard;
    const profileKey = game === 'inter' ? `arena:inter:player:${playerId}` : game === 'quiz' ? `arena:quiz:player:${playerId}` : `arena:player:${playerId}`;
    const [top, profile] = await Promise.all([
      board(),
      playerId ? getJson(profileKey) : null
    ]);
    return new Response(JSON.stringify({ top, profile, updatedAt: Date.now() }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Classement indisponible.' }), { status: error.status || 500, headers });
  }
}
