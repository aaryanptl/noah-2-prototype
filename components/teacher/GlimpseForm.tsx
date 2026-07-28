"use client";

// The post-class form. Two steps, per the spec:
//   1. what happened in the class that just finished
//   2. what that does to the plan, with a chance to edit before committing
//
// Both steps submit together — nothing is written until the mentor confirms on
// step 2 — so the plan can't end up half-updated if they abandon the form.

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SyllabusShell } from "@/components/syllabus/SyllabusShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlanReport } from "@/lib/plan-report";

interface CoveredState {
  topicId: string;
  covered: boolean;
  activitiesDone: string;
  masteryScore: string;
  completed: boolean;
}

/** Preview of what the update will do, computed client-side before submitting. */
function previewFor(
  topic: PlanReport["topics"][number],
  entry: CoveredState,
): string | null {
  if (!entry.covered) return null;
  if (entry.completed)
    return "Marked complete — removed from the remaining plan.";

  const classesDone = topic.classesDone + 1;
  const left = Math.max(0, topic.plannedClasses - classesDone);
  const mastery = Number(entry.masteryScore);

  if (Number.isFinite(mastery) && entry.masteryScore.trim()) {
    if (mastery >= 80 && classesDone < topic.plannedClasses * 0.75) {
      return `${classesDone} of ${topic.plannedClasses} classes done at ${mastery}% — the plan may cut the remaining classes tonight.`;
    }
    if (mastery < 40 && left < 2) {
      return `${classesDone} of ${topic.plannedClasses} classes done at ${mastery}% — the plan may add up to 2 classes tonight.`;
    }
  }
  return `${classesDone} of ${topic.plannedClasses} classes done, ${left} left.`;
}

