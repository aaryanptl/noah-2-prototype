"use client";

import {
  Check,
  ClipboardCheck,
  Dumbbell,
  Lightbulb,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  FOCUS_LABELS,
  FOCUS_TONES,
  formatSessionDate,
} from "@/components/teacher/plan-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanFocus } from "@/lib/learning-plans";

export interface SessionCardItem {
  key: string;
  sessionDate: string;
  focus: PlanFocus;
  topic: string;
  learningObjective: string | null;
  goal: string;
  teachingPoints: string[];
  practice: string;
  successCriteria: string;
  baselineScore: number | null;
  masteryState: string | null;
  rationale?: string;
}

const FOCUS_OPTIONS = (
  Object.entries(FOCUS_LABELS) as [PlanFocus, string][]
).map(([value, label]) => ({ value, label }));

const textareaClass =
  "w-full resize-none rounded-lg border border-[#e4e0d8] bg-[#faf8f4] px-3 py-2 text-sm leading-6 text-[#304744] outline-none focus:border-[#9cc9c1]";

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#25877c]">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

export function SessionCard({
  item,
  dayLabel,
  onChange,
  onRemove,
}: {
  item: SessionCardItem;
  /** e.g. "Day 3" — the session's position in the plan. */
  dayLabel: string;
  onChange: (patch: Partial<SessionCardItem>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#1f5855] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white">
          {dayLabel}
        </span>
        <Badge
          variant="secondary"
          className="rounded-full bg-[#f4f1eb] font-mono text-[10px] font-bold text-[#5c6b69]"
        >
          {formatSessionDate(item.sessionDate)}
        </Badge>
        {editing ? (
          <Select
            items={FOCUS_OPTIONS}
            value={item.focus}
            onValueChange={(value) =>
              value && onChange({ focus: value as PlanFocus })
            }
          >
            <SelectTrigger
              className={`h-7 rounded-full border-transparent px-3 text-xs font-bold ${FOCUS_TONES[item.focus]}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {FOCUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant="secondary"
            className={`rounded-full text-[10px] font-bold uppercase tracking-[0.08em] ${FOCUS_TONES[item.focus]}`}
          >
            {FOCUS_LABELS[item.focus]}
          </Badge>
        )}
        {item.baselineScore != null && (
          <span className="font-mono text-[11px] font-bold text-muted-foreground">
            baseline {item.baselineScore}%
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={editing ? "Done editing session" : "Edit session"}
            onClick={() => setEditing((current) => !current)}
            className="rounded-lg text-muted-foreground hover:text-[#1f5855]"
          >
            {editing ? (
              <Check className="size-4" />
            ) : (
              <Pencil className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove session"
            onClick={onRemove}
            className="rounded-lg text-muted-foreground hover:text-[#bd503e]"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Topic + objective */}
      <div className="mt-3">
        {editing ? (
          <Input
            value={item.topic}
            onChange={(event) => onChange({ topic: event.target.value })}
            placeholder="Topic"
            className="h-9 rounded-lg border-[#e4e0d8] bg-[#faf8f4] text-base font-bold"
          />
        ) : (
          <h4 className="text-base font-extrabold tracking-[-0.02em] text-[#1c3c39]">
            {item.topic}
          </h4>
        )}
        {item.learningObjective && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {item.learningObjective}
          </p>
        )}
      </div>

      <Section icon={<Target className="size-3.5" />} label="Goal">
        {editing ? (
          <textarea
            value={item.goal}
            onChange={(event) => onChange({ goal: event.target.value })}
            rows={2}
            className={textareaClass}
          />
        ) : (
          <p className="text-sm leading-6 text-[#304744]">{item.goal}</p>
        )}
      </Section>

      <Section icon={<Lightbulb className="size-3.5" />} label="What to teach">
        {editing ? (
          <textarea
            value={item.teachingPoints.join("\n")}
            onChange={(event) =>
              onChange({
                teachingPoints: event.target.value
                  .split("\n")
                  .map((line) => line.replace(/^[•\-*]\s*/, "")),
              })
            }
            rows={Math.max(3, item.teachingPoints.length)}
            placeholder="One teaching point per line"
            className={textareaClass}
          />
        ) : (
          <ul className="space-y-2">
            {item.teachingPoints.map((point) => (
              <li
                // Teaching points have no id; the text itself is distinct.
                key={point}
                className="flex gap-2.5 text-sm leading-6 text-[#304744]"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2ec4b6]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#faf8f4] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ad6a13]">
            <Dumbbell className="size-3.5" /> Practice
          </div>
          {editing ? (
            <textarea
              value={item.practice}
              onChange={(event) => onChange({ practice: event.target.value })}
              rows={3}
              className={`${textareaClass} bg-white`}
            />
          ) : (
            <p className="text-sm leading-6 text-[#455855]">{item.practice}</p>
          )}
        </div>
        <div className="rounded-xl bg-[#f2f8f6] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1f7169]">
            <ClipboardCheck className="size-3.5" /> Success looks like
          </div>
          {editing ? (
            <textarea
              value={item.successCriteria}
              onChange={(event) =>
                onChange({ successCriteria: event.target.value })
              }
              rows={3}
              className={`${textareaClass} bg-white`}
            />
          ) : (
            <p className="text-sm leading-6 text-[#455855]">
              {item.successCriteria}
            </p>
          )}
        </div>
      </div>

      {item.rationale && !editing && (
        <p className="mt-4 flex items-start gap-2 border-t border-[#eeeae2] pt-3 text-xs leading-6 text-[#5c6b69]">
          <Lightbulb className="mt-1 size-3.5 shrink-0 text-[#25877c]" />
          <span>
            <strong className="font-bold text-[#455855]">Why now:</strong>{" "}
            {item.rationale}
          </span>
        </p>
      )}
    </div>
  );
}
