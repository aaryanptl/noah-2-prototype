import { readFile } from "node:fs/promises";
import path from "node:path";

import { read, utils } from "xlsx";

import type {
  GenerationMetadata,
  difficultyLevelSchema,
} from "@/agents/content-generation-coding/schema";
import type { z } from "zod";

const DEFAULT_WORKBOOK_PATH = path.join(
  process.cwd(),
  "syllabus",
  "coding-subjects-syllabus.xlsx",
);

// The workbook has one sheet per course; Web Dev is the first.
export const WEB_DEV_SHEET = "Web Dev";

type WorkbookRow = Record<string, string | number | undefined>;

export type CodingSyllabusRow = {
  rowNumber: number; // 1-based position in the sheet (header = row 1)
  course: string; // "Web Development"
  courseLevel: string; // "Level 1" | "Level 2" | "Level 3"
  module: string; // "HTML Foundations"
  topic: string;
  topicType: string; // "Concept" | "Mini Project" | "Capstone" ...
  topicFamily: string; // "HTML Document Structure"
  subtopic: string; // "Sub Topic"
  bloomsLevel: string; // "Applying"
  bloomsVerb: string; // "Code"
  learningObjective: string;
  cognitiveTier: "Lower-Order" | "Higher-Order";
  skillArea: GenerationMetadata["skillArea"];
};

function normalizeCell(value: string | number | undefined) {
  return String(value ?? "").trim();
}

function resolveWorkbookPath(workbookPath?: string) {
  if (!workbookPath) return DEFAULT_WORKBOOK_PATH;
  return path.isAbsolute(workbookPath)
    ? workbookPath
    : path.join(process.cwd(), workbookPath);
}

function normalizeCognitiveTier(value: string): "Lower-Order" | "Higher-Order" {
  return /higher/i.test(value) ? "Higher-Order" : "Lower-Order";
}

// The WebLab runtime only renders an HTML/CSS/JS live preview, so we tag each LO
// with its primary editor surface. Backend modules (Node, MySQL, Express) map to
// "mixed" — surfaceable later, but worth filtering out for v1 front-end runs.
function deriveSkillArea(
  module: string,
  topicFamily: string,
): GenerationMetadata["skillArea"] {
  const haystack = `${module} ${topicFamily}`.toLowerCase();
  if (/(node|express|mysql|sql|api|backend|server)/.test(haystack))
    return "mixed";
  if (/(html|form|graphic|media|semantic)/.test(haystack)) return "html";
  if (/(css|layout|styling|bootstrap|flex|grid|responsive)/.test(haystack))
    return "css";
  if (/(javascript|js|react|hook|dom|browser|event)/.test(haystack))
    return "js";
  return "html";
}

// Suggested difficulty derived from Bloom + cognitive tier. The generator may
// still refine difficulty_rating, but this anchors the target.
export function suggestDifficulty(
  bloomsLevel: string,
  cognitiveTier: "Lower-Order" | "Higher-Order",
): z.infer<typeof difficultyLevelSchema> {
  const bloom = bloomsLevel.toLowerCase();
  if (cognitiveTier === "Higher-Order") return "hard";
  if (bloom.startsWith("creat") || bloom.startsWith("eval")) return "hard";
  if (bloom.startsWith("analy") || bloom.startsWith("apply")) return "medium";
  return "easy";
}

export async function loadCodingSyllabusRows(options?: {
  workbookPath?: string;
  sheet?: string;
}) {
  const resolvedWorkbookPath = resolveWorkbookPath(options?.workbookPath);
  const sheetName = options?.sheet ?? WEB_DEV_SHEET;
  const workbookBuffer = await readFile(resolvedWorkbookPath);
  const workbook = read(workbookBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(
      `Sheet "${sheetName}" not found in workbook ${resolvedWorkbookPath}.`,
    );
  }

  const rawRows = utils.sheet_to_json<WorkbookRow>(sheet, { defval: "" });

  const rows = rawRows
    .map((row, index) => {
      const module = normalizeCell(row.Module);
      const topic = normalizeCell(row.Topic);
      const subtopic = normalizeCell(row["Sub Topic"]);
      const learningObjective = normalizeCell(row["Learning Objective"]);

      // Skip incomplete rows so a stray blank line cannot break a run.
      if (!module || !topic || !subtopic || !learningObjective) return null;

      const topicFamily = normalizeCell(row["Topic Family"]);
      const cognitiveTier = normalizeCognitiveTier(
        normalizeCell(row["Cognitive Tier"]),
      );

      return {
        rowNumber: index + 2,
        course: normalizeCell(row.Course) || "Web Development",
        courseLevel: normalizeCell(row["Course Level"]) || "Level 1",
        module,
        topic,
        topicType: normalizeCell(row.Type) || "Concept",
        topicFamily,
        subtopic,
        bloomsLevel: normalizeCell(row["Bloom's Level"]) || "Applying",
        bloomsVerb: normalizeCell(row["Bloom's Verb"]),
        learningObjective,
        cognitiveTier,
        skillArea: deriveSkillArea(module, topicFamily),
      } satisfies CodingSyllabusRow;
    })
    .filter((row): row is CodingSyllabusRow => row !== null);

  return { workbookPath: resolvedWorkbookPath, sheet: sheetName, rows };
}

// Build the metadata block attached to every generated challenge from its row.
export function buildMetadata(row: CodingSyllabusRow): GenerationMetadata {
  return {
    subject: row.course,
    courseLevel: row.courseLevel,
    module: row.module,
    topic: row.topic,
    topicType: row.topicType,
    topicFamily: row.topicFamily,
    subtopic: row.subtopic,
    learning_objective: row.learningObjective,
    bloomsVerb: row.bloomsVerb,
    cognitiveTier: row.cognitiveTier,
    skillArea: row.skillArea,
  };
}
