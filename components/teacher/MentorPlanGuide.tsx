"use client";

// The mentor's detailed plan viewer.
//
// Built on the questions guideline: for every objective the plan touches, the
// starter question (the floor) and the master question (the ceiling). Read
// together with the topic's mastery score, this is what tells a mentor which
// question types the student cannot yet handle and what the next classes have
// to fix — which is the whole point of the surface per the spec.

import { ArrowLeft, ArrowUpRight, Flag, Target } from "lucide-react";
import Link from "next/link";
import { SyllabusShell } from "@/components/syllabus/SyllabusShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PlanReport, TopicGuideline } from "@/lib/plan-report";

/**
 * How to read a topic's mastery against its question range. Deliberately blunt
 * — the mentor needs a call to action, not a percentage.
 */
function masteryVerdict(topic: TopicGuideline): {
  label: string;
  tone: string;
  advice: string;
} {
  const score = topic.masteryScore;
  if (score === null) {
    return {
      label: "No data yet",
      tone: "bg-[#f4f1eb] text-[#5c6b69]",
      advice:
        "No mastery reading recorded. Use the starter question in the next class to place them.",
    };
  }
  if (score < 40) {
    return {
      label: `Struggling · ${Math.round(score)}%`,
      tone: "bg-[#fde8e4] text-[#bd503e]",
      advice:
        "Not yet secure on the starter question. Stay at that level before going near the master question.",
    };
  }
  if (score < 80) {
    return {
      label: `Developing · ${Math.round(score)}%`,
      tone: "bg-[#fff0dc] text-[#ad6a13]",
      advice:
        "Handles the starter question. The gap is the middle ground — build toward the master question.",
    };
  }
  return {
    label: `Secure · ${Math.round(score)}%`,
    tone: "bg-[#dcefeb] text-[#1f7169]",
    advice:
      "Can attempt the master question. Use it to confirm, then move on rather than drilling further.",
  };
}

export function MentorPlanGuide({ report }: { report: PlanReport }) {
  const active = report.topics.filter((t) => t.status !== "dropped");

  return (
    <SyllabusShell breadcrumb={`Mentor guide · ${report.studentName}`}>
      <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8">
        <Link
          href={`/teacher/plans/${report.planId}/report`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f7169] hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to progress report
        </Link>

        <h1 className="text-2xl font-bold text-[#22403c]">
          Mentor guide — {report.studentName}
        </h1>
        <p className="mt-1 text-sm text-[#5c6b69]">
          The question range for every topic in this plan: where{" "}
          {report.studentName.split(" ")[0]} should be starting, and what
          mastery looks like.
        </p>

        <div className="mt-6 space-y-5">
          {active.length === 0 && (
            <p className="rounded-2xl border border-[#e8e4dc] bg-white p-6 text-sm text-[#5c6b69]">
              This plan has no topics.
            </p>
          )}

          {active.map((topic) => {
            const verdict = masteryVerdict(topic);
            const classProgress =
              topic.plannedClasses > 0
                ? Math.min(
                    100,
                    (topic.classesDone / topic.plannedClasses) * 100,
                  )
                : 0;

            return (
              <div
                key={topic.topicId ?? topic.topicName}
                className="rounded-2xl border border-[#e8e4dc] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-[#22403c]">
                    {topic.topicName}
                  </h2>
                  <Badge className={verdict.tone}>{verdict.label}</Badge>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <Progress value={classProgress} className="h-1.5 flex-1" />
                  <span className="shrink-0 text-xs text-[#5c6b69]">
                    {topic.classesDone}/{topic.plannedClasses} classes ·{" "}
                    {topic.activitiesDone}/{topic.plannedActivities} activities
                  </span>
                </div>

                <p className="mt-3 rounded-xl bg-[#f2f8f6] px-4 py-3 text-sm leading-6 text-[#2a413e]">
                  {verdict.advice}
                </p>

                {topic.objectives.length === 0 ? (
                  <p className="mt-4 text-xs text-[#8a8a82]">
                    No question guideline available for this topic yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {topic.objectives.map((objective) => (
                      <div
                        key={objective.objectiveId}
                        className="border-t border-[#f0ede7] pt-4"
                      >
                        <p className="text-sm font-semibold text-[#22403c]">
                          {objective.name}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-[#f7f5f0] p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#1f7169]">
                              <Flag className="size-3" /> Starter
                            </div>
                            <p className="text-xs leading-5 text-[#3f5c58]">
                              {objective.starterQuestion ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#f7f5f0] p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#6f55c7]">
                              <Target className="size-3" /> Master
                            </div>
                            <p className="text-xs leading-5 text-[#3f5c58]">
                              {objective.masterQuestion ?? "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#8a8a82]">
          <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
          Starter and master questions are drawn from the question bank for each
          objective. Where a topic shows no guideline, the objective has no
          reviewed questions yet.
        </p>
      </div>
    </SyllabusShell>
  );
}
