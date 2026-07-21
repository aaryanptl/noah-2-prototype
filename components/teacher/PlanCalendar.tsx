"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toDateString } from "@/components/teacher/plan-format";
import { cn } from "@/lib/utils";

const WEEKDAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

/**
 * Small multi-select month calendar: the teacher taps the dates the plan's
 * sessions should run on. Past dates are disabled.
 */
export function PlanCalendar({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = toDateString(today);

  const anchor = selected.length > 0 ? `${selected[0]}T00:00:00` : today;
  const [viewMonth, setViewMonth] = useState(() => {
    const date = new Date(anchor);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const canGoBack =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() > today.getMonth());

  const shiftMonth = (delta: number) => {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  // getDay(): 0=Sun … 6=Sat → Monday-first column index.
  const leadingBlanks = (viewMonth.getDay() + 6) % 7;

  const toggle = (dateString: string) => {
    const next = selected.includes(dateString)
      ? selected.filter((value) => value !== dateString)
      : [...selected, dateString].sort();
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="grid size-8 place-items-center rounded-lg border border-[#e4e0d8] bg-white text-muted-foreground transition hover:bg-[#f3f1ea] hover:text-[#1f5855] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-sm font-extrabold text-[#263d3a]">
          {monthFormatter.format(viewMonth)}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-lg border border-[#e4e0d8] bg-white text-muted-foreground transition hover:bg-[#f3f1ea] hover:text-[#1f5855]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {leadingBlanks > 0 && (
          <div style={{ gridColumn: `span ${leadingBlanks}` }} />
        )}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dateString = toDateString(
            new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day),
          );
          const isPast = dateString < todayString;
          const isSelected = selected.includes(dateString);
          const isToday = dateString === todayString;
          return (
            <button
              key={dateString}
              type="button"
              disabled={isPast}
              onClick={() => toggle(dateString)}
              aria-pressed={isSelected}
              aria-label={dateString}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-xs font-semibold transition",
                isPast && "text-[#c4c0b8]",
                !isPast &&
                  !isSelected &&
                  "text-[#455855] hover:bg-[#e8f3f1] hover:text-[#1f5855]",
                isSelected &&
                  "bg-[#1f5855] text-white shadow-sm hover:bg-[#194745]",
                isToday && !isSelected && "ring-1 ring-[#2ec4b6]",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
