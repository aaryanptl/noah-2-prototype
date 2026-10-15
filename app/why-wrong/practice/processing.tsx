"use client";

import { Check, ChevronDown, Loader2, Minus, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { Judgement } from "@/lib/why-wrong/classify";
import {
  BAND_LABEL,
  type DifficultyBand,
  type LadderSignal,
  REASON_BLURB,
  REASON_LABEL,
  type Verdict,
  WRONG_REASONS,
  type WrongReason,
} from "@/lib/why-wrong/ladder";
import type {
  GradeDetail,
  JevAskDetail,
  JevResultDetail,
  StepId,
  StepStatus,
} from "@/lib/why-wrong/practice";

import { REASON_CLASS, SIGNAL_LABEL, VERDICT_LABEL } from "../shared";

/** Everything the stream has told us so far about one answer. */
export interface Processing {
  steps: Partial<
    Record<
      StepId,
      {
        status: StepStatus;
        ms?: number;
        note?: string;
        grade?: GradeDetail;
        state?: Record<string, unknown>;
        ask?: JevAskDetail;
        jev?: JevResultDetail;
      }
    >
  >;
  judgement: Judgement | null;
  /** Set once the result line has arrived. */
  finished: boolean;
}

export interface LadderDecision {
  today: LadderSignal | null;
  proposed: LadderSignal | null;
  changed: boolean;
  fellBack: boolean;
  nextToday: DifficultyBand;
  nextProposed: DifficultyBand;
  inSeed: boolean;
}

const TIER_LABEL: Record<string, string> = {
  blank: "nothing typed",
  deterministic: "normalising the formatting",
  accepted: "a known accepted variant",
  jev: "Jev's equivalence check",
  exhausted: "no tier matched",
};

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;

export function ProcessingPanel({
  processing,
  ladder,
}: {
  processing: Processing;
  ladder: LadderDecision | null;
}) {
  const { steps, judgement } = processing;
  const grade = steps.grade?.grade;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          What happens to your answer
        </p>
        {!processing.finished && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
            <Loader2 className="size-3.5 animate-spin" />
            working
          </span>
        )}
      </div>

      <ol className="divide-y divide-[var(--border)]">
        {/* 1 — grade */}
        <Step
          n={1}
          title="Grade the answer"
          status={steps.grade?.status}
          ms={steps.grade?.ms}
        >
          {grade && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <VerdictChip verdict={grade.verdict} />
                {grade.tier && (
                  <span className="text-xs text-[var(--text-dim)]">
                    settled by {TIER_LABEL[grade.tier] ?? grade.tier}
                    {grade.probability !== null &&
                      grade.probability !== undefined &&
                      ` · equivalence ${pct(grade.probability)}`}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text)]">{grade.how}</p>
            </div>
          )}
        </Step>

        {/* 2 — evidence */}
        <Step
          n={2}
          title="Collect the evidence Jev reads"
          status={steps.evidence?.status}
        >
          {steps.evidence?.state && (
            <EvidenceView state={steps.evidence.state} />
          )}
        </Step>

        {/* 3 — Jev */}
        <Step
          n={3}
          title={
            grade?.verdict === "correct"
              ? "Ask Jev: was that a real solve?"
              : "Ask Jev: why was it wrong?"
          }
          status={steps.jev?.status}
          ms={steps.jev?.ms}
        >
          {steps.jev?.note && (
            <p className="text-sm text-[var(--text-dim)]">{steps.jev.note}</p>
          )}
          {steps.jev?.status === "running" && steps.jev.ask && (
            <ul className="mt-1 space-y-1.5">
              {steps.jev.ask.asked.map((a) => (
                <li
                  key={a.key}
                  className="flex items-start gap-2 text-xs text-[var(--text-dim)]"
                >
                  <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin" />
                  <span>
                    <span className="font-mono text-[var(--heading)]">
                      {a.key}
                    </span>{" "}
                    <span className="font-mono text-neutral-400">
                      ({a.type})
                    </span>{" "}
                    {a.instructions}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {judgement && !judgement.error && (
            <JudgementView judgement={judgement} jev={steps.jev?.jev} />
          )}
        </Step>

        {/* 4 — ladder */}
        <Step
          n={4}
          title="Decide the next question's difficulty"
          status={ladder ? "done" : undefined}
        >
          {ladder && <LadderView ladder={ladder} />}
        </Step>
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Step({
  n,
  title,
  status,
  ms,
  children,
}: {
  n: number;
  title: string;
  status: StepStatus | undefined;
  ms?: number;
  children?: React.ReactNode;
}) {
  return (
    <li className="px-5 py-4">
      <div className="flex items-center gap-3">
        <StatusIcon status={status} n={n} />
        <p
          className={cn(
            "text-sm font-semibold",
            status ? "text-[var(--heading)]" : "text-[var(--text-dim)]",
          )}
        >
          {title}
        </p>
        {ms !== undefined && ms > 0 && (
          <span className="ml-auto font-mono text-[11px] text-neutral-400">
            {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>
      {children && <div className="mt-3 pl-9">{children}</div>}
    </li>
  );
}

function StatusIcon({
  status,
  n,
}: {
  status: StepStatus | undefined;
  n: number;
}) {
  const base =
    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold";
  if (status === "running")
    return (
      <span
        className={cn(base, "bg-[var(--heading)]/10 text-[var(--heading)]")}
      >
        <Loader2 className="size-3.5 animate-spin" />
      </span>
    );
  if (status === "done")
    return (
      <span className={cn(base, "bg-[#dff5f2] text-[#0f6b62]")}>
        <Check className="size-3.5" />
      </span>
    );
  if (status === "skipped")
    return (
      <span className={cn(base, "bg-neutral-100 text-neutral-500")}>
        <Minus className="size-3.5" />
      </span>
    );
  if (status === "error")
    return (
      <span className={cn(base, "bg-[#fff3d6] text-[#9a6200]")}>
        <X className="size-3.5" />
      </span>
    );
  return (
    <span className={cn(base, "bg-neutral-50 text-neutral-400")}>{n}</span>
  );
}

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
        verdict === "correct"
          ? "bg-[#dff5f2] text-[#0f6b62]"
          : verdict === "partial"
            ? "bg-[#fff3d6] text-[#9a6200]"
            : verdict === "non_attempt"
              ? "bg-neutral-100 text-neutral-600"
              : "bg-[#fdebe7] text-[#b8432c]",
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

/** The state object sent to Jev, laid out as a readable table with a raw toggle. */
function EvidenceView({ state }: { state: Record<string, unknown> }) {
  const [raw, setRaw] = useState(false);
  const shown: Array<[string, string]> = [
    ["difficulty", String(state.difficulty ?? "—")],
    ["objective", String(state.objective ?? "—")],
    ["your answer", String(state.studentAnswer || "(nothing)")],
    ["correct answer", String(state.correctAnswer ?? "—")],
    [
      "time taken",
      state.secondsTaken === null || state.secondsTaken === undefined
        ? "—"
        : `${state.secondsTaken}s (a typical student takes ${state.secondsATypicalStudentTakes}s)`,
    ],
  ];
  return (
    <div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {shown.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--text-dim)]">{k}</dt>
            <dd className="min-w-0 break-words text-[var(--text)]">{v}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => setRaw((r) => !r)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--heading)] hover:underline"
      >
        <ChevronDown
          className={cn("size-3.5 transition", raw && "rotate-180")}
        />
        {raw ? "Hide" : "Show"} the exact state sent to Jev
      </button>
      {raw && (
        <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed text-[var(--text)]">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: number | null;
  hint: string;
  danger: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-[var(--text)]">{label}</span>
        <span className="font-mono text-xs font-semibold text-[var(--heading)]">
          {pct(value)}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            danger ? "bg-[#e0846c]" : "bg-[var(--heading)]/60",
          )}
          style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-dim)]">{hint}</p>
    </div>
  );
}

function JudgementView({
  judgement,
  jev,
}: {
  judgement: Judgement;
  jev: JevResultDetail | undefined;
}) {
  const isWrong = judgement.luckyGuess === null;

  return (
    <div className="space-y-4">
      {isWrong ? (
        <>
          {judgement.reason && (
            <div>
              <span
                className={cn(
                  "inline-flex rounded-md px-2.5 py-1 text-sm font-semibold",
                  REASON_CLASS[judgement.reason],
                )}
              >
                {REASON_LABEL[judgement.reason]}
              </span>
              <p className="mt-2 text-sm text-[var(--text)]">
                {REASON_BLURB[judgement.reason]}
              </p>
            </div>
          )}

          {judgement.reasonProbabilities && (
            <div className="space-y-1.5">
              {[...WRONG_REASONS]
                .sort(
                  (a, b) =>
                    (judgement.reasonProbabilities?.[b] ?? 0) -
                    (judgement.reasonProbabilities?.[a] ?? 0),
                )
                .map((r: WrongReason) => {
                  const p = judgement.reasonProbabilities?.[r] ?? 0;
                  return (
                    <div key={r} className="flex items-center gap-3 text-xs">
                      <span
                        className={cn(
                          "w-36 shrink-0",
                          r === judgement.reason
                            ? "font-semibold text-[var(--heading)]"
                            : "text-[var(--text-dim)]",
                        )}
                      >
                        {REASON_LABEL[r]}
                      </span>
                      <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-500",
                            r === judgement.reason
                              ? "bg-[var(--heading)]"
                              : "bg-neutral-300",
                          )}
                          style={{ width: `${Math.round(p * 100)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono text-neutral-500">
                        {pct(p)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Meter
              label="Missing the method (realGap)"
              value={judgement.realGap}
              hint="The number the ladder acts on. At 50% or more the next question gets easier."
              danger={(judgement.realGap ?? 0) >= 0.5}
            />
            <Meter
              label="Too fast to have worked it out"
              value={judgement.tooFast}
              hint="Read against how long a typical student takes at this band."
              danger={(judgement.tooFast ?? 0) >= 0.5}
            />
          </div>

          {judgement.severity !== null && (
            <p className="text-xs text-[var(--text-dim)]">
              Re-teaching need{" "}
              <span className="font-mono font-semibold text-[var(--heading)]">
                {judgement.severity.toFixed(1)}/3
              </span>
              {/* Jev's score is an expected value, so name the nearest level. */}
              {judgement.severityLegend?.[
                String(Math.round(judgement.severity))
              ] && (
                <>
                  {" "}
                  — nearest level:{" "}
                  {
                    judgement.severityLegend[
                      String(Math.round(judgement.severity))
                    ]
                  }
                </>
              )}
            </p>
          )}
        </>
      ) : (
        <Meter
          label="Lucky guess"
          value={judgement.luckyGuess}
          hint="At 70% or more a right answer stops counting toward moving up."
          danger={(judgement.luckyGuess ?? 0) >= 0.7}
        />
      )}

      {jev && (
        <p className="font-mono text-[11px] text-neutral-400">
          {jev.model ?? "jev"} ·{" "}
          {(jev.inputTokens + jev.outputTokens).toLocaleString()} tokens
        </p>
      )}
    </div>
  );
}

function LadderView({ ladder }: { ladder: LadderDecision }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
            Today&rsquo;s engine
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {ladder.today ? SIGNAL_LABEL[ladder.today] : "no signal"} → next at{" "}
            <span className="font-semibold">
              {BAND_LABEL[ladder.nextToday]}
            </span>
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            ladder.changed
              ? "border-[var(--heading)]/40 bg-[var(--heading)]/[0.04]"
              : "border-[var(--border)]",
          )}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
            Reading the reason
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {ladder.proposed ? SIGNAL_LABEL[ladder.proposed] : "no signal"} →
            next at{" "}
            <span className="font-semibold text-[var(--heading)]">
              {BAND_LABEL[ladder.nextProposed]}
            </span>
          </p>
        </div>
      </div>
      <p className="text-xs text-[var(--text-dim)]">
        {ladder.inSeed
          ? "The first 3 questions always sit at Medium while the ladder warms up; the signal still counts toward later moves."
          : ladder.changed
            ? "The two rules disagree on this answer. You get the next question at the band the reason-aware rule chose."
            : ladder.fellBack
              ? "No judgement came back, so the reason-aware rule fell back to today's."
              : "Both rules agree on this answer."}
      </p>
    </div>
  );
}
