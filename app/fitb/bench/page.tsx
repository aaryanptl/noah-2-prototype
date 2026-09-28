"use client";

import {
  Check,
  GraduationCap,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { formattingVariants } from "../variants";

/* ---------------------------------------------------------------- types --- */

type Strictness = "semantic" | "spelling-sensitive" | "exact";
type Verdict = "correct" | "incorrect" | "review";
type Tier = "blank" | "deterministic" | "accepted" | "jev" | "exhausted";

interface BenchQuestion {
  id: string;
  question: string;
  referenceAnswer: string;
  acceptableAnswers: string[];
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  category: string;
  defaultStrictness: Strictness;
}

interface MatchResult {
  verdict: Verdict;
  tier: Tier;
  basis: string | null;
  reason: string;
  probability: number | null;
  spellingSlip: number | null;
  legacyCorrect: boolean;
  normalized: { student: { raw: string } };
  jevUsed: boolean;
  jevLatencyMs: number | null;
  jevModel: string | null;
  jevError: string | null;
  totalLatencyMs: number;
}

interface CheckResponse {
  results: MatchResult[];
}

/* --------------------------------------------------------------- labels --- */

const TIERS: Array<{ id: Tier; name: string; condition: string }> = [
  {
    id: "deterministic",
    name: "Normalize",
    condition: "case, spacing, symbols, units, numeric value",
  },
  {
    id: "accepted",
    name: "Accepted",
    condition: "a variant this blank already confirmed",
  },
  { id: "jev", name: "Jev", condition: "same answer, different words" },
  {
    id: "exhausted",
    name: "No match",
    condition: "nothing above it agreed",
  },
];

const STRICTNESS_LABEL: Record<Strictness, { name: string; hint: string }> = {
  semantic: {
    name: "Semantic",
    hint: "Wording and spelling may differ. Maths, science.",
  },
  "spelling-sensitive": {
    name: "Spelling counts",
    hint: "Wording may differ, spelling may not. English vocabulary.",
  },
  exact: {
    name: "Exact",
    hint: "Formatting only. Spelling tests, symbols.",
  },
};

const GRADES = [
  "classKG",
  "class1",
  "class2",
  "class3",
  "class4",
  "class5",
  "class6",
  "class7",
  "class8",
] as const;

/** What kind of answer the blank expects, as the question file classifies it. */
const CATEGORIES = ["Number", "Fraction", "Text", "Alphanumeric"] as const;

function gradeLabel(value: string): string {
  if (!value) return "—";
  if (value.toLowerCase() === "classkg") return "KG";
  return value.replace(/^class/i, "Grade ");
}

/* ----------------------------------------------------------------- page --- */

export default function FitbPage() {
  const [questions, setQuestions] = useState<BenchQuestion[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [category, setCategory] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [picked, setPicked] = useState<BenchQuestion | null>(null);
  const [strictness, setStrictness] = useState<Strictness>("semantic");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(true);

  const loadQuestions = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (category) params.set("category", category);
      if (grade) params.set("grade", grade);
      if (search) params.set("search", search);
      const res = await fetch(`/api/fitb/questions?${params}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not load questions");
      }
      setQuestions(json.data.questions as BenchQuestion[]);
      setKeyConfigured(Boolean(json.data.keyConfigured));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setQuestions([]);
    } finally {
      setListLoading(false);
    }
  }, [category, grade, search]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const pick = (q: BenchQuestion) => {
    setPicked(q);
    setStrictness(q.defaultStrictness);
    setCandidates(formattingVariants(q.referenceAnswer).slice(0, 6));
    setResults(null);
    setDraft("");
    setError(null);
  };

  const addCandidate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || candidates.includes(trimmed) || candidates.length >= 12) {
      return;
    }
    setCandidates((prev) => [...prev, trimmed]);
    setResults(null);
  };

  const grade_ = async () => {
    if (!picked || candidates.length === 0) return;
    setGrading(true);
    setError(null);
    try {
      const res = await fetch("/api/fitb/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: picked.id,
          strictness,
          answers: candidates,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not grade the answers");
      }
      setResults((json.data as CheckResponse).results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGrading(false);
    }
  };

  const summary = useMemo(() => {
    if (!results) return null;
    const rescued = results.filter(
      (r) => r.verdict === "correct" && !r.legacyCorrect,
    ).length;
    const review = results.filter((r) => r.verdict === "review").length;
    const jevCalls = results.filter((r) => r.jevUsed).length;
    const jevLatency = results
      .filter((r) => r.jevLatencyMs !== null)
      .map((r) => r.jevLatencyMs as number);
    return {
      total: results.length,
      rescued,
      review,
      jevCalls,
      avgJevMs: jevLatency.length
        ? Math.round(jevLatency.reduce((a, b) => a + b, 0) / jevLatency.length)
        : null,
      error: results.find((r) => r.jevError)?.jevError ?? null,
    };
  }, [results]);

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Noah · FITB matching · Bench
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--heading)]">
              Is this answer actually wrong?
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-dim)]">
              Grade many variants of one blank at once. To answer questions one
              at a time as a student would,{" "}
              <Link
                href="/fitb"
                className="font-medium text-[var(--heading)] underline-offset-2 hover:underline"
              >
                take the attempt
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            {picked && (
              <Button
                variant="ghost"
                className="h-10"
                onClick={() => {
                  setPicked(null);
                  setResults(null);
                }}
              >
                <RotateCcw className="size-4" />
                Pick another blank
              </Button>
            )}
            <Link
              href="/fitb"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--heading)]/30 bg-white px-4 text-sm font-medium text-[var(--heading)] transition hover:bg-[var(--heading)] hover:text-white"
            >
              <GraduationCap className="size-4" />
              Attempt
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
            No TypeSafe key in the environment, so tier 3 cannot run — the first
            two tiers still grade normally and anything that needs Jev comes
            back wrong with a note. Add{" "}
            <code className="font-mono text-xs">TYPESAFE_API_KEY</code> to
            .env.local and restart.
          </p>
        )}

        {!picked && (
          <QuestionPicker
            questions={questions}
            loading={listLoading}
            category={category}
            grade={grade}
            searchInput={searchInput}
            onCategory={setCategory}
            onGrade={setGrade}
            onSearchInput={setSearchInput}
            onSearch={() => setSearch(searchInput.trim())}
            onPick={pick}
          />
        )}

        {picked && (
          <section className="mt-8 space-y-6">
            <QuestionBar question={picked} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <Card className="bg-white py-0">
                <CardContent className="p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                    Student answers to try
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-dim)]">
                    Seeded with formatting variants of the key. Add the wording
                    ones yourself — those are what the semantic tier is for.
                  </p>

                  <form
                    className="mt-4 flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addCandidate(draft);
                      setDraft("");
                    }}
                  >
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="e.g. one fourth"
                      className="h-10 bg-white"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      className="h-10 shrink-0"
                      disabled={!draft.trim() || candidates.length >= 12}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </form>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {candidates.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-warm)] py-1 pr-1 pl-2.5 font-mono text-xs"
                      >
                        {c === c.trim() ? c : `"${c}"`}
                        <button
                          type="button"
                          aria-label={`Remove ${c}`}
                          onClick={() => {
                            setCandidates((p) => p.filter((x) => x !== c));
                            setResults(null);
                          }}
                          className="rounded p-0.5 text-[var(--text-dim)] transition hover:bg-black/5 hover:text-[var(--text)]"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    {candidates.length === 0 && (
                      <p className="text-sm text-[var(--text-dim)]">
                        Nothing queued yet.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button
                      className="h-10"
                      onClick={() => void grade_()}
                      disabled={grading || candidates.length === 0}
                    >
                      <Sparkles className="size-4" />
                      {grading
                        ? "Grading…"
                        : `Grade ${candidates.length} answer${candidates.length === 1 ? "" : "s"}`}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10"
                      onClick={() => {
                        setCandidates(
                          formattingVariants(picked.referenceAnswer).slice(
                            0,
                            6,
                          ),
                        );
                        setResults(null);
                      }}
                    >
                      Reset list
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <StrictnessCard
                value={strictness}
                onChange={(v) => {
                  setStrictness(v);
                  setResults(null);
                }}
                suggested={picked.defaultStrictness}
              />
            </div>

            {summary && <SummaryStrip summary={summary} />}
            {results && <ResultsTable results={results} />}
            {results && <TierLadder results={results} />}
          </section>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ components -- */

function QuestionPicker({
  questions,
  loading,
  category,
  grade,
  searchInput,
  onCategory,
  onGrade,
  onSearchInput,
  onSearch,
  onPick,
}: {
  questions: BenchQuestion[];
  loading: boolean;
  category: string;
  grade: string;
  searchInput: string;
  onCategory: (v: string) => void;
  onGrade: (v: string) => void;
  onSearchInput: (v: string) => void;
  onSearch: () => void;
  onPick: (q: BenchQuestion) => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-[var(--heading)]">
          Fill-in-the-blank questions in the bank
        </h2>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <Chips
            options={[
              { value: "", label: "All answers" },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            value={category}
            onChange={onCategory}
          />
          <Chips
            options={[
              { value: "", label: "All grades" },
              ...GRADES.map((g) => ({ value: g, label: gradeLabel(g) })),
            ]}
            value={grade}
            onChange={onGrade}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <Input
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              placeholder="Search text"
              className="h-9 w-44 bg-white pl-9 text-sm"
            />
          </div>
        </form>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[var(--text-dim)]">Loading blanks…</p>
      ) : questions.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-dim)]">
          No fill-in-the-blank questions match those filters.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onPick(q)}
              className="group rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:border-[var(--heading)]/30 hover:shadow-sm"
            >
              <p className="line-clamp-3 text-sm text-[var(--text)]">
                {q.question}
              </p>
              <p className="mt-3 font-mono text-xs text-[var(--heading)]">
                key: {q.referenceAnswer}
              </p>
              <p className="mt-2 truncate text-xs text-[var(--text-dim)]">
                {q.topic} · {gradeLabel(q.grade)} · {q.difficulty} ·{" "}
                {q.category}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
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

function QuestionBar({ question }: { question: BenchQuestion }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-5 py-4">
      <p className="text-sm text-[var(--text)]">{question.question}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-[var(--text-dim)]">
        <span className="font-mono text-sm font-semibold text-[var(--heading)]">
          key: {question.referenceAnswer}
        </span>
        <span>{question.subject}</span>
        <span>{gradeLabel(question.grade)}</span>
        <span className="truncate">{question.topic}</span>
        <span>{question.difficulty}</span>
        <span>{question.category}</span>
        <span className="text-neutral-400">
          {question.acceptableAnswers.length} authored variant
          {question.acceptableAnswers.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function StrictnessCard({
  value,
  onChange,
  suggested,
}: {
  value: Strictness;
  onChange: (v: Strictness) => void;
  suggested: Strictness;
}) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          How strict is this blank?
        </p>
        <div className="mt-3 space-y-1">
          {(Object.keys(STRICTNESS_LABEL) as Strictness[]).map((key) => {
            const active = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={cn(
                  "flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-sm transition",
                  active
                    ? "bg-[var(--heading)] text-white"
                    : "text-[var(--text-dim)] hover:bg-black/5",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    active ? "text-white" : "text-[var(--text)]",
                  )}
                >
                  {STRICTNESS_LABEL[key].name}
                </span>
                <span className="truncate text-xs">
                  {STRICTNESS_LABEL[key].hint}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Suggested for this subject: {STRICTNESS_LABEL[suggested].name}. In
          production this rides on the question, not the page.
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryStrip({
  summary,
}: {
  summary: {
    total: number;
    rescued: number;
    review: number;
    jevCalls: number;
    avgJevMs: number | null;
    error: string | null;
  };
}) {
  const stats = [
    { label: "graded", value: String(summary.total) },
    { label: "rescued from a false wrong", value: String(summary.rescued) },
    { label: "flagged for review", value: String(summary.review) },
    {
      label: "reached Jev",
      value: `${summary.jevCalls}${summary.avgJevMs !== null ? ` · ${summary.avgJevMs}ms avg` : ""}`,
    },
  ];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-5 py-4">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-mono text-xl font-semibold text-[var(--heading)]">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{s.label}</p>
          </div>
        ))}
      </div>
      {summary.error && (
        <p className="mt-4 rounded-md bg-[#fff3d6] px-3 py-2 text-xs text-[#9a6200]">
          {summary.error}
        </p>
      )}
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const style =
    verdict === "correct"
      ? "bg-[#dff5f2] text-[#0f6b62]"
      : verdict === "review"
        ? "bg-[#fff3d6] text-[#9a6200]"
        : "bg-[#fdebe7] text-[#b8432c]";
  const label =
    verdict === "correct"
      ? "Correct"
      : verdict === "review"
        ? "Review"
        : "Wrong";
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
        style,
      )}
    >
      {label}
    </span>
  );
}

function ResultsTable({ results }: { results: MatchResult[] }) {
  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          Answer by answer
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                <th className="pb-2 font-medium">Student typed</th>
                <th className="pb-2 font-medium">Today</th>
                <th className="pb-2 font-medium">Cascade</th>
                <th className="pb-2 font-medium">Settled at</th>
                <th className="pb-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const changed = (r.verdict === "correct") !== r.legacyCorrect;
                return (
                  <tr
                    key={`${r.normalized.student.raw}-${i}`}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">
                      {r.normalized.student.raw.trim() === ""
                        ? "(blank)"
                        : r.normalized.student.raw}
                    </td>
                    <td className="py-3 pr-4">
                      {r.legacyCorrect ? (
                        <Check className="size-4 text-[#0f6b62]" />
                      ) : (
                        <X className="size-4 text-[#b8432c]" />
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <VerdictPill verdict={r.verdict} />
                        {changed && (
                          <span className="font-mono text-[10px] tracking-wide text-[var(--heading)]">
                            CHANGED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--text-dim)]">
                      {TIERS.find((t) => t.id === r.tier)?.name ?? r.tier}
                      {r.probability !== null && (
                        <span className="ml-1 font-mono">
                          {Math.round(r.probability * 100)}%
                        </span>
                      )}
                      {r.jevLatencyMs !== null && (
                        <span className="ml-1 font-mono text-neutral-400">
                          {r.jevLatencyMs}ms
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-[var(--text-dim)]">
                      {r.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-[var(--text-dim)]">
          "Today" is the exact-match grader in lib/prototype-homework.ts, run on
          the same input.
        </p>
      </CardContent>
    </Card>
  );
}

function TierLadder({ results }: { results: MatchResult[] }) {
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.tier] = (acc[r.tier] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="bg-white py-0">
      <CardContent className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
          Where each answer was settled
        </p>
        <ol className="mt-3 space-y-1">
          {TIERS.map((tier, i) => {
            const count = counts[tier.id] ?? 0;
            return (
              <li
                key={tier.id}
                className={cn(
                  "flex items-baseline gap-3 rounded-md px-2 py-1 text-sm",
                  count > 0
                    ? "bg-[var(--heading)] text-white"
                    : "text-[var(--text-dim)]",
                )}
              >
                <span className="w-6 shrink-0 font-mono text-xs">{i + 1}</span>
                <span
                  className={cn(
                    "w-24 shrink-0 font-medium",
                    count > 0 ? "text-white" : "text-[var(--text)]",
                  )}
                >
                  {tier.name}
                </span>
                <span className="flex-1 truncate text-xs">
                  {tier.condition}
                </span>
                <span className="shrink-0 font-mono text-xs">{count}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Top to bottom, first match wins. Only answers that reach tier 3 cost a
          model call.
        </p>
      </CardContent>
    </Card>
  );
}
