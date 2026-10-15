"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BAND_LABEL,
  BANDS,
  type DifficultyBand,
  type LadderSignal,
  REASON_BLURB,
  REASON_LABEL,
  REASON_POLICY,
  type Verdict,
  WRONG_REASONS,
  type WrongReason,
} from "@/lib/why-wrong/ladder";

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function gradeLabel(grade: string) {
  return grade.replace(/^grade\s*/i, "Grade ");
}

export const MODE_LABEL: Record<string, string> = {
  diagnostic: "Topic test",
  homework: "Homework",
  practice: "Practice",
  placement: "Placement",
};

/** Muted for "this is not really a gap", red for the one that is. */
export const REASON_CLASS: Record<WrongReason, string> = {
  conceptual_gap: "bg-[#fdebe7] text-[#b8432c]",
  procedural_slip: "bg-[#fff3d6] text-[#9a6200]",
  misread_prompt: "bg-[#fff3d6] text-[#9a6200]",
  likely_guess: "bg-neutral-100 text-neutral-600",
  careless: "bg-[#fff3d6] text-[#9a6200]",
};

export const SIGNAL_LABEL: Record<LadderSignal, string> = {
  correct: "step up",
  partial: "hold",
  incorrect: "step down",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "Right",
  partial: "Partly right",
  incorrect: "Wrong",
  non_attempt: "Skipped",
};

export function secs(ms: number | null) {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

/* ------------------------------------------------------------------ */
/* The headline comparison                                             */
/* ------------------------------------------------------------------ */

export function Verdicts({
  wrong,
  notGaps,
  dropsToday,
  dropsProposed,
  endToday,
  endProposed,
  luckyGuesses,
  maxGuess,
}: {
  wrong: number;
  notGaps: number;
  dropsToday: number;
  dropsProposed: number;
  endToday: DifficultyBand;
  endProposed: DifficultyBand;
  luckyGuesses: number;
  maxGuess: number | null;
}) {
  const saved = dropsToday - dropsProposed;
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          What changed
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--heading)]">
          {saved > 0 ? (
            <>
              The student was made {saved} question{saved === 1 ? "" : "s"}{" "}
              easier than they needed to be
            </>
          ) : (
            "Every wrong answer here was a real gap"
          )}
        </h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[var(--text)]">
          {notGaps} of this session&rsquo;s {wrong} wrong answers were slips,
          misreads or guesses rather than a missing method.{" "}
          {saved > 0
            ? "Today each one pushes the difficulty down. Reading the reason first, the ladder holds instead."
            : "Reading the reason first changes nothing here — which is exactly what should happen when the gaps are genuine."}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Pushed down"
            today={`${dropsToday}×`}
            proposed={`${dropsProposed}×`}
            better={dropsProposed < dropsToday}
          />
          <Stat
            label="Ends the run at"
            today={BAND_LABEL[endToday]}
            proposed={BAND_LABEL[endProposed]}
            better={BANDS.indexOf(endProposed) > BANDS.indexOf(endToday)}
          />
          <div className="rounded-xl border border-[var(--border)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Lucky guesses
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--heading)]">
              {luckyGuesses}
            </p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {luckyGuesses > 0 ? (
                "right answers that look guessed, so they no longer count toward moving up"
              ) : maxGuess === null ? (
                "no right answers were judged in this session"
              ) : (
                <>
                  none here — the most suspicious right answer scored{" "}
                  <span className="font-mono">{maxGuess.toFixed(2)}</span>,
                  under the <span className="font-mono">0.70</span> bar
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  today,
  proposed,
  better,
}: {
  label: string;
  today: string;
  proposed: string;
  better: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-neutral-400 line-through decoration-neutral-300">
          {today}
        </span>
        <span
          className={cn(
            "text-2xl font-semibold",
            better ? "text-[#1c7a3a]" : "text-[var(--heading)]",
          )}
        >
          {proposed}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--text-dim)]">
        today → reading the reason
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Band path                                                           */
/* ------------------------------------------------------------------ */

const W = 960;
const H = 210;
const PAD = { top: 18, right: 18, bottom: 46, left: 62 };

export interface PathRow {
  ordinal: number;
  verdict: Verdict;
  reason: WrongReason | null;
  used: boolean;
}

