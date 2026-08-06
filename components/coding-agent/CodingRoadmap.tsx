"use client";

import type {
  CodingRoadmap as CodingRoadmapData,
  RoadmapLevel,
  RoadmapModule,
} from "@/lib/coding-challenges";
import Link from "next/link";
import { useState } from "react";

const TOPIC_EMOJIS: Record<string, string> = {
  HTML: "📄",
  CSS: "🎨",
  Layout: "🧱",
  JS: "⚡",
};

// A short, friendly tagline per level so the locked sections still feel like a
// journey worth unlocking.
const LEVEL_TAGLINES: Record<string, string> = {
  "Level 1": "HTML, CSS & JavaScript foundations",
  "Level 2": "Bootstrap, Advanced JS & React",
  "Level 3": "Databases, Node.js & Express",
};

const LEVEL_ICONS: Record<string, string> = {
  "Level 1": "🚀",
  "Level 2": "🛠️",
  "Level 3": "🗄️",
};

function difficultyClasses(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "easy") return "bg-[#2ecc87]/10 text-[#2ecc87]";
  if (difficulty === "medium") return "bg-[#ffc53d]/10 text-[#b8860b]";
  return "bg-[#f46853]/10 text-[#f46853]";
}

function moduleKey(level: RoadmapLevel, module: RoadmapModule) {
  return `${level.id}::${module.name}`;
}

