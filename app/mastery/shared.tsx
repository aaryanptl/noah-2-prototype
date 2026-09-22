"use client";

import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  type Decision,
  LOCK_EVIDENCE,
  type LoRow,
  type MasteryMode,
  RULES,
  type Scorecard,
} from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

export const MODE_LABEL: Record<MasteryMode, string> = {
  placement: "Placement",
  diagnostic: "Topic test",
  homework: "Homework",
  practice: "Practice",
  check: "LO check",
  class: "Mentor class",
};

export const STATE_LABEL: Record<LoRow["state"], string> = {
  untested: "Untested",
  needs_help: "Needs teaching",
  working: "Working",
  ready: "Ready to certify",
  blocked: "Blocked",
  signed_off: "Signed off",
};

export const STATE_CLASS: Record<LoRow["state"], string> = {
  untested: "bg-neutral-100 text-neutral-600",
  needs_help: "bg-[#fdebe7] text-[#b8432c]",
  working: "bg-[#fff3d6] text-[#9a6200]",
  ready: "bg-[#dff5f2] text-[#0f6b62]",
  blocked: "bg-[#fdebe7] text-[#b8432c]",
  signed_off: "bg-[#e3f6e8] text-[#1c7a3a]",
};

export const ACTIVITY_LABEL: Record<Decision["activity"], string> = {
  close: "Close the topic",
  topic_class: "Whole-topic class",
  escalate: "Flag to the teacher",
  survey: "Topic survey",
  class: "Class on one objective",
  check: "LO check",
  practice: "Practice",
  topic_test: "Topic re-test",
  homework: "Homework",
};

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function gradeLabel(grade: string) {
  return grade.replace(/^grade\s*/i, "Grade ");
}

/* ------------------------------------------------------------------ */

