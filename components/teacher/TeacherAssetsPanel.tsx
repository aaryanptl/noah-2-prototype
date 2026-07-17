"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePenLine,
  FileText,
  FolderOpen,
  Printer,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { titleCase } from "@/components/syllabus/SyllabusShell";
import { formatDateWithYear } from "@/components/teacher/format";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { StudentPerformanceDetail } from "@/lib/teacher-dashboard";

type AssetKind = "playbook" | "progress" | "lesson-plan" | "worksheet";

interface TeacherAsset {
  id: AssetKind;
  title: string;
  description: string;
  format: "PDF" | "DOCX";
  meta: string;
  priority?: boolean;
  icon: typeof FileText;
  tone: string;
  iconTone: string;
}

const TEACHER_ASSETS: TeacherAsset[] = [
  {
    id: "playbook",
    title: "Class playbook report",
    description: "A focused pre-class brief with strengths, gaps and prompts.",
    format: "PDF",
    meta: "6 pages · 5 min read",
    priority: true,
    icon: BookOpenCheck,
    tone: "border-[#cbe5df] bg-[#f3faf8]",
    iconTone: "bg-[#dcefeb] text-[#1f7169]",
  },
  {
    id: "progress",
    title: "Progress snapshot",
    description: "Latest assessment performance and topic-level evidence.",
    format: "PDF",
    meta: "Updated after each test",
    icon: FileText,
    tone: "border-[#e5e1d9] bg-[#fffefa]",
    iconTone: "bg-[#ece8fb] text-[#6f55c7]",
  },
  {
    id: "lesson-plan",
    title: "Personalised lesson plan",
    description: "An editable class outline based on current learning gaps.",
    format: "DOCX",
    meta: "45-minute lesson",
    icon: FilePenLine,
    tone: "border-[#e5e1d9] bg-[#fffefa]",
    iconTone: "bg-[#fff0dc] text-[#ad6a13]",
  },
  {
    id: "worksheet",
    title: "Practice worksheet",
    description: "Targeted questions to use during or after the class.",
    format: "PDF",
    meta: "12 questions · answer key",
    icon: FileText,
    tone: "border-[#e5e1d9] bg-[#fffefa]",
    iconTone: "bg-[#fde8e4] text-[#bd503e]",
  },
];

function focusAreas(detail: StudentPerformanceDetail): string[] {
  const areas = detail.weakAreas
    .slice(0, 3)
    .map((area) => area.learningObjective);
  if (areas.length > 0) return areas;
  return detail.topicPerformance
    .slice()
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((topic) => titleCase(topic.topic));
}

