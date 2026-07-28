// The nightly automatic pass over every active learning plan.
//
//   npx tsx scripts/run-auto-plan-updates.ts            # dry run
//   npx tsx scripts/run-auto-plan-updates.ts --apply    # writes
//
// Runs once a day per the spec. Plans a mentor edited by hand are skipped by
// applyPlanUpdate itself — this script does not need to know the precedence
// rule, and deliberately doesn't duplicate it.

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

(async () => {
  const apply = process.argv.includes("--apply");
  const { default: pool } = await import("@/lib/db");
  const { applyPlanUpdate, getPlanState } = await import("@/lib/plan-updates");
  const { autoAdjustTopic } = await import("@/lib/plan-allocator");

  const plans = await pool.query(
    `SELECT id::text, title, last_update_kind
     FROM learning_plans
     WHERE status = 'active'
     ORDER BY updated_at DESC`,
  );

  console.log(`${plans.rowCount} active plan(s)\n`);

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const plan of plans.rows) {
    if (!apply) {
      // Dry run: report what the pass would do without writing.
      const state = await getPlanState(plan.id);
      if (!state) continue;
      if (state.lastUpdateKind === "manual") {
        console.log(`- ${plan.title}: SKIP (mentor edited last)`);
        skipped++;
        continue;
      }
      const wouldChange = state.topics
        .filter(
          (t) =>
            t.status !== "done" &&
            t.status !== "dropped" &&
            t.masteryScore !== null,
        )
        .map((t) =>
          autoAdjustTopic({
            plannedClasses: t.plannedClasses,
            classesDone: t.classesDone,
            plannedActivities: t.plannedActivities,
            activitiesDone: t.activitiesDone,
            masteryScore: t.masteryScore as number,
          }),
        )
        .filter((r) => r.changed);
      if (wouldChange.length === 0) {
        console.log(`- ${plan.title}: no change`);
        unchanged++;
      } else {
        console.log(
          `- ${plan.title}: ${wouldChange.length} topic(s) would change`,
        );
        for (const c of wouldChange) console.log(`    ${c.reason}`);
        updated++;
      }
      continue;
    }

    const result = await applyPlanUpdate(plan.id, {
      kind: "auto",
      actor: "nightly",
    });
    if (result.applied) {
      console.log(`- ${plan.title}: updated`);
      for (const c of result.changes) console.log(`    ${c}`);
      updated++;
    } else if (result.blockedReason?.includes("mentor")) {
      console.log(`- ${plan.title}: skipped (${result.blockedReason})`);
      skipped++;
    } else {
      unchanged++;
    }
  }

  console.log(
    `\n${updated} updated, ${skipped} skipped, ${unchanged} unchanged${apply ? "" : " (dry run)"}`,
  );
  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
