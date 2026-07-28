import { BookOpen, Check } from "lucide-react";

export function PlanTopicSelector({
  step,
  required,
  topics,
  selectedTopics,
  recommendedTopics,
  studentName,
  onToggle,
  onSelectAll,
  onClear,
}: {
  /** When set, renders a numbered badge matching the builder's 1-2-3 flow. */
  step?: number;
  required?: boolean;
  topics: string[];
  selectedTopics: string[];
  recommendedTopics: string[];
  studentName: string;
  onToggle: (topic: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const selected = new Set(selectedTopics);
  const recommended = new Set(recommendedTopics);

  return (
    <div className="rounded-2xl border border-[#e5e1d9] bg-[#fffefa] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            {step != null && (
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#1f5855] text-xs font-bold text-white">
                {step}
              </span>
            )}
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#25877c]">
              <BookOpen className="size-4" /> Topics for this plan
            </span>
            {step != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                  required
                    ? "bg-[#fdecec] text-[#bd503e]"
                    : "bg-[#f0ede7] text-muted-foreground"
                }`}
              >
                {required ? "Required" : "Optional"}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose what the plan should cover for {studentName}. Recommended
            topics come from the diagnostic evidence above.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[#1f7169] transition hover:text-[#194745]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground transition hover:text-[#bd503e]"
          >
            Clear
          </button>
        </div>
      </div>

      {topics.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-[#d9d5cc] px-4 py-6 text-center text-sm text-muted-foreground">
          No curriculum topics are available for this student yet.
        </p>
      ) : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            const isSelected = selected.has(topic);
            const isRecommended = recommended.has(topic);
            return (
              <button
                key={topic}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(topic)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "border-[#76bcb3] bg-[#edf7f4] text-[#1d625b]"
                    : "border-[#e4e0d8] bg-white text-[#455855] hover:border-[#9cc9c1]"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                    isSelected
                      ? "border-[#25877c] bg-[#25877c] text-white"
                      : "border-[#cfcac1] bg-[#faf8f4]"
                  }`}
                >
                  {isSelected ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-5">
                    {topic}
                  </span>
                  {isRecommended ? (
                    <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#25877c]">
                      Recommended from evidence
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs font-semibold text-muted-foreground">
        {selectedTopics.length} topic{selectedTopics.length === 1 ? "" : "s"}{" "}
        selected
      </p>
    </div>
  );
}
