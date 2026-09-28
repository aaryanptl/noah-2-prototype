import "server-only";

import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

// ─────────────────────────────────────────────────────────────────────────────
// FITB question source — a CSV read once into memory.
//
// By default this is data/fitb/fitb-demo.csv: 50 blanks per grade sampled from
// files/fitb_fixed.csv by scripts/build-fitb-demo.mjs, small enough to commit and
// deploy. The full file stays local (files/ is gitignored); point FITB_CSV_PATH
// at it to grade against the whole bank.
//
// This replaces the `serveQuestions` path for the FITB pages. Two reasons:
//
//  1. Speed. `final_content_questions_1` has no index on `id`, so a single
//     lookup is a ~4s sequential scan over 111k rows; serveQuestions does it
//     twice (count, then fetch). Here the whole bank is a Map — lookups are O(1).
//
//  2. Better data. Every row in this file carries `payload.acceptableAnswers`
//     (3.5 on average), which the rows coming back from the bank did not. That
//     is the cascade's tier 2, so grading against this file exercises the real
//     shape of the system rather than a degenerate one.
//
// The full file is ~15 MB and parses in about half a second, once per process.
// ─────────────────────────────────────────────────────────────────────────────

export const FITB_CSV_RELATIVE_PATH =
  process.env.FITB_CSV_PATH?.trim() || "data/fitb/fitb-demo.csv";
const CSV_PATH = path.resolve(process.cwd(), FITB_CSV_RELATIVE_PATH);

/** Authoring's own classification of the expected answer. */
export type AnswerCategory = "Number" | "Fraction" | "Text" | "Alphanumeric";

export interface FitbRow {
  id: string;
  question: string;
  answer: string;
  acceptableAnswers: string[];
  /** Authored flag; currently false on every row in this file. */
  caseSensitive: boolean;
  hint: string | null;
  subject: string;
  /** Canonical class level, e.g. "class5" / "classKG". */
  grade: string;
  /** As written in the file: "KG", "1".."8". */
  gradeRaw: string;
  topic: string;
  subtopic: string;
  learningObjective: string;
  difficulty: string;
  explanation: string;
  region: string;
  category: AnswerCategory | "Unknown";
}

interface RawCsvRow {
  id?: string;
  question_type?: string;
  question_text?: string;
  subject?: string;
  grade?: string;
  topic?: string;
  subtopic?: string;
  learning_objective?: string;
  difficulty_level?: string;
  explanation?: string;
  generation_metadata?: string;
  region?: string;
  Category?: string;
}

export interface FitbBank {
  rows: FitbRow[];
  byId: Map<string, FitbRow>;
  subjects: string[];
  grades: string[];
  regions: string[];
  categories: string[];
  loadedInMs: number;
}

// Survive Next's dev-server module reloads, so the file is parsed once.
declare global {
  var __fitbBank__: FitbBank | undefined;
}

const CATEGORIES: AnswerCategory[] = [
  "Number",
  "Fraction",
  "Text",
  "Alphanumeric",
];

/** "KG" | "5" -> "classKG" | "class5" */
function toClassLevel(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "class1";
  if (/^kg$/i.test(value)) return "classKG";
  const digits = value.match(/\d+/);
  return digits ? `class${digits[0]}` : "class1";
}

function str(value: unknown): string {
  const s = String(value ?? "").trim();
  // The export writes the literal string NULL for empty cells.
  return s === "NULL" ? "" : s;
}

