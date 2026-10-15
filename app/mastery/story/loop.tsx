"use client";

import {
  CheckCheck,
  Flag,
  LayoutGrid,
  LogIn,
  type LucideIcon,
  NotebookPen,
  RefreshCw,
  Signpost,
  Sparkles,
} from "lucide-react";

import type { Activity } from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

import { ACTIVITY_ICON, STATION } from "./parts";

/* ------------------------------------------------------------------ */
/* The loop itself: four steps that repeat after every session         */
/* ------------------------------------------------------------------ */

const CYCLE: Array<{
  icon: LucideIcon;
  title: string;
  detail: string;
  /** Where the node sits on the ring. */
  at: string;
}> = [
  {
    icon: NotebookPen,
    title: "Student does an activity",
    detail: "a test, homework, practice or a check",
    at: "top-0 left-1/2 -translate-x-1/2",
  },
  {
    icon: CheckCheck,
    title: "First answers are marked",
    detail: "right or wrong, for each objective",
    at: "top-1/2 right-0 -translate-y-1/2",
  },
  {
    icon: LayoutGrid,
    title: "Scorecard updates",
    detail: "each objective: weak, getting there or strong",
    at: "bottom-0 left-1/2 -translate-x-1/2",
  },
  {
    icon: Signpost,
    title: "Rules pick the next step",
    detail: "one activity, with the reason",
    at: "top-1/2 left-0 -translate-y-1/2",
  },
];

function CycleNode({
  step,
  index,
}: {
  step: (typeof CYCLE)[number];
  index: number;
}) {
  return (
    <div className="flex w-[200px] items-start gap-3 rounded-2xl border-2 border-[#15302f] bg-white p-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#15302f] text-white">
        <step.icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">
          <span className="mr-1.5 text-[#8b9592] tabular-nums">
            {index + 1}
          </span>
          {step.title}
        </span>
        <span className="mt-1 block text-xs leading-snug text-[#4a5a58]">
          {step.detail}
        </span>
      </span>
    </div>
  );
}

