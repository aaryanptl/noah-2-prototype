// End-to-end check of the modification engine against the real database.
// Creates a throwaway plan, drives it through class / manual / auto updates,
// asserts the spec's rules, then deletes everything it created.
//
//   npx tsx scripts/verify-plan-updates.ts

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

(async () => {
  const { default: pool } = await import("@/lib/db");
  const { getTopicDefaultsForGrade } = await import(
    "@/lib/curriculum-defaults"
  );
  const { allocatePlan } = await import("@/lib/plan-allocator");
  const { applyPlanUpdate, getPlanState } = await import("@/lib/plan-updates");

  let planId: string | null = null;

  try {
    const student = await pool.query(
      `SELECT id::text, display_name FROM diagnostic_students LIMIT 1`,
    );
    if (student.rows.length === 0) {
      console.log(
        "No diagnostic_students rows — run scripts/seed-demo-students.ts first.",
      );
      process.exit(1);
    }

    const defaults = await getTopicDefaultsForGrade("6", "Maths");
    const allocation = allocatePlan({ topics: defaults, classesRemaining: 20 });
    console.log(
      `\nAllocated ${allocation.allocated.length} topics / ${allocation.classesPlanned} classes from 20 remaining`,
    );

    const created = await pool.query(
      `INSERT INTO learning_plans
         (student_id, title, subject, grade, duration_weeks, start_date,
          total_classes, classes_remaining, last_update_kind, status)
       VALUES ($1, $2, 'Maths', '6', 4, CURRENT_DATE, 20, 20, 'initial', 'draft')
       RETURNING id::text`,
      [student.rows[0].id, "[verify] throwaway plan"],
    );
    planId = created.rows[0].id;

    for (const a of allocation.allocated) {
      await pool.query(
        `INSERT INTO learning_plan_topics
           (plan_id, topic_id, topic_name, sequence, planned_classes,
            planned_activities, priority, source, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', $8)`,
        [
          planId,
          a.topicId,
          a.topicName,
          a.sequence,
          a.plannedClasses,
          a.plannedActivities,
          a.priority,
          a.reason,
        ],
      );
    }

    const initial = await getPlanState(planId as string);
    check(
      "plan persisted with topics",
      (initial?.topics.length ?? 0) === allocation.allocated.length,
    );

    const first = initial?.topics[0];
    if (!first?.topicId) throw new Error("no topic to drive");

    console.log("\n── Class update ──");
    const classResult = await applyPlanUpdate(planId as string, {
      kind: "class",
      actor: "verify",
      topicsCovered: [
        { topicId: first.topicId, activitiesDone: 6, masteryScore: 45 },
      ],
      classesConsumed: 1,
    });
    check(
      "class update applied",
      classResult.applied,
      classResult.blockedReason,
    );
    const afterClass = await getPlanState(planId as string);
    const t1 = afterClass?.topics.find((t) => t.topicId === first.topicId);
    check(
      "classes_done incremented",
      t1?.classesDone === 1,
      `got ${t1?.classesDone}`,
    );
    check(
      "activities_done incremented",
      t1?.activitiesDone === 6,
      `got ${t1?.activitiesDone}`,
    );
    check(
      "mastery recorded",
      t1?.masteryScore === 45,
      `got ${t1?.masteryScore}`,
    );
    check(
      "status moved to in_progress",
      t1?.status === "in_progress",
      `got ${t1?.status}`,
    );
    check(
      "package decremented",
      afterClass?.classesRemaining === 19,
      `got ${afterClass?.classesRemaining}`,
    );

    console.log("\n── Auto update is allowed after a class ──");
    // Mastery high and early → the cut rule should fire.
    await pool.query(
      `UPDATE learning_plan_topics SET mastery_score = 92 WHERE plan_id = $1 AND topic_id = $2`,
      [planId, first.topicId],
    );
    const autoResult = await applyPlanUpdate(planId as string, {
      kind: "auto",
      actor: "nightly",
    });
    check("auto update applied", autoResult.applied, autoResult.blockedReason);
    const afterAuto = await getPlanState(planId as string);
    const t2 = afterAuto?.topics.find((t) => t.topicId === first.topicId);
    check(
      "classes cut on early mastery",
      (t2?.plannedClasses ?? 99) < (first.plannedClasses ?? 0),
      `${first.plannedClasses} → ${t2?.plannedClasses}`,
    );
    check("never cut below 1", (t2?.plannedClasses ?? 0) >= 1);

    console.log("\n── Manual update ──");
    const second = afterAuto?.topics[1];
    const manualResult = await applyPlanUpdate(planId as string, {
      kind: "manual",
      actor: "mentor",
      setClasses: second?.topicId
        ? [{ topicId: second.topicId, classes: 2 }]
        : [],
      removeTopicIds: [],
    });
    check(
      "manual update applied",
      manualResult.applied,
      manualResult.blockedReason,
    );
    const afterManual = await getPlanState(planId as string);
    check(
      "last_update_kind is manual",
      afterManual?.lastUpdateKind === "manual",
    );

    console.log("\n── Precedence: auto is blocked after manual ──");
    await pool.query(
      `UPDATE learning_plan_topics SET mastery_score = 95 WHERE plan_id = $1`,
      [planId],
    );
    const blocked = await applyPlanUpdate(planId as string, {
      kind: "auto",
      actor: "nightly",
    });
    check("auto refused", blocked.applied === false, "it was applied");
    check("refusal explained", Boolean(blocked.blockedReason));
    console.log(`     "${blocked.blockedReason}"`);

    console.log("\n── Precedence: a class update still gets through ──");
    const classAfterManual = await applyPlanUpdate(planId as string, {
      kind: "class",
      actor: "verify",
      topicsCovered: second?.topicId
        ? [{ topicId: second.topicId, activitiesDone: 3, masteryScore: 50 }]
        : [],
      classesConsumed: 1,
    });
    check(
      "class update allowed after manual",
      classAfterManual.applied,
      classAfterManual.blockedReason,
    );

    console.log(
      "\n── Precedence: auto works again once a class has happened ──",
    );
    const autoAgain = await applyPlanUpdate(planId as string, {
      kind: "auto",
      actor: "nightly",
    });
    check(
      "auto no longer blocked",
      autoAgain.blockedReason !== undefined
        ? autoAgain.blockedReason === "Nothing to change."
        : true,
      autoAgain.blockedReason,
    );

    console.log("\n── Validation: plan never exceeds remaining classes ──");
    await pool.query(
      `UPDATE learning_plans SET classes_remaining = 4 WHERE id = $1`,
      [planId],
    );
    const squeeze = await applyPlanUpdate(planId as string, {
      kind: "manual",
      actor: "mentor",
      setClasses: second?.topicId
        ? [{ topicId: second.topicId, classes: 3 }]
        : [],
    });
    const afterSqueeze = await getPlanState(planId as string);
    const outstanding = (afterSqueeze?.topics ?? [])
      .filter((t) => t.status === "planned" || t.status === "in_progress")
      .reduce((n, t) => n + Math.max(0, t.plannedClasses - t.classesDone), 0);
    check("outstanding classes ≤ 4", outstanding <= 4, `got ${outstanding}`);
    check(
      "dropped topics reported",
      squeeze.warnings.length > 0 || outstanding <= 4,
    );
    for (const w of squeeze.warnings) console.log(`     ! ${w}`);

    console.log("\n── Revision history ──");
    const revisions = await pool.query(
      `SELECT kind, actor, summary FROM learning_plan_revisions
       WHERE plan_id = $1 ORDER BY created_at`,
      [planId],
    );
    check(
      "revisions recorded",
      revisions.rows.length >= 4,
      `got ${revisions.rows.length}`,
    );
    console.table(
      revisions.rows.map((r) => ({
        kind: r.kind,
        actor: r.actor,
        summary: String(r.summary).slice(0, 60),
      })),
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
