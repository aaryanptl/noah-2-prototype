// Convergence check for lib/mastery/rules.ts: run the loop forward on
// simulated students of fixed ability and see where it takes them.
//
//   npx tsx scripts/mastery-analysis/sim-loop.ts
//   SPEED=off npx tsx scripts/mastery-analysis/sim-loop.ts   # without the speed band
//
// Each student has an ability p, a per-objective tilt, and a speed factor
// (their typical time ÷ the cohort median). Speed is drawn so ~65% of
// students are inside the 1.25× band, as on production topic tests.
import {
  buildScorecard,
  type Measurement,
  type MasteryObjective,
  modeForActivity,
  routeNext,
} from "../../lib/mastery/rules";

const CLASS_GAIN = Number(process.env.CLASS_GAIN ?? 0.15);
const SPEED_ON = process.env.SPEED !== "off";
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
function normal() {
  return (
    Math.sqrt(-2 * Math.log(1 - Math.random())) *
    Math.cos(2 * Math.PI * Math.random())
  );
}

function run(p: number, tiltAmp = 0.15, maxRounds = 60, verbose = false) {
  const tilt: Record<number, number> = {};
  for (const o of objectives) tilt[o.id] = (Math.random() - 0.5) * 2 * tiltAmp;
  const speed = Math.exp(0.5 * normal());
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
        d.activity.padEnd(15),
        d.targetLoIds.join(","),
        "|",
        card.rows.map((x) => `${x.score ?? "-"}`).join(" "),
        card.lastTest ? `| last test ${card.lastTest.accuracy}% ${card.lastTest.outcome}` : "",
      );
    if (d.activity === "close") {
      closedAt = r;
      break;
    }
    const mode = modeForActivity(d.activity);
    if (!mode) break;
    if (d.activity === "escalate") escalations += 1;
    const at = new Date(Date.UTC(2026, 0, 1) + r * 864e5).toISOString();
    if (mode === "class") {
      classes += 1;
      for (const lo of d.targetLoIds.length ? d.targetLoIds : objectives.map((o) => o.id)) {
        ms.push({ sessionId: r, mode, at, loId: lo, answered: 0, correct: 0 });
        tilt[lo] = Math.min(0.95 - p, tilt[lo] + CLASS_GAIN);
      }
      continue;
    }
    const speedRatio = SPEED_ON
      ? Math.round(speed * Math.exp(0.15 * normal()) * 100) / 100
      : null;
    for (const item of d.plan) {
      const pp = Math.min(0.98, Math.max(0.02, p + tilt[item.loId]));
      ms.push({
        sessionId: r,
        mode,
        at,
        loId: item.loId,
        answered: item.questions,
        correct: binomial(item.questions, pp),
        speedRatio,
      });
    }
  }
  const card = buildScorecard(objectives, ms);
  return {
    closedAt,
    escalations,
    classes,
    phase: card.phase,
    tests: card.tests.length,
    speedFails: card.tests.filter((t) => t.gate.overall && t.gate.floor && t.gate.speed === false).length,
    rounds: seq.length,
  };
}

const avg = (a: number[]) =>
  a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : "-";
console.log(`speed band ${SPEED_ON ? "on" : "off"}, class gain ${CLASS_GAIN}`);
for (const p of [0.35, 0.6, 0.75, 0.85, 0.95]) {
  const runs = Array.from({ length: 400 }, () => run(p));
  const closed = runs.filter((x) => x.closedAt > 0);
  console.log(
    `p=${p}: mastered ${Math.round((100 * closed.length) / runs.length)}% | rounds to master ${avg(closed.map((x) => x.closedAt))} | tests ${avg(runs.map((x) => x.tests))} | blocked only by speed ${avg(runs.map((x) => x.speedFails))} | escalations ${avg(runs.map((x) => x.escalations))} | classes ${avg(runs.map((x) => x.classes))}`,
  );
}
console.log("\n--- one strong run ---");
run(0.9, 0.1, 40, true);
console.log("\n--- one middling run ---");
run(0.72, 0.1, 40, true);
console.log("\n--- one weak run ---");
run(0.4, 0.1, 25, true);
