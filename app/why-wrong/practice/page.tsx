"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  RotateCcw,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Judgement } from "@/lib/why-wrong/classify";
import {
  BAND_LABEL,
  DEFAULT_POLICY,
  type DifficultyBand,
  drops,
  REASON_LABEL,
  reasonAwareSignal,
  replayPath,
  SEED_BAND,
  SEED_COUNT,
  todaySignal,
  type Verdict,
} from "@/lib/why-wrong/ladder";
import type {
  PracticeEvent,
  PracticeMix,
  PracticeQuestion,
  PracticeTopic,
} from "@/lib/why-wrong/practice";

import {
  BandPath,
  type PathRow,
  REASON_CLASS,
  secs,
  Verdicts,
} from "../shared";
import {
  type LadderDecision,
  type Processing,
  ProcessingPanel,
  VerdictChip,
} from "./processing";

/* ---------------------------------------------------------------- setup --- */

const GRADES = [
  { value: "classKG", label: "KG" },
  ...Array.from({ length: 8 }, (_, i) => ({
    value: `class${i + 1}`,
    label: `Grade ${i + 1}`,
  })),
];

const TYPES: Array<{ value: PracticeMix; label: string }> = [
  { value: "mcq", label: "Multiple choice" },
  { value: "fitb", label: "Fill the blank" },
  { value: "mixed", label: "Mixed" },
];

const LENGTHS = [
  { value: "6", label: "6" },
  { value: "10", label: "10" },
  { value: "15", label: "15" },
];

/** One answered question, kept for the ladder and the recap. */
interface Answered {
  question: PracticeQuestion;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  options: Array<{ text: string; correct: boolean }>;
  verdict: Verdict;
  judgement: Judgement | null;
  timeTakenMs: number;
}

type ResultEvent = Extract<PracticeEvent, { kind: "result" }>;

function withVisibleBlank(text: string): string {
  return text.replace(/_{2,}/g, "______");
}

/* ----------------------------------------------------------------- page --- */

