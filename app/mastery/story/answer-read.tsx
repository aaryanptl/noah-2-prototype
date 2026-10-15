"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleHelp,
  Clock,
  MessageSquareText,
  PenLine,
  X,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  REASON_LABEL,
  WRONG_REASONS,
  type WrongReason,
} from "@/lib/why-wrong/ladder";

/** One wrong answer as `/api/mastery/errors` returns it. */
export interface StoryAnswer {
  tsq: number;
  prompt: string;
  options: Array<{ text: string; correct: boolean }>;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  timeTakenMs: number | null;
  typicalSeconds: number;
  judgement: {
    reason: WrongReason | null;
    reasonProbabilities: Record<string, number> | null;
    realGap: number | null;
    tooFast: number | null;
    severity: number | null;
  } | null;
}

export interface AnswerExample {
  student: string;
  answer: StoryAnswer;
}

const VERDICT_NOTE: Record<WrongReason, string> = {
  likely_guess:
    "Too quick to have worked it out. Check they're engaging before teaching anything new.",
  conceptual_gap:
    "Doesn't have the idea yet. This needs teaching, not more practice.",
  misread_prompt:
    "Solved a different question. They missed a condition in the wording.",
  procedural_slip:
    "Has the method, slipped on the working. More practice will fix it.",
  careless: "Knows this. The mistake looks like inattention.",
};

/** Severity 0–3, short enough for a fact cell. */
const RETEACH = ["No", "A little", "Some", "Fully"];

const pct = (x: number | null | undefined) =>
  x == null ? "—" : `${Math.round(x * 100)}%`;
const secs = (ms: number | null) =>
  ms === null ? null : Math.max(1, Math.round(ms / 1000));

