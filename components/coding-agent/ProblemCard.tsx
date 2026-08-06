import type { CodingChallenge } from "@/agents/coding-agent/challenges";
import type { ScaffoldingMode } from "./EditorPanel";

interface ProblemCardProps {
  challenge: CodingChallenge;
  goalsMet?: Record<string, boolean>;
  mode?: ScaffoldingMode;
  currentStepIndex?: number;
  demoStepsLength?: number;
}

export function ProblemCard({
  challenge,
  goalsMet,
  mode,
  currentStepIndex = 0,
  demoStepsLength = 0,
}: ProblemCardProps) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-white p-5 shadow-sm">
      <h1 className="mb-2.5 text-xl font-extrabold text-[#1a1a2e]">
        {challenge.title}
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold tracking-wider uppercase ${
            challenge.difficulty === "easy"
              ? "bg-green-100 text-green-600"
              : challenge.difficulty === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-600"
          }`}
        >
          {challenge.difficulty}
        </span>
        <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[#4f46e5]">
          {challenge.topic}
        </span>
        {mode && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${
              mode === "guide"
                ? "bg-[#2ecc87]/10 text-[#2ecc87]"
                : mode === "pair"
                  ? "bg-[#3b82f6]/10 text-[#3b82f6]"
                  : "bg-[#ef4444]/10 text-[#ef4444]"
            }`}
          >
            🦊 {mode === "guide" ? "Guide" : mode === "pair" ? "Pair" : "Solo"}
            {mode === "guide" &&
              demoStepsLength > 0 &&
              ` (${currentStepIndex + 1}/${demoStepsLength})`}
          </span>
        )}
      </div>

      <div
        className="text-[0.82rem] leading-relaxed text-[#5a5a72] html-desc"
        dangerouslySetInnerHTML={{ __html: challenge.desc }}
      />

      {/* Inline horizontal Goals Checklist */}
      {goalsMet && challenge.goals.length > 0 && (
        <div className="mt-4 border-t border-black/5 pt-3">
          <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-[#8a8aa0] mb-2">
            Goals Checklist
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {challenge.goals.map((g) => {
              const isMet = !!goalsMet[g.id];
              return (
                <div
                  key={g.id}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isMet ? "text-[#1a1a2e]" : "text-[#8a8aa0]"}`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all duration-300 ${isMet ? "bg-[#2ecc87] border-[#2ecc87] text-white text-[0.55rem]" : "border-black/15 bg-white"}`}
                  >
                    {isMet ? "✓" : ""}
                  </span>
                  <span>{g.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
