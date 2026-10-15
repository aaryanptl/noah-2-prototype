/**
 * Back-test: does Jev's gap-vs-slip read on a student's wrong answers predict
 * what happens next on that objective, beyond what the score already says?
 *
 *   npx tsx scripts/mastery-analysis/backtest-gap-share.ts --n=40 --seed=1
 *
 * Unit: one student × objective, snapshotted after the first session where the
 * loop has a real decision to make between practice and a class — window score
 * 40–79 on 6+ weighted questions, 3+ wrong answers so far — and the student
 * then answered 6+ more questions on it. Outcome: pooled first-response
 * accuracy on everything after the snapshot ("later accuracy", as in
 * decisions.md), and "stuck" = later accuracy under 60.
 *
 * Inputs: snapshots from output/analysis/dataset.json (pull-dataset.mjs); the
 * wrong answers' text from the read-only replica; judgements from Jev, cached
 * in output/jev-cache/wrong. Control: the share of wrong answers submitted in
 * under 4 seconds, which needs no AI.
 *
 * Writes output/analysis/gap-backtest.json.
 */
import fs from "node:fs";

for (const file of [".env", ".env.local"])
  if (fs.existsSync(file))
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([\w_]+)=(.*)$/.exec(line);
      if (m && !process.env[m[1]])
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }

import { Pool } from "pg";

import {
  judgeWrongAnswers,
  toWrongAnswer,
  WRONG_ANSWER_COLUMNS,
  WRONG_ANSWER_FROM,
} from "../../lib/mastery/errors";
import {
  ERROR_WINDOW,
  type ErrorJudgement,
  type ErrorReading,
  readErrors,
} from "../../lib/mastery/gap";
import {
  buildScorecard,
  isPlateaued,
  isStalled,
  type MasteryMode,
  type Measurement,
} from "../../lib/mastery/rules";

const arg = (name: string, fallback: number) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};
const N = arg("n", 40);
const SEED = arg("seed", 1);
const CONCURRENCY = arg("concurrency", 6);
const FAST_MS = 4000;

/* ---------------- snapshots from the local dataset ---------------- */

interface DsSession {
  id: string;
  student: string;
  mode: string;
  scope: string;
  subject: string;
  started_at: string;
  completed_at: string | null;
}
interface DsQuestion {
  id: string;
  sid: string;
  lo: string | null;
  fv: string | null;
  ms: number | null;
}

const ds = JSON.parse(
  fs.readFileSync("output/analysis/dataset.json", "utf8"),
) as { sessions: DsSession[]; questions: DsQuestion[] };

const LOOP_MODES = new Set(["diagnostic", "homework", "practice"]);
const sessions = new Map(
  ds.sessions
    .filter(
      (s) =>
        s.completed_at &&
        s.subject === "math" &&
        s.scope !== "grade" &&
        LOOP_MODES.has(s.mode),
    )
    .map((s) => [s.id, s]),
);

interface SessionOnLo {
  sid: string;
  mode: MasteryMode;
  at: string;
  answered: number;
  correct: number;
  wrong: Array<{ tsq: number; ms: number | null }>;
}

const series = new Map<string, Map<string, SessionOnLo>>();
for (const q of ds.questions) {
  const s = sessions.get(q.sid);
  if (!s || !q.lo || !q.fv || q.fv === "non_attempt") continue;
  const key = `${s.student}|${q.lo}`;
  let bySession = series.get(key);
  if (!bySession) {
    bySession = new Map();
    series.set(key, bySession);
  }
  let row = bySession.get(q.sid);
  if (!row) {
    row = {
      sid: q.sid,
      mode: s.mode as MasteryMode,
      at: s.started_at,
      answered: 0,
      correct: 0,
      wrong: [],
    };
    bySession.set(q.sid, row);
  }
  row.answered += 1;
  if (q.fv === "correct") row.correct += 1;
  else row.wrong.push({ tsq: Number(q.id), ms: q.ms });
}

interface Snapshot {
  key: string;
  loId: number;
  score: number;
  evidence: number;
  needsHelp: boolean;
  stalled: boolean;
  plateaued: boolean;
  sessionsBefore: number;
  wrongBefore: number;
  windowTsq: number[];
  fastShare: number;
  laterAnswered: number;
  laterAccuracy: number;
  /** The loop's stall or plateau rule fires at a later session on this objective. */
  laterFlagged: boolean;
}

