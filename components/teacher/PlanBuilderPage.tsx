"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Info,
  Lightbulb,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  StickyNote,
  TrendingDown,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { SyllabusShell, titleCase } from "@/components/syllabus/SyllabusShell";
import { gradeLabel, initials, scoreColor } from "@/components/teacher/format";
import { PlanCalendar } from "@/components/teacher/PlanCalendar";
import { PlanTopicSelector } from "@/components/teacher/PlanTopicSelector";
import {
  dateRangeLabel,
  formatSessionDate,
  MASTERY_TONES,
  nextWeekdays,
} from "@/components/teacher/plan-format";
import {
  SessionCard,
  type SessionCardItem,
} from "@/components/teacher/SessionCard";
import { StudentProfileCards } from "@/components/teacher/StudentProfileCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DemoStudentProfile } from "@/lib/demo-students";
import { composeActivity } from "@/lib/plan-activity";
import type { AIPlanSuggestion } from "@/lib/plan-ai";

interface EditableItem extends SessionCardItem {
  week: number;
  day: number;
  subject: string | null;
}

const STEPS = [
  { title: "Student", hint: "Who is this plan for?" },
  { title: "Dates & brief", hint: "When, and what to focus on" },
  { title: "Plan", hint: "Review and save" },
] as const;

/** One-tap starters for the instructions box — appended, not replaced. */
const INSTRUCTION_PRESETS = [
  "Test coming up — prioritise revision.",
  "Recap previous work before anything new.",
  "Keep homework light.",
  "Push with harder reasoning questions.",
] as const;

