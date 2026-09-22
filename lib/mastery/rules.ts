/**
 * The mastery loop, run against real evidence.
 *
 * Pure: takes the measurements a student has actually produced on one topic
 * and answers "what should this student do next, and why". No simulation, no
 * randomness, no hidden ability. Every number here comes from
 * `docs/mastery-analysis/decisions.md` (21 Sep 2026 back-test on production).
 */

/* ------------------------------------------------------------------ *
 * Decided constants
 * ------------------------------------------------------------------ */

export type MasteryMode =
  | "placement"
  | "diagnostic"
  | "homework"
  | "practice"
  | "check"
  /** A mentor session. Writes no score; clears a stall or a block. */
  | "class";

/** D2 — how much one answered question in each activity counts as evidence. */
export const EVIDENCE_WEIGHT: Record<MasteryMode, number> = {
  placement: 0,
  diagnostic: 1,
  check: 1,
  homework: 0.8,
  practice: 0.5,
  class: 0,
};

/**
 * D14 — the score reads the most recent this-many weighted questions, so an
 * objective a student has just learned is not anchored by the results from
 * before they learned it. Roughly a survey plus two homeworks.
 */
export const SCORE_WINDOW = 12;
/** D3 — weighted questions before a score is trusted for big decisions. */
export const LOCK_EVIDENCE = 9;
/** D5 — below this an objective is taught, not measured again. */
export const NEEDS_HELP_SCORE = 60;
export const NEEDS_HELP_EVIDENCE = 3;
/** D5 — at or above this, with enough evidence, an objective goes to its check. */
export const READY_SCORE = 80;
export const READY_EVIDENCE = 6;
/**
 * D4 — the score an objective must hold to be signed off. Equal to the ready
 * bar: a bar above the one that sends a student to the check is one many
 * students can never reach.
 */
export const CERTIFY_SCORE = 80;
/** D16 — a topic is Master when every objective is signed off AND the topic score holds this. */
export const MASTER_SCORE = 80;
/** D4 — fresh questions in an LO check, and how many must be right. */
export const CHECK_QUESTIONS = 5;
export const CHECK_PASS = 4;
/** D6 — consecutive measurements under the teaching line before a human is asked. */
export const STALL_RUNS = 3;
/** Plateau — measured sessions at 60–79 on a locked objective before a mentor teaches it. */
export const PLATEAU_RUNS = 4;
/** After a mentor class the loop measures this many sessions before it may re-teach. */
export const SESSIONS_AFTER_CLASS = 3;
/**
 * A mentor class changes the student, so evidence gathered before it is
 * discounted by this factor, so the results that caused the class stop
 * counting in full.
 */
export const CLASS_DISCOUNT = 0.5;
/** Two failed checks: repetition is not the problem. */
export const BLOCK_AFTER_FAILURES = 2;
/** R5 — one ready objective waits this many sessions before its check. */
export const SOLO_READY_WAIT = 1;
/** D7 — survey questions per objective, capped per session. */
export const SURVEY_PER_LO = 3;
export const SURVEY_CAP = 18;
/** D8 — homework mix. */
export const HOMEWORK_QUESTIONS = 12;
export const HOMEWORK_MIX = { gap: 0.6, probe: 0.25, maintain: 0.15 };
/**
 * D15 — the topic re-test ("hello check"). After this many homework / practice
 * sessions with no test, the whole topic is measured under test conditions:
 * timed, no hints, full weight, more questions on the weak objectives.
 */
export const RETEST_AFTER_SESSIONS = 2;
export const RETEST_QUESTIONS = 15;
export const RETEST_MIN_PER_LO = 2;

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
   * Only for `check` sessions, and derived by `buildScorecard`: D4 — 4 of 5
   * right, window score at or above the certify bar, and locked.
   */
  checkPassed?: boolean;
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
 * Scorecard
 * ------------------------------------------------------------------ */

export type LoState =
  | "untested"
  | "needs_help"
  | "working"
  | "ready"
  | "blocked"
  | "signed_off";

