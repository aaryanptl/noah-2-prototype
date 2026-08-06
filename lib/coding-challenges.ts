import { query } from "@/lib/db";

import { loadCodingSyllabusRows } from "@/agents/content-generation-coding/syllabus";
import {
  type CodingChallenge,
  type WebLabDemoStep,
  type WebLabGoal,
  type WebLabGoalCheck,
  codingChallenges,
} from "@/agents/coding-agent/challenges";

// Generated challenges get ids above the hand-authored seed set so routes never
// collide.
const CSV_ID_OFFSET = 100;

// The picker filters by these topic labels; map the schema's skill area onto it.
const SKILL_AREA_TO_TOPIC: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  js: "JS",
  mixed: "Layout",
};

// A goal as stored in the content schema: grading rule fields are flat, with an
// optional already-nested `check` for forward compatibility.
type RawGoal = Partial<WebLabGoalCheck> & {
  id: string;
  label: string;
  check?: WebLabGoalCheck;
};

// The content schema stores a goal's grading rule flat (id/label/target/kind/
// rule/…); the runtime expects it nested under `check`. Normalize here.
function normalizeGoal(goal: RawGoal): WebLabGoal {
  if (goal.check) {
    return { id: goal.id, label: goal.label, check: goal.check };
  }
  if (goal.target && goal.kind && goal.rule) {
    return {
      id: goal.id,
      label: goal.label,
      check: {
        target: goal.target,
        kind: goal.kind,
        rule: goal.rule,
        flags: goal.flags,
        minCount: goal.minCount,
      },
    };
  }
  return { id: goal.id, label: goal.label };
}

