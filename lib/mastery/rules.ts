/**
 * The mastery loop, run against real evidence.
 *
 * Pure: takes the measurements a student has actually produced on one topic
 * and answers "what should this student do next, and why". No simulation, no
 * randomness, no hidden ability.
 *
 * Source: "Noah Mastery Learning Workflow", draft v1 (7 Aug 2026) —
 * §2 the Mastery Map and its update rule, §3 the mastery parameters, §4 the
 * Mastery Loop. Every threshold is a named export so changing one is a config
 * change. Numbers the doc does not give (question counts, the learning-rate
 * floor, decay speed) are marked "not in the doc".
 */

/* ------------------------------------------------------------------ *
 * Parameters
 * ------------------------------------------------------------------ */

export type MasteryMode =
  | "placement"
  /** A topic test or a recurring test: timed, no hints. */
  | "diagnostic"
  | "homework"
  | "practice"
  /** A mentor session. Writes no score. */
  | "class";

/**
 * §2 — evidence weight w. "A test answer under time pressure says more than a
 * practice answer with hints available." Placement is a test.
 */
export const EVIDENCE_WEIGHT: Record<MasteryMode, number> = {
  placement: 1,
  diagnostic: 1,
  homework: 0.6,
  practice: 0.4,
  class: 0,
};

/**
 * §2 — the learning rate k "shrinks as confidence grows":
 * k = max(K_FLOOR, 1 / (1 + n)), n = weighted questions already behind the
 * score. While evidence is thin the score is a running average; once it is
 * not, each new answer moves it by at most a tenth of the gap. Floor not in
 * the doc.
 */
export const K_FLOOR = 0.1;
/** §2 — "Two questions on an LO is a guess; twenty is a signal." Confidence = min(1, n / 20). */
export const CONFIDENCE_FULL = 20;
/** Under this many weighted questions an objective is still a guess (low confidence). Not in the doc. */
export const CONFIDENCE_GUESS = 5;
/**
 * §2 — "a recency decay nudges stale LOs down slightly so mastery must be
 * maintained". After DECAY_GRACE_DAYS with no evidence, the score drops
 * DECAY_PER_WEEK points a week, at most DECAY_MAX. Speeds not in the doc.
 */
export const DECAY_GRACE_DAYS = 14;
export const DECAY_PER_WEEK = 2;
export const DECAY_MAX = 10;

/** §3 — mastery bar: a topic or recurring test at this overall score or better. */
export const MASTERY_BAR = 85;
/** §3 — per-LO floor: every objective's score must hold this, so a topic is not mastered "on average". */
export const LO_FLOOR = 75;
/**
 * §3 — speed band: the student's typical time per question at most this many
 * times the cohort median. Read as a median of per-question ratios: a plain
 * average lets one question left open fail the test (52% of 85%+ topic tests
 * fail it that way on production data; 38% with the median).
 */
export const SPEED_BAND = 1.25;
/** §3 — challenge zone: expected success on prescribed work. */
export const CHALLENGE_ZONE = { low: 70, high: 80 };
/** §3 — re-teach line: a test under this is an instruction problem, not a practice problem. */
export const RETEACH_LINE = 60;
/** §3 — loop guard: remediation loops without mastery before the student is flagged at-risk. */
export const LOOP_GUARD = 3;
/** §3 — homework mix: weakest objectives, the frontier, spaced review. */
export const HOMEWORK_MIX = { gap: 0.6, frontier: 0.25, review: 0.15 };

/** Question counts. Not in the doc except the micro-homework (§5, Rohan: "6 questions"). */
export const HOMEWORK_QUESTIONS = 12;
export const MICRO_HOMEWORK_QUESTIONS = 6;
export const PRACTICE_QUESTIONS = 5;
export const TOPIC_TEST_PER_LO = 3;
export const TOPIC_TEST_CAP = 18;
export const RECURRING_TEST_QUESTIONS = 15;
export const RECURRING_TEST_MIN_PER_LO = 2;
/**
 * §3 badge ladder (Figure 2) — Pro: "experienced ≥80% of the topic's LOs".
 * An objective counts as experienced at CONFIDENCE_GUESS weighted questions;
 * the doc's "healthy question mix" is not defined further.
 */
export const PRO_COVERAGE = 0.8;
/** Learn-loop sessions (homework / practice) before the topic test. Not in the doc. */
export const TOPIC_TEST_AFTER = 3;

/**
 * §3 challenge zone, v1: expected success = the objective's score plus this
 * offset for the question's difficulty. The Difficulty Calibrator (§6) will
 * replace it with per-question P(correct) from cohort accuracy.
 */
