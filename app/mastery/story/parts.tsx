"use client";

import {
  BadgeCheck,
  BellRing,
  Check,
  ClipboardList,
  Dumbbell,
  Flag,
  GraduationCap,
  type LucideIcon,
  NotebookPen,
  Timer,
  Users,
} from "lucide-react";

import { isGuess } from "@/lib/mastery/gap";
import type {
  Activity,
  Decision,
  LoRow,
  MasteryObjective,
  ReplayStep,
} from "@/lib/mastery/rules";
import { PLAIN_STEP } from "@/lib/mastery/story";
import { cn } from "@/lib/utils";
import { REASON_LABEL, type WrongReason } from "@/lib/why-wrong/ladder";

import { fmtDate, MODE_LABEL } from "../shared";
import styles from "./story.module.css";

/* ------------------------------------------------------------------ */
/* Palette — score zones, the ink of the routes, Jev's violet          */
/* ------------------------------------------------------------------ */

export const INK = "#15302f";

type Zone = "strong" | "middle" | "weak" | "unknown";

const ZONE_DOT: Record<Zone, string> = {
  strong: "bg-[#1f9d8b]",
  middle: "bg-[#e3a23b]",
  weak: "bg-[#d0485e]",
  unknown: "bg-[#c9cfcc]",
};

const ZONE_TILE: Record<Zone, string> = {
  strong: "bg-[#dcf2ee] text-[#0f6b62]",
  middle: "bg-[#fbefd5] text-[#8a5a00]",
  weak: "bg-[#fbe3e6] text-[#a8283c]",
  unknown: "bg-[#eef0ef] text-[#8b9592]",
};

const zoneOfScore = (score: number | null): Zone =>
  score === null
    ? "unknown"
    : score >= 80
      ? "strong"
      : score >= 60
        ? "middle"
        : "weak";

const zoneOfRow = (row: LoRow): Zone =>
  row.state === "ready" || row.state === "signed_off"
    ? "strong"
    : row.state === "working"
      ? "middle"
      : row.state === "needs_help" || row.state === "blocked"
        ? "weak"
        : "unknown";

export const ACTIVITY_ICON: Record<Activity, LucideIcon> = {
  close: Flag,
  topic_class: Users,
  escalate: BellRing,
  survey: ClipboardList,
  class: GraduationCap,
  check: BadgeCheck,
  practice: Dumbbell,
  topic_test: ClipboardList,
  homework: NotebookPen,
};

/** Short station names for the routes; PLAIN_STEP holds the full sentence. */
export const STATION: Record<Activity, string> = {
  close: "Topic done",
  topic_class: "Mentor re-teaches the topic",
  escalate: "Tell the teacher",
  survey: "Short test",
  class: "Mentor class",
  check: "5-question check",
  practice: "Practice one objective",
  topic_test: "Re-test",
  homework: "Targeted homework",
};

/* ------------------------------------------------------------------ */
/* Objective tiles                                                     */
/* ------------------------------------------------------------------ */