const snapshots: Snapshot[] = [];
for (const [key, bySession] of series) {
  const ordered = [...bySession.values()].sort(
    (a, b) => a.at.localeCompare(b.at) || Number(a.sid) - Number(b.sid),
  );
  if (ordered.length < 2) continue;
  const loId = Number(key.split("|")[1]);
  const objectives = [{ id: loId, name: String(loId), sequence: 1 }];
  for (let k = 1; k < ordered.length; k += 1) {
    const before = ordered.slice(0, k);
    const after = ordered.slice(k);
    const laterAnswered = after.reduce((n, s) => n + s.answered, 0);
    if (laterAnswered < 6) break; // only shrinks from here
    const measurements: Measurement[] = before.map((s) => ({
      sessionId: Number(s.sid),
      mode: s.mode,
      at: s.at,
      loId,
      answered: s.answered,
      correct: s.correct,
    }));
    const row = buildScorecard(objectives, measurements).rows[0];
    const wrong = before.flatMap((s) => s.wrong);
    if (
      row.score === null ||
      row.score < 40 ||
      row.score >= 80 ||
      row.evidence < 6 ||
      wrong.length < 3
    )
      continue;
    const window = wrong.slice(-ERROR_WINDOW);
    // Does the loop's own stall or plateau rule fire at any later session?
    let laterFlagged = false;
    for (let j = k + 1; j <= ordered.length && !laterFlagged; j += 1) {
      const later = buildScorecard(
        objectives,
        ordered.slice(0, j).map((s) => ({
          sessionId: Number(s.sid),
          mode: s.mode,
          at: s.at,
          loId,
          answered: s.answered,
          correct: s.correct,
        })),
      ).rows[0];
      laterFlagged = isStalled(later) || isPlateaued(later);
    }
    snapshots.push({
      laterFlagged,
      key,
      loId,
      score: row.score,
      evidence: row.evidence,
      needsHelp: row.state === "needs_help",
      stalled: isStalled(row),
      plateaued: isPlateaued(row),
      sessionsBefore: k,
      wrongBefore: wrong.length,
      windowTsq: window.map((w) => w.tsq),
      fastShare:
        window.filter((w) => w.ms !== null && w.ms < FAST_MS).length /
        window.length,
      laterAnswered,
      laterAccuracy:
        (100 * after.reduce((n, s) => n + s.correct, 0)) / laterAnswered,
    });
    break; // first qualifying snapshot per series
  }
}

