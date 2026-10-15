"use client";

import type { Activity } from "@/lib/mastery/rules";
import { cn } from "@/lib/utils";

import { StationBadge } from "./parts";
import styles from "./story.module.css";

export interface Branch {
  label: string;
  headline: string;
  activity: Activity | null;
}

/**
 * Badge centres, in px from the top of the 300px-tall fork: three 72px rows
 * spread top to bottom, each a 20px label over a 44px badge.
 */
const ENDS = [46, 160, 274];

/** One topic, three students, three routes out of it. */
export function RouteFork({
  topic,
  branches,
}: {
  topic: string;
  branches: Branch[];
}) {
  return (
    <div className="relative grid h-[300px] grid-cols-[96px_minmax(48px,1fr)_auto] items-stretch">
      <div className="relative">
        <span className="absolute top-1/2 right-0 size-6 translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#15302f] bg-white" />
        <span className="absolute top-[calc(50%+20px)] right-0 left-0 text-right text-xs leading-tight font-semibold text-[#15302f]">
          {topic}
        </span>
      </div>
      <svg
        className="h-full w-full"
        viewBox="0 0 100 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {ENDS.map((y) => (
          <path
            key={y}
            className={styles.route}
            d={`M0 150 C 55 150, 45 ${y}, 100 ${y}`}
            fill="none"
            stroke="#15302f"
            strokeWidth="4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="flex flex-col justify-between">
        {branches.map((branch) => (
          <div
            key={branch.label}
            className={cn(
              "flex h-[72px] flex-col justify-center",
              styles.arrive,
            )}
          >
            <span className="mb-1 text-xs font-medium text-[#4a5a58]">
              {branch.label} · {branch.headline}
            </span>
            {branch.activity ? (
              <StationBadge activity={branch.activity} />
            ) : (
              <span className="h-11 w-48 animate-pulse rounded-full bg-[#e8ecea]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
