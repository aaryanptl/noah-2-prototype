"use client";

import { useMemo, useState } from "react";

import {
  type Decision,
  NEEDS_HELP_SCORE,
  READY_SCORE,
  type Scorecard,
} from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

import { ACTIVITY_LABEL } from "./shared";

export interface ChartPoint {
  round: number;
  card: Scorecard;
  /** The activity that produced this point (undefined for round 0). */
  decision?: Decision;
  certified: string[];
  /** Overrides the tooltip's activity text — e.g. what a real student actually did. */
  label?: string;
}

const W = 960;
const H = 260;
const PAD = { top: 16, right: 24, bottom: 34, left: 36 };

function isHuman(activity: Decision["activity"] | undefined) {
  return (
    activity === "class" ||
    activity === "topic_class" ||
    activity === "escalate"
  );
}

/**
 * Score over rounds. One accent line (topic), one muted line per objective,
 * the two decision lines the router reads, and marks for sign-offs and
 * mentor interventions. Hover a round for every number behind it.
 */
export function ScoreChart({
  points,
  objectives,
  xLabel = "round",
  prescribed = false,
}: {
  points: ChartPoint[];
  objectives: Array<{ id: number; name: string }>;
  /** Axis word: "round" in the sandbox, "session" for a real student. */
  xLabel?: string;
  /** True when the intervention ticks are what the loop *would have* asked for. */
  prescribed?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const maxRound = Math.max(1, points.length - 1);
  const { x, y } = useMemo(
    () => ({
      x: (round: number) =>
        PAD.left + (round / maxRound) * (W - PAD.left - PAD.right),
      y: (score: number) =>
        PAD.top + (1 - score / 100) * (H - PAD.top - PAD.bottom),
    }),
    [maxRound],
  );

  const topicPath = useMemo(
    () =>
      linePath(
        points.map((p) =>
          p.card.topicScore === null
            ? null
            : [x(p.round), y(p.card.topicScore)],
        ),
      ),
    [points, x, y],
  );

  const loPaths = useMemo(
    () =>
      objectives.map((objective) => {
        const coords = points.map((p) => {
          const row = p.card.rows.find((r) => r.id === objective.id);
          return row?.score == null ? null : [x(p.round), y(row.score)];
        });
        const signedAt = points.findIndex((p) =>
          p.card.rows.some((r) => r.id === objective.id && r.signedOff),
        );
        return {
          id: objective.id,
          name: objective.name,
          d: linePath(coords),
          end: signedAt >= 0 && coords[signedAt] ? coords[signedAt] : null,
        };
      }),
    [points, objectives, x, y],
  );

  const hovered = hover === null ? null : points[hover];
  const ticks = [0, 20, 40, 60, 80, 100];
  const roundTicks = useMemo(() => {
    const step = maxRound <= 12 ? 1 : maxRound <= 30 ? 5 : 10;
    const out: number[] = [];
    for (let r = 0; r <= maxRound; r += step) out.push(r);
    return out;
  }, [maxRound]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Topic and objective scores by round"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const px = ((event.clientX - rect.left) / rect.width) * W;
          const round = Math.round(
            ((px - PAD.left) / (W - PAD.left - PAD.right)) * maxRound,
          );
          setHover(Math.max(0, Math.min(points.length - 1, round)));
        }}
      >
        <title>Topic and objective scores by round</title>
        {/* grid */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(26,26,46,0.06)"
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fontFamily="var(--font-mono)"
              fill="var(--text-dim)"
            >
              {t}
            </text>
          </g>
        ))}
        {/* decision lines */}
        {[
          [READY_SCORE, "ready"],
          [NEEDS_HELP_SCORE, "teaching line"],
        ].map(([value, label]) => (
          <g key={label}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(Number(value))}
              y2={y(Number(value))}
              stroke="rgba(26,26,46,0.28)"
              strokeDasharray="4 4"
            />
            <text
              x={W - PAD.right}
              y={y(Number(value)) - 5}
              textAnchor="end"
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--text-dim)"
            >
              {label}
            </text>
          </g>
        ))}
        {/* x axis */}
        {roundTicks.map((r) => (
          <text
            key={r}
            x={x(r)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="var(--text-dim)"
          >
            {r}
          </text>
        ))}
        <text
          x={W - PAD.right}
          y={H - 4}
          textAnchor="end"
          fontSize="10"
          fill="var(--text-dim)"
        >
          {xLabel}
        </text>
        {/* intervention ticks */}
        {points.map((p) =>
          isHuman(p.decision?.activity) ? (
            <line
              key={`h-${p.round}`}
              x1={x(p.round)}
              x2={x(p.round)}
              y1={H - PAD.bottom}
              y2={H - PAD.bottom - 8}
              stroke={
                p.decision?.activity === "escalate" ? "#b8432c" : "#9a6200"
              }
              strokeWidth="2"
            />
          ) : null,
        )}
        {/* objective lines */}
        {loPaths.map((lo) => (
          <g key={lo.id}>
            <path
              d={lo.d}
              fill="none"
              stroke="rgba(26,26,46,0.22)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {lo.end && (
              <circle
                cx={lo.end[0]}
                cy={lo.end[1]}
                r="4.5"
                fill="#1c7a3a"
                stroke="white"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
        {/* topic line */}
        <path
          d={topicPath}
          fill="none"
          stroke="var(--heading)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* crosshair */}
        {hovered && (
          <g>
            <line
              x1={x(hovered.round)}
              x2={x(hovered.round)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(26,26,46,0.25)"
            />
            {hovered.card.topicScore !== null && (
              <circle
                cx={x(hovered.round)}
                cy={y(hovered.card.topicScore)}
                r="4.5"
                fill="var(--heading)"
                stroke="white"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className={cn(
            "pointer-events-none absolute top-2 z-10 w-64 rounded-lg border border-[var(--border)] bg-white p-3 text-xs shadow-md",
            hovered.round / maxRound > 0.6 ? "left-10" : "right-6",
          )}
        >
          <p className="flex items-baseline justify-between">
            <span className="font-semibold">
              {xLabel === "round" ? "Round" : "Session"} {hovered.round}
            </span>
            <span className="text-[var(--text-dim)]">
              {hovered.label ??
                (hovered.decision
                  ? ACTIVITY_LABEL[hovered.decision.activity]
                  : "Start")}
            </span>
          </p>
          <p className="mt-1 flex items-baseline justify-between border-b border-[var(--border)] pb-1.5">
            <span>Topic</span>
            <span className="font-mono font-semibold">
              {hovered.card.topicScore ?? "—"}
            </span>
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {hovered.card.rows.map((row) => (
              <li key={row.id} className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">
                  {row.name}
                </span>
                <span
                  className={cn("font-mono", row.signedOff && "text-[#1c7a3a]")}
                >
                  {row.score === null ? "—" : Math.round(row.score)}
                  {row.signedOff ? " ✓" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[11px] text-[var(--text-dim)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-[var(--heading)]" />
          Topic score
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-px w-5 bg-neutral-400" />
          One line per objective
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[#1c7a3a]" />
          Signed off
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-0.5 bg-[#9a6200]" />
          {prescribed
            ? "Loop would have asked for a mentor class"
            : "Mentor class"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-0.5 bg-[#b8432c]" />
          {prescribed
            ? "Loop would have flagged to teacher"
            : "Flagged to teacher"}
        </span>
      </div>
    </div>
  );
}

function linePath(coords: Array<[number, number] | number[] | null>) {
  let d = "";
  let open = false;
  for (const c of coords) {
    if (!c) {
      open = false;
      continue;
    }
    d += `${open ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)} `;
    open = true;
  }
  return d;
}