// Split a code buffer into "comment + the code it explains" groups — the
// natural reveal steps. A new group starts at each top-level comment OR a blank
// line, so it works whether or not the generator separated blocks with blanks.
function splitIntoBlocks(code: string): string[] {
  const lines = code.replace(/\r/g, "").split("\n");
  const groups: string[] = [];
  let current: string[] = [];
  let inComment = false;

  const flush = () => {
    if (current.some((line) => line.trim())) {
      groups.push(current.join("\n").replace(/^\n+|\s+$/g, ""));
    }
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const startsComment = !inComment && /^(<!--|\/\*|\/\/)/.test(trimmed);

    // Boundary: a fresh comment or a blank line closes the current group.
    if ((startsComment || trimmed === "") && current.some((l) => l.trim())) {
      flush();
    }
    if (trimmed !== "") current.push(line);

    // Track multi-line html/css comments so a comment's inner lines don't each
    // look like a new boundary.
    if (!inComment) {
      if (
        (/<!--/.test(line) && !/-->/.test(line)) ||
        (/\/\*/.test(line) && !/\*\//.test(line))
      ) {
        inComment = true;
      }
    } else if (/-->/.test(line) || /\*\//.test(line)) {
      inComment = false;
    }
  }
  flush();

  return groups.filter((group) => group.trim().length > 0);
}

// Use a block's leading comment as the step's sub-label (what Noah is doing).
// The popup wraps, so allow a fuller sentence rather than a hard truncation.
function summarizeBlock(block: string, isLast: boolean): string {
  if (isLast) return "All done — run it!";
  const comment = block.match(
    /<!--\s*([\s\S]*?)\s*-->|\/\*\s*([\s\S]*?)\s*\*\/|\/\/\s*(.*)/,
  );
  const text = (comment?.[1] ?? comment?.[2] ?? comment?.[3] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (text) return text.length > 100 ? `${text.slice(0, 98)}…` : text;
  const codeLine = block
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !/^(<!--|\/\*|\/\/)/.test(line));
  return codeLine ? codeLine.slice(0, 60) : "Added code";
}

// Preferred path: the generator authored explicit guide steps with teaching
// popups. Map them straight onto the runtime demo.
function buildDemoFromGuideSteps(
  payload: Record<string, unknown>,
): WebLabDemoStep[] {
  const steps = payload.guideSteps as
    | Array<{ explain?: string; label?: string; code?: string }>
    | undefined;
  if (!Array.isArray(steps) || steps.length < 2) return [];

  const startFile =
    (payload.startFile as "html" | "css" | "js" | undefined) ?? "html";
  const icons = ["🧭", "📝", "🎨", "⚡", "✨", "🔧"];

  return steps
    .filter((step) => typeof step.code === "string")
    .map((step, index, all) => {
      const isLast = index === all.length - 1;
      return {
        file: startFile,
        code: step.code ?? "",
        prog: {
          pct: Math.round(((index + 1) / all.length) * 100),
          icon: isLast ? "🎉" : (icons[index] ?? "✨"),
          l: step.label?.trim() || (isLast ? "Complete!" : `Step ${index + 1}`),
          s: step.explain?.trim() || "",
        },
        ...(isLast ? { run: true } : {}),
      };
    });
}

// Cap the number of derived steps by merging adjacent blocks, so a heavily
// commented solution doesn't explode into a dozen tiny reveals.
function mergeToMax(blocks: string[], max: number): string[] {
  if (blocks.length <= max) return blocks;
  const groupSize = Math.ceil(blocks.length / max);
  const merged: string[] = [];
  for (let i = 0; i < blocks.length; i += groupSize) {
    merged.push(blocks.slice(i, i + groupSize).join("\n"));
  }
  return merged;
}

// Generated challenges have no hand-authored demo, so synthesize a guide-mode
// step-through from the commented guide solution: each step cumulatively reveals
// one more block, ending with a run. Mirrors the seed challenges' experience.
function deriveGuideDemo(payload: Record<string, unknown>): WebLabDemoStep[] {
  const guide = ((payload.files as Record<string, unknown>)?.guide ??
    {}) as Record<string, string>;
  const startFile =
    (payload.startFile as "html" | "css" | "js" | undefined) ?? "html";

  // Step the file the student works in; if it's a one-block stub, fall back to
  // whichever guide buffer has the most to reveal.
  let file: "html" | "css" | "js" = startFile;
  let blocks = splitIntoBlocks(guide[startFile] ?? "");
  if (blocks.length < 2) {
    for (const candidate of ["html", "css", "js"] as const) {
      const candidateBlocks = splitIntoBlocks(guide[candidate] ?? "");
      if (candidateBlocks.length > blocks.length) {
        blocks = candidateBlocks;
        file = candidate;
      }
    }
  }
  if (blocks.length === 0) return [];
  blocks = mergeToMax(blocks, 5);

  const icons = ["🧭", "📝", "🎨", "⚡", "✨", "🔧"];
  const steps: WebLabDemoStep[] = [];
  let accumulated = "";

  blocks.forEach((block, index) => {
    accumulated = accumulated ? `${accumulated}\n\n${block}` : block;
    const isLast = index === blocks.length - 1;
    steps.push({
      file,
      code: accumulated,
      prog: {
        pct: Math.round(((index + 1) / blocks.length) * 100),
        icon: isLast ? "🎉" : (icons[index] ?? "✨"),
        l: isLast ? "Complete!" : `Step ${index + 1} of ${blocks.length}`,
        s: summarizeBlock(block, isLast),
      },
      ...(isLast ? { run: true } : {}),
    });
  });

  return steps;
}

function rowToChallenge(
  payload: Record<string, unknown>,
  index: number,
): CodingChallenge {
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const files = payload.files as CodingChallenge["files"];
  const skillArea = String(metadata.skillArea ?? "html");
  // Prefer the generator's authored walkthrough (with teaching popups); fall
  // back to deriving steps from the commented solution for older content.
  const authoredDemo = buildDemoFromGuideSteps(payload);
  const guideDemo =
    authoredDemo.length > 0 ? authoredDemo : deriveGuideDemo(payload);

  return {
    id: CSV_ID_OFFSET + index,
    topic: SKILL_AREA_TO_TOPIC[skillArea] ?? "HTML",
    title: String(payload.title ?? "Untitled Challenge"),
    difficulty:
      (payload.difficulty_level as CodingChallenge["difficulty"]) ?? "easy",
    lesson: String(payload.lesson ?? ""),
    desc: String(payload.desc ?? ""),
    goals: ((payload.goals as RawGoal[]) ?? []).map(normalizeGoal),
    targetHtml: String(payload.targetHtml ?? ""),
    targetSub: String(payload.targetSub ?? ""),
    startFile: payload.startFile as CodingChallenge["startFile"],
    files,
    review: (payload.review as CodingChallenge["review"]) ?? [],
    hints: (payload.hints as CodingChallenge["hints"]) ?? [],
    // Guide-mode step-through is derived from the commented solution.
    ...(guideDemo.length > 0
      ? { demo: { guide: guideDemo, pair: [], solo: [] } }
      : {}),
  };
}

// The syllabus coordinates we keep alongside each generated challenge so the
// roadmap can place it under the right level → module → topic. Seed challenges
// carry no metadata, so these are optional.
export type ChallengeMeta = {
  courseLevel: string;
  module: string;
  topic: string;
  subtopic: string;
};

export type ChallengeRecord = {
  challenge: CodingChallenge;
  meta: ChallengeMeta | null;
};

// Read fresh on every call (no memoization): the database is queried dynamically.
// Each record pairs the runtime challenge with the syllabus coordinates from its database row.
export async function loadDbChallengeRecords(): Promise<ChallengeRecord[]> {
  try {
    const res = await query("SELECT payload FROM coding_content_questions");
    const records: ChallengeRecord[] = [];

    res.rows.forEach((row, index) => {
      if (!row.payload) return;
      try {
        const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
        const challenge = rowToChallenge(payload, index);
        const md = (payload.metadata ?? {}) as Record<string, unknown>;
        const meta: ChallengeMeta | null = md.module
          ? {
              courseLevel: String(md.courseLevel ?? "Level 1"),
              module: String(md.module),
              topic: String(md.topic ?? ""),
              subtopic: String(md.subtopic ?? ""),
            }
          : null;
        records.push({ challenge, meta });
      } catch (e) {
        console.error("Error parsing database challenge payload:", e);
      }
    });

    return records;
  } catch (error) {
    console.error("Failed to load coding challenges from database:", error);
    return [];
  }
}

export async function loadDbCodingChallenges(): Promise<CodingChallenge[]> {
  const records = await loadDbChallengeRecords();
  return records.map((record) => record.challenge);
}

// Seed (hand-authored) challenges plus everything in the database content bank.
export async function getAllCodingChallenges(): Promise<CodingChallenge[]> {
  const dbChallenges = await loadDbCodingChallenges();
  return [...codingChallenges, ...dbChallenges];
}

export async function getCodingChallenge(id: number): Promise<CodingChallenge | null> {
  const all = await getAllCodingChallenges();
  return all.find((c) => c.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Roadmap: the syllabus laid out as a gamified learning path.
//
// The path is Level → Module (the connected milestones) → Topic → question
// cards. The full module list per level comes from the syllabus so the path
// reads as a complete journey even where no content exists yet; only Level 1 is
// unlocked. Generated challenges are slotted onto their module/topic; the
// hand-authored seed challenges (no syllabus metadata) are surfaced under a
// "Featured lessons" topic in their closest Level 1 module.
// ---------------------------------------------------------------------------

export type RoadmapCard = {
  id: number;
  title: string;
  difficulty: CodingChallenge["difficulty"];
  topic: string; // HTML | CSS | Layout | JS — used for the skill badge
};

export type RoadmapTopic = {
  topic: string;
  cards: RoadmapCard[];
};

export type RoadmapModule = {
  name: string;
  topics: RoadmapTopic[];
  count: number;
};

export type RoadmapLevel = {
  id: string; // "Level 1"
  label: string;
  locked: boolean;
  modules: RoadmapModule[];
  count: number;
};

export type CodingRoadmap = {
  levels: RoadmapLevel[];
};

const UNLOCKED_LEVEL = "Level 1";
const FEATURED_TOPIC = "Featured lessons";

// Map a seed challenge's broad topic onto a representative Level 1 module so the
// hand-authored demos still appear somewhere sensible on the path.
const SEED_TOPIC_TO_MODULE: Record<string, string> = {
  HTML: "HTML Foundations",
  CSS: "CSS Essentials",
  Layout: "Advanced Layout & Styling",
  JS: "JavaScript Basics",
};

// The parsed syllabus skeleton rarely changes within a process; cache the
// promise so repeated roadmap builds don't re-read the workbook each request.
let syllabusStructurePromise: Promise<
  Array<{ level: string; modules: Array<{ name: string; topics: string[] }> }>
> | null = null;

async function loadSyllabusStructure() {
  if (!syllabusStructurePromise) {
    syllabusStructurePromise = (async () => {
      const { rows } = await loadCodingSyllabusRows();
      const levels: Array<{
        level: string;
        modules: Array<{ name: string; topics: string[] }>;
      }> = [];
      for (const row of rows) {
        let level = levels.find((l) => l.level === row.courseLevel);
        if (!level) {
          level = { level: row.courseLevel, modules: [] };
          levels.push(level);
        }
        let module = level.modules.find((m) => m.name === row.module);
        if (!module) {
          module = { name: row.module, topics: [] };
          level.modules.push(module);
        }
        if (row.topic && !module.topics.includes(row.topic)) {
          module.topics.push(row.topic);
        }
      }
      return levels;
    })();
  }
  return syllabusStructurePromise;
}

function toCard(challenge: CodingChallenge): RoadmapCard {
  return {
    id: challenge.id,
    title: challenge.title,
    difficulty: challenge.difficulty,
    topic: challenge.topic,
  };
}

export async function getCodingRoadmap(): Promise<CodingRoadmap> {
  const skeleton = await loadSyllabusStructure();
  const records = await loadDbChallengeRecords();

  // Bucket every challenge by "level||module||topic".
  const cardsByKey = new Map<string, RoadmapCard[]>();
  const push = (
    level: string,
    module: string,
    topic: string,
    card: RoadmapCard,
  ) => {
    const key = `${level}||${module}||${topic}`;
    const list = cardsByKey.get(key);
    if (list) list.push(card);
    else cardsByKey.set(key, [card]);
  };

  for (const { challenge, meta } of records) {
    if (!meta) continue;
    push(
      meta.courseLevel,
      meta.module,
      meta.topic || "General",
      toCard(challenge),
    );
  }
  // Seed challenges have no syllabus coordinates — fold them into a Featured
  // lessons topic within their closest Level 1 module.
  for (const seed of codingChallenges) {
    const module = SEED_TOPIC_TO_MODULE[seed.topic] ?? "HTML Foundations";
    push(UNLOCKED_LEVEL, module, FEATURED_TOPIC, toCard(seed));
  }

  const levels: RoadmapLevel[] = skeleton.map(({ level, modules }) => {
    let levelCount = 0;
    const roadmapModules: RoadmapModule[] = modules.map((module) => {
      // Featured lessons first (when present), then the syllabus topic order.
      const topicNames = [FEATURED_TOPIC, ...module.topics];
      const topics: RoadmapTopic[] = [];
      let moduleCount = 0;
      for (const topic of topicNames) {
        const cards = cardsByKey.get(`${level}||${module.name}||${topic}`);
        if (!cards || cards.length === 0) continue;
        cards.sort((a, b) => a.id - b.id);
        topics.push({ topic, cards });
        moduleCount += cards.length;
      }
      levelCount += moduleCount;
      return { name: module.name, topics, count: moduleCount };
    });
    return {
      id: level,
      label: level,
      locked: level !== UNLOCKED_LEVEL,
      modules: roadmapModules,
      count: levelCount,
    };
  });

  return { levels };
}
