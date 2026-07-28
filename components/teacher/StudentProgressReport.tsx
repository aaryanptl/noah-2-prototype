"use client";

// The student progress report. Two plan sections per the spec:
//   - the next two weeks, described session by session
//   - the longer arc, only when there is enough runway to be worth drawing
//
// The edit flow is inline rather than a separate page: every class and activity
// number is editable here, and saving sends one "manual" update. That is also
// why the banner about pausing automatic updates sits next to the editor — the
// consequence belongs where the action is.

import {
  ArrowLeft,
  CalendarRange,
  ClipboardCheck,
  Info,
  Loader2,
  Pencil,
  Save,
  Telescope,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SyllabusShell } from "@/components/syllabus/SyllabusShell";
import {
  FOCUS_LABELS,
  FOCUS_TONES,
  formatSessionDate,
} from "@/components/teacher/plan-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlanReport } from "@/lib/plan-report";

function TopicEditor({
  report,
  onDone,
}: {
  report: PlanReport;
  onDone: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = report.topics.filter(
    (t) => t.status === "planned" || t.status === "in_progress",
  );

  const [draft, setDraft] = useState(() =>
    Object.fromEntries(
      active
        .filter((t) => t.topicId)
        .map((t) => [
          t.topicId as string,
          {
            classes: String(t.plannedClasses),
            activities: String(t.plannedActivities),
            removed: false,
          },
        ]),
    ),
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const setClasses = active
        .filter((t) => t.topicId && !draft[t.topicId].removed)
        .map((t) => ({
          topicId: t.topicId as string,
          classes: Number(draft[t.topicId as string].classes),
        }))
        .filter((t) => Number.isFinite(t.classes) && t.classes >= 1);

      const setActivities = active
        .filter((t) => t.topicId && !draft[t.topicId].removed)
        .map((t) => ({
          topicId: t.topicId as string,
          activities: Number(draft[t.topicId as string].activities),
        }))
        .filter((t) => Number.isFinite(t.activities) && t.activities >= 0);

      const removeTopicIds = active
        .filter((t) => t.topicId && draft[t.topicId].removed)
        .map((t) => t.topicId as string);

      const response = await fetch(
        `/api/teacher/plans/${report.planId}/updates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "manual",
            actor: "mentor",
            setClasses,
            setActivities,
            removeTopicIds,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save.");
      if (!payload.applied) {
        setError(payload.blockedReason ?? "Nothing changed.");
        return;
      }
      onDone();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#cfe4de] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#1f7169]">
          Editing the plan
        </h2>
        <Button variant="ghost" size="sm" onClick={onDone} className="gap-1.5">
          <X className="size-4" /> Cancel
        </Button>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-[#fde8e4] px-4 py-3 text-sm font-semibold text-[#bd503e]">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {active.map((topic) => {
          if (!topic.topicId) return null;
          const entry = draft[topic.topicId];
          return (
            <div
              key={topic.topicId}
              className={`grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto_auto] ${
                entry.removed
                  ? "border-[#f0d8d2] bg-[#fdf4f2] opacity-60"
                  : "border-[#eae7e0] bg-white"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-[#22403c]">
                  {topic.topicName}
                </div>
                <div className="text-xs text-[#5c6b69]">
                  {topic.classesDone} class(es) already taught
                </div>
              </div>
              <div className="text-xs font-semibold text-[#3f5c58]">
                <label htmlFor={`classes-${topic.topicId}`}>Classes</label>
                <Input
                  id={`classes-${topic.topicId}`}
                  type="number"
                  min={1}
                  value={entry.classes}
                  disabled={entry.removed}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [topic.topicId as string]: {
                        ...d[topic.topicId as string],
                        classes: e.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-20"
                />
              </div>
              <div className="text-xs font-semibold text-[#3f5c58]">
                <label htmlFor={`activities-${topic.topicId}`}>
                  Activities
                </label>
                <Input
                  id={`activities-${topic.topicId}`}
                  type="number"
                  min={0}
                  value={entry.activities}
                  disabled={entry.removed}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [topic.topicId as string]: {
                        ...d[topic.topicId as string],
                        activities: e.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-20"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    [topic.topicId as string]: {
                      ...d[topic.topicId as string],
                      removed: !d[topic.topicId as string].removed,
                    },
                  }))
                }
                className="text-xs"
              >
                {entry.removed ? "Keep" : "Remove"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff0dc] px-4 py-3 text-xs leading-5 text-[#ad6a13]">
        <Info className="mt-0.5 size-4 shrink-0" />
        Saving a manual edit pauses the nightly automatic adjustment for this
        plan until the next class is recorded.
      </p>

      <div className="mt-3 flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-1.5">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}

export function StudentProgressReport({ report }: { report: PlanReport }) {
  const [editing, setEditing] = useState(false);

  return (
    <SyllabusShell breadcrumb={`Progress · ${report.studentName}`}>
      <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8">
        <Link
          href={`/teacher/plans/${report.planId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f7169] hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to plan
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#22403c]">
              {report.studentName}
            </h1>
            <p className="mt-1 text-sm text-[#5c6b69]">
              {report.title}
              {report.classesRemaining !== null &&
                ` · ${report.classesRemaining} class(es) remaining`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/teacher/plans/${report.planId}/guide`}>
              <Button variant="outline" className="gap-1.5">
                <Telescope className="size-4" /> Mentor guide
              </Button>
            </Link>
            {!editing && (
              <Button onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="size-4" /> Edit plan
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-6">
            <TopicEditor report={report} onDone={() => setEditing(false)} />
          </div>
        )}

        {report.testsDue.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[#e6d5b8] bg-[#fff8ed] p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#ad6a13]">
              <ClipboardCheck className="size-3.5" /> Check-in coming up
            </div>
            <p className="text-sm leading-6 text-[#5c4a2e]">
              {report.testsDue.map((t) => t.topicName).join(", ")} — fewer than
              two classes left, so we will take a short test on{" "}
              {report.testsDue.length === 1 ? "this topic" : "these topics"} in
              the next two weeks.
            </p>
          </div>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1f7169]">
            <CalendarRange className="size-3.5" /> The next two weeks
          </div>
          {report.nextTwoWeeks.length === 0 ? (
            <p className="rounded-2xl border border-[#e8e4dc] bg-white p-6 text-sm text-[#5c6b69]">
              No sessions scheduled in the next two weeks.
            </p>
          ) : (
            <div className="space-y-3">
              {report.nextTwoWeeks.map((session) => (
                <div
                  key={session.itemId}
                  className="rounded-2xl border border-[#e8e4dc] bg-white p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#5c6b69]">
                      {formatSessionDate(session.sessionDate)}
                    </span>
                    <Badge className={FOCUS_TONES[session.focus]}>
                      {FOCUS_LABELS[session.focus]}
                    </Badge>
                    <span className="font-semibold text-[#22403c]">
                      {session.topic}
                    </span>
                  </div>
                  {session.learningObjective && (
                    <p className="mt-1.5 text-sm text-[#3f5c58]">
                      {session.learningObjective}
                    </p>
                  )}
                  {session.content.goal && (
                    <p className="mt-2 text-sm leading-6 text-[#5c6b69]">
                      {session.content.goal}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {report.showFuturePlan && (
          <section className="mt-8">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1f7169]">
              <Telescope className="size-3.5" /> After that
            </div>
            <div className="rounded-2xl border border-[#e8e4dc] bg-white p-5">
              <ul className="space-y-2">
                {report.futurePlan.map((topic) => (
                  <li
                    key={topic.topicName}
                    className="flex items-baseline justify-between gap-3 border-b border-[#f0ede7] pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-semibold text-[#22403c]">
                      {topic.topicName}
                    </span>
                    <span className="shrink-0 text-xs text-[#5c6b69]">
                      {topic.plannedClasses} class(es) ·{" "}
                      {topic.plannedActivities} activities
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </SyllabusShell>
  );
}
