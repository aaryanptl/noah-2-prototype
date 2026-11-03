"use client";

import { Award, Gauge, Hourglass, Timer } from "lucide-react";

import {
  buildScorecard,
  CONFIDENCE_FULL,
  DECAY_GRACE_DAYS,
  DECAY_MAX,
  DECAY_PER_WEEK,
  EVIDENCE_WEIGHT,
  K_FLOOR,
  LO_FLOOR,
  learningRate,
  MASTERY_BAR,
  type MasteryMode,
  type Measurement,
  SPEED_BAND,
} from "@/lib/mastery/rules";

import { MODE_LABEL } from "../shared";

/**
 * "How the score is worked out": the §2 update rule in words, and one
 * objective played through five sessions by the real engine, so every number
 * in the table is what `buildScorecard` produces.
 */
const WEIGHTS: Array<{ mode: MasteryMode; label: string; note: string }> = [
  { mode: "diagnostic", label: "Test", note: "timed, no hints" },
  { mode: "homework", label: "Homework", note: "at home" },
  { mode: "practice", label: "Practice", note: "hints on" },
];

const EXAMPLE: Array<{ mode: MasteryMode; answered: number; correct: number }> =
  [
    { mode: "placement", answered: 3, correct: 1 },
    { mode: "homework", answered: 5, correct: 3 },
    { mode: "practice", answered: 5, correct: 5 },
    { mode: "homework", answered: 6, correct: 5 },
    { mode: "diagnostic", answered: 3, correct: 3 },
  ];

const OBJECTIVE = { id: 1, name: "Objective", sequence: 1 };

function workedExample() {
  const measurements: Measurement[] = [];
  return EXAMPLE.map((session, index) => {
    const before = buildScorecard([OBJECTIVE], measurements).rows[0];
    measurements.push({
      sessionId: index + 1,
      mode: session.mode,
      at: new Date(Date.UTC(2026, 8, 1 + index * 3)).toISOString(),
      loId: OBJECTIVE.id,
      answered: session.answered,
      correct: session.correct,
    });
    const after = buildScorecard([OBJECTIVE], measurements).rows[0];
    return {
      ...session,
      session: index + 1,
      k: before.score === null ? null : learningRate(before.evidence),
      before: before.score,
      after: after.score,
      confidence: after.confidence,
    };
  });
}

