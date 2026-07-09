import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  serveQuestions,
  toClientQuizQuestion,
} from "@/agents/diagnostic/tools/contentQuiz";
import type {
  ClassLevel,
  DifficultyBand,
} from "@/agents/diagnostic/types/index";
import {
  gradePrototypeAnswers,
  PROTOTYPE_GRADES,
  type PrototypeDiagnosticOption,
} from "@/lib/prototype-homework";

/**
 * Prototype PRACTICE serving logic (STATELESS + READ-ONLY — never writes to the DB).
 *
 * A practice run is a fixed **10-question** set drawn from the DIAGNOSTIC pool
 * (final_content_questions_1) for one (grade, topic), with a spread of
 * 4 easy / 3 medium / 3 hard and variety across mcq / drag_drop / fitb.
 *
 * The AI hint ladder is generated on demand (see `generatePracticeHint`): the
 * client sends the question id + the student's recent tries + the level it wants;
 * the server loads the question (answer stays server-side), calls the LLM, and
 * returns one hint. Nothing is persisted — tries live in client state.
 */

const VARIETY_TYPES = ["mcq", "drag_drop", "fitb"];

// Adaptive practice: how many questions to keep buffered ahead of the student so
// serving never blocks. We serve 1 current + this many ahead at session start.
export const PRACTICE_BUFFER_AHEAD = 2;
// Default session length (configurable per session in the prototype start screen).
export const PRACTICE_DEFAULT_COUNT = 5;

// When a band runs dry, fall back to these bands (in order) so we can still serve.
const BAND_FALLBACK: Record<DifficultyBand, DifficultyBand[]> = {
  easy: ["medium", "hard"],
  medium: ["easy", "hard"],
  hard: ["medium", "easy"],
};

export interface PracticeQuestion {
  index: number; // 1-based position in the session
  id: string;
  questionType: string;
  difficulty: string;
  question: string;
  questionSvg?: string;
  options?: PrototypeDiagnosticOption[];
  payload?: Record<string, unknown>;
}

function gradeToClassLevel(grade: number): ClassLevel {
  if (grade <= 0) return "classKG";
  return `class${Math.min(grade, 8)}` as ClassLevel;
}

function gradeLabel(grade: number): string {
  return (
    PROTOTYPE_GRADES.find((g) => g.value === grade)?.label ?? `Grade ${grade}`
  );
}

/** Load student-safe diagnostic candidates for one band (answers stripped). */
async function loadCandidates(
  grade: number,
  topic: string,
  difficulty: DifficultyBand,
): Promise<PracticeQuestion[]> {
  const { questions } = await serveQuestions({
    source: "diagnostic",
    classLevel: gradeToClassLevel(grade),
    region: "US",
    topics: [topic],
    questionTypes: ["mcq", "drag_drop", "fitb"],
    difficulties: [difficulty],
    order: "random",
    limit: 40,
    offset: 0,
  });

  return questions.map((q) => {
    const safe = toClientQuizQuestion(q);
    const full = (q.payload ?? {}) as {
      questionSvg?: unknown;
      options?: Array<{ svg?: unknown }>;
    };
    const payloadOptions = Array.isArray(full.options) ? full.options : [];
    const options: PrototypeDiagnosticOption[] | undefined = q.options?.map(
      (text, i) => {
        const svg = payloadOptions[i]?.svg;
        return typeof svg === "string" && svg.trim().startsWith("<svg")
          ? { text, svg }
          : { text };
      },
    );
    const questionSvg =
      typeof full.questionSvg === "string" &&
      full.questionSvg.trim().startsWith("<svg")
        ? full.questionSvg
        : undefined;

    return {
      index: 0,
      id: q.id,
      questionType: q.questionType,
      difficulty: q.difficultyLevel || difficulty,
      question: q.question,
      questionSvg,
      options,
      payload: safe.payload as Record<string, unknown> | undefined,
    };
  });
}

/** Round-robin across question types so the set isn't all-MCQ. */
function pickWithVariety(
  candidates: PracticeQuestion[],
  count: number,
  used: Set<string>,
): PracticeQuestion[] {
  const byType = new Map<string, PracticeQuestion[]>();
  for (const q of candidates) {
    if (used.has(q.id)) continue;
    if (!byType.has(q.questionType)) byType.set(q.questionType, []);
    byType.get(q.questionType)?.push(q);
  }
  const types = [
    ...VARIETY_TYPES.filter((t) => byType.has(t)),
    ...[...byType.keys()].filter((t) => !VARIETY_TYPES.includes(t)),
  ];

  const picked: PracticeQuestion[] = [];
  let progressed = true;
  while (picked.length < count && progressed) {
    progressed = false;
    for (const type of types) {
      if (picked.length >= count) break;
      const next = byType.get(type)?.shift();
      if (next) {
        used.add(next.id);
        picked.push(next);
        progressed = true;
      }
    }
  }
  return picked;
}

