import type { PlanFocus, PlanStatus } from "@/lib/learning-plans";

export const FOCUS_LABELS: Record<PlanFocus, string> = {
  teach: "Teach",
  practice: "Practice",
  review: "Review",
  assess: "Check-in",
};

export const FOCUS_TONES: Record<PlanFocus, string> = {
  teach: "bg-[#fde8e4] text-[#bd503e]",
  practice: "bg-[#fff0dc] text-[#ad6a13]",
  review: "bg-[#dcefeb] text-[#1f7169]",
  assess: "bg-[#ece8fb] text-[#6f55c7]",
};

export const PLAN_STATUS_TONES: Record<PlanStatus, string> = {
  draft: "bg-[#f4f1eb] text-[#5c6b69]",
  active: "bg-[#dcefeb] text-[#1f7169]",
  completed: "bg-[#ece8fb] text-[#6f55c7]",
  archived: "bg-[#efece6] text-[#8a8a82]",
};

export const MASTERY_TONES: Record<string, string> = {
  not_started: "bg-[#fde8e4] text-[#bd503e]",
  emerging: "bg-[#fde8e4] text-[#bd503e]",
  developing: "bg-[#fff0dc] text-[#ad6a13]",
  secure: "bg-[#dcefeb] text-[#1f7169]",
  mastered: "bg-[#dcefeb] text-[#1f7169]",
  advanced: "bg-[#ece8fb] text-[#6f55c7]",
};

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const rangeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

export function sessionDateLabel(
  startDate: string,
  week: number,
  dayIndex: number,
): string {
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return `Day ${dayIndex + 1}`;
  date.setDate(date.getDate() + (week - 1) * 7 + dayIndex);
  return dayFormatter.format(date);
}

export function planDateRange(
  startDate: string,
  durationWeeks: number,
): string {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return startDate;
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7 - 1);
  return `${rangeFormatter.format(start)} – ${rangeFormatter.format(end)}`;
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "Mon, 27 Jul" for a YYYY-MM-DD string. */
export function formatSessionDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return dayFormatter.format(parsed);
}

/** "21 Jul – 1 Aug" from two YYYY-MM-DD strings. */
export function dateRangeLabel(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }
  if (start === end) return rangeFormatter.format(startDate);
  return `${rangeFormatter.format(startDate)} – ${rangeFormatter.format(endDate)}`;
}

/** The next Monday–Friday as YYYY-MM-DD strings (default builder selection). */
export function nextWeekdays(): string[] {
  const monday = new Date();
  const offset = (8 - monday.getDay()) % 7 || 7;
  monday.setDate(monday.getDate() + offset);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateString(date);
  });
}
