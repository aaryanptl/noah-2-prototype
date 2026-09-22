import {
  buildScorecard,
  CHECK_QUESTIONS,
  type MasteryMode,
  type MasteryObjective,
  type Measurement,
  routeNext,
  SURVEY_PER_LO,
} from "../../lib/mastery/rules";

const CLASS_GAIN = Number(process.env.CLASS_GAIN ?? 0.15);
const objectives: MasteryObjective[] = [1, 2, 3, 4, 5].map((id) => ({
  id,
  name: `LO${id}`,
  sequence: id,
}));
function binomial(n: number, p: number) {
  let k = 0;
  for (let i = 0; i < n; i += 1) if (Math.random() < p) k += 1;
  return k;
}
function modeFor(a: string): MasteryMode | null {
  return a === "survey" || a === "topic_test"
    ? "diagnostic"
    : a === "homework"
      ? "homework"
      : a === "practice"
        ? "practice"
        : a === "check"
          ? "check"
          : a === "close"
            ? null
            : "class";
}

function run(p: number, tiltAmp = 0.15, maxRounds = 60, verbose = false) {
  const tilt: Record<number, number> = {};
  for (const o of objectives) tilt[o.id] = (Math.random() - 0.5) * 2 * tiltAmp;
  const ms: Measurement[] = [];
  const seq: string[] = [];
  let closedAt = -1;
  let escalations = 0;
  let classes = 0;
  for (let r = 1; r <= maxRounds; r += 1) {
    const card = buildScorecard(objectives, ms);
    const d = routeNext(card);
    seq.push(d.rule);
    if (verbose)
      console.log(
        r,
        d.rule,
        d.activity,
        d.targetLoIds.join(","),
        "|",
        card.rows
          .map(
            (x) => `${x.score ?? "-"}/${x.evidence}${x.signedOff ? "✓" : ""}`,
          )
          .join(" "),
      );
    if (d.activity === "close") {
      closedAt = r;
      break;
    }
    const mode = modeFor(d.activity)!;
    if (d.activity === "escalate") escalations += 1;
    if (mode === "class") classes += 1;
    const at = new Date(Date.UTC(2026, 0, 1) + r * 864e5).toISOString();
    if (mode === "class") {
      for (const lo of d.targetLoIds) {
        ms.push({ sessionId: r, mode, at, loId: lo, answered: 0, correct: 0 });
        tilt[lo] = Math.min(0.95 - p, tilt[lo] + CLASS_GAIN);
      }
      continue;
    }
    const plan =
      d.activity === "homework"
        ? d.homeworkPlan!.map((x) => [x.loId, x.questions])
        : d.activity === "topic_test"
          ? d.testPlan!.map((x) => [x.loId, x.questions])
          : d.targetLoIds.map((lo) => [
              lo,
              d.activity === "survey"
                ? SURVEY_PER_LO
                : d.activity === "check"
                  ? CHECK_QUESTIONS
                  : 5,
            ]);
    for (const [lo, n] of plan as [number, number][]) {
      const pp = Math.min(0.98, Math.max(0.02, p + tilt[lo]));
      ms.push({
        sessionId: r,
        mode,
        at,
        loId: lo,
        answered: n,
        correct: binomial(n, pp),
      });
    }
  }
  const card = buildScorecard(objectives, ms);
  return {
    closedAt,
    escalations,
    classes,
    signed: card.rows.filter((x) => x.signedOff).length,
    rounds: seq.length,
    seq,
  };
}

for (const p of [0.35, 0.6, 0.75, 0.85, 0.95]) {
  const runs = Array.from({ length: 200 }, () => run(p));
  const closed = runs.filter((x) => x.closedAt > 0);
  const avg = (a: number[]) =>
    a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : "-";
  console.log(
    `p=${p}: closed ${closed.length}/200 | rounds to close ${avg(closed.map((x) => x.closedAt))} | signed (unclosed) ${avg(runs.filter((x) => x.closedAt < 0).map((x) => x.signed))}/5 | escalations ${avg(runs.map((x) => x.escalations))} | classes ${avg(runs.map((x) => x.classes))}`,
  );
}
console.log("\n--- one strong run ---");
run(0.85, 0.1, 40, true);
console.log("\n--- one weak run ---");
run(0.35, 0.1, 25, true);
