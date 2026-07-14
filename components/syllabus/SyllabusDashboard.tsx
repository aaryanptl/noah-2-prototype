"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Layers3,
  LibraryBig,
  LoaderCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  LearningObjectiveDetail,
  QuestionPage,
  SyllabusOverview,
  SyllabusTopicSummary,
  TopicDetail,
} from "@/lib/syllabus";
import { cn } from "@/lib/utils";

const TOPIC_ACCENTS = [
  {
    soft: "bg-[#e8f6f3]",
    text: "text-[#117c72]",
    bar: "[&_[data-slot=progress-indicator]]:bg-[#2ec4b6]",
  },
  {
    soft: "bg-[#fff3df]",
    text: "text-[#a9630b]",
    bar: "[&_[data-slot=progress-indicator]]:bg-[#f5a623]",
  },
  {
    soft: "bg-[#f1edff]",
    text: "text-[#7052c8]",
    bar: "[&_[data-slot=progress-indicator]]:bg-[#8b72dc]",
  },
  {
    soft: "bg-[#ffebe7]",
    text: "text-[#b94e3d]",
    bar: "[&_[data-slot=progress-indicator]]:bg-[#f46853]",
  },
] as const;

const formatCount = new Intl.NumberFormat("en-IN");

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function NoahMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-10 overflow-hidden rounded-xl bg-[#1f5855] shadow-sm">
        <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full bg-[#f8bf4b]" />
        <span className="absolute bottom-2 left-2 size-2.5 rotate-12 rounded-sm bg-[#f47a62]" />
      </div>
      {!compact && (
        <div>
          <div className="text-lg font-extrabold tracking-[-0.03em] text-[#183d3b]">
            Noah 2.0
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Teacher space
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const navigation = [
    { label: "Overview", icon: BarChart3 },
    { label: "My classes", icon: Users },
    { label: "Curriculum", icon: LibraryBig, active: true },
    { label: "Assessments", icon: ClipboardCheck },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#e6e6df] bg-[#fffdfa] px-4 py-5 lg:flex">
      <div className="px-2">
        <NoahMark />
      </div>
      <nav
        className="mt-10 flex flex-col gap-1"
        aria-label="Teacher navigation"
      >
        {navigation.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
              active ? "bg-[#e8f3f1] text-[#1f5855]" : "text-[#697270]",
            )}
          >
            <Icon />
            {label}
          </div>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl bg-[#f5f0e8] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#314845]">
          <CircleHelp /> Need help?
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Learn how the curriculum is organised across grades and assessments.
        </p>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-[#ece8e1] px-2 pt-4">
        <div className="grid size-9 place-items-center rounded-full bg-[#dceeea] text-xs font-extrabold text-[#1f5855]">
          AP
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#243735]">
            Ananya Patel
          </div>
          <div className="text-xs text-muted-foreground">
            Mathematics teacher
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopicCard({
  topic,
  index,
  onOpen,
}: {
  topic: SyllabusTopicSummary;
  index: number;
  onOpen: () => void;
}) {
  const accent = TOPIC_ACCENTS[index % TOPIC_ACCENTS.length];
  const readiness =
    topic.questionCount === 0
      ? 0
      : Math.round((topic.activeQuestionCount / topic.questionCount) * 100);

  return (
    <Card className="group border-0 bg-[#fffefa] shadow-[0_8px_30px_rgba(31,55,53,0.05)] ring-[#e9e6df] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(31,55,53,0.09)]">
      <CardHeader>
        <div
          className={cn(
            "mb-3 grid size-11 place-items-center rounded-2xl font-mono text-sm font-bold",
            accent.soft,
            accent.text,
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <CardTitle className="pr-16 text-lg font-extrabold tracking-[-0.02em] text-[#263b38]">
          {topic.name}
        </CardTitle>
        <CardDescription className="mt-1 line-clamp-1">
          {topic.family || `${titleCase(topic.grade)} curriculum`}
        </CardDescription>
        <CardAction>
          <Badge
            variant="secondary"
            className="rounded-full bg-[#eff5f3] text-[#3f6d68]"
          >
            {titleCase(topic.status)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#f8f6f1] p-3">
          <div>
            <div className="font-mono text-base font-bold text-[#283f3c]">
              {topic.subtopicCount}
            </div>
            <div className="text-[11px] text-muted-foreground">Subtopics</div>
          </div>
          <div>
            <div className="font-mono text-base font-bold text-[#283f3c]">
              {topic.objectiveCount}
            </div>
            <div className="text-[11px] text-muted-foreground">Objectives</div>
          </div>
          <div>
            <div className="font-mono text-base font-bold text-[#283f3c]">
              {formatCount.format(topic.activeQuestionCount)}
            </div>
            <div className="text-[11px] text-muted-foreground">Questions</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#66716e]">
              Question readiness
            </span>
            <span className="font-mono font-bold text-[#334845]">
              {readiness}%
            </span>
          </div>
          <Progress
            value={readiness}
            className={cn("h-1.5 bg-[#ece9e2]", accent.bar)}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t border-[#efede7] pt-4">
        <span className="text-xs text-muted-foreground">
          {formatCount.format(topic.questionCount - topic.activeQuestionCount)}{" "}
          archived
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          className="text-[#1f7169] hover:bg-[#e8f3f1] hover:text-[#174f49]"
        >
          Explore topic <ChevronRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function ObjectiveCard({
  objective,
  onViewQuestions,
}: {
  objective: LearningObjectiveDetail;
  onViewQuestions: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#e9e5dd] bg-white p-4 shadow-[0_4px_16px_rgba(31,55,53,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#25877c]">
            {objective.code}
          </div>
          <h4 className="text-sm font-bold leading-5 text-[#273e3b]">
            {objective.name}
          </h4>
          {objective.description &&
            objective.description !== objective.name && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {objective.description}
              </p>
            )}
        </div>
        <Badge variant="outline" className="shrink-0 rounded-full">
          {formatCount.format(objective.activeQuestionCount)} active
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 text-[#1f7169]"
        onClick={onViewQuestions}
      >
        <FileQuestion data-icon="inline-start" /> View question versions
      </Button>
    </div>
  );
}

function QuestionBrowser({
  objective,
  onBack,
}: {
  objective: LearningObjectiveDetail;
  onBack: () => void;
}) {
  const [questionPage, setQuestionPage] = useState<QuestionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/teacher/syllabus/objectives/${objective.id}/questions?page=${page}`,
        );
        if (!response.ok) throw new Error("Could not load question versions");
        setQuestionPage((await response.json()) as QuestionPage);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load question versions",
        );
      } finally {
        setLoading(false);
      }
    },
    [objective.id],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  const totalPages = questionPage
    ? Math.ceil(questionPage.total / questionPage.pageSize)
    : 1;

  return (
    <section className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-[#1f7169]"
        onClick={onBack}
      >
        <ArrowLeft data-icon="inline-start" /> Learning objectives
      </Button>
      <div className="rounded-2xl bg-[#e8f3f1] p-4">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#25877c]">
          {objective.code}
        </div>
        <h3 className="mt-1 font-extrabold text-[#213b38]">{objective.name}</h3>
        <p className="mt-1 text-xs text-[#58716d]">
          Current versions of active questions. Answers stay hidden in this
          curriculum view.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" /> Loading question versions…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : questionPage?.items.length ? (
        <div className="flex flex-col gap-3">
          {questionPage.items.map((question) => (
            <article
              key={question.id}
              className="rounded-2xl border border-[#e9e5dd] bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  v{question.versionNumber}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {titleCase(question.type)}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {titleCase(question.difficulty)}
                </Badge>
                {question.bloomLevel && (
                  <span className="text-[11px] text-muted-foreground">
                    {titleCase(question.bloomLevel)}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-6 text-[#2b3e3b]">
                {question.prompt}
              </p>
              <div className="mt-3 font-mono text-[10px] text-muted-foreground">
                Question #{question.id} · Version #{question.versionId}
              </div>
            </article>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Page {questionPage.page} of {totalPages} ·{" "}
              {formatCount.format(questionPage.total)} questions
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={questionPage.page === 1}
                onClick={() => void loadPage(questionPage.page - 1)}
                aria-label="Previous question page"
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={questionPage.page >= totalPages}
                onClick={() => void loadPage(questionPage.page + 1)}
                aria-label="Next question page"
              >
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#dcd8cf] p-8 text-center text-sm text-muted-foreground">
          No active question versions are mapped to this objective yet.
        </div>
      )}
    </section>
  );
}

function CurriculumSheet({
  topicId,
  open,
  onOpenChange,
}: {
  topicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string | null>(
    null,
  );
  const [selectedObjective, setSelectedObjective] =
    useState<LearningObjectiveDetail | null>(null);

  useEffect(() => {
    if (!open || !topicId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);
    setSelectedObjective(null);
    fetch(`/api/teacher/syllabus/topics/${topicId}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load this topic");
        return response.json() as Promise<TopicDetail>;
      })
      .then((data) => {
        setDetail(data);
        setSelectedSubtopicId(data.subtopics[0]?.id ?? "ungrouped");
      })
      .catch((loadError: unknown) => {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        )
          return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this topic",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, topicId]);

  const selectedSubtopic = detail?.subtopics.find(
    (subtopic) => subtopic.id === selectedSubtopicId,
  );
  const visibleObjectives =
    selectedSubtopicId === "ungrouped"
      ? (detail?.ungroupedObjectives ?? [])
      : (selectedSubtopic?.objectives ?? []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="gap-0 bg-[#fbfaf7] data-[side=right]:w-full data-[side=right]:sm:max-w-[780px]"
        side="right"
      >
        <SheetHeader className="border-b border-[#e9e5dd] bg-white px-6 py-5 pr-14">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#25877c]">
            <Layers3 /> Curriculum map
          </div>
          <SheetTitle className="text-xl font-extrabold tracking-[-0.025em] text-[#243c39]">
            {detail?.name ?? "Topic details"}
          </SheetTitle>
          <SheetDescription>
            {detail
              ? `${detail.subjectName} · ${titleCase(detail.grade)} · ${detail.subtopics.length} subtopics`
              : "Loading curriculum structure…"}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" /> Mapping the curriculum…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
              {error}
            </div>
          ) : detail && selectedObjective ? (
            <QuestionBrowser
              objective={selectedObjective}
              onBack={() => setSelectedObjective(null)}
            />
          ) : detail ? (
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="flex flex-col gap-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Subtopics
                </div>
                {detail.subtopics.map((subtopic) => (
                  <button
                    key={subtopic.id}
                    type="button"
                    onClick={() => setSelectedSubtopicId(subtopic.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-semibold transition",
                      selectedSubtopicId === subtopic.id
                        ? "bg-[#e4f1ee] text-[#1d625b]"
                        : "text-[#596966] hover:bg-[#f1eee8]",
                    )}
                  >
                    <span className="pr-2">{subtopic.name}</span>
                    <span className="font-mono text-[10px] opacity-60">
                      {subtopic.objectives.length}
                    </span>
                  </button>
                ))}
                {detail.ungroupedObjectives.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubtopicId("ungrouped")}
                    className={cn(
                      "rounded-xl px-3 py-3 text-left text-xs font-semibold transition",
                      selectedSubtopicId === "ungrouped"
                        ? "bg-[#e4f1ee] text-[#1d625b]"
                        : "text-[#596966] hover:bg-[#f1eee8]",
                    )}
                  >
                    Other objectives
                  </button>
                )}
              </aside>
              <section className="min-w-0">
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#25877c]">
                    Learning objectives
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold text-[#263d3a]">
                    {selectedSubtopic?.name ?? "Other objectives"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose an objective to browse its active, pinned question
                    versions.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {visibleObjectives.length ? (
                    visibleObjectives.map((objective) => (
                      <ObjectiveCard
                        key={objective.id}
                        objective={objective}
                        onViewQuestions={() => setSelectedObjective(objective)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#dcd8cf] p-8 text-center text-sm text-muted-foreground">
                      No learning objectives are mapped here yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SyllabusDashboard({
  overview,
}: {
  overview: SyllabusOverview;
}) {
  const firstSubject = overview.subjects[0];
  const initialGrade =
    firstSubject?.grades.find((grade) => grade.toLowerCase() === "grade 6") ??
    firstSubject?.grades[0] ??
    "";
  const [subjectId, setSubjectId] = useState(firstSubject?.id ?? "");
  const [grade, setGrade] = useState(initialGrade);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const selectedSubject = overview.subjects.find(
    (subject) => subject.id === subjectId,
  );
  const filteredTopics = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return overview.topics.filter(
      (topic) =>
        topic.subjectId === subjectId &&
        topic.grade === grade &&
        (!query || topic.name.toLowerCase().includes(query)),
    );
  }, [deferredSearch, grade, overview.topics, subjectId]);

  const totals = useMemo(
    () =>
      filteredTopics.reduce(
        (sum, topic) => ({
          subtopics: sum.subtopics + topic.subtopicCount,
          objectives: sum.objectives + topic.objectiveCount,
          questions: sum.questions + topic.activeQuestionCount,
        }),
        { subtopics: 0, objectives: 0, questions: 0 },
      ),
    [filteredTopics],
  );

  const handleSubjectChange = (value: string | null) => {
    if (!value) return;
    const subject = overview.subjects.find((item) => item.id === value);
    setSubjectId(value);
    setGrade(
      subject?.grades.find((item) => item.toLowerCase() === "grade 6") ??
        subject?.grades[0] ??
        "",
    );
    setSearch("");
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f7f5f0] text-[#243735]">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e8e5de] bg-[#fffdfa]/90 px-5 backdrop-blur-xl md:px-8">
              <div className="lg:hidden">
                <NoahMark compact />
              </div>
              <div className="hidden text-sm font-semibold text-muted-foreground lg:block">
                Teacher workspace <span className="mx-2 text-[#c4c0b8]">/</span>{" "}
                Curriculum
              </div>
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="grid size-9 place-items-center rounded-full border border-[#e6e2da] bg-white text-muted-foreground" />
                    }
                  >
                    <Bell />
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                <div className="grid size-9 place-items-center rounded-full bg-[#1f5855] text-xs font-extrabold text-white lg:hidden">
                  AP
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
              <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#25877c]">
                    <Sparkles /> Curriculum library
                  </div>
                  <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-[#1c3c39] md:text-4xl">
                    See the syllabus as a learning journey.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Move from topics to learning objectives, then inspect the
                    active question versions supporting each objective.
                  </p>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-[#e5e1d9] bg-[#fffdfa] px-5 py-3 shadow-sm">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#e4f1ee] text-[#1f7169]">
                    <GraduationCap />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Currently browsing
                    </div>
                    <div className="text-sm font-bold">
                      {selectedSubject?.name ?? "No subject"} ·{" "}
                      {titleCase(grade)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-7 rounded-2xl border border-[#e8e4dc] bg-[#fffdfa] p-4 shadow-[0_6px_24px_rgba(31,55,53,0.04)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search topics…"
                      className="h-11 rounded-xl border-[#e4e0d8] bg-[#faf8f4] pl-10 shadow-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:flex">
                    <Select
                      items={overview.subjects.map((subject) => ({
                        label: subject.name,
                        value: subject.id,
                      }))}
                      value={subjectId}
                      onValueChange={handleSubjectChange}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-[#e4e0d8] bg-white lg:w-44">
                        <BookOpen />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {overview.subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Select
                      items={(selectedSubject?.grades ?? []).map((item) => ({
                        label: titleCase(item),
                        value: item,
                      }))}
                      value={grade}
                      onValueChange={(value) => value && setGrade(value)}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-[#e4e0d8] bg-white lg:w-40">
                        <GraduationCap />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {selectedSubject?.grades.map((item) => (
                            <SelectItem key={item} value={item}>
                              {titleCase(item)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator className="my-4 bg-[#eeeae2]" />
                <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-muted-foreground">
                  <span>
                    <strong className="font-mono text-sm text-[#263f3c]">
                      {filteredTopics.length}
                    </strong>{" "}
                    topics
                  </span>
                  <span>
                    <strong className="font-mono text-sm text-[#263f3c]">
                      {totals.subtopics}
                    </strong>{" "}
                    subtopics
                  </span>
                  <span>
                    <strong className="font-mono text-sm text-[#263f3c]">
                      {totals.objectives}
                    </strong>{" "}
                    learning objectives
                  </span>
                  <span>
                    <strong className="font-mono text-sm text-[#263f3c]">
                      {formatCount.format(totals.questions)}
                    </strong>{" "}
                    active questions
                  </span>
                </div>
              </section>

              <section>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#263d3a]">
                      Curriculum map
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      One topic at a time, with the detail available when you
                      need it.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="hidden rounded-full bg-white md:inline-flex"
                  >
                    Live from PostgreSQL
                  </Badge>
                </div>
                {filteredTopics.length ? (
                  <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredTopics.map((topic, index) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        index={index}
                        onOpen={() => setSelectedTopicId(topic.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-[#d9d5cc] bg-[#fffdfa]/70 px-6 py-16 text-center">
                    <LibraryBig className="mx-auto mb-4 text-[#7ca49f]" />
                    <h3 className="font-bold text-[#2a413e]">
                      No topics found
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another subject, grade, or search term.
                    </p>
                  </div>
                )}
              </section>
            </main>
          </div>
        </div>
        <CurriculumSheet
          topicId={selectedTopicId}
          open={selectedTopicId !== null}
          onOpenChange={(nextOpen) => !nextOpen && setSelectedTopicId(null)}
        />
      </div>
    </TooltipProvider>
  );
}
