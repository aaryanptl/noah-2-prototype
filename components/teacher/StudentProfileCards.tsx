"use client";

import {
  CalendarClock,
  Check,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { titleCase } from "@/components/syllabus/SyllabusShell";
import { gradeLabel, initials, scoreColor } from "@/components/teacher/format";
import { MASTERY_TONES } from "@/components/teacher/plan-format";
import { Badge } from "@/components/ui/badge";
import type { DemoStudentProfile } from "@/lib/demo-students";

const TREND_META = {
  up: { icon: TrendingUp, tone: "text-[#1f7169]", label: "Improving" },
  flat: { icon: Minus, tone: "text-[#ad6a13]", label: "Plateaued" },
  down: { icon: TrendingDown, tone: "text-[#bd503e]", label: "Slipping" },
} as const;

function lastActiveLabel(daysAgo: number): string {
  if (daysAgo === 0) return "Active today";
  if (daysAgo === 1) return "Active yesterday";
  return `Active ${daysAgo}d ago`;
}

/** Card contents, shared by the selectable and the link-out variants. */
function ProfileCardBody({ student }: { student: DemoStudentProfile }) {
  const trend = TREND_META[student.trend];
  const TrendIcon = trend.icon;
  const topGap = student.weakAreas[0];

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#1f5855] font-mono text-sm font-bold text-white">
          {initials(student.displayName)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-extrabold tracking-[-0.02em] text-[#1c3c39]">
            {student.displayName}
          </div>
          <div className="text-xs text-muted-foreground">
            {gradeLabel(student.classLevel)} · {student.subject}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#f4f1eb] px-2 py-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Avg
          </div>
          <div
            className="font-mono text-sm font-bold"
            style={{ color: scoreColor(student.avgScore) }}
          >
            {student.avgScore}%
          </div>
        </div>
        <div className="rounded-lg bg-[#f4f1eb] px-2 py-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Tests
          </div>
          <div className="font-mono text-sm font-bold text-[#1f5855]">
            {student.testsTaken}
          </div>
        </div>
        <div className="rounded-lg bg-[#f4f1eb] px-2 py-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Attend
          </div>
          <div className="font-mono text-sm font-bold text-[#1f5855]">
            {student.attendance}%
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold">
        <span className={`flex items-center gap-1 ${trend.tone}`}>
          <TrendIcon className="size-3.5" /> {trend.label}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <CalendarClock className="size-3.5" />
          {lastActiveLabel(student.lastActiveDaysAgo)}
        </span>
      </div>

      {topGap && (
        <div className="mt-3 border-t border-[#eeeae2] pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Biggest gap
            </span>
            <Badge
              variant="secondary"
              className={`rounded-full text-[9px] font-bold uppercase ${MASTERY_TONES[topGap.masteryState] ?? "bg-[#f4f1eb] text-[#5c6b69]"}`}
            >
              {titleCase(topGap.masteryState)} · {topGap.score}%
            </Badge>
          </div>
          <p className="text-xs leading-5 text-[#455855]">
            <strong className="font-bold">{topGap.topic}</strong> —{" "}
            {topGap.learningObjective}
          </p>
        </div>
      )}
    </>
  );
}

/** Selectable cards — used as step 1 of the plan builder. */
export function StudentProfileCards({
  students,
  selectedId,
  onSelect,
}: {
  students: DemoStudentProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {students.map((student) => {
        const selected = student.id === selectedId;
        return (
          <button
            key={student.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(student.id)}
            className={`relative rounded-2xl border p-5 text-left shadow-sm transition ${
              selected
                ? "border-[#1f5855] bg-[#f2f8f6] ring-2 ring-[#1f5855]/20"
                : "border-[#e5e1d9] bg-[#fffefa] hover:border-[#9cc9c1] hover:shadow-md"
            }`}
          >
            {selected && (
              <span className="absolute right-4 top-4 grid size-5 place-items-center rounded-full bg-[#1f5855] text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
            <ProfileCardBody student={student} />
          </button>
        );
      })}
    </div>
  );
}
