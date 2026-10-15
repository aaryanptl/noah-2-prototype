import "server-only";

import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

import { loadFitbBank } from "@/lib/fitb/csv-source";

import type { QuestionOption } from "./evidence";
import type { DifficultyBand } from "./ladder";
import type { PracticeMix, PracticeTopic, PracticeType } from "./practice";

// ─────────────────────────────────────────────────────────────────────────────
// Question source for the student mode of /why-wrong.
//
// MCQs come from files/mcq_fixed.csv, blanks from the FITB bank that /fitb
// already reads (files/fitb_fixed.csv). MCQs are the richer case for this
// prototype: every wrong option is a designed distractor, and the worked
// explanation often says what each one means, which is exactly what Jev reads
// to tell a slip from a gap.
//
// Global region only, and no rows that need an SVG — the student page renders
// text, and a question that leans on a picture it cannot show would be judged
// unfairly. The file is ~117 MB and parses in under two seconds, once.
// ─────────────────────────────────────────────────────────────────────────────

const MCQ_PATH = path.join(process.cwd(), "files", "mcq_fixed.csv");

export interface PracticeRow {
  /** Namespaced so one id space covers both files: "mcq:<uuid>" / "fitb:<uuid>". */
  id: string;
  type: PracticeType;
  question: string;
  options: QuestionOption[];
  answer: string;
  acceptableAnswers: string[];
  subject: string;
  grade: string;
  topic: string;
  subtopic: string;
  learningObjective: string;
  bloom: string;
  band: DifficultyBand;
  explanation: string;
}

interface RawMcqRow {
  id?: string;
  question_type?: string;
  question_text?: string;
  question_svg?: string;
  subject?: string;
  grade?: string;
  topic?: string;
  subtopic?: string;
  learning_objective?: string;
  blooms_level?: string;
  difficulty_level?: string;
  options?: string;
  explanation?: string;
  region?: string;
}

declare global {
  var __whyWrongMcqBank__: PracticeRow[] | undefined;
  var __whyWrongFitbRows__: PracticeRow[] | undefined;
  var __whyWrongById__: Map<string, PracticeRow> | undefined;
}

const BANDS: DifficultyBand[] = ["easy", "medium", "hard"];

function str(value: unknown): string {
  const s = String(value ?? "").trim();
  return s === "NULL" ? "" : s;
}

function toClassLevel(raw: string): string {
  const value = raw.trim();
  if (/^kg$/i.test(value)) return "classKG";
  const digits = value.match(/\d+/);
  return digits ? `class${digits[0]}` : "class1";
}

function toBand(raw: string): DifficultyBand | null {
  const value = raw.trim().toLowerCase();
  return (BANDS as string[]).includes(value) ? (value as DifficultyBand) : null;
}

function buildMcqRow(raw: RawMcqRow): PracticeRow | null {
  if (str(raw.question_type).toLowerCase() !== "mcq") return null;
  if (str(raw.region) !== "global") return null;
  if (str(raw.question_svg)) return null;

  const id = str(raw.id);
  const question = str(raw.question_text);
  const band = toBand(str(raw.difficulty_level));
  if (!id || !question || !band) return null;

  let options: QuestionOption[] = [];
  try {
    const parsed = JSON.parse(raw.options || "[]") as unknown;
    if (Array.isArray(parsed)) {
      options = parsed.flatMap((o) =>
        o &&
        typeof o === "object" &&
        typeof (o as { text?: unknown }).text === "string"
          ? [
              {
                text: String((o as { text: string }).text).trim(),
                correct: (o as { correct?: unknown }).correct === true,
              },
            ]
          : [],
      );
    }
  } catch {
    return null;
  }
  const correct = options.filter((o) => o.correct);
  if (options.length < 2 || correct.length !== 1) return null;

  return {
    id: `mcq:${id}`,
    type: "mcq",
    question,
    options,
    answer: correct[0]?.text ?? "",
    acceptableAnswers: [],
    subject: str(raw.subject) || "Maths",
    grade: toClassLevel(str(raw.grade)),
    topic: str(raw.topic),
    subtopic: str(raw.subtopic),
    learningObjective: str(raw.learning_objective),
    bloom: str(raw.blooms_level),
    band,
    explanation: str(raw.explanation),
  };
}