export function ScoreLogic() {
  const rows = workedExample();
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border-2 border-[#15302f] bg-white p-6">
        <p className="text-sm font-medium text-[#4a5a58]">
          After every answered question, for its objective
        </p>
        <p className="mt-2 font-mono text-xl font-semibold sm:text-2xl">
          new score = old score + w × k × (result − old score)
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-semibold">w · how much the answer counts</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {WEIGHTS.map((weight) => (
                <li key={weight.mode} className="flex items-center gap-2">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#e3e8e6]">
                    <span
                      className="block h-full rounded-full bg-[#15302f]"
                      style={{
                        width: `${EVIDENCE_WEIGHT[weight.mode] * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-8 font-semibold tabular-nums">
                    {EVIDENCE_WEIGHT[weight.mode].toFixed(1)}
                  </span>
                  <span>
                    {weight.label}{" "}
                    <span className="text-[#8b9592]">· {weight.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">k · how far one answer moves it</p>
            <p className="mt-2 text-sm leading-relaxed text-[#4a5a58]">
              1 ÷ (1 + questions so far), never below {K_FLOOR}. Early answers
              move the score a lot; once there is evidence, each one nudges it.
            </p>
          </div>
          <div>
            <p className="font-semibold">
              result · the session on that objective
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#4a5a58]">
              The share right, first answers only. The very first answer an
              objective gets sets its score: placement is point A.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 border-t border-[#d8dedc] pt-5 text-sm text-[#4a5a58] md:grid-cols-2">
          <p className="flex items-start gap-2">
            <Gauge className="mt-0.5 size-4 shrink-0 text-[#15302f]" />
            <span>
              <span className="font-semibold text-[#15302f]">Confidence</span>{" "}
              grows with every question: 2 is a guess, {CONFIDENCE_FULL} is a
              signal. Homework probes objectives the loop is unsure of.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Hourglass className="mt-0.5 size-4 shrink-0 text-[#15302f]" />
            <span>
              <span className="font-semibold text-[#15302f]">Decay</span>: no
              answers on an objective for {DECAY_GRACE_DAYS} days and it drops{" "}
              {DECAY_PER_WEEK} a week, at most {DECAY_MAX}. Mastery has to be
              kept, not just reached once.
            </span>
          </p>
        </div>
      </div>

      <div>
        <p className="text-lg font-bold">One objective, five sessions</p>
        <p className="mt-1 text-sm text-[#4a5a58]">
          Worked out by the same code that runs the loop.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
            <thead className="text-xs text-[#8b9592]">
              <tr className="border-b border-[#d8dedc]">
                <th className="py-2 pr-4 font-medium">Session</th>
                <th className="py-2 pr-4 font-medium">Right</th>
                <th className="py-2 pr-4 font-medium">w</th>
                <th className="py-2 pr-4 font-medium">k at the start</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e8e6]">
              {rows.map((row) => (
                <tr key={row.session}>
                  <td className="py-2.5 pr-4 font-semibold">
                    {MODE_LABEL[row.mode]}
                  </td>
                  <td className="py-2.5 pr-4">
                    {row.correct}/{row.answered}
                  </td>
                  <td className="py-2.5 pr-4">
                    {EVIDENCE_WEIGHT[row.mode].toFixed(1)}
                  </td>
                  <td className="py-2.5 pr-4 text-[#4a5a58]">
                    {row.k === null ? "sets it" : row.k.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[#8b9592]">
                      {row.before === null ? "—" : Math.round(row.before)} →{" "}
                    </span>
                    <span className="font-semibold">
                      {row.after === null ? "—" : Math.round(row.after)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e3e8e6]">
                        <span
                          className="block h-full rounded-full bg-[#15302f]"
                          style={{ width: `${row.confidence * 100}%` }}
                        />
                      </span>
                      {Math.round(row.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-[#4a5a58]">
          Per answer, a test counts{" "}
          {EVIDENCE_WEIGHT.diagnostic / EVIDENCE_WEIGHT.practice}× as much as
          practice. And k shrinks as answers pile up, so the same result moves
          the score less each time: the student has to keep proving it.
        </p>
      </div>

      <div className="rounded-2xl bg-[#15302f] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xl font-bold">
            <Award className="size-6" />
            Topic mastery
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            All three on one test = Master badge
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Only a topic test or a recurring test can close a topic. Homework and
          practice move the scores, but never award the badge.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          <GateCheck
            n={1}
            title={`Test at ${MASTERY_BAR}%+`}
            body="The topic or recurring test, all objectives together."
          />
          <GateCheck
            n={2}
            title={`Every objective ${LO_FLOOR}+`}
            body="No mastering on average while one objective stays broken."
          />
          <GateCheck
            n={3}
            title={`Speed within ${SPEED_BAND}×`}
            body="The student's typical time per question against the median for everyone who answered it."
            icon
          />
        </ol>
      </div>
    </div>
  );
}

function GateCheck({
  n,
  title,
  body,
  icon = false,
}: {
  n: number;
  title: string;
  body: string;
  icon?: boolean;
}) {
  return (
    <li className="rounded-xl bg-white p-4 text-[#15302f]">
      <p className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#dcf2ee] text-xs font-bold text-[#0f6b62] tabular-nums">
          {n}
        </span>
        {icon && <Timer className="size-4" />}
        {title}
      </p>
      <p className="mt-1.5 text-sm text-[#4a5a58]">{body}</p>
    </li>
  );
}