export const DIFFICULTY_OFFSET = { easy: 15, medium: 0, hard: -15 } as const;
export type Difficulty = keyof typeof DIFFICULTY_OFFSET;

/* ------------------------------------------------------------------ *
 * Inputs
 * ------------------------------------------------------------------ */

export interface MasteryObjective {
  id: number;
  name: string;
  sequence: number;
}

/** One session's first responses on one objective. */
export interface Measurement {
  sessionId: number;
  mode: MasteryMode;
  at: string;
  loId: number;
  answered: number;
  correct: number;
  /**
   * Session-level, same on every objective of the session: the median, over
   * the answered questions, of the student's time ÷ the cohort's median time
   * on that question. `null` or absent when untimed.
   */
  speedRatio?: number | null;
}

export interface SessionSummary {
  sessionId: number;
  mode: MasteryMode;
  at: string;
  answered: number;
  correct: number;
  /** Objectives touched, with per-objective first-response accuracy. */
  byLo: Array<{ loId: number; answered: number; correct: number }>;
}

/* ------------------------------------------------------------------ *
 * The Mastery Map
 * ------------------------------------------------------------------ */

export type LoState =
  | "untested"
  /** Under the re-teach line. */
  | "needs_help"
  /** Between the re-teach line and the floor. */
  | "working"
  /** At or over the per-LO floor. */
  | "secure"
  /** The topic passed the mastery check. */
  | "mastered";

export type ConfidenceLevel = "none" | "low" | "medium" | "high";

export interface LoRow {
  id: number;
  name: string;
  sequence: number;
  /** §2 — current estimated mastery, 0–100, after decay. `null` with no evidence. */
  score: number | null;
  /** §2 — 0–1: how much evidence sits behind the score. */
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  /** Weighted question count. */
  evidence: number;
  answered: number;
  correct: number;
  /** Points taken off for staleness as of the scorecard's date. */
  decay: number;
  /** The first score this objective had on the map — point A. */
  firstScore: number | null;
  state: LoState;
  /** One entry per session that touched this objective, oldest first. */
  history: Array<{
    sessionId: number;
    mode: MasteryMode;
    at: string;
    accuracy: number;
    answered: number;
    /** The map score straight after this session. */
    scoreAfter: number | null;
  }>;
  lastMode: MasteryMode | null;
  lastAt: string | null;
}

export type TestOutcome = "mastered" | "remediate" | "reteach";

/** §4 — the Mastery Verifier's reading of one topic or recurring test. */
export interface TestResult {
  sessionId: number;
  at: string;
  kind: "topic_test" | "recurring_test";
  answered: number;
  accuracy: number;
  /** Student time ÷ cohort median time, over the same questions. `null` when untimed. */
  speedRatio: number | null;
  /** Objectives under the floor once this test is on the map. */
  belowFloor: number[];
  gate: { overall: boolean; floor: boolean; speed: boolean | null };
  outcome: TestOutcome;
}

/** Where the student is in the §4 loop. */
export type Phase = "learn" | "remediate" | "reteach" | "at_risk" | "mastered";

export interface Scorecard {
  rows: LoRow[];
  /** Mean of the objectives' map scores. */
  topicScore: number | null;
  topicEvidence: number;
  sessions: number;
  lastMode: MasteryMode | null;
  phase: Phase;
  tests: TestResult[];
  lastTest: TestResult | null;
  /** Remediation loops finished without mastery since the last class. */
  remediationLoops: number;
  /** Homework / practice sessions since the last test or class. */
  learnSessions: number;
  /** Inside a remediation loop: what has run since the test that opened it. */
  sinceTest: { homework: number; practice: number };
  /**
   * §3 badge ladder: Novice is where everyone starts (placement), Pro rewards
   * coverage, Master only demonstrated performance.
   */
  badge: "Novice" | "Pro" | "Master";
  /** The date decay is measured to. */
  asOf: string | null;
}

const round = (value: number) => Math.round(value * 10) / 10;
const DAY_MS = 864e5;

/** §2 — the learning rate for the next answer, given the evidence already behind the score. */
export function learningRate(evidence: number) {
  return Math.max(K_FLOOR, 1 / (1 + evidence));
}

/** §2 — points a score loses after this many days with no evidence. */
export function decayPoints(days: number) {
  if (days <= DECAY_GRACE_DAYS) return 0;
  return Math.min(DECAY_MAX, ((days - DECAY_GRACE_DAYS) / 7) * DECAY_PER_WEEK);
}

