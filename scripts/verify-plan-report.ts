// Checks the report projections that the SPR, glimpse form and mentor guide
// render from. Creates a throwaway plan, asserts each projection, cleans up.
//
//   npx tsx scripts/verify-plan-report.ts

import * as fs from "node:fs";
import * as path from "node:path";

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const l of fs.readFileSync(p, "utf-8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    if (!(k in process.env))
      process.env[k] = t
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const TODAY = "2026-08-01";

function dayOffset(days: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

(async () => {
  const { default: pool } = await import("@/lib/db");
  const { getTopicDefaultsForGrade } = await import(
    "@/lib/curriculum-defaults"
  );
  const { allocatePlan } = await import("@/lib/plan-allocator");
  const { getPlanReport } = await import("@/lib/plan-report");
  const { applyPlanUpdate } = await import("@/lib/plan-updates");

  let planId: string | null = null;
  try {
    const student = await pool.query(
      `SELECT id::text, display_name FROM diagnostic_students LIMIT 1`,
    );
    if (student.rows.length === 0) {
      console.log(
        "No diagnostic_students — run scripts/seed-demo-students.ts.",
      );
      process.exit(1);
    }

    const defaults = await getTopicDefaultsForGrade("6", "Maths");
    const allocation = allocatePlan({ topics: defaults, classesRemaining: 18 });

    const created = await pool.query(
      `INSERT INTO learning_plans
         (student_id, title, subject, grade, duration_weeks, start_date,
          total_classes, classes_remaining, last_update_kind, status)
       VALUES ($1, $2, 'Maths', '6', 4, $3, 18, 18, 'initial', 'active')
       RETURNING id::text`,
      [student.rows[0].id, "[verify] report plan", TODAY],
    );
    planId = created.rows[0].id;

    for (const a of allocation.allocated) {
      await pool.query(
        `INSERT INTO learning_plan_topics
           (plan_id, topic_id, topic_name, sequence, planned_classes,
            planned_activities, priority, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ai')`,
        [
          planId,
          a.topicId,
          a.topicName,
          a.sequence,
          a.plannedClasses,
          a.plannedActivities,
          a.priority,
        ],
      );
    }

    // Sessions: some inside the two-week window, some well beyond it.
    let offset = 1;
    for (const a of allocation.allocated) {
      for (let n = 0; n < a.plannedClasses; n++) {
        await pool.query(
          `INSERT INTO learning_plan_items
             (plan_id, week, day, session_date, sort_order, focus, topic,
              subject, learning_objective, activity)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'Maths',$8,$9)`,
          [
            planId,
            Math.floor(offset / 7) + 1,
            (offset % 7) + 1,
            dayOffset(offset),
            offset,
            n === 0 ? "teach" : "practice",
            a.topicName,
            `Objective for ${a.topicName}`,
            `Goal line.\n\nTeach:\n• point one\n\nPractice: 5 questions.\n\nSuccess: 4 of 5.`,
          ],
        );
        offset += 2; // spread sessions so some fall outside 14 days
      }
    }

    console.log("\n── Two-week window ──");
    const report = await getPlanReport(planId as string, TODAY);
    if (!report) throw new Error("no report");

    check("report built", Boolean(report));
    check(
      "next two weeks only contains sessions within 14 days",
      report.nextTwoWeeks.every((s) => {
        const diff =
          (new Date(`${s.sessionDate}T00:00:00Z`).getTime() -
            new Date(`${TODAY}T00:00:00Z`).getTime()) /
          86_400_000;
        return diff >= 0 && diff <= 14;
      }),
      `dates: ${report.nextTwoWeeks.map((s) => s.sessionDate).join(",")}`,
    );
    check("two-week window is non-empty", report.nextTwoWeeks.length > 0);
    check(
      "later sessions excluded",
      report.nextTwoWeeks.length < offset / 2,
      `${report.nextTwoWeeks.length} shown`,
    );
    check(
      "session content parsed into structure",
      report.nextTwoWeeks.every((s) => s.content.goal.length > 0),
    );

    console.log("\n── Future plan gating ──");
    check(
      "future plan shown when >5 classes remain",
      report.showFuturePlan,
      `remaining ${report.classesRemaining}, future ${report.futurePlan.length}`,
    );
    check(
      "future plan excludes topics already in the next two weeks",
      report.futurePlan.every(
        (t) => !report.nextTwoWeeks.some((s) => s.topic === t.topicName),
      ),
    );

    await pool.query(
      `UPDATE learning_plans SET classes_remaining = 3 WHERE id = $1`,
      [planId],
    );
    const lean = await getPlanReport(planId as string, TODAY);
    check(
      "future plan hidden when ≤5 classes remain",
      lean?.showFuturePlan === false,
      `got ${lean?.showFuturePlan}`,
    );
    await pool.query(
      `UPDATE learning_plans SET classes_remaining = 18 WHERE id = $1`,
      [planId],
    );

    console.log("\n── Check-in due ──");
    const first = report.topics[0];
    // Drive a topic to one class remaining.
    await pool.query(
      `UPDATE learning_plan_topics
       SET classes_done = planned_classes - 1
       WHERE plan_id = $1 AND topic_id = $2`,
      [planId, first.topicId],
    );
    const withTest = await getPlanReport(planId as string, TODAY);
    check(
      "topic with <2 classes left is flagged for a check-in",
      (withTest?.testsDue ?? []).some((t) => t.topicName === first.topicName),
      `flagged: ${(withTest?.testsDue ?? []).map((t) => t.topicName).join(",")}`,
    );

    console.log("\n── Mentor guide data ──");
    const withObjectives = (withTest?.topics ?? []).filter(
      (t) => t.objectives.length > 0,
    );
    check(
      "topics carry question guidelines",
      withObjectives.length > 0,
      `${withObjectives.length} of ${withTest?.topics.length}`,
    );
    const anyObjective = withObjectives[0]?.objectives[0];
    check(
      "guideline has starter and master questions",
      Boolean(anyObjective?.starterQuestion && anyObjective?.masterQuestion),
    );
    if (anyObjective) {
      console.log(`     objective: ${anyObjective.name.slice(0, 60)}`);
      console.log(
        `     starter:   ${String(anyObjective.starterQuestion).slice(0, 70)}`,
      );
      console.log(
        `     master:    ${String(anyObjective.masterQuestion).slice(0, 70)}`,
      );
    }

    console.log("\n── Glimpse path: class update through the API layer ──");
    const classResult = await applyPlanUpdate(planId as string, {
      kind: "class",
      actor: "mentor",
      topicsCovered: [
        {
          topicId: first.topicId as string,
          activitiesDone: 4,
          masteryScore: 55,
        },
      ],
      classesConsumed: 1,
    });
    check("glimpse-style class update applied", classResult.applied);
    const afterClass = await getPlanReport(planId as string, TODAY);
    check(
      "classes remaining decremented in the report",
      afterClass?.classesRemaining === 17,
      `got ${afterClass?.classesRemaining}`,
    );

    console.log("\n── SPR edit path: manual update ──");
    const manual = await applyPlanUpdate(planId as string, {
      kind: "manual",
      actor: "mentor",
      setActivities: [{ topicId: first.topicId as string, activities: 12 }],
    });
    check("manual edit applied", manual.applied, manual.blockedReason);
    const afterManual = await getPlanReport(planId as string, TODAY);
    check(
      "report reflects the manual edit",
      afterManual?.topics.find((t) => t.topicId === first.topicId)
        ?.plannedActivities === 12,
    );
    check(
      "report exposes that a manual edit was last",
      afterManual?.lastUpdateKind === "manual",
    );
  } finally {
    if (planId) {
      await pool.query(`DELETE FROM learning_plans WHERE id = $1`, [planId]);
      console.log("\nCleaned up throwaway plan.");
    }
    await pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
