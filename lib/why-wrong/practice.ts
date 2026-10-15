/**
 * The wire shapes for the student mode of /why-wrong — shared by the API routes
 * and the page, so this file must stay free of server-only imports.
 *
 * Answering streams one NDJSON event per line: each processing step reports
 * `running` then `done` (or `skipped` / `error`), and the last line is the
 * `result`. The page renders the steps as they land, so a slow Jev call reads
 * as "waiting on Jev", not as a frozen screen.
 */

import type { Judgement } from "./classify";
import type { DifficultyBand, Verdict } from "./ladder";

export type PracticeType = "mcq" | "fitb";
export type PracticeMix = PracticeType | "mixed";

/** A question as the student sees it — no key, no correct flags. */
export interface PracticeQuestion {
  id: string;
  type: PracticeType;
  question: string;
  /** Shuffled option texts for an MCQ; empty for a blank. */
  options: string[];
  grade: string;
  topic: string;
  subtopic: string;
  learningObjective: string;
  band: DifficultyBand;
}

export interface PracticeTopic {
  topic: string;
  count: number;
  bands: Record<DifficultyBand, number>;
}

export type StepId = "grade" | "evidence" | "jev";
export type StepStatus = "running" | "done" | "skipped" | "error";

export interface GradeDetail {
  type: PracticeType;
  verdict: Verdict;
  /** One line on how the verdict was reached. */
  how: string;
  /** FITB only — which tier of the matching cascade settled it. */
  tier?: string;
  probability?: number | null;
}

export interface JevAskDetail {
  /** Which judgement questions were sent, and what each asks. */
  asked: Array<{ key: string; type: string; instructions: string }>;
}

export interface JevResultDetail {
  model: string | null;
  inputTokens: number;
  outputTokens: number;
}

export type PracticeEvent =
  | {
      kind: "step";
      step: StepId;
      status: StepStatus;
      ms?: number;
      note?: string;
      grade?: GradeDetail;
      state?: Record<string, unknown>;
      ask?: JevAskDetail;
      jev?: JevResultDetail;
    }
  | {
      kind: "result";
      verdict: Verdict;
      studentAnswer: string;
      correctAnswer: string;
      explanation: string;
      /** Full options with correct flags, now the answer is in. */
      options: Array<{ text: string; correct: boolean }>;
      judgement: Judgement | null;
      totalMs: number;
    }
  | { kind: "error"; message: string };
