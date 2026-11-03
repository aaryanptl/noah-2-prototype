"use client";

import { Dialog } from "@base-ui/react/dialog";
import { BookOpen, Check, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  CHALLENGE_ZONE,
  CONFIDENCE_FULL,
  CONFIDENCE_GUESS,
  DECAY_GRACE_DAYS,
  DECAY_MAX,
  DECAY_PER_WEEK,
  DIFFICULTY_OFFSET,
  EVIDENCE_WEIGHT,
  HOMEWORK_MIX,
  HOMEWORK_QUESTIONS,
  K_FLOOR,
  LO_FLOOR,
  LOOP_GUARD,
  learningRate,
  MASTERY_BAR,
  MICRO_HOMEWORK_QUESTIONS,
  PRO_COVERAGE,
  RECURRING_TEST_QUESTIONS,
  RETEACH_LINE,
  RULES,
  SPEED_BAND,
  TOPIC_TEST_AFTER,
} from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

/**
 * How the loop works, as a dialog behind a floating button. Plain words, one
 * picture and one worked example per rule. Every number is read from
 * `lib/mastery/rules.ts`, so this cannot drift from the router.
 */
export function MethodologyButton() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="How this works"
        className="fixed right-6 bottom-6 z-40 flex size-13 items-center justify-center rounded-full bg-[var(--heading)] text-white shadow-lg transition hover:scale-105 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--heading)]"
      >
        <BookOpen className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(820px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-7 py-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                Methodology
              </p>
              <Dialog.Title className="mt-1 text-xl font-semibold tracking-tight text-[var(--heading)]">
                How the loop works
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1.5 text-[var(--text-dim)] transition hover:bg-neutral-100 hover:text-[var(--text)]"
            >
              <X className="size-5" />
            </Dialog.Close>
          </header>
          <div className="overflow-y-auto px-7 py-6">
            <Body />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  n,
  title,
  lead,
  children,
}: {
  n: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section className="not-first:mt-10 not-first:border-t not-first:border-[var(--border)] not-first:pt-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
        {n}
      </p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--heading)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[var(--text)]">
        {lead}
      </p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Example({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--bg-warm)] px-4 py-3 text-[14px] leading-relaxed">
      <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
        Example
      </span>
      {children}
    </div>
  );
}