export function LoopCycle() {
  return (
    <div className="grid items-center gap-10 xl:grid-cols-[560px_minmax(0,1fr)]">
      {/* The ring, on wide screens */}
      <div className="relative mx-auto hidden aspect-square w-full max-w-[560px] sm:block">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="loop-arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10 z" fill="#15302f" />
            </marker>
          </defs>
          {/* Four quarter arcs, clockwise: top → right → bottom → left → top. */}
          {[
            "M64.2 14.8 A38 38 0 0 1 85.2 35.8",
            "M85.2 64.2 A38 38 0 0 1 64.2 85.2",
            "M35.8 85.2 A38 38 0 0 1 14.8 64.2",
            "M14.8 35.8 A38 38 0 0 1 35.8 14.8",
          ].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="#15302f"
              strokeWidth="0.9"
              markerEnd="url(#loop-arrow)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <RefreshCw className="size-7 text-[#15302f]" />
          <p className="mt-2 text-2xl font-extrabold tracking-tight">
            The loop
          </p>
          <p className="mt-1 max-w-[170px] text-sm leading-snug text-[#4a5a58]">
            Goes round once per session, until every objective is signed off
          </p>
        </div>
        {CYCLE.map((step, index) => (
          <div key={step.title} className={cn("absolute", step.at)}>
            <CycleNode step={step} index={index} />
          </div>
        ))}
      </div>

      {/* The same four steps as a list, on phones */}
      <ol className="space-y-3 sm:hidden">
        {CYCLE.map((step, index) => (
          <li key={step.title}>
            <CycleNode step={step} index={index} />
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm font-medium">
          <RefreshCw className="size-4" /> Back to step 1, every session
        </li>
      </ol>

      {/* What is in and around it */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
        <Around
          icon={LogIn}
          title="Before the loop"
          body="The placement test sets where the student starts. The Plan Builder picks which topic they work on."
        />
        <Around
          icon={Flag}
          title="Out of the loop"
          body="When every objective passes its 5-question check, the topic is done and the student moves on."
        />
        <Around
          icon={Sparkles}
          title="Beside the loop: the AI"
          body="After each session the AI reads the wrong answers and writes a note for the mentor. It explains; it does not change the next step."
          tone="ai"
        />
      </div>
    </div>
  );
}

function Around({
  icon: Icon,
  title,
  body,
  tone = "plain",
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  tone?: "plain" | "ai";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl p-5",
        tone === "ai" ? "bg-[#ece8f6] text-[#2e2560]" : "bg-white",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "ai" ? "text-[#6d5bd0]" : "text-[#15302f]",
        )}
      />
      <div>
        <p className="font-bold">{title}</p>
        <p
          className={cn(
            "mt-1 text-[15px] leading-relaxed",
            tone === "ai" ? "text-[#4b4280]" : "text-[#4a5a58]",
          )}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* What step 4 can pick: every activity inside the loop                 */
/* ------------------------------------------------------------------ */

const AUTOMATIC: Array<{
  activity: Activity;
  when: string;
  what: string;
  /** How much one answer counts towards the score (EVIDENCE_WEIGHT). */
  counts: number;
}> = [
  {
    activity: "survey",
    when: "Start of a topic",
    what: "3 questions on each objective",
    counts: 1,
  },
  {
    activity: "homework",
    when: "Most sessions",
    what: "12 questions, mostly on the weakest objectives",
    counts: 0.8,
  },
  {
    activity: "practice",
    when: "An objective is under 60",
    what: "5 questions on just that one, with hints",
    counts: 0.5,
  },
  {
    activity: "topic_test",
    when: "After 2 homework or practice sessions",
    what: "15 timed questions, no hints",
    counts: 1,
  },
  {
    activity: "check",
    when: "An objective holds 80+",
    what: "5 new questions, 4 right signs it off",
    counts: 1,
  },
];

const PERSON: Array<{ activity: Activity; when: string }> = [
  {
    activity: "class",
    when: "One objective stuck at 60–79 for 4 sessions, or its check failed twice",
  },
  {
    activity: "topic_class",
    when: "Every objective under 60 — the topic never landed",
  },
  {
    activity: "escalate",
    when: "3 sessions in a row under 60 and nothing moving",
  },
];

const COUNTS_LABEL = (counts: number) =>
  counts === 1 ? "Counts fully" : `Counts ${Math.round(counts * 100)}%`;

export function InsideTheLoop() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div>
        <p className="text-lg font-bold">The platform runs it</p>
        <ul className="mt-3 divide-y divide-[#d8dedc] border-y border-[#d8dedc]">
          {AUTOMATIC.map((item) => {
            const Icon = ACTIVITY_ICON[item.activity];
            return (
              <li
                key={item.activity}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span className="flex size-9 items-center justify-center rounded-full border-2 border-[#15302f]">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {STATION[item.activity]}
                  </span>
                  <span className="block text-sm text-[#4a5a58]">
                    {item.when} · {item.what}
                  </span>
                </span>
                <span
                  className="flex items-center gap-2 text-xs text-[#4a5a58]"
                  title="How much each answer counts towards the score"
                >
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#e3e8e6]">
                    <span
                      className="block h-full rounded-full bg-[#15302f]"
                      style={{ width: `${item.counts * 100}%` }}
                    />
                  </span>
                  <span className="w-[74px]">{COUNTS_LABEL(item.counts)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-lg font-bold">A person steps in</p>
        <ul className="mt-3 space-y-2.5">
          {PERSON.map((item) => {
            const Icon = ACTIVITY_ICON[item.activity];
            return (
              <li
                key={item.activity}
                className="flex items-start gap-3 rounded-2xl bg-[#15302f] p-4 text-white"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block font-semibold">
                    {STATION[item.activity]}
                  </span>
                  <span className="mt-0.5 block text-sm text-white/75">
                    {item.when}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-[#4a5a58]">
          A class doesn't score. After one, the loop measures 3 more sessions
          before it can ask for another.
        </p>
      </div>
    </div>
  );
}
