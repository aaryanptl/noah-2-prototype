"use client";

import {
  type CodingChallenge,
  codingChallenges,
} from "@/agents/coding-agent/challenges";
import Link from "next/link";
import { useState } from "react";

const ALL_TOPICS = ["All", "HTML", "CSS", "Layout", "JS"] as const;

const TOPIC_EMOJIS: Record<string, string> = {
  All: "🌐",
  HTML: "📄",
  CSS: "🎨",
  Layout: "🧱",
  JS: "⚡",
};

export function ChallengePicker({
  challenges = codingChallenges,
}: {
  challenges?: CodingChallenge[];
}) {
  const [activeTopic, setActiveTopic] =
    useState<(typeof ALL_TOPICS)[number]>("All");

  const filtered =
    activeTopic === "All"
      ? challenges
      : challenges.filter((c) => c.topic === activeTopic);

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans text-[#1a1a2e]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-black/5 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="relative overflow-hidden h-7 w-7 rounded-lg bg-gradient-to-br from-[#3a5ccc] to-[#7c5cfc] text-[0.8rem] font-extrabold text-white no-underline transition-transform hover:scale-105"
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

      <main className="mx-auto max-w-[720px] px-5 py-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Hero */}
        <div className="mb-10 text-center">
          <span className="mb-2 block text-4xl animate-bounce">🌐</span>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl">
            Build the{" "}
            <span className="relative inline-block">
              Web
              <span className="absolute bottom-1 left-0 right-0 h-1.5 bg-[#ffc53d]/30 rounded" />
            </span>
          </h1>
          <p className="text-sm text-[#5a5a72]">
            Pick a challenge. Code on the left, watch it come alive on the
            right.
          </p>
        </div>

        {/* Topic Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {ALL_TOPICS.map((topic) => (
            <button
              key={topic}
              className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-4.5 py-1.5 text-xs font-bold transition-all ${
                activeTopic === topic
                  ? "border-[#3a5ccc] bg-[#3a5ccc]/5 text-[#3a5ccc]"
                  : "border-black/5 bg-white text-[#5a5a72] hover:border-[#3a5ccc]/40 hover:text-[#3a5ccc]"
              }`}
              onClick={() => setActiveTopic(topic)}
              type="button"
            >
              {TOPIC_EMOJIS[topic] && <span>{TOPIC_EMOJIS[topic]}</span>}
              {topic}
            </button>
          ))}
        </div>

        {/* Challenge List */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-[#9898b0] bg-white rounded-2xl border border-black/5">
              No challenges found for this category.
            </div>
          )}
          {filtered.map((ch, idx) => (
            <Link
              key={ch.id}
              href={`/coding-agent/${ch.id}`}
              className="flex items-center gap-4 rounded-2xl border-2 border-black/5 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#3a5ccc]/15 hover:shadow-lg"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f5f3f0] text-xs font-extrabold text-[#8a8aa0]">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-extrabold text-[#1a1a2e]">
                  {ch.title}
                </div>
                <div className="text-[0.68rem] font-bold text-[#8a8aa0] mt-0.5">
                  {TOPIC_EMOJIS[ch.topic] || ""} {ch.lesson}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wider ${
                  ch.difficulty === "easy"
                    ? "bg-[#2ecc87]/10 text-[#2ecc87]"
                    : ch.difficulty === "medium"
                      ? "bg-[#ffc53d]/10 text-[#b8860b]"
                      : "bg-[#f46853]/10 text-[#f46853]"
                }`}
              >
                {ch.difficulty}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
