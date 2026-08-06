"use client";

import Link from "next/link";

interface TopbarProps {
  showBack?: boolean;
  xp?: number;
  streak?: number;
  onOpenMethodology?: () => void;
}

export function Topbar({
  showBack = false,
  xp = 0,
  streak = 0,
  onOpenMethodology,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-black/5 bg-white px-6 md:px-12 shadow-sm">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="relative overflow-hidden h-7 w-7 rounded-lg bg-gradient-to-br from-[#3a5ccc] to-[#7c5cfc] text-[0.8rem] font-extrabold text-white no-underline transition-transform hover:scale-105"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            N
          </span>
        </Link>
        <span className="text-[0.88rem] font-bold tracking-tight text-[#1a1a2e]">
          Noah 2.0 <span className="text-[#3a5ccc]">· Web Lab</span>
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {onOpenMethodology && (
          <button
            onClick={onOpenMethodology}
            className="flex items-center gap-1 rounded-full border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 px-3 py-1.5 text-[0.74rem] font-bold text-[#7c5cfc] transition-all hover:bg-[#7c5cfc]/10 hover:-translate-y-0.5"
          >
            📋 Methodology
          </button>
        )}

        <div
          className="flex items-center gap-1 rounded-full border border-[#f46853]/10 bg-[#f46853]/5 px-2.5 py-1 text-[0.72rem] font-bold text-[#f46853]"
          id="streakBadge"
        >
          🔥 {streak}
        </div>

        <div
          className="flex items-center gap-1 rounded-full border border-[#ffc53d]/15 bg-[#ffc53d]/8 px-2.5 py-1 text-[0.72rem] font-bold text-[#ff9a3c]"
          id="xpBadge"
        >
          ⚡ {xp} XP
        </div>

        {showBack && (
          <Link
            href="/coding-agent"
            className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[0.74rem] font-bold text-[#5a5a72] transition-colors hover:border-[#3a5ccc] hover:text-[#3a5ccc]"
          >
            ← Challenges
          </Link>
        )}
      </div>
    </header>
  );
}
