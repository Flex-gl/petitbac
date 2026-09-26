const UPDATE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local current = cjson.decode(raw)
if tonumber(current.version or 0) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

const RECORD_SCRIPT = `
if redis.call('SET', KEYS[1], '1', 'NX', 'EX', 31536000) == false then return 0 end
local players = cjson.decode(ARGV[1])
local winners = cjson.decode(ARGV[2])
local playedAt = ARGV[3]
for _, player in ipairs(players) do
  local key = 'arena:player:' .. player.id
  local raw = redis.call('GET', key)
  local stat = raw and cjson.decode(raw) or { id = player.id, totalScore = 0, games = 0, wins = 0, bestScore = 0 }
  local score = tonumber(player.score or 0)
  stat.name = player.name
  stat.totalScore = tonumber(stat.totalScore or 0) + score
  stat.games = tonumber(stat.games or 0) + 1
  stat.wins = tonumber(stat.wins or 0) + (winners[player.id] and 1 or 0)
  stat.bestScore = math.max(tonumber(stat.bestScore or 0), score)
  stat.lastPlayed = playedAt
  redis.call('SET', key, cjson.encode(stat))
  redis.call('ZADD', 'arena:leaderboard', stat.totalScore, player.id)
end
return 1
`;

function configuration() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const error = new Error('Le serveur de jeu n’est pas configuré : ajoutez les variables Upstash REST dans Vercel.');
    error.status = 503;
    throw error;
  }
  return { url: url.replace(/\/$/, ''), token };
}

export async function redis(...command) {
  const { url, token } = configuration();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const error = new Error(body.error || `Redis a répondu ${response.status}.`);
    error.status = 502;
    throw error;
  }
  return body.result;
}

export async function getJson(key) {
  const value = await redis('GET', key);
  return value ? JSON.parse(value) : null;
}

export async function createIfAbsent(key, value, ttl) {
  return (await redis('SET', key, JSON.stringify(value), 'EX', String(ttl), 'NX')) === 'OK';
}

export async function updateVersioned(key, current, next, ttl) {
  return Number(await redis('EVAL', UPDATE_SCRIPT, '1', key, String(current.version || 0), JSON.stringify({ ...next, version: (current.version || 0) + 1 }), String(ttl))) === 1;
}

export async function recordResults(game) {
  const totals = game.players.map(player => ({ id: player.id, name: player.name, score: player.score || 0 }));
  const highest = Math.max(...totals.map(player => player.score), 0);
  const winners = Object.fromEntries(totals.filter(player => player.score === highest).map(player => [player.id, true]));
  await redis('EVAL', RECORD_SCRIPT, '1', `arena:recorded:${game.code}:${game.matchId}`, JSON.stringify(totals), JSON.stringify(winners), new Date().toISOString());
}

export async function leaderboard() {
  const ids = await redis('ZREVRANGE', 'arena:leaderboard', '0', '9');
  if (!ids?.length) return [];
  const stats = await Promise.all(ids.map(id => getJson(`arena:player:${id}`)));
  return stats.filter(Boolean).map((stat, index) => ({ ...stat, rank: index + 1 }));
}

export { configuration };

// Si Vercel indexe les modules utilitaires comme routes, ils restent fermés.
export const config = { runtime: 'edge' };
export default function handler() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
