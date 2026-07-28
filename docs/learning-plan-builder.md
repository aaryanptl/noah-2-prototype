# The learning plan builder

How a plan is built, scheduled, changed over time, and shown to mentors and students.

> Supersedes `learning-plan-ai.md`, which describes the earlier design where a single
> model call decided both the plan's structure and its wording. That file is kept for
> the prompt-engineering notes only; the flow it documents is no longer what runs.

---

## 1. The central idea

**A plan is an allocation over topics, not a list of dates.**

```
Fractions & Decimals   5 classes · 35 activities
Advanced Arithmetic    4 classes · 30 activities
Integers & Operations  1 class   ·  7 activities
```

The dated sessions a teacher sees are *derived* from that allocation. This ordering
matters: every rule in the spec is stated in terms of topics ("classes done are marked
at a topic level", "reduce Fractions from 6 classes to 1", "drop topics by priority"),
and none of it is expressible if a row *is* a date.

It also decides where the model sits. The **allocator** fixes the shape; the **model**
writes the teaching prose for a shape it cannot change. You cannot guarantee "planned
classes never exceed the package" if a model is choosing the classes.

A consequence worth knowing: when the model is unavailable the plan is still
structurally correct, because the structure never came from the model. Only the wording
degrades.

---

## 2. Prefixed curriculum data

`curriculum_plan_defaults` — the starting point every plan is personalised *from*.

| Field | Level | Source |
|---|---|---|
| `ideal_classes` | topic | `topics.classes`, already authored (2–7) |
| `ideal_activities` | topic | seeded by formula, see below |
| `grade_priority` | topic | curriculum sequence within the grade |
| `starter_question_id` | objective | easiest active bank question |
| `master_question_id` | objective | hardest active bank question |

**The activity formula** (`scripts/seed-curriculum-plan-defaults.ts`):

```
activities = round5(classes × 5 + objectives × 2)
```

Teaching time sets the base practice volume; objective count adds coverage. Across the
143 Maths topics this yields 15–50 activities, averaging ~28 — about 7 questions per
class. The spec's worked example (6 classes → 40 activities) is consistent with this at
5 objectives, but **no topic in the database actually has that shape**, so treat it as
one hypothetical data point rather than a verified fit. Recalibrate the two coefficients
against real completion data when it exists; `source` distinguishes seeded rows from
reviewed ones.

Everything seeds as `review_status = 'proposed'`. `/teacher/curriculum` is where a
reviewer adjusts and approves. `getTopicDefaultsForGrade(..., { approvedOnly: true })`
switches the allocator to reviewed rows only — **currently false**, so proposed numbers
do drive plans.

Volume: 143 topic rows, 616 objective rows. 609 of 616 objectives have a real question
pair; 7 have none.

---

## 3. Generating a plan

`lib/plan-generate.ts` → `generateAllocatedPlan()`, called from
`POST /api/teacher/plans/suggest`.

```
curriculum defaults  ─┐
student evidence     ─┤→ allocatePlan()   → topics + classes + activities
picked dates         ─┘        │
                               ▼
                        buildSchedule()   → one session per date
                               │
                               ▼
                        model writes prose for each session
```

**`allocatePlan` (`lib/plan-allocator.ts`)** — pure, no DB, no model, no dates. Ordering
is three-tier:

1. teacher-pinned topics, which can never be dropped
2. **evidence band** — a topic the student is demonstrably weak at outranks one with no
   evidence, which outranks one already secure
3. curriculum priority, which respects prerequisites among equals

Tier 2 is not cosmetic. Sorting on curriculum priority alone gave the student's weakest
topic (49%) one class while two topics with no evidence took four and five, because the
budget is spent top-down.

Mastery then scales each topic's budget: ≥80% halves it, ≥60% trims to 75%, below that
keeps it whole. Activities scale with classes so the practice-per-class rate holds. No
topic ever drops below one class — only a human marks a topic off.

**`buildSchedule` (`lib/plan-schedule.ts`)** — lays allocated topics onto dates in
blocks. Within a block: first class is `teach`, last is `review`, middle is `practice`;
the plan's final session becomes `assess` when there are 4+ sessions. Objectives cycle
within a block so a 5-class / 3-objective topic revisits rather than running dry.

---

## 4. Changing a plan

`lib/plan-updates.ts` → `applyPlanUpdate(planId, update)` is the **only** write path.

| Kind | Trigger | Effect |
|---|---|---|
| `class` | glimpse form after a lesson | increments classes/activities done, records mastery, decrements the package |
| `manual` | SPR edit flow | sets classes/activities, adds or removes topics |
| `auto` | nightly job | cuts classes on early mastery, extends when struggling |

**Precedence.** `canApplyUpdate(last, incoming)` — a `manual` edit blocks `auto` until a
class happens. Everything else passes. It lives in the engine, not the callers, so the
nightly script does not reimplement it.

**Auto rules**, both deliberately conservative:
- mastery ≥80% before 75% of the classes are done → cut to `classesDone + 1`, never zero
- fewer than 2 classes left and mastery <40% → add 2, never more

**Refit.** After any update the plan is refitted to `classes_remaining`: overflow is
dropped lowest-priority-first, and if the package *grows*, previously dropped topics are
restored highest-priority-first.

Every application writes to `learning_plan_revisions` — the audit trail and the input to
the next precedence check.

---

## 5. Surfaces

| Route | What it is |
|---|---|
| `/teacher/plans/new` | the builder; shows the allocation before sessions |
| `/teacher/plans/[id]/glimpse` | 2-step post-class form: what happened → what it does to the plan |
| `/teacher/plans/[id]/report` | student progress report + inline edit flow |
| `/teacher/plans/[id]/guide` | mentor detailed viewer, built on starter/master questions |
| `/teacher/curriculum` | review screen for the seeded prefixed data |

All read through `getPlanReport()` (`lib/plan-report.ts`), which defines "the next two
weeks" (14-day window, undone sessions), "a check-in is due" (fewer than 2 classes left
on a topic) and "show the long-range plan" (more than 5 classes remaining) once, rather
than each page inventing its own.