/* ---------------- statistics ---------------- */

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
function pearson(xs: number[], ys: number[]) {
  const mx = avg(xs);
  const my = avg(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}
function linearFit(xs: number[], ys: number[]) {
  const mx = avg(xs);
  const my = avg(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
function shuffle<T>(xs: T[], random: () => number) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/** Mean and 95% bootstrap interval. */
function bootMean(xs: number[], random: () => number, reps = 2000) {
  if (xs.length === 0)
    return { mean: Number.NaN, lo: Number.NaN, hi: Number.NaN };
  const means: number[] = [];
  for (let r = 0; r < reps; r += 1) {
    let s = 0;
    for (let i = 0; i < xs.length; i += 1)
      s += xs[Math.floor(random() * xs.length)];
    means.push(s / xs.length);
  }
  means.sort((a, b) => a - b);
  return {
    mean: avg(xs),
    lo: means[Math.floor(reps * 0.025)],
    hi: means[Math.floor(reps * 0.975)],
  };
}
/** Probability a random positive outranks a random negative. */
function auc(scores: number[], labels: boolean[]) {
  const pos = labels.filter(Boolean).length;
  const neg = labels.length - pos;
  let wins = 0;
  for (let i = 0; i < scores.length; i += 1)
    for (let j = 0; j < scores.length; j += 1)
      if (labels[i] && !labels[j])
        wins += scores[i] > scores[j] ? 1 : scores[i] === scores[j] ? 0.5 : 0;
  return wins / (pos * neg);
}
/** Logistic regression on standardised features, plain gradient descent. */
function logistic(X: number[][], y: boolean[]) {
  const d = X[0].length;
  const mu = Array.from({ length: d }, (_, j) => avg(X.map((r) => r[j])));
  const sd = Array.from(
    { length: d },
    (_, j) => Math.sqrt(avg(X.map((r) => (r[j] - mu[j]) ** 2))) || 1,
  );
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const w = new Array(d + 1).fill(0);
  for (let it = 0; it < 3000; it += 1) {
    const g = new Array(d + 1).fill(0);
    for (let i = 0; i < Z.length; i += 1) {
      const z = w[0] + Z[i].reduce((s, v, j) => s + v * w[j + 1], 0);
      const err = 1 / (1 + Math.exp(-z)) - (y[i] ? 1 : 0);
      g[0] += err;
      for (let j = 0; j < d; j += 1) g[j + 1] += err * Z[i][j];
    }
    for (let j = 0; j <= d; j += 1)
      w[j] -= (0.5 * g[j]) / Z.length + 0.001 * (j ? w[j] : 0);
  }
  return (x: number[]) => {
    const z =
      w[0] + x.reduce((s, v, j) => s + ((v - mu[j]) / sd[j]) * w[j + 1], 0);
    return 1 / (1 + Math.exp(-z));
  };
}
/** 5-fold cross-validated AUC and log loss for predicting "stuck". */
function crossValidate(X: number[][], y: boolean[], random: () => number) {
  const idx = shuffle(
    X.map((_, i) => i),
    random,
  );
  const pred = new Array<number>(X.length);
  for (let f = 0; f < 5; f += 1) {
    const test = idx.filter((_, i) => i % 5 === f);
    const train = idx.filter((_, i) => i % 5 !== f);
    const model = logistic(
      train.map((i) => X[i]),
      train.map((i) => y[i]),
    );
    for (const i of test) pred[i] = model(X[i]);
  }
  const eps = 1e-6;
  const logLoss = avg(
    pred.map(
      (p, i) =>
        -(y[i] ? Math.log(Math.max(eps, p)) : Math.log(Math.max(eps, 1 - p))),
    ),
  );
  return { auc: auc(pred, y), logLoss };
}

/* ---------------- run ---------------- */

const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

async function main() {
  const random = rng(SEED);
  const all = snapshots;
  console.log(
    `snapshots ${all.length} (score 40–79, evidence ≥6, ≥3 wrong, ≥6 later answers)`,
  );
  const fitAll = linearFit(
    all.map((s) => s.score),
    all.map((s) => s.laterAccuracy),
  );
  const population = {
    n: all.length,
    laterAccuracy: r1(avg(all.map((s) => s.laterAccuracy))),
    stuckRate: r3(avg(all.map((s) => (s.laterAccuracy < 60 ? 1 : 0)))),
    rScoreLater: r3(
      pearson(
        all.map((s) => s.score),
        all.map((s) => s.laterAccuracy),
      ),
    ),
    rFastShareLater: r3(
      pearson(
        all.map((s) => s.fastShare),
        all.map((s) => s.laterAccuracy),
      ),
    ),
    flagged: {
      needsHelp: all.filter((s) => s.needsHelp).length,
      stalled: all.filter((s) => s.stalled).length,
      plateaued: all.filter((s) => s.plateaued).length,
    },
  };
  console.log("population (no AI):", population);

  const sample = shuffle(all, random).slice(0, N);
  const tsqs = [...new Set(sample.flatMap((s) => s.windowTsq))];
  console.log(`sample ${sample.length} series → ${tsqs.length} wrong answers`);

  const pool = new Pool({
    connectionString: process.env.MAIN_DATABASE_READ_ONLY_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  const { rows } = await pool.query(
    `
    with fa as (
      select distinct on (a.test_session_question_id)
        a.test_session_question_id tsq, a.verdict, a.student_answer, a.time_taken_ms
      from attempts a
      where a.test_session_question_id = any($1::bigint[])
      order by a.test_session_question_id, a.attempt_number, a.submitted_at, a.id
    )
    select ${WRONG_ANSWER_COLUMNS}
    ${WRONG_ANSWER_FROM}
    where sq.id = any($1::bigint[])
    `,
    [tsqs],
  );
  await pool.end();
  const answers = rows.map(toWrongAnswer);
  console.log(`loaded ${answers.length} answers; asking Jev…`);

  const { judgements, usage } = await judgeWrongAnswers(answers, CONCURRENCY);
  console.log("jev usage:", usage);

  const byTsq = new Map(answers.map((a) => [a.tsq, a]));
  const rowsOut = sample.flatMap((s) => {
    const judged: ErrorJudgement[] = s.windowTsq.flatMap((tsq) => {
      const a = byTsq.get(tsq);
      const j = judgements.get(tsq);
      if (!a || !j) return [];
      return [
        {
          tsq,
          loId: a.loId,
          sessionId: a.sessionId,
          mode: a.mode,
          at: a.at,
          realGap: j.realGap,
          reason: j.reason,
          tooFast: j.tooFast,
          severity: j.severity,
        },
      ];
    });
    const read = readErrors(judged);
    if (read.gapShare === null || read.judged < 3) return [];
    return [{ ...s, ...read }];
  });

  const xs = (f: (r: (typeof rowsOut)[number]) => number) => rowsOut.map(f);
  const later = xs((r) => r.laterAccuracy);
  const stuck = rowsOut.map((r) => r.laterAccuracy < 60);
  // The score's own prediction, fitted on the whole population (no AI), so the
  // residual is "what the score did not see".
  const residual = rowsOut.map(
    (r) => r.laterAccuracy - (fitAll.a + fitAll.b * r.score),
  );

  const correlations = {
    rScoreLater: r3(
      pearson(
        xs((r) => r.score),
        later,
      ),
    ),
    rGapLater: r3(
      pearson(
        xs((r) => r.gapShare ?? 0),
        later,
      ),
    ),
    rGuessLater: r3(
      pearson(
        xs((r) => r.guessShare ?? 0),
        later,
      ),
    ),
    rSeverityLater: r3(
      pearson(
        xs((r) => r.severity ?? 0),
        later,
      ),
    ),
    rFastLater: r3(
      pearson(
        xs((r) => r.fastShare),
        later,
      ),
    ),
    // What the score left unexplained, against each extra signal.
    rGapResidual: r3(
      pearson(
        xs((r) => r.gapShare ?? 0),
        residual,
      ),
    ),
    rSeverityResidual: r3(
      pearson(
        xs((r) => r.severity ?? 0),
        residual,
      ),
    ),
    rFastResidual: r3(
      pearson(
        xs((r) => r.fastShare),
        residual,
      ),
    ),
    rGuessResidual: r3(
      pearson(
        xs((r) => r.guessShare ?? 0),
        residual,
      ),
    ),
    rGuessFast: r3(
      pearson(
        xs((r) => r.guessShare ?? 0),
        xs((r) => r.fastShare),
      ),
    ),
    rGapScore: r3(
      pearson(
        xs((r) => r.gapShare ?? 0),
        xs((r) => r.score),
      ),
    ),
    rGapFast: r3(
      pearson(
        xs((r) => r.gapShare ?? 0),
        xs((r) => r.fastShare),
      ),
    ),
  };

  // Tertiles of gap share: low / middle / high, independent of the page's cut-offs.
  const sortedGap = xs((r) => r.gapShare ?? 0).sort((a, b) => a - b);
  const t1 = sortedGap[Math.floor(sortedGap.length / 3)];
  const t2 = sortedGap[Math.floor((2 * sortedGap.length) / 3)];
  const tertile = (g: number) => (g < t1 ? "low" : g < t2 ? "mid" : "high");
  const byTertile = Object.fromEntries(
    ["low", "mid", "high"].map((t) => {
      const group = rowsOut.filter((r) => tertile(r.gapShare ?? 0) === t);
      const res = bootMean(
        group.map((r) => residual[rowsOut.indexOf(r)]),
        random,
      );
      return [
        t,
        {
          n: group.length,
          meanScore: r1(avg(group.map((r) => r.score))),
          laterAccuracy: r1(avg(group.map((r) => r.laterAccuracy))),
          stuckRate: r3(avg(group.map((r) => (r.laterAccuracy < 60 ? 1 : 0)))),
          residual: { mean: r1(res.mean), lo: r1(res.lo), hi: r1(res.hi) },
        },
      ];
    }),
  );

  const byReading: Record<string, unknown> = {};
  for (const reading of [
    "gap",
    "mixed",
    "slip",
    "guessing",
  ] as ErrorReading[]) {
    const group = rowsOut.filter((r) => r.reading === reading);
    if (group.length === 0) continue;
    const res = bootMean(
      group.map((r) => residual[rowsOut.indexOf(r)]),
      random,
    );
    byReading[reading] = {
      n: group.length,
      meanScore: r1(avg(group.map((r) => r.score))),
      laterAccuracy: r1(avg(group.map((r) => r.laterAccuracy))),
      stuckRate: r3(avg(group.map((r) => (r.laterAccuracy < 60 ? 1 : 0)))),
      laterFlaggedRate: r3(avg(group.map((r) => (r.laterFlagged ? 1 : 0)))),
      residual: { mean: r1(res.mean), lo: r1(res.lo), hi: r1(res.hi) },
    };
  }

  const bands = Object.fromEntries(
    [
      ["40-59", 40, 60],
      ["60-79", 60, 80],
    ].map(([label, lo, hi]) => {
      const group = rowsOut.filter(
        (r) => r.score >= Number(lo) && r.score < Number(hi),
      );
      const half = (high: boolean) =>
        group.filter((r) => (tertile(r.gapShare ?? 0) === "high") === high);
      const describe = (g: typeof group) => ({
        n: g.length,
        laterAccuracy: g.length ? r1(avg(g.map((r) => r.laterAccuracy))) : null,
        stuckRate: g.length
          ? r3(avg(g.map((r) => (r.laterAccuracy < 60 ? 1 : 0))))
          : null,
      });
      return [
        label,
        { highGap: describe(half(true)), rest: describe(half(false)) },
      ];
    }),
  );

  type Row = (typeof rowsOut)[number];
  const FEATURE_SETS: Record<string, (r: Row) => number[]> = {
    score: (r) => [r.score],
    scoreFast: (r) => [r.score, r.fastShare],
    scoreGap: (r) => [r.score, r.gapShare ?? 0],
    scoreGuess: (r) => [r.score, r.guessShare ?? 0],
    scoreGuessFast: (r) => [r.score, r.guessShare ?? 0, r.fastShare],
    scoreGapGuessFast: (r) => [
      r.score,
      r.gapShare ?? 0,
      r.guessShare ?? 0,
      r.fastShare,
    ],
    scoreSeverity: (r) => [r.score, r.severity ?? 0],
  };
  const OUTCOMES: Record<string, boolean[]> = {
    stuck,
    laterStallOrPlateau: rowsOut.map((r) => r.laterFlagged),
  };
  const modelsOut = Object.fromEntries(
    Object.entries(OUTCOMES).map(([outcome, y]) => [
      outcome,
      {
        positives: y.filter(Boolean).length,
        ...Object.fromEntries(
          Object.entries(FEATURE_SETS).map(([name, f]) => {
            const v = crossValidate(rowsOut.map(f), y, rng(SEED + 1));
            return [name, { auc: r3(v.auc), logLoss: r3(v.logLoss) }];
          }),
        ),
      },
    ]),
  );

  const flagged = ["stalled", "plateaued", "needsHelp"].map((flag) => {
    const group = rowsOut.filter((r) => r[flag as "stalled"]);
    return {
      flag,
      n: group.length,
      byReading: Object.fromEntries(
        (["gap", "mixed", "slip", "guessing"] as ErrorReading[]).map((rd) => {
          const g = group.filter((r) => r.reading === rd);
          return [
            rd,
            {
              n: g.length,
              laterAccuracy: g.length
                ? r1(avg(g.map((r) => r.laterAccuracy)))
                : null,
            },
          ];
        }),
      ),
    };
  });

  const result = {
    ranAt: new Date().toISOString(),
    params: { n: N, seed: SEED, errorWindow: ERROR_WINDOW, fastMs: FAST_MS },
    population,
    sample: {
      series: rowsOut.length,
      laterAccuracy: r1(avg(later)),
      stuckRate: r3(avg(stuck.map((s) => (s ? 1 : 0)))),
      gapShareQuantiles: {
        p10: r3(sortedGap[Math.floor(sortedGap.length * 0.1)]),
        p33: r3(t1),
        p50: r3(sortedGap[Math.floor(sortedGap.length * 0.5)]),
        p67: r3(t2),
        p90: r3(sortedGap[Math.floor(sortedGap.length * 0.9)]),
      },
      readings: Object.fromEntries(
        (["gap", "mixed", "slip", "guessing"] as ErrorReading[]).map((rd) => [
          rd,
          rowsOut.filter((r) => r.reading === rd).length,
        ]),
      ),
    },
    usage,
    correlations,
    byTertile,
    byReading,
    bands,
    models: modelsOut,
    flagged,
  };
  fs.mkdirSync("output/analysis", { recursive: true });
  fs.writeFileSync(
    "output/analysis/gap-backtest.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify({ ...result, population: undefined }, null, 2));
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
