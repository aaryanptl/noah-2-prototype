// The user's scenario: weak for the first rounds, then strong. How fast does the loop notice?
import {
  buildScorecard,
  CHECK_QUESTIONS,
  type MasteryMode,
  type MasteryObjective,
  type Measurement,
  routeNext,
  SURVEY_PER_LO,
} from "../../lib/mastery/rules";

const objectives: MasteryObjective[] = [1, 2, 3, 4].map((id) => ({
  id,
  name: `LO${id}`,
  sequence: id,
}));
const binomial = (n: number, p: number) => {
  let k = 0;
  for (let i = 0; i < n; i++) if (Math.random() < p) k++;
  return k;
};
const modeFor = (a: string): MasteryMode | null =>
  a === "survey" || a === "topic_test"
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
function run(
  pBefore: number,
  pAfter: number,
  switchAt: number,
  maxRounds = 40,
) {
  const ms: Measurement[] = [];
  let firstCheckAfter = -1;
  let closedAt = -1;
  for (let r = 1; r <= maxRounds; r++) {
    const d = routeNext(buildScorecard(objectives, ms));
    if (d.activity === "close") {
      closedAt = r;
      break;
    }
    if (d.activity === "check" && r > switchAt && firstCheckAfter < 0)
      firstCheckAfter = r;
    const mode = modeFor(d.activity)!;
    const at = new Date(Date.UTC(2026, 0, 1) + r * 864e5).toISOString();
    const p = r > switchAt ? pAfter : pBefore;
    if (mode === "class") {
      for (const lo of d.targetLoIds)
        ms.push({ sessionId: r, mode, at, loId: lo, answered: 0, correct: 0 });
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
    for (const [lo, n] of plan as [number, number][])
      ms.push({
        sessionId: r,
        mode,
        at,
        loId: lo,
        answered: n,
        correct: binomial(n, p),
      });
  }
  return { firstCheckAfter, closedAt };
}
const N = 300;
for (const switchAt of [6, 10, 14]) {
  const runs = Array.from({ length: N }, () => run(0.4, 0.92, switchAt));
  const lag = runs
    .filter((x) => x.firstCheckAfter > 0)
    .map((x) => x.firstCheckAfter - switchAt);
  const closed = runs.filter((x) => x.closedAt > 0);
  console.log(
    `weak until round ${switchAt}, then 92%: first LO check ${(lag.reduce((s, x) => s + x, 0) / lag.length).toFixed(1)} rounds after the switch (n=${lag.length}/${N}) · topic closed in ${closed.length}/${N} runs, avg round ${(closed.reduce((s, x) => s + x.closedAt, 0) / Math.max(1, closed.length)).toFixed(1)}`,
  );
}
