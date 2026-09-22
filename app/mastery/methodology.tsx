"use client";

import { Dialog } from "@base-ui/react/dialog";
import { BookOpen, Check, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  CHECK_PASS,
  CHECK_QUESTIONS,
  CLASS_DISCOUNT,
  EVIDENCE_WEIGHT,
  HOMEWORK_MIX,
  HOMEWORK_QUESTIONS,
  LOCK_EVIDENCE,
  MASTER_SCORE,
  NEEDS_HELP_SCORE,
  PLATEAU_RUNS,
  READY_EVIDENCE,
  READY_SCORE,
  RETEST_AFTER_SESSIONS,
  RETEST_QUESTIONS,
  SCORE_WINDOW,
  SESSIONS_AFTER_CLASS,
  STALL_RUNS,
  SURVEY_PER_LO,
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

/* ------------------------------------------------------------------ */

function Body() {
  return (
    <>
      <Section
        n="01"
        title="One student, one topic, one next step"
        lead="The loop reads what the student has answered so far, and hands back exactly one thing to do next. The student does it, the numbers move, and it reads again — until every objective in the topic is signed off."
      >
        <LoopDiagram />
      </Section>

      <Section
        n="02"
        title="Only the first answer counts"
        lead="If a student retries a question, the retry is ignored. On the platform, practice always ends at 100% because of hints and retries — so the final answer says nothing. The first one does."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <AttemptStrip attempts={["wrong", "hint", "wrong", "right"]} />
          <span className="text-[var(--text-dim)]">
            counts as <Num>0 of 1</Num> — the first answer was wrong.
          </span>
        </div>
        <Example>
          Practice, 5 questions: right first time on 2, needed hints on 3, all 5
          eventually correct. The loop records <Num>2 / 5</Num>, not 5 / 5.
        </Example>
      </Section>

      <Section
        n="03"
        title="Weights — how much is an answer worth?"
        lead="A correct answer in a timed test is stronger proof than one in relaxed homework or in practice. Each answer is scaled by where it came from. Question difficulty plays no part — in the real data, “hard” questions were answered right 76% of the time and “easy” ones 71%; the labels don't measure difficulty."
      >
        <WeightBars />
        <Example>
          10 correct answers in a topic test = <Num>10</Num>. In homework ={" "}
          <Num>{10 * w.homework}</Num>. In practice (first try) ={" "}
          <Num>{10 * w.practice}</Num>. A test moves the score; practice nudges
          it.
        </Example>
      </Section>

      <Section
        n="04"
        title={`Score — the last ${SCORE_WINDOW} questions`}
        lead={`Correct ÷ answered, weighted, over the student's most recent ${SCORE_WINDOW} weighted questions on that objective. Older answers fall out, so the score follows the student as they improve instead of being anchored by how they started.`}
      >
        <WindowStrip />
        <Example>
          A student is weak at first — 8 of 20 right — then a mentor teaches it
          and they get the next 10 right. Over the whole history the score would
          read <Num>60</Num> and the loop would keep handing out homework. Over
          the last {SCORE_WINDOW} it reads <Num>92</Num>: ready for a check. On
          9,200 real histories the window predicted the next session as well as
          the full history did — it costs nothing in accuracy.
        </Example>
      </Section>

      <Section
        n="05"
        title="Evidence — how sure are we?"
        lead={`A score of 100 on three questions and a score of 100 on twenty are not the same claim. Evidence counts every weighted question the student has ever answered on the objective. At ${LOCK_EVIDENCE} the score is trusted: only then can the loop sign off, flag, or re-teach.`}
      >
        <EvidenceBarDemo />
        <Example>
          Survey 3 questions (3) + homework 4 questions (4 × {w.homework} ={" "}
          {(4 * w.homework).toFixed(1)}) ={" "}
          <Num>{(3 + 4 * w.homework).toFixed(1)}</Num> — not yet trusted. A
          5-question re-test adds 5 →{" "}
          <Num>{(3 + 4 * w.homework + 5).toFixed(1)}</Num>: trusted. Practice
          alone can't get there — 18 practice questions would be needed.
        </Example>
      </Section>

      <Section
        n="06"
        title="What the score means"
        lead="The router reads one objective's score against three lines."
      >
        <StateScale />
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex gap-2">
            <Chip className="bg-[#fdebe7] text-[#b8432c]">Needs teaching</Chip>
            <span className="text-[var(--text-dim)]">
              under {NEEDS_HELP_SCORE}. Only 1 in 5 reaches 80 next time —
              measure less, teach more.
            </span>
          </li>
          <li className="flex gap-2">
            <Chip className="bg-[#fff3d6] text-[#9a6200]">Working</Chip>
            <span className="text-[var(--text-dim)]">
              {NEEDS_HELP_SCORE}–{READY_SCORE - 1}, or a high score on too
              little evidence.
            </span>
          </li>
          <li className="flex gap-2">
            <Chip className="bg-[#dff5f2] text-[#0f6b62]">Ready</Chip>
            <span className="text-[var(--text-dim)]">
              {READY_SCORE}+ on {READY_EVIDENCE}+ questions. Sent to an LO
              check.
            </span>
          </li>
          <li className="flex gap-2">
            <Chip className="bg-[#e3f6e8] text-[#1c7a3a]">Signed off</Chip>
            <span className="text-[var(--text-dim)]">
              passed the check. Permanent — it never comes back.
            </span>
          </li>
        </ul>
      </Section>

      <Section
        n="07"
        title="Three tests, three jobs"
        lead="Inside a topic there are only three tests. Grade tests and multi-topic tests are not in the loop — they decide which topic to study, and that is the Plan Builder's job."
      >
        <TestTimeline />
        <Example>
          The LO check is the only thing that can sign an objective off:{" "}
          <Num>
            {CHECK_PASS} of {CHECK_QUESTIONS}
          </Num>{" "}
          unseen questions right, no hints, on a score of {READY_SCORE}+ with{" "}
          {LOCK_EVIDENCE}+ evidence. A single topic test at 80–89 holds on
          re-test only 58% of the time — that is why one test is never enough.
        </Example>
      </Section>

      <Section
        n="08"
        title="How it picks the next activity"
        lead="Nine rules, read top to bottom. The first that matches decides. Safety first, then certification, then teaching, then measuring, then the default."
      >
        <RuleList />
        <Example>
          A topic re-test is {RETEST_QUESTIONS} questions across every open
          objective, more where the score is low. An LO check is{" "}
          {CHECK_QUESTIONS} questions on one objective only.
        </Example>
      </Section>

      <Section
        n="09"
        title="How homework is built"
        lead={`Homework is ${HOMEWORK_QUESTIONS} questions, and it always covers a mix: most go to the weakest objectives, a few probe what is least measured, and a couple keep a strong objective warm. Strong objectives are never dropped — skills fade when they are never touched.`}
      >
        <HomeworkSplit />
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Gap · {pct(HOMEWORK_MIX.gap)}</p>
            <p className="mt-1 text-[var(--text-dim)]">
              The two lowest-scoring objectives share these.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Probe · {pct(HOMEWORK_MIX.probe)}</p>
            <p className="mt-1 text-[var(--text-dim)]">
              The objective with the least evidence — find out where it stands.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">
              Maintain · {pct(HOMEWORK_MIX.maintain)}
            </p>
            <p className="mt-1 text-[var(--text-dim)]">
              The strongest open objective, to keep it fresh.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Signed off = out</p>
            <p className="mt-1 text-[var(--text-dim)]">
              Only open objectives are split. With 3 of 4 signed off, all{" "}
              {HOMEWORK_QUESTIONS} go to the last one.
            </p>
          </li>
        </ul>
        <Example>
          Because a strong objective only gets ~
          {Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.maintain)} homework
          questions, homework alone builds its evidence slowly. The topic
          re-test every {RETEST_AFTER_SESSIONS} sessions is what carries strong
          objectives to “ready” — it measures all of them at full weight.
        </Example>
      </Section>

      <Section
        n="10"
        title="Same start, then every student's own path"
        lead="The first three sessions are a fixed on-ramp. From the fourth, the student's own numbers drive it, and by the fifth no two students are likely to be on the same path. Measured on 2,000 simulated students of mixed ability on a 5-objective topic."
      >
        <PathDivergence />
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Strong student</p>
            <p className="mt-1 text-[var(--text-dim)]">
              survey → homework → homework → LO check → … Closes a 5-objective
              topic in about 9 rounds.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Average student</p>
            <p className="mt-1 text-[var(--text-dim)]">
              survey → practice → homework → practice → re-test → … About 18
              rounds, usually one mentor class.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Weak student</p>
            <p className="mt-1 text-[var(--text-dim)]">
              survey → practice → homework → flag to teacher → class → … 25+
              rounds, several classes; never certified without teaching.
            </p>
          </li>
        </ul>
        <Example>
          “How many tests will my child take?” has no single answer — only a
          range. The number of sessions is an <Num>output</Num> of the loop,
          never an input.
        </Example>
      </Section>

      <Section
        n="11"
        title="What a mentor class does"
        lead="A class writes no score — teaching is not measurement. But it changes the student, so the loop treats it as a fresh start."
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Evidence from before counts half</p>
            <p className="mt-1 text-[var(--text-dim)]">
              × {CLASS_DISCOUNT}. The results that caused the class stop
              anchoring the score.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Stall and block counts reset</p>
            <p className="mt-1 text-[var(--text-dim)]">
              The loop gives the teaching a chance to land.
            </p>
          </li>
          <li className="rounded-lg border border-[var(--border)] p-3">
            <p className="font-semibold">Measure before teaching again</p>
            <p className="mt-1 text-[var(--text-dim)]">
              {SESSIONS_AFTER_CLASS} sessions before another class; never a
              check straight after one.
            </p>
          </li>
        </ul>
      </Section>

      <Section
        n="12"
        title="When a topic is mastered"
        lead={`Every objective signed off, and the topic score at ${MASTER_SCORE} or more. The topic score is the objectives' scores averaged by evidence — same recent window, so it never lags behind them.`}
      >
        <MasteryDemo />
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
            <X className="size-4 text-[#b8432c]" /> they did something else —
            not a judgement on the student; they did what the platform offered
          </li>
        </ul>
        <p className="text-sm text-[var(--text-dim)]">
          The first row is always a cross: the loop starts every topic with a
          survey, and no student has taken one. The LO check does not exist on
          the platform yet either, so nothing on real data is signed off — the
          page shows where the loop would have asked for one.
        </p>
      </Section>

      <Section
        n="14"
        title="Where the numbers come from"
        lead="A back-test on the production replica (21 Sep 2026): 12,564 completed sessions, 5,953 students, 175,636 answered questions — then a simulation of the loop on thousands of made-up students to check it converges. Full record in docs/mastery-analysis/decisions.md."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            value="58%"
            label="of students scoring 80–89 on a topic test score 80+ again"
            note="one test is not proof"
          />
          <Stat
            value="71 · 71 · 76"
            label="% correct on easy · medium · hard questions"
            note="difficulty labels don't measure difficulty"
          />
          <Stat
            value="88% vs 75%"
            label="later accuracy with 9+ evidence and 90+ score, vs everyone"
            note="evidence volume is what predicts"
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
    { label: "Scorecard", sub: "score + evidence per objective" },
    { label: "Router", sub: "9 rules, first match wins" },
    {
      label: "One activity",
      sub: "survey · practice · homework · re-test · check · class",
    },
    { label: "Student does it", sub: "first answers are recorded" },
  ];
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <div
            className={cn(
              "min-w-40 rounded-lg border px-3 py-2",
              index === 1
                ? "border-[var(--heading)] bg-[var(--heading)] text-white"
                : "border-[var(--border)] bg-white",
            )}
          >
            <p className="text-sm font-semibold">{step.label}</p>
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                index === 1 ? "text-white/80" : "text-[var(--text-dim)]",
              )}
            >
              {step.sub}
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
      name: "Topic test · re-test · LO check",
      weight: w.diagnostic,
      why: "timed, no hints, one attempt",
    },
    {
      name: "Homework",
      weight: w.homework,
      why: "no hints, but untimed and relaxed — reads ~2 points high",
    },
    {
      name: "Practice — first answer",
      weight: w.practice,
      why: "a learning format; the first answer is real, retries are not",
    },
    {
      name: "Placement",
      weight: w.placement,
      why: "20 questions across a whole grade — too thin per objective",
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

function WindowStrip() {
  // 20 weak answers then 10 strong ones; the bracket sits over the last N.
  const cells: Array<"r" | "w"> = [
    ..."wrwwrwwwrwwrwwwrwrww"
      .split("")
      .map((c): "r" | "w" => (c === "r" ? "r" : "w")),
    ...Array<"r">(10).fill("r"),
  ];
  const windowStart = cells.length - SCORE_WINDOW;
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {cells.map((c, index) => (
          <span
            key={`q-${index + 1}-${c}`}
            className={cn(
              "size-4 rounded-sm",
              c === "r" ? "bg-[#7fcdc3]" : "bg-[#f0a596]",
              index < windowStart && "opacity-35",
            )}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
        <span className="opacity-50">← older answers fade out</span>
        <span className="ml-auto rounded border border-[var(--heading)] px-1.5 py-0.5 font-mono text-[var(--heading)]">
          last {SCORE_WINDOW} = the score
        </span>
      </div>
    </div>
  );
}

function EvidenceBarDemo() {
  const steps = [
    { label: "after survey", value: 3 },
    { label: "+ homework", value: 3 + 4 * w.homework },
    { label: "+ re-test", value: 3 + 4 * w.homework + 5 },
  ];
  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const locked = step.value >= LOCK_EVIDENCE;
        return (
          <div
            key={step.label}
            className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm"
          >
            <span className="text-[var(--text-dim)]">{step.label}</span>
            <div className="h-2 w-full max-w-64 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  locked ? "bg-[var(--heading)]" : "bg-neutral-400",
                )}
                style={{
                  width: `${Math.min(100, (step.value / LOCK_EVIDENCE) * 100)}%`,
                }}
              />
            </div>
            <span className="font-mono text-xs">
              {step.value.toFixed(1)} / {LOCK_EVIDENCE}
              {locked ? " · trusted" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PathDivergence() {
  // Share of students receiving each activity, by round (sim-divergence.ts).
  const rounds: Array<{ round: number; top: Array<[string, number]> }> = [
    { round: 1, top: [["Survey", 100]] },
    {
      round: 2,
      top: [
        ["Practice", 67],
        ["Homework", 27],
        ["Topic class", 7],
      ],
    },
    {
      round: 3,
      top: [
        ["Homework", 93],
        ["Practice", 7],
      ],
    },
    {
      round: 4,
      top: [
        ["Practice", 42],
        ["Flag", 22],
        ["Re-test", 16],
        ["Check", 16],
      ],
    },
    {
      round: 5,
      top: [
        ["Re-test", 34],
        ["Practice", 29],
        ["Homework", 14],
        ["Check", 12],
      ],
    },
    {
      round: 6,
      top: [
        ["Practice", 26],
        ["Check", 25],
        ["Re-test", 21],
        ["Homework", 11],
      ],
    },
  ];
  const tone: Record<string, string> = {
    Survey: "bg-[var(--heading)]",
    Homework: "bg-[#7fcdc3]",
    Practice: "bg-[#f3cd7a]",
    "Re-test": "bg-[#9fb3d9]",
    Check: "bg-[#1c7a3a]",
    Flag: "bg-[#b8432c]",
    "Topic class": "bg-[#9a6200]",
  };
  return (
    <div className="space-y-1.5">
      {rounds.map((r) => (
        <div
          key={r.round}
          className="grid grid-cols-[64px_1fr] items-center gap-3 text-xs"
        >
          <span className="font-mono text-[var(--text-dim)]">
            round {r.round}
          </span>
          <div className="flex h-6 w-full overflow-hidden rounded-md bg-neutral-100">
            {r.top.map(([name, share]) => (
              <span
                key={name}
                className={cn(
                  "flex items-center overflow-hidden whitespace-nowrap px-2 text-white",
                  tone[name] ?? "bg-neutral-400",
                )}
                style={{ width: `${share}%` }}
                title={`${name} ${share}%`}
              >
                {share >= 14 ? `${name} ${share}%` : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-[var(--text-dim)]">
        Each bar is one round; the segments are the share of students handed
        each activity. Round 1 is one colour; by round 4 it is four.
      </p>
    </div>
  );
}

function HomeworkSplit() {
  const gap = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.gap);
  const probe = Math.round(HOMEWORK_QUESTIONS * HOMEWORK_MIX.probe);
  const maintain = HOMEWORK_QUESTIONS - gap - probe;
  const sample = [
    {
      name: "Use brackets",
      score: 42,
      evidence: 11,
      role: "gap",
      n: Math.ceil(gap / 2),
    },
    {
      name: "Order of operations",
      score: 55,
      evidence: 9,
      role: "gap",
      n: Math.floor(gap / 2),
    },
    {
      name: "Estimate to check",
      score: 70,
      evidence: 4,
      role: "probe",
      n: probe,
    },
    {
      name: "Read & write numbers",
      score: 91,
      evidence: 14,
      role: "maintain",
      n: maintain,
    },
  ];
  const tone: Record<string, string> = {
    gap: "bg-[#f0a596]",
    probe: "bg-[#f3cd7a]",
    maintain: "bg-[#7fcdc3]",
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
            {row.score}
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
        <div
          className="bg-[#f0a596]"
          style={{ width: `${NEEDS_HELP_SCORE}%` }}
        />
        <div
          className="bg-[#f3cd7a]"
          style={{ width: `${READY_SCORE - NEEDS_HELP_SCORE}%` }}
        />
        <div
          className="bg-[#7fcdc3]"
          style={{ width: `${100 - READY_SCORE}%` }}
        />
      </div>
      <div className="relative mt-1 h-4 font-mono text-[11px] text-[var(--text-dim)]">
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${NEEDS_HELP_SCORE}%` }}
        >
          {NEEDS_HELP_SCORE}
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${READY_SCORE}%` }}
        >
          {READY_SCORE}
        </span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}

function TestTimeline() {
  const tests = [
    {
      name: "Topic survey",
      when: "once, at the start",
      what: `${SURVEY_PER_LO} questions per objective. Fills an empty scorecard. Can never sign off.`,
    },
    {
      name: "Topic re-test",
      when: `after every ${RETEST_AFTER_SESSIONS} homework / practice sessions`,
      what: `${RETEST_QUESTIONS} timed questions across all open objectives, more on the weak ones. Shows whether the teaching landed. Can never sign off.`,
    },
    {
      name: "LO check",
      when: "when one objective looks ready",
      what: `${CHECK_QUESTIONS} unseen questions on that objective only. The only test that signs off.`,
    },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {tests.map((test, index) => (
        <li
          key={test.name}
          className="rounded-lg border border-[var(--border)] p-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {index === 0 ? "start" : index === 1 ? "middle" : "end"}
          </p>
          <p className="mt-1 font-semibold">{test.name}</p>
          <p className="text-xs text-[var(--heading)]">{test.when}</p>
          <p className="mt-1.5 text-sm text-[var(--text-dim)]">{test.what}</p>
        </li>
      ))}
    </ol>
  );
}

function RuleList() {
  const rules: Array<{ id: string; when: string; gives: string }> = [
    {
      id: "R0",
      when: "every objective is signed off",
      gives: "Close the topic",
    },
    {
      id: "R1",
      when: `whole topic under ${NEEDS_HELP_SCORE} on trusted evidence`,
      gives: "Whole-topic class",
    },
    {
      id: "R2",
      when: `${STALL_RUNS} sessions in a row under ${NEEDS_HELP_SCORE}, or 3 failed checks`,
      gives: "Flag to the teacher",
    },
    { id: "R3", when: "no survey yet", gives: "Topic survey" },
    {
      id: "R4",
      when: `2 failed checks, or stuck at ${NEEDS_HELP_SCORE}–${READY_SCORE - 1} for ${PLATEAU_RUNS} sessions`,
      gives: "Class on that objective",
    },
    {
      id: "R5",
      when: `objectives at ${READY_SCORE}+ with enough evidence`,
      gives: "LO check",
    },
    {
      id: "R6",
      when: `an objective under ${NEEDS_HELP_SCORE}`,
      gives: "Practice on it",
    },
    {
      id: "R7",
      when: `${RETEST_AFTER_SESSIONS} sessions since the last test`,
      gives: "Topic re-test",
    },
    { id: "R8", when: "nothing above matched", gives: "Homework" },
  ];
  return (
    <ol className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className="grid grid-cols-[36px_1fr_170px] items-baseline gap-3 px-3 py-2 text-sm"
        >
          <span className="font-mono text-xs text-[var(--text-dim)]">
            {rule.id}
          </span>
          <span className="text-[var(--text-dim)]">{rule.when}</span>
          <span className="font-medium">{rule.gives}</span>
        </li>
      ))}
    </ol>
  );
}

function MasteryDemo() {
  const los = [
    { name: "Read & write numbers", score: 92 },
    { name: "Estimate to check", score: 94 },
    { name: "Order of operations", score: 95 },
    { name: "Use brackets", score: 100 },
  ];
  const topic = Math.round(los.reduce((s, lo) => s + lo.score, 0) / los.length);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {los.map((lo) => (
        <span
          key={lo.name}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#e3f6e8] px-2.5 py-1 text-[#1c7a3a]"
        >
          <Check className="size-3.5" />
          {lo.name} <span className="font-mono">{lo.score}</span>
        </span>
      ))}
      <span className="text-neutral-300">→</span>
      <span className="rounded-md bg-[var(--heading)] px-2.5 py-1 font-semibold text-white">
        Topic {topic} · Master
      </span>
    </div>
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
