import test from 'node:test';
import assert from 'node:assert/strict';
import { clientAddress, deviceLabel, gameFromPath, legacyId, mergeDevice, placeFrom, shouldWrite } from './trace.js';

test('l’adresse publique est gardée, pas l’adresse interne', () => {
  assert.equal(clientAddress('203.0.113.8, 10.1.1.1'), '203.0.113.8');
  assert.equal(clientAddress('192.168.1.4'), '192.168.1.4');
  assert.equal(clientAddress(''), '');
});

test('la ville est lue depuis les en-têtes de connexion', () => {
  const place = placeFrom({ 'x-vercel-ip-city': 'Kinshasa', 'x-vercel-ip-country': 'cd', 'x-vercel-ip-country-region': 'KN' });
  assert.equal(place.city, 'Kinshasa');
  assert.equal(place.country, 'CD');
  assert.equal(place.region, 'KN');
});

test('la marque du téléphone est reconnue', () => {
  const iphone = deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15');
  assert.equal(iphone.brand, 'iPhone');
  assert.equal(iphone.kind, 'téléphone');
  const samsung = deviceLabel('Mozilla/5.0 (Linux; Android 14; SM-A515F) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36');
  assert.equal(samsung.brand, 'Samsung');
  assert.equal(samsung.model, 'SM-A515F');
  const desk = deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  assert.equal(desk.kind, 'ordinateur');
  assert.equal(desk.brand, 'Windows');
  assert.equal(desk.os, 'Windows 10');
  assert.equal(iphone.os, 'iOS 17.5');
  assert.equal(samsung.os, 'Android 14');
});

test('le système précis arrive même quand le navigateur cache le modèle', () => {
  const reduced = deviceLabel(
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    { platform: '"Android"', platformVersion: '"14.0.0"', model: '"SM-A515F"', mobile: '?1' }
  );
  assert.equal(reduced.brand, 'Samsung');
  assert.equal(reduced.model, 'SM-A515F');
  assert.equal(reduced.os, 'Android 14');
  assert.equal(reduced.kind, 'téléphone');
  const windows11 = deviceLabel(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    { platform: '"Windows"', platformVersion: '"15.0.0"' }
  );
  assert.equal(windows11.os, 'Windows 11');
  const ipad = deviceLabel('Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15');
  assert.equal(ipad.brand, 'iPad');
  assert.equal(ipad.os, 'iPadOS 17.4');
  assert.equal(ipad.kind, 'tablette');
});

test('le jeu est déduit du chemin, et une connexion proche n’est pas réécrite', () => {
  assert.equal(gameFromPath('/api/quiz'), 'Quiz');
  assert.equal(gameFromPath('/api/inter'), 'INTER');
  assert.equal(gameFromPath('/api/game'), 'Petit Bac');
  const previous = { lastSeen: 1_000, ip: '203.0.113.8', city: 'Kinshasa', game: 'Quiz', names: ['Anna'] };
  assert.equal(shouldWrite(previous, { ip: '203.0.113.8', city: 'Kinshasa', game: 'Quiz', name: 'Anna' }, 20_000), false);
  assert.equal(shouldWrite(previous, { ip: '203.0.113.9', city: 'Kinshasa', game: 'Quiz', name: 'Anna' }, 20_000), true);
  assert.equal(shouldWrite(previous, { ip: '203.0.113.8', city: 'Kinshasa', game: 'Quiz', name: 'Anna' }, 200_000), true);
  assert.equal(shouldWrite(previous, { ip: '203.0.113.8', city: 'Kinshasa', game: 'Quiz', name: 'Anna', os: 'Android 14' }, 20_000), true);
});

test('une visite s’ajoute sans effacer le premier passage', () => {
  const first = mergeDevice(null, { id: 'device-1', name: 'Anna', playerId: 'p1', ip: '203.0.113.8', city: 'Kinshasa', country: 'CD', game: 'Quiz', brand: 'Samsung', model: 'SM-A515F', os: 'Android 14', kind: 'téléphone' }, 5_000);
  const next = mergeDevice(first, { id: 'device-1', name: 'Awa', playerId: 'p1', ip: '203.0.113.8', city: 'Lubumbashi', country: 'CD', game: 'INTER', brand: 'Appareil', model: '', os: '', kind: 'téléphone' }, 9_000);
  assert.equal(next.firstSeen, 5_000);
  assert.equal(next.lastSeen, 9_000);
  assert.equal(next.hits, 2);
  assert.deepEqual(next.names, ['Awa', 'Anna']);
  assert.equal(next.visits[0].city, 'Lubumbashi');
  assert.equal(next.visits[1].game, 'Quiz');
  assert.equal(next.brand, 'Samsung');
  assert.equal(next.model, 'SM-A515F');
  assert.equal(next.os, 'Android 14');
  assert.equal(legacyId('203.0.113.8', 'phone').startsWith('legacy-'), true);
});