export interface LoRow {
  id: number;
  name: string;
  /** Evidence-weighted first-response accuracy over the last `SCORE_WINDOW` questions. `null` under 3. */
  score: number | null;
  /** Weighted question count — the confidence number. */
  evidence: number;
  answered: number;
  correct: number;
  locked: boolean;
  state: LoState;
  /** Per-session accuracy, oldest first. One entry per session that touched this objective. */
  history: Array<{
    sessionId: number;
    mode: MasteryMode;
    at: string;
    accuracy: number;
    answered: number;
  }>;
  lastMode: MasteryMode | null;
  lastAt: string | null;
  /** When a mentor last taught this objective. Stall counting restarts here. */
  lastClassAt: string | null;
  checkFailures: number;
  signedOff: boolean;
  /** Consecutive sessions this objective has ended in `ready`. */
  readySessions: number;
}

export interface Scorecard {
  rows: LoRow[];
  /** Evidence-weighted mean of the objectives' window scores. */
  topicScore: number | null;
  topicEvidence: number;
  /** Every objective has at least 3 weighted questions, or a topic test ran. */
  surveyDone: boolean;
  sessions: number;
  lastMode: MasteryMode | null;
  /** Sessions since a mentor class on any objective; large when there was none. */
  sessionsSinceClass: number;
  /** Homework / practice sessions since the last test-condition session (survey, re-test, check). */
  sessionsSinceTest: number;
  badge: "Novice" | "Pro" | "Master" | "None";
}

const round = (value: number) => Math.round(value * 10) / 10;

/** One activity's contribution to an objective, in weighted questions. */
interface Chunk {
  w: number;
  answered: number;
  correct: number;
}

/**
 * D1 (revised, D14) — the score reads the most recent `SCORE_WINDOW` weighted
 * questions, newest first, taking a fraction of the oldest chunk that fits.
 * Evidence (confidence) is still the whole history.
 */
function windowScore(chunks: Chunk[]) {
  let n = 0;
  let c = 0;
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const chunk = chunks[i];
    const wn = chunk.w * chunk.answered;
    const wc = chunk.w * chunk.correct;
    if (wn <= 0) continue;
    if (n + wn <= SCORE_WINDOW) {
      n += wn;
      c += wc;
    } else {
      const fraction = (SCORE_WINDOW - n) / wn;
      c += wc * fraction;
      n = SCORE_WINDOW;
      break;
    }
  }
  return n >= NEEDS_HELP_EVIDENCE ? (100 * c) / n : null;
}

function totalEvidence(chunks: Chunk[]) {
  return chunks.reduce((sum, chunk) => sum + chunk.w * chunk.answered, 0);
}