function AssetPreview({
  asset,
  detail,
}: {
  asset: TeacherAsset;
  detail: StudentPerformanceDetail;
}) {
  const latest = detail.assessments[0];
  const focus = focusAreas(detail);
  const strongest = detail.strongAreas[0]?.learningObjective;

  if (asset.id === "playbook") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-[#1f5855] p-5 text-white">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#bfe2dc]">
            Before your next class
          </div>
          <div className="text-xl font-extrabold">
            Help {detail.student.displayName.split(" ")[0]} move from evidence
            to confidence.
          </div>
          <p className="mt-2 text-sm leading-6 text-[#d9eeea]">
            Use this brief to choose the right opening question, misconception
            check and practice sequence.
          </p>
        </div>

        <PreviewSection title="Start the class here">
          <p>
            Ask the student to explain their thinking aloud before introducing a
            method. Use a familiar example, then change one condition to test
            whether the idea transfers.
          </p>
        </PreviewSection>

        <PreviewSection title="Priority focus">
          <ul className="space-y-2">
            {(focus.length > 0
              ? focus
              : ["Build confidence with guided practice"]
            ).map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#fde8e4] font-mono text-[11px] font-bold text-[#bd503e]">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PreviewSection>

        <PreviewSection title="What to preserve">
          <p>
            {strongest
              ? `${strongest} is a reliable strength. Connect today’s examples to this skill so the new work feels achievable.`
              : "Keep the first task low-friction and recognise the strategy used, not only the final answer."}
          </p>
        </PreviewSection>
      </div>
    );
  }

  if (asset.id === "progress") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <PreviewMetric
          label="Average score"
          value={
            detail.student.avgScore != null
              ? `${detail.student.avgScore}%`
              : "—"
          }
        />
        <PreviewMetric
          label="Tests completed"
          value={String(detail.student.totalTests)}
        />
        <PreviewMetric
          label="Latest assessment"
          value={latest ? `${latest.score}%` : "No test yet"}
        />
        <PreviewMetric
          label="Last updated"
          value={formatDateWithYear(detail.student.lastActive)}
        />
      </div>
    );
  }

  if (asset.id === "lesson-plan") {
    return (
      <div className="space-y-3">
        {[
          "Warm-up and recall",
          "Teacher modelling",
          "Guided practice",
          "Exit check",
        ].map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-xl border border-[#e8e4dc] bg-white p-4"
          >
            <span className="font-mono text-xs font-bold text-[#25877c]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-sm font-bold text-[#304744]">
              {step}
            </span>
            <span className="text-xs text-muted-foreground">
              {["5 min", "10 min", "20 min", "10 min"][index]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PreviewSection title="Worksheet coverage">
        <p>
          12 targeted questions moving from guided recall to independent
          application, followed by a teacher answer key.
        </p>
      </PreviewSection>
      <div className="rounded-2xl border border-dashed border-[#d9d5cc] bg-[#faf8f4] p-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Question preview
        </div>
        <p className="font-semibold text-[#304744]">
          Show your working and explain which strategy you chose.
        </p>
        <div className="mt-4 h-20 rounded-xl bg-white ring-1 ring-[#e8e4dc]" />
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e8e4dc] bg-white p-5">
      <h3 className="mb-2 text-sm font-extrabold text-[#263d3a]">{title}</h3>
      <div className="text-sm leading-6 text-[#566b68]">{children}</div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8e4dc] bg-white p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-[#1f5855]">
        {value}
      </div>
    </div>
  );
}

export function TeacherAssetsPanel({
  detail,
}: {
  detail: StudentPerformanceDetail;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState<AssetKind | null>(
    null,
  );
  const selectedAsset = useMemo(
    () => TEACHER_ASSETS.find((asset) => asset.id === selectedAssetId) ?? null,
    [selectedAssetId],
  );

  return (
    <>
      <section
        id="teacher-assets"
        className="mb-8 scroll-mt-24 rounded-3xl border border-[#d8e7e3] bg-[#edf7f4] p-5 shadow-[0_8px_30px_rgba(31,55,53,0.06)] md:p-6"
      >
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#25877c]">
              <FolderOpen className="size-4" /> Teacher assets
            </div>
            <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#263d3a]">
              Everything you need for {detail.student.displayName.split(" ")[0]}
              &apos;s class
            </h2>
            <p className="mt-1 text-sm text-[#5d7470]">
              Student-specific documents, reports and printable resources in one
              place.
            </p>
          </div>
          <div className="inline-flex self-start items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1f7169] shadow-sm sm:self-auto">
            <CheckCircle2 className="size-4" /> 4 assets ready
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {TEACHER_ASSETS.map((asset) => {
            const Icon = asset.icon;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                className={`group flex min-h-56 flex-col rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#9cc9c1] hover:shadow-md ${asset.tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${asset.iconTone}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-md border border-black/5 bg-white/80 px-2 py-1 font-mono text-[10px] font-bold text-[#5c6b69]">
                    {asset.format}
                  </span>
                </div>
                {asset.priority ? (
                  <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-[#fce7bd] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8d5a12]">
                    <Clock3 className="size-3" /> Read before class
                  </span>
                ) : (
                  <span className="mt-4 h-5" />
                )}
                <h3 className="mt-2 text-sm font-extrabold text-[#263d3a]">
                  {asset.title}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-5 text-[#667875]">
                  {asset.description}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                  <span className="text-muted-foreground">{asset.meta}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#25877c]">
                    Open{" "}
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Sheet
        open={selectedAsset != null}
        onOpenChange={(open) => {
          if (!open) setSelectedAssetId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto bg-[#f8f6f1] p-0 sm:max-w-2xl">
          {selectedAsset ? (
            <>
              <SheetHeader className="border-b border-[#e4e1d9] bg-white px-6 py-5 pr-14">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-[#eff5f3] px-2 py-1 font-mono text-[10px] font-bold text-[#1f7169]">
                    {selectedAsset.format}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Prepared for {detail.student.displayName}
                  </span>
                </div>
                <SheetTitle className="text-xl font-extrabold tracking-[-0.025em] text-[#243c39]">
                  {selectedAsset.title}
                </SheetTitle>
                <SheetDescription>{selectedAsset.description}</SheetDescription>
              </SheetHeader>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#25877c]">
                  <Sparkles className="size-4" /> Document preview
                </div>
                <AssetPreview asset={selectedAsset} detail={detail} />
              </div>
              <SheetFooter className="sticky bottom-0 border-t border-[#e4e1d9] bg-white/95 px-6 py-4 backdrop-blur">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl"
                >
                  <Printer className="size-4" /> Print preview
                </Button>
                <Button
                  type="button"
                  onClick={() => setSelectedAssetId(null)}
                  className="rounded-xl bg-[#1f5855] text-white hover:bg-[#194745]"
                >
                  Done
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
