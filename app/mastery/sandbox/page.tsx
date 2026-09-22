"use client";

import { ArrowLeft, Dice5, Play, RotateCcw, Square, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogTopic } from "@/lib/mastery/evidence";
import {
  buildScorecard,
  CHECK_QUESTIONS,
  type Decision,
  type MasteryMode,
  type MasteryObjective,
  type Measurement,
  routeNext,
  SURVEY_CAP,
  SURVEY_PER_LO,
} from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

import { MethodologyButton } from "../methodology";
import { type ChartPoint, ScoreChart } from "../score-chart";
import {
  ACTIVITY_LABEL,
  DecisionCard,
  gradeLabel,
  RuleLadder,
  ScorecardTable,
} from "../shared";

type Preset = "weak" | "average" | "strong";
const PRESET_P: Record<Preset, number> = {
  weak: 0.35,
  average: 0.6,
  strong: 0.85,
};
const PRESET_LABEL: Record<Preset, string> = {
  weak: "Weak",
  average: "Average",
  strong: "Strong",
};
const PRACTICE_QUESTIONS = 5;
/** Auto-run stops here even if the topic never closes. */
const AUTO_MAX_ROUNDS = 80;
const AUTO_STEP_MS = 400;
/** In the sandbox a mentor class lifts the hidden ability of what it taught. */
const CLASS_GAIN = 0.15;

interface Draft {
  loId: number;
  questions: number;
  correct: number;
}

interface LogEntry {
  round: number;
  decision: Decision;
  mode: MasteryMode | null;
  results: Draft[];
  certified: string[];
}

/** Which session type an activity produces, or null when nothing is recorded. */
function modeFor(activity: Decision["activity"]): MasteryMode | null {
  switch (activity) {
    case "survey":
    case "topic_test":
      return "diagnostic";
    case "homework":
      return "homework";
    case "practice":
      return "practice";
    case "check":
      return "check";
    case "class":
    case "topic_class":
    case "escalate":
      return "class";
    default:
      return null;
  }
}

function draftsFor(decision: Decision): Draft[] {
  switch (decision.activity) {
    case "survey": {
      const per = Math.max(
        1,
        Math.min(
          SURVEY_PER_LO,
          Math.floor(SURVEY_CAP / Math.max(1, decision.targetLoIds.length)),
        ),
      );
      return decision.targetLoIds.map((loId) => ({
        loId,
        questions: per,
        correct: 0,
      }));
    }
    case "topic_test":
      return (decision.testPlan ?? []).map((item) => ({
        loId: item.loId,
        questions: item.questions,
        correct: 0,
      }));
    case "homework":
      return (decision.homeworkPlan ?? []).map((item) => ({
        loId: item.loId,
        questions: item.questions,
        correct: 0,
      }));
    case "practice":
      return decision.targetLoIds.map((loId) => ({
        loId,
        questions: PRACTICE_QUESTIONS,
        correct: 0,
      }));
    case "check":
      return decision.targetLoIds.map((loId) => ({
        loId,
        questions: CHECK_QUESTIONS,
        correct: 0,
      }));
    default:
      return [];
  }
}

function binomial(n: number, p: number) {
  let k = 0;
  for (let i = 0; i < n; i += 1) if (Math.random() < p) k += 1;
  return k;
}

