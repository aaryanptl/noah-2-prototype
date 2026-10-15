"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Judgement } from "@/lib/why-wrong/classify";
import type {
  AnsweredQuestion,
  SessionCandidate,
} from "@/lib/why-wrong/evidence";
import {
  DEFAULT_POLICY,
  type DifficultyBand,
  drops,
  reasonAwareSignal,
  replayPath,
  SEED_BAND,
  todaySignal,
  WRONG_REASONS,
  type WrongReason,
} from "@/lib/why-wrong/ladder";

import { AnswerList, type AnswerRow } from "./answers";
import { MethodologyButton } from "./methodology";
import {
  BandPath,
  fmtDate,
  gradeLabel,
  MODE_LABEL,
  type PathRow,
  PolicyCard,
  Verdicts,
} from "./shared";

interface RunResponse {
  session: {
    id: number;
    studentId: string;
    mode: string;
    topic: string;
    grade: string;
    startedAt: string;
  };
  questions: AnsweredQuestion[];
  judgements: Judgement[];
  usage: {
    model: string | null;
    inputTokens: number;
    outputTokens: number;
    requests: number;
    ms: number;
  };
}

export default function WhyWrongPage() {
  const [sessions, setSessions] = useState<SessionCandidate[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [data, setData] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gapThreshold, setGapThreshold] = useState(DEFAULT_POLICY.gapThreshold);
  const [wrongOnly, setWrongOnly] = useState(true);

  useEffect(() => {
    fetch("/api/why-wrong/sessions")
      .then((r) => r.json())
      .then((json) => setSessions(json.success ? json.data.sessions : []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, []);

  const load = useCallback(async (sessionId: number) => {
    setSelected(sessionId);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/why-wrong/run?session=${sessionId}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error?.message ?? "Could not build the replay");
      setData(json.data as RunResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * The replay. Re-runs whenever the policy changes — no new model call,
   * because the judgements are evidence and the policy is just a setting.
   */
  const replay = useMemo(() => {
    if (!data) return null;
    const policy = { ...DEFAULT_POLICY, gapThreshold };
    const byOrdinal = new Map(data.judgements.map((j) => [j.ordinal, j]));

    const todaySignals = data.questions.map((q) => todaySignal(q.verdict));
    const decided = data.questions.map((q) =>
      reasonAwareSignal(
        q.verdict,
        byOrdinal.get(q.ordinal)
          ? {
              realGap: byOrdinal.get(q.ordinal)?.realGap ?? undefined,
              luckyGuess: byOrdinal.get(q.ordinal)?.luckyGuess ?? undefined,
            }
          : null,
        policy,
      ),
    );
    const proposedSignals = decided.map((d) => d.signal);

    // Replay one slot PAST the last answer, so every question has a defined
    // "band after this answer" and the final entry is the band the student's
    // next session would open at.
    const todayFull = replayPath([...todaySignals, null], SEED_BAND);
    const proposedFull = replayPath([...proposedSignals, null], SEED_BAND);
    const todayPath = todayFull.slice(0, data.questions.length);
    const proposedPath = proposedFull.slice(0, data.questions.length);
    const bandAfter = (path: DifficultyBand[], i: number) =>
      (path[i + 1] ?? path[path.length - 1] ?? SEED_BAND) as DifficultyBand;

    const rows: AnswerRow[] = data.questions.map((q, i) => ({
      question: q,
      judgement: byOrdinal.get(q.ordinal),
      todaySignal: todaySignals[i] ?? null,
      proposedSignal: proposedSignals[i] ?? null,
      changed: decided[i]?.changed ?? false,
      fellBack: decided[i]?.fellBack ?? false,
      bandToday: bandAfter(todayFull, i),
      bandProposed: bandAfter(proposedFull, i),
    }));

    const pathRows: PathRow[] = data.questions.map((q, i) => ({
      ordinal: q.ordinal,
      verdict: q.verdict,
      reason: byOrdinal.get(q.ordinal)?.reason ?? null,
      used: decided[i]?.changed ?? false,
    }));

    const counts = Object.fromEntries(
      WRONG_REASONS.map((r) => [r, 0]),
    ) as Record<WrongReason, number>;
    for (const j of data.judgements) if (j.reason) counts[j.reason] += 1;

    const wrong = data.questions.filter(
      (q) => q.verdict === "incorrect" || q.verdict === "partial",
    ).length;
    const notGaps = data.judgements.filter(
      (j) => j.realGap !== null && j.realGap < gapThreshold,
    ).length;
    const luckyGuesses = decided.filter(
      (d, i) => data.questions[i]?.verdict === "correct" && d.changed,
    ).length;
    const fellBack = decided.filter((d) => d.fellBack).length;
    // The highest guess score seen, so a zero count can say WHY it is zero.
    const guessScores = data.judgements
      .map((j) => j.luckyGuess)
      .filter((v): v is number => v !== null);
    const maxGuess = guessScores.length > 0 ? Math.max(...guessScores) : null;

    return {
      rows,
      pathRows,
      todayPath,
      proposedPath,
      counts,
      wrong,
      notGaps,
      luckyGuesses,
      maxGuess,
      fellBack,
      dropsToday: drops(todaySignals),
      dropsProposed: drops(proposedSignals),
      endToday: (todayFull[todayFull.length - 1] ??
        SEED_BAND) as DifficultyBand,
      endProposed: (proposedFull[proposedFull.length - 1] ??
        SEED_BAND) as DifficultyBand,
    };
  }, [data, gapThreshold]);

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Noah · Why the answer was wrong
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--heading)]">
              Not every wrong answer means the same thing
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-dim)]">
              Today the engine sees one word: wrong. A careless slip and a
              missing method both make the next question easier. This replays a
              real session with Jev reading <em>why</em> each answer was wrong
              first.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected !== null && (
              <Button
                type="button"
                variant="ghost"
                className="h-10"
                onClick={() => {
                  setSelected(null);
                  setData(null);
                  setError(null);
                }}
              >
                <ArrowLeft className="size-4" />
                All sessions
              </Button>
            )}
            <Link
              href="/why-wrong/practice"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--heading)] px-4 text-sm font-medium text-white transition hover:opacity-90"
            >
              Try it as a student
            </Link>
            <Link
              href="/mastery"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--heading)]/30 bg-white px-4 text-sm font-medium text-[var(--heading)] transition hover:bg-[var(--heading)] hover:text-white"
            >
              Mastery loop
            </Link>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-lg border border-[#f3c9bf] bg-[#fdebe7] px-4 py-3 text-sm text-[#b8432c]">
            {error}
          </p>
        )}

        {selected === null && (
          <SessionGrid
            sessions={sessions}
            loading={sessionsLoading}
            onPick={(s) => void load(s.sessionId)}
          />
        )}

        {selected !== null && (
          <section className="mt-8 space-y-6">
            {loading && (
              <div className="rounded-xl border border-[var(--border)] bg-white p-6">
                <p className="text-sm text-[var(--text-dim)]">
                  Reading the session, then asking Jev about every answer…
                </p>
              </div>
            )}

            {data && replay && (
              <>
                <SessionBar data={data} />
                <Verdicts
                  wrong={replay.wrong}
                  notGaps={replay.notGaps}
                  dropsToday={replay.dropsToday}
                  dropsProposed={replay.dropsProposed}
                  endToday={replay.endToday}
                  endProposed={replay.endProposed}
                  luckyGuesses={replay.luckyGuesses}
                  maxGuess={replay.maxGuess}
                />
                <BandPath
                  today={replay.todayPath}
                  proposed={replay.proposedPath}
                  rows={replay.pathRows}
                />
                <PolicyCard
                  counts={replay.counts}
                  gapThreshold={gapThreshold}
                  onGapThreshold={setGapThreshold}
                  fellBack={replay.fellBack}
                  held={replay.notGaps}
                  wrong={replay.wrong}
                />
                <AnswerList
                  rows={replay.rows}
                  wrongOnly={wrongOnly}
                  onWrongOnly={setWrongOnly}
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

function SessionBar({ data }: { data: RunResponse }) {
  const { session, usage } = data;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-[var(--border)] bg-white px-6 py-4">
      <div>
        <p className="text-sm font-semibold text-[var(--heading)]">
          {session.topic}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-dim)]">
          {session.studentId} · {gradeLabel(session.grade)} ·{" "}
          {MODE_LABEL[session.mode] ?? session.mode} ·{" "}
          {fmtDate(session.startedAt)} · session {session.id}
        </p>
      </div>
      <p className="font-mono text-[11px] text-[var(--text-dim)]">
        {usage.model ?? "jev"} · {usage.requests} questions asked ·{" "}
        {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens ·{" "}
        {(usage.ms / 1000).toFixed(1)}s
      </p>
    </div>
  );
}

function SessionGrid({
  sessions,
  loading,
  onPick,
}: {
  sessions: SessionCandidate[];
  loading: boolean;
  onPick: (session: SessionCandidate) => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[var(--heading)]">
          Real completed sessions, most recent first
        </h2>
        <p className="text-xs text-[var(--text-dim)]">
          Long enough for the difficulty to move, with a mix of right and wrong
        </p>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-dim)]">Finding sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-dim)]">
          No sessions came back. Check the read-only database connection.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const accuracy = Math.round(
              (100 * s.correct) / Math.max(1, s.correct + s.wrong),
            );
            return (
              <button
                key={s.sessionId}
                type="button"
                onClick={() => onPick(s)}
                className="group rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:border-[var(--heading)]/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--heading)]">
                      {s.topic}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--text-dim)]">
                      {s.studentId} · {gradeLabel(s.grade)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                      accuracy < 60
                        ? "bg-[#fdebe7] text-[#b8432c]"
                        : accuracy < 80
                          ? "bg-[#fff3d6] text-[#9a6200]"
                          : "bg-[#dff5f2] text-[#0f6b62]",
                    )}
                  >
                    {accuracy}%
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--text-dim)]">
                  {MODE_LABEL[s.mode] ?? s.mode} · {s.questions} questions ·{" "}
                  <span className="font-medium text-[#b8432c]">
                    {s.wrong} wrong
                  </span>
                  <span className="ml-1 text-neutral-400">
                    · {fmtDate(s.startedAt)}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-[var(--text-dim)]">
        Opening a session asks Jev one small set of questions about each answer.
        That takes a few seconds and costs a fraction of a cent.
      </p>
    </section>
  );
}
