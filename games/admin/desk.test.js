import test from 'node:test';
import assert from 'node:assert/strict';
import { adminScreen, selectGroups } from '../../public/js/screens/admin.js';

const now = 1_800_000_000_000;

test('les mêmes pseudos et la même adresse se regroupent', () => {
  const devices = [
    { id: 'a', names: ['Doriana'], playerIds: ['p1'], ip: '203.0.113.8', city: 'Kinshasa', country: 'CD', game: 'Quiz', brand: 'Samsung', model: 'SM-G781B', os: 'Android 13', kind: 'téléphone', lastSeen: now - 60_000, firstSeen: now - 86_000_000, hits: 2 },
    { id: 'b', names: ['Doriana ANYASEBO'], playerIds: ['p1'], ip: '203.0.113.8', city: 'Kinshasa', country: 'CD', game: 'INTER', brand: 'Samsung', model: 'SM-G781B', os: 'Android 13', kind: 'téléphone', lastSeen: now, firstSeen: now - 3_000, hits: 1 },
    { id: 'c', names: [], ip: '198.51.100.4', city: 'Atlanta', country: 'US', game: 'Hall', brand: 'Appareil', os: 'Linux', kind: 'ordinateur', lastSeen: now - 120_000, firstSeen: now - 120_000, hits: 1 }
  ];
  const people = selectGroups(devices, { mode: 'people', filter: 'all', now });
  assert.equal(people.length, 2);
  assert.equal(people[0].names.length, 2);
  assert.equal(people[0].devices.length, 2);
  const players = selectGroups(devices, { mode: 'people', filter: 'players', now });
  assert.equal(players.length, 1);
  const addresses = selectGroups(devices, { mode: 'ips', filter: 'all', now });
  assert.equal(addresses.length, 2);
  assert.equal(addresses[0].ips[0], '203.0.113.8');
  const shared = [
    { id: 'c', names: ['Clemence'], playerIds: ['c1'], ip: '203.0.113.8', lastSeen: now },
    { id: 't', names: ['Tracy'], playerIds: ['t1'], ip: '203.0.113.8', lastSeen: now - 1 },
    { id: 's', names: [], playerIds: ['c1', 't1'], ip: '203.0.113.8', lastSeen: now - 2 }
  ];
  assert.equal(selectGroups(shared, { mode: 'people', filter: 'players', now }).length, 2);
  assert.equal(selectGroups(shared, { mode: 'ips', filter: 'all', now })[0].devices.length, 3);
  const html = adminScreen({ unlocked: true, tab: 'people', filter: 'players', devices, shown: 6 });
  assert.equal((html.match(/adm-group-toggle/g) || []).length, 1);
  assert.match(html, /Doriana ANYASEBO/);
  assert.match(html, /Android 13/);
  const paged = adminScreen({
    unlocked: true,
    tab: 'ips',
    filter: 'all',
    shown: 6,
    devices: Array.from({ length: 8 }, (_, index) => ({ id: `d${index}`, names: [`Joueur ${index}`], ip: `203.0.113.${index}`, lastSeen: now - index, hits: 1 }))
  });
  assert.equal((paged.match(/adm-group-toggle/g) || []).length, 6);
  assert.match(paged, /Voir les 2 suivants/);
});