export function GlimpseForm({ report }: { report: PlanReport }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeTopics = useMemo(
    () =>
      report.topics.filter(
        (t) => t.status === "planned" || t.status === "in_progress",
      ),
    [report.topics],
  );

  const [entries, setEntries] = useState<Record<string, CoveredState>>(() =>
    Object.fromEntries(
      activeTopics
        .filter((t) => t.topicId)
        .map((t) => [
          t.topicId as string,
          {
            topicId: t.topicId as string,
            covered: false,
            activitiesDone: "",
            masteryScore: "",
            completed: false,
          },
        ]),
    ),
  );

  const patch = (topicId: string, next: Partial<CoveredState>) =>
    setEntries((current) => ({
      ...current,
      [topicId]: { ...current[topicId], ...next },
    }));

  const covered = Object.values(entries).filter((e) => e.covered);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/teacher/plans/${report.planId}/updates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "class",
            actor: "mentor",
            classesConsumed: 1,
            topicsCovered: covered.map((e) => ({
              topicId: e.topicId,
              activitiesDone: Number(e.activitiesDone) || 0,
              masteryScore: e.masteryScore.trim()
                ? Number(e.masteryScore)
                : undefined,
            })),
            completedTopicIds: covered
              .filter((e) => e.completed)
              .map((e) => e.topicId),
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save.");
      if (!payload.applied) {
        setError(payload.blockedReason ?? "Nothing changed.");
        return;
      }
      setNotice("Class saved and the plan updated.");
      router.push(`/teacher/plans/${report.planId}/report`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SyllabusShell breadcrumb={`Glimpse · ${report.studentName}`}>
      <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8">
        <Link
          href={`/teacher/plans/${report.planId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f7169] hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to plan
        </Link>

        <h1 className="text-2xl font-bold text-[#22403c]">
          Class glimpse — {report.studentName}
        </h1>
        <p className="mt-1 text-sm text-[#5c6b69]">
          {step === 1
            ? "Step 1 of 2 — what did you cover in the class that just finished?"
            : "Step 2 of 2 — check what this does to the plan, then save."}
        </p>

        <div className="mt-4 flex gap-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                step >= n ? "bg-[#1f7169]" : "bg-[#e0ddd5]"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#fde8e4] px-4 py-3 text-sm font-semibold text-[#bd503e]">
            <Info className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded-xl bg-[#dcefeb] px-4 py-3 text-sm font-semibold text-[#1f7169]">
            {notice}
          </p>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-3">
            {activeTopics.length === 0 && (
              <p className="rounded-2xl border border-[#e8e4dc] bg-white p-6 text-sm text-[#5c6b69]">
                This plan has no active topics left.
              </p>
            )}
            {activeTopics.map((topic) => {
              const entry = topic.topicId ? entries[topic.topicId] : undefined;
              if (!topic.topicId || !entry) return null;
              return (
                <div
                  key={topic.topicId}
                  className={`rounded-2xl border p-4 transition ${
                    entry.covered
                      ? "border-[#cbe5df] bg-[#f3faf8]"
                      : "border-[#e8e4dc] bg-white"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={entry.covered}
                      onChange={(e) =>
                        patch(topic.topicId as string, {
                          covered: e.target.checked,
                        })
                      }
                      className="mt-1 size-4 accent-[#1f7169]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[#22403c]">
                        {topic.topicName}
                      </span>
                      <span className="text-xs text-[#5c6b69]">
                        {topic.classesDone}/{topic.plannedClasses} classes ·{" "}
                        {topic.activitiesDone}/{topic.plannedActivities}{" "}
                        activities
                      </span>
                    </span>
                  </label>

                  {entry.covered && (
                    <div className="mt-3 grid gap-3 border-t border-[#dcece8] pt-3 sm:grid-cols-3">
                      <div className="text-xs font-semibold text-[#3f5c58]">
                        <label htmlFor={`activities-${topic.topicId}`}>
                          Activities done
                        </label>
                        <Input
                          id={`activities-${topic.topicId}`}
                          type="number"
                          min={0}
                          value={entry.activitiesDone}
                          onChange={(e) =>
                            patch(topic.topicId as string, {
                              activitiesDone: e.target.value,
                            })
                          }
                          className="mt-1"
                          placeholder="0"
                        />
                      </div>
                      <div className="text-xs font-semibold text-[#3f5c58]">
                        <label htmlFor={`mastery-${topic.topicId}`}>
                          Mastery %
                        </label>
                        <Input
                          id={`mastery-${topic.topicId}`}
                          type="number"
                          min={0}
                          max={100}
                          value={entry.masteryScore}
                          onChange={(e) =>
                            patch(topic.topicId as string, {
                              masteryScore: e.target.value,
                            })
                          }
                          className="mt-1"
                          placeholder="e.g. 65"
                        />
                      </div>
                      <label className="flex items-end gap-2 text-xs font-semibold text-[#3f5c58]">
                        <input
                          type="checkbox"
                          checked={entry.completed}
                          onChange={(e) =>
                            patch(topic.topicId as string, {
                              completed: e.target.checked,
                            })
                          }
                          className="mb-2.5 size-4 accent-[#1f7169]"
                        />
                        <span className="mb-2">Topic complete</span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={covered.length === 0}
                className="gap-1.5"
              >
                Next — manage the plan <ArrowRight className="size-4" />
              </Button>
            </div>
            {covered.length === 0 && activeTopics.length > 0 && (
              <p className="text-right text-xs text-[#8a8a82]">
                Tick at least one topic covered in this class.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#e8e4dc] bg-white p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#1f7169]">
                What this class does to the plan
              </h2>
              <ul className="space-y-2.5">
                {covered.map((entry) => {
                  const topic = activeTopics.find(
                    (t) => t.topicId === entry.topicId,
                  );
                  if (!topic) return null;
                  return (
                    <li
                      key={entry.topicId}
                      className="border-b border-[#f0ede7] pb-2.5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-[#1f7169]" />
                        <span className="font-semibold text-[#22403c]">
                          {topic.topicName}
                        </span>
                        {entry.completed && (
                          <Badge className="bg-[#dcefeb] text-[#1f7169]">
                            Complete
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 pl-6 text-sm text-[#5c6b69]">
                        {previewFor(topic, entry)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {report.classesRemaining !== null && (
                <p className="mt-4 border-t border-[#f0ede7] pt-3 text-xs text-[#5c6b69]">
                  Classes remaining in the package: {report.classesRemaining} →{" "}
                  {Math.max(0, report.classesRemaining - 1)}
                </p>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-[#f2f8f6] px-4 py-3 text-xs leading-5 text-[#3f5c58]">
              <Info className="mt-0.5 size-4 shrink-0" />
              Saving records this class against the plan. To change the class or
              activity numbers yourself, edit the plan from the progress report
              — a manual edit pauses the nightly automatic adjustment until the
              next class.
            </p>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button onClick={submit} disabled={saving} className="gap-1.5">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save class and update plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </SyllabusShell>
  );
}