function Num({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono font-semibold text-[var(--heading)]">
      {children}
    </span>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const w = EVIDENCE_WEIGHT;
/** One answer's move from `old` toward `result`, with `n` questions already behind the score. */
const step = (old: number, weight: number, n: number, result: number) =>
  old + weight * learningRate(n) * (result - old);

/* ------------------------------------------------------------------ */

function Body() {
  const k20 = learningRate(20);
  return (
    <>
      <Section
        n="01"
        title="One student, one topic, one Mastery Map"
        lead="Every activity reads the student's Mastery Map before it starts and writes back to it after. The map holds a score and a confidence for each objective in the topic. The loop reads it and hands back exactly one thing to do next, until a test passes the mastery check."
      >
        <LoopDiagram />
      </Section>

      <Section
        n="02"
        title="Only the first answer counts"
        lead="If a student retries a question, the retry is ignored. On the platform, practice always ends at 100% because of hints and retries, so the final answer says nothing. The first one does."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <AttemptStrip attempts={["wrong", "hint", "wrong", "right"]} />
          <span className="text-[var(--text-dim)]">
            counts as <Num>0 of 1</Num>: the first answer was wrong.
          </span>
        </div>
      </Section>

      <Section
        n="03"
        title="Weights: how much is an answer worth?"
        lead="A test answer under time pressure says more than a practice answer with hints available. Each answer is scaled by where it came from: the weight w."
      >
        <WeightBars />
      </Section>

      <Section
        n="04"
        title="The score: a moving average"
        lead={`After every answered question: new score = old score + w × k × (result − old score). The result is the share right in that session on that objective. k, the learning rate, is 1 ÷ (1 + questions so far) and never drops below ${K_FLOOR}: early answers move the score a lot, later ones nudge it. The first answer an objective ever gets sets its score.`}
      >
        <Example>
          An objective at <Num>50</Num> with {CONFIDENCE_FULL} questions behind
          it, so k = {k20.toFixed(2)}. One right answer in a test: 50 +{" "}
          {w.diagnostic} × {k20.toFixed(2)} × (100 − 50) ={" "}
          <Num>{Math.round(step(50, w.diagnostic, 20, 100))}</Num>. The same
          right answer in homework:{" "}
          <Num>{Math.round(step(50, w.homework, 20, 100))}</Num>; in practice:{" "}
          <Num>{Math.round(step(50, w.practice, 20, 100))}</Num>.
        </Example>
      </Section>

      <Section
        n="05"
        title="Confidence: how sure are we?"
        lead={`Two questions on an objective is a guess; ${CONFIDENCE_FULL} is a signal. Confidence is the weighted question count against ${CONFIDENCE_FULL}. Under ${CONFIDENCE_GUESS} the objective is probed with unhinted homework questions before anything is done about it.`}
      >
        <EvidenceBarDemo />
      </Section>

      <Section
        n="06"
        title="Decay: mastery has to be kept"
        lead={`No answers on an objective for ${DECAY_GRACE_DAYS} days and its score drops ${DECAY_PER_WEEK} points a week, at most ${DECAY_MAX}. The next answer starts from the decayed score.`}
      >
        <Example>
          An objective at <Num>88</Num>, untouched for 5 weeks: 3 weeks past the
          grace period, so{" "}
          <Num>{88 - Math.min(DECAY_MAX, 3 * DECAY_PER_WEEK)}</Num>.
        </Example>
      </Section>

      <Section
        n="07"
        title="What an objective's score means"
        lead="Each objective sits somewhere on one line."
      >
        <StateScale />
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex gap-2">
            <Chip className="bg-[#fdebe7] text-[#b8432c]">
              Under {RETEACH_LINE}
            </Chip>
            <span className="text-[var(--text-dim)]">
              the weakest; it gets the biggest share of homework.
            </span>
          </li>
          <li className="flex gap-2">
            <Chip className="bg-[#fff3d6] text-[#9a6200]">
              Under the {LO_FLOOR} floor
            </Chip>
            <span className="text-[var(--text-dim)]">
              {RETEACH_LINE}–{LO_FLOOR - 1}: keeps the topic from Master.
            </span>
          </li>
          <li className="flex gap-2">
            <Chip className="bg-[#dff5f2] text-[#0f6b62]">At the floor</Chip>
            <span className="text-[var(--text-dim)]">
              {LO_FLOOR}+. Spaced review keeps it warm.
            </span>
          </li>
          <li className="flex gap-2">
            <Chip className="bg-[#e3f6e8] text-[#1c7a3a]">Mastered</Chip>
            <span className="text-[var(--text-dim)]">
              the topic passed its mastery check.
            </span>
          </li>
        </ul>
      </Section>

      <Section
        n="08"
        title="The mastery check: the one gate"
        lead="Mastery is decided only on a topic test or a recurring test, never on homework. Three things must all hold."
      >
        <ol className="grid gap-3 sm:grid-cols-3">
          <GateCard
            n="1"
            title={`Test at ${MASTERY_BAR}%+`}
            body="All objectives together, first answers."
          />
          <GateCard
            n="2"
            title={`Every objective ${LO_FLOOR}+`}
            body="On the map, once the test is in. No mastering on average while one objective stays broken."
          />
          <GateCard
            n="3"
            title={`Speed within ${SPEED_BAND}×`}
            body="The student's typical time per question against the median of everyone who answered the same question."
          />
        </ol>
        <TestBands />
        <Example>
          Rohan: topic test <Num>64%</Num> with one objective at 44. Not
          mastery, and over {RETEACH_LINE}, so micro-homework on that objective,
          then a recurring test: <Num>71%</Num>. Second loop: micro-homework,
          practice, recurring test: <Num>86%</Num>, every objective over{" "}
          {LO_FLOOR}, speed in band. Master badge, and the classes left on
          Fractions move to Decimals.
        </Example>
      </Section>

      <Section
        n="09"
        title="How it picks the next activity"
        lead="Eight rules, read top to bottom. The first that matches decides."
      >
        <RuleList />
      </Section>

      <Section
        n="10"
        title="How homework is built"
        lead={`Homework is ${HOMEWORK_QUESTIONS} questions: most go to the weakest objectives, some move the student forward, and a few keep strong objectives warm. Each slice is set at a difficulty that keeps expected success in the ${CHALLENGE_ZONE.low}–${CHALLENGE_ZONE.high}% challenge zone.`}
      >
        <HomeworkSplit />
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Weakest · {pct(HOMEWORK_MIX.gap)}</p>
            <p className="mt-1 text-[var(--text-dim)]">
              The two lowest-scoring objectives under the floor.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">
              Frontier · {pct(HOMEWORK_MIX.frontier)}
            </p>
            <p className="mt-1 text-[var(--text-dim)]">
              The next objective in teaching order that is not yet secure.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">
              Spaced review · {pct(HOMEWORK_MIX.review)}
            </p>
            <p className="mt-1 text-[var(--text-dim)]">
              The strongest objective, so it does not fade.
            </p>
          </li>
        </ul>
        <Example>
          Challenge zone, v1: expected success = the objective's score, +
          {DIFFICULTY_OFFSET.easy} on easy questions, {DIFFICULTY_OFFSET.hard}{" "}
          on hard ones. At <Num>55</Num> the homework is easy (expect 70%); at{" "}
          <Num>90</Num> it is hard (expect 75%). The Difficulty Calibrator will
          replace the offsets with each question's real accuracy.
        </Example>
      </Section>

      <Section
        n="11"
        title="The remediation loop, and its guard"
        lead={`A test at ${RETEACH_LINE}–${MASTERY_BAR - 1}% means close the specific gaps and re-check; there is no need to re-teach the topic. One loop is micro-homework (${MICRO_HOMEWORK_QUESTIONS} questions on the weak objectives), then a ${RECURRING_TEST_QUESTIONS}-question recurring test weighted to them. From the second loop a practice session comes before the re-test.`}
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Under {RETEACH_LINE}%: re-teach</p>
            <p className="mt-1 text-[var(--text-dim)]">
              An instruction problem, not a practice problem. The teacher
              re-teaches and the Plan Builder re-plans.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">{LOOP_GUARD} loops: at risk</p>
            <p className="mt-1 text-[var(--text-dim)]">
              The loop stops cycling and flags the student to the teacher,
              naming the objectives that will not move.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">After a class</p>
            <p className="mt-1 text-[var(--text-dim)]">
              A class writes no score. The learn loop starts again:{" "}
              {TOPIC_TEST_AFTER} homeworks, then a fresh topic test.
            </p>
          </li>
        </ul>
      </Section>

      <Section
        n="12"
        title="Badges"
        lead="Novice → Pro → Master. Pro rewards coverage; Master can only be earned by performance."
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Novice</p>
            <p className="mt-1 text-[var(--text-dim)]">
              Where everyone starts, from placement.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Pro</p>
            <p className="mt-1 text-[var(--text-dim)]">
              {pct(PRO_COVERAGE)} of the topic's objectives have{" "}
              {CONFIDENCE_GUESS}+ weighted questions. Homework and practice get
              a student here.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Master</p>
            <p className="mt-1 text-[var(--text-dim)]">
              Passed the mastery check. The topic closes early and its spare
              classes go back to the plan.
            </p>
          </li>
        </ul>
      </Section>

      <Section
        n="13"
        title="On a real student: what happened vs what the loop would have said"
        lead="Each row is one real session. Left, what the student actually did. Right, what the router would have prescribed at that moment, using only the evidence that existed before it."
      >
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <Check className="size-4 text-[#1c7a3a]" /> the student did what the
            loop would have asked for
          </li>
          <li className="flex items-center gap-2">
            <X className="size-4 text-[#b8432c]" /> they did something else. Not
            a judgement on the student; they did what the platform offered
          </li>
        </ul>
        <p className="text-sm text-[var(--text-dim)]">
          A student's first topic test is read as the topic test; later ones,
          after a failed check, as recurring tests. Placement and grade tests
          seed the map at test weight but never decide mastery.
        </p>
      </Section>

      <Section
        n="14"
        title="Where the numbers come from"
        lead="“Noah Mastery Learning Workflow”, draft v1 (7 Aug 2026): the update rule, the weights and every threshold. The doc marks them as proposals for the curriculum team to confirm; changing one is a config change in lib/mastery/rules.ts. The learning-rate floor, decay speed and question counts are not in the doc and are set here."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            value={`${MASTERY_BAR} · ${LO_FLOOR} · ${SPEED_BAND}×`}
            label="mastery bar · per-objective floor · speed band"
            note="the gate, from the doc"
          />
          <Stat
            value="38%"
            label="of real topic tests at 85%+ fail the speed band"
            note="production replica, 3 Nov 2026"
          />
          <Stat
            value="9 · 15 · 26"
            label="rounds to Master at 95% · 85% · 75% ability"
            note="simulation, scripts/mastery-analysis/sim-loop.ts"
          />
        </div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Visuals
 * ------------------------------------------------------------------ */

function Chip({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function LoopDiagram() {
  const steps = [
    { label: "Mastery Map", sub: "score + confidence per objective" },
    { label: "Router", sub: `${RULES.length} rules, first match wins` },
    {
      label: "One activity",
      sub: "homework · test · micro-homework · practice · class",
    },
    { label: "Student does it", sub: "first answers are recorded" },
  ];
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className={cn(
              "min-w-40 rounded-lg border px-3 py-2",
              index === 1
                ? "border-[var(--heading)] bg-[var(--heading)] text-white"
                : "border-[var(--border)] bg-white",
            )}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                index === 1 ? "text-white/80" : "text-[var(--text-dim)]",
              )}
            >
              {item.sub}
            </p>
          </div>
          <span className="text-neutral-300">
            {index < steps.length - 1 ? "→" : "↻"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AttemptStrip({
  attempts,
}: {
  attempts: Array<"right" | "wrong" | "hint">;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {attempts.map((a, index) => (
        <span
          key={`try-${index + 1}-${a}`}
          className={cn(
            "flex h-7 items-center rounded-md px-2 font-mono text-[11px]",
            a === "right" && "bg-[#e3f6e8] text-[#1c7a3a]",
            a === "wrong" && "bg-[#fdebe7] text-[#b8432c]",
            a === "hint" && "bg-neutral-100 text-neutral-500",
            index === 0 && "ring-2 ring-[var(--heading)] ring-offset-1",
          )}
        >
          {a === "right" ? "✓ right" : a === "wrong" ? "✗ wrong" : "hint"}
        </span>
      ))}
      <span className="ml-1 text-[11px] text-[var(--text-dim)]">
        ← only this one counts
      </span>
    </div>
  );
}

function WeightBars() {
  const rows: Array<{ name: string; weight: number; why: string }> = [
    {
      name: "Topic test · recurring test",
      weight: w.diagnostic,
      why: "timed, no hints",
    },
    {
      name: "Placement",
      weight: w.placement,
      why: "a test; its answers set point A on the map",
    },
    {
      name: "Homework",
      weight: w.homework,
      why: "no hints, but untimed",
    },
    {
      name: "Practice, first answer",
      weight: w.practice,
      why: "hints available after the first answer",
    },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[180px_1fr] items-center gap-3 text-sm sm:grid-cols-[220px_140px_1fr]"
        >
          <span className="font-medium">{row.name}</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[var(--heading)]"
                style={{ width: `${row.weight * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs">{row.weight}</span>
          </div>
          <span className="col-span-2 text-[var(--text-dim)] sm:col-span-1">
            {row.why}
          </span>
        </div>
      ))}
    </div>
  );
}

function EvidenceBarDemo() {
  const steps = [
    { label: "placement", value: 3 * w.placement },
    { label: "+ homework", value: 3 * w.placement + 4 * w.homework },
    { label: "+ topic test", value: 3 * w.placement + 4 * w.homework + 3 },
    {
      label: "+ 3 homeworks",
      value: 3 * w.placement + 4 * w.homework + 3 + 12 * w.homework,
    },
  ];
  return (
    <div className="space-y-2">
      {steps.map((item) => {
        const full = item.value >= CONFIDENCE_FULL;
        return (
          <div
            key={item.label}
            className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm"
          >
            <span className="text-[var(--text-dim)]">{item.label}</span>
            <div className="h-2 w-full max-w-64 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  full ? "bg-[var(--heading)]" : "bg-neutral-400",
                )}
                style={{
                  width: `${Math.min(100, (item.value / CONFIDENCE_FULL) * 100)}%`,
                }}
              />
            </div>
            <span className="font-mono text-xs">
              {item.value.toFixed(1)} / {CONFIDENCE_FULL}
              {item.value < CONFIDENCE_GUESS
                ? " · a guess"
                : full
                  ? " · a signal"
                  : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HomeworkSplit() {
  const gap = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.gap);
  const frontier = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.frontier);
  const review = HOMEWORK_QUESTIONS - gap - frontier;
  const sample = [
    {
      name: "Word problems",
      score: 44,
      role: "weakest",
      n: Math.ceil(gap / 2),
    },
    {
      name: "Equivalent fractions",
      score: 62,
      role: "weakest",
      n: Math.floor(gap / 2),
    },
    { name: "Compare fractions", score: null, role: "frontier", n: frontier },
    { name: "Represent fractions", score: 88, role: "review", n: review },
  ];
  const tone: Record<string, string> = {
    weakest: "bg-[#f0a596]",
    frontier: "bg-[#f3cd7a]",
    review: "bg-[#7fcdc3]",
  };
  return (
    <div className="space-y-1.5">
      {sample.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[170px_44px_1fr] items-center gap-3 text-sm"
        >
          <span className="truncate">{row.name}</span>
          <span className="font-mono text-xs text-[var(--text-dim)]">
            {row.score ?? "—"}
          </span>
          <span className="flex items-center gap-1">
            {Array.from({ length: row.n }, (_, i) => (
              <span
                key={`${row.role}-${i + 1}`}
                className={cn("h-4 w-5 rounded-sm", tone[row.role])}
              />
            ))}
            <span className="ml-2 font-mono text-[11px] text-[var(--text-dim)]">
              {row.n} · {row.role}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function StateScale() {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        <div className="bg-[#f0a596]" style={{ width: `${RETEACH_LINE}%` }} />
        <div
          className="bg-[#f3cd7a]"
          style={{ width: `${LO_FLOOR - RETEACH_LINE}%` }}
        />
        <div className="bg-[#7fcdc3]" style={{ width: `${100 - LO_FLOOR}%` }} />
      </div>
      <div className="relative mt-1 h-4 font-mono text-[11px] text-[var(--text-dim)]">
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${RETEACH_LINE}%` }}
        >
          {RETEACH_LINE}
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${LO_FLOOR}%` }}
        >
          {LO_FLOOR}
        </span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}

/** §3 — what a test result decides. */
function TestBands() {
  const bands = [
    {
      range: `0–${RETEACH_LINE - 1}%`,
      what: "Re-teach",
      tone: "bg-[#fdebe7] text-[#b8432c]",
      width: RETEACH_LINE,
    },
    {
      range: `${RETEACH_LINE}–${MASTERY_BAR - 1}%`,
      what: "Fix the gaps, re-test",
      tone: "bg-[#fff3d6] text-[#9a6200]",
      width: MASTERY_BAR - RETEACH_LINE,
    },
    {
      range: `${MASTERY_BAR}%+`,
      what: "Master, if 2 and 3 hold",
      tone: "bg-[#e3f6e8] text-[#1c7a3a]",
      width: 100 - MASTERY_BAR,
    },
  ];
  return (
    <div className="flex w-full overflow-hidden rounded-lg text-xs">
      {bands.map((band) => (
        <div
          key={band.range}
          className={cn("min-w-0 px-2 py-2", band.tone)}
          style={{ flexBasis: `${band.width}%` }}
        >
          <p className="font-mono font-semibold">{band.range}</p>
          <p className="mt-0.5 truncate">{band.what}</p>
        </div>
      ))}
    </div>
  );
}

function GateCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-lg border border-[var(--border)] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
        {n}
      </p>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-[var(--text-dim)]">{body}</p>
    </li>
  );
}

function RuleList() {
  return (
    <ol className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {RULES.map((rule) => (
        <li
          key={rule.id}
          className="grid grid-cols-[36px_1fr_200px] items-baseline gap-3 px-3 py-2 text-sm"
        >
          <span className="font-mono text-xs text-[var(--text-dim)]">
            {rule.id}
          </span>
          <span className="text-[var(--text-dim)]">{rule.condition}</span>
          <span className="font-medium">{rule.activity}</span>
        </li>
      ))}
    </ol>
  );
}

function Stat({
  value,
  label,
  note,
}: {
  value: string;
  label: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <p className="font-mono text-xl font-semibold text-[var(--heading)]">
        {value}
      </p>
      <p className="mt-1 text-sm">{label}</p>
      <p className="mt-1 text-xs text-[var(--text-dim)]">{note}</p>
    </div>
  );
}
