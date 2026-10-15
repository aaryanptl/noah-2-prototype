"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Judgement } from "@/lib/why-wrong/classify";
import type { AnsweredQuestion } from "@/lib/why-wrong/evidence";
import {
  BAND_LABEL,
  type DifficultyBand,
  type LadderSignal,
  REASON_LABEL,
} from "@/lib/why-wrong/ladder";

import { REASON_CLASS, SIGNAL_LABEL, secs, VERDICT_LABEL } from "./shared";

export interface AnswerRow {
  question: AnsweredQuestion;
  judgement: Judgement | undefined;
  todaySignal: LadderSignal | null;
  proposedSignal: LadderSignal | null;
  changed: boolean;
  fellBack: boolean;
  bandToday: DifficultyBand;
  bandProposed: DifficultyBand;
}

export function AnswerList({
  rows,
  wrongOnly,
  onWrongOnly,
}: {
  rows: AnswerRow[];
  wrongOnly: boolean;
  onWrongOnly: (value: boolean) => void;
}) {
  const shown = wrongOnly
    ? rows.filter(
        (r) =>
          r.question.verdict === "incorrect" ||
          r.question.verdict === "partial",
      )
    : rows;

  return (
    <Card className="bg-white py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Answer by answer
            </p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              Open any row to see the question the student saw and what Jev read
              from their answer.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={wrongOnly}
              onChange={(event) => onWrongOnly(event.target.checked)}
              className="size-4 accent-[var(--heading)]"
            />
            Wrong answers only
          </label>
        </div>
        <div className="border-t border-[var(--border)]">
          {shown.map((row) => (
            <AnswerRowView key={row.question.ordinal} row={row} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnswerRowView({ row }: { row: AnswerRow }) {
  const [open, setOpen] = useState(false);
  const { question: q, judgement } = row;
  const wrong = q.verdict === "incorrect" || q.verdict === "partial";
  const guessed =
    q.verdict === "correct" &&
    judgement?.luckyGuess !== null &&
    judgement?.luckyGuess !== undefined &&
    row.changed;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-6 py-3 text-left transition hover:bg-neutral-50"
      >
        <span className="w-6 shrink-0 font-mono text-xs text-[var(--text-dim)]">
          {q.ordinal}
        </span>
        <span
          className={cn(
            "w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-medium",
            q.verdict === "correct"
              ? "bg-[#e3f6e8] text-[#1c7a3a]"
              : q.verdict === "non_attempt"
                ? "bg-neutral-100 text-neutral-600"
                : "bg-[#fdebe7] text-[#b8432c]",
          )}
        >
          {VERDICT_LABEL[q.verdict]}
        </span>

        <span className="w-44 shrink-0">
          {judgement?.reason ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                REASON_CLASS[judgement.reason],
              )}
            >
              {REASON_LABEL[judgement.reason]}
            </span>
          ) : guessed ? (
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              Looks guessed
            </span>
          ) : (
            <span className="font-mono text-[11px] text-neutral-300">—</span>
          )}
        </span>

        <span
          className="w-12 shrink-0 font-mono text-[11px] text-[var(--text-dim)]"
          title="How sure Jev is the method is actually missing"
        >
          {judgement?.realGap !== null && judgement?.realGap !== undefined
            ? judgement.realGap.toFixed(2)
            : ""}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
          {q.prompt}
        </span>

        <span className="w-14 shrink-0 text-right font-mono text-[11px] text-[var(--text-dim)]">
          {secs(q.timeTakenMs)}
        </span>

        <span className="w-32 shrink-0 text-right font-mono text-[11px]">
          {row.changed ? (
            <>
              <span className="text-neutral-400 line-through">
                {row.todaySignal ? SIGNAL_LABEL[row.todaySignal] : "—"}
              </span>{" "}
              <span className="font-semibold text-[var(--heading)]">
                {row.proposedSignal ? SIGNAL_LABEL[row.proposedSignal] : "—"}
              </span>
            </>
          ) : (
            <span className="text-[var(--text-dim)]">
              {row.todaySignal ? SIGNAL_LABEL[row.todaySignal] : "—"}
              {row.fellBack && wrong && (
                <span className="ml-1 text-neutral-300">unsure</span>
              )}
            </span>
          )}
        </span>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--text-dim)] transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="grid gap-6 bg-neutral-50/60 px-6 py-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              {BAND_LABEL[q.band as DifficultyBand] ?? q.band} ·{" "}
              {q.objectiveName}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--text)]">
              {q.prompt}
            </p>

            {q.options.length > 0 ? (
              <div className="mt-4 space-y-1.5">
                {q.options.map((option) => {
                  const picked = option.text.trim() === q.studentAnswer.trim();
                  return (
                    <div
                      key={option.text}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm",
                        option.correct
                          ? "border-[#bfe5d4] bg-[#e3f6e8]"
                          : picked
                            ? "border-[#f3c9bf] bg-[#fdebe7]"
                            : "border-[var(--border)] bg-white",
                      )}
                    >
                      <span className="flex-1">{option.text}</span>
                      {option.correct && (
                        <span className="font-mono text-[11px] text-[#1c7a3a]">
                          correct
                        </span>
                      )}
                      {picked && !option.correct && (
                        <span className="font-mono text-[11px] text-[#b8432c]">
                          student picked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-[var(--text-dim)]">Student wrote</span>{" "}
                  <span className="font-mono">{q.studentAnswer || "—"}</span>
                </p>
                <p>
                  <span className="text-[var(--text-dim)]">Answer key</span>{" "}
                  <span className="font-mono">{q.correctAnswer || "—"}</span>
                </p>
              </div>
            )}

            {q.explanation && (
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-dim)]">
                <span className="font-medium text-[var(--text)]">
                  Worked solution:
                </span>{" "}
                {q.explanation}
              </p>
            )}
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              What Jev read
            </p>
            {judgement?.error ? (
              <p className="mt-2 text-sm text-[#b8432c]">{judgement.error}</p>
            ) : judgement?.reasonProbabilities ? (
              <>
                {judgement.realGap !== null && (
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-white p-3">
                    <p className="text-sm text-[var(--text-dim)]">
                      Chance the method is actually missing
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold text-[var(--heading)]">
                      {judgement.realGap.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      This is the number the difficulty decision is made from.
                    </p>
                  </div>
                )}
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  Most likely explanation
                </p>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(judgement.reasonProbabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-40 shrink-0 truncate text-xs text-[var(--text-dim)]">
                          {REASON_LABEL[key as keyof typeof REASON_LABEL] ??
                            key}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-[var(--heading)]"
                            style={{ width: `${Math.round(value * 100)}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right font-mono text-[11px] text-[var(--text-dim)]">
                          {value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
                {judgement.severity !== null && judgement.severityLegend && (
                  <p className="mt-4 text-sm text-[var(--text-dim)]">
                    <span className="font-medium text-[var(--text)]">
                      Needs re-teaching:
                    </span>{" "}
                    {
                      judgement.severityLegend[
                        String(Math.round(judgement.severity))
                      ]
                    }{" "}
                    <span className="font-mono text-xs">
                      ({judgement.severity.toFixed(2)} of 3)
                    </span>
                  </p>
                )}
                {judgement.tooFast !== null && (
                  <p className="mt-2 text-sm text-[var(--text-dim)]">
                    <span className="font-medium text-[var(--text)]">
                      Answered too fast to be real:
                    </span>{" "}
                    <span className="font-mono text-xs">
                      {judgement.tooFast.toFixed(2)}
                    </span>
                  </p>
                )}
              </>
            ) : judgement?.luckyGuess !== null &&
              judgement?.luckyGuess !== undefined ? (
              <p className="mt-3 text-sm text-[var(--text-dim)]">
                <span className="font-medium text-[var(--text)]">
                  Chance this right answer was really a guess:
                </span>{" "}
                <span className="font-mono">
                  {judgement.luckyGuess.toFixed(2)}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-dim)]">
                Nothing was asked about this answer.
              </p>
            )}

            <div className="mt-5 rounded-lg border border-[var(--border)] bg-white p-3 text-sm">
              <p className="text-[var(--text-dim)]">
                Difficulty after this answer
              </p>
              <p className="mt-1">
                <span className="text-neutral-400">
                  {BAND_LABEL[row.bandToday]}
                </span>
                <span className="mx-2 text-neutral-300">→</span>
                <span className="font-semibold text-[var(--heading)]">
                  {BAND_LABEL[row.bandProposed]}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
