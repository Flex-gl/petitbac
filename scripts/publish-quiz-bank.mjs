import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
  }
}

const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/$/, '');
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
if (!url || !token) throw new Error('Variables Upstash manquantes.');

const bank = JSON.parse(readFileSync(resolve(root, 'data/quiz/bank.json'), 'utf8'));
const questions = Array.isArray(bank.questions) ? bank.questions : [];
const size = 500;
const chunks = Math.ceil(questions.length / size);
const items = questions.map((question, index) => ({
  id: String(question.id),
  categorie: question.categorie,
  difficulte: question.difficulte,
  actif: question.actif ? 1 : 0,
  chunk: Math.floor(index / size)
}));

async function redis(command) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(body.error || `Redis ${response.status}`);
  return body.result;
}

await redis(['SET', 'arena:quiz:catalog', JSON.stringify({ chunks, items })]);
for (let number = 0; number < chunks; number += 1) {
  const slice = questions.slice(number * size, (number + 1) * size);
  const record = Object.fromEntries(slice.map(question => [String(question.id), question]));
  await redis(['SET', `arena:quiz:chunk:${number}`, JSON.stringify(record)]);
  console.log(`chunk ${number}: ${slice.length}`);
}
console.log(`catalog ${items.length} chunks ${chunks}`);