export function DecisionCard({
  decision,
  rows,
}: {
  decision: Decision;
  rows: LoRow[];
}) {
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const targets = decision.targetLoIds
    .map((id) => byId.get(id))
    .filter(Boolean) as LoRow[];
  const urgent =
    decision.activity === "escalate" ||
    decision.activity === "topic_class" ||
    decision.activity === "class";
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          Next activity
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2
            className={cn(
              "text-2xl font-semibold tracking-tight",
              urgent ? "text-[#b8432c]" : "text-[var(--heading)]",
            )}
          >
            {ACTIVITY_LABEL[decision.activity]}
          </h2>
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
            {decision.rule} · {decision.ruleName}
          </span>
        </div>
        {decision.activityLabel !== ACTIVITY_LABEL[decision.activity] && (
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {decision.activityLabel}
          </p>
        )}
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text)]">
          {decision.because}
        </p>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{decision.effect}</p>

        {decision.homeworkPlan && decision.homeworkPlan.length > 0 && (
          <div className="mt-5 space-y-1.5">
            {decision.homeworkPlan.map((item) => {
              const row = byId.get(item.loId);
              return (
                <div
                  key={item.loId}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-8 shrink-0 text-right font-mono font-semibold">
                    {item.questions}
                  </span>
                  <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wide text-[var(--text-dim)]">
                    {item.role}
                  </span>
                  <span className="truncate">{row?.name ?? item.loId}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-[var(--text-dim)]">
                    {row?.score ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!decision.homeworkPlan &&
          targets.length > 0 &&
          targets.length < rows.length && (
            <div className="mt-5 flex flex-wrap gap-2">
              {targets.map((row) => (
                <span
                  key={row.id}
                  className="rounded-md border border-[var(--border)] px-2.5 py-1 text-sm"
                >
                  {row.name}
                  <span className="ml-2 font-mono text-xs text-[var(--text-dim)]">
                    {row.score ?? "—"}
                  </span>
                </span>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}

export function RuleLadder({ fired }: { fired: Decision["rule"] }) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          How it decided
        </p>
        <ol className="mt-3 space-y-1">
          {RULES.map((rule) => {
            const isFired = rule.id === fired;
            return (
              <li
                key={rule.id}
                className={cn(
                  "flex items-baseline gap-3 rounded-md px-2 py-1 text-sm",
                  isFired
                    ? "bg-[var(--heading)] text-white"
                    : "text-[var(--text-dim)]",
                )}
              >
                <span className="w-6 shrink-0 font-mono text-xs">
                  {rule.id}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    isFired ? "text-white" : "text-[var(--text)]",
                  )}
                >
                  {rule.activity}
                </span>
                <span className="truncate text-xs">{rule.condition}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Top to bottom, first match wins.
        </p>
      </CardContent>
    </Card>
  );
}

export function ScorecardTable({
  card,
  placement,
}: {
  card: Scorecard;
  placement: { answered: number; correct: number; at: string } | null;
}) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 pt-5 pb-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Scorecard
          </p>
          <p className="text-sm text-[var(--text-dim)]">
            Topic{" "}
            <span className="font-mono font-semibold text-[var(--text)]">
              {card.topicScore ?? "—"}
            </span>{" "}
            on <span className="font-mono">{card.topicEvidence}</span> weighted
            questions
            {placement && (
              <span className="ml-3 text-neutral-400">
                Placement seed{" "}
                {Math.round(
                  (100 * placement.correct) / Math.max(1, placement.answered),
                )}
                % ({placement.correct}/{placement.answered})
              </span>
            )}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-dim)]">
              <th className="px-6 py-2 font-medium">Objective</th>
              <th className="w-20 px-3 py-2 text-right font-medium">Score</th>
              <th className="w-44 px-3 py-2 font-medium">Evidence</th>
              <th className="w-36 px-3 py-2 font-medium">State</th>
              <th className="w-40 px-3 py-2 font-medium">
                Accuracy per session
              </th>
              <th className="w-24 px-6 py-2 text-right font-medium">Last</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="px-6 py-3">
                  <span className="block truncate" title={row.name}>
                    {row.name}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-base font-semibold">
                  {row.score === null ? (
                    <span className="text-neutral-300">—</span>
                  ) : (
                    Math.round(row.score)
                  )}
                </td>
                <td className="px-3 py-3">
                  <EvidenceBar evidence={row.evidence} locked={row.locked} />
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      STATE_CLASS[row.state],
                    )}
                  >
                    {STATE_LABEL[row.state]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Sparkline history={row.history} />
                </td>
                <td className="px-6 py-3 text-right font-mono text-xs text-[var(--text-dim)]">
                  {row.lastAt ? fmtDate(row.lastAt) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function EvidenceBar({
  evidence,
  locked,
}: {
  evidence: number;
  locked: boolean;
}) {
  const width = Math.min(100, (evidence / LOCK_EVIDENCE) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn(
            "h-full rounded-full",
            locked ? "bg-[var(--heading)]" : "bg-neutral-400",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-mono text-xs text-[var(--text-dim)]">
        {evidence}
        {locked ? "" : ` / ${LOCK_EVIDENCE}`}
      </span>
    </div>
  );
}

export function Sparkline({ history }: { history: LoRow["history"] }) {
  if (history.length === 0)
    return <span className="text-xs text-neutral-300">no sessions</span>;
  const recent = history.slice(-12);
  return (
    <div
      className="flex h-6 items-end gap-[3px]"
      title={recent
        .map(
          (h) =>
            `${fmtDate(h.at)} ${MODE_LABEL[h.mode]} ${h.accuracy}% (${h.answered} q)`,
        )
        .join("\n")}
    >
      {recent.map((h) => (
        <div
          key={`${h.sessionId}-${h.at}`}
          className={cn(
            "w-[5px] rounded-sm",
            h.answered < 2 && "opacity-40",
            h.accuracy < 60
              ? "bg-[#f0a596]"
              : h.accuracy < 80
                ? "bg-[#f3cd7a]"
                : "bg-[#7fcdc3]",
          )}
          style={{ height: `${Math.max(12, h.accuracy)}%` }}
        />
      ))}
    </div>
  );
}
