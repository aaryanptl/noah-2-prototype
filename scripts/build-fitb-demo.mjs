// Build data/fitb/fitb-demo.csv — a small, shareable slice of the FITB handoff
// file for the public /fitb demo. The full file stays local and out of git.
//
//   node scripts/build-fitb-demo.mjs [source.csv]
//
// Source defaults to the reviewed DB handoff, fitb-db-ready-handoff(exiting_db)v2.csv.
// Its reviewed `input_type` column wins over the older `Category` column.
//
// Picks PER_GRADE blanks per grade, split evenly across answer categories
// (Number / Fraction / Text / Alphanumeric) so every "Answer" chip has something
// to show, and round-robins topics inside each category for variety. Seeded, so
// re-running gives the same file. Only the columns lib/fitb/csv-source.ts reads
// are kept, and generation_metadata is trimmed to its answer payload.

import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

const ROOT = process.cwd();
const SOURCE = path.resolve(
  ROOT,
  process.argv[2] ?? "fitb-db-ready-handoff(exiting_db)v2.csv",
);
const OUTPUT = path.join(ROOT, "data", "fitb", "fitb-demo.csv");
const PER_GRADE = 50;
const SEED = 20260928;

const CATEGORIES = ["Number", "Fraction", "Text", "Alphanumeric"];
const COLUMNS = [
  "id",
  "question_type",
  "question_text",
  "subject",
  "grade",
  "topic",
  "subtopic",
  "learning_objective",
  "difficulty_level",
  "explanation",
  "generation_metadata",
  "region",
  "Category",
];

// mulberry32 — small seeded PRNG so the sample is reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clean(value) {
  const s = String(value ?? "").trim();
  return s === "NULL" ? "" : s;
}

/** The answer payload, or null when the row cannot be graded. */
function answerPayload(row) {
  try {
    const payload = JSON.parse(row.generation_metadata || "{}").payload ?? {};
    if (!clean(payload.answer)) return null;
    return {
      answer: payload.answer,
      acceptableAnswers: Array.isArray(payload.acceptableAnswers)
        ? payload.acceptableAnswers
        : [],
      caseSensitive: payload.caseSensitive === true,
      hint: payload.hint ?? null,
    };
  } catch {
    return null;
  }
}

/** Take up to `n` rows, cycling through topics so one topic can't dominate. */
function takeAcrossTopics(rows, n) {
  const byTopic = new Map();
  for (const row of rows) {
    const list = byTopic.get(row.topic) ?? [];
    list.push(row);
    byTopic.set(row.topic, list);
  }
  const queues = [...byTopic.values()];
  const picked = [];
  while (picked.length < n && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      if (picked.length >= n) break;
      const next = q.shift();
      if (next) picked.push(next);
    }
  }
  return picked;
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const random = rng(SEED);
const source = parse(fs.readFileSync(SOURCE), {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
});

/** "number" -> "Number"; falls back to the file's Category column. */
function category(row) {
  const reviewed = clean(row.input_type).toLowerCase();
  const match = CATEGORIES.find((c) => c.toLowerCase() === reviewed);
  return match ?? clean(row.Category);
}

// Usable rows only, one per question text (regional copies repeat the wording).
const seenText = new Set();
const usable = [];
for (const row of shuffle(source, random)) {
  if (clean(row.question_type).toLowerCase() !== "fitb") continue;
  if (!clean(row.id) || !clean(row.question_text)) continue;
  const rowCategory = category(row);
  if (!CATEGORIES.includes(rowCategory)) continue;
  const payload = answerPayload(row);
  if (!payload) continue;
  const textKey = clean(row.question_text).toLowerCase();
  if (seenText.has(textKey)) continue;
  seenText.add(textKey);
  usable.push({
    ...row,
    Category: rowCategory,
    generation_metadata: JSON.stringify({ payload }),
  });
}

const grades = [...new Set(usable.map((r) => clean(r.grade)))].sort((a, b) =>
  a === "KG" ? -1 : b === "KG" ? 1 : Number(a) - Number(b),
);

const output = [];
const summary = [];
for (const grade of grades) {
  const inGrade = usable.filter((r) => clean(r.grade) === grade);
  const pools = CATEGORIES.map((c) => inGrade.filter((r) => r.Category === c));

  // Even split, then hand leftover slots to categories that still have rows.
  const quota = CATEGORIES.map(() => 0);
  let remaining = PER_GRADE;
  while (remaining > 0) {
    let gave = false;
    for (let i = 0; i < CATEGORIES.length && remaining > 0; i++) {
      if (quota[i] < pools[i].length) {
        quota[i]++;
        remaining--;
        gave = true;
      }
    }
    if (!gave) break;
  }

  const picked = pools.flatMap((pool, i) => takeAcrossTopics(pool, quota[i]));
  output.push(...picked);
  summary.push(
    `${grade.padStart(2)}: ${picked.length}  (` +
      CATEGORIES.map((c, i) => `${c} ${quota[i]}`).join(", ") +
      ")",
  );
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
const lines = [
  COLUMNS.join(","),
  ...output.map((row) => COLUMNS.map((c) => csvCell(row[c])).join(",")),
];
fs.writeFileSync(OUTPUT, lines.join("\n") + "\n");

console.log(summary.join("\n"));
console.log(
  `\n${output.length} blanks -> ${path.relative(ROOT, OUTPUT)} (${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB)`,
);