export function CodingRoadmap({ roadmap }: { roadmap: CodingRoadmapData }) {
  // Open the first module that actually has challenges so something is visible
  // on load; everything else starts collapsed.
  const firstPopulated = (() => {
    for (const level of roadmap.levels) {
      if (level.locked) continue;
      const mod = level.modules.find((m) => m.count > 0);
      if (mod) return moduleKey(level, mod);
    }
    return null;
  })();

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(firstPopulated ? [firstPopulated] : []),
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const unlockedCount = roadmap.levels.filter((l) => !l.locked).length;
  const totalChallenges = roadmap.levels.reduce((sum, l) => sum + l.count, 0);

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans text-[#1a1a2e]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-black/5 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="relative h-7 w-7 overflow-hidden rounded-lg bg-gradient-to-br from-[#3a5ccc] to-[#7c5cfc] text-[0.8rem] font-extrabold text-white no-underline transition-transform hover:scale-105"
          >
            <span className="absolute inset-0 flex items-center justify-center">
              N
            </span>
          </Link>
          <span className="text-[0.88rem] font-bold tracking-tight">
            Noah 2.0 <span className="text-[#3a5ccc]">· Web Lab</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] animate-in fade-in slide-in-from-bottom-4 px-5 py-10 pb-24 duration-500">
        {/* Hero */}
        <div className="mb-8 text-center">
          <span className="mb-2 block animate-bounce text-4xl">🗺️</span>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl">
            Your Coding{" "}
            <span className="relative inline-block">
              Journey
              <span className="absolute bottom-1 left-0 right-0 h-1.5 rounded bg-[#ffc53d]/30" />
            </span>
          </h1>
          <p className="text-sm text-[#5a5a72]">
            Follow the path, level by level. Each milestone unlocks hands-on
            challenges.
          </p>

          {/* Journey progress */}
          <div className="mx-auto mt-5 flex max-w-sm items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3a5ccc] to-[#7c5cfc] text-base">
              ⭐
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between text-[0.7rem] font-bold text-[#5a5a72]">
                <span>
                  Level {unlockedCount} of {roadmap.levels.length} unlocked
                </span>
                <span className="text-[#3a5ccc]">
                  {totalChallenges} challenges
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0eee9]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3a5ccc] to-[#7c5cfc]"
                  style={{
                    width: `${Math.round(
                      (unlockedCount / roadmap.levels.length) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Levels */}
        <div className="flex flex-col gap-7">
          {roadmap.levels.map((level) => (
            <LevelSection
              key={level.id}
              level={level}
              open={open}
              onToggle={toggle}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function LevelSection({
  level,
  open,
  onToggle,
}: {
  level: RoadmapLevel;
  open: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <section>
      {/* Level header band */}
      <div
        className={`mb-4 flex items-center gap-3 rounded-2xl border p-4 ${
          level.locked
            ? "border-black/5 bg-[#f3f1ec]"
            : "border-[#3a5ccc]/15 bg-gradient-to-br from-[#3a5ccc]/[0.06] to-[#7c5cfc]/[0.06]"
        }`}
      >
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${
            level.locked ? "bg-[#e6e3dc] grayscale" : "bg-white shadow-sm"
          }`}
        >
          {level.locked ? "🔒" : (LEVEL_ICONS[level.id] ?? "🚀")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight">
              {level.label}
            </h2>
            {level.locked ? (
              <span className="rounded-full bg-[#9898b0]/15 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-[#8a8aa0]">
                Locked
              </span>
            ) : (
              <span className="rounded-full bg-[#2ecc87]/15 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-[#2ecc87]">
                Unlocked
              </span>
            )}
          </div>
          <p className="truncate text-[0.72rem] font-semibold text-[#8a8aa0]">
            {level.locked
              ? "Complete Level 1 to unlock"
              : (LEVEL_TAGLINES[level.id] ?? `${level.count} challenges`)}
          </p>
        </div>
        {!level.locked && level.count > 0 && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-extrabold text-[#3a5ccc] shadow-sm">
            {level.count} q
          </span>
        )}
      </div>

      {/* Roadmap path */}
      <div
        className={`relative ${
          level.locked ? "pointer-events-none select-none opacity-60" : ""
        }`}
      >
        {/* Connector rail */}
        <div className="absolute bottom-3 left-[19px] top-3 w-0.5 bg-gradient-to-b from-[#3a5ccc]/30 via-[#7c5cfc]/25 to-transparent" />

        <ol className="relative flex flex-col gap-2.5">
          {level.modules.map((module, idx) => (
            <ModuleNode
              key={module.name}
              module={module}
              index={idx}
              level={level}
              isOpen={open.has(moduleKey(level, module))}
              onToggle={() => onToggle(moduleKey(level, module))}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function ModuleNode({
  module,
  index,
  level,
  isOpen,
  onToggle,
}: {
  module: RoadmapModule;
  index: number;
  level: RoadmapLevel;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasContent = !level.locked && module.count > 0;

  // Node circle appearance per state.
  const circle = level.locked
    ? "bg-[#e6e3dc] text-[#a8a498]"
    : hasContent
      ? "bg-gradient-to-br from-[#3a5ccc] to-[#7c5cfc] text-white shadow-md"
      : "border-2 border-dashed border-black/10 bg-white text-[#bdbdcf]";

  return (
    <li className="relative flex gap-4">
      {/* Node circle on the rail */}
      <div
        className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[0.8rem] font-extrabold ${circle}`}
      >
        {level.locked ? "🔒" : index + 1}
      </div>

      {/* Module content */}
      <div className="min-w-0 flex-1 pb-1.5">
        <button
          type="button"
          disabled={!hasContent}
          onClick={onToggle}
          className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
            hasContent
              ? "border-black/5 bg-white hover:-translate-y-0.5 hover:border-[#3a5ccc]/15 hover:shadow-lg"
              : "cursor-default border-transparent bg-white/50"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-[#1a1a2e]">
              {module.name}
            </div>
            <div className="mt-0.5 text-[0.68rem] font-bold text-[#9898b0]">
              {level.locked
                ? "Locked"
                : module.count > 0
                  ? `${module.count} challenge${module.count === 1 ? "" : "s"}`
                  : "Coming soon"}
            </div>
          </div>
          {hasContent && (
            <span
              className={`shrink-0 text-[#bdbdcf] transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
          )}
        </button>

        {/* Expanded question cards, grouped by topic */}
        {hasContent && isOpen && (
          <div className="mt-3 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {module.topics.map((topicGroup) => (
              <div key={topicGroup.topic}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[#9898b0]">
                    {topicGroup.topic}
                  </span>
                  <span className="h-px flex-1 bg-black/5" />
                  <span className="text-[0.62rem] font-bold text-[#bdbdcf]">
                    {topicGroup.cards.length}
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {topicGroup.cards.map((card) => (
                    <Link
                      key={card.id}
                      href={`/coding-agent/${card.id}`}
                      className="group flex items-center gap-3 rounded-xl border border-black/5 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-[#3a5ccc]/20 hover:shadow-md"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f5f3f0] text-base">
                        {TOPIC_EMOJIS[card.topic] ?? "💡"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8rem] font-bold text-[#1a1a2e]">
                          {card.title}
                        </span>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wider ${difficultyClasses(
                            card.difficulty,
                          )}`}
                        >
                          {card.difficulty}
                        </span>
                      </span>
                      <span className="shrink-0 text-[#d4d4e0] transition-colors group-hover:text-[#3a5ccc]">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
