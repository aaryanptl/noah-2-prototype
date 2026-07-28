// Checks the allocator against every rule the spec states, including its two
// worked examples. Pure logic plus one live-data run.
//
//   npx tsx scripts/verify-plan-allocator.ts

import * as fs from "node:fs";
import * as path from "node:path";
import type { TopicDefaults } from "@/lib/curriculum-defaults";
import {
  allocatePlan,
  autoAdjustTopic,
  canApplyUpdate,
} from "@/lib/plan-allocator";

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

function topic(
  id: string,
  name: string,
  classes: number,
  activities: number,
  priority: number,
): TopicDefaults {
  return {
    topicId: id,
    topicName: name,
    grade: "grade 6",
    subject: "Math",
    idealClasses: classes,
    idealActivities: activities,
    gradePriority: priority,
    objectives: [],
  };
}

const SAMPLE: TopicDefaults[] = [
  topic("1", "Advanced Arithmetic", 4, 30, 1),
  topic("2", "Integers & Operations", 5, 35, 2),
  topic("3", "Fractions & Decimals", 5, 35, 3),
  topic("4", "Introduction to Algebra", 6, 40, 4),
  topic("5", "Set Theory", 2, 20, 5),
];
const TOTAL_CLASSES = SAMPLE.reduce((n, t) => n + t.idealClasses, 0); // 22

console.log("\n── Validation: classes never exceed the package ──");
for (const remaining of [1, 3, 7, 12, 22, 40]) {
  const r = allocatePlan({ topics: SAMPLE, classesRemaining: remaining });
  check(
    `${remaining} classes remaining → planned ${r.classesPlanned} ≤ ${remaining}`,
    r.classesPlanned <= remaining,
    `planned ${r.classesPlanned}`,
  );
}

console.log("\n── Validation: topics dropped by priority when short ──");
{
  const r = allocatePlan({ topics: SAMPLE, classesRemaining: 9 });
  const allocatedPriorities = r.allocated.map((a) => a.priority);
  const deferredPriorities = r.deferred.map((d) => d.priority);
  check("something was deferred", r.deferred.length > 0);
  check(
    "every allocated priority beats every deferred one",
    allocatedPriorities.every((p) => deferredPriorities.every((d) => p < d)),
    `allocated ${allocatedPriorities} vs deferred ${deferredPriorities}`,
  );
}

console.log("\n── Rule: surplus classes become revision time ──");
{
  const r = allocatePlan({ topics: SAMPLE, classesRemaining: 40 });
  check("all topics allocated", r.allocated.length === SAMPLE.length);
  check(
    `revision classes = 40 - ${TOTAL_CLASSES} = ${40 - TOTAL_CLASSES}`,
    r.revisionClasses === 40 - TOTAL_CLASSES,
    `got ${r.revisionClasses}`,
  );
}

console.log("\n── Rule: max-fit cap parks the surplus ──");
{
  const r = allocatePlan({
    topics: SAMPLE,
    classesRemaining: 40,
    maxPlannedClasses: 10,
  });
  check("planned ≤ cap", r.classesPlanned <= 10, `got ${r.classesPlanned}`);
  check(
    "surplus reserved as revision",
    r.revisionClasses === 40 - r.classesPlanned,
  );
}

console.log("\n── Rule: mastery scales the budget, never below 1 class ──");
{
  const r = allocatePlan({
    topics: SAMPLE,
    classesRemaining: 100,
    signals: [
      { topicId: "1", masteryScore: 95 },
      { topicId: "2", masteryScore: 65 },
      { topicId: "3", masteryScore: 20 },
    ],
  });
  const byId = new Map(r.allocated.map((a) => [a.topicId, a]));
  check(
    "strong topic halved",
    byId.get("1")?.plannedClasses === 2,
    `got ${byId.get("1")?.plannedClasses}`,
  );
  check(
    "partial topic trimmed",
    byId.get("2")?.plannedClasses === 4,
    `got ${byId.get("2")?.plannedClasses}`,
  );
  check(
    "weak topic untouched",
    byId.get("3")?.plannedClasses === 5,
    `got ${byId.get("3")?.plannedClasses}`,
  );
  check(
    "no topic below 1 class",
    r.allocated.every((a) => a.plannedClasses >= 1),
  );
  check(
    "activities scale with classes",
    byId.get("1")?.plannedActivities === 15,
    `got ${byId.get("1")?.plannedActivities}`,
  );
}

