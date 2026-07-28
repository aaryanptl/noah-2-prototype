"use client";

import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Dumbbell,
  Lightbulb,
  Loader2,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SyllabusShell, titleCase } from "@/components/syllabus/SyllabusShell";
import { gradeLabel } from "@/components/teacher/format";
import {
  dateRangeLabel,
  FOCUS_LABELS,
  FOCUS_TONES,
  formatSessionDate,
  PLAN_STATUS_TONES,
  planDateRange,
  sessionDateLabel,
} from "@/components/teacher/plan-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  LearningPlanDetail,
  LearningPlanItem,
  PlanStatus,
} from "@/lib/learning-plans";
import { parseActivity } from "@/lib/plan-activity";

function SessionRow({
  plan,
  item,
  dayIndex,
  onToggled,
}: {
  plan: LearningPlanDetail;
  item: LearningPlanItem;
  dayIndex: number;
  onToggled: () => void;
}) {
  const [pending, setPending] = useState(false);
  const done = item.status === "done";

  const toggle = async () => {
    setPending(true);
    try {
      const response = await fetch(
        `/api/teacher/plans/${plan.id}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: done ? "pending" : "done" }),
        },
      );
      if (response.ok) onToggled();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={`flex gap-4 rounded-2xl border p-4 transition ${
        done ? "border-[#cbe5df] bg-[#f3faf8]" : "border-[#e8e4dc] bg-white"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={done ? "Mark session as pending" : "Mark session as done"}
        className="mt-0.5 shrink-0 text-[#1f7169] transition hover:scale-105 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-6 animate-spin" />
        ) : done ? (
          <CheckCircle2 className="size-6" />
        ) : (
          <Circle className="size-6 text-[#c4c0b8] hover:text-[#1f7169]" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-[#5c6b69]">
            {item.sessionDate
              ? formatSessionDate(item.sessionDate)
              : sessionDateLabel(plan.startDate, item.week, dayIndex)}
          </span>
          <Badge
            variant="secondary"
            className={`rounded-full text-[10px] font-bold ${FOCUS_TONES[item.focus]}`}
          >
            {FOCUS_LABELS[item.focus] ?? titleCase(item.focus)}
          </Badge>
          {item.baselineScore != null && (
            <span className="font-mono text-[11px] text-muted-foreground">
              baseline {item.baselineScore}%
            </span>
          )}
        </div>
        <h4
          className={`mt-1.5 text-sm font-extrabold ${
            done
              ? "text-[#4d6b66] line-through decoration-[#9cc9c1]"
              : "text-[#263d3a]"
          }`}
        >
          {item.topic}
        </h4>
        {item.learningObjective && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Objective: {item.learningObjective}
          </p>
        )}
        <SessionContentView activity={item.activity} />
      </div>
    </div>
  );
}

/** Renders the stored activity text back out as goal / bullets / practice. */
function SessionContentView({ activity }: { activity: string }) {
  const content = parseActivity(activity);
  return (
    <div className="mt-2 space-y-3">
      {content.goal && (
        <p className="text-sm leading-6 text-[#304744]">{content.goal}</p>
      )}
      {content.teachingPoints.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#25877c]">
            <Lightbulb className="size-3.5" /> What to teach
          </div>
          <ul className="space-y-1.5">
            {content.teachingPoints.map((point) => (
              <li
                // Teaching points have no id; the text itself is distinct.
                key={point}
                className="flex gap-2.5 text-sm leading-6 text-[#566b68]"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2ec4b6]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {content.practice && (
          <div className="rounded-xl bg-[#faf8f4] p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ad6a13]">
              <Dumbbell className="size-3.5" /> Practice
            </div>
            <p className="text-sm leading-6 text-[#566b68]">
              {content.practice}
            </p>
          </div>
        )}
        {content.successCriteria && (
          <div className="rounded-xl bg-[#f2f8f6] p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1f7169]">
              <ClipboardCheck className="size-3.5" /> Success looks like
            </div>
            <p className="text-sm leading-6 text-[#566b68]">
              {content.successCriteria}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanDetail({ plan }: { plan: LearningPlanDetail }) {
  const router = useRouter();
  const [statusPending, setStatusPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const doneCount = plan.items.filter((item) => item.status === "done").length;
  const progress =
    plan.items.length === 0
      ? 0
      : Math.round((doneCount / plan.items.length) * 100);

  const setStatus = async (status: PlanStatus) => {
    setStatusPending(true);
    try {
      const response = await fetch(`/api/teacher/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) router.refresh();
    } finally {
      setStatusPending(false);
    }
  };

  const deletePlan = async () => {
    if (
      !window.confirm(
        `Delete "${plan.title}" for ${plan.student.displayName}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletePending(true);
    try {
      const response = await fetch(`/api/teacher/plans/${plan.id}`, {
        method: "DELETE",
      });
      if (response.ok) router.push("/teacher/plans");
    } finally {
      setDeletePending(false);
    }
  };

  // Group sessions by their stored week bucket; ranges come from the actual
  // session dates.
  const weekGroups = new Map<number, typeof plan.items>();
  for (const item of plan.items) {
    const list = weekGroups.get(item.week) ?? [];
    list.push(item);
    weekGroups.set(item.week, list);
  }
  const weeks = Array.from(weekGroups.entries()).sort(([a], [b]) => a - b);

  const sessionDates = plan.items
    .map((item) => item.sessionDate)
    .filter((date): date is string => date != null)
    .sort();
  const headerRange =
    sessionDates.length > 0
      ? dateRangeLabel(sessionDates[0], sessionDates[sessionDates.length - 1])
      : planDateRange(plan.startDate, plan.durationWeeks);

  return (
    <SyllabusShell breadcrumb="Learning plans">
      <main className="mx-auto w-full max-w-[960px] px-5 py-8 md:px-8 md:py-10">
        <Link
          href="/teacher/plans"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-[#1f5855]"
        >
          <ArrowLeft className="size-4" /> All learning plans
        </Link>

        <section className="mb-8 rounded-3xl border border-[#e5e1d9] bg-[#fffefa] p-6 shadow-[0_8px_30px_rgba(31,55,53,0.05)] md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="min-w-0">
              <Badge
                variant="secondary"
                className={`mb-3 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] ${PLAN_STATUS_TONES[plan.status]}`}
              >
                {plan.status}
              </Badge>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-[#1c3c39] md:text-3xl">
                {plan.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <Link
                  href={`/teacher/students/${plan.student.id}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#1f7169] hover:underline"
                >
                  <User className="size-4" />
                  {plan.student.displayName}
                </Link>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange className="size-4" />
                  {headerRange}
                </span>
                <span>{gradeLabel(plan.student.classLevel)}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/teacher/plans/${plan.id}/glimpse`}>
                <Button type="button" variant="outline" className="rounded-xl">
                  <ClipboardCheck className="size-4" /> Log a class
                </Button>
              </Link>
              <Link href={`/teacher/plans/${plan.id}/report`}>
                <Button type="button" variant="outline" className="rounded-xl">
                  <CalendarRange className="size-4" /> Progress report
                </Button>
              </Link>
              {plan.status !== "completed" ? (
                <Button
                  type="button"
                  disabled={statusPending}
                  onClick={() => setStatus("completed")}
                  className="rounded-xl bg-[#1f5855] text-white hover:bg-[#194745]"
                >
                  {statusPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Mark completed
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={statusPending}
                  onClick={() => setStatus("active")}
                  className="rounded-xl"
                >
                  Reopen plan
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={deletePending}
                onClick={deletePlan}
                aria-label="Delete plan"
                className="rounded-xl text-muted-foreground hover:text-[#bd503e]"
              >
                {deletePending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {doneCount} of {plan.items.length} sessions done
              </span>
              <span className="font-mono font-bold text-[#304744]">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-[#e8e5de] [&_[data-slot=progress-indicator]]:bg-[#2ec4b6]"
            />
          </div>
          {plan.notes && (
            <p className="mt-5 flex gap-2 rounded-xl bg-[#f5f0e8] px-4 py-3 text-sm leading-6 text-[#566b68]">
              <StickyNote className="mt-1 size-4 shrink-0 text-[#ad6a13]" />
              {plan.notes}
            </p>
          )}
        </section>

        {weeks.map(([week, weekItems]) => {
          const weekDates = weekItems
            .map((item) => item.sessionDate)
            .filter((date): date is string => date != null);
          return (
            <section key={week} className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-[-0.02em] text-[#263d3a]">
                <CalendarDays className="size-5 text-[#25877c]" />
                Week {week}
                {weekDates.length > 0 && (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {dateRangeLabel(
                      weekDates[0],
                      weekDates[weekDates.length - 1],
                    )}
                  </span>
                )}
              </h2>
              <div className="space-y-3">
                {weekItems.map((item, dayIndex) => (
                  <SessionRow
                    key={item.id}
                    plan={plan}
                    item={item}
                    dayIndex={dayIndex}
                    onToggled={() => router.refresh()}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </SyllabusShell>
  );
}