export function buildScorecard(
  objectives: MasteryObjective[],
  measurements: Measurement[],
): Scorecard {
  const ordered = [...measurements].sort(
    (a, b) => a.at.localeCompare(b.at) || a.sessionId - b.sessionId,
  );
  const rows: LoRow[] = objectives.map((objective) => ({
    id: objective.id,
    name: objective.name,
    score: null,
    evidence: 0,
    answered: 0,
    correct: 0,
    locked: false,
    state: "untested",
    history: [],
    lastMode: null,
    lastAt: null,
    lastClassAt: null,
    checkFailures: 0,
    signedOff: false,
    readySessions: 0,
  }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const chunks = new Map<number, Chunk[]>(rows.map((row) => [row.id, []]));
  let sawTopicTest = false;
  const sessionIds = new Set<number>();
  // Per session, per objective: was the objective ready at the end of it?
  const readyAfter = new Map<number, boolean[]>(
    rows.map((row) => [row.id, []]),
  );
  const sessionOrder: number[] = [];

  const rowReady = (row: LoRow) => {
    const own = chunks.get(row.id) ?? [];
    const score = windowScore(own);
    return (
      score !== null &&
      score >= READY_SCORE &&
      totalEvidence(own) >= READY_EVIDENCE
    );
  };

  for (const m of ordered) {
    const row = byId.get(m.loId);
    if (!row) continue;
    if (!sessionIds.has(m.sessionId)) {
      // Close the previous session's ready snapshot for every objective.
      if (sessionOrder.length > 0) {
        for (const r of rows) readyAfter.get(r.id)?.push(rowReady(r));
      }
      sessionIds.add(m.sessionId);
      sessionOrder.push(m.sessionId);
    }
    if (m.mode === "diagnostic") sawTopicTest = true;
    const own = chunks.get(row.id) ?? [];
    const w = EVIDENCE_WEIGHT[m.mode];
    if (w > 0 && m.answered > 0) {
      own.push({ w, answered: m.answered, correct: m.correct });
      row.answered += m.answered;
      row.correct += m.correct;
    }
    if (m.answered >= 1) {
      row.history.push({
        sessionId: m.sessionId,
        mode: m.mode,
        at: m.at,
        accuracy: Math.round((100 * m.correct) / m.answered),
        answered: m.answered,
      });
    }
    row.lastMode = m.mode;
    row.lastAt = m.at;
    if (m.mode === "class") {
      row.lastClassAt = m.at;
      row.checkFailures = 0;
      for (const chunk of own) chunk.w *= CLASS_DISCOUNT;
    }
    if (m.mode === "check") {
      // D4, evaluated with this check's own answers already in the score.
      const score = windowScore(own) ?? 0;
      const passed =
        m.correct >= CHECK_PASS &&
        score >= CERTIFY_SCORE &&
        totalEvidence(own) >= LOCK_EVIDENCE;
      m.checkPassed = passed;
      if (passed) row.signedOff = true;
      else row.checkFailures += 1;
    }
  }
  if (sessionOrder.length > 0) {
    for (const r of rows) readyAfter.get(r.id)?.push(rowReady(r));
  }

  let topicWeighted = 0;
  let topicWindowN = 0;
  let topicWindowScore = 0;
  for (const row of rows) {
    const own = chunks.get(row.id) ?? [];
    const score = windowScore(own);
    row.score = score === null ? null : round(score);
    row.evidence = round(totalEvidence(own));
    row.locked = row.evidence >= LOCK_EVIDENCE;
    row.state = deriveState(row);
    // Consecutive sessions this objective has ended in `ready`.
    let streak = 0;
    for (const ready of readyAfter.get(row.id) ?? [])
      streak = ready ? streak + 1 : 0;
    row.readySessions = streak;
    const evidence = totalEvidence(own);
    topicWeighted += evidence;
    // D16 — the topic score is the objectives' window scores, weighted by how
    // much of the window each one has filled. Same recency as the rows.
    if (score !== null) {
      const n = Math.min(evidence, SCORE_WINDOW);
      topicWindowN += n;
      topicWindowScore += n * score;
    }
  }

  const topicEvidence = round(topicWeighted);
  const topicScore =
    topicWindowN >= NEEDS_HELP_EVIDENCE
      ? round(topicWindowScore / topicWindowN)
      : null;
  const surveyDone =
    sawTopicTest || rows.every((row) => row.evidence >= NEEDS_HELP_EVIDENCE);
  const allSigned = rows.length > 0 && rows.every((row) => row.signedOff);
  const badge: Scorecard["badge"] =
    allSigned && (topicScore ?? 0) >= MASTER_SCORE
      ? "Master"
      : topicEvidence >= LOCK_EVIDENCE && (topicScore ?? 0) >= NEEDS_HELP_SCORE
        ? "Pro"
        : sessionIds.size > 0
          ? "Novice"
          : "None";
  const last = ordered[ordered.length - 1];
  const lastClassIndex = sessionOrder.reduce(
    (found, sid, index) =>
      ordered.some((m) => m.sessionId === sid && m.mode === "class")
        ? index
        : found,
    -1,
  );
  const sessionsSinceClass =
    lastClassIndex < 0 ? 999 : sessionOrder.length - 1 - lastClassIndex;
  let sessionsSinceTest = 0;
  for (let index = sessionOrder.length - 1; index >= 0; index -= 1) {
    const sid = sessionOrder[index];
    const mode = ordered.find((m) => m.sessionId === sid)?.mode;
    if (mode === "diagnostic" || mode === "check") break;
    if (mode === "homework" || mode === "practice") sessionsSinceTest += 1;
  }

  return {
    rows,
    topicScore,
    topicEvidence,
    surveyDone,
    sessions: sessionIds.size,
    lastMode: last?.mode ?? null,
    sessionsSinceClass,
    sessionsSinceTest,
    badge,
  };
}

/** D5 — never stored, always derived. */
export function deriveState(row: LoRow): LoState {
  if (row.signedOff) return "signed_off";
  if (row.checkFailures >= BLOCK_AFTER_FAILURES) return "blocked";
  if (row.score === null) return "untested";
  if (row.score < NEEDS_HELP_SCORE && row.evidence >= NEEDS_HELP_EVIDENCE)
    return "needs_help";
  if (row.score >= READY_SCORE && row.evidence >= READY_EVIDENCE)
    return "ready";
  return "working";
}

/**
 * Measured sessions on an objective since a mentor last taught it. One-question
 * sessions can only read 0 or 100, so they do not count.
 */
function measuredSinceClass(row: LoRow) {
  return row.history
    .filter((h) => h.answered >= 2)
    .filter((h) => !row.lastClassAt || h.at > row.lastClassAt);
}

/** D6 — three consecutive measurements, none reaching the teaching line. */
export function isStalled(row: LoRow) {
  const recent = measuredSinceClass(row).slice(-STALL_RUNS);
  if (recent.length < STALL_RUNS) return false;
  return recent.every((h) => h.accuracy < NEEDS_HELP_SCORE);
}

/**
 * Plateau — a trusted objective sitting at 60–79 for several sessions. Neither
 * practice (it is over the teaching line) nor a check (under the ready line)
 * will move it; a mentor will.
 */
export function isPlateaued(row: LoRow) {
  if (!row.locked || row.state !== "working") return false;
  const recent = measuredSinceClass(row).slice(-PLATEAU_RUNS);
  if (recent.length < PLATEAU_RUNS) return false;
  return recent.every((h) => h.accuracy < READY_SCORE);
}

/* ------------------------------------------------------------------ *
 * Router — eight rules, top to bottom, first match wins.
 * ------------------------------------------------------------------ */

export type RuleId =
  | "R0"
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "R6"
  | "R7"
  | "R8";
export type Activity =
  | "close"
  | "topic_class"
  | "escalate"
  | "survey"
  | "class"
  | "check"
  | "practice"
  | "topic_test"
  | "homework";

export interface Decision {
  rule: RuleId;
  ruleName: string;
  activity: Activity;
  activityLabel: string;
  targetLoIds: number[];
  /** Why, in this student's numbers. */
  because: string;
  /** What the activity is allowed to do to the scorecard. */
  effect: string;
  /** For homework: the prescribed split. */
  homeworkPlan?: Array<{
    loId: number;
    questions: number;
    role: "gap" | "probe" | "maintain";
  }>;
  /** For a topic re-test: questions per open objective, weak ones first. */
  testPlan?: Array<{ loId: number; questions: number }>;
}

export const RULES: Array<{
  id: RuleId;
  name: string;
  condition: string;
  activity: string;
}> = [
  {
    id: "R0",
    name: "Topic finished",
    condition: "every objective signed off",
    activity: "Close the topic",
  },
  {
    id: "R1",
    name: "Concept never landed",
    condition: `topic under ${NEEDS_HELP_SCORE} on ${LOCK_EVIDENCE}+ questions, no objective above it`,
    activity: "Whole-topic class",
  },
  {
    id: "R2",
    name: "Not converging",
    condition: `${STALL_RUNS} sessions in a row under ${NEEDS_HELP_SCORE}, or ${BLOCK_AFTER_FAILURES + 1} failed checks`,
    activity: "Flag to teacher",
  },
  {
    id: "R3",
    name: "Nothing to read",
    condition: "no topic test yet and objectives untested",
    activity: "Topic survey",
  },
  {
    id: "R4",
    name: "Objective blocked or stuck",
    condition: `failed its check ${BLOCK_AFTER_FAILURES} times, or trusted and 60–79 for ${PLATEAU_RUNS} sessions`,
    activity: "Class on that objective",
  },
  {
    id: "R5",
    name: "Ready to certify",
    condition: `2+ objectives at ${READY_SCORE}+ on ${READY_EVIDENCE}+ questions, or 1 that has waited`,
    activity: "LO check",
  },
  {
    id: "R6",
    name: "Needs teaching",
    condition: `an objective under ${NEEDS_HELP_SCORE}, not just practised`,
    activity: "Practice",
  },
  {
    id: "R7",
    name: "Time to measure",
    condition: `${RETEST_AFTER_SESSIONS} homework / practice sessions since the last test`,
    activity: "Topic re-test",
  },
  {
    id: "R8",
    name: "Default",
    condition: "everything else",
    activity: "Homework",
  },
];

const fmt = (n: number | null) => (n === null ? "—" : `${Math.round(n)}`);

export function routeNext(card: Scorecard): Decision {
  const rows = card.rows;
  const open = rows.filter((row) => !row.signedOff);

  if (rows.length > 0 && open.length === 0) {
    return {
      rule: "R0",
      ruleName: "Topic finished",
      activity: "close",
      activityLabel: "Close the topic",
      targetLoIds: [],
      because: `All ${rows.length} objectives are signed off.`,
      effect:
        "Classes booked for this topic and not needed go back to the plan.",
    };
  }

  const measured = open.filter((row) => row.score !== null);
  if (
    card.topicScore !== null &&
    card.topicEvidence >= LOCK_EVIDENCE &&
    card.topicScore < NEEDS_HELP_SCORE &&
    measured.length >= 2 &&
    measured.every((row) => (row.score ?? 0) < NEEDS_HELP_SCORE) &&
    card.lastMode !== "practice" &&
    card.sessionsSinceClass >= SESSIONS_AFTER_CLASS
  ) {
    return {
      rule: "R1",
      ruleName: "Concept never landed",
      activity: "topic_class",
      activityLabel: "Whole-topic class with a mentor",
      targetLoIds: open.map((row) => row.id),
      because: `Topic score ${fmt(card.topicScore)} on ${card.topicEvidence} weighted questions, and every measured objective is under ${NEEDS_HELP_SCORE}. This is not one weak spot.`,
      effect: "A mentor re-teaches the topic. Writes no score.",
    };
  }

  const blockedTwice = open.find(
    (row) => row.checkFailures >= BLOCK_AFTER_FAILURES + 1,
  );
  const stalled = open.find(isStalled);
  if (blockedTwice || stalled) {
    const row = (blockedTwice ?? stalled) as LoRow;
    const recent = row.history
      .slice(-STALL_RUNS)
      .map((h) => `${h.accuracy}%`)
      .join(" → ");
    return {
      rule: "R2",
      ruleName: "Not converging",
      activity: "escalate",
      activityLabel: "Flag to the teacher",
      targetLoIds: [row.id],
      because: blockedTwice
        ? `${row.name} has failed its check ${row.checkFailures} times.`
        : `${row.name}: last ${STALL_RUNS} sessions read ${recent}. Nothing is moving and it is under ${NEEDS_HELP_SCORE}.`,
      effect: "The loop stops prescribing and names the objective to a human.",
    };
  }

  if (!card.surveyDone) {
    const untested = rows.filter((row) => row.evidence < NEEDS_HELP_EVIDENCE);
    const questions = Math.min(SURVEY_CAP, untested.length * SURVEY_PER_LO);
    return {
      rule: "R3",
      ruleName: "Nothing to read",
      activity: "survey",
      activityLabel: `Topic survey · ${questions} questions`,
      targetLoIds: untested.map((row) => row.id),
      because: `${untested.length} of ${rows.length} objectives have under ${NEEDS_HELP_EVIDENCE} questions of evidence and no topic test has run.`,
      effect: `${SURVEY_PER_LO} questions per objective at full weight. Fills the scorecard; can never certify.`,
    };
  }

  const blocked = open.find((row) => row.state === "blocked");
  const plateaued =
    card.sessionsSinceClass >= SESSIONS_AFTER_CLASS
      ? open.find(isPlateaued)
      : undefined;
  if (blocked || plateaued) {
    const row = (blocked ?? plateaued) as LoRow;
    const recent = measuredSinceClass(row)
      .slice(-PLATEAU_RUNS)
      .map((h) => `${h.accuracy}%`)
      .join(", ");
    return {
      rule: "R4",
      ruleName: blocked ? "Objective blocked" : "Objective stuck",
      activity: "class",
      activityLabel: "Class on one objective",
      targetLoIds: [row.id],
      because: blocked
        ? `${row.name} failed its check twice.`
        : `${row.name} is at ${fmt(row.score)} on ${row.evidence} questions and the last ${PLATEAU_RUNS} sessions read ${recent} — over the teaching line, under the ready line. Homework alone is not moving it.`,
      effect: "A mentor takes that objective. The rest keep running.",
    };
  }

  // A check never follows a class directly: the loop measures first.
  const ready = open.filter(
    (row) => row.state === "ready" && row.lastMode !== "class",
  );
  if (
    ready.length >= 2 ||
    (ready.length === 1 && ready[0].readySessions > SOLO_READY_WAIT)
  ) {
    const batch = ready.slice(0, 3);
    return {
      rule: "R5",
      ruleName: "Ready to certify",
      activity: "check",
      activityLabel: `LO check · ${batch.length * CHECK_QUESTIONS} fresh questions`,
      targetLoIds: batch.map((row) => row.id),
      because:
        ready.length >= 2
          ? `${ready.length} objectives are at ${READY_SCORE}+ with ${READY_EVIDENCE}+ questions behind them: ${ready.map((row) => `${row.name} (${fmt(row.score)})`).join(", ")}.`
          : `${ready[0].name} is at ${fmt(ready[0].score)} and has held it for ${ready[0].readySessions} sessions.`,
      effect: `${CHECK_QUESTIONS} unseen questions per objective, no hints. ${CHECK_PASS} of ${CHECK_QUESTIONS} right and a score of ${CERTIFY_SCORE}+ signs it off — permanently.`,
    };
  }

  const needsHelp = open
    .filter((row) => row.state === "needs_help" && row.lastMode !== "practice")
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  if (needsHelp && card.lastMode !== "practice") {
    return {
      rule: "R6",
      ruleName: "Needs teaching",
      activity: "practice",
      activityLabel: "Practice · 5 questions, hints on",
      targetLoIds: [needsHelp.id],
      because: `${needsHelp.name} is at ${fmt(needsHelp.score)} on ${needsHelp.evidence} questions — under ${NEEDS_HELP_SCORE}. Another measurement would not tell us anything new.`,
      effect: `Teaches. The first response on each question counts at half weight; hints and retries count for nothing.`,
    };
  }

  if (card.sessionsSinceTest >= RETEST_AFTER_SESSIONS) {
    const testPlan = planRetest(open);
    const total = testPlan.reduce((sum, item) => sum + item.questions, 0);
    return {
      rule: "R7",
      ruleName: "Time to measure",
      activity: "topic_test",
      activityLabel: `Topic re-test · ${total} questions`,
      targetLoIds: testPlan.map((item) => item.loId),
      because: `${card.sessionsSinceTest} sessions of homework and practice since the topic was last measured under test conditions.`,
      effect: `Timed, no hints, full weight across every open objective — more questions where the score is low, fewer where it is high. Shows whether the teaching landed. Cannot certify; that is the LO check's job.`,
      testPlan,
    };
  }

  const homeworkPlan = planHomework(open);
  return {
    rule: "R8",
    ruleName: "Default",
    activity: "homework",
    activityLabel: `Homework · ${HOMEWORK_QUESTIONS} questions`,
    targetLoIds: homeworkPlan.map((item) => item.loId),
    because:
      "No safety rule fired, nothing is ready for its check, nothing is under the teaching line.",
    effect: `Moves and measures at ${EVIDENCE_WEIGHT.homework} weight. ${Math.round(HOMEWORK_MIX.gap * 100)}% on the weakest objectives, ${Math.round(HOMEWORK_MIX.probe * 100)}% on the least measured, ${Math.round(HOMEWORK_MIX.maintain * 100)}% to keep strong ones fresh.`,
    homeworkPlan,
  };
}

/**
 * D15 — split the re-test across open objectives: every objective gets a
 * floor, the remainder goes to the weakest (untested counts as weakest).
 */
export function planRetest(open: LoRow[]): NonNullable<Decision["testPlan"]> {
  if (open.length === 0) return [];
  const perLo = new Map<number, number>();
  for (const row of open) perLo.set(row.id, RETEST_MIN_PER_LO);
  let remaining = RETEST_QUESTIONS - RETEST_MIN_PER_LO * open.length;
  const byNeed = [...open].sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
  // Deal the remaining questions round-robin from the weakest up, but stop
  // topping up an objective once it is comfortably over the ready line.
  const eligible = byNeed.filter((row) => (row.score ?? 0) < READY_SCORE + 10);
  const pool = eligible.length > 0 ? eligible : byNeed;
  let index = 0;
  while (remaining > 0) {
    const row = pool[index % pool.length];
    perLo.set(row.id, (perLo.get(row.id) ?? 0) + 1);
    remaining -= 1;
    index += 1;
  }
  return byNeed.map((row) => ({
    loId: row.id,
    questions: perLo.get(row.id) ?? 0,
  }));
}

/** D8 — split the homework by what the scorecard says. */
export function planHomework(
  open: LoRow[],
): NonNullable<Decision["homeworkPlan"]> {
  if (open.length === 0) return [];
  const gapCount = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.gap);
  const probeCount = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.probe);
  const maintainCount = HOMEWORK_QUESTIONS - gapCount - probeCount;

  const byScore = [...open].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const byEvidence = [...open].sort((a, b) => a.evidence - b.evidence);
  const strong = [...open]
    .filter((row) => (row.score ?? 0) >= READY_SCORE)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const plan = new Map<
    number,
    { loId: number; questions: number; role: "gap" | "probe" | "maintain" }
  >();
  const add = (
    row: LoRow | undefined,
    questions: number,
    role: "gap" | "probe" | "maintain",
  ) => {
    if (!row || questions <= 0) return;
    const existing = plan.get(row.id);
    if (existing) existing.questions += questions;
    else plan.set(row.id, { loId: row.id, questions, role });
  };
  // Gap: the two weakest objectives share the gap questions.
  const gapRows = byScore.slice(0, 2);
  gapRows.forEach((row, index) => {
    add(
      row,
      index === 0
        ? Math.ceil(gapCount / gapRows.length)
        : Math.floor(gapCount / gapRows.length),
      "gap",
    );
  });
  // Probe: the least-measured objective not already a gap target.
  add(
    byEvidence.find((row) => !plan.has(row.id)) ?? byEvidence[0],
    probeCount,
    "probe",
  );
  // Maintain: strongest objective, or the next weakest if nothing is strong yet.
  add(
    strong.find((row) => !plan.has(row.id)) ??
      byScore.find((row) => !plan.has(row.id)) ??
      byScore[0],
    maintainCount,
    "maintain",
  );
  return [...plan.values()];
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
): { steps: ReplayStep[]; now: Decision; card: Scorecard } {
  const ordered = [...measurements].sort(
    (a, b) => a.at.localeCompare(b.at) || a.sessionId - b.sessionId,
  );
  const sessionIds = [...new Set(ordered.map((m) => m.sessionId))];
  const steps: ReplayStep[] = [];
  let soFar: Measurement[] = [];
  for (const sessionId of sessionIds) {
    const before = buildScorecard(objectives, soFar);
    const prescribed = routeNext(before);
    const own = ordered.filter((m) => m.sessionId === sessionId);
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
  const card = buildScorecard(objectives, soFar);
  return { steps, now: routeNext(card), card };
}

function activityMatches(activity: Activity, mode: MasteryMode) {
  if (activity === "survey" || activity === "topic_test")
    return mode === "diagnostic";
  if (activity === "check") return mode === "check";
  if (activity === "class" || activity === "topic_class")
    return mode === "class";
  return activity === mode;
}