/**
 * Serve up to `count` FRESH questions at `band`, falling back to the other
 * bands (in BAND_FALLBACK order) if that band runs dry, and never repeating an
 * id in `excludeIds`. Read-only — used both for the session-start buffer and
 * the just-in-time "serve one more" call. Type variety is spread across picks.
 */
async function serveAtBand(
  grade: number,
  topic: string,
  band: DifficultyBand,
  count: number,
  excludeIds: Set<string>,
): Promise<PracticeQuestion[]> {
  const used = new Set(excludeIds);
  const picked: PracticeQuestion[] = [];
  for (const b of [band, ...BAND_FALLBACK[band]]) {
    if (picked.length >= count) break;
    const candidates = await loadCandidates(grade, topic, b);
    picked.push(...pickWithVariety(candidates, count - picked.length, used));
  }
  return picked;
}

export interface PracticeSession {
  grade: number;
  gradeLabel: string;
  subject: string;
  topic: string;
  /** Session length — runs to this many answered questions. */
  targetCount: number;
  /** Difficulty band the session was seeded at (the student's practice level). */
  seedBand: DifficultyBand;
  /** The initial buffer: 1 current + PRACTICE_BUFFER_AHEAD ahead (capped at targetCount). */
  questions: PracticeQuestion[];
}

/**
 * Start an adaptive practice session: seed the band (the student's current
 * practice level) and immediately serve the first buffer of questions (up to
 * 1 + PRACTICE_BUFFER_AHEAD, capped at targetCount) so serving never blocks.
 * From here the client drives it just-in-time via `serveNextPracticeQuestion`.
 */
export async function startPracticeSession(
  grade: number,
  topic: string,
  seedBand: DifficultyBand,
  targetCount: number,
): Promise<PracticeSession> {
  const seedCount = Math.min(1 + PRACTICE_BUFFER_AHEAD, targetCount);
  const picked = await serveAtBand(
    grade,
    topic,
    seedBand,
    seedCount,
    new Set(),
  );
  const questions = picked.map((q, i) => ({ ...q, index: i + 1 }));
  return {
    grade,
    gradeLabel: gradeLabel(grade),
    subject: "Math",
    topic,
    targetCount,
    seedBand,
    questions,
  };
}

/**
 * Serve the next single question at `band` (the band the Streak Ladder currently
 * says), excluding everything already served this session. Returns null when the
 * pool is exhausted even after band fallback.
 */
export async function serveNextPracticeQuestion(
  grade: number,
  topic: string,
  band: DifficultyBand,
  excludeIds: string[],
): Promise<PracticeQuestion | null> {
  const [q] = await serveAtBand(grade, topic, band, 1, new Set(excludeIds));
  return q ? { ...q, index: excludeIds.length + 1 } : null;
}

// ---- Check one answer (correctness for the hint flow) ---------------------

export interface PracticeCheck {
  id: string;
  isCorrect: boolean;
  performance: number;
  correctAnswer: string;
}

/** Grade a single diagnostic answer (read-only). Reuses the homework grader. */
export async function checkPracticeAnswer(
  id: string,
  studentAnswer: unknown,
): Promise<PracticeCheck> {
  const [result] = await gradePrototypeAnswers([
    { id, kind: "diagnostic", studentAnswer },
  ]);
  return {
    id,
    isCorrect: result?.isCorrect ?? false,
    performance: result?.performance ?? 0,
    correctAnswer: result?.correctAnswer ?? "—",
  };
}

// ---- AI hint ladder (generated on demand, stateless) ----------------------

export type HintLevel = 1 | 2 | 3;

export interface PracticeHint {
  level: number;
  kind: "hint" | "reveal";
  content: string;
  /** Only set at the reveal level. */
  revealedAnswer: string | null;
  canRequestMore: boolean;
}

export interface PracticeTry {
  answer: string;
  correct: boolean;
}

const REVEAL_LEVEL: HintLevel = 3;

