import { getJson, redis } from './_redis.js';
import { cleanDeviceId, clientAddress, deviceLabel, gameFromPath, legacyId, mergeDevice, placeFrom, shouldWrite } from '../games/admin/trace.js';

const BLOCKS_KEY = 'arena:blocks';
const DEVICE_INDEX = 'arena:devices';
const CACHE_MS = 10000;
const WRITE_GAP_MS = 120000;

let blockCache = { at: 0, devices: {}, ips: {} };
const recentWrites = new Map();

function headerMap(request) {
  const headers = {};
  request.headers.forEach((value, key) => { headers[key] = value; });
  return headers;
}

function readName(request) {
  const raw = request.headers.get('x-petitbac-name') || '';
  try { return decodeURIComponent(raw).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 40); }
  catch { return ''; }
}

export function readSight(request, now = Date.now()) {
  const headers = headerMap(request);
  const url = new URL(request.url);
  const ip = clientAddress(headers['x-forwarded-for'] || headers['x-real-ip'] || '');
  const place = placeFrom(headers);
  const label = deviceLabel(headers['user-agent'] || '');
  const given = cleanDeviceId(headers['x-petitbac-device']);
  return {
    id: given || legacyId(ip, headers['user-agent'] || ''),
    playerId: String(url.searchParams.get('playerId') || '').slice(0, 80),
    name: readName(request),
    ip,
    ...place,
    ...label,
    game: gameFromPath(url.pathname),
    at: now
  };
}

async function blocks(now = Date.now()) {
  if (now - blockCache.at < CACHE_MS) return blockCache;
  const stored = await getJson(BLOCKS_KEY);
  blockCache = {
    at: now,
    devices: stored?.devices && typeof stored.devices === 'object' ? stored.devices : {},
    ips: stored?.ips && typeof stored.ips === 'object' ? stored.ips : {}
  };
  return blockCache;
}

function forgetBlocks() {
  blockCache = { at: 0, devices: {}, ips: {} };
}

export async function guard(request) {
  try {
    const sight = readSight(request);
    if (request.method === 'POST') {
      const body = await request.clone().json().catch(() => ({}));
      if (!sight.playerId && body?.playerId) sight.playerId = String(body.playerId).slice(0, 80);
      if (!sight.name && body?.name) sight.name = String(body.name).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 40);
    }
    const current = await blocks();
    if (current.devices[sight.id] || (sight.ip && current.ips[sight.ip])) {
      const error = new Error('Cet appareil est bloqué. Tu ne peux plus jouer.');
      error.status = 403;
      error.banned = true;
      throw error;
    }
    await remember(sight);
  } catch (error) {
    if (error?.banned) throw error;
  }
}

async function remember(sight) {
  const stamp = `${sight.ip}|${sight.city}|${sight.game}|${sight.name}`;
  const previous = recentWrites.get(sight.id);
  if (previous && sight.at - previous.at < WRITE_GAP_MS && previous.stamp === stamp) return;
  const stored = await getJson(`arena:device:${sight.id}`);
  if (!shouldWrite(stored, sight, sight.at, WRITE_GAP_MS)) {
    recentWrites.set(sight.id, { at: sight.at, stamp });
    return;
  }
  const next = mergeDevice(stored, sight, sight.at);
  await redis('SET', `arena:device:${sight.id}`, JSON.stringify(next));
  await redis('ZADD', DEVICE_INDEX, String(sight.at), sight.id);
  const count = Number(await redis('ZCARD', DEVICE_INDEX));
  if (count > 400) await redis('ZREMRANGEBYRANK', DEVICE_INDEX, '0', String(count - 401));
  recentWrites.set(sight.id, { at: sight.at, stamp });
}

function sameKey(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export function adminKeyOk(value) {
  const expected = process.env.ADMIN_KEY || process.env.QUIZ_ADMIN_KEY || '';
  if (!expected) {
    const error = new Error('Définis ADMIN_KEY dans Vercel pour ouvrir l’administration.');
    error.status = 503;
    throw error;
  }
  if (!sameKey(value, expected)) {
    const error = new Error('Clé d’administration refusée.');
    error.status = 401;
    throw error;
  }
}

async function saveBlocks(next) {
  await redis('SET', BLOCKS_KEY, JSON.stringify(next));
  forgetBlocks();
}

export async function listPresence() {
  const [ids, current] = await Promise.all([
    redis('ZREVRANGE', DEVICE_INDEX, '0', '199'),
    blocks(Date.now())
  ]);
  const list = Array.isArray(ids) ? ids : [];
  const raw = list.length ? await redis('MGET', ...list.map(id => `arena:device:${id}`)) : [];
  const devices = (Array.isArray(raw) ? raw : []).map(item => {
    if (!item) return null;
    try { return JSON.parse(item); }
    catch { return null; }
  }).filter(Boolean).map(device => ({
    ...device,
    blocked: Boolean(current.devices[device.id]),
    blockReason: current.devices[device.id]?.reason || '',
    ipBlocked: Boolean(device.ip && current.ips[device.ip]),
    ipReason: device.ip ? current.ips[device.ip]?.reason || '' : ''
  }));
  return {
    devices,
    blocks: {
      devices: Object.keys(current.devices).length,
      ips: Object.keys(current.ips).length
    }
  };
}

export async function setBlock({ deviceId = '', ip = '', reason = '', blocked }) {
  const current = await getJson(BLOCKS_KEY) || { devices: {}, ips: {} };
  const devices = { ...(current.devices || {}) };
  const ips = { ...(current.ips || {}) };
  const note = { at: Date.now(), reason: String(reason || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 80) };
  const id = cleanDeviceId(deviceId);
  const address = clientAddress(ip);
  if (id) {
    if (blocked) devices[id] = note;
    else delete devices[id];
  }
  if (address) {
    if (blocked) ips[address] = note;
    else delete ips[address];
  }
  if (!id && !address) {
    const error = new Error('Choisis un téléphone ou une adresse.');
    error.status = 400;
    throw error;
  }
  await saveBlocks({ devices, ips });
  return { ok: true };
}