function daysBetween(from: string, to: string) {
  return Math.max(0, (Date.parse(to) - Date.parse(from)) / DAY_MS);
}

function confidenceLevel(evidence: number): ConfidenceLevel {
  if (evidence <= 0) return "none";
  if (evidence < CONFIDENCE_GUESS) return "low";
  if (evidence < CONFIDENCE_FULL) return "medium";
  return "high";
}

/** Map state of one objective. */
interface Cell {
  score: number | null;
  evidence: number;
  lastEvidenceAt: string | null;
}

/**
 * §2 update rule: new = old + w × k × (attempt − old), applied once per
 * answered question. The order of answers inside one session is not known, so
 * each one pulls toward the session's accuracy on the objective. The first
 * answer an objective ever gets sets the score (there is no "old" yet).
 */
function applyAttempt(cell: Cell, m: Measurement) {
  const w = EVIDENCE_WEIGHT[m.mode];
  if (w <= 0 || m.answered <= 0) return;
  if (cell.score !== null && cell.lastEvidenceAt)
    cell.score = Math.max(
      0,
      cell.score - decayPoints(daysBetween(cell.lastEvidenceAt, m.at)),
    );
  const attempt = (100 * m.correct) / m.answered;
  for (let i = 0; i < m.answered; i += 1) {
    if (cell.score === null) cell.score = attempt;
    else cell.score += w * learningRate(cell.evidence) * (attempt - cell.score);
    cell.evidence += w;
  }
  cell.lastEvidenceAt = m.at;
}

function stateOf(score: number | null): LoState {
  if (score === null) return "untested";
  if (score < RETEACH_LINE) return "needs_help";
  if (score < LO_FLOOR) return "working";
  return "secure";
}

