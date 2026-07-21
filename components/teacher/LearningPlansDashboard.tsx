"use client";

import {
  CalendarRange,
  ChevronRight,
  ClipboardList,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { SyllabusShell } from "@/components/syllabus/SyllabusShell";
import { gradeLabel } from "@/components/teacher/format";
import {
  dateRangeLabel,
  PLAN_STATUS_TONES,
  planDateRange,
} from "@/components/teacher/plan-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LearningPlanSummary } from "@/lib/learning-plans";

function PlanCard({ plan }: { plan: LearningPlanSummary }) {
  const progress =
    plan.totalItems === 0
      ? 0
      : Math.round((plan.doneItems / plan.totalItems) * 100);
  return (
    <Link
      href={`/teacher/plans/${plan.id}`}
      className="group flex flex-col rounded-2xl border border-[#e5e1d9] bg-[#fffefa] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9cc9c1] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-[#263d3a] md:text-base">
            {plan.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.studentName} · {gradeLabel(plan.classLevel)}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={`rounded-full text-[10px] font-bold uppercase tracking-[0.08em] ${PLAN_STATUS_TONES[plan.status]}`}
        >
          {plan.status}
        </Badge>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarRange className="size-3.5" />
        {plan.endDate
          ? dateRangeLabel(plan.startDate, plan.endDate)
          : planDateRange(plan.startDate, plan.durationWeeks)}
        <span className="text-[#c4c0b8]">·</span>
        {plan.totalItems} session{plan.totalItems === 1 ? "" : "s"}
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {plan.doneItems} of {plan.totalItems} sessions done
          </span>
          <span className="font-mono font-bold text-[#304744]">
            {progress}%
          </span>
        </div>
        <Progress
          value={progress}
          className="h-1.5 bg-[#e8e5de] [&_[data-slot=progress-indicator]]:bg-[#2ec4b6]"
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-1 border-t border-black/5 pt-3 text-xs font-bold text-[#25877c]">
        Open plan
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function LearningPlansDashboard({
  plans,
}: {
  plans: LearningPlanSummary[];
}) {
  return (
    <SyllabusShell breadcrumb="Learning plans">
      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
        <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#25877c]">
              <ClipboardList /> Learning plans
            </div>
            <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-[#1c3c39] md:text-4xl">
              Weekly plans built from real progress.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Each plan turns a student&apos;s diagnostic evidence into a 1–2
              week sequence of teach, practice and review sessions.
            </p>
          </div>
          <Button
            render={<Link href="/teacher/plans/new" />}
            className="h-11 self-start rounded-xl bg-[#1f5855] px-5 text-white hover:bg-[#194745] xl:self-auto"
          >
            <WandSparkles className="size-4" /> New plan
          </Button>
        </section>

        {plans.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#d9d5cc] bg-[#fffdfa]/70 px-6 py-16 text-center">
            <ClipboardList className="mx-auto mb-4 text-[#7ca49f]" />
            <h3 className="font-bold text-[#2a413e]">No plans yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the first learning plan — pick a student, choose the class
              dates, and the sessions are drafted from their progress.
            </p>
            <Button
              render={<Link href="/teacher/plans/new" />}
              className="mt-5 rounded-xl bg-[#1f5855] text-white hover:bg-[#194745]"
            >
              <WandSparkles className="size-4" /> Create learning plan
            </Button>
          </div>
        )}
      </main>
    </SyllabusShell>
  );
}