export function BandPath({
  today,
  proposed,
  rows,
}: {
  today: DifficultyBand[];
  proposed: DifficultyBand[];
  rows: PathRow[];
}) {
  const n = today.length;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const stepW = innerW / Math.max(1, n);
  const x = (i: number) => PAD.left + i * stepW;
  // hard on top, easy at the bottom
  const y = (band: DifficultyBand) =>
    PAD.top + innerH - (BANDS.indexOf(band) / (BANDS.length - 1)) * innerH;

  const stepLine = (path: DifficultyBand[]) =>
    path
      .map((band, i) => `M ${x(i)} ${y(band)} L ${x(i + 1)} ${y(band)}`)
      .join(" ") +
    path
      .map((band, i) =>
        i === 0
          ? ""
          : ` M ${x(i)} ${y(path[i - 1] as DifficultyBand)} L ${x(i)} ${y(band)}`,
      )
      .join("");

  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Difficulty through the run
            </p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              The same real answers, replayed through the same ladder. The only
              difference is what each wrong answer was allowed to mean.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-2 text-[var(--text-dim)]">
              <span
                className="w-[22px] border-t-2 border-dashed border-neutral-400"
                aria-hidden
              />
              Today
            </span>
            <span className="flex items-center gap-2 text-[var(--text)]">
              <span
                className="w-[22px] border-t-2 border-[var(--heading)]"
                aria-hidden
              />
              Reading the reason
            </span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-4 w-full"
          role="img"
          aria-label="Difficulty band through the run, today versus reading the reason"
        >
          {BANDS.map((band) => (
            <g key={band}>
              <line
                x1={PAD.left}
                y1={y(band)}
                x2={W - PAD.right}
                y2={y(band)}
                stroke="rgba(26,26,46,0.08)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 12}
                y={y(band) + 4}
                textAnchor="end"
                className="fill-[var(--text-dim)] font-mono text-[11px]"
              >
                {BAND_LABEL[band]}
              </text>
            </g>
          ))}

          <path
            d={stepLine(today)}
            fill="none"
            stroke="#b3b3b3"
            strokeWidth="2.5"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />
          <path
            d={stepLine(proposed)}
            fill="none"
            stroke="var(--heading)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {rows.map((row, i) => {
            const cx = x(i) + stepW / 2;
            const wrong =
              row.verdict === "incorrect" || row.verdict === "partial";
            const fill = !wrong
              ? "#cfe9e4"
              : row.reason === "conceptual_gap"
                ? "#e0846c"
                : row.reason === null
                  ? "#c4c4c4"
                  : "#f0c264";
            return (
              <g key={row.ordinal}>
                <circle
                  cx={cx}
                  cy={H - PAD.bottom + 16}
                  r={wrong ? 5 : 3}
                  fill={fill}
                />
                {row.used && wrong && (
                  <circle
                    cx={cx}
                    cy={H - PAD.bottom + 16}
                    r="8"
                    fill="none"
                    stroke="var(--heading)"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
          <text
            x={PAD.left}
            y={H - 6}
            className="fill-[var(--text-dim)] font-mono text-[10px]"
          >
            question 1
          </text>
          <text
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
            className="fill-[var(--text-dim)] font-mono text-[10px]"
          >
            question {n}
          </text>
        </svg>

        <p className="mt-2 text-xs text-[var(--text-dim)]">
          Dots below the axis are the answers. Red is a missing method, amber is
          a slip, a misread or a guess, grey means there was no judgement and
          today&rsquo;s rule was used. A ring marks a question where the two
          paths part ways.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Policy                                                              */
/* ------------------------------------------------------------------ */

export function PolicyCard({
  counts,
  gapThreshold,
  onGapThreshold,
  fellBack,
  held,
  wrong,
}: {
  counts: Record<WrongReason, number>;
  gapThreshold: number;
  onGapThreshold: (value: number) => void;
  fellBack: number;
  held: number;
  wrong: number;
}) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          What the reasons mean
        </p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          These are the labels Jev gave the wrong answers in this session. They
          explain the decision — the decision itself is the one number below.
        </p>
        <ul className="mt-4 space-y-1.5">
          {WRONG_REASONS.map((reason) => (
            <li
              key={reason}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm"
            >
              <span className="w-8 shrink-0 text-right font-mono font-semibold text-[var(--text)]">
                {counts[reason] ?? 0}
              </span>
              <span
                className={cn(
                  "w-44 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                  REASON_CLASS[reason],
                )}
              >
                {REASON_LABEL[reason]}
              </span>
              <span
                className={cn(
                  "w-24 shrink-0 font-mono text-xs",
                  REASON_POLICY[reason] === "incorrect"
                    ? "text-[#b8432c]"
                    : "text-[var(--heading)]",
                )}
              >
                {SIGNAL_LABEL[REASON_POLICY[reason]]}
              </span>
              <span className="truncate text-xs text-[var(--text-dim)]">
                {REASON_BLURB[reason]}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="min-confidence"
              className="text-sm font-medium text-[var(--text)]"
            >
              Only make the questions easier when Jev is at least{" "}
              <span className="font-mono">{gapThreshold.toFixed(2)}</span> sure
              the method is actually missing
            </label>
            <span className="font-mono text-xs text-[var(--text-dim)]">
              {held} of {wrong} held
              {fellBack > 0 && ` · ${fellBack} unjudged`}
            </span>
          </div>
          <input
            id="gap-threshold"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={gapThreshold}
            onChange={(event) => onGapThreshold(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--heading)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--text-dim)]">
            <span>0.00 — exactly how it works today</span>
            <span>1.00 — never make it easier</span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            Holding is not a free pass: it still breaks the student&rsquo;s run
            of correct answers, so they do not move up either. And a wrong
            answer Jev cannot judge at all falls straight back to today&rsquo;s
            rule.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