const HINT_SYSTEM = `You are Noah, a warm, encouraging elementary-school math buddy helping a young student who is stuck on ONE practice question.

General rules:
- Speak to the child directly and warmly, in 1–2 short sentences. Simple words, grade-appropriate.
- NEVER shame a wrong answer. Acknowledge effort, but VARY how you open every hint. Do NOT begin each hint with the same phrase (avoid repeating "Nice try", "Good job", "Good effort", "Almost"). It is fine to skip the praise and go straight to the help.
- You are given the student's recent tries and the correct answer. If their tries are moving toward the right idea, you may gently say they are on the right track; if not, stay encouraging without implying they are right.
- Do NOT use em dashes or long dashes (— or –); keep punctuation simple (commas, periods).
- Output ONLY the message text for the "content" field, no preamble, no markdown headers.

Level rules (STRICT):
- level 1 (nudge): point to the key word/idea or ask one leading question. You MUST NOT reveal, state, or strongly imply the correct answer or its final value.
- level 2 (method): FIRST briefly address the student's most recent answer by name and gently explain why it is not right, THEN show HOW to set the problem up (the operation / steps), e.g. "3 groups of 3 means 3 × 3". You MUST NOT reveal or state the correct final answer.
- level 3 (reveal): walk through the solution in one or two short steps AND clearly state the final answer.`;

const HintSchema = z.object({ content: z.string() });
// Prototypes use OpenAI only. Call OpenAI directly here (not the provider-
// switching llmStructured) so hints never route to Bedrock/Claude.
// minimal reasoning + bounded output ⇒ faster hints.
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";

/**
 * Generate the next AI hint for a question. Stateless: the client passes the
 * question id, the student's recent tries, and the level it wants. The server
 * loads the question (answer stays server-side) and calls the LLM.
 */
export async function generatePracticeHint(opts: {
  questionId: string;
  grade: number;
  level: HintLevel;
  tries: PracticeTry[];
}): Promise<PracticeHint> {
  const { questionId, grade, level, tries } = opts;

  // Fetch the question + its correct answer in parallel (both hit the DB).
  const [served, check] = await Promise.all([
    serveQuestions({
      source: "diagnostic",
      region: "US",
      ids: [questionId],
      order: "default",
      limit: 1,
      offset: 0,
    }),
    gradePrototypeAnswers([
      { id: questionId, kind: "diagnostic", studentAnswer: undefined },
    ]),
  ]);
  const q = served.questions[0];
  if (!q) throw new Error(`Question ${questionId} not found`);
  const correctAnswer = check[0]?.correctAnswer ?? "—";

  const gradeLabelText = grade <= 0 ? "KG" : `Grade ${grade}`;
  const levelWord = level === 1 ? "nudge" : level === 2 ? "method" : "reveal";

  // Always pass the student's recent tries (last 3) at every level so Noah can
  // reference the student's actual input, cut hallucination, and give directional
  // feedback ("you're on the right track"). The correct answer is always passed
  // too (below) but the level rules forbid revealing it before level 3.
  const recent = tries.slice(-3);
  const triesBlock =
    recent.length > 0
      ? `\nStudent's recent tries (oldest to newest):\n${recent
          .map((t, i) => {
            const marker = i === recent.length - 1 ? "  <- most recent" : "";
            return `  ${i + 1}. "${t.answer}" (${t.correct ? "correct" : "wrong"})${marker}`;
          })
          .join("\n")}`
      : `\nStudent's recent tries: (none yet)`;

  const user = `Student: ${gradeLabelText}
Question: ${q.question}
Correct answer (server-side, do not reveal unless level is reveal): ${correctAnswer}${triesBlock}

Give a LEVEL ${level} (${levelWord}) hint following the rules.`;

  const openai = new OpenAI({ timeout: 30_000, maxRetries: 1 });
  const response = await openai.responses.parse({
    model: OPENAI_MODEL,
    reasoning: { effort: "none" }, // no reasoning — fastest (gpt-5.4 supports none|low|medium|high|xhigh)
    max_output_tokens: 300, // a hint is 1–2 sentences; bound generation time
    input: [
      { role: "system", content: HINT_SYSTEM },
      { role: "user", content: user },
    ],
    text: {
      verbosity: "low",
      format: zodTextFormat(HintSchema, "practice_hint"),
    },
  });
  const data = response.output_parsed;
  if (!data) {
    console.error("[practice/hint] no parsed output from OpenAI:", {
      model: OPENAI_MODEL,
      status: response.status,
      incompleteDetails: response.incomplete_details,
      outputText: response.output_text,
      raw: JSON.stringify(response.output)?.slice(0, 800),
    });
    throw new Error("OpenAI returned no parsed hint");
  }

  const isReveal = level >= REVEAL_LEVEL;
  return {
    level,
    kind: isReveal ? "reveal" : "hint",
    content: data.content.trim(),
    revealedAnswer: isReveal ? correctAnswer : null,
    canRequestMore: level < REVEAL_LEVEL,
  };
}
