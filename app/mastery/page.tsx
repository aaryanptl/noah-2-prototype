"use client";

import { ArrowRight, Check, FlaskConical, Search, X } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CandidateStudent, StudentTopic } from "@/lib/mastery/evidence";
import {
  buildScorecard,
  type Decision,
  type LoRow,
  type MasteryObjective,
  type ReplayStep,
  type Scorecard,
} from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

import { MethodologyButton } from "./methodology";
import { type ChartPoint, ScoreChart } from "./score-chart";
import {
  ACTIVITY_LABEL,
  DecisionCard,
  fmtDate,
  gradeLabel,
  MODE_LABEL,
  RuleLadder,
  ScorecardTable,
} from "./shared";

interface DecideResponse {
  student: string;
  topic: { id: number; name: string; grade: string };
  objectives: MasteryObjective[];
  placement: { answered: number; correct: number; at: string } | null;
  scorecard: Scorecard;
  decision: Decision;
  steps: ReplayStep[];
}

export default function MasteryPage() {
  const [candidates, setCandidates] = useState<CandidateStudent[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [studentInput, setStudentInput] = useState("");
  const [student, setStudent] = useState<string | null>(null);
  const [topics, setTopics] = useState<StudentTopic[]>([]);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [data, setData] = useState<DecideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mastery/candidates")
      .then((r) => r.json())
      .then((json) => setCandidates(json.success ? json.data.candidates : []))
      .catch(() => setCandidates([]))
      .finally(() => setCandidatesLoading(false));
  }, []);

  const load = useCallback(async (id: string, preferredTopic?: number) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setStudent(trimmed);
    setStudentInput(trimmed);
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(
        `/api/mastery/topics?student=${encodeURIComponent(trimmed)}`,
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error?.message ?? "Could not load topics");
      const list: StudentTopic[] = json.data.topics;
      setTopics(list);
      if (list.length === 0) {
        setTopicId(null);
        setError("No completed topic sessions for this student.");
        return;
      }
      const chosen =
        preferredTopic && list.some((t) => t.topicId === preferredTopic)
          ? preferredTopic
          : list[0].topicId;
      setTopicId(chosen);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!student || topicId === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/mastery/decide?student=${encodeURIComponent(student)}&topic=${topicId}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success)
          throw new Error(
            json.error?.message ?? "Could not build the decision",
          );
        setData(json.data as DecideResponse);
      })
      .catch(
        (err) =>
          !cancelled &&
          setError(err instanceof Error ? err.message : "Something went wrong"),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [student, topicId]);

  const reset = () => {
    setStudent(null);
    setStudentInput("");
    setTopics([]);
    setTopicId(null);
    setData(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Noah · Mastery loop
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--heading)]">
              What should this student do next?
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-dim)]">
              Real production evidence, first responses only. The router reads
              the scorecard and returns one activity, with the rule that chose
              it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void load(studentInput);
              }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-dim)]" />
                <Input
                  value={studentInput}
                  onChange={(event) => setStudentInput(event.target.value)}
                  placeholder="Student ID"
                  className="h-10 w-56 bg-white pl-9 font-mono text-sm"
                />
              </div>
              <Button
                type="submit"
                className="h-10"
                disabled={loading || !studentInput.trim()}
              >
                Load
              </Button>
              {student && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={reset}
                  aria-label="Clear"
                >
                  <X className="size-4" />
                </Button>
              )}
            </form>
            <Link
              href="/mastery/sandbox"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--heading)]/30 bg-white px-4 text-sm font-medium text-[var(--heading)] transition hover:bg-[var(--heading)] hover:text-white"
            >
              <FlaskConical className="size-4" />
              Sandbox
            </Link>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-lg border border-[#f3c9bf] bg-[#fdebe7] px-4 py-3 text-sm text-[#b8432c]">
            {error}
          </p>
        )}

        {!student && (
          <CandidateGrid
            candidates={candidates}
            loading={candidatesLoading}
            onPick={(c) => void load(c.studentId, c.topicId)}
          />
        )}

        {student && (
          <section className="mt-8 space-y-6">
            <StudentBar
              student={student}
              topics={topics}
              topicId={topicId}
              onTopic={setTopicId}
              data={data}
            />
            {loading && !data && (
              <p className="text-sm text-[var(--text-dim)]">
                Reading the student’s sessions…
              </p>
            )}
            {data && (
              <>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <DecisionCard
                    decision={data.decision}
                    rows={data.scorecard.rows}
                  />
                  <RuleLadder fired={data.decision.rule} />
                </div>
                <ScoreHistory data={data} />
                <ScorecardTable
                  card={data.scorecard}
                  placement={data.placement}
                />
                <Timeline
                  steps={data.steps}
                  rows={data.scorecard.rows}
                  decision={data.decision}
                />
              </>
            )}
          </section>
        )}
      </div>
      <MethodologyButton />
    </main>
  );
}

