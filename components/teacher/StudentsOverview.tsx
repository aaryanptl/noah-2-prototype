"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Minus,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCount,
  SyllabusShell,
  titleCase,
} from "@/components/syllabus/SyllabusShell";
import {
  formatDate,
  formatSeconds,
  gradeLabel,
  initials,
  scoreColor,
  subjectColor,
} from "@/components/teacher/format";
import { Progress } from "@/components/ui/progress";
import type { RosterStudent } from "@/lib/teacher-dashboard";

function TrendChip({ trend }: { trend: number | null }) {
  if (trend == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f1efe8] px-2 py-1 text-[10px] font-bold text-[#697270]">
        <Minus className="size-3" /> New
      </span>
    );
  }
  if (trend >= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f4ef] px-2 py-1 text-[10px] font-bold text-[#1f7169]">
        <ArrowUpRight className="size-3" /> +{trend} pts
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecec] px-2 py-1 text-[10px] font-bold text-[#c53030]">
      <ArrowDownRight className="size-3" /> {trend} pts
    </span>
  );
}

function Sparkline({ student }: { student: RosterStudent }) {
  if (student.scoreHistory.length < 2) {
    return (
      <div className="grid h-12 place-items-center rounded-lg bg-[#faf8f4] text-[10px] text-muted-foreground">
        Not enough tests for a trend yet
      </div>
    );
  }
  return (
    <div className="h-12">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={student.scoreHistory}>
          <Line
            type="monotone"
            dataKey="score"
            stroke="#2ec4b6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <YAxis domain={[0, 100]} hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StudentCard({ student }: { student: RosterStudent }) {
  const avgScore = student.avgScore;
  const studentHref = `/teacher/students/${student.id}`;
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)] transition hover:-translate-y-0.5 hover:border-[#bcd9d4] hover:shadow-[0_12px_36px_rgba(31,55,53,0.1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#dceeea] text-sm font-extrabold text-[#1f5855]">
            {initials(student.displayName)}
          </div>
          <div className="min-w-0">
            <Link
              href={studentHref}
              className="flex items-center gap-1 truncate text-sm font-extrabold text-[#243735] hover:text-[#1f7169]"
            >
              {student.displayName}
              <ChevronRight className="size-4 shrink-0 text-[#75a19c] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <div className="text-xs text-muted-foreground">
              {gradeLabel(student.classLevel)}
              {student.subjects.length > 0 &&
                ` · ${student.subjects.map(titleCase).join(", ")}`}
            </div>
          </div>
        </div>
        <TrendChip trend={student.trend} />
      </div>

      {avgScore != null ? (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Average score</span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: scoreColor(avgScore) }}
            >
              {avgScore}%
            </span>
          </div>
          <Progress
            value={avgScore}
            className="h-1.5 bg-[#e8e5de] [&_[data-slot=progress-indicator]]:bg-[#2ec4b6]"
          />
        </div>
      ) : (
        <div className="rounded-lg bg-[#faf8f4] px-3 py-2 text-xs text-muted-foreground">
          No tests taken yet
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#f6f4ee] px-2 py-2.5">
          <div className="font-mono text-sm font-bold text-[#304744]">
            {formatCount.format(student.totalTests)}
          </div>
          <div className="text-[10px] text-muted-foreground">Tests</div>
        </div>
        <div className="rounded-xl bg-[#f6f4ee] px-2 py-2.5">
          <div className="font-mono text-sm font-bold text-[#304744]">
            {formatSeconds(student.avgTimeSeconds)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Avg / question
          </div>
        </div>
        <div className="rounded-xl bg-[#f6f4ee] px-2 py-2.5">
          <div className="font-mono text-sm font-bold text-[#304744]">
            {formatDate(student.lastActive)}
          </div>
          <div className="text-[10px] text-muted-foreground">Last active</div>
        </div>
      </div>

      <Sparkline student={student} />

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[#ece9e2] pt-3">
        <Link
          href={studentHref}
          className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold text-[#5a6e6b] transition hover:bg-[#f3f1ea] hover:text-[#1f5855]"
        >
          View profile
        </Link>
        <Link
          href={`${studentHref}#teacher-assets`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#e7f3f0] px-3 py-2 text-xs font-bold text-[#1f7169] transition hover:bg-[#d8ebe7]"
        >
          <FolderOpen className="size-3.5" /> Teacher assets
        </Link>
      </div>
    </article>
  );
}

export function StudentsOverview({ students }: { students: RosterStudent[] }) {
  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const student of students) {
      for (const item of student.subjectAverages) set.add(item.subject);
    }
    return Array.from(set).sort();
  }, [students]);

  const scoreChartData = useMemo(
    () =>
      students
        .filter((student) => student.totalTests > 0)
        .map((student) => {
          const row: Record<string, string | number> = {
            name: student.displayName.split(" ")[0],
          };
          for (const item of student.subjectAverages) {
            row[item.subject] = item.avgScore;
          }
          return row;
        }),
    [students],
  );

  const timeChartData = useMemo(
    () =>
      students
        .filter((student) => student.avgTimeSeconds != null)
        .map((student) => ({
          name: student.displayName.split(" ")[0],
          seconds: student.avgTimeSeconds ?? 0,
        })),
    [students],
  );

  const classAvg = useMemo(() => {
    const scored = students.filter((student) => student.avgScore != null);
    if (scored.length === 0) return null;
    return (
      Math.round(
        (scored.reduce((sum, student) => sum + (student.avgScore ?? 0), 0) /
          scored.length) *
          10,
      ) / 10
    );
  }, [students]);

  return (
    <SyllabusShell breadcrumb="My students">
      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
        <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#25877c]">
              <Sparkles /> Class overview
            </div>
            <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-[#1c3c39] md:text-4xl">
              See how your students are progressing.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Performance across subjects, topics and tests for every student in
              your class. Open a student to see their full journey.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-[#e5e1d9] bg-[#fffdfa] px-5 py-3 shadow-sm">
            <div className="grid size-10 place-items-center rounded-xl bg-[#e4f1ee] text-[#1f7169]">
              <Users />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Your class</div>
              <div className="text-sm font-bold">
                {students.length} student{students.length === 1 ? "" : "s"}
                {classAvg != null && ` · ${classAvg}% class average`}
              </div>
            </div>
          </div>
        </section>

        {students.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d9d5cc] bg-[#fffdfa]/70 px-6 py-16 text-center">
            <ClipboardList className="mx-auto mb-4 text-[#7ca49f]" />
            <h3 className="font-bold text-[#2a413e]">No students yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Students appear here after they take their first test.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
                <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#263d3a]">
                  Average score by subject
                </h2>
                <p className="mb-4 mt-1 text-xs text-muted-foreground">
                  Each student&apos;s average across all their tests.
                </p>
                {scoreChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ece9e2" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#697270" }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: "#697270" }}
                          unit="%"
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${value ?? 0}%`,
                            titleCase(String(name)),
                          ]}
                        />
                        <Legend
                          formatter={(value) => titleCase(String(value))}
                        />
                        {subjects.map((subject, index) => (
                          <Bar
                            key={subject}
                            dataKey={subject}
                            fill={subjectColor(subject, index)}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={42}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="grid h-72 place-items-center text-sm text-muted-foreground">
                    No test data yet.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
                <div className="flex items-center gap-2">
                  <Timer className="size-4 text-[#1f7169]" />
                  <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#263d3a]">
                    Average time per question
                  </h2>
                </div>
                <p className="mb-4 mt-1 text-xs text-muted-foreground">
                  Students above the 50-second line may need speed practice.
                </p>
                {timeChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ece9e2" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#697270" }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#697270" }}
                          unit="s"
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${value ?? 0}s`,
                            "Avg time / question",
                          ]}
                        />
                        <ReferenceLine
                          y={50}
                          stroke="#f47a62"
                          strokeDasharray="6 4"
                          label={{
                            value: "50s target",
                            fill: "#c53030",
                            fontSize: 11,
                            position: "insideTopRight",
                          }}
                        />
                        <Bar
                          dataKey="seconds"
                          fill="#1f5855"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="grid h-72 place-items-center text-sm text-muted-foreground">
                    No timing data recorded yet.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </SyllabusShell>
  );
}
