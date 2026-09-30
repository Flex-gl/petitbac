import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from './public/js/version.js';

test('la version servie, le script et le service worker concordent', () => {
  const announced = JSON.parse(readFileSync(new URL('./public/version.json', import.meta.url), 'utf8'));
  const worker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');
  assert.equal(announced.version, APP_VERSION);
  assert.match(worker, new RegExp(`const VERSION = '${APP_VERSION}'`));
});