function buildRow(raw: RawCsvRow): FitbRow | null {
  const id = str(raw.id);
  const question = str(raw.question_text);
  if (!id || !question) return null;

  let payload: Record<string, unknown> = {};
  try {
    const meta = JSON.parse(raw.generation_metadata || "{}") as {
      payload?: Record<string, unknown>;
    };
    payload = meta.payload ?? {};
  } catch {
    // A row whose metadata will not parse has no answer key, so it is unusable.
    return null;
  }

  const answer = str(payload.answer);
  if (!answer) return null;

  const acceptableAnswers = Array.isArray(payload.acceptableAnswers)
    ? (payload.acceptableAnswers as unknown[])
        .map((a) => str(a))
        .filter((a) => a.length > 0)
    : [];

  const categoryRaw = str(raw.Category);
  const category = CATEGORIES.includes(categoryRaw as AnswerCategory)
    ? (categoryRaw as AnswerCategory)
    : "Unknown";

  return {
    id,
    question,
    answer,
    acceptableAnswers,
    caseSensitive: payload.caseSensitive === true,
    hint: str(payload.hint) || null,
    subject: str(raw.subject) || "Maths",
    grade: toClassLevel(str(raw.grade)),
    gradeRaw: str(raw.grade),
    topic: str(raw.topic),
    subtopic: str(raw.subtopic),
    learningObjective: str(raw.learning_objective),
    difficulty: str(raw.difficulty_level) || "—",
    explanation: str(raw.explanation),
    region: str(raw.region) || "global",
    category,
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

/** Parse the file once; later calls return the cached bank. */
export function loadFitbBank(): FitbBank {
  if (globalThis.__fitbBank__) return globalThis.__fitbBank__;

  const startedAt = Date.now();
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `FITB question file not found at ${CSV_PATH}. Run scripts/build-fitb-demo.mjs or set FITB_CSV_PATH.`,
    );
  }

  const parsed = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RawCsvRow[];

  const rows = parsed
    .filter((r) => str(r.question_type).toLowerCase() === "fitb")
    .map(buildRow)
    .filter((r): r is FitbRow => r !== null);

  const bank: FitbBank = {
    rows,
    byId: new Map(rows.map((r) => [r.id, r])),
    subjects: uniqueSorted(rows.map((r) => r.subject)),
    grades: uniqueSorted(rows.map((r) => r.grade)),
    regions: uniqueSorted(rows.map((r) => r.region)),
    categories: uniqueSorted(rows.map((r) => r.category)),
    loadedInMs: Date.now() - startedAt,
  };

  globalThis.__fitbBank__ = bank;
  return bank;
}

export interface FitbFilters {
  grade?: string;
  topic?: string;
  region?: string;
  category?: string;
  difficulty?: string;
  search?: string;
}

export interface FitbListResult {
  rows: FitbRow[];
  total: number;
  bank: FitbBank;
}

/**
 * Filter the bank and take `limit` rows. `shuffleSeed` picks a different random
 * slice each time without disturbing the cached array.
 */
export function listFitbQuestions(
  filters: FitbFilters,
  limit: number,
  shuffle = true,
): FitbListResult {
  const bank = loadFitbBank();
  const needle = filters.search?.trim().toLowerCase();

  const matched = bank.rows.filter((row) => {
    if (filters.grade && row.grade !== filters.grade) return false;
    if (filters.region && row.region !== filters.region) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.difficulty && row.difficulty !== filters.difficulty) {
      return false;
    }
    if (
      filters.topic &&
      row.topic.trim().toLowerCase() !== filters.topic.trim().toLowerCase()
    ) {
      return false;
    }
    if (needle && !row.question.toLowerCase().includes(needle)) return false;
    return true;
  });

  if (!shuffle) {
    return { rows: matched.slice(0, limit), total: matched.length, bank };
  }

  // Partial Fisher-Yates over a copy: only as many swaps as rows we return.
  const pool = [...matched];
  const take = Math.min(limit, pool.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { rows: pool.slice(0, take), total: matched.length, bank };
}

/** O(1) lookup — the whole reason this source exists. */
export function getFitbQuestion(id: string): FitbRow | null {
  return loadFitbBank().byId.get(id) ?? null;
}

/** Topics available under the current filters, for the picker. */
export function listTopics(
  filters: Pick<FitbFilters, "grade" | "region">,
): Array<{
  topic: string;
  count: number;
}> {
  const bank = loadFitbBank();
  const counts = new Map<string, number>();
  for (const row of bank.rows) {
    if (filters.grade && row.grade !== filters.grade) continue;
    if (filters.region && row.region !== filters.region) continue;
    counts.set(row.topic, (counts.get(row.topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}
