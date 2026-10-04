import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openings } from './quiz-openings.mjs';

const bankPath = resolve(import.meta.dirname, '../data/quiz/bank.json');

function promptKey(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function valid(item) {
  const options = [item.option_a, item.option_b, item.option_c, item.option_d].map(option => String(option || '').trim());
  const answer = String(item.reponse_correcte || '').trim();
  const question = String(item.question || '').trim();
  if (question.length < 12 || answer.length < 1) return false;
  if (new Set(options.map(option => option.toLowerCase())).size !== 4) return false;
  if (!options.some(option => option.toLowerCase() === answer.toLowerCase())) return false;
  if (question.toLowerCase().includes(answer.toLowerCase())) return false;
  return true;
}

const bank = JSON.parse(readFileSync(bankPath, 'utf8'));
const questions = Array.isArray(bank.questions) ? bank.questions : [];
const seen = new Set(questions.map(item => promptKey(item.question)));
const ids = new Set(questions.map(item => String(item.id)));
let added = 0;
let skipped = 0;
for (const item of openings) {
  const key = promptKey(item.question);
  if (!valid(item) || seen.has(key) || ids.has(item.id)) {
    skipped += 1;
    continue;
  }
  seen.add(key);
  ids.add(item.id);
  questions.push(item);
  added += 1;
}
const counts = {};
for (const item of questions) counts[item.categorie] = (counts[item.categorie] || 0) + 1;
writeFileSync(bankPath, JSON.stringify({ source: `${bank.source || 'banque'}+ouvertures`, questions }));
console.log(`ajoutées ${added} déjà là ${skipped} total ${questions.length}`);
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}: ${count}`).join('\n'));
