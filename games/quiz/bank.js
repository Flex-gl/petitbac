import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, playable } from './engine.js';

let cached = null;

function readBase() {
  if (cached) return cached;
  const candidates = [
    join(process.cwd(), 'data', 'quiz', 'bank.json'),
    fileURLToPath(new URL('../../data/quiz/bank.json', import.meta.url))
  ];
  for (const candidate of candidates) {
    try {
      cached = JSON.parse(readFileSync(candidate, 'utf8'));
      return cached;
    } catch { /* autre emplacement */ }
  }
  cached = { questions: [] };
  return cached;
}

export function baseQuestions() {
  const source = readBase();
  return Array.isArray(source.questions) ? source.questions : [];
}

export function mergeBank(extras = [], overrides = {}) {
  const extraList = Array.isArray(extras) ? extras : [];
  const patches = overrides && typeof overrides === 'object' ? overrides : {};
  const base = baseQuestions();
  if (!extraList.length && !Object.keys(patches).length) return base;
  const map = new Map();
  for (const question of base) map.set(String(question.id), { ...question });
  for (const question of extraList) {
    if (!question?.id) continue;
    map.set(String(question.id), { ...question });
  }
  for (const [id, patch] of Object.entries(patches)) {
    if (!patch || typeof patch !== 'object') continue;
    const current = map.get(String(id)) || { id: String(id) };
    map.set(String(id), { ...current, ...patch, id: String(id) });
  }
  return [...map.values()];
}

export function counts(questions) {
  const byCategory = {};
  const byDifficulty = { facile: 0, moyen: 0, difficile: 0 };
  let active = 0;
  for (const question of questions) {
    if (!playable(question)) continue;
    active += 1;
    byCategory[question.categorie] = (byCategory[question.categorie] || 0) + 1;
    if (byDifficulty[question.difficulte] != null) byDifficulty[question.difficulte] += 1;
  }
  const known = new Set([...CATEGORIES, ...Object.keys(byCategory)]);
  return {
    active,
    total: questions.filter(question => !question.deleted).length,
    byCategory,
    byDifficulty,
    categories: [...known]
  };
}