export function buildScorecard(
  objectives: MasteryObjective[],
  measurements: Measurement[],
  /** Decay is measured to this date. Defaults to the last session. */
  asOf?: string,
): Scorecard {
  const ordered = [...measurements].sort(
    (a, b) => a.at.localeCompare(b.at) || a.sessionId - b.sessionId,
  );
  const rows: LoRow[] = objectives.map((objective) => ({
    id: objective.id,
    name: objective.name,
    sequence: objective.sequence,
    score: null,
    confidence: 0,
    confidenceLevel: "none",
    evidence: 0,
    answered: 0,
    correct: 0,
    decay: 0,
    firstScore: null,
    state: "untested",
    history: [],
    lastMode: null,
    lastAt: null,
  }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const cells = new Map<number, Cell>(
    rows.map((row) => [
      row.id,
      { score: null, evidence: 0, lastEvidenceAt: null },
    ]),
  );

  const sessions: Measurement[][] = [];
  for (const m of ordered) {
    const current = sessions[sessions.length - 1];
    if (current && current[0].sessionId === m.sessionId) current.push(m);
    else sessions.push([m]);
  }

  let phase: Phase = "learn";
  const tests: TestResult[] = [];
  let failedSinceClass = 0;
  let learnSessions = 0;
  const sinceTest = { homework: 0, practice: 0 };

  for (const session of sessions) {
    const mode = session[0].mode;
    const at = session[0].at;
    let answered = 0;
    let correct = 0;
    let speedRatio: number | null = null;
    for (const m of session) {
      const row = byId.get(m.loId);
      const cell = cells.get(m.loId);
      if (!row || !cell) continue;
      applyAttempt(cell, m);
      if (EVIDENCE_WEIGHT[m.mode] > 0 && m.answered > 0) {
        row.answered += m.answered;
        row.correct += m.correct;
        if (row.firstScore === null && cell.score !== null)
          row.firstScore = round(cell.score);
      }
      if (m.answered >= 1)
        row.history.push({
          sessionId: m.sessionId,
          mode: m.mode,
          at: m.at,
          accuracy: Math.round((100 * m.correct) / m.answered),
          answered: m.answered,
          scoreAfter: cell.score === null ? null : round(cell.score),
        });
      row.lastMode = m.mode;
      row.lastAt = m.at;
      answered += m.answered;
      correct += m.correct;
      if (typeof m.speedRatio === "number") speedRatio = m.speedRatio;
    }

    if (mode === "class") {
      if (phase !== "mastered") phase = "learn";
      failedSinceClass = 0;
      learnSessions = 0;
      sinceTest.homework = 0;
      sinceTest.practice = 0;
      continue;
    }
    if (mode === "homework" || mode === "practice") {
      learnSessions += 1;
      sinceTest[mode] += 1;
      continue;
    }
    if (mode !== "diagnostic" || answered === 0) continue;

    // §4 stage 4 — the Mastery Verifier reads every topic / recurring test.
    const accuracy = (100 * correct) / answered;
    const belowFloor = rows
      .filter((row) => {
        const score = cells.get(row.id)?.score ?? null;
        return score === null || score < LO_FLOOR;
      })
      .map((row) => row.id);
    const gate = {
      overall: accuracy >= MASTERY_BAR,
      floor: belowFloor.length === 0,
      speed: speedRatio === null ? null : speedRatio <= SPEED_BAND,
    };
    const outcome: TestOutcome =
      gate.overall && gate.floor && gate.speed !== false
        ? "mastered"
        : accuracy < RETEACH_LINE
          ? "reteach"
          : "remediate";
    tests.push({
      sessionId: session[0].sessionId,
      at,
      kind:
        phase === "remediate" || phase === "at_risk"
          ? "recurring_test"
          : "topic_test",
      answered,
      accuracy: round(accuracy),
      speedRatio:
        speedRatio === null ? null : Math.round(speedRatio * 100) / 100,
      belowFloor,
      gate,
      outcome,
    });
    learnSessions = 0;
    sinceTest.homework = 0;
    sinceTest.practice = 0;
    // Mastery is not taken back by a later test; decay and spaced review
    // keep it honest instead.
    if (phase === "mastered") continue;
    if (outcome === "mastered") phase = "mastered";
    else if (outcome === "reteach") phase = "reteach";
    else {
      failedSinceClass += 1;
      phase = failedSinceClass - 1 >= LOOP_GUARD ? "at_risk" : "remediate";
    }
  }

  const last = ordered[ordered.length - 1];
  const until = asOf ?? last?.at ?? null;
  let topicTotal = 0;
  let topicCount = 0;
  let topicWeighted = 0;
  for (const row of rows) {
    const cell = cells.get(row.id) as Cell;
    const decay =
      cell.score !== null && cell.lastEvidenceAt && until
        ? Math.min(
            cell.score,
            decayPoints(daysBetween(cell.lastEvidenceAt, until)),
          )
        : 0;
    row.score = cell.score === null ? null : round(cell.score - decay);
    row.decay = round(decay);
    row.evidence = round(cell.evidence);
    row.confidence =
      round(Math.min(1, cell.evidence / CONFIDENCE_FULL) * 100) / 100;
    row.confidenceLevel = confidenceLevel(cell.evidence);
    row.state = phase === "mastered" ? "mastered" : stateOf(row.score);
    topicWeighted += cell.evidence;
    if (row.score !== null) {
      topicTotal += row.score;
      topicCount += 1;
    }
  }

  const experienced = rows.filter(
    (row) => row.evidence >= CONFIDENCE_GUESS,
  ).length;
  const covered = rows.length > 0 && experienced >= PRO_COVERAGE * rows.length;
  const badge: Scorecard["badge"] =
    phase === "mastered" ? "Master" : covered ? "Pro" : "Novice";

  return {
    rows,
    topicScore: topicCount > 0 ? round(topicTotal / topicCount) : null,
    topicEvidence: round(topicWeighted),
    sessions: sessions.length,
    lastMode: last?.mode ?? null,
    phase,
    tests,
    lastTest: tests[tests.length - 1] ?? null,
    remediationLoops: Math.max(0, failedSinceClass - 1),
    learnSessions,
    sinceTest,
    badge,
    asOf: until,
  };
}

/* ------------------------------------------------------------------ *
 * Router — eight rules, top to bottom, first match wins.
 * ------------------------------------------------------------------ */

export type RuleId = "R0" | "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7";
export type Activity =
  | "close"
  | "escalate"
  | "reteach"
  | "micro_homework"
  | "practice"
  | "recurring_test"
  | "topic_test"
  | "homework";

export interface PlanItem {
  loId: number;
  questions: number;
  role: "gap" | "frontier" | "review" | "focus" | "test";
  /** §3 challenge zone: the band that puts expected success nearest 70–80%. */
  difficulty?: Difficulty;
  /** Expected success at that difficulty, 0–100. */
  expected?: number;
  /** §2 — low confidence: probe with unhinted questions before remediating. */
  probe?: boolean;
}

export interface Decision {
  rule: RuleId;
  ruleName: string;
  activity: Activity;
  activityLabel: string;
  targetLoIds: number[];
  /** Why, in this student's numbers. */
  because: string;
  /** What the activity is for and what it does to the map. */
  effect: string;
  /** Questions per objective. Empty for close, re-teach and escalate. */
  plan: PlanItem[];
}

export const RULES: Array<{
  id: RuleId;
  name: string;
  condition: string;
  activity: string;
}> = [
  {
    id: "R0",
    name: "Mastered",
    condition: `a test at ${MASTERY_BAR}%+, every objective ${LO_FLOOR}+, speed within ${SPEED_BAND}× the cohort`,
    activity: "Master badge, close the topic",
  },
  {
    id: "R1",
    name: "Loop guard",
    condition: `${LOOP_GUARD} remediation loops without mastery`,
    activity: "Flag at-risk to the teacher",
  },
  {
    id: "R2",
    name: "Re-teach",
    condition: `last test under ${RETEACH_LINE}%`,
    activity: "Teacher re-teaches, Plan Builder re-plans",
  },
  {
    id: "R3",
    name: "Close the gaps",
    condition: `last test ${RETEACH_LINE}–${MASTERY_BAR - 1}% (or short of the floor or speed), no micro-homework yet`,
    activity: `Micro-homework · ${MICRO_HOMEWORK_QUESTIONS} questions on weak objectives`,
  },
  {
    id: "R4",
    name: "Practise before the re-test",
    condition: "second remediation loop or later, no practice yet",
    activity: "Practice on the weakest objective",
  },
  {
    id: "R5",
    name: "Re-check",
    condition: "remediation done",
    activity: "Recurring test, weighted to weak objectives",
  },
  {
    id: "R6",
    name: "Time for the topic test",
    condition: `${TOPIC_TEST_AFTER} learn-loop sessions, or every objective already ${LO_FLOOR}+ and the map at ${MASTERY_BAR}+`,
    activity: "Topic test",
  },
  {
    id: "R7",
    name: "Learn loop",
    condition: "everything else",
    activity: `Homework · ${HOMEWORK_QUESTIONS} questions, ${Math.round(HOMEWORK_MIX.gap * 100)}/${Math.round(HOMEWORK_MIX.frontier * 100)}/${Math.round(HOMEWORK_MIX.review * 100)}`,
  },
];

const fmt = (n: number | null) => (n === null ? "—" : `${Math.round(n)}`);
const names = (rows: LoRow[]) => rows.map((row) => row.name).join(", ");

/** §3 challenge zone — the difficulty that puts expected success nearest the middle of 70–80%. */
export function challengeDifficulty(score: number | null): {
  difficulty: Difficulty;
  expected: number;
} {
  const base = score ?? (CHALLENGE_ZONE.low + CHALLENGE_ZONE.high) / 2;
  const target = (CHALLENGE_ZONE.low + CHALLENGE_ZONE.high) / 2;
  let best: { difficulty: Difficulty; expected: number } | null = null;
  for (const difficulty of Object.keys(DIFFICULTY_OFFSET) as Difficulty[]) {
    const expected = Math.max(
      0,
      Math.min(100, base + DIFFICULTY_OFFSET[difficulty]),
    );
    if (!best || Math.abs(expected - target) < Math.abs(best.expected - target))
      best = { difficulty, expected: Math.round(expected) };
  }
  return best as { difficulty: Difficulty; expected: number };
}

function item(
  row: LoRow,
  questions: number,
  role: PlanItem["role"],
  challenge = true,
): PlanItem {
  return {
    loId: row.id,
    questions,
    role,
    ...(challenge ? challengeDifficulty(row.score) : {}),
    probe: row.confidenceLevel === "none" || row.confidenceLevel === "low",
  };
}

const weakestFirst = (a: LoRow, b: LoRow) =>
  (a.score ?? -1) - (b.score ?? -1) || a.sequence - b.sequence;

export function routeNext(card: Scorecard): Decision {
  const rows = card.rows;
  const test = card.lastTest;
  const belowFloor = rows
    .filter((row) => row.score === null || row.score < LO_FLOOR)
    .sort(weakestFirst);

  if (card.phase === "mastered") {
    return {
      rule: "R0",
      ruleName: "Mastered",
      activity: "close",
      activityLabel: "Master badge · close the topic",
      targetLoIds: [],
      because: test
        ? `The ${test.kind === "topic_test" ? "topic test" : "recurring test"} read ${fmt(test.accuracy)}% (bar ${MASTERY_BAR}), every objective is at ${LO_FLOOR}+${test.speedRatio === null ? "" : `, and speed was ${test.speedRatio}× the cohort median`}.`
        : "The topic passed its mastery check.",
      effect:
        "Master badge. The topic closes now and its remaining classes go back to the plan. Its objectives join spaced review, the 15% slice of later homework.",
      plan: [],
    };
  }

  if (card.phase === "at_risk") {
    const stuck = test
      ? rows.filter((row) => test.belowFloor.includes(row.id))
      : belowFloor;
    return {
      rule: "R1",
      ruleName: "Loop guard",
      activity: "escalate",
      activityLabel: "Flag at-risk to the teacher",
      targetLoIds: (stuck.length > 0 ? stuck : rows).map((row) => row.id),
      because: `${card.remediationLoops} remediation loops and no mastery. The last test read ${fmt(test?.accuracy ?? null)}%.${stuck.length > 0 ? ` Not moving: ${stuck.map((row) => `${row.name} (${fmt(row.score)})`).join(", ")}.` : ""}`,
      effect:
        "The loop stops prescribing rather than cycling silently, and names the objectives that refuse to move.",
      plan: [],
    };
  }

  if (card.phase === "reteach") {
    const targets = belowFloor.length > 0 ? belowFloor : rows;
    return {
      rule: "R2",
      ruleName: "Re-teach",
      activity: "reteach",
      activityLabel: "Teacher re-teaches · Plan Builder re-plans",
      targetLoIds: targets.map((row) => row.id),
      because: `The last test read ${fmt(test?.accuracy ?? null)}%, under the ${RETEACH_LINE}% line. A score that low usually means the concept never landed in class.`,
      effect:
        "Not an AI remediation case: a mentor re-teaches and the Plan Builder re-plans the topic. Writes no score. Then the learn loop starts again.",
      plan: [],
    };
  }

  if (card.phase === "remediate") {
    const weak =
      belowFloor.length > 0 ? belowFloor : [...rows].sort(weakestFirst);
    const short = test
      ? [
          !test.gate.overall && `the test was under ${MASTERY_BAR}%`,
          !test.gate.floor &&
            `${test.belowFloor.length} objective${test.belowFloor.length === 1 ? "" : "s"} under ${LO_FLOOR}`,
          test.gate.speed === false &&
            `answers took ${test.speedRatio}× the usual time (limit ${SPEED_BAND}×)`,
        ]
          .filter(Boolean)
          .join("; ")
      : "";
    const loop = card.remediationLoops + 1;

    if (card.sinceTest.homework === 0) {
      const plan = planMicroHomework(weak);
      return {
        rule: "R3",
        ruleName: "Close the gaps",
        activity: "micro_homework",
        activityLabel: `Micro-homework · ${MICRO_HOMEWORK_QUESTIONS} questions`,
        targetLoIds: plan.map((p) => p.loId),
        because: `The test was ${fmt(test?.accuracy ?? null)}% but not mastery: ${short}. Over ${RETEACH_LINE}%, so fix the gaps rather than re-teach. Round ${loop} of ${LOOP_GUARD}.`,
        effect: `Fresh questions on the weak objectives only (${names(weak.slice(0, 2))}), at a difficulty that keeps expected success in ${CHALLENGE_ZONE.low}–${CHALLENGE_ZONE.high}%. Counts at ${EVIDENCE_WEIGHT.homework} weight.`,
        plan,
      };
    }

    if (card.remediationLoops >= 1 && card.sinceTest.practice === 0) {
      const row = weak[0];
      return {
        rule: "R4",
        ruleName: "Practise before the re-test",
        activity: "practice",
        activityLabel: `Practice · ${PRACTICE_QUESTIONS} questions, hints on`,
        targetLoIds: [row.id],
        because: `Loop ${loop}: one round of micro-homework did not get ${row.name} (${fmt(row.score)}) over ${LO_FLOOR}. Difficulty is held, not raised.`,
        effect: `Practises the method on that objective before the re-test. Counts at ${EVIDENCE_WEIGHT.practice} weight.`,
        plan: [item(row, PRACTICE_QUESTIONS, "focus")],
      };
    }

    const plan = planRecurringTest(rows);
    const total = plan.reduce((sum, p) => sum + p.questions, 0);
    return {
      rule: "R5",
      ruleName: "Re-check",
      activity: "recurring_test",
      activityLabel: `Recurring test · ${total} questions`,
      targetLoIds: plan.map((p) => p.loId),
      because: `Remediation loop ${loop} is done. Re-test on the weaknesses the last test exposed: ${names(weak.slice(0, 3))}.`,
      effect: `AI-generated paper, timed, no hints, full weight. ${MASTERY_BAR}%+ with every objective at ${LO_FLOOR}+ and speed in band closes the topic immediately.`,
      plan,
    };
  }

  // Learn loop.
  const ready =
    card.topicScore !== null &&
    card.topicScore >= MASTERY_BAR &&
    belowFloor.length === 0;
  if (card.learnSessions >= TOPIC_TEST_AFTER || ready) {
    const plan = planTopicTest(rows);
    const total = plan.reduce((sum, p) => sum + p.questions, 0);
    return {
      rule: "R6",
      ruleName: "Time for the topic test",
      activity: "topic_test",
      activityLabel: `Topic test · ${total} questions`,
      targetLoIds: plan.map((p) => p.loId),
      because: ready
        ? `The map already reads ${fmt(card.topicScore)} with every objective at ${LO_FLOOR}+. Test early rather than spend classes on what is known.`
        : card.tests.length === 0
          ? `${card.learnSessions} homework sessions and no topic test yet.`
          : `${card.learnSessions} homework sessions since the last test.`,
      effect: `Fixed blueprint, scored per objective, full weight. The mastery check reads it: ${MASTERY_BAR}%+, every objective ${LO_FLOOR}+, speed in band.`,
      plan,
    };
  }

  const plan = planHomework(rows);
  return {
    rule: "R7",
    ruleName: "Learn loop",
    activity: "homework",
    activityLabel: `Homework · ${HOMEWORK_QUESTIONS} questions`,
    targetLoIds: plan.map((p) => p.loId),
    because:
      card.sessions === 0
        ? "No evidence on this topic yet. Homework probes every objective."
        : `Learn loop, session ${card.learnSessions + 1} of ${TOPIC_TEST_AFTER} before the topic test.`,
    effect: `${Math.round(HOMEWORK_MIX.gap * 100)}% on the weakest objectives, ${Math.round(HOMEWORK_MIX.frontier * 100)}% on the frontier, ${Math.round(HOMEWORK_MIX.review * 100)}% spaced review, each at a difficulty aimed at ${CHALLENGE_ZONE.low}–${CHALLENGE_ZONE.high}% expected success. Counts at ${EVIDENCE_WEIGHT.homework} weight.`,
    plan,
  };
}

/** §3 homework mix — 60% weakest, 25% frontier, 15% spaced review. */
export function planHomework(rows: LoRow[]): PlanItem[] {
  if (rows.length === 0) return [];
  const gapCount = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.gap);
  const frontierCount = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.frontier);
  const reviewCount = HOMEWORK_QUESTIONS - gapCount - frontierCount;

  const measured = rows.filter((row) => row.score !== null).sort(weakestFirst);
  const bySequence = [...rows].sort((a, b) => a.sequence - b.sequence);
  const plan = new Map<number, PlanItem>();
  const add = (
    row: LoRow | undefined,
    questions: number,
    role: PlanItem["role"],
  ) => {
    if (!row || questions <= 0) return;
    const existing = plan.get(row.id);
    if (existing) existing.questions += questions;
    else plan.set(row.id, item(row, questions, role));
  };

  // Gap: the two weakest measured objectives under the floor; untested ones
  // fill in when fewer than two are measured.
  const gapRows = [
    ...measured.filter((row) => (row.score ?? 0) < LO_FLOOR),
    ...bySequence.filter((row) => row.score === null),
    ...measured,
  ]
    .filter((row, index, all) => all.indexOf(row) === index)
    .slice(0, 2);
  gapRows.forEach((row, index) => {
    add(
      row,
      index === 0
        ? Math.ceil(gapCount / gapRows.length)
        : Math.floor(gapCount / gapRows.length),
      "gap",
    );
  });
  // Frontier: the next objective in teaching order that is not yet secure.
  add(
    bySequence.find(
      (row) =>
        !plan.has(row.id) && (row.score === null || row.score < LO_FLOOR),
    ) ??
      [...rows]
        .filter((row) => !plan.has(row.id))
        .sort((a, b) => a.evidence - b.evidence)[0] ??
      gapRows[0],
    frontierCount,
    "frontier",
  );
  // Spaced review: the strongest secure objective, to keep it warm.
  add(
    [...measured]
      .reverse()
      .find((row) => !plan.has(row.id) && (row.score ?? 0) >= LO_FLOOR) ??
      measured.find((row) => !plan.has(row.id)) ??
      gapRows[0],
    reviewCount,
    "review",
  );
  return [...plan.values()];
}

