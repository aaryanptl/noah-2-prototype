// The user's scenario: weak for the first rounds, then strong. How fast does
// the loop notice and close the topic?
//
//   npx tsx scripts/mastery-analysis/sim-improve.ts
import {
  buildScorecard,
  type MasteryObjective,
  type Measurement,
  modeForActivity,
  routeNext,
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
function run(pBefore: number, pAfter: number, switchAt: number, maxRounds = 50) {
  const ms: Measurement[] = [];
  let firstTestAfter = -1;
  let closedAt = -1;
  for (let r = 1; r <= maxRounds; r++) {
    const d = routeNext(buildScorecard(objectives, ms));
    if (d.activity === "close") {
      closedAt = r;
      break;
    }
    if (
      (d.activity === "topic_test" || d.activity === "recurring_test") &&
      r > switchAt &&
      firstTestAfter < 0
    )
      firstTestAfter = r;
    const mode = modeForActivity(d.activity);
    if (!mode) break;
    const at = new Date(Date.UTC(2026, 0, 1) + r * 864e5).toISOString();
    const p = r > switchAt ? pAfter : pBefore;
    if (mode === "class") {
      for (const lo of d.targetLoIds)
        ms.push({ sessionId: r, mode, at, loId: lo, answered: 0, correct: 0 });
      continue;
    }
    for (const item of d.plan)
      ms.push({
        sessionId: r,
        mode,
        at,
        loId: item.loId,
        answered: item.questions,
        correct: binomial(item.questions, p),
      });
  }
  return { firstTestAfter, closedAt };
}
const N = 300;
for (const switchAt of [6, 10, 14]) {
  const runs = Array.from({ length: N }, () => run(0.4, 0.92, switchAt));
  const lag = runs
    .filter((x) => x.firstTestAfter > 0)
    .map((x) => x.firstTestAfter - switchAt);
  const closed = runs.filter((x) => x.closedAt > 0);
  console.log(
    `weak until round ${switchAt}, then 92%: first test ${(lag.reduce((s, x) => s + x, 0) / Math.max(1, lag.length)).toFixed(1)} rounds after the switch · Master in ${closed.length}/${N} runs, ${(closed.reduce((s, x) => s + x.closedAt - switchAt, 0) / Math.max(1, closed.length)).toFixed(1)} rounds after the switch`,
  );
}
