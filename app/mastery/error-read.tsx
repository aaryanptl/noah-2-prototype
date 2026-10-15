"use client";

import { ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { CachedJudgement, JudgeUsage } from "@/lib/mastery/errors";
import {
  ERROR_WINDOW,
  type ErrorReading,
  GAP_LEAN,
  type LoErrorRead,
  READING_LABEL,
  SLIP_LEAN,
} from "@/lib/mastery/gap";
import type { Decision, LoRow, MasteryMode } from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";
import {
  REASON_LABEL,
  WRONG_REASONS,
  type WrongReason,
} from "@/lib/why-wrong/ladder";

import { fmtDate, MODE_LABEL } from "./shared";

interface ErrorAnswer {
  tsq: number;
  loId: number;
  at: string;
  mode: MasteryMode;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  timeTakenMs: number | null;
  judgement: CachedJudgement | null;
}

interface ErrorsResponse {
  reads: LoErrorRead[];
  answers: ErrorAnswer[];
  usage: JudgeUsage;
}

/** From docs/mastery-analysis/gap-share-backtest.md (812 snapshots, 15 Oct 2026). */
const BACKTEST = {
  snapshots: 812,
  guessStuck: 42,
  otherStuck: 26,
};

const READING_CLASS: Record<ErrorReading, string> = {
  too_few: "bg-neutral-50 text-neutral-400",
  gap: "bg-[#fdebe7] text-[#b8432c]",
  mixed: "bg-neutral-100 text-neutral-600",
  slip: "bg-[#fff3d6] text-[#9a6200]",
  guessing: "bg-[#ece8f6] text-[#5b4a91]",
};

const REASON_FILL: Record<WrongReason, string> = {
  conceptual_gap: "bg-[#f0a596]",
  procedural_slip: "bg-[#f3cd7a]",
  misread_prompt: "bg-[#f7e2a8]",
  careless: "bg-[#e9dcc0]",
  likely_guess: "bg-[#c9c0e3]",
};

const secs = (ms: number | null) =>
  ms === null ? "—" : `${Math.round(ms / 1000)}s`;
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}`);

export function ErrorRead({
  student,
  topicId,
  rows,
  decision,
}: {
  student: string;
  topicId: number;
  rows: LoRow[];
  decision: Decision;
}) {
  const [data, setData] = useState<ErrorsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setOpen(null);
    fetch(
      `/api/mastery/errors?student=${encodeURIComponent(student)}&topic=${topicId}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success)
          throw new Error(json.error?.message ?? "Could not read the errors");
        setData(json.data as ErrorsResponse);
      })
      .catch(
        (err) =>
          !cancelled &&
          setError(err instanceof Error ? err.message : "Something went wrong"),
      );
    return () => {
      cancelled = true;
    };
  }, [student, topicId]);

  const readByLo = useMemo(
    () => new Map((data?.reads ?? []).map((r) => [r.loId, r])),
    [data],
  );
  const guessingTargets = rows.filter(
    (row) =>
      decision.targetLoIds.includes(row.id) &&
      readByLo.get(row.id)?.reading === "guessing",
  );

  return (
    <Card className="bg-white py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 pt-5 pb-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Why the errors happened · Jev
          </p>
          {data && (
            <p className="font-mono text-[11px] text-[var(--text-dim)]">
              {data.usage.answers} answers read · {data.usage.fresh} new ·{" "}
              {data.usage.cached} cached
              {data.usage.failed > 0 && ` · ${data.usage.failed} failed`}
            </p>
          )}
        </div>
        <p className="px-6 text-sm text-[var(--text-dim)]">
          Jev reads each objective's last {ERROR_WINDOW} wrong first responses
          and judges whether the student is missing the method or has it and
          slipped. The loop does not read this; it sits beside the decision.
        </p>
        <p className="mx-6 mt-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-[var(--text)]">
          <span className="font-semibold">
            Back-test, {BACKTEST.snapshots} real student-objectives:
          </span>{" "}
          missing-method vs slipped did{" "}
          <span className="font-semibold">not</span> predict what happened next,
          so it should not choose between a class and practice. Guessing did:{" "}
          {BACKTEST.guessStuck}% of objectives read as guessing stayed under 60,
          against {BACKTEST.otherStuck}% of the rest. Most of that is visible
          from answer times alone.
        </p>

        {guessingTargets.length > 0 && (
          <p className="mx-6 mt-3 rounded-lg bg-[#ece8f6] px-4 py-3 text-sm text-[#5b4a91]">
            The loop's next activity targets{" "}
            <span className="font-semibold">
              {guessingTargets.map((row) => row.name).join(", ")}
            </span>
            , where the recent errors read as guessing. The score alone does not
            show this.
          </p>
        )}

        {error && (
          <p className="mx-6 mt-3 rounded-lg border border-[#f3c9bf] bg-[#fdebe7] px-4 py-3 text-sm text-[#b8432c]">
            {error}
          </p>
        )}
        {!data && !error && (
          <p className="px-6 py-4 text-sm text-[var(--text-dim)]">
            Reading the wrong answers…
          </p>
        )}

        {data && (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-6 pt-4 pb-2 text-[11px] text-[var(--text-dim)]">
              {WRONG_REASONS.map((reason) => (
                <span key={reason} className="flex items-center gap-1.5">
                  <span
                    className={cn("size-2 rounded-sm", REASON_FILL[reason])}
                  />
                  {REASON_LABEL[reason]}
                </span>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-dim)]">
                  <th className="px-6 py-2 font-medium">Objective</th>
                  <th className="w-16 px-3 py-2 text-right font-medium">
                    Score
                  </th>
                  <th className="w-24 px-3 py-2 text-right font-medium">
                    Errors read
                  </th>
                  <th
                    className="w-28 px-3 py-2 text-right font-medium"
                    title={`Mean probability that an error is a missing method. Over ${Math.round(GAP_LEAN * 100)} reads as missing the method, under ${Math.round(SLIP_LEAN * 100)} as slipping.`}
                  >
                    Gap share
                  </th>
                  <th className="w-40 px-3 py-2 font-medium">
                    What went wrong
                  </th>
                  <th className="w-40 px-6 py-2 font-medium">Reading</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const read = readByLo.get(row.id);
                  const answers = data.answers.filter((a) => a.loId === row.id);
                  const expandable = answers.length > 0;
                  const isOpen = open === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={cn(
                          "border-b border-[var(--border)]",
                          expandable && "cursor-pointer hover:bg-neutral-50",
                        )}
                        onClick={() =>
                          expandable && setOpen(isOpen ? null : row.id)
                        }
                      >
                        <td className="px-6 py-3">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <ChevronRight
                              className={cn(
                                "size-3.5 shrink-0 text-neutral-300 transition",
                                isOpen && "rotate-90",
                                !expandable && "invisible",
                              )}
                            />
                            <span className="truncate" title={row.name}>
                              {row.name}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {row.score === null ? (
                            <span className="text-neutral-300">—</span>
                          ) : (
                            Math.round(row.score)
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-[var(--text-dim)]">
                          {read ? `${read.judged} of ${read.wrong}` : "0"}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold">
                          {read?.gapShare == null ? (
                            <span className="font-normal text-neutral-300">
                              —
                            </span>
                          ) : (
                            `${pct(read.gapShare)}%`
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {read && read.judged > 0 ? (
                            <ReasonBar reasons={read.reasons} />
                          ) : (
                            <span className="text-xs text-neutral-300">
                              no wrong answers
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              READING_CLASS[read?.reading ?? "too_few"],
                            )}
                          >
                            {READING_LABEL[read?.reading ?? "too_few"]}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-[var(--border)] bg-neutral-50/60">
                          <td colSpan={6} className="px-6 py-3">
                            <AnswerList answers={answers} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReasonBar({ reasons }: { reasons: Record<WrongReason, number> }) {
  const total = WRONG_REASONS.reduce((n, r) => n + reasons[r], 0);
  if (total === 0) return null;
  return (
    <div
      className="flex h-2 w-32 overflow-hidden rounded-full bg-neutral-100"
      title={WRONG_REASONS.filter((r) => reasons[r] > 0)
        .map((r) => `${REASON_LABEL[r]}: ${reasons[r]}`)
        .join("\n")}
    >
      {WRONG_REASONS.map((r) =>
        reasons[r] > 0 ? (
          <div
            key={r}
            className={REASON_FILL[r]}
            style={{ width: `${(100 * reasons[r]) / total}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

function AnswerList({ answers }: { answers: ErrorAnswer[] }) {
  return (
    <ol className="space-y-2">
      {[...answers].reverse().map((a) => {
        const j = a.judgement;
        return (
          <li
            key={a.tsq}
            className="grid grid-cols-[88px_minmax(0,1fr)_150px_64px] items-start gap-3 text-xs"
          >
            <span className="font-mono text-[var(--text-dim)]">
              {fmtDate(a.at)}
              <span className="block text-neutral-400">
                {MODE_LABEL[a.mode]}
              </span>
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-[var(--text)]">
                {a.prompt}
              </span>
              <span className="mt-0.5 block text-[var(--text-dim)]">
                Answered{" "}
                <span className="font-mono text-[#b8432c]">
                  {a.studentAnswer || "—"}
                </span>{" "}
                · correct{" "}
                <span className="font-mono text-[#1c7a3a]">
                  {a.correctAnswer || "—"}
                </span>{" "}
                · {secs(a.timeTakenMs)}
              </span>
            </span>
            <span>
              {j?.reason ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn("size-2 rounded-sm", REASON_FILL[j.reason])}
                  />
                  {REASON_LABEL[j.reason]}
                </span>
              ) : (
                <span className="text-neutral-400">not judged</span>
              )}
            </span>
            <span
              className="text-right font-mono text-[var(--text-dim)]"
              title="Probability the error is a missing method"
            >
              {j?.realGap == null ? "—" : `gap ${pct(j.realGap)}%`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