/** §4 stage 5 — micro-homework on weak objectives only, weakest-heavy. */
export function planMicroHomework(weak: LoRow[]): PlanItem[] {
  const targets = weak.slice(0, 2);
  if (targets.length === 0) return [];
  if (targets.length === 1)
    return [item(targets[0], MICRO_HOMEWORK_QUESTIONS, "gap")];
  const first = Math.ceil((MICRO_HOMEWORK_QUESTIONS * 2) / 3);
  return [
    item(targets[0], first, "gap"),
    item(targets[1], MICRO_HOMEWORK_QUESTIONS - first, "gap"),
  ];
}

/** §4 stage 3 — the fixed-blueprint topic test: the same count on every objective. */
export function planTopicTest(rows: LoRow[]): PlanItem[] {
  if (rows.length === 0) return [];
  const per = Math.max(
    1,
    Math.min(TOPIC_TEST_PER_LO, Math.floor(TOPIC_TEST_CAP / rows.length)),
  );
  return [...rows]
    .sort((a, b) => a.sequence - b.sequence)
    .map((row) => ({ loId: row.id, questions: per, role: "test" as const }));
}

/**
 * §4 stage 5 — the recurring test: every objective gets a floor of questions,
 * the rest go to the objectives under the per-LO floor, weakest first.
 */
