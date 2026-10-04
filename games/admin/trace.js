const BRANDS = [
  ['iPhone', /iPhone/],
  ['iPad', /iPad/],
  ['Samsung', /Samsung|SM-[A-Z0-9]+|GT-[A-Z0-9]+/i],
  ['Xiaomi', /Xiaomi|Redmi|POCO/i],
  ['Huawei', /Huawei|HONOR|Honor/i],
  ['Oppo', /OPPO|Oppo/],
  ['Realme', /Realme/i],
  ['Vivo', /vivo/],
  ['OnePlus', /OnePlus/],
  ['Google', /Pixel/],
  ['Nokia', /Nokia/i],
  ['Motorola', /Motorola|Moto/],
  ['Sony', /Sony|Xperia/i],
  ['Tecno', /TECNO|Tecno/],
  ['Infinix', /Infinix/i],
  ['Itel', /itel/i]
];

export function clientAddress(value) {
  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  const publicAddress = parts.find(part => !isPrivate(part));
  return (publicAddress || parts[0] || '').slice(0, 64);
}

function isPrivate(address) {
  const value = address.toLowerCase();
  if (value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80')) return true;
  const match = value.match(/^(\d+)\.(\d+)\./);
  if (!match) return false;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return first === 10 || first === 127 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31);
}

export function placeFrom(headers = {}) {
  return {
    city: decodePlace(headers['x-vercel-ip-city']),
    region: decodePlace(headers['x-vercel-ip-country-region']),
    country: String(headers['x-vercel-ip-country'] || '').slice(0, 8).toUpperCase()
  };
}

function decodePlace(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try { return decodeURIComponent(text).slice(0, 80); }
  catch { return text.slice(0, 80); }
}

export function deviceLabel(userAgent) {
  const ua = String(userAgent || '');
  const brand = BRANDS.find(([, pattern]) => pattern.test(ua))?.[0] || '';
  const samsung = ua.match(/\b(SM-[A-Z0-9]+|GT-[A-Z0-9]+)\b/i)?.[1] || '';
  const androidModel = ua.match(/Android[^;]*;\s*([^;)]+)/)?.[1]?.trim() || '';
  const model = brand === 'Samsung' && samsung ? samsung : androidModel && !/android|linux|build/i.test(androidModel) ? androidModel.slice(0, 48) : '';
  const phone = /iPhone|Android.+Mobile|Mobile/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const kind = tablet ? 'tablette' : phone ? 'téléphone' : 'ordinateur';
  const desktop = /Windows NT/i.test(ua) ? 'Windows' : /Mac OS X/i.test(ua) ? 'Mac' : /CrOS/i.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : '';
  return {
    brand: brand || (kind === 'ordinateur' ? desktop || 'Ordinateur' : 'Appareil'),
    model: brand === 'iPhone' || brand === 'iPad' ? brand : model,
    kind
  };
}

export function gameFromPath(pathname) {
  const path = String(pathname || '');
  if (path.includes('/api/inter')) return 'INTER';
  if (path.includes('/api/quiz')) return 'Quiz';
  if (path.includes('/api/scores')) return 'Hall';
  if (path.includes('/api/admin')) return 'Admin';
  return 'Petit Bac';
}

export function cleanDeviceId(value) {
  const text = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{8,80}$/.test(text)) return '';
  return text;
}

export function legacyId(ip, userAgent) {
  const text = `${ip}|${userAgent}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `legacy-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function shouldWrite(previous, next, now, gap = 120000) {
  if (!previous?.lastSeen) return true;
  if (now - previous.lastSeen >= gap) return true;
  if ((previous.ip || '') !== (next.ip || '')) return true;
  if ((previous.city || '') !== (next.city || '')) return true;
  if ((previous.game || '') !== (next.game || '')) return true;
  if (next.name && !(previous.names || []).includes(next.name)) return true;
  return false;
}

export function mergeDevice(previous, sighting, now) {
  const prior = previous && typeof previous === 'object' ? previous : {};
  const names = [...new Set([sighting.name, ...(prior.names || [])].filter(Boolean))].slice(0, 8);
  const playerIds = [...new Set([sighting.playerId, ...(prior.playerIds || [])].filter(Boolean))].slice(0, 8);
  const visit = {
    at: now,
    ip: sighting.ip || '',
    city: sighting.city || '',
    region: sighting.region || '',
    country: sighting.country || '',
    game: sighting.game || '',
    name: sighting.name || ''
  };
  return {
    id: sighting.id,
    names,
    playerIds,
    brand: sighting.brand || prior.brand || '',
    model: sighting.model || prior.model || '',
    kind: sighting.kind || prior.kind || '',
    ip: sighting.ip || '',
    city: sighting.city || '',
    region: sighting.region || '',
    country: sighting.country || '',
    game: sighting.game || '',
    firstSeen: prior.firstSeen || now,
    lastSeen: now,
    hits: Number(prior.hits || 0) + 1,
    visits: [visit, ...(Array.isArray(prior.visits) ? prior.visits : [])].slice(0, 30)
  };
}
