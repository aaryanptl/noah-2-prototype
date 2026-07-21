// ─────────────────────────────────────────────────────────────────────────────
// A session's teaching content is structured (goal, teaching points, practice,
// success criteria), but learning_plan_items stores a single `activity` TEXT
// column. These helpers serialise that structure into one readable block and
// parse it back out, so no migration is needed and a hand-typed activity still
// renders fine (it falls through as the goal).
//
// Pure string helpers — safe to import from client components.
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionContent {
  /** One sentence: what the student will be able to do afterwards. */
  goal: string;
  /** Ordered bullets of what to actually teach. */
  teachingPoints: string[];
  /** The practice or assessment task for the session. */
  practice: string;
  /** How the teacher knows it landed. */
  successCriteria: string;
}

const TEACH_HEADING = "Teach:";
const PRACTICE_PREFIX = "Practice:";
const SUCCESS_PREFIX = "Success:";
const BULLET = "• ";

export function composeActivity(content: SessionContent): string {
  const sections: string[] = [];
  if (content.goal.trim()) sections.push(content.goal.trim());
  if (content.teachingPoints.length > 0) {
    const bullets = content.teachingPoints
      .map((point) => `${BULLET}${point.trim()}`)
      .join("\n");
    sections.push(`${TEACH_HEADING}\n${bullets}`);
  }
  if (content.practice.trim()) {
    sections.push(`${PRACTICE_PREFIX} ${content.practice.trim()}`);
  }
  if (content.successCriteria.trim()) {
    sections.push(`${SUCCESS_PREFIX} ${content.successCriteria.trim()}`);
  }
  return sections.join("\n\n");
}

export function parseActivity(activity: string): SessionContent {
  const goal: string[] = [];
  const teachingPoints: string[] = [];
  let practice = "";
  let successCriteria = "";
  let inTeachBlock = false;

  for (const rawLine of activity.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === TEACH_HEADING) {
      inTeachBlock = true;
      continue;
    }
    if (line.startsWith(PRACTICE_PREFIX)) {
      inTeachBlock = false;
      practice = line.slice(PRACTICE_PREFIX.length).trim();
      continue;
    }
    if (line.startsWith(SUCCESS_PREFIX)) {
      inTeachBlock = false;
      successCriteria = line.slice(SUCCESS_PREFIX.length).trim();
      continue;
    }
    if (line.startsWith(BULLET) || line.startsWith("-")) {
      teachingPoints.push(line.replace(/^([•\-*]\s*)/, "").trim());
      continue;
    }
    // A plain line inside the teach block is still a teaching point; anywhere
    // else it belongs to the goal (this is the path a hand-typed activity takes).
    if (inTeachBlock) teachingPoints.push(line);
    else goal.push(line);
  }

  return {
    goal: goal.join(" "),
    teachingPoints,
    practice,
    successCriteria,
  };
}