console.log("\n── Rule: completed topics are not re-planned ──");
{
  const r = allocatePlan({
    topics: SAMPLE,
    classesRemaining: 100,
    completedTopicIds: ["1", "2"],
  });
  check(
    "completed topics absent",
    r.allocated.every((a) => !["1", "2"].includes(a.topicId)),
  );
}

console.log("\n── Rule: teacher-pinned topics survive a squeeze ──");
{
  const r = allocatePlan({
    topics: SAMPLE,
    classesRemaining: 4,
    requiredTopicIds: ["5"],
  });
  check(
    "pinned topic allocated",
    r.allocated.some((a) => a.topicId === "5"),
  );
}

console.log(
  "\n── Spec example: decreasing (Fractions 6 classes / 40 activities) ──",
);
{
  // "After 2 classes the student has done 20 activities but achieved mastery.
  //  The remaining plan should ideally be 4 classes … modified to 1 class."
  const r = autoAdjustTopic({
    plannedClasses: 6,
    classesDone: 2,
    plannedActivities: 40,
    activitiesDone: 20,
    masteryScore: 90,
  });
  check("plan cut", r.changed);
  check(
    "cut to 3 total = 2 done + 1 remaining (spec's '1 class' left)",
    r.plannedClasses === 3,
    `got ${r.plannedClasses}`,
  );
  console.log(`     ${r.reason}`);
}

console.log(
  "\n── Spec example: increasing (Fractions 6 classes, struggling) ──",
);
{
  // "After 5 classes … mastery still low. Remaining plan should be 1 class …
  //  modified to 3 classes."
  const r = autoAdjustTopic({
    plannedClasses: 6,
    classesDone: 5,
    plannedActivities: 40,
    activitiesDone: 10,
    masteryScore: 30,
  });
  check("plan extended", r.changed);
  check(
    "extended by at most 2",
    r.plannedClasses - 6 <= 2,
    `got +${r.plannedClasses - 6}`,
  );
  check(
    "6 → 8 total = 3 remaining (matches spec)",
    r.plannedClasses === 8,
    `got ${r.plannedClasses}`,
  );
  console.log(`     ${r.reason}`);
}

console.log("\n── Rule: auto never zeroes a topic ──");
{
  const r = autoAdjustTopic({
    plannedClasses: 2,
    classesDone: 1,
    plannedActivities: 20,
    activitiesDone: 18,
    masteryScore: 99,
  });
  check("stays ≥ 1 class", r.plannedClasses >= 1, `got ${r.plannedClasses}`);
}

console.log("\n── Rule: update precedence ──");
{
  check("manual blocks auto", canApplyUpdate("manual", "auto") === false);
  check("manual allows class", canApplyUpdate("manual", "class") === true);
  check("manual allows manual", canApplyUpdate("manual", "manual") === true);
  check(
    "class allows everything",
    ["manual", "class", "auto"].every((k) =>
      canApplyUpdate("class", k as never),
    ),
  );
  check(
    "auto allows everything",
    ["manual", "class", "auto"].every((k) =>
      canApplyUpdate("auto", k as never),
    ),
  );
  check("no history allows everything", canApplyUpdate(null, "auto") === true);
}

console.log("\n── Live data: grade 6 Maths ──");
(async () => {
  try {
    const { getTopicDefaultsForGrade } = await import(
      "@/lib/curriculum-defaults"
    );
    const topics = await getTopicDefaultsForGrade("6", "Maths");
    const total = topics.reduce((n, t) => n + t.idealClasses, 0);
    console.log(`  ${topics.length} topics, ${total} ideal classes total`);

    const r = allocatePlan({
      topics,
      classesRemaining: 20,
      signals: [{ topicId: topics[2]?.topicId ?? "", masteryScore: 25 }],
    });
    console.log(
      `  20 classes → ${r.allocated.length} topics, ${r.classesPlanned} classes, ${r.activitiesPlanned} activities`,
    );
    console.table(
      r.allocated.map((a) => ({
        seq: a.sequence,
        topic: a.topicName.slice(0, 30),
        classes: a.plannedClasses,
        activities: a.plannedActivities,
      })),
    );
    console.log(`  deferred: ${r.deferred.length} topic(s)`);
    for (const w of r.warnings) console.log(`  ! ${w}`);
    check(
      "live: planned ≤ 20",
      r.classesPlanned <= 20,
      `got ${r.classesPlanned}`,
    );
  } catch (e) {
    console.log(
      `  (skipped live check: ${e instanceof Error ? e.message : e})`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
