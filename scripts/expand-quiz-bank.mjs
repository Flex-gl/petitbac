import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bankPath = resolve(root, 'data/quiz/bank.json');
const TARGET = 10500;

function plainPrompt(value) {
  return String(value || '')
    .replace(/^\s*(révision|question quiz battle|défi de connaissances|question rapide|saurez-vous répondre|testez vos connaissances|à vous de jouer)\s*[:\-–]?\s*/i, '')
    .replace(/^dans un quiz de culture générale,\s*/i, '')
    .replace(/\s*\(série\s*\d+\)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLabel(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || /^Q\d+$/.test(text) || text.length > 48 || /https?:|wikidata/i.test(text)) return '';
  return text;
}

async function sparql(query) {
  let last = 'réseau';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: {
          Accept: 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PoseidonQuiz/1.0 (educational quiz bank; https://github.com/Flex-gl/petitbac)'
        },
        body: new URLSearchParams({ query, format: 'json' }),
        signal: AbortSignal.timeout(22000)
      });
      if (!response.ok) throw new Error(`Wikidata ${response.status}`);
      const body = await response.json();
      return body.results.bindings;
    } catch (error) {
      last = error.message;
      await new Promise(resolveWait => setTimeout(resolveWait, 700 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

async function ask(query, label) {
  try {
    const rows = await sparql(query);
    console.log(`${label} ${rows.length}`);
    return rows;
  } catch (error) {
    console.error(`${label} échec ${error.message}`);
    return [];
  }
}

function row(binding, fields) {
  const value = {};
  for (const field of fields) value[field] = cleanLabel(binding[field]?.value);
  return value;
}

function shuffle(list, seed) {
  const copy = [...list];
  let state = seed || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function optionsFor(answer, pool, seed) {
  const correct = cleanLabel(answer);
  const others = [...new Set(pool.map(cleanLabel).filter(item => item && item.toLowerCase() !== correct.toLowerCase()))];
  const picked = shuffle(others, seed).slice(0, 3);
  if (!correct || picked.length < 3) return null;
  return shuffle([correct, ...picked], seed + 17);
}

function makeQuestion(id, categorie, difficulte, question, answer, pool, seed) {
  const prompt = plainPrompt(question);
  const choices = optionsFor(answer, pool, seed);
  if (!choices || prompt.length < 12 || prompt.toLowerCase().includes(String(answer).toLowerCase())) return null;
  const [option_a, option_b, option_c, option_d] = choices;
  return {
    id,
    categorie,
    difficulte,
    question: prompt,
    reponse_correcte: cleanLabel(answer),
    option_a,
    option_b,
    option_c,
    option_d,
    explication: '',
    actif: 1
  };
}

const existing = JSON.parse(readFileSync(bankPath, 'utf8'));
const kept = [];
const seenFacts = new Set();
const seenPrompts = new Set();
for (const item of existing.questions) {
  const question = plainPrompt(item.question);
  const answer = String(item.reponse_correcte || '').trim();
  const fact = /capitale/i.test(question) ? `cap|${answer.toLowerCase()}` : `${question.toLowerCase()}|${answer.toLowerCase()}`;
  if (!question || !answer || seenFacts.has(fact) || seenPrompts.has(question.toLowerCase())) continue;
  seenFacts.add(fact);
  seenPrompts.add(question.toLowerCase());
  kept.push({ ...item, question, explication: '' });
}
console.log(`faits déjà là ${kept.length}`);

const extra = [];
let serial = 100000;
for (const item of existing.questions) {
  const match = String(item.id).match(/^n(\d+)$/);
  if (match) serial = Math.max(serial, Number(match[1]) + 1);
}
function add(categorie, difficulte, question, answer, pool) {
  if (kept.length + extra.length >= TARGET) return;
  const prompt = plainPrompt(question).toLowerCase();
  const fact = /capitale/i.test(question) ? `cap|${String(answer).toLowerCase()}` : `${prompt}|${String(answer).toLowerCase()}`;
  if (seenFacts.has(fact) || seenPrompts.has(prompt)) return;
  const built = makeQuestion(`n${serial}`, categorie, difficulte, question, answer, pool, serial);
  if (!built) return;
  serial += 1;
  seenFacts.add(fact);
  seenPrompts.add(prompt);
  extra.push(built);
}

const countries = (await ask(`
  SELECT ?countryLabel ?capitalLabel ?continentLabel ?currencyLabel WHERE {
    ?country wdt:P31 wd:Q6256; wdt:P36 ?capital.
    OPTIONAL { ?country wdt:P30 ?continent. }
    OPTIONAL { ?country wdt:P38 ?currency. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
  }
  LIMIT 400
`, 'pays')).map(item => row(item, ['countryLabel', 'capitalLabel', 'continentLabel', 'currencyLabel']))
  .filter(item => item.countryLabel && item.capitalLabel);
const countryNames = countries.map(item => item.countryLabel);
const capitals = countries.map(item => item.capitalLabel);
const continents = [...new Set(countries.map(item => item.continentLabel).filter(Boolean))];
const currencies = [...new Set(countries.map(item => item.currencyLabel).filter(Boolean))];
for (const item of countries) {
  add('Géographie', 'facile', `Quelle est la capitale du pays « ${item.countryLabel} » ?`, item.capitalLabel, capitals);
  add('Géographie', 'moyen', `« ${item.capitalLabel} » est la capitale de quel pays ?`, item.countryLabel, countryNames);
  if (item.continentLabel) add('Géographie', 'facile', `Sur quel continent se trouve « ${item.countryLabel} » ?`, item.continentLabel, continents);
  if (item.currencyLabel) add('Géographie', 'moyen', `Quelle monnaie utilise « ${item.countryLabel} » ?`, item.currencyLabel, currencies);
}

const elements = (await ask(`
  SELECT ?elLabel ?symbol ?number WHERE {
    ?el wdt:P31 wd:Q11344; wdt:P246 ?symbol; wdt:P1086 ?number.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
  }
  LIMIT 150
`, 'éléments')).map(item => ({
  name: cleanLabel(item.elLabel?.value),
  symbol: cleanLabel(item.symbol?.value),
  number: Number(item.number?.value)
})).filter(item => item.name && item.symbol && item.number > 0 && item.number < 120);
const elementNames = elements.map(item => item.name);
const symbols = elements.map(item => item.symbol);
const numbers = elements.map(item => String(item.number));
for (const item of elements) {
  const level = item.number <= 20 ? 'facile' : 'moyen';
  add('Sciences & Technologie', level, `Quel est le symbole chimique de « ${item.name} » ?`, item.symbol, symbols);
  add('Sciences & Technologie', level, `Quel élément chimique a pour symbole « ${item.symbol} » ?`, item.name, elementNames);
  add('Sciences & Technologie', item.number <= 10 ? 'facile' : 'difficile', `Quel est le numéro atomique de « ${item.name} » ?`, String(item.number), numbers);
}

const bands = [
  [5000000, 100000000],
  [2000000, 5000000],
  [1000000, 2000000],
  [700000, 1000000],
  [500000, 700000],
  [350000, 500000],
  [250000, 350000],
  [180000, 250000],
  [120000, 180000],
  [80000, 120000],
  [50000, 80000],
  [35000, 50000],
  [25000, 35000],
  [18000, 25000],
  [12000, 18000],
  [8000, 12000],
  [5000, 8000],
  [3000, 5000],
  [1800, 3000],
  [1000, 1800]
];
const continentByCountry = new Map(countries.filter(item => item.continentLabel).map(item => [item.countryLabel.toLowerCase(), item.continentLabel]));
function addCity(city, country, pop) {
  const level = pop >= 1000000 ? 'facile' : pop >= 100000 ? 'moyen' : 'difficile';
  add('Géographie', level, `Dans quel pays se trouve la ville de « ${city} » ?`, country, countryNames);
  const continent = continentByCountry.get(country.toLowerCase());
  if (continent) add('Géographie', level, `Sur quel continent se trouve la ville de « ${city} » ?`, continent, continents);
}
const cityQuestion = /^Dans quel pays se trouve la ville de « (.+) » \?$/;
for (const item of kept) {
  const match = item.question.match(cityQuestion);
  if (!match) continue;
  const continent = continentByCountry.get(String(item.reponse_correcte).toLowerCase());
  if (continent) add('Géographie', item.difficulte, `Sur quel continent se trouve la ville de « ${match[1]} » ?`, continent, continents);
}
console.log(`avec continents ${kept.length + extra.length}`);

async function cityBand(min, max, depth = 0) {
  if (kept.length + extra.length >= TARGET) return [];
  const rows = await ask(`
    SELECT ?cityLabel ?countryLabel ?pop WHERE {
      ?city wdt:P31 wd:Q515; wdt:P17 ?country; wdt:P1082 ?pop.
      FILTER(?pop >= ${min} && ?pop < ${max})
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
    }
    LIMIT 2500
  `, `villes ${min}-${max}`);
  if (rows.length >= 2500 && max - min > 4000 && depth < 3) {
    const mid = Math.round((min + max) / 2);
    return [...await cityBand(mid, max, depth + 1), ...await cityBand(min, mid, depth + 1)];
  }
  return rows;
}

const cityBest = new Map();
for (const [min, max] of bands) {
  if (kept.length + extra.length >= TARGET) break;
  if (kept.length > 4000 && min >= 12000) continue;
  const rows = await cityBand(min, max);
  for (const item of rows) {
    const city = cleanLabel(item.cityLabel?.value);
    const country = cleanLabel(item.countryLabel?.value);
    const pop = Number(item.pop?.value);
    if (!city || !country || city.toLowerCase() === country.toLowerCase() || !Number.isFinite(pop)) continue;
    const key = city.toLowerCase();
    const prev = cityBest.get(key);
    if (!prev || pop > prev.pop) cityBest.set(key, { city, country, pop });
  }
  for (const item of cityBest.values()) addCity(item.city, item.country, item.pop);
  console.log(`banque ${kept.length + extra.length}`);
}

function cap(value) {
  const chars = [...String(value || '')];
  if (!chars.length) return '';
  const first = chars[0];
  if (first.toLocaleLowerCase('fr') === first && first.toLocaleUpperCase('fr') !== first) chars[0] = first.toLocaleUpperCase('fr');
  return chars.join('');
}

const questions = [...kept, ...extra];
const usedPrompts = new Set();
for (const question of questions) {
  const shorter = question.question.replace(/« (?:Ville|Commune) de ([^»]+) »/g, '« $1 »');
  if (shorter !== question.question && !usedPrompts.has(shorter.toLowerCase())) question.question = shorter;
  question.reponse_correcte = cap(question.reponse_correcte);
  for (const key of ['option_a', 'option_b', 'option_c', 'option_d']) question[key] = cap(question[key]);
  usedPrompts.add(question.question.toLowerCase());
}
writeFileSync(bankPath, JSON.stringify({ source: 'Quiz_Battle_3000_questions.xlsx+wikidata', questions }));
console.log(`conservées ${kept.length} ajoutées ${extra.length} total ${questions.length}`);
