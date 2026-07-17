"use client";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Gauge,
  Timer,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  formatDateWithYear,
  formatSeconds,
  gradeLabel,
  initials,
  scoreBarColor,
  scoreColor,
  subjectColor,
} from "@/components/teacher/format";
import { TeacherAssetsPanel } from "@/components/teacher/TeacherAssetsPanel";
import { Badge } from "@/components/ui/badge";
import type {
  SkillArea,
  StudentPerformanceDetail,
} from "@/lib/teacher-dashboard";

const MAX_TOPIC_BARS = 8;
const MAX_HISTORY_ROWS = 20;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e5e1d9] bg-[#fffdfa] px-4 py-3 shadow-sm">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e4f1ee] text-[#1f7169]">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm font-bold text-[#243735]">
          {value}
        </div>
        {hint && (
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        )}
      </div>
    </div>
  );
}

function AreaList({
  title,
  tone,
  areas,
  emptyText,
}: {
  title: string;
  tone: "strong" | "weak";
  areas: SkillArea[];
  emptyText: string;
}) {
  const toneStyles =
    tone === "strong"
      ? { dot: "bg-[#2ec4b6]", chip: "bg-[#e4f4ef] text-[#1f7169]" }
      : { dot: "bg-[#f47a62]", chip: "bg-[#fdecec] text-[#c53030]" };
  return (
    <div className="rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
      <div className="mb-4 flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${toneStyles.dot}`} />
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#263d3a]">
          {title}
        </h2>
      </div>
      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {areas.slice(0, 6).map((area) => (
            <li
              key={area.learningObjective}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f4] px-3 py-2.5"
            >
              <span className="min-w-0 flex-1 text-sm text-[#304744]">
                {area.learningObjective}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-bold ${toneStyles.chip}`}
              >
                {Math.round(area.score)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StudentDetail({
  detail,
}: {
  detail: StudentPerformanceDetail;
}) {
  const { student } = detail;

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const point of detail.scoreHistory) set.add(point.subject);
    return Array.from(set).sort();
  }, [detail.scoreHistory]);

  const progressData = useMemo(
    () =>
      detail.scoreHistory.map((point, index) => ({
        index: index + 1,
        date: formatDate(point.submittedAt),
        topic: point.topic ? titleCase(point.topic) : "—",
        [point.subject]: point.score,
      })),
    [detail.scoreHistory],
  );

  const topicData = useMemo(
    () =>
      detail.topicPerformance.slice(0, MAX_TOPIC_BARS).map((topic) => ({
        ...topic,
        label: titleCase(topic.topic),
      })),
    [detail.topicPerformance],
  );

  const timedTopicData = useMemo(
    () => topicData.filter((topic) => topic.avgTimeSeconds != null),
    [topicData],
  );

  return (
    <SyllabusShell breadcrumb={`My students / ${student.displayName}`}>
      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
        <Link
          href="/teacher"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#25877c] transition hover:text-[#1f5855]"
        >
          <ArrowLeft className="size-4" /> Back to my students
        </Link>

        <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#dceeea] text-xl font-extrabold text-[#1f5855]">
              {initials(student.displayName)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-[#1c3c39] md:text-3xl">
                {student.displayName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full bg-[#eff5f3] text-[#3f6d68]"
                >
                  {gradeLabel(student.classLevel)}
                </Badge>
                {detail.subjectAverages.map((item) => (
                  <Badge
                    key={item.subject}
                    variant="outline"
                    className="rounded-full bg-white"
                  >
                    {titleCase(item.subject)} · {item.avgScore}%
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Link
            href={`/student-profile?studentId=${student.id}`}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[#1f5855] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#194745] xl:self-auto"
          >
            Open full AI profile <ExternalLink className="size-4" />
          </Link>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Tests taken"
            value={formatCount.format(student.totalTests)}
          />
          <StatCard
            icon={Gauge}
            label="Average score"
            value={student.avgScore != null ? `${student.avgScore}%` : "—"}
          />
          <StatCard
            icon={Timer}
            label="Avg time per question"
            value={formatSeconds(student.avgTimeSeconds)}
            hint={
              student.avgTimeSeconds != null && student.avgTimeSeconds > 50
                ? "Above the 50s target — consider speed practice"
                : undefined
            }
          />
          <StatCard
            icon={CalendarDays}
            label="Last active"
            value={formatDateWithYear(student.lastActive)}
          />
        </section>

        <TeacherAssetsPanel detail={detail} />

        <section className="mb-8 rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[#1f7169]" />
            <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#263d3a]">
              Score progress across tests
            </h2>
          </div>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">
            Every submitted test in order, split by subject.
          </p>
          {progressData.length >= 2 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece9e2" />
                  <XAxis
                    dataKey="date"
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
                    labelFormatter={(label, payload) => {
                      const topic = payload?.[0]?.payload?.topic;
                      return topic && topic !== "—"
                        ? `${label} · ${topic}`
                        : String(label);
                    }}
                  />
                  <Legend formatter={(value) => titleCase(String(value))} />
                  {subjects.map((subject, index) => (
                    <Line
                      key={subject}
                      type="monotone"
                      dataKey={subject}
                      stroke={subjectColor(subject, index)}
                      strokeWidth={2.5}
                      connectNulls
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              At least two tests are needed to show progress.
            </div>
          )}
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
            <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#263d3a]">
              Accuracy by topic
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Correct answers as a share of attempted questions.
            </p>
            {topicData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece9e2" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "#697270" }}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={150}
                      tick={{ fontSize: 11, fill: "#304744" }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value ?? 0}%`, "Accuracy"]}
                    />
                    <Bar
                      dataKey="accuracy"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    >
                      {topicData.map((topic) => (
                        <Cell
                          key={topic.topic}
                          fill={scoreBarColor(topic.accuracy)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="grid h-80 place-items-center text-sm text-muted-foreground">
                No question-level data yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#e4e1d9] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-[#1f7169]" />
              <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#263d3a]">
                Time spent by topic
              </h2>
            </div>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Average seconds per question. Red bars are above the 50s target.
            </p>
            {timedTopicData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timedTopicData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece9e2" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "#697270" }}
                      unit="s"
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={150}
                      tick={{ fontSize: 11, fill: "#304744" }}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${value ?? 0}s`,
                        "Avg time / question",
                      ]}
                    />
                    <ReferenceLine
                      x={50}
                      stroke="#f47a62"
                      strokeDasharray="6 4"
                    />
                    <Bar
                      dataKey="avgTimeSeconds"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    >
                      {timedTopicData.map((topic) => (
                        <Cell
                          key={topic.topic}
                          fill={
                            (topic.avgTimeSeconds ?? 0) > 50
                              ? "#f47a62"
                              : "#2ec4b6"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="grid h-80 place-items-center text-sm text-muted-foreground">
                No timing data recorded yet.
              </div>
            )}
          </div>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <AreaList
            title="Strong areas"
            tone="strong"
            areas={detail.strongAreas}
            emptyText="No mastered learning objectives yet."
          />
          <AreaList
            title="Needs attention"
            tone="weak"
            areas={detail.weakAreas}
            emptyText="No weak learning objectives — great work!"
          />
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#263d3a]">
                Test history
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.assessments.length > MAX_HISTORY_ROWS
                  ? `Latest ${MAX_HISTORY_ROWS} of ${detail.assessments.length} submitted tests.`
                  : "All submitted tests, most recent first."}
              </p>
            </div>
            <Badge
              variant="outline"
              className="hidden rounded-full bg-white md:inline-flex"
            >
              {detail.assessments.length} tests
            </Badge>
          </div>
          {detail.assessments.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-[#e4e1d9] bg-[#fffefa] shadow-[0_8px_30px_rgba(31,55,53,0.05)]">
              <div className="hidden grid-cols-[110px_minmax(140px,1fr)_minmax(160px,1.2fr)_90px_110px_90px] gap-3 border-b border-[#e5e2da] bg-[#f4f1eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:grid">
                <span>Date</span>
                <span>Test</span>
                <span>Topic</span>
                <span className="text-center">Questions</span>
                <span className="text-center">Avg time</span>
                <span className="text-right">Score</span>
              </div>
              {detail.assessments
                .slice(0, MAX_HISTORY_ROWS)
                .map((assessment) => (
                  <div
                    key={assessment.id}
                    className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-3 border-b border-[#ece9e2] px-4 py-4 last:border-b-0 md:px-5 lg:grid-cols-[110px_minmax(140px,1fr)_minmax(160px,1.2fr)_90px_110px_90px]"
                  >
                    <div className="lg:contents">
                      <div className="font-mono text-xs font-bold text-[#304744]">
                        {formatDate(assessment.submittedAt)}
                      </div>
                      <div className="mt-1 text-sm font-bold text-[#263d3a] lg:mt-0">
                        {titleCase(assessment.testMode)} ·{" "}
                        {titleCase(assessment.subject)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground lg:mt-0 lg:text-sm">
                        {assessment.topic ? titleCase(assessment.topic) : "—"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground lg:mt-0 lg:text-center lg:font-mono lg:text-sm lg:font-bold lg:text-[#304744]">
                        {assessment.questionCount} questions
                      </div>
                      <div className="text-xs text-muted-foreground lg:text-center lg:font-mono lg:text-sm lg:font-bold lg:text-[#304744]">
                        {formatSeconds(assessment.avgTimeSeconds)}
                        <span className="lg:hidden"> / question</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="inline-block rounded-full px-2.5 py-1 font-mono text-sm font-bold"
                        style={{
                          color: scoreColor(assessment.score),
                          backgroundColor: `${scoreBarColor(assessment.score)}22`,
                        }}
                      >
                        {assessment.score}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#d9d5cc] bg-[#fffdfa]/70 px-6 py-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-[#7ca49f]" />
              <h3 className="font-bold text-[#2a413e]">No tests yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This student hasn&apos;t submitted any tests.
              </p>
            </div>
          )}
        </section>
      </main>
    </SyllabusShell>
  );
}
