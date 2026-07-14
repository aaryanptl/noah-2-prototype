"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Code2,
  FileQuestion,
  LoaderCircle,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatCount,
  SyllabusShell,
  titleCase,
} from "@/components/syllabus/SyllabusShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  LearningObjectiveDetail,
  QuestionPage,
  QuestionVersionPreview,
  TopicDetail,
} from "@/lib/syllabus";
import { cn } from "@/lib/utils";

interface DisplayOption {
  label: string;
  text: string;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value, null, 2);
}

function normalizeOptions(options: unknown): DisplayOption[] {
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (typeof option !== "object" || option === null) {
        return {
          label: String.fromCharCode(65 + index),
          text: displayValue(option),
        };
      }
      const record = option as Record<string, unknown>;
      return {
        label: displayValue(
          record.label ??
            record.key ??
            record.id ??
            String.fromCharCode(65 + index),
        ),
        text: displayValue(
          record.text ??
            record.value ??
            record.content ??
            record.option ??
            option,
        ),
      };
    });
  }
  if (typeof options === "object" && options !== null) {
    return Object.entries(options as Record<string, unknown>).map(
      ([label, value]) => ({ label, text: displayValue(value) }),
    );
  }
  return options ? [{ label: "A", text: displayValue(options) }] : [];
}

