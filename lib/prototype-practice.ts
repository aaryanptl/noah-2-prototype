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

const DIFFICULTIES: DifficultyBand[] = ["easy", "medium", "hard"];
const VARIETY_TYPES = ["mcq", "drag_drop", "fitb"];
// Fixed difficulty spread for the 10-question practice set.
const SPREAD: Record<DifficultyBand, number> = { easy: 4, medium: 3, hard: 3 };

export interface PracticeQuestion {
  index: number; // 1-based position (1..10)
  id: string;
  questionType: string;
  difficulty: string;
  question: string;
  questionSvg?: string;
  options?: PrototypeDiagnosticOption[];
  payload?: Record<string, unknown>;
}

export interface PracticeSet {
  grade: number;
  gradeLabel: string;
  subject: string;
  topic: string;
  total: number;
  questions: PracticeQuestion[];
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

/** Build the ordered 10-question practice set (read-only). */
export async function buildPrototypePractice(
  grade: number,
  topic: string,
): Promise<PracticeSet> {
  const candidates: Record<DifficultyBand, PracticeQuestion[]> = {
    easy: await loadCandidates(grade, topic, "easy"),
    medium: await loadCandidates(grade, topic, "medium"),
    hard: await loadCandidates(grade, topic, "hard"),
  };

  const fallback: Record<DifficultyBand, DifficultyBand[]> = {
    easy: ["medium", "hard"],
    medium: ["easy", "hard"],
    hard: ["medium", "easy"],
  };

  const used = new Set<string>();
  const ordered: PracticeQuestion[] = [];
  for (const band of DIFFICULTIES) {
    const want = SPREAD[band];
    const picked = pickWithVariety(candidates[band], want, used);
    if (picked.length < want) {
      for (const alt of fallback[band]) {
        if (picked.length >= want) break;
        picked.push(
          ...pickWithVariety(candidates[alt], want - picked.length, used),
        );
      }
    }
    ordered.push(...picked);
  }

  const questions = ordered.map((q, i) => ({ ...q, index: i + 1 }));
  return {
    grade,
    gradeLabel: gradeLabel(grade),
    subject: "Math",
    topic,
    total: questions.length,
    questions,
  };
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
