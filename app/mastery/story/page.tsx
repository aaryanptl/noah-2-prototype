"use client";

import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  Decision,
  LoRow,
  MasteryObjective,
  ReplayStep,
  Scorecard,
} from "@/lib/mastery/rules";

import {
  type AnswerExample,
  AnswerReading,
  type StoryAnswer,
} from "./answer-read";
import { RouteFork } from "./hero";
import { InsideTheLoop, LoopCycle } from "./loop";
import {
  JevChip,
  ObjectiveKey,
  ObjectiveTiles,
  onWhat,
  Route,
  ScoreScale,
  sinceAdvice,
  stopsFromSteps,
} from "./parts";
import { RiyaDemo } from "./riya";

/**
 * The presenter's page: what personalisation means, shown on three real
 * students on the same topic and one made-up student you drive.
 *
 * The students are picked to get three different next steps from the same
 * rules. Their evidence is frozen at UNTIL so the story does not change as
 * new sessions arrive. IDs are the platform's pseudonymous student IDs.
 */
const TOPIC_ID = 49;
/**
 * Wrong answers shown being read by Jev, by served-question id: one each that
 * Jev judged a guess, a missing idea, a misread question and a slip.
 */
const EXAMPLES = [
  { tsq: 144887, student: "Student C" },
  { tsq: 144914, student: "Student C" },
  { tsq: 209819, student: "Student B" },
  { tsq: 144878, student: "Student C" },
];
const UNTIL = "2026-10-15T23:59:59Z";
const CAST = [
  { id: "maALlSSBdo", label: "Student A", headline: "Already knows it" },
  {
    id: "ctBuuxn0XzcSpU",
    label: "Student B",
    headline: "Good, except one spot",
  },
  { id: "DL5z7dnm7w", label: "Student C", headline: "Rushing, not learning" },
];

interface DecideData {
  topic: { id: number; name: string; grade: string };
  objectives: MasteryObjective[];
  scorecard: Scorecard;
  decision: Decision;
  steps: ReplayStep[];
}

interface Journey {
  rows: LoRow[];
  decision: Decision;
  steps: ReplayStep[];
  answers: StoryAnswer[] | null;
  answersError: string | null;
}