function QuestionCard({
  question,
  number,
}: {
  question: QuestionVersionPreview;
  number: number;
}) {
  const options = normalizeOptions(question.options);
  const correct = question.correctAnswer?.trim().toLowerCase();
  return (
    <Card className="border-0 bg-[#fffefa] shadow-[0_8px_28px_rgba(31,55,53,0.05)] ring-[#e7e3db]">
      <CardHeader className="border-b border-[#ece8e0] pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[#1f7169] font-mono text-xs font-bold text-white">
            {number}
          </span>
          <Badge variant="secondary" className="rounded-full">
            Version {question.versionNumber}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {titleCase(question.type)}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {titleCase(question.difficulty)}
          </Badge>
          {question.bloomLevel && (
            <Badge variant="outline" className="rounded-full">
              Bloom: {titleCase(question.bloomLevel)}
            </Badge>
          )}
          {question.isVisual && (
            <Badge variant="secondary" className="rounded-full">
              Visual
            </Badge>
          )}
        </div>
        <CardTitle className="mt-3 text-base font-extrabold leading-7 text-[#233b38]">
          {question.prompt}
        </CardTitle>
        <CardDescription className="font-mono text-[10px]">
          Question #{question.id} · Current version #{question.versionId}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <section>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Options
          </h4>
          {options.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option) => {
                const isCorrect = Boolean(
                  correct &&
                    (option.label.trim().toLowerCase() === correct ||
                      option.text.trim().toLowerCase() === correct),
                );
                return (
                  <div
                    key={`${option.label}-${option.text}`}
                    className={cn(
                      "flex gap-3 rounded-xl border p-3 text-sm",
                      isCorrect
                        ? "border-[#8fd1b6] bg-[#edf9f3]"
                        : "border-[#e6e2da] bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold",
                        isCorrect
                          ? "bg-[#2a9d72] text-white"
                          : "bg-[#f1eee8] text-[#53615f]",
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="leading-6 text-[#344744]">
                      {option.text}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No option data for this question type.
            </p>
          )}
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#b9dfcc] bg-[#edf8f2] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#237053]">
              <CheckCircle2 /> Correct answer
            </div>
            <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-[#26483c]">
              {displayValue(question.correctAnswer)}
            </p>
          </div>
          <div className="rounded-xl border border-[#ddd8f4] bg-[#f5f2ff] p-4">
            <div className="mb-2 text-xs font-bold text-[#6656a7]">
              Model answer
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#403b57]">
              {displayValue(question.modelAnswer)}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[#eadfc0] bg-[#fff9e9] p-4">
          <div className="mb-2 text-xs font-bold text-[#8a681d]">
            Explanation
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#514a38]">
            {displayValue(question.explanation)}
          </p>
        </section>

        <section>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Question metadata
          </h4>
          <div className="grid gap-3 rounded-xl bg-[#f7f4ef] p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="block text-muted-foreground">Lifecycle</span>
              <strong>{titleCase(question.lifecycleStatus)}</strong>
            </div>
            <div>
              <span className="block text-muted-foreground">Usage type</span>
              <strong>{titleCase(question.usageType)}</strong>
            </div>
            <div>
              <span className="block text-muted-foreground">Grade</span>
              <strong>
                {question.gradeLevel ? titleCase(question.gradeLevel) : "—"}
              </strong>
            </div>
            <div>
              <span className="block text-muted-foreground">
                Difficulty rating
              </span>
              <strong>{question.difficultyRating ?? "—"}</strong>
            </div>
            <div>
              <span className="block text-muted-foreground">
                Time allocated
              </span>
              <strong>
                {question.timeAllocatedMs
                  ? `${Math.round(question.timeAllocatedMs / 1000)} sec`
                  : "—"}
              </strong>
            </div>
            <div>
              <span className="block text-muted-foreground">External ID</span>
              <strong className="break-all font-mono">
                {question.externalId ?? "—"}
              </strong>
            </div>
            <div>
              <span className="block text-muted-foreground">Created</span>
              <strong>
                {new Date(question.createdAt).toLocaleDateString("en-IN")}
              </strong>
            </div>
            <div>
              <span className="block text-muted-foreground">
                Visual question
              </span>
              <strong>{question.isVisual ? "Yes" : "No"}</strong>
            </div>
          </div>
        </section>

        {question.keywords.length > 0 && (
          <section className="flex flex-wrap items-center gap-2">
            <Tags className="text-muted-foreground" />
            {question.keywords.map((keyword) => (
              <Badge key={keyword} variant="outline" className="rounded-full">
                {keyword}
              </Badge>
            ))}
          </section>
        )}

        <details className="rounded-xl border border-[#e4e0d8] bg-white p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-[#3c5551]">
            <Code2 /> Raw version payload
          </summary>
          <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[#1f2928] p-4 font-mono text-[11px] leading-5 text-[#d9ebe7]">
            {displayValue(question.payload)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

export function TopicDetailScreen({ topic }: { topic: TopicDetail }) {
  const objectives = useMemo(
    () => [
      ...topic.subtopics.flatMap((subtopic) => subtopic.objectives),
      ...topic.ungroupedObjectives,
    ],
    [topic],
  );
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(
    objectives[0]?.id ?? "",
  );
  const selectedObjective =
    objectives.find((objective) => objective.id === selectedObjectiveId) ??
    objectives[0];
  const [questionPage, setQuestionPage] = useState<QuestionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(
    async (page: number) => {
      if (!selectedObjective) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/teacher/syllabus/objectives/${selectedObjective.id}/questions?page=${page}`,
        );
        if (!response.ok) throw new Error("Could not load questions");
        setQuestionPage((await response.json()) as QuestionPage);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load questions",
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedObjective],
  );

  useEffect(() => {
    void loadQuestions(1);
  }, [loadQuestions]);
  const totalPages = questionPage
    ? Math.ceil(questionPage.total / questionPage.pageSize)
    : 1;

  return (
    <SyllabusShell breadcrumb={`Curriculum / ${topic.name}`}>
      <main className="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10">
        <Link
          href="/teacher/syllabus"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#1f7169] hover:underline"
        >
          <ArrowLeft /> Back to curriculum
        </Link>
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#25877c]">
              {topic.subjectName} · {titleCase(topic.grade)}
            </div>
            <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[#1c3c39] md:text-4xl">
              {topic.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete topic structure and active question-version data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1.5">
              {topic.subtopics.length} subtopics
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1.5">
              {objectives.length} objectives
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1.5">
              {titleCase(topic.status)}
            </Badge>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="self-start rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-4 shadow-[0_8px_30px_rgba(31,55,53,0.04)] xl:sticky xl:top-24">
            <div className="mb-4">
              <h2 className="font-extrabold text-[#263d3a]">Topic structure</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                All subtopics and learning objectives
              </p>
            </div>
            <div className="flex max-h-[calc(100vh-190px)] flex-col gap-4 overflow-y-auto pr-1">
              {topic.subtopics.map((subtopic) => (
                <section key={subtopic.id}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-[#25877c]">
                        {subtopic.code}
                      </div>
                      <h3 className="text-sm font-extrabold text-[#314744]">
                        {subtopic.name}
                      </h3>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {subtopic.objectives.length}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {subtopic.objectives.map((objective) => (
                      <ObjectiveButton
                        key={objective.id}
                        objective={objective}
                        selected={objective.id === selectedObjective?.id}
                        onClick={() => setSelectedObjectiveId(objective.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {topic.ungroupedObjectives.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-extrabold text-[#314744]">
                    Other objectives
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {topic.ungroupedObjectives.map((objective) => (
                      <ObjectiveButton
                        key={objective.id}
                        objective={objective}
                        selected={objective.id === selectedObjective?.id}
                        onClick={() => setSelectedObjectiveId(objective.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>

          <section className="min-w-0">
            {selectedObjective ? (
              <div className="mb-5 rounded-2xl border border-[#cfe5e0] bg-[#eaf5f2] p-5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#25877c]">
                  {selectedObjective.code}
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-[#213b38]">
                  {selectedObjective.name}
                </h2>
                {selectedObjective.description &&
                  selectedObjective.description !== selectedObjective.name && (
                    <p className="mt-2 text-sm leading-6 text-[#58716d]">
                      {selectedObjective.description}
                    </p>
                  )}
                <div className="mt-3 flex items-center gap-2 text-xs text-[#4e6e69]">
                  <FileQuestion />{" "}
                  {formatCount.format(selectedObjective.activeQuestionCount)}{" "}
                  active questions
                </div>
              </div>
            ) : null}
            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="animate-spin" /> Loading complete
                question data…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                {error}
              </div>
            ) : questionPage?.items.length ? (
              <div className="flex flex-col gap-5">
                {questionPage.items.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    number={
                      (questionPage.page - 1) * questionPage.pageSize +
                      index +
                      1
                    }
                  />
                ))}
                <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-[#e4e1d9] bg-white p-4 sm:flex-row">
                  <span className="text-xs text-muted-foreground">
                    Page {questionPage.page} of {totalPages} ·{" "}
                    {formatCount.format(questionPage.total)} questions
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={questionPage.page === 1}
                      onClick={() => void loadQuestions(questionPage.page - 1)}
                    >
                      <ArrowLeft data-icon="inline-start" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={questionPage.page >= totalPages}
                      onClick={() => void loadQuestions(questionPage.page + 1)}
                    >
                      Next <ArrowRight data-icon="inline-end" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dcd8cf] p-12 text-center text-sm text-muted-foreground">
                No active questions are mapped to this objective.
              </div>
            )}
          </section>
        </div>
      </main>
    </SyllabusShell>
  );
}

function ObjectiveButton({
  objective,
  selected,
  onClick,
}: {
  objective: LearningObjectiveDetail;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl px-3 py-2.5 text-left transition",
        selected
          ? "bg-[#dff0ec] text-[#1d625b]"
          : "bg-[#f7f4ef] text-[#536360] hover:bg-[#efebe4]",
      )}
    >
      <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.12em] opacity-70">
        {objective.code}
      </span>
      <span className="mt-1 block text-xs font-semibold leading-4">
        {objective.name}
      </span>
      <span className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
        <Clock3 /> {formatCount.format(objective.activeQuestionCount)} active
      </span>
    </button>
  );
}