function loadMcqBank(): PracticeRow[] {
  if (globalThis.__whyWrongMcqBank__) return globalThis.__whyWrongMcqBank__;
  if (!fs.existsSync(MCQ_PATH)) {
    throw new Error(`MCQ question file not found at ${MCQ_PATH}.`);
  }
  const parsed = parse(fs.readFileSync(MCQ_PATH), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RawMcqRow[];
  const rows = parsed
    .map(buildMcqRow)
    .filter((r): r is PracticeRow => r !== null);
  globalThis.__whyWrongMcqBank__ = rows;
  return rows;
}

/** The FITB bank reshaped to the same row, so the rest of the flow is one path. */
function fitbRows(): PracticeRow[] {
  if (globalThis.__whyWrongFitbRows__) return globalThis.__whyWrongFitbRows__;
  const rows = loadFitbBank().rows.flatMap((row) => {
    const band = toBand(row.difficulty);
    if (!band) return [];
    return [
      {
        id: `fitb:${row.id}`,
        type: "fitb" as const,
        question: row.question,
        options: [],
        answer: row.answer,
        acceptableAnswers: row.acceptableAnswers,
        subject: row.subject,
        grade: row.grade,
        topic: row.topic,
        subtopic: row.subtopic,
        learningObjective: row.learningObjective,
        bloom: "",
        band,
        explanation: row.explanation,
      },
    ];
  });
  globalThis.__whyWrongFitbRows__ = rows;
  return rows;
}

function rowsFor(type: PracticeMix): PracticeRow[] {
  if (type === "mcq") return loadMcqBank();
  if (type === "fitb") return fitbRows();
  return [...loadMcqBank(), ...fitbRows()];
}

export function getPracticeRow(id: string): PracticeRow | null {
  if (!globalThis.__whyWrongById__) {
    globalThis.__whyWrongById__ = new Map(
      [...loadMcqBank(), ...fitbRows()].map((r) => [r.id, r]),
    );
  }
  return globalThis.__whyWrongById__.get(id) ?? null;
}

/**
 * Topics with enough at every band for the ladder to move freely. A topic with
 * no hard questions would pin a strong student at medium and hide the effect.
 */
export function listPracticeTopics(
  grade: string,
  type: PracticeMix,
): PracticeTopic[] {
  const byTopic = new Map<string, PracticeTopic>();
  for (const row of rowsFor(type)) {
    if (row.grade !== grade || !row.topic) continue;
    const entry = byTopic.get(row.topic) ?? {
      topic: row.topic,
      count: 0,
      bands: { easy: 0, medium: 0, hard: 0 },
    };
    entry.count += 1;
    entry.bands[row.band] += 1;
    byTopic.set(row.topic, entry);
  }
  return [...byTopic.values()]
    .filter((t) => BANDS.every((b) => t.bands[b] >= 3))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}

/**
 * One question at the band the ladder asked for. Falls back to the nearest band
 * that still has an unseen question, so a small topic never dead-ends a run.
 */
export function pickPracticeQuestion(filters: {
  grade: string;
  topic: string;
  type: PracticeMix;
  band: DifficultyBand;
  exclude: Set<string>;
}): PracticeRow | null {
  const topic = filters.topic.trim().toLowerCase();
  const pool = rowsFor(filters.type).filter(
    (r) =>
      r.grade === filters.grade &&
      r.topic.trim().toLowerCase() === topic &&
      !filters.exclude.has(r.id),
  );
  const at = BANDS.indexOf(filters.band);
  const order = [...BANDS].sort(
    (a, b) => Math.abs(BANDS.indexOf(a) - at) - Math.abs(BANDS.indexOf(b) - at),
  );
  for (const band of order) {
    const candidates = pool.filter((r) => r.band === band);
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }
  }
  return null;
}