export function AnswerReading({ examples }: { examples: AnswerExample[] }) {
  const [index, setIndex] = useState(0);
  const example = examples[Math.min(index, examples.length - 1)];
  if (!example) return null;
  const { answer } = example;
  const j = answer.judgement;
  const verdict = j?.reason ?? null;
  const taken = secs(answer.timeTakenMs);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Example wrong answers"
        className="flex flex-wrap gap-2"
      >
        {examples.map((ex, i) => (
          <button
            key={ex.answer.tsq}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d5bd0]",
              i === index
                ? "border-[#6d5bd0] bg-[#6d5bd0] text-white"
                : "border-[#d9d3ef] bg-white text-[#4b4280] hover:border-[#6d5bd0]",
            )}
          >
            Wrong answer {i + 1}
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,0.8fr)_auto_minmax(0,1.05fr)]">
        {/* 1. What the student did */}
        <div className="rounded-2xl border-2 border-[#15302f] bg-white p-5">
          <p className="text-sm font-medium text-[#4a5a58]">
            {example.student} answered
          </p>
          <p className="mt-2 text-[17px] leading-snug font-semibold">
            {answer.prompt}
          </p>
          {answer.options.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {answer.options.map((o) => {
                const picked = o.text.trim() === answer.studentAnswer.trim();
                return (
                  <li
                    key={o.text}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                      picked
                        ? "bg-[#fbe3e6] font-semibold text-[#a8283c]"
                        : o.correct
                          ? "bg-[#dcf2ee] text-[#0f6b62]"
                          : "text-[#4a5a58]",
                    )}
                  >
                    {picked ? (
                      <X className="mt-0.5 size-4 shrink-0" />
                    ) : o.correct ? (
                      <Check className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                    <span className="min-w-0">
                      {o.text}
                      {picked && (
                        <span className="ml-2 text-xs font-medium">
                          their answer
                        </span>
                      )}
                      {o.correct && !picked && (
                        <span className="ml-2 text-xs font-medium">right</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 space-y-1.5 text-sm">
              <p className="rounded-lg bg-[#fbe3e6] px-3 py-2 font-semibold text-[#a8283c]">
                {answer.studentAnswer}
              </p>
              <p className="rounded-lg bg-[#dcf2ee] px-3 py-2 text-[#0f6b62]">
                {answer.correctAnswer}
              </p>
            </div>
          )}
          {taken !== null && (
            <TimeBars taken={taken} typical={answer.typicalSeconds} />
          )}
        </div>

        <Arrow />

        {/* 2. What Jev reads */}
        <div className="flex flex-col rounded-2xl bg-[#ece8f6] p-5 text-[#2e2560]">
          <p className="text-lg font-bold">The AI reads</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            <ReadItem icon={CircleHelp} text="The question" />
            <ReadItem icon={PenLine} text="Their answer" />
            <ReadItem icon={Check} text="The right answer" />
            <ReadItem
              icon={BookOpenCheck}
              text="The worked solution"
              detail={answer.explanation}
            />
            <ReadItem
              icon={Clock}
              text={
                taken === null
                  ? "How long they took"
                  : `${taken}s taken, ~${answer.typicalSeconds}s usual`
              }
            />
          </ul>
          <p className="mt-auto pt-4 text-xs text-[#5b4a91]">
            No name, no score, no history. Just this one answer.
          </p>
        </div>

        <Arrow />

        {/* 3. What Jev concludes */}
        <div className="rounded-2xl bg-[#2e2560] p-5 text-white">
          <p className="text-sm text-white/70">The AI's verdict</p>
          <p className="mt-1 text-2xl leading-tight font-bold">
            {verdict ? REASON_LABEL[verdict] : "Not judged"}
          </p>
          {verdict && j?.reasonProbabilities && (
            <p className="text-sm text-white/70">
              {pct(j.reasonProbabilities[verdict])} likely
            </p>
          )}

          {j?.reasonProbabilities && (
            <ul className="mt-4 space-y-1.5">
              {WRONG_REASONS.map((r) => {
                const p = j.reasonProbabilities?.[r] ?? 0;
                return (
                  <li
                    key={r}
                    className="grid grid-cols-[minmax(0,1fr)_80px_36px] items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        r === verdict ? "font-semibold" : "text-white/70",
                      )}
                    >
                      {REASON_LABEL[r]}
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/15">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-[width] duration-500",
                          r === verdict ? "bg-[#c9bdf5]" : "bg-white/40",
                        )}
                        style={{ width: `${Math.round(p * 100)}%` }}
                      />
                    </span>
                    <span className="text-right text-white/70 tabular-nums">
                      {pct(p)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center">
            <Fact label="Missing the method" value={pct(j?.realGap)} />
            <Fact label="Too fast to be real" value={pct(j?.tooFast)} />
            <Fact
              label="Re-teaching needed"
              value={
                j?.severity == null
                  ? "—"
                  : (RETEACH[Math.round(j.severity)] ?? "—")
              }
            />
          </dl>

          {verdict && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-white p-3.5 text-sm text-[#2e2560]">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-[#6d5bd0]" />
              <p>
                <span className="font-semibold">To the mentor: </span>
                {VERDICT_NOTE[verdict]}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden items-center justify-center text-[#6d5bd0] lg:flex">
      <ArrowRight className="size-6" />
    </div>
  );
}

function ReadItem({
  icon: Icon,
  text,
  detail,
}: {
  icon: typeof Check;
  text: string;
  detail?: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white">
        <Icon className="size-3.5 text-[#6d5bd0]" />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="font-medium">{text}</span>
        {detail && (
          <span className="mt-1 line-clamp-3 text-xs text-[#4b4280]">
            "{detail}"
          </span>
        )}
      </span>
    </li>
  );
}

function TimeBars({ taken, typical }: { taken: number; typical: number }) {
  const max = Math.max(taken, typical);
  const row = (label: string, value: number, tone: string) => (
    <div className="grid grid-cols-[86px_minmax(0,1fr)_36px] items-center gap-2 text-xs">
      <span className="text-[#4a5a58]">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[#eef0ef]">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500",
            tone,
          )}
          style={{ width: `${Math.max(3, (100 * value) / max)}%` }}
        />
      </span>
      <span className="text-right font-semibold tabular-nums">{value}s</span>
    </div>
  );
  return (
    <div className="mt-4 space-y-1.5 border-t border-[#e3e8e6] pt-4">
      {row("They took", taken, "bg-[#15302f]")}
      {row("Usually takes", typical, "bg-[#b9c2bf]")}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-0.5 text-[11px] leading-tight text-white/70">
        {label}
      </dt>
      <dd className="text-base font-bold tabular-nums">{value}</dd>
    </div>
  );
}
