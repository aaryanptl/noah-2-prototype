"use client";

import {
  ArrowRight,
  Check,
  FlaskConical,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- types --- */

type Verdict = "correct" | "incorrect" | "review";
type Tier = "blank" | "deterministic" | "accepted" | "jev" | "exhausted";

interface AttemptQuestion {
  id: string;
  question: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  category: string;
}

interface MatchResult {
  verdict: Verdict;
  tier: Tier;
  reason: string;
  probability: number | null;
  spellingSlip: number | null;
  legacyCorrect: boolean;
  jevUsed: boolean;
  jevLatencyMs: number | null;
  jevError: string | null;
}

/** One graded attempt, kept for the recap at the end. */
interface Attempt {
  question: AttemptQuestion;
  typed: string;
  referenceAnswer: string;
  result: MatchResult;
}

const GRADES = [
  { value: "", label: "Any" },
  { value: "classKG", label: "KG" },
  ...Array.from({ length: 8 }, (_, i) => ({
    value: `class${i + 1}`,
    label: `Grade ${i + 1}`,
  })),
];

/** What kind of answer the blank expects, as the question file classifies it. */
const CATEGORIES = [
  { value: "", label: "Any" },
  { value: "Number", label: "Number" },
  { value: "Fraction", label: "Fraction" },
  { value: "Text", label: "Text" },
  { value: "Alphanumeric", label: "Alphanumeric" },
];

const SET_SIZE = 8;

const TIER_LABEL: Record<Tier, string> = {
  blank: "nothing typed",
  deterministic: "normalising",
  accepted: "a known variant",
  jev: "Jev",
  exhausted: "no tier matched",
};

/** Render the blank as a visible run of underscores. */
function withVisibleBlank(text: string): string {
  return text.replace(/_{2,}/g, "______");
}

/* ----------------------------------------------------------------- page --- */

export default function FitbAttemptPage() {
  const [stage, setStage] = useState<"setup" | "attempt" | "done">("setup");
  const [grade, setGrade] = useState("class5");
  const [category, setCategory] = useState("");

  const [questions, setQuestions] = useState<AttemptQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [current, setCurrent] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "attempt" && !current) inputRef.current?.focus();
  }, [stage, current]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(SET_SIZE),
        hideAnswers: "1",
      });
      if (grade) params.set("grade", grade);
      if (category) params.set("category", category);
      const res = await fetch(`/api/fitb/questions?${params}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not load questions");
      }
      const loaded = json.data.questions as AttemptQuestion[];
      if (loaded.length === 0) {
        throw new Error("No fill-in-the-blank questions match those filters.");
      }
      setQuestions(loaded);
      setKeyConfigured(Boolean(json.data.keyConfigured));
      setIndex(0);
      setTyped("");
      setCurrent(null);
      setHistory([]);
      setStage("attempt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const question = questions[index];
    if (!question || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/fitb/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answers: [typed] }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not check that answer");
      }
      const attempt: Attempt = {
        question,
        typed,
        referenceAnswer: json.data.referenceAnswer as string,
        result: (json.data.results as MatchResult[])[0],
      };
      setCurrent(attempt);
      setHistory((prev) => [...prev, attempt]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setStage("done");
      return;
    }
    setIndex((i) => i + 1);
    setTyped("");
    setCurrent(null);
  };

  const restart = () => {
    setStage("setup");
    setQuestions([]);
    setHistory([]);
    setCurrent(null);
    setTyped("");
    setIndex(0);
    setError(null);
  };

  const tally = useMemo(() => {
    const correct = history.filter(
      (a) => a.result.verdict === "correct",
    ).length;
    const legacy = history.filter((a) => a.result.legacyCorrect).length;
    const jev = history.filter((a) => a.result.jevUsed).length;
    return { correct, legacy, jev, total: history.length };
  }, [history]);

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Noah · FITB matching
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--heading)]">
              Answer it like a student
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-dim)]">
              Real blanks from the question bank. Type what you'd type, and see
              whether Jev agrees you got it right — and whether today's grader
              would have.
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
              href="/fitb/bench"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--heading)]/30 bg-white px-4 text-sm font-medium text-[var(--heading)] transition hover:bg-[var(--heading)] hover:text-white"
            >
              <FlaskConical className="size-4" />
              Bench
            </Link>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-lg border border-[#f3c9bf] bg-[#fdebe7] px-4 py-3 text-sm text-[#b8432c]">
            {error}
          </p>
        )}

        {!keyConfigured && stage !== "setup" && (
          <p className="mt-6 rounded-lg border border-[#f0dcae] bg-[#fff3d6] px-4 py-3 text-sm text-[#9a6200]">
            No TypeSafe key in the environment, so Jev can't run. Anything
            normalising cannot settle will come back wrong with a note. Add{" "}
            <code className="font-mono text-xs">TYPESAFE_API_KEY</code> to
            .env.local and restart.
          </p>
        )}

        {stage === "setup" && (
          <Setup
            grade={grade}
            category={category}
            loading={loading}
            onGrade={setGrade}
            onCategory={setCategory}
            onStart={() => void start()}
          />
        )}

        {stage === "attempt" && questions[index] && (
          <section className="mt-8 space-y-6">
            <Progress
              index={index}
              ids={questions.map((q) => q.id)}
              tally={tally}
            />
            <QuestionCard
              question={questions[index]}
              typed={typed}
              onTyped={setTyped}
              onSubmit={() => void submit()}
              checking={checking}
              locked={current !== null}
              inputRef={inputRef}
            />
            {current && (
              <>
                <VerdictCard attempt={current} />
                <div className="flex justify-end">
                  <Button className="h-11 px-5" onClick={next}>
                    {index + 1 >= questions.length ? "See results" : "Next"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {stage === "done" && (
          <Results history={history} tally={tally} onRestart={restart} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ components -- */

function Setup({
  grade,
  category,
  loading,
  onGrade,
  onCategory,
  onStart,
}: {
  grade: string;
  category: string;
  loading: boolean;
  onGrade: (v: string) => void;
  onCategory: (v: string) => void;
  onStart: () => void;
}) {
  return (
    <Card className="mt-8 bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          Pick your set
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Grade">
            <Chips options={GRADES} value={grade} onChange={onGrade} />
          </Field>
          <Field label="Answer">
            <Chips
              options={CATEGORIES}
              value={category}
              onChange={onCategory}
            />
          </Field>
        </div>
        <p className="mt-4 text-xs text-[var(--text-dim)]">
          Blanks are a 50-per-grade sample of the FITB bank. "Answer" is what
          the question file says the blank expects — Text and Alphanumeric are
          the ones where wording can differ, so those are where Jev earns its
          place.
        </p>
        <Button className="mt-6 h-11 px-5" onClick={onStart} disabled={loading}>
          {loading ? "Loading…" : `Start ${SET_SIZE} questions`}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

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
  ids,
  tally,
}: {
  index: number;
  ids: string[];
  tally: { correct: number; total: number };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-xs text-[var(--text-dim)]">
        Question {index + 1} of {ids.length}
      </p>
      <p className="font-mono text-xs text-[var(--text-dim)]">
        {tally.correct}/{tally.total} right so far
      </p>
      <div className="flex w-full gap-1">
        {ids.map((id, i) => (
          <div
            key={id}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < index
                ? "bg-[var(--heading)]"
                : i === index
                  ? "bg-[var(--heading)]/40"
                  : "bg-[var(--border)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  typed,
  onTyped,
  onSubmit,
  checking,
  locked,
  inputRef,
}: {
  question: AttemptQuestion;
  typed: string;
  onTyped: (v: string) => void;
  onSubmit: () => void;
  checking: boolean;
  locked: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          {question.topic} · {question.difficulty} · {question.category}
        </p>
        <p className="mt-3 text-lg leading-relaxed text-[var(--text)]">
          {withVisibleBlank(question.question)}
        </p>
        <form
          className="mt-5 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Input
            ref={inputRef}
            value={typed}
            onChange={(e) => onTyped(e.target.value)}
            placeholder="Your answer"
            disabled={locked || checking}
            className="h-11 max-w-xs bg-white text-base"
          />
          {!locked && (
            <Button
              type="submit"
              className="h-11 px-5"
              disabled={checking || typed.trim() === ""}
            >
              {checking ? "Checking…" : "Check"}
              <Sparkles className="size-4" />
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function VerdictCard({ attempt }: { attempt: Attempt }) {
  const { result, referenceAnswer } = attempt;
  const correct = result.verdict === "correct";
  const review = result.verdict === "review";

  const tone = correct
    ? "border-[#bfe5de] bg-[#f2fbf9]"
    : review
      ? "border-[#f0dcae] bg-[#fffaf0]"
      : "border-[#f3c9bf] bg-[#fdf6f4]";

  const headline = correct
    ? "Correct"
    : review
      ? "Too close to call"
      : "Not quite";

  // The moment worth showing the team: the cascade and today's grader disagree.
  const rescued = correct && !result.legacyCorrect;

  return (
    <div className={cn("rounded-xl border px-5 py-4", tone)}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-semibold",
            correct
              ? "bg-[#dff5f2] text-[#0f6b62]"
              : review
                ? "bg-[#fff3d6] text-[#9a6200]"
                : "bg-[#fdebe7] text-[#b8432c]",
          )}
        >
          {correct ? (
            <Check className="size-3.5" />
          ) : (
            <X className="size-3.5" />
          )}
          {headline}
        </span>
        <span className="text-sm text-[var(--text-dim)]">
          Answer key:{" "}
          <span className="font-mono font-semibold text-[var(--heading)]">
            {referenceAnswer || "—"}
          </span>
        </span>
      </div>

      <p className="mt-3 text-sm text-[var(--text)]">{result.reason}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-dim)]">
        <span>
          Settled by{" "}
          <span className="font-medium text-[var(--text)]">
            {TIER_LABEL[result.tier]}
          </span>
        </span>
        {result.probability !== null && (
          <span className="font-mono">
            equivalence {Math.round(result.probability * 100)}%
          </span>
        )}
        {result.spellingSlip !== null && result.spellingSlip >= 0.5 && (
          <span className="font-mono">
            spelling slip {Math.round(result.spellingSlip * 100)}%
          </span>
        )}
        {result.jevLatencyMs !== null && (
          <span className="font-mono text-neutral-400">
            {result.jevLatencyMs}ms
          </span>
        )}
      </div>

      {rescued && (
        <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-[var(--heading)]">
          Today's grader would have marked this wrong.
        </p>
      )}
      {!correct && result.legacyCorrect && (
        <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-[#b8432c]">
          Today's grader would have accepted this — worth a look, the cascade is
          stricter here.
        </p>
      )}
      {result.jevError && (
        <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-[#9a6200]">
          {result.jevError}
        </p>
      )}
    </div>
  );
}

function Results({
  history,
  tally,
  onRestart,
}: {
  history: Attempt[];
  tally: { correct: number; legacy: number; jev: number; total: number };
  onRestart: () => void;
}) {
  const rescued = history.filter(
    (a) => a.result.verdict === "correct" && !a.result.legacyCorrect,
  ).length;

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-white px-5 py-4">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {[
            { label: "your score", value: `${tally.correct}/${tally.total}` },
            {
              label: "today's grader would give",
              value: `${tally.legacy}/${tally.total}`,
            },
            { label: "rescued by the cascade", value: String(rescued) },
            { label: "needed Jev", value: String(tally.jev) },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-mono text-xl font-semibold text-[var(--heading)]">
                {s.value}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Card className="bg-white py-0">
        <CardContent className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Your attempt
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {history.map((a, i) => (
              <li
                key={`${a.question.id}-${i}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3"
              >
                <span className="w-5 shrink-0 font-mono text-xs text-[var(--text-dim)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-dim)]">
                  {withVisibleBlank(a.question.question)}
                </span>
                <span className="font-mono text-xs">
                  <span
                    className={cn(
                      a.result.verdict === "correct"
                        ? "text-[#0f6b62]"
                        : "text-[#b8432c]",
                    )}
                  >
                    {a.typed.trim() || "(blank)"}
                  </span>
                  <span className="text-neutral-400"> · key </span>
                  <span className="text-[var(--heading)]">
                    {a.referenceAnswer}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tracking-wide text-[var(--text-dim)]">
                  {TIER_LABEL[a.result.tier]}
                </span>
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