function Stepper({
  current,
  onGoTo,
}: {
  current: number;
  onGoTo: (step: number) => void;
}) {
  return (
    <ol className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const reachable = index <= current;
        return (
          <li key={step.title} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGoTo(index)}
              className={`flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-[#1f5855] bg-[#f2f8f6]"
                  : done
                    ? "border-[#dfe9e5] bg-[#fffefa] hover:border-[#9cc9c1]"
                    : "border-dashed border-[#e5e1d9] bg-transparent opacity-60"
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                  done
                    ? "bg-[#2ec4b6] text-white"
                    : active
                      ? "bg-[#1f5855] text-white"
                      : "bg-[#e8e5de] text-[#8a8a82]"
                }`}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold tracking-[-0.01em] text-[#1c3c39]">
                  {step.title}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {step.hint}
                </span>
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <ArrowRight className="hidden size-4 shrink-0 text-[#c4c0b8] sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Everything the teacher should see about the student before picking dates. */
function StudentEvidencePanel({ student }: { student: DemoStudentProfile }) {
  const stats = [
    {
      label: "Avg score",
      value: `${student.avgScore}%`,
      tone: scoreColor(student.avgScore),
    },
    {
      label: "Diagnostics",
      value: String(student.testsTaken),
      tone: "#1f5855",
    },
    { label: "Attendance", value: `${student.attendance}%`, tone: "#1f5855" },
    { label: "Pace", value: titleCase(student.pace), tone: "#1f5855" },
  ];

  return (
    <div className="rounded-2xl border border-[#e5e1d9] bg-[#fffefa] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#1f5855] font-mono font-bold text-white">
          {initials(student.displayName)}
        </div>
        <div>
          <h3 className="text-lg font-extrabold tracking-[-0.02em] text-[#1c3c39]">
            {student.displayName}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="size-3.5" />
            {gradeLabel(student.classLevel)} · {student.subject}
            <span className="text-[#c4c0b8]">·</span>
            <CalendarClock className="size-3.5" />
            active {student.lastActiveDaysAgo}d ago
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-[#f4f1eb] p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {stat.label}
            </div>
            <div
              className="mt-1 font-mono text-lg font-bold"
              style={{ color: stat.tone }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 flex gap-2 rounded-xl bg-[#f5f0e8] px-4 py-3 text-sm leading-6 text-[#566b68]">
        <StickyNote className="mt-1 size-4 shrink-0 text-[#ad6a13]" />
        {student.teacherNote}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#bd503e]">
            <TrendingDown className="size-3.5" /> Needs attention
          </div>
          <ul className="space-y-3">
            {student.weakAreas.map((area) => (
              <li
                key={area.learningObjective}
                className="rounded-xl border border-[#f0e2de] bg-[#fffaf9] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-[#2a413e]">
                    {area.topic}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 rounded-full text-[9px] font-bold uppercase ${MASTERY_TONES[area.masteryState]}`}
                  >
                    {titleCase(area.masteryState)} · {area.score}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#455855]">
                  {area.learningObjective}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  <strong className="font-bold">Observed:</strong> {area.note}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1f7169]">
            <ShieldCheck className="size-3.5" /> Secure strengths
          </div>
          <ul className="space-y-3">
            {student.strongAreas.map((area) => (
              <li
                key={area.learningObjective}
                className="rounded-xl border border-[#dcece7] bg-[#f7fcfa] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-[#2a413e]">
                    {area.topic}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-bold text-[#1f7169]">
                    {area.score}%
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#455855]">
                  {area.learningObjective}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {area.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function PlanBuilderPage({
  students,
  defaultStudentId,
  topicsByStudentId,
}: {
  students: DemoStudentProfile[];
  defaultStudentId?: string;
  topicsByStudentId: Record<string, string[]>;
}) {
  const router = useRouter();
  const defaultStudent = students.find(
    (student) => student.id === defaultStudentId,
  );
  const [step, setStep] = useState(defaultStudentId ? 1 : 0);
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [selectedDates, setSelectedDates] = useState<string[]>(nextWeekdays);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() =>
    defaultStudent
      ? Array.from(
          new Set(defaultStudent.weakAreas.map((area) => area.topic)),
        ).filter((topic) =>
          (topicsByStudentId[defaultStudent.id] ?? []).includes(topic),
        )
      : [],
  );
  const [instructions, setInstructions] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyCounter = useRef(0);

  const nextKey = useCallback(() => {
    keyCounter.current += 1;
    return `item-${keyCounter.current}`;
  }, []);

  const selectedStudent = students.find((student) => student.id === studentId);
  const firstName = selectedStudent?.displayName.split(" ")[0] ?? "the student";
  const availableTopics = topicsByStudentId[studentId] ?? [];
  const recommendedTopics = selectedStudent
    ? Array.from(new Set(selectedStudent.weakAreas.map((area) => area.topic)))
    : [];

  const selectStudent = (id: string) => {
    const student = students.find((entry) => entry.id === id);
    const topics = topicsByStudentId[id] ?? [];
    setStudentId(id);
    setSelectedTopics(
      student
        ? Array.from(
            new Set(student.weakAreas.map((area) => area.topic)),
          ).filter((topic) => topics.includes(topic))
        : [],
    );
    setItems([]);
    setStrategy(null);
    setError(null);
  };

  const changeDates = (dates: string[]) => {
    setSelectedDates(dates);
    setError(null);
  };

  const generatePlan = async () => {
    if (!studentId || selectedDates.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/teacher/plans/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          dates: selectedDates,
          topics: selectedTopics,
          instructions,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not build a plan.");
      }
      const suggestion: AIPlanSuggestion = await response.json();
      keyCounter.current = 0;
      setItems(
        suggestion.items.map((item) => ({
          key: nextKey(),
          week: item.week,
          day: item.day,
          sessionDate: item.sessionDate,
          focus: item.focus,
          topic: item.topic,
          subject: item.subject,
          learningObjective: item.learningObjective,
          goal: item.goal ?? "",
          teachingPoints: item.teachingPoints ?? [],
          practice: item.practice ?? "",
          successCriteria: item.successCriteria ?? "",
          masteryState: item.masteryState,
          baselineScore: item.baselineScore,
          rationale: item.rationale,
        })),
      );
      setTitle(suggestion.suggestedTitle);
      setSubject(suggestion.subject);
      setStrategy(suggestion.strategy);
      setSource(suggestion.source);
      setStep(2);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not build a plan.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (key: string, patch: Partial<SessionCardItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  // Removing a session also unpicks its date, so going back to step 2 shows the
  // calendar in a state that matches the plan.
  const removeItem = (item: EditableItem) => {
    setSelectedDates((current) =>
      current.filter((date) => date !== item.sessionDate),
    );
    setItems((current) => current.filter((entry) => entry.key !== item.key));
  };

  const weeks = useMemo(() => {
    const map = new Map<number, EditableItem[]>();
    for (const item of items) {
      const list = map.get(item.week) ?? [];
      list.push(item);
      map.set(item.week, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [items]);

  const savePlan = async () => {
    if (!title.trim()) {
      setError("Give the plan a title.");
      return;
    }
    if (items.some((item) => !item.topic.trim())) {
      setError("Every session needs a topic.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        studentId,
        title: title.trim(),
        subject,
        notes,
        items: items.map((item, index) => ({
          week: item.week,
          day: item.day,
          sessionDate: item.sessionDate,
          sortOrder: index,
          focus: item.focus,
          topic: item.topic.trim(),
          subject: item.subject,
          learningObjective: item.learningObjective,
          // The structured content collapses back into the single stored column.
          activity: composeActivity({
            goal: item.goal,
            teachingPoints: item.teachingPoints.filter((point) => point.trim()),
            practice: item.practice,
            successCriteria: item.successCriteria,
          }),
          masteryState: item.masteryState,
          baselineScore: item.baselineScore,
        })),
      };
      const response = await fetch("/api/teacher/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not save the plan.");
      }
      const { planId } = await response.json();
      router.push(`/teacher/plans/${planId}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the plan.",
      );
      setSaving(false);
    }
  };

  const errorBanner = error && (
    <p className="rounded-xl bg-[#fde8e4] px-4 py-3 text-sm font-semibold text-[#bd503e]">
      {error}
    </p>
  );

  return (
    <SyllabusShell breadcrumb="New learning plan">
      <main className="mx-auto w-full max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
        <Link
          href="/teacher/plans"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-[#1f5855]"
        >
          <ArrowLeft className="size-4" /> All learning plans
        </Link>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#25877c]">
            <WandSparkles className="size-4" /> Learning plan builder
          </div>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-[-0.04em] text-[#1c3c39] md:text-4xl">
            {step === 0 && "Who are we planning for?"}
            {step === 1 && `What ${firstName} needs, and when you teach.`}
            {step === 2 && `${firstName}'s plan, session by session.`}
          </h1>
        </section>

        <Stepper current={step} onGoTo={setStep} />

        {/* ── Step 1 · student ────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Pick a student to see their diagnostic evidence. The plan is
              drafted from their weakest learning objectives against the
              curriculum for their grade.
            </p>
            {students.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d9d5cc] px-4 py-8 text-center text-sm text-muted-foreground">
                <Sparkles className="mx-auto mb-2 size-5 text-[#7ca49f]" />
                No student profiles available.
              </p>
            ) : (
              <StudentProfileCards
                students={students}
                selectedId={studentId}
                onSelect={selectStudent}
              />
            )}
            <div className="flex justify-end border-t border-[#e8e4dc] pt-5">
              <Button
                type="button"
                disabled={!studentId}
                onClick={() => setStep(1)}
                className="rounded-xl bg-[#1f5855] px-5 text-white hover:bg-[#194745]"
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2 · evidence + dates ───────────────────────────────────── */}
        {step === 1 && selectedStudent && (
          <div className="space-y-6">
            <StudentEvidencePanel student={selectedStudent} />

            <div className="rounded-2xl border border-[#e5e1d9] bg-[#fffefa] p-6 shadow-sm">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#25877c]">
                <CalendarDays className="size-4" /> Session dates
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Tap the dates your classes with {firstName} run on — one session
                is planned per date.
              </p>
              <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
                <PlanCalendar selected={selectedDates} onChange={changeDates} />
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {selectedDates.length} session
                      {selectedDates.length === 1 ? "" : "s"} selected
                    </span>
                    {selectedDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => changeDates([])}
                        className="text-xs font-semibold text-muted-foreground transition hover:text-[#bd503e]"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  {selectedDates.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#d9d5cc] px-4 py-8 text-center text-sm text-muted-foreground">
                      No dates picked yet.
                    </p>
                  ) : (
                    <>
                      <p className="mb-3 text-sm font-semibold text-[#304744]">
                        {dateRangeLabel(
                          selectedDates[0],
                          selectedDates[selectedDates.length - 1],
                        )}
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {selectedDates.map((date, index) => (
                          <li
                            key={date}
                            className="rounded-lg bg-[#f4f1eb] px-2.5 py-1.5 text-xs font-semibold text-[#455855]"
                          >
                            <span className="font-mono text-[10px] font-bold text-[#25877c]">
                              D{index + 1}
                            </span>{" "}
                            {formatSessionDate(date)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            <PlanTopicSelector
              topics={availableTopics}
              selectedTopics={selectedTopics}
              recommendedTopics={recommendedTopics}
              studentName={firstName}
              onToggle={(topic) => {
                setSelectedTopics((current) =>
                  current.includes(topic)
                    ? current.filter((item) => item !== topic)
                    : [...current, topic],
                );
                setError(null);
              }}
              onSelectAll={() => {
                setSelectedTopics(availableTopics);
                setError(null);
              }}
              onClear={() => {
                setSelectedTopics([]);
                setError(null);
              }}
            />

            <div className="rounded-2xl border border-[#e5e1d9] bg-[#fffefa] p-6 shadow-sm">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#25877c]">
                <MessageSquareText className="size-4" /> Your instructions
                <span className="font-sans text-[10px] font-semibold normal-case tracking-normal text-muted-foreground">
                  optional
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Anything you know that the diagnostics don&apos;t — what&apos;s
                coming up, what to prioritise, what to leave out. This steers
                which topics get the time and how the sessions are pitched.
              </p>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={`e.g. Unit test on fractions in 2 weeks — weight the plan that way. ${firstName} missed the last three classes, so recap before anything new. Keep homework to 15 minutes.`}
                className="w-full resize-y rounded-xl border border-[#e4e0d8] bg-white px-3 py-2 text-sm leading-6 text-[#304744] outline-none focus:border-[#9cc9c1]"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {INSTRUCTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setInstructions((current) =>
                          current.trim()
                            ? `${current.trim()} ${preset}`
                            : preset,
                        )
                      }
                      className="rounded-full border border-[#e4e0d8] bg-[#faf8f4] px-2.5 py-1 text-[11px] font-semibold text-[#5c6b69] transition hover:border-[#9cc9c1] hover:text-[#1f5855]"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                {instructions.length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {instructions.length}/2000
                  </span>
                )}
              </div>
            </div>

            {errorBanner}

            {loading ? (
              <div className="grid place-items-center rounded-3xl border border-dashed border-[#d9d5cc] bg-[#fffdfa]/70 px-6 py-16">
                <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-[#25877c]" />
                  Reading {firstName}&apos;s profile against the syllabus and
                  drafting {selectedDates.length} sessions…
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e4dc] pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="rounded-xl"
                >
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button
                  type="button"
                  disabled={
                    selectedDates.length === 0 || selectedTopics.length === 0
                  }
                  onClick={generatePlan}
                  className="rounded-xl bg-[#1f5855] px-5 text-white hover:bg-[#194745]"
                >
                  <WandSparkles className="size-4" />
                  Generate plan with AI
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3 · the plan ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            {source === "fallback" && (
              <p className="flex items-start gap-2 rounded-xl bg-[#fff0dc] px-4 py-3 text-sm font-semibold text-[#ad6a13]">
                <Info className="mt-0.5 size-4 shrink-0" />
                The AI provider was unavailable, so this plan was drafted from{" "}
                {firstName}&apos;s evidence locally. Edit any session to adjust
                it.
              </p>
            )}

            {strategy && (
              <div className="rounded-2xl border border-[#cfe4de] bg-[#f2f8f6] p-5">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1f7169]">
                  <Lightbulb className="size-3.5" /> Plan strategy
                </div>
                <p className="text-sm leading-6 text-[#2a413e]">{strategy}</p>
                {instructions.trim() && (
                  <p className="mt-3 flex items-start gap-2 border-t border-[#cfe4de] pt-3 text-xs leading-6 text-[#3f5c58]">
                    <MessageSquareText className="mt-1 size-3.5 shrink-0" />
                    <span>
                      <strong className="font-bold">Your brief:</strong>{" "}
                      {instructions.trim()}{" "}
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="font-bold text-[#1f7169] underline underline-offset-2"
                      >
                        Edit
                      </button>
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Plan title
              </div>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-xl border-[#e4e0d8] bg-white font-semibold"
              />
            </div>

            {weeks.map(([week, weekItems]) => (
              <section key={week}>
                <h2 className="mb-3 flex flex-wrap items-center gap-2 text-lg font-extrabold tracking-[-0.02em] text-[#263d3a]">
                  <CalendarDays className="size-5 text-[#25877c]" />
                  Week {week}
                  <span className="text-sm font-semibold text-muted-foreground">
                    {dateRangeLabel(
                      weekItems[0].sessionDate,
                      weekItems[weekItems.length - 1].sessionDate,
                    )}
                  </span>
                </h2>
                <div className="space-y-4">
                  {weekItems.map((item) => (
                    <SessionCard
                      key={item.key}
                      item={item}
                      dayLabel={`Day ${items.indexOf(item) + 1}`}
                      onChange={(patch) => updateItem(item.key, patch)}
                      onRemove={() => removeItem(item)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {items.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#d9d5cc] px-4 py-12 text-center text-sm text-muted-foreground">
                <ClipboardList className="mx-auto mb-2 size-5 text-[#7ca49f]" />
                Every session was removed. Go back to pick dates again.
              </p>
            )}

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Notes for this plan (optional)
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                placeholder="Anything to remember while running this plan…"
                className="w-full resize-none rounded-xl border border-[#e4e0d8] bg-white px-3 py-2 text-sm leading-6 text-[#304744] outline-none focus:border-[#9cc9c1]"
              />
            </div>

            {errorBanner}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e4dc] pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl"
              >
                <ArrowLeft className="size-4" /> Back to dates
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={generatePlan}
                  className="rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <WandSparkles className="size-4" />
                  )}
                  Regenerate
                </Button>
                <Button
                  type="button"
                  disabled={saving || items.length === 0}
                  onClick={savePlan}
                  className="rounded-xl bg-[#1f5855] px-5 text-white hover:bg-[#194745]"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Save plan
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </SyllabusShell>
  );
}
