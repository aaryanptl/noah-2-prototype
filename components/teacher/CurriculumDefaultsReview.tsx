"use client";

// Review screen for the seeded prefixed curriculum data.
//
// The seed writes every row as "proposed" from a formula. This is where a
// curriculum reviewer adjusts and approves them. Approving matters because the
// allocator can be switched to approved-only rows, at which point unreviewed
// numbers stop driving real student plans.

import { Check, CheckCheck, Loader2, X } from "lucide-react";
import { useState } from "react";
import { SyllabusShell } from "@/components/syllabus/SyllabusShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DefaultRow {
  id: string;
  topic_id: string;
  topic_name: string;
  grade: string;
  ideal_classes: number | null;
  ideal_activities: number | null;
  grade_priority: number | null;
  review_status: "proposed" | "approved" | "rejected";
  source: string;
  objective_count: number;
}

const STATUS_TONES: Record<string, string> = {
  proposed: "bg-[#fff0dc] text-[#ad6a13]",
  approved: "bg-[#dcefeb] text-[#1f7169]",
  rejected: "bg-[#fde8e4] text-[#bd503e]",
};

function Row({ row }: { row: DefaultRow }) {
  const [classes, setClasses] = useState(String(row.ideal_classes ?? ""));
  const [activities, setActivities] = useState(
    String(row.ideal_activities ?? ""),
  );
  const [priority, setPriority] = useState(String(row.grade_priority ?? ""));
  const [status, setStatus] = useState(row.review_status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (reviewStatus: DefaultRow["review_status"]) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/curriculum/defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          idealClasses: Number(classes) || undefined,
          idealActivities: Number(activities) || undefined,
          gradePriority: Number(priority) || undefined,
          reviewStatus,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save.");
      setStatus(payload.row.review_status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid items-center gap-3 border-b border-[#f0ede7] px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#22403c]">
          {row.topic_name}
        </div>
        <div className="text-xs text-[#8a8a82]">
          {row.objective_count} objective(s) · {row.source}
          {error && <span className="ml-2 text-[#bd503e]">{error}</span>}
        </div>
      </div>
      <div className="text-[11px] font-semibold text-[#3f5c58]">
        <label htmlFor={`priority-${row.id}`}>Priority</label>
        <Input
          id={`priority-${row.id}`}
          type="number"
          min={1}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="mt-1 w-16"
        />
      </div>
      <div className="text-[11px] font-semibold text-[#3f5c58]">
        <label htmlFor={`classes-${row.id}`}>Classes</label>
        <Input
          id={`classes-${row.id}`}
          type="number"
          min={1}
          value={classes}
          onChange={(e) => setClasses(e.target.value)}
          className="mt-1 w-16"
        />
      </div>
      <div className="text-[11px] font-semibold text-[#3f5c58]">
        <label htmlFor={`activities-${row.id}`}>Activities</label>
        <Input
          id={`activities-${row.id}`}
          type="number"
          min={1}
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          className="mt-1 w-20"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Badge className={STATUS_TONES[status]}>{status}</Badge>
        {pending ? (
          <Loader2 className="size-4 animate-spin text-[#1f7169]" />
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => send("approved")}
              aria-label="Approve"
              className="text-[#1f7169]"
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => send("rejected")}
              aria-label="Reject"
              className="text-[#bd503e]"
            >
              <X className="size-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function CurriculumDefaultsReview({
  grades,
  grade,
  rows,
}: {
  grades: string[];
  grade: string;
  rows: DefaultRow[];
}) {
  const approved = rows.filter((r) => r.review_status === "approved").length;
  const pendingCount = rows.length - approved;
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const approveAll = async () => {
    setBulkPending(true);
    setBulkError(null);
    try {
      const response = await fetch("/api/curriculum/defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not approve.");
      // Rows hold their own local status, so reload to reflect the new state.
      window.location.reload();
    } catch (cause) {
      setBulkError(cause instanceof Error ? cause.message : "Could not approve.");
      setBulkPending(false);
    }
  };

  return (
    <SyllabusShell breadcrumb="Curriculum plan defaults">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
        <h1 className="text-2xl font-bold text-[#22403c]">
          Curriculum plan defaults
        </h1>
        <p className="mt-1 text-sm text-[#5c6b69]">
          Classes, activities and priority per topic. These drive every
          generated learning plan — review the seeded numbers before they are
          trusted.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {grades.map((g) => (
            <a
              key={g}
              href={`/teacher/curriculum?grade=${encodeURIComponent(g)}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                g === grade
                  ? "bg-[#1f7169] text-white"
                  : "bg-white text-[#3f5c58] hover:bg-[#eef4f2]"
              }`}
            >
              {g}
            </a>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-[#5c6b69]">
            {approved} of {rows.length} approved for {grade}
          </p>
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={approveAll}
              disabled={bulkPending}
              className="h-8 gap-1.5 bg-[#1f7169] text-white hover:bg-[#195c55]"
            >
              {bulkPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Approve all {pendingCount}
            </Button>
          )}
          {bulkError && (
            <span className="text-xs text-[#bd503e]">{bulkError}</span>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-[#5c6b69]">
              No defaults seeded for this grade. Run{" "}
              <code className="rounded bg-[#f4f1eb] px-1.5 py-0.5 text-xs">
                npx tsx scripts/seed-curriculum-plan-defaults.ts --apply
              </code>
              .
            </p>
          ) : (
            rows.map((row) => <Row key={row.id} row={row} />)
          )}
        </div>
      </div>
    </SyllabusShell>
  );
}