The glimpse form writes nothing until step 2 is confirmed, so an abandoned form cannot
half-update a plan.

---

## 6. Schema

```
learning_plans          + total_classes, classes_remaining, grade, last_update_kind
learning_plan_topics      THE PLAN — planned/done classes and activities per topic
learning_plan_items       derived session schedule (unchanged from before)
learning_plan_revisions   append-only history of every update
curriculum_plan_defaults  prefixed dimensional data
```

Migrations: `scripts/create-curriculum-plan-defaults.ts`,
`scripts/create-plan-topics-tables.ts`. Both additive and idempotent.

---

## 7. Verification

No test runner in this project; checks are scripts, matching existing convention.

```
npx tsx scripts/verify-plan-allocator.ts   # 32 checks, incl. both spec worked examples
npx tsx scripts/verify-plan-updates.ts     # 19 checks, live DB, self-cleaning
npx tsx scripts/verify-plan-report.ts      # 16 checks, live DB, self-cleaning
npx tsx scripts/run-auto-plan-updates.ts   # nightly pass, dry run without --apply
```

---

## 8. Known gaps

- **Evidence is matched to topics by name.** Diagnostics say "Fractions"; the syllabus
  says "Fractions & Decimals". `findTopicByName` bridges this with substring and token
  matching. Once diagnostics carry `topic_id`, match on that and delete the helper.
- **Student profiles are still `lib/demo-students.ts`**, not real placement results.
  Swapping them means replacing the profile-building step only; the allocator, schedule
  and prose layers are unaffected.
- **Activity coefficients are unvalidated** against real completion data.
- **The nightly job is a script**, not a scheduled task. Wire it to cron/a job runner.
- **No auth on the new routes** — consistent with the rest of this prototype.