export function ObjectiveTiles({
  rows,
  targets = [],
  size = "md",
}: {
  rows: LoRow[];
  targets?: number[];
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map((row, index) => (
        <div
          key={row.id}
          title={`${index + 1}. ${row.name}`}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-md tabular-nums",
            size === "sm" ? "size-8 text-xs" : "size-12 text-sm",
            ZONE_TILE[zoneOfRow(row)],
            targets.includes(row.id) &&
              "outline-2 outline-offset-2 outline-[#15302f]",
          )}
        >
          <span className="absolute top-0.5 left-1 text-[9px] font-medium opacity-60">
            {index + 1}
          </span>
          {row.signedOff ? (
            <Check className={size === "sm" ? "size-4" : "size-5"} />
          ) : (
            <span className="font-semibold">
              {row.score === null ? "?" : Math.round(row.score)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ObjectiveKey({
  objectives,
}: {
  objectives: MasteryObjective[];
}) {
  return (
    <ol className="grid gap-x-8 gap-y-1.5 text-sm text-[#4a5a58] sm:grid-cols-2 lg:grid-cols-3">
      {objectives.map((o, index) => (
        <li key={o.id} className="flex gap-2.5">
          <span className="w-4 shrink-0 text-right font-semibold text-[#15302f] tabular-nums">
            {index + 1}
          </span>
          <span>{o.name}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* How it decides: one score line, four places on it                    */
/* ------------------------------------------------------------------ */

const PLACES: Array<{
  zone: Zone;
  range: string;
  icon: LucideIcon;
  step: string;
  after: string;
  grow: string;
}> = [
  {
    zone: "weak",
    range: "0–59",
    icon: Dumbbell,
    step: "Practise that objective",
    after: "Still stuck? A person steps in",
    grow: "basis-[60%]",
  },
  {
    zone: "middle",
    range: "60–79",
    icon: NotebookPen,
    step: "Homework on the weak spots",
    after: "Stuck 4 sessions? Mentor class",
    grow: "basis-[20%]",
  },
  {
    zone: "strong",
    range: "80–100",
    icon: BadgeCheck,
    step: "5-question check",
    after: "Pass it and it's signed off",
    grow: "basis-[20%]",
  },
];

export function ScoreScale() {
  return (
    <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)]">
      <div className="rounded-xl bg-[#eef0ef] p-4">
        <p className="text-2xl font-bold text-[#8b9592]">?</p>
        <p className="mt-2 font-semibold text-[#15302f]">Not tested yet</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#4a5a58]">
          <ClipboardList className="size-4" /> A short test
        </p>
      </div>
      <div>
        <div className="flex h-4 overflow-hidden rounded-full">
          {PLACES.map((p) => (
            <div key={p.zone} className={cn(p.grow, ZONE_DOT[p.zone])} />
          ))}
        </div>
        <div className="mt-1 flex text-xs font-medium text-[#4a5a58] tabular-nums">
          {PLACES.map((p) => (
            <div key={p.zone} className={cn(p.grow, "px-1")}>
              {p.range}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLACES.map((p) => (
            <div
              key={p.zone}
              className={cn("rounded-xl p-4", ZONE_TILE[p.zone])}
            >
              <p.icon className="size-5" />
              <p className="mt-2 font-semibold leading-snug">{p.step}</p>
              <p className="mt-1 text-sm opacity-80">{p.after}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The route: one stop per session, ending at the next station         */
/* ------------------------------------------------------------------ */

export interface Stop {
  key: string;
  /** Percent right; null for a session with no questions (a class). */
  accuracy: number | null;
  title: string;
  /** Riya's rushed sessions. */
  rushed?: boolean;
}

export function StationBadge({
  activity,
  detail,
  className,
}: {
  activity: Activity;
  detail?: string;
  className?: string;
}) {
  const Icon = ACTIVITY_ICON[activity];
  const human = PLAIN_STEP[activity].human;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border-2 border-[#15302f] py-1.5 pr-4 pl-1.5",
        human ? "bg-[#15302f] text-white" : "bg-white text-[#15302f]",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          human ? "bg-white/15" : "bg-[#15302f] text-white",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold">
          {STATION[activity]}
        </span>
        {detail && <span className="block text-xs opacity-75">{detail}</span>}
      </span>
    </div>
  );
}

export function Route({
  stops,
  switchAt = -1,
  activity,
  detail,
  animateLast = false,
}: {
  stops: Stop[];
  /** Index of the stop where the loop would have changed course; -1 for none. */
  switchAt?: number;
  activity: Activity;
  detail?: string;
  animateLast?: boolean;
}) {
  const offRoute = (index: number) => switchAt >= 0 && index >= switchAt;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-full min-w-fit items-start pt-7">
        {stops.map((stop, index) => (
          <div
            key={stop.key}
            className={cn("flex items-start", index > 0 && "min-w-0 flex-1")}
          >
            {index > 0 && (
              <div
                className={cn(
                  "mt-[11px] h-0 min-w-2 flex-1 border-t-[3px]",
                  offRoute(index)
                    ? "border-dashed border-[#b9c2bf]"
                    : "border-solid border-[#15302f]",
                )}
              />
            )}
            <div className="relative flex w-7 shrink-0 flex-col items-center">
              {index === switchAt && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-[#15302f] px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white">
                  Loop switches here
                </span>
              )}
              <span
                title={stop.title}
                className={cn(
                  "flex size-[25px] items-center justify-center rounded-full ring-[3px]",
                  stop.accuracy === null
                    ? "bg-white ring-[#15302f]"
                    : cn(ZONE_DOT[zoneOfScore(stop.accuracy)], "ring-white"),
                  offRoute(index) && "opacity-45",
                  animateLast && index === stops.length - 1 && styles.pop,
                )}
              >
                {stop.accuracy === null ? (
                  <GraduationCap className="size-3.5 text-[#15302f]" />
                ) : stop.rushed ? (
                  <Timer className="size-3.5 text-white" />
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-1 text-[11px] font-medium text-[#4a5a58] tabular-nums",
                  offRoute(index) && "opacity-60",
                )}
              >
                {stop.accuracy === null ? "class" : `${stop.accuracy}%`}
              </span>
            </div>
          </div>
        ))}
        <div
          className={cn(
            "mt-[11px] h-0 w-8 shrink-0 border-t-[3px] border-solid border-[#15302f]",
            stops.length === 0 && "hidden",
          )}
        />
        <StationBadge
          activity={activity}
          detail={detail}
          className="-mt-2 shrink-0"
        />
      </div>
    </div>
  );
}

/** A real student's sessions as stops. */
export function stopsFromSteps(steps: ReplayStep[]): Stop[] {
  return steps.map((s) => ({
    key: String(s.session.sessionId),
    accuracy:
      s.session.answered > 0
        ? Math.round((100 * s.session.correct) / s.session.answered)
        : null,
    title: `${fmtDate(s.session.at)} · ${MODE_LABEL[s.session.mode]} · ${s.session.correct}/${s.session.answered}`,
  }));
}

/* ------------------------------------------------------------------ */
/* Plain-language helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * "on objective 3", "on objectives 4, 5 and 6", "on all objectives" or "".
 * Telling the teacher is "about" an objective rather than "on" it.
 */
export function onWhat(targets: number[], rows: LoRow[], activity?: Activity) {
  const word = activity === "escalate" ? "about" : "on";
  if (targets.length === 0) return "";
  if (targets.length === rows.length) return `${word} all objectives`;
  const numbers = rows
    .map((row, index) => (targets.includes(row.id) ? index + 1 : null))
    .filter((n): n is number => n !== null);
  if (numbers.length === 1) return `${word} objective ${numbers[0]}`;
  return `${word} objectives ${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
}

/**
 * Since when the loop has been asking for this, and what the student actually
 * did from then on. For a person (class, teacher) it is the first time the loop
 * asked for one; otherwise the unbroken run of the same advice up to now.
 */
export function sinceAdvice(steps: ReplayStep[], decision: Decision) {
  let from = -1;
  if (PLAIN_STEP[decision.activity].human) {
    from = steps.findIndex((s) => PLAIN_STEP[s.prescribed.activity].human);
  } else {
    for (let i = steps.length - 1; i >= 0; i -= 1) {
      if (steps[i].prescribed.activity !== decision.activity) break;
      from = i;
    }
  }
  if (from < 0) return null;
  const after = steps.slice(from);
  const answered = after.reduce((n, s) => n + s.session.answered, 0);
  const correct = after.reduce((n, s) => n + s.session.correct, 0);
  return {
    from,
    since: steps[from].session.at,
    sessions: after.length,
    accuracy: answered > 0 ? Math.round((100 * correct) / answered) : null,
  };
}

export interface ReadAnswer {
  judgement: {
    reason: WrongReason | null;
    tooFast: number | null;
    realGap: number | null;
  } | null;
}

/** Jev's read of the recent mistakes, reduced to what a mentor needs. */
export function mentorNote(answers: ReadAnswer[]) {
  const judged = answers.flatMap((a) => (a.judgement ? [a.judgement] : []));
  const guesses = judged.filter(isGuess).length;
  const counts = new Map<WrongReason, number>();
  for (const j of judged)
    if (j.reason && j.reason !== "likely_guess")
      counts.set(j.reason, (counts.get(j.reason) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    read: judged.length,
    guesses,
    rushing: judged.length >= 6 && guesses / judged.length >= 0.6,
    top: top ? REASON_LABEL[top] : null,
  };
}

export function JevChip({
  answers,
  error,
}: {
  answers: ReadAnswer[] | null;
  error: string | null;
}) {
  if (error)
    return (
      <p className="text-sm text-[#8b9592]">The AI's read isn't available.</p>
    );
  if (!answers)
    return (
      <p className="text-sm text-[#8b9592]">The AI is reading the mistakes…</p>
    );
  const note = mentorNote(answers);
  if (note.read < 6)
    return (
      <p className="flex items-center gap-2 text-sm text-[#4a5a58]">
        <span className="rounded-full bg-[#ece8f6] px-2 py-0.5 text-xs font-semibold text-[#5b4a91]">
          AI
        </span>
        Only {note.read} mistakes to read. Nothing to flag.
      </p>
    );
  const share = note.guesses / note.read;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <span className="rounded-full bg-[#ece8f6] px-2 py-0.5 text-xs font-semibold text-[#5b4a91]">
        AI
      </span>
      <span
        className="flex h-2 w-28 overflow-hidden rounded-full bg-[#e6e1f3]"
        title={`${note.guesses} of ${note.read} mistakes answered too fast`}
      >
        <span
          className="bg-[#6d5bd0]"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
      <span
        className={cn(
          note.rushing ? "font-semibold text-[#5b4a91]" : "text-[#4a5a58]",
        )}
      >
        {note.guesses} of {note.read} mistakes answered too fast to be real
        attempts
      </span>
    </div>
  );
}
