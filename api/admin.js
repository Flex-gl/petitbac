import { interLeaderboard, leaderboard, quizLeaderboard } from './_redis.js';
import { adminKeyOk, listPresence, setBlock } from './_presence.js';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'POST') return response({ error: 'Méthode non prise en charge.' }, 405);
  try {
    const input = await request.json();
    adminKeyOk(request.headers.get('x-admin-key') || input.key || '');
    const action = String(input.action || 'overview');
    if (action === 'block' || action === 'unblock') {
      await setBlock({
        deviceId: input.deviceId,
        ip: input.ip,
        reason: input.reason,
        blocked: action === 'block'
      });
    }
    const [presence, petitbac, inter, quiz] = await Promise.all([
      listPresence(),
      leaderboard(),
      interLeaderboard(),
      quizLeaderboard()
    ]);
    return response({
      devices: presence.devices,
      blocks: presence.blocks,
      boards: { petitbac, inter, quiz },
      updatedAt: Date.now()
    });
  } catch (error) {
    return response({ error: error.message || 'Administration indisponible.' }, error.status || 500);
  }
}