export function planRecurringTest(rows: LoRow[]): PlanItem[] {
  if (rows.length === 0) return [];
  const perLo = new Map<number, number>();
  for (const row of rows) perLo.set(row.id, RECURRING_TEST_MIN_PER_LO);
  let remaining = Math.max(
    0,
    RECURRING_TEST_QUESTIONS - RECURRING_TEST_MIN_PER_LO * rows.length,
  );
  const byNeed = [...rows].sort(weakestFirst);
  const weak = byNeed.filter(
    (row) => row.score === null || row.score < LO_FLOOR,
  );
  const pool = weak.length > 0 ? weak : byNeed;
  let index = 0;
  while (remaining > 0) {
    const row = pool[index % pool.length];
    perLo.set(row.id, (perLo.get(row.id) ?? 0) + 1);
    remaining -= 1;
    index += 1;
  }
  return byNeed.map((row) => ({
    ...item(row, perLo.get(row.id) ?? 0, "test"),
  }));
}

/* ------------------------------------------------------------------ *
 * Replay — what the loop would have said before every real session.
 * ------------------------------------------------------------------ */

export interface ReplayStep {
  session: SessionSummary;
  /** What the router would have prescribed *before* this session ran. */
  prescribed: Decision;
  /** Scorecard after the session's evidence is added. */
  after: Scorecard;
  /** Did the student actually do what the loop would have asked for? */
  matched: boolean;
}