type Slot = Journey | { error: string } | null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  // A dev server that has lost its API routes answers with an HTML 404 page.
  const json = await res.json().catch(() => null);
  if (!json)
    throw new Error(
      `the server answered ${res.status} with no data. Restart the dev server and reload.`,
    );
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data as T;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function MasteryStoryPage() {
  const [slots, setSlots] = useState<Slot[]>(CAST.map(() => null));
  const [topic, setTopic] = useState<DecideData["topic"] | null>(null);
  const [objectives, setObjectives] = useState<MasteryObjective[]>([]);

  useEffect(() => {
    let cancelled = false;
    CAST.forEach((cast, index) => {
      const query = `student=${encodeURIComponent(cast.id)}&topic=${TOPIC_ID}&until=${encodeURIComponent(UNTIL)}`;
      const put = (slot: Slot) =>
        !cancelled &&
        setSlots((current) => current.map((s, i) => (i === index ? slot : s)));
      getJson<DecideData>(`/api/mastery/decide?${query}`)
        .then((data) => {
          if (cancelled) return;
          if (index === 0) {
            setTopic(data.topic);
            setObjectives(data.objectives);
          }
          const journey: Journey = {
            rows: data.scorecard.rows,
            decision: data.decision,
            steps: data.steps,
            answers: null,
            answersError: null,
          };
          put(journey);
          getJson<{ answers: StoryAnswer[] }>(`/api/mastery/errors?${query}`)
            .then((errors) => put({ ...journey, answers: errors.answers }))
            .catch((err) =>
              put({
                ...journey,
                answersError:
                  err instanceof Error ? err.message : "Unavailable",
              }),
            );
        })
        .catch((err) =>
          put({ error: err instanceof Error ? err.message : "Could not load" }),
        );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const topicName = topic?.name ?? "Factors, Multiples & Primes";
  const examples: AnswerExample[] = EXAMPLES.flatMap(({ tsq, student }) => {
    for (const slot of slots) {
      const answer =
        slot && "answers" in slot
          ? slot.answers?.find((a) => a.tsq === tsq)
          : undefined;
      if (answer) return [{ student, answer }];
    }
    return [];
  });

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#15302f]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link
          href="/mastery"
          className="inline-flex items-center gap-1.5 rounded text-sm text-[#4a5a58] hover:text-[#15302f] focus-visible:outline-2 focus-visible:outline-[#15302f]"
        >
          <ArrowLeft className="size-4" />
          Mastery loop
        </Link>

        {/* Hero: the whole idea in one picture */}
        <section className="grid items-center gap-10 pt-10 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <h1 className="text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-6xl">
              Same topic.
              <br />
              Different students.
              <br />
              Different next step.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[#4a5a58]">
              The loop reads every answer, objective by objective, and picks
              what this student needs next. AI reads every wrong answer to find
              out why.
            </p>
          </div>
          <div className="hidden sm:block">
            <RouteFork
              topic={topicName}
              branches={CAST.map((cast, index) => {
                const slot = slots[index];
                return {
                  label: cast.label,
                  headline: cast.headline,
                  activity:
                    slot && "decision" in slot ? slot.decision.activity : null,
                };
              })}
            />
          </div>
        </section>

        {/* What the loop is */}
        <section className="border-t-2 border-[#15302f] pt-8 pb-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            What is the loop?
          </h2>
          <p className="mt-2 max-w-2xl text-[#4a5a58]">
            The same four steps, after every session a student does on a topic.
          </p>
          <div className="mt-10">
            <LoopCycle />
          </div>
        </section>

        {/* What step 4 can pick */}
        <section className="border-t-2 border-[#15302f] pt-8 pb-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            What comes under the loop
          </h2>
          <p className="mt-2 max-w-2xl text-[#4a5a58]">
            Everything step 4 can pick. Most of it the platform runs on its own;
            three need a person.
          </p>
          <div className="mt-8">
            <InsideTheLoop />
          </div>
        </section>

        {/* How it decides */}
        <section className="border-t-2 border-[#15302f] pt-8 pb-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Each objective sits somewhere on one line. Where it sits picks the
            next step.
          </h2>
          <div className="mt-8">
            <ScoreScale />
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#4a5a58]">
            <Scale className="size-4 shrink-0" />A score only counts once at
            least 9 questions back it, so one lucky test can't move a student
            on.
          </p>
        </section>

        {/* Three real students */}
        <section className="border-t-2 border-[#15302f] pt-8 pb-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Three real students on {topicName}
          </h2>
          {objectives.length > 0 && (
            <div className="mt-6">
              <ObjectiveKey objectives={objectives} />
            </div>
          )}
          <RouteLegend />

          <div className="mt-4">
            {CAST.map((cast, index) => (
              <StudentJourney
                key={cast.id}
                label={cast.label}
                headline={cast.headline}
                slot={slots[index]}
              />
            ))}
          </div>
        </section>

        {/* AI reading wrong answers */}
        <section className="border-t-2 border-[#6d5bd0] pt-8 pb-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            AI reads every wrong answer to find out why
          </h2>
          <p className="mt-2 max-w-2xl text-[#4a5a58]">
            Today all four of these are just marked wrong. The AI reads each one
            the way a teacher would, and finds four different reasons.
          </p>
          <div className="mt-8">
            {examples.length > 0 ? (
              <AnswerReading examples={examples} />
            ) : (
              <p className="text-sm text-[#8b9592]">
                The AI is reading the answers…
              </p>
            )}
          </div>
        </section>

        {/* Riya */}
        <section className="border-t-2 border-[#15302f] pt-8 pb-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Now you drive: Riya
          </h2>
          <p className="mt-2 max-w-xl text-[#4a5a58]">
            A made-up student. You decide how each session goes; the same rules
            pick her next step.
          </p>
          <div className="mt-8">
            {objectives.length > 0 ? (
              <RiyaDemo objectives={objectives} />
            ) : (
              <p className="text-sm text-[#8b9592]">Loading the topic…</p>
            )}
          </div>
        </section>

        {/* Where AI fits */}
        <section className="border-t-2 border-[#15302f] pt-8 pb-12">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Where the AI fits
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#15302f] bg-white p-6">
              <p className="text-xl font-bold">Rules choose the next step</p>
              <p className="mt-2 text-[#4a5a58]">
                Same answers in, same step out. Every step has a one-line
                reason, and the numbers were set on 12,500 real sessions.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-md bg-[#fbe3e6] px-2.5 py-1 font-semibold text-[#a8283c] tabular-nums">
                  Objective 2 · 47
                </span>
                <span className="text-[#8b9592]">becomes</span>
                <span className="rounded-full border-2 border-[#15302f] px-3 py-1 font-semibold">
                  Practise that objective
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-[#ece8f6] p-6 text-[#2e2560]">
              <p className="text-xl font-bold">The AI explains the mistake</p>
              <p className="mt-2 text-[#4b4280]">
                It reads each wrong answer next to the question and the worked
                solution, and tells the mentor why it went wrong.
              </p>
              <ul className="mt-5 space-y-1.5 text-sm font-medium">
                <li>Why did it go wrong?</li>
                <li>Is the method missing?</li>
                <li>Does it need teaching again?</li>
                <li>Was it too fast to be a real attempt?</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-[#4a5a58]">
            We tested letting the AI choose the step too. Telling "doesn't
            understand" from "slipped" didn't predict what happened next, so the
            AI explains and the rules decide. Rushing did predict trouble. That
            is the next rule we're testing.
          </p>
        </section>
      </div>
    </main>
  );
}

function RouteLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#4a5a58]">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-[#1f9d8b]" /> 80%+
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-[#e3a23b]" /> 60–79%
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-[#d0485e]" /> under 60%
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-6 border-t-[3px] border-[#15302f]" /> sessions
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-6 border-t-[3px] border-dashed border-[#b9c2bf]" />
        what happened after the loop would have switched
      </span>
    </div>
  );
}

function StudentJourney({
  label,
  headline,
  slot,
}: {
  label: string;
  headline: string;
  slot: Slot;
}) {
  return (
    <article className="grid gap-6 border-b border-[#d8dedc] py-8 last:border-b-0 lg:grid-cols-[230px_minmax(0,1fr)]">
      <div>
        <p className="text-sm font-medium text-[#4a5a58]">{label}</p>
        <h3 className="mt-0.5 text-2xl font-bold tracking-tight">{headline}</h3>
        {slot && "rows" in slot && (
          <div className="mt-4">
            <ObjectiveTiles
              rows={slot.rows}
              targets={slot.decision.targetLoIds}
              size="sm"
            />
          </div>
        )}
      </div>
      <div className="min-w-0">
        {slot === null ? (
          <p className="text-sm text-[#8b9592]">Loading {label}…</p>
        ) : "error" in slot ? (
          <p className="rounded-lg bg-[#fbe3e6] px-4 py-3 text-sm text-[#a8283c]">
            Couldn't load {label}: {slot.error}
          </p>
        ) : (
          <JourneyBody journey={slot} />
        )}
      </div>
    </article>
  );
}

function JourneyBody({ journey }: { journey: Journey }) {
  const { steps, decision, rows } = journey;
  const since = sinceAdvice(steps, decision);
  return (
    <>
      <Route
        stops={stopsFromSteps(steps)}
        switchAt={since?.from ?? -1}
        activity={decision.activity}
        detail={
          decision.targetLoIds.length < rows.length
            ? onWhat(decision.targetLoIds, rows, decision.activity)
            : undefined
        }
      />
      {since && since.sessions > 0 && (
        <p className="mt-3 text-[15px]">
          The loop would have switched on {shortDate(since.since)}.{" "}
          <span className="font-semibold">
            {since.sessions} more session{since.sessions === 1 ? "" : "s"}{" "}
            happened instead
            {since.accuracy !== null && `, ${since.accuracy}% right`}.
          </span>
        </p>
      )}
      <div className="mt-3">
        <JevChip answers={journey.answers} error={journey.answersError} />
      </div>
    </>
  );
}
