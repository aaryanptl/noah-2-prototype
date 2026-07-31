// Teaching content for the learning-plan-builder.
//
// Same split as /teacher/plans (lib/plan-generate.ts):
//   structure comes from the deterministic engine
//   the model only writes mentor-facing prose
//
// When the provider key is missing or the call fails, fallback templates keep
// the plan usable.

import { z } from "zod"
import { llmStructured, providerKeyConfigured } from "@/lib/llm"
import { buildClassActivities } from "./activities"
import type {
  ClassTeachingContent,
  DemoStudent,
  LearningObjective,
  PlanItem,
  QuestionGuideline,
} from "./types"

const ContentSchema = z.object({
  sessions: z.array(
    z.object({
      itemId: z.string(),
      goal: z.string(),
      teachingPoints: z.array(z.string()),
      practice: z.string(),
      successCriteria: z.string(),
      rationale: z.string(),
    })
  ),
})

type ContentResponse = z.infer<typeof ContentSchema>

const CONTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    sessions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemId: { type: "string" },
          goal: { type: "string" },
          teachingPoints: { type: "array", items: { type: "string" } },
          practice: { type: "string" },
          successCriteria: { type: "string" },
          rationale: { type: "string" },
        },
        required: [
          "itemId",
          "goal",
          "teachingPoints",
          "practice",
          "successCriteria",
          "rationale",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["sessions"],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `You are an experienced school teacher writing the teaching content for a learning plan that has ALREADY been scheduled for ONE student.

The schedule is fixed and is NOT yours to change. You will be given a numbered list of teaching classes, each with its title, topic, learning objectives, and how many starter/master practice activities it carries. Write the content for each one.

RULES
- Return exactly one entry per listed class, reusing the given "itemId" verbatim. Never merge, split, reorder, add or drop classes.
- Never invent topics or learning objectives. Stay within what is given.
- Write for a mentor who will run the class straight from the page.

EACH CLASS:
- "goal": one sentence, "By the end, <name> can …". No jargon.
- "teachingPoints": 3 to 5 bullets, in teaching order, describing what to actually SAY, SHOW and DO. Name the representation or resource (number line, place-value chart, factor tree, worked-example pair, exit ticket) and concrete numbers to use. Confront any observed misconception. Never write vague bullets like "explain the concept".
- "practice": the exact task, sized to the activity count — how many starter vs master questions, and how they scale.
- "successCriteria": what the mentor should see to call the session landed, stated observably (e.g. "≥80% accuracy on starter questions and attempts a master word problem with reasoning").
- "rationale": one short sentence on why this class sits here, referencing placement/mastery evidence or its place in the topic block.`

function formatObjectives(objectives: LearningObjective[]): string {
  if (objectives.length === 0) return "  (none)"
  return objectives
    .map(
      (objective) =>
        `  - [${objective.subtopic}] ${objective.text} (id: ${objective.id})`
    )
    .join("\n")
}

function formatStudent(student: DemoStudent): string {
  const placement =
    student.placementStatus === "completed"
      ? student.placementResults
          .map((result) => `topic ${result.topicId}: ${result.score}%`)
          .join("; ")
      : student.placementStatus
  const mastery =
    student.objectiveEvidence.length > 0
      ? student.objectiveEvidence
          .map(
            (evidence) =>
              `${evidence.learningObjectiveId}: ${evidence.level}/${evidence.result} — ${evidence.note}`
          )
          .join("\n  ")
      : "(none)"

  return `STUDENT
Name: ${student.name}
Grade: ${student.grade} · Region: ${student.region}
Classes remaining: ${student.classesRemaining}
Placement: ${placement}
Mastery evidence:
  ${mastery}`
}

function formatSchedule(items: PlanItem[]): string {
  return items
    .map((item, index) => {
      const total = item.easyActivities + item.practiceActivities
      return `${index + 1}. itemId=${item.id}
   Class ${item.classNumber}: ${item.title} (${item.topicName ?? item.subtitle})
   Focus activities: ${item.easyActivities} starter + ${item.practiceActivities} master = ${total}
   Objectives:
${formatObjectives(item.learningObjectives)}
   Structural reason: ${item.reason}`
    })
    .join("\n\n")
}

export function fallbackTeachingContent(
  item: PlanItem,
  student: DemoStudent
): ClassTeachingContent {
  const firstName = student.name.split(" ")[0] ?? "the student"
  const total = item.easyActivities + item.practiceActivities
  const objective =
    item.learningObjectives[0]?.text ?? item.title.replace(/:.*$/, "")
  const bare = objective.replace(/\.$/, "")

  const evidence = student.objectiveEvidence.find((entry) =>
    item.learningObjectives.some(
      (objectiveItem) => objectiveItem.id === entry.learningObjectiveId
    )
  )

  return {
    goal: `By the end, ${firstName} can ${bare.charAt(0).toLowerCase()}${bare.slice(1)}.`,
    teachingPoints: [
      evidence?.note
        ? `Surface the observation first: ${evidence.note}`
        : `Check what ${firstName} already knows about ${item.title.toLowerCase()} with two quick questions.`,
      `Model one worked example for ${bare}, narrating each step.`,
      `Guide ${firstName} through starter questions with immediate feedback.`,
      `Close with a master-level application question and a one-sentence recap.`,
    ],
    practice: `${total} question(s) on ${item.title}: ${item.easyActivities} starter (single-step) then ${item.practiceActivities} master (multi-step / word problems).`,
    successCriteria: `Solves starter questions with ≥80% accuracy and attempts master-level word problems with clear reasoning.`,
    rationale: item.reason,
    source: "fallback",
  }
}

/**
 * Attach expanded activities + teaching prose to every teaching class.
 * Uses the same llmStructured path as /teacher/plans when a key is configured.
 */
export async function enrichPlanItemsWithTeachingContent(input: {
  student: DemoStudent
  items: PlanItem[]
  guidelines: QuestionGuideline[]
}): Promise<{ items: PlanItem[]; source: "ai" | "fallback" }> {
  const { student, guidelines } = input

  const withActivities = input.items.map((item) => {
    if (item.kind !== "teaching") return item
    return {
      ...item,
      activities: buildClassActivities(item, guidelines),
    }
  })

  const teachingItems = withActivities.filter((item) => item.kind === "teaching")
  if (teachingItems.length === 0) {
    return { items: withActivities, source: "fallback" }
  }

  const applyContent = (
    contentById: Map<string, ClassTeachingContent>,
    source: "ai" | "fallback"
  ) =>
    withActivities.map((item) => {
      if (item.kind !== "teaching") return item
      const teachingContent =
        contentById.get(item.id) ?? fallbackTeachingContent(item, student)
      return {
        ...item,
        teachingContent: { ...teachingContent, source },
        reason: teachingContent.rationale ?? item.reason,
      }
    })

  if (!providerKeyConfigured()) {
    const contentById = new Map(
      teachingItems.map((item) => [
        item.id,
        fallbackTeachingContent(item, student),
      ])
    )
    return { items: applyContent(contentById, "fallback"), source: "fallback" }
  }

  const user = `${formatStudent(student)}

SCHEDULE — ${teachingItems.length} teaching class(es), already fixed. Write content for each.
${formatSchedule(teachingItems)}

Write the content now — exactly ${teachingItems.length} entr${teachingItems.length === 1 ? "y" : "ies"}, one per itemId above.`

  try {
    const { data } = await llmStructured<ContentResponse>({
      system: SYSTEM_PROMPT,
      user,
      zodSchema: ContentSchema,
      schemaName: "learning_plan_class_content",
      jsonSchema: CONTENT_JSON_SCHEMA,
      toolName: "emit_class_content",
      toolDescription:
        "Return the teaching content, one entry per scheduled teaching class.",
      maxTokens: 8000,
    })

    if (!data?.sessions?.length) {
      throw new Error("Model returned no class content")
    }

    const contentById = new Map<string, ClassTeachingContent>()
    for (const session of data.sessions) {
      contentById.set(session.itemId, {
        goal: session.goal,
        teachingPoints: session.teachingPoints,
        practice: session.practice,
        successCriteria: session.successCriteria,
        rationale: session.rationale,
        source: "ai",
      })
    }

    return { items: applyContent(contentById, "ai"), source: "ai" }
  } catch (error) {
    console.error(
      "[LPB CONTENT] AI content generation failed, using fallback:",
      error
    )
    const contentById = new Map(
      teachingItems.map((item) => [
        item.id,
        fallbackTeachingContent(item, student),
      ])
    )
    return { items: applyContent(contentById, "fallback"), source: "fallback" }
  }
}