export function replay(
  objectives: MasteryObjective[],
  measurements: Measurement[],
  /** Decay for the decision "now" is measured to this date. */
  asOf?: string,
): { steps: ReplayStep[]; now: Decision; card: Scorecard } {
  const ordered = [...measurements].sort(
    (a, b) => a.at.localeCompare(b.at) || a.sessionId - b.sessionId,
  );
  const sessionIds = [...new Set(ordered.map((m) => m.sessionId))];
  const steps: ReplayStep[] = [];
  let soFar: Measurement[] = [];
  for (const sessionId of sessionIds) {
    const own = ordered.filter((m) => m.sessionId === sessionId);
    const before = buildScorecard(objectives, soFar, own[0].at);
    const prescribed = routeNext(before);
    soFar = [...soFar, ...own];
    const after = buildScorecard(objectives, soFar);
    const session: SessionSummary = {
      sessionId,
      mode: own[0].mode,
      at: own[0].at,
      answered: own.reduce((sum, m) => sum + m.answered, 0),
      correct: own.reduce((sum, m) => sum + m.correct, 0),
      byLo: own.map((m) => ({
        loId: m.loId,
        answered: m.answered,
        correct: m.correct,
      })),
    };
    steps.push({
      session,
      prescribed,
      after,
      matched: activityMatches(prescribed.activity, session.mode),
    });
  }
  const card = buildScorecard(objectives, soFar, asOf);
  return { steps, now: routeNext(card), card };
}

/** Which recorded session mode an activity produces, or null for "close". */
export function modeForActivity(activity: Activity): MasteryMode | null {
  switch (activity) {
    case "topic_test":
    case "recurring_test":
      return "diagnostic";
    case "homework":
    case "micro_homework":
      return "homework";
    case "practice":
      return "practice";
    case "reteach":
    case "escalate":
      return "class";
    default:
      return null;
  }
}

function activityMatches(activity: Activity, mode: MasteryMode) {
  return modeForActivity(activity) === mode;
}