/* ------------------------------------------------------------------ */

function ScoreHistory({ data }: { data: DecideResponse }) {
  const points = useMemo<ChartPoint[]>(() => {
    const out: ChartPoint[] = [
      {
        round: 0,
        card: buildScorecard(data.objectives, []),
        certified: [],
      },
    ];
    data.steps.forEach((step, index) => {
      out.push({
        round: index + 1,
        card: step.after,
        decision: step.prescribed,
        certified: [],
        label: `${MODE_LABEL[step.session.mode]} · ${step.session.correct}/${step.session.answered}`,
      });
    });
    return out;
  }, [data]);

  if (data.steps.length === 0) return null;
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          Score by session
        </p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          How each objective's score moved across the student's{" "}
          {data.steps.length} real sessions. Ticks below the axis mark where the
          loop would have brought in a mentor.
        </p>
        <div className="mt-4">
          <ScoreChart
            points={points}
            objectives={data.objectives}
            xLabel="session"
            prescribed
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CandidateGrid({
  candidates,
  loading,
  onPick,
}: {
  candidates: CandidateStudent[];
  loading: boolean;
  onPick: (candidate: CandidateStudent) => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[var(--heading)]">
          Students with the most sessions on one topic, most first
        </h2>
        <p className="text-xs text-[var(--text-dim)]">
          Or type any student ID above ·{" "}
          <Link
            href="/mastery/sandbox"
            className="font-medium text-[var(--heading)] underline-offset-2 hover:underline"
          >
            drive the loop yourself
          </Link>
        </p>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-dim)]">Finding students…</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <button
              key={`${c.studentId}-${c.topicId}`}
              type="button"
              onClick={() => onPick(c)}
              className="group rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:border-[var(--heading)]/30 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--heading)]">
                    {c.topicName}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--text-dim)]">
                    {c.studentId} · {gradeLabel(c.grade)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                    (c.accuracy ?? 0) < 60
                      ? "bg-[#fdebe7] text-[#b8432c]"
                      : (c.accuracy ?? 0) < 80
                        ? "bg-[#fff3d6] text-[#9a6200]"
                        : "bg-[#dff5f2] text-[#0f6b62]",
                  )}
                >
                  {c.accuracy ?? "—"}%
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">
                {c.sessions} sessions · {c.diagnostics} test
                {c.diagnostics === 1 ? "" : "s"} · {c.homeworks} homework ·{" "}
                {c.practices} practice
                <span className="ml-1 text-neutral-400">
                  · {fmtDate(c.firstAt)} → {fmtDate(c.lastAt)}
                </span>
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function StudentBar({
  student,
  topics,
  topicId,
  onTopic,
  data,
}: {
  student: string;
  topics: StudentTopic[];
  topicId: number | null;
  onTopic: (id: number) => void;
  data: DecideResponse | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-sm font-semibold text-[var(--heading)]">
          {student}
        </span>
        {data && (
          <>
            <span className="text-sm text-[var(--text-dim)]">
              {gradeLabel(data.topic.grade)}
            </span>
            <span className="text-sm text-[var(--text-dim)]">
              {data.scorecard.sessions} sessions on this topic
            </span>
            <span className="text-sm text-[var(--text-dim)]">
              Level{" "}
              <span className="font-semibold text-[var(--text)]">
                {data.scorecard.badge}
              </span>
            </span>
          </>
        )}
      </div>
      {topics.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-dim)]">Topic</span>
          <select
            value={topicId ?? ""}
            onChange={(event) => onTopic(Number(event.target.value))}
            className="h-9 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
          >
            {topics.map((t) => (
              <option key={t.topicId} value={t.topicId}>
                {t.topicName} · {t.sessions} session
                {t.sessions === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function Timeline({
  steps,
  rows,
  decision,
}: {
  steps: ReplayStep[];
  rows: LoRow[];
  decision: Decision;
}) {
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const isHuman = (activity: Decision["activity"]) =>
    activity === "escalate" ||
    activity === "topic_class" ||
    activity === "class";
  const firstHuman = steps.findIndex((s) => isHuman(s.prescribed.activity));
  // The first session from which the loop has kept asking for a check ever since.
  let firstCheck = -1;
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (steps[index].prescribed.activity !== "check") break;
    firstCheck = index;
  }
  const matched = steps.filter((s) => s.matched).length;

  let callout: {
    tone: "warn" | "info";
    text: React.ReactNode;
    index: number;
  } | null = null;
  if (isHuman(decision.activity) && firstHuman >= 0) {
    const after = steps.length - firstHuman;
    callout = {
      tone: "warn",
      index: firstHuman,
      text: (
        <>
          The loop would have asked for a mentor on{" "}
          <span className="font-semibold">
            {fmtDate(steps[firstHuman].session.at)}
          </span>
          .
          {after > 0 && (
            <>
              {" "}
              The student did{" "}
              <span className="font-semibold">
                {after} more session{after === 1 ? "" : "s"}
              </span>{" "}
              on their own instead.
            </>
          )}
        </>
      ),
    };
  } else if (decision.activity === "check" && firstCheck >= 0) {
    const after = steps.length - firstCheck;
    const ready = rows.filter((row) => row.state === "ready").length;
    callout = {
      tone: "info",
      index: firstCheck,
      text: (
        <>
          {ready} objective{ready === 1 ? " has" : "s have"} been ready to
          certify since{" "}
          <span className="font-semibold">
            {fmtDate(steps[firstCheck].session.at)}
          </span>
          .
          {after > 0 && (
            <>
              {" "}
              The student did{" "}
              <span className="font-semibold">
                {after} more session{after === 1 ? "" : "s"}
              </span>{" "}
              on skills already proven — the platform has no LO check yet.
            </>
          )}
        </>
      ),
    };
  } else if (firstHuman >= 0 && steps.length - firstHuman >= 3) {
    callout = {
      tone: "warn",
      index: firstHuman,
      text: (
        <>
          The loop would have asked for a mentor on{" "}
          <span className="font-semibold">
            {fmtDate(steps[firstHuman].session.at)}
          </span>
          , {steps.length - firstHuman} sessions before this point.
        </>
      ),
    };
  }

  return (
    <Card className="bg-white py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 pt-5 pb-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            What happened vs what the loop would have said
          </p>
          <p className="text-sm text-[var(--text-dim)]">
            {matched} of {steps.length} sessions match the prescription
          </p>
        </div>
        {callout && (
          <p
            className={cn(
              "mx-6 mb-3 rounded-lg px-4 py-3 text-sm",
              callout.tone === "warn"
                ? "bg-[#fdebe7] text-[#b8432c]"
                : "bg-[#dff5f2] text-[#0f6b62]",
            )}
          >
            {callout.text}
          </p>
        )}
        <ol>
          {steps.map((step, index) => {
            const target =
              step.prescribed.targetLoIds.length === 1
                ? byId.get(step.prescribed.targetLoIds[0])
                : undefined;
            const isFirstHuman = index === callout?.index;
            return (
              <li
                key={step.session.sessionId}
                className={cn(
                  "grid grid-cols-[72px_120px_64px_20px_minmax(0,1fr)] items-center gap-3 border-t border-[var(--border)] px-6 py-2.5 text-sm",
                  isFirstHuman &&
                    (callout?.tone === "warn"
                      ? "bg-[#fff7f5]"
                      : "bg-[#f3fbfa]"),
                )}
              >
                <span className="font-mono text-xs text-[var(--text-dim)]">
                  {fmtDate(step.session.at)}
                </span>
                <span className="font-medium">
                  {MODE_LABEL[step.session.mode]}
                </span>
                <span className="font-mono text-xs">
                  {step.session.correct}/{step.session.answered}
                </span>
                <ArrowRight className="size-3.5 text-neutral-300" />
                <span className="flex min-w-0 items-center gap-2">
                  {step.matched ? (
                    <Check className="size-3.5 shrink-0 text-[#1c7a3a]" />
                  ) : (
                    <X className="size-3.5 shrink-0 text-[#b8432c]" />
                  )}
                  <span
                    className={cn(
                      "truncate",
                      step.matched
                        ? "text-[var(--text-dim)]"
                        : "text-[var(--text)]",
                    )}
                  >
                    {ACTIVITY_LABEL[step.prescribed.activity]}
                    {target && (
                      <span className="text-[var(--text-dim)]">
                        {" "}
                        · {target.name}
                      </span>
                    )}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-neutral-400">
                    {step.prescribed.rule}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
