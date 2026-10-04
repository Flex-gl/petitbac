import { cleanQuestion } from './engine.js';

export function fold(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}

export function parseCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') { cell += '"'; index += 1; }
        else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',' || char === ';') { row.push(cell.trim()); cell = ''; continue; }
    if (char === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; continue; }
    if (char !== '\r') cell += char;
  }
  if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter(entry => entry.some(Boolean));
}

const HEADER = {
  id: 'id',
  categorie: 'categorie',
  category: 'categorie',
  difficulte: 'difficulte',
  difficulty: 'difficulte',
  question: 'question',
  reponse: 'reponse_correcte',
  reponse_correcte: 'reponse_correcte',
  option_a: 'option_a',
  option_b: 'option_b',
  option_c: 'option_c',
  option_d: 'option_d',
  explication: 'explication',
  actif: 'actif'
};

function headerMap(row) {
  return row.map(name => HEADER[fold(name).replace(/\s+/g, '_')] || '');
}

export function rowsFromCsv(text) {
  const table = parseCsv(text);
  if (!table.length) return [];
  const columns = headerMap(table[0]);
  if (!columns.includes('question')) return table.slice(1).map(row => ({ question: row[0] || '', reponse_correcte: row[1] || '' }));
  return table.slice(1).map(row => {
    const record = {};
    columns.forEach((key, index) => { if (key) record[key] = row[index] || ''; });
    return record;
  });
}

export function importQuestions(existing, records, idFor) {
  const known = new Set(existing.filter(question => !question.deleted).map(question => fold(question.question)));
  const imported = [];
  const errors = [];
  let duplicates = 0;
  let inactive = 0;
  records.forEach((record, index) => {
    const line = index + 2;
    try {
      const id = String(record.id || idFor(index)).slice(0, 40);
      const clean = cleanQuestion({ ...record, actif: record.actif === '0' || record.actif === 'non' ? 0 : record.actif }, id);
      const key = fold(clean.question);
      if (known.has(key)) { duplicates += 1; return; }
      known.add(key);
      if (!clean.actif) inactive += 1;
      imported.push({ ...clean, origine: clean.actif ? 'import' : 'a-completer' });
    } catch (error) {
      errors.push({ line, message: error.message || 'Ligne illisible.' });
    }
  });
  return { imported, duplicates, inactive, errors };
}
