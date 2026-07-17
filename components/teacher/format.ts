export const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#2ec4b6",
  maths: "#2ec4b6",
  math: "#2ec4b6",
  english: "#f8bf4b",
};

export const FALLBACK_COLORS = ["#f47a62", "#8b5cf6", "#5aa9e6"];

export function subjectColor(subject: string, index: number): string {
  return (
    SUBJECT_COLORS[subject.toLowerCase()] ??
    FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  );
}

export function scoreColor(score: number): string {
  if (score >= 75) return "#1f7169";
  if (score >= 50) return "#b7791f";
  return "#c53030";
}

export function scoreBarColor(score: number): string {
  if (score >= 75) return "#2ec4b6";
  if (score >= 50) return "#f8bf4b";
  return "#f47a62";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function gradeLabel(classLevel: string): string {
  if (!classLevel) return "—";
  return classLevel.toLowerCase() === "kg" ? "KG" : `Grade ${classLevel}`;
}

export function formatSeconds(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
});

const dateYearFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return dateFormatter.format(new Date(iso));
}

export function formatDateWithYear(iso: string | null): string {
  if (!iso) return "—";
  return dateYearFormatter.format(new Date(iso));
}
