"use client";

import { EyeOff, PartyPopper, RotateCcw, Undo2, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildScorecard,
  type Decision,
  type MasteryObjective,
  type Measurement,
  routeNext,
} from "@/lib/mastery/rules";
import { PLAIN_STEP, playSession } from "@/lib/mastery/story";

import { ObjectiveTiles, onWhat, Route, STATION, type Stop } from "./parts";

/** Riya's hidden truth: good at everything except this objective (1-based). */
const WEAK_INDEX = 5;
const GOOD = 0.9;
const WEAK = 0.35;
const RUSHED = 0.3;

type Day = "normal" | "rushed";

interface Played {
  decision: Decision;
  day: Day;
  measurements: Measurement[];
}

export function RiyaDemo({ objectives }: { objectives: MasteryObjective[] }) {
  const [played, setPlayed] = useState<Played[]>([]);
  const weakId = objectives[WEAK_INDEX - 1]?.id;

  const measurements = useMemo(
    () => played.flatMap((p) => p.measurements),
    [played],
  );
  const card = useMemo(
    () => buildScorecard(objectives, measurements),
    [objectives, measurements],
  );
  const decision = useMemo(() => routeNext(card), [card]);
  const plain = PLAIN_STEP[decision.activity];
  // Once a person has taught her weak objective, she has it.
  const taught = played.some(
    (p) =>
      PLAIN_STEP[p.decision.activity].human &&
      p.decision.targetLoIds.includes(weakId),
  );
  const done = decision.activity === "close";

  const play = (day: Day) => {
    const session = played.length + 1;
    const willBeTaught =
      taught || (plain.human && decision.targetLoIds.includes(weakId));
    const chance = (loId: number) =>
      day === "rushed"
        ? RUSHED
        : loId === weakId && !willBeTaught
          ? WEAK
          : GOOD;
    const at = new Date(Date.UTC(2026, 9, session)).toISOString();
    setPlayed([
      ...played,
      {
        decision,
        day,
        measurements: playSession(decision, chance, session, at),
      },
    ]);
  };

  const stops: Stop[] = played.map((p, index) => {
    const answered = p.measurements.reduce((n, m) => n + m.answered, 0);
    const correct = p.measurements.reduce((n, m) => n + m.correct, 0);
    return {
      key: String(index),
      accuracy: answered > 0 ? Math.round((100 * correct) / answered) : null,
      rushed: p.day === "rushed",
      title: `Session ${index + 1} · ${STATION[p.decision.activity]} ${onWhat(p.decision.targetLoIds, card.rows, p.decision.activity)} · ${correct}/${answered}`,
    };
  });
  const lastRushed = played.at(-1)?.day === "rushed";

  return (
    <div className="grid gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-[#15302f] p-5 text-white">
          <EyeOff className="mt-0.5 size-5 shrink-0 opacity-70" />
          <p className="leading-snug">
            <span className="font-semibold">
              Her secret, hidden from the loop:
            </span>{" "}
            she's good at everything except objective {WEAK_INDEX}.
          </p>
        </div>
        <ObjectiveTiles
          rows={card.rows}
          targets={done ? [] : decision.targetLoIds}
        />
        <p className="text-sm text-[#4a5a58]">
          {played.length === 0
            ? "The loop knows nothing about her yet."
            : `After ${played.length} session${played.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <div className="min-w-0">
        <Route
          stops={stops}
          activity={decision.activity}
          detail={
            !done && decision.targetLoIds.length < card.rows.length
              ? onWhat(decision.targetLoIds, card.rows, decision.activity)
              : undefined
          }
          animateLast
        />
        {!done && (
          <p className="mt-3 text-[15px] text-[#4a5a58]">{plain.why}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {done ? null : plain.human ? (
            <Button
              size="lg"
              className="bg-[#15302f] text-white hover:bg-[#15302f]/90"
              onClick={() => play("normal")}
            >
              {decision.activity === "escalate"
                ? "The teacher steps in"
                : "The mentor class happens"}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className="bg-[#15302f] text-white hover:bg-[#15302f]/90"
                onClick={() => play("normal")}
              >
                Next session: a normal day
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => play("rushed")}
              >
                <Zap className="size-4" />
                She rushes through it
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="lg"
            disabled={played.length === 0}
            onClick={() => setPlayed(played.slice(0, -1))}
          >
            <Undo2 className="size-4" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="lg"
            disabled={played.length === 0}
            onClick={() => setPlayed([])}
          >
            <RotateCcw className="size-4" />
            Start again
          </Button>
        </div>

        {lastRushed && !done && (
          <p className="mt-5 max-w-2xl rounded-xl bg-[#ece8f6] px-5 py-4 leading-relaxed text-[#2e2560]">
            She answered each question in about 3 seconds. The loop only sees
            the score, so it reads this as "doesn't know it".{" "}
            <span className="font-semibold">
              The AI would tell the mentor: too fast to be real attempts.
            </span>
          </p>
        )}
        {done && (
          <p className="mt-5 flex max-w-2xl items-start gap-3 rounded-xl bg-[#dcf2ee] px-5 py-4 leading-relaxed text-[#0f6b62]">
            <PartyPopper className="mt-0.5 size-5 shrink-0" />
            <span>
              Done in {played.length} sessions. The loop found objective{" "}
              {WEAK_INDEX}, got her help on it, and signed the rest off with
              short checks instead of more homework.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