export default function WhyWrongPracticePage() {
  const [stage, setStage] = useState<"setup" | "attempt" | "done">("setup");

  const [grade, setGrade] = useState("class5");
  const [type, setType] = useState<PracticeMix>("mcq");
  const [length, setLength] = useState("10");
  const [topics, setTopics] = useState<PracticeTopic[]>([]);
  const [topic, setTopic] = useState("");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(true);

  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [served, setServed] = useState<string[]>([]);
  const [shownAt, setShownAt] = useState(0);
  const [now, setNow] = useState(0);
  const [choice, setChoice] = useState("");
  const [typed, setTyped] = useState("");

  const [processing, setProcessing] = useState<Processing | null>(null);
  const [result, setResult] = useState<ResultEvent | null>(null);
  const [history, setHistory] = useState<Answered[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* topics for the chosen grade and type */
  useEffect(() => {
    if (stage !== "setup") return;
    let cancelled = false;
    setTopicsLoading(true);
    fetch(`/api/why-wrong/practice/topics?grade=${grade}&type=${type}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const list: PracticeTopic[] = json.success ? json.data.topics : [];
        setTopics(list);
        setKeyConfigured(Boolean(json.data?.jevConfigured));
        setTopic((prev) =>
          list.some((t) => t.topic === prev) ? prev : (list[0]?.topic ?? ""),
        );
        if (!json.success) setError(json.error?.message ?? "No topics");
      })
      .catch(() => !cancelled && setTopics([]))
      .finally(() => !cancelled && setTopicsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [grade, type, stage]);

  /* the clock the student is being timed on */
  const answering = stage === "attempt" && question !== null && !processing;
  useEffect(() => {
    if (!answering) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [answering]);

  useEffect(() => {
    if (answering && question?.type === "fitb") inputRef.current?.focus();
  }, [answering, question]);

  /* ------------------------------------------------------------ ladder --- */

  const ladder = useMemo(() => {
    const todaySignals = history.map((h) => todaySignal(h.verdict));
    const decided = history.map((h) =>
      reasonAwareSignal(
        h.verdict,
        h.judgement && !h.judgement.error
          ? {
              realGap: h.judgement.realGap ?? undefined,
              luckyGuess: h.judgement.luckyGuess ?? undefined,
            }
          : null,
        DEFAULT_POLICY,
      ),
    );
    const proposedSignals = decided.map((d) => d.signal);
    const todayFull = replayPath([...todaySignals, null], SEED_BAND);
    const proposedFull = replayPath([...proposedSignals, null], SEED_BAND);
    const nextToday = (todayFull.at(-1) ?? SEED_BAND) as DifficultyBand;
    const nextProposed = (proposedFull.at(-1) ?? SEED_BAND) as DifficultyBand;
    return {
      todaySignals,
      proposedSignals,
      decided,
      todayPath: todayFull.slice(0, history.length),
      proposedPath: proposedFull.slice(0, history.length),
      nextToday,
      nextProposed,
    };
  }, [history]);

  const lastDecision: LadderDecision | null = useMemo(() => {
    if (!result || history.length === 0) return null;
    const i = history.length - 1;
    return {
      today: ladder.todaySignals[i] ?? null,
      proposed: ladder.proposedSignals[i] ?? null,
      changed: ladder.decided[i]?.changed ?? false,
      fellBack: ladder.decided[i]?.fellBack ?? false,
      nextToday: ladder.nextToday,
      nextProposed: ladder.nextProposed,
      inSeed: history.length < SEED_COUNT,
    };
  }, [result, history, ladder]);

  /* ----------------------------------------------------------- actions --- */

  const fetchQuestion = useCallback(
    async (band: DifficultyBand, exclude: string[]) => {
      const res = await fetch("/api/why-wrong/practice/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, topic, type, band, exclude }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not load a question");
      }
      return json.data.question as PracticeQuestion;
    },
    [grade, topic, type],
  );

  const showQuestion = (q: PracticeQuestion, exclude: string[]) => {
    setQuestion(q);
    setServed([...exclude, q.id]);
    setChoice("");
    setTyped("");
    setProcessing(null);
    setResult(null);
    setShownAt(Date.now());
    setNow(Date.now());
  };

  const start = async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    try {
      const q = await fetchQuestion(SEED_BAND, []);
      setHistory([]);
      showQuestion(q, []);
      setStage("attempt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (skip = false) => {
    if (!question || processing) return;
    const answer = skip ? "" : question.type === "mcq" ? choice : typed;
    const timeTakenMs = Date.now() - shownAt;
    setError(null);
    setProcessing({ steps: {}, judgement: null, finished: false });

    try {
      const res = await fetch("/api/why-wrong/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          answer,
          timeTakenMs,
          ordinal: history.length + 1,
        }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null);
        throw new Error(
          json?.error?.message ?? `Request failed (${res.status})`,
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let final: ResultEvent | null = null;

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as PracticeEvent;
          if (event.kind === "error") throw new Error(event.message);
          if (event.kind === "step") {
            const { kind: _kind, step, ...rest } = event;
            setProcessing((p) =>
              p
                ? {
                    ...p,
                    steps: {
                      ...p.steps,
                      // keep what `running` said (the questions asked) when `done` lands
                      [step]: { ...p.steps[step], ...rest },
                    },
                  }
                : p,
            );
          } else {
            final = event;
          }
        }
      }

      if (!final) throw new Error("The analysis ended without a result.");
      const done = final;
      setProcessing((p) =>
        p ? { ...p, judgement: done.judgement, finished: true } : p,
      );
      setResult(done);
      setHistory((prev) => [
        ...prev,
        {
          question,
          studentAnswer: done.studentAnswer,
          correctAnswer: done.correctAnswer,
          explanation: done.explanation,
          options: done.options,
          verdict: done.verdict,
          judgement: done.judgement,
          timeTakenMs,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setProcessing(null);
    }
  };

  const next = async () => {
    if (history.length >= Number(length)) {
      setStage("done");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = await fetchQuestion(ladder.nextProposed, served);
      showQuestion(q, served);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStage("setup");
    setQuestion(null);
    setServed([]);
    setHistory([]);
    setProcessing(null);
    setResult(null);
    setError(null);
  };

  const elapsed = Math.max(0, now - shownAt);
  const total = Number(length);

  /* ------------------------------------------------------------ render --- */

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Noah · Why the answer was wrong
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--heading)]">
              Answer it like a student
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-dim)]">
              Real questions from the bank. Answer them however you like —
              right, wrong on purpose, rushed — and watch Jev work out{" "}
              <em>why</em> a wrong answer went wrong, and what that does to the
              next question&rsquo;s difficulty.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stage !== "setup" && (
              <Button variant="ghost" className="h-10" onClick={restart}>
                <RotateCcw className="size-4" />
                Start over
              </Button>
            )}
            <Link
              href="/why-wrong"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--heading)]/30 bg-white px-4 text-sm font-medium text-[var(--heading)] transition hover:bg-[var(--heading)] hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Real sessions
            </Link>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-lg border border-[#f3c9bf] bg-[#fdebe7] px-4 py-3 text-sm text-[#b8432c]">
            {error}
          </p>
        )}

        {!keyConfigured && (
          <p className="mt-6 rounded-lg border border-[#f0dcae] bg-[#fff3d6] px-4 py-3 text-sm text-[#9a6200]">
            No <code className="font-mono text-xs">TYPESAFE_API_KEY</code> in
            the environment, so Jev can&rsquo;t run. Answers will still be
            graded, and the ladder will fall back to today&rsquo;s rule.
          </p>
        )}

        {stage === "setup" && (
          <Card className="mt-8 bg-white py-0">
            <CardContent className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                Pick your set
              </p>
              <div className="mt-4 space-y-4">
                <Field label="Grade">
                  <Chips options={GRADES} value={grade} onChange={setGrade} />
                </Field>
                <Field label="Type">
                  <Chips
                    options={TYPES}
                    value={type}
                    onChange={(v) => setType(v as PracticeMix)}
                  />
                </Field>
                <Field label="Topic">
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={topicsLoading || topics.length === 0}
                    className="h-9 min-w-0 max-w-full flex-1 rounded-md border border-[var(--border)] bg-white px-3 text-sm sm:max-w-md"
                  >
                    {topicsLoading && <option>Loading topics…</option>}
                    {!topicsLoading && topics.length === 0 && (
                      <option>No topics with every difficulty</option>
                    )}
                    {!topicsLoading &&
                      topics.map((t) => (
                        <option key={t.topic} value={t.topic}>
                          {t.topic} ({t.count})
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Length">
                  <Chips
                    options={LENGTHS}
                    value={length}
                    onChange={setLength}
                  />
                </Field>
              </div>

              <div className="mt-5 space-y-1.5 text-xs text-[var(--text-dim)]">
                <p>
                  Questions come from files/mcq_fixed.csv and
                  files/fitb_fixed.csv. The set is adaptive: the first{" "}
                  {SEED_COUNT} sit at Medium, then each answer moves the next
                  one — using the reason-aware rule, with today&rsquo;s rule
                  shown next to it.
                </p>
                <p>
                  Things worth trying: pick a wrong option instantly (a guess),
                  make a one-digit slip on a sum you know, answer a different
                  question from the one asked, or skip.
                </p>
              </div>

              <Button
                className="mt-6 h-11 px-5"
                onClick={() => void start()}
                disabled={loading || !topic || topicsLoading}
              >
                {loading ? "Loading…" : `Start ${length} questions`}
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {stage === "attempt" && question && (
          <section className="mt-8 space-y-6">
            <Progress
              index={history.length - (result ? 1 : 0)}
              total={total}
              history={history}
              band={question.band}
              nextToday={ladder.nextToday}
              nextProposed={ladder.nextProposed}
              answered={result !== null}
            />

            <QuestionCard
              question={question}
              choice={choice}
              onChoice={setChoice}
              typed={typed}
              onTyped={setTyped}
              locked={processing !== null}
              result={result}
              elapsedMs={processing ? null : elapsed}
              onSubmit={() => void submit(false)}
              onSkip={() => void submit(true)}
              inputRef={inputRef}
            />

            {processing && (
              <ProcessingPanel processing={processing} ladder={lastDecision} />
            )}

            {result && (
              <div className="flex justify-end">
                <Button
                  className="h-11 px-5"
                  onClick={() => void next()}
                  disabled={loading}
                >
                  {history.length >= total
                    ? "See results"
                    : loading
                      ? "Loading…"
                      : `Next · ${BAND_LABEL[ladder.nextProposed]}`}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </section>
        )}

        {stage === "done" && (
          <Results history={history} ladder={ladder} onRestart={restart} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ components -- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="w-16 shrink-0 text-sm text-[var(--text-dim)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition",
            value === o.value
              ? "bg-[var(--heading)] text-white"
              : "text-[var(--text-dim)] hover:bg-black/5",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Progress({
  index,
  total,
  history,
  band,
  nextToday,
  nextProposed,
  answered,
}: {
  index: number;
  total: number;
  history: Answered[];
  band: DifficultyBand;
  nextToday: DifficultyBand;
  nextProposed: DifficultyBand;
  answered: boolean;
}) {
  const right = history.filter((h) => h.verdict === "correct").length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-[var(--text-dim)]">
          Question {index + 1} of {total} · served at{" "}
          <span className="font-semibold text-[var(--heading)]">
            {BAND_LABEL[band]}
          </span>
        </p>
        <p className="font-mono text-xs text-[var(--text-dim)]">
          {right}/{history.length} right
          {answered && nextToday !== nextProposed && (
            <> · today would serve {BAND_LABEL[nextToday]} next</>
          )}
          {answered && nextToday === nextProposed && (
            <> · next at {BAND_LABEL[nextProposed]}</>
          )}
        </p>
      </div>
      <div className="flex w-full gap-1">
        {Array.from({ length: total }, (_, i) => `slot-${i}`).map((slot, i) => {
          const h = history[i];
          return (
            <div
              key={slot}
              className={cn(
                "h-1 flex-1 rounded-full",
                h
                  ? h.verdict === "correct"
                    ? "bg-[#6cc3b5]"
                    : h.verdict === "non_attempt"
                      ? "bg-neutral-300"
                      : h.judgement?.reason === "conceptual_gap"
                        ? "bg-[#e0846c]"
                        : "bg-[#f0c264]"
                  : i === index
                    ? "bg-[var(--heading)]/40"
                    : "bg-[var(--border)]",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  choice,
  onChoice,
  typed,
  onTyped,
  locked,
  result,
  elapsedMs,
  onSubmit,
  onSkip,
  inputRef,
}: {
  question: PracticeQuestion;
  choice: string;
  onChoice: (v: string) => void;
  typed: string;
  onTyped: (v: string) => void;
  locked: boolean;
  result: ResultEvent | null;
  elapsedMs: number | null;
  onSubmit: () => void;
  onSkip: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const ready = question.type === "mcq" ? choice !== "" : typed.trim() !== "";
  const correctText = result?.options.find((o) => o.correct)?.text;

  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            {question.subtopic || question.topic} ·{" "}
            {question.type === "mcq" ? "multiple choice" : "fill the blank"}
          </p>
          {elapsedMs !== null && (
            <span className="flex items-center gap-1 font-mono text-xs text-[var(--text-dim)]">
              <Clock className="size-3.5" />
              {secs(elapsedMs)}
            </span>
          )}
        </div>
        <p className="mt-3 text-lg leading-relaxed text-[var(--text)]">
          {withVisibleBlank(question.question)}
        </p>

        {question.type === "mcq" ? (
          <div className="mt-5 grid gap-2">
            {question.options.map((text) => {
              const picked = choice === text;
              const isCorrect = result && text === correctText;
              const pickedWrong = result && picked && !isCorrect;
              return (
                <button
                  key={text}
                  type="button"
                  disabled={locked}
                  onClick={() => onChoice(text)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition",
                    isCorrect
                      ? "border-[#9fd9cf] bg-[#f2fbf9] text-[#0f6b62]"
                      : pickedWrong
                        ? "border-[#f3c9bf] bg-[#fdf6f4] text-[#b8432c]"
                        : picked
                          ? "border-[var(--heading)] bg-[var(--heading)]/[0.04] text-[var(--heading)]"
                          : "border-[var(--border)] hover:border-[var(--heading)]/40",
                    locked && !isCorrect && !pickedWrong && "opacity-60",
                  )}
                >
                  <span className="min-w-0 flex-1">{text}</span>
                  {isCorrect && <Check className="size-4 shrink-0" />}
                  {pickedWrong && <X className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <Input
              ref={inputRef}
              value={typed}
              onChange={(e) => onTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ready && !locked) onSubmit();
              }}
              placeholder="Your answer"
              disabled={locked}
              className="h-11 max-w-xs bg-white text-base"
            />
            {result && (
              <p className="mt-2 text-sm text-[var(--text-dim)]">
                Answer key:{" "}
                <span className="font-mono font-semibold text-[var(--heading)]">
                  {result.correctAnswer}
                </span>
              </p>
            )}
          </div>
        )}

        {!locked && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button className="h-11 px-5" onClick={onSubmit} disabled={!ready}>
              Submit
              <Sparkles className="size-4" />
            </Button>
            <Button variant="ghost" className="h-11" onClick={onSkip}>
              <SkipForward className="size-4" />
              Skip
            </Button>
          </div>
        )}

        {result?.explanation && (
          <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--text-dim)]">
            {result.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Results({
  history,
  ladder,
  onRestart,
}: {
  history: Answered[];
  ladder: {
    todaySignals: ReturnType<typeof todaySignal>[];
    proposedSignals: ReturnType<typeof todaySignal>[];
    decided: Array<{ changed: boolean; fellBack: boolean }>;
    todayPath: DifficultyBand[];
    proposedPath: DifficultyBand[];
    nextToday: DifficultyBand;
    nextProposed: DifficultyBand;
  };
  onRestart: () => void;
}) {
  const wrong = history.filter(
    (h) => h.verdict === "incorrect" || h.verdict === "partial",
  ).length;
  const notGaps = history.filter(
    (h) =>
      h.judgement?.realGap !== null &&
      h.judgement?.realGap !== undefined &&
      h.judgement.realGap < DEFAULT_POLICY.gapThreshold,
  ).length;
  const luckyGuesses = ladder.decided.filter(
    (d, i) => history[i]?.verdict === "correct" && d.changed,
  ).length;
  const guessScores = history
    .map((h) => h.judgement?.luckyGuess)
    .filter((v): v is number => typeof v === "number");
  const pathRows: PathRow[] = history.map((h, i) => ({
    ordinal: i + 1,
    verdict: h.verdict,
    reason: h.judgement?.reason ?? null,
    used: ladder.decided[i]?.changed ?? false,
  }));

  return (
    <section className="mt-8 space-y-6">
      <Verdicts
        wrong={wrong}
        notGaps={notGaps}
        dropsToday={drops(ladder.todaySignals)}
        dropsProposed={drops(ladder.proposedSignals)}
        endToday={ladder.nextToday}
        endProposed={ladder.nextProposed}
        luckyGuesses={luckyGuesses}
        maxGuess={guessScores.length > 0 ? Math.max(...guessScores) : null}
      />
      <BandPath
        today={ladder.todayPath}
        proposed={ladder.proposedPath}
        rows={pathRows}
      />

      <Card className="bg-white py-0">
        <CardContent className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Your answers
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {history.map((h, i) => (
              <li key={`${h.question.id}-${i}`} className="py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-5 shrink-0 font-mono text-xs text-[var(--text-dim)]">
                    {i + 1}
                  </span>
                  <VerdictChip verdict={h.verdict} />
                  {h.judgement?.reason && (
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        REASON_CLASS[h.judgement.reason],
                      )}
                    >
                      {REASON_LABEL[h.judgement.reason]}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-[var(--text-dim)]">
                    {BAND_LABEL[h.question.band]} · {secs(h.timeTakenMs)}
                    {h.judgement?.realGap !== null &&
                      h.judgement?.realGap !== undefined &&
                      ` · gap ${Math.round(h.judgement.realGap * 100)}%`}
                    {h.judgement?.luckyGuess !== null &&
                      h.judgement?.luckyGuess !== undefined &&
                      ` · guess ${Math.round(h.judgement.luckyGuess * 100)}%`}
                  </span>
                  {ladder.decided[i]?.changed && (
                    <span className="font-mono text-[11px] text-[var(--heading)]">
                      rules disagree
                    </span>
                  )}
                </div>
                <p className="mt-1.5 pl-8 text-sm text-[var(--text-dim)]">
                  {withVisibleBlank(h.question.question)}
                </p>
                <p className="mt-1 pl-8 font-mono text-xs">
                  <span
                    className={
                      h.verdict === "correct"
                        ? "text-[#0f6b62]"
                        : "text-[#b8432c]"
                    }
                  >
                    {h.studentAnswer.trim() || "(skipped)"}
                  </span>
                  {h.verdict !== "correct" && (
                    <>
                      <span className="text-neutral-400"> · key </span>
                      <span className="text-[var(--heading)]">
                        {h.correctAnswer}
                      </span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="h-11 px-5" onClick={onRestart}>
          <RotateCcw className="size-4" />
          Another set
        </Button>
      </div>
    </section>
  );
}
