"use client";

import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  LibraryBig,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  formatCount,
  SyllabusShell,
  titleCase,
} from "@/components/syllabus/SyllabusShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { SyllabusOverview, SyllabusTopicSummary } from "@/lib/syllabus";

function TopicRow({
  topic,
  index,
}: {
  topic: SyllabusTopicSummary;
  index: number;
}) {
  const readiness =
    topic.questionCount === 0
      ? 0
      : Math.round((topic.activeQuestionCount / topic.questionCount) * 100);
  return (
    <Link
      href={`/teacher/syllabus/topics/${topic.id}`}
      className="group grid grid-cols-[48px_minmax(0,1fr)_32px] items-center gap-3 border-b border-[#ece9e2] px-4 py-4 transition last:border-b-0 hover:bg-[#f3f8f6] md:px-5 lg:grid-cols-[56px_minmax(240px,1.4fr)_110px_120px_180px_32px]"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-[#e7f3f0] font-mono text-xs font-bold text-[#1f7169]">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-[#263d3a] md:text-base">
            {topic.name}
          </h3>
          <Badge
            variant="secondary"
            className="hidden rounded-full bg-[#eff5f3] text-[#3f6d68] sm:inline-flex"
          >
            {titleCase(topic.status)}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {topic.family || `${titleCase(topic.grade)} curriculum`}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground lg:hidden">
          <span>
            <strong className="font-mono text-[#304744]">
              {topic.subtopicCount}
            </strong>{" "}
            subtopics
          </span>
          <span>
            <strong className="font-mono text-[#304744]">
              {topic.objectiveCount}
            </strong>{" "}
            objectives
          </span>
          <span>
            <strong className="font-mono text-[#304744]">
              {formatCount.format(topic.activeQuestionCount)}
            </strong>{" "}
            questions
          </span>
        </div>
      </div>
      <div className="hidden text-center lg:block">
        <div className="font-mono text-sm font-bold text-[#304744]">
          {topic.subtopicCount}
        </div>
        <div className="text-[10px] text-muted-foreground">Subtopics</div>
      </div>
      <div className="hidden text-center lg:block">
        <div className="font-mono text-sm font-bold text-[#304744]">
          {topic.objectiveCount}
        </div>
        <div className="text-[10px] text-muted-foreground">Objectives</div>
      </div>
      <div className="hidden lg:block">
        <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {formatCount.format(topic.activeQuestionCount)} active questions
          </span>
          <span className="font-mono font-bold text-[#304744]">
            {readiness}%
          </span>
        </div>
        <Progress
          value={readiness}
          className="h-1.5 bg-[#e8e5de] [&_[data-slot=progress-indicator]]:bg-[#2ec4b6]"
        />
      </div>
      <ChevronRight className="text-[#75a19c] transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

export function CurriculumDashboard({
  overview,
}: {
  overview: SyllabusOverview;
}) {
  const firstSubject = overview.subjects[0];
  const initialGrade =
    firstSubject?.grades.find((item) => item.toLowerCase() === "grade 6") ??
    firstSubject?.grades[0] ??
    "";
  const [subjectId, setSubjectId] = useState(firstSubject?.id ?? "");
  const [grade, setGrade] = useState(initialGrade);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const selectedSubject = overview.subjects.find(
    (subject) => subject.id === subjectId,
  );
  const topics = useMemo(() => {
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
      topics.reduce(
        (sum, topic) => ({
          subtopics: sum.subtopics + topic.subtopicCount,
          objectives: sum.objectives + topic.objectiveCount,
          questions: sum.questions + topic.activeQuestionCount,
        }),
        { subtopics: 0, objectives: 0, questions: 0 },
      ),
    [topics],
  );

  const changeSubject = (value: string | null) => {
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
    <SyllabusShell breadcrumb="Curriculum">
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
              Choose a topic to open its full structure and question bank on a
              dedicated screen.
            </p>
            <Button
              render={<Link href="/teacher/plans/new" />}
              className="mt-5 h-11 rounded-xl bg-[#1f5855] px-5 text-white hover:bg-[#194745]"
            >
              <WandSparkles className="size-4" /> Create learning plan
            </Button>
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
                {selectedSubject?.name ?? "No subject"} · {titleCase(grade)}
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
                onValueChange={changeSubject}
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
                {topics.length}
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
                Curriculum topics
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a row to open the complete topic.
              </p>
            </div>
            <Badge
              variant="outline"
              className="hidden rounded-full bg-white md:inline-flex"
            >
              Live from PostgreSQL
            </Badge>
          </div>
          {topics.length ? (
            <div className="overflow-hidden rounded-2xl border border-[#e4e1d9] bg-[#fffefa] shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
              <div className="hidden grid-cols-[56px_minmax(240px,1.4fr)_110px_120px_180px_32px] gap-3 border-b border-[#e5e2da] bg-[#f4f1eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:grid">
                <span>#</span>
                <span>Topic</span>
                <span className="text-center">Structure</span>
                <span className="text-center">Objectives</span>
                <span>Question readiness</span>
                <span />
              </div>
              {topics.map((topic, index) => (
                <TopicRow key={topic.id} topic={topic} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#d9d5cc] bg-[#fffdfa]/70 px-6 py-16 text-center">
              <LibraryBig className="mx-auto mb-4 text-[#7ca49f]" />
              <h3 className="font-bold text-[#2a413e]">No topics found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another subject, grade, or search term.
              </p>
            </div>
          )}
        </section>
      </main>
    </SyllabusShell>
  );
}