export default function SandboxPage() {
  const [catalog, setCatalog] = useState<CatalogTopic[]>([]);
  const [grade, setGrade] = useState<string>("");
  const [topicId, setTopicId] = useState<number | null>(null);
  const [topic, setTopic] = useState<{
    id: number;
    name: string;
    grade: string;
  } | null>(null);
  const [objectives, setObjectives] = useState<MasteryObjective[]>([]);
  const [preset, setPreset] = useState<Preset>("average");
  /** Hidden per-objective tilt so a "weak" student is not uniformly weak. */
  const [tilt, setTilt] = useState<Record<number, number>>({});
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => {
    fetch("/api/mastery/catalog")
      .then((r) => r.json())
      .then((json) => {
        const topics: CatalogTopic[] = json.success ? json.data.topics : [];
        setCatalog(topics);
        const g5 = topics.find((t) => /5/.test(t.grade)) ?? topics[0];
        if (g5) {
          setGrade(g5.grade);
          setTopicId(g5.topicId);
        }
      })
      .catch(() => setCatalog([]));
  }, []);

  const grades = useMemo(
    () => [...new Set(catalog.map((t) => t.grade))],
    [catalog],
  );
  const topicsForGrade = useMemo(
    () => catalog.filter((t) => t.grade === grade),
    [catalog, grade],
  );

  useEffect(() => {
    if (topicId === null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/mastery/objectives?topic=${topicId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.success) return;
        setTopic(json.data.topic);
        setObjectives(json.data.objectives);
        const nextTilt: Record<number, number> = {};
        for (const o of json.data.objectives as MasteryObjective[])
          nextTilt[o.id] = (Math.random() - 0.5) * 0.3;
        setTilt(nextTilt);
        setMeasurements([]);
        setLog([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const card = useMemo(
    () => buildScorecard(objectives, measurements),
    [objectives, measurements],
  );
  const decision = useMemo(() => routeNext(card), [card]);
  const byId = useMemo(
    () => new Map(objectives.map((o) => [o.id, o])),
    [objectives],
  );

  // A new prescription gets a fresh result form.
  useEffect(() => {
    setDrafts(draftsFor(decision));
  }, [decision]);

  const roll = (current: Draft[]) =>
    current.map((d) => {
      const p = Math.min(
        0.98,
        Math.max(0.02, PRESET_P[preset] + (tilt[d.loId] ?? 0)),
      );
      return { ...d, correct: binomial(d.questions, p) };
    });

  const randomise = () => setDrafts((current) => roll(current));

  const record = (results: Draft[]) => {
    const mode = modeFor(decision.activity);
    if (!mode) return;
    const sessionId = log.length + 1;
    const at = new Date(Date.now() - (60 - sessionId) * 864e5).toISOString();
    const targets = decision.targetLoIds;
    const own: Measurement[] =
      mode === "class"
        ? targets.map((loId) => ({
            sessionId,
            mode,
            at,
            loId,
            answered: 0,
            correct: 0,
          }))
        : results.map((d) => ({
            sessionId,
            mode,
            at,
            loId: d.loId,
            answered: d.questions,
            correct: d.correct,
          }));
    if (mode === "class") {
      setTilt((current) => {
        const next = { ...current };
        for (const loId of targets)
          next[loId] = Math.min(
            0.95 - PRESET_P[preset],
            (next[loId] ?? 0) + CLASS_GAIN,
          );
        return next;
      });
    }
    const next = [...measurements, ...own];
    const before = new Set(
      card.rows.filter((r) => r.signedOff).map((r) => r.id),
    );
    const after = buildScorecard(objectives, next);
    const certified = after.rows
      .filter((r) => r.signedOff && !before.has(r.id))
      .map((r) => r.name);
    setMeasurements(next);
    setLog([
      ...log,
      {
        round: sessionId,
        decision,
        mode,
        results: mode === "class" ? [] : results,
        certified,
      },
    ]);
  };

  // Auto-run: roll and record one round per tick until the topic closes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: one step per recorded round; decision/record are derived from the same state
  useEffect(() => {
    if (!autoRun) return;
    if (decision.activity === "close" || log.length >= AUTO_MAX_ROUNDS) {
      setAutoRun(false);
      return;
    }
    const timer = setTimeout(
      () => record(roll(draftsFor(decision))),
      AUTO_STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [autoRun, log.length]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const out: ChartPoint[] = [
      { round: 0, card: buildScorecard(objectives, []), certified: [] },
    ];
    for (const entry of log) {
      out.push({
        round: entry.round,
        card: buildScorecard(
          objectives,
          measurements.filter((m) => m.sessionId <= entry.round),
        ),
        decision: entry.decision,
        certified: entry.certified,
      });
    }
    return out;
  }, [objectives, measurements, log]);

  const undo = () => {
    setAutoRun(false);
    const last = log[log.length - 1];
    if (!last) return;
    setMeasurements(measurements.filter((m) => m.sessionId !== last.round));
    setLog(log.slice(0, -1));
  };

  const reset = () => {
    setAutoRun(false);
    setMeasurements([]);
    setLog([]);
  };

  const needsInput = drafts.length > 0;
  const isClass = modeFor(decision.activity) === "class";
  const finished = decision.activity === "close";

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Link
              href="/mastery"
              className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              <ArrowLeft className="size-3.5" /> Real students
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--heading)]">
              Drive the loop yourself
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-dim)]">
              An imaginary student on a real topic. The router prescribes; you
              enter how the student did — or roll it — and the router reads the
              result and prescribes again.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                const first = catalog.find((t) => t.grade === e.target.value);
                if (first) setTopicId(first.topicId);
              }}
              className="h-9 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
            >
              {grades.map((g) => (
                <option key={g} value={g}>
                  {gradeLabel(g)}
                </option>
              ))}
            </select>
            <select
              value={topicId ?? ""}
              onChange={(e) => setTopicId(Number(e.target.value))}
              className="h-9 max-w-64 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
            >
              {topicsForGrade.map((t) => (
                <option key={t.topicId} value={t.topicId}>
                  {t.topicName} · {t.objectives} LOs
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-md border border-[var(--border)] bg-white text-sm">
              {(Object.keys(PRESET_LABEL) as Preset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={cn(
                    "px-3 py-1.5 transition",
                    preset === key
                      ? "bg-[var(--heading)] text-white"
                      : "text-[var(--text-dim)] hover:bg-neutral-50",
                  )}
                >
                  {PRESET_LABEL[key]}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9"
              onClick={reset}
              disabled={log.length === 0}
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
          </div>
        </header>

        {loading && (
          <p className="mt-8 text-sm text-[var(--text-dim)]">
            Loading objectives…
          </p>
        )}

        {topic && objectives.length > 0 && (
          <section className="mt-8 space-y-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl border border-[var(--border)] bg-white px-5 py-4 text-sm">
              <span className="font-semibold text-[var(--heading)]">
                {topic.name}
              </span>
              <span className="text-[var(--text-dim)]">
                {gradeLabel(topic.grade)}
              </span>
              <span className="text-[var(--text-dim)]">
                {objectives.length} objectives
              </span>
              <span className="text-[var(--text-dim)]">
                Round {log.length + 1}
              </span>
              <span className="text-[var(--text-dim)]">
                Level{" "}
                <span className="font-semibold text-[var(--text)]">
                  {card.badge}
                </span>
              </span>
            </div>

            <Card className="bg-white py-0">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                      Score by round
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-dim)]">
                      {finished
                        ? `Every objective signed off after ${log.length} rounds.`
                        : autoRun
                          ? `Rolling as a ${PRESET_LABEL[preset].toLowerCase()} student, one round every ${AUTO_STEP_MS / 1000}s…`
                          : `Run the loop to mastery as a ${PRESET_LABEL[preset].toLowerCase()} student, or record rounds by hand below.`}
                    </p>
                  </div>
                  {autoRun ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAutoRun(false)}
                    >
                      <Square className="size-4" /> Stop
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setAutoRun(true)}
                      disabled={finished}
                    >
                      <Play className="size-4" /> Run to mastery
                    </Button>
                  )}
                </div>
                {log.length > 0 ? (
                  <div className="mt-4">
                    <ScoreChart points={chartPoints} objectives={objectives} />
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg bg-[var(--bg-warm)] px-4 py-6 text-center text-sm text-[var(--text-dim)]">
                    The graph fills in as rounds are recorded.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="space-y-6">
                <DecisionCard decision={decision} rows={card.rows} />
                <Card className="bg-white py-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                        {finished
                          ? "Topic finished"
                          : isClass
                            ? "Mentor session"
                            : "Record the result"}
                      </p>
                      {needsInput && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={randomise}
                        >
                          <Dice5 className="size-4" /> Roll as{" "}
                          {PRESET_LABEL[preset].toLowerCase()} student
                        </Button>
                      )}
                    </div>

                    {finished && (
                      <p className="mt-3 text-sm">
                        Every objective is signed off after {log.length} rounds.
                        Reset to run another student, or undo to change the
                        ending.
                      </p>
                    )}

                    {isClass && (
                      <p className="mt-3 text-sm text-[var(--text-dim)]">
                        {decision.activity === "escalate"
                          ? "The loop has stopped and named the objective. Recording a mentor class restarts the stall count and lets the loop continue."
                          : "A class writes no score. Recording it tells the loop the objective was taught, so it measures next instead of teaching again. In the sandbox it also lifts the student's hidden ability on what was taught."}
                      </p>
                    )}

                    {needsInput && (
                      <p className="mt-3 text-sm text-[var(--text-dim)]">
                        {decision.activity === "practice"
                          ? "Correct on the first try, out of the questions served. Practice ends at 5/5 anyway (hints and retries), so only the first answer carries information."
                          : decision.activity === "check"
                            ? "Correct out of 5 unseen questions, no hints. 4 of 5 passes."
                            : "Correct on the first response, out of the questions served."}
                      </p>
                    )}

                    {needsInput && (
                      <div className="mt-4 space-y-2">
                        {drafts.map((d, index) => (
                          <div
                            key={d.loId}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {byId.get(d.loId)?.name ?? d.loId}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={d.questions}
                              value={d.correct}
                              onChange={(e) => {
                                const value = Math.max(
                                  0,
                                  Math.min(
                                    d.questions,
                                    Number(e.target.value) || 0,
                                  ),
                                );
                                setDrafts(
                                  drafts.map((x, i) =>
                                    i === index ? { ...x, correct: value } : x,
                                  ),
                                );
                              }}
                              className="h-8 w-14 rounded-md border border-[var(--border)] bg-white px-2 text-right font-mono text-sm"
                            />
                            <span className="w-24 font-mono text-xs text-[var(--text-dim)]">
                              / {d.questions}
                              {decision.activity === "practice"
                                ? " first try"
                                : ""}
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  d.correct / d.questions < 0.6
                                    ? "bg-[#f0a596]"
                                    : d.correct / d.questions < 0.8
                                      ? "bg-[#f3cd7a]"
                                      : "bg-[#7fcdc3]",
                                )}
                                style={{
                                  width: `${(100 * d.correct) / d.questions}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!finished && (
                      <div className="mt-5 flex items-center gap-2">
                        <Button type="button" onClick={() => record(drafts)}>
                          {isClass
                            ? decision.activity === "escalate"
                              ? "Teacher stepped in"
                              : "Mentor taught it"
                            : `Record ${ACTIVITY_LABEL[decision.activity].toLowerCase()}`}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={undo}
                          disabled={log.length === 0}
                        >
                          <Undo2 className="size-4" /> Undo last
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <RuleLadder fired={decision.rule} />
            </div>

            <ScorecardTable card={card} placement={null} />

            {log.length > 0 && <RoundLog log={log} byId={byId} />}
          </section>
        )}
      </div>
      <MethodologyButton />
    </main>
  );
}

function RoundLog({
  log,
  byId,
}: {
  log: LogEntry[];
  byId: Map<number, MasteryObjective>;
}) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-0">
        <div className="px-6 pt-5 pb-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Rounds so far
          </p>
        </div>
        <ol>
          {[...log].reverse().map((entry) => {
            const total = entry.results.reduce((s, r) => s + r.questions, 0);
            const correct = entry.results.reduce((s, r) => s + r.correct, 0);
            return (
              <li
                key={entry.round}
                className="grid grid-cols-[48px_170px_64px_minmax(0,1fr)_40px] items-center gap-3 border-t border-[var(--border)] px-6 py-2.5 text-sm"
              >
                <span className="font-mono text-xs text-[var(--text-dim)]">
                  #{entry.round}
                </span>
                <span className="font-medium">
                  {ACTIVITY_LABEL[entry.decision.activity]}
                </span>
                <span className="font-mono text-xs">
                  {total ? `${correct}/${total}` : "—"}
                </span>
                <span className="min-w-0 truncate text-[var(--text-dim)]">
                  {entry.certified.length > 0 ? (
                    <span className="rounded-md bg-[#e3f6e8] px-2 py-0.5 text-xs font-medium text-[#1c7a3a]">
                      Signed off: {entry.certified.join(", ")}
                    </span>
                  ) : (
                    entry.results
                      .map(
                        (r) =>
                          `${byId.get(r.loId)?.name.split(" ").slice(0, 4).join(" ") ?? r.loId} ${r.correct}/${r.questions}`,
                      )
                      .join(" · ") ||
                    entry.decision.targetLoIds
                      .map((id) => byId.get(id)?.name)
                      .filter(Boolean)
                      .join(", ")
                  )}
                </span>
                <span className="text-right font-mono text-[11px] text-neutral-400">
                  {entry.decision.rule}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
