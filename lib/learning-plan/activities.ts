// Pure helpers for expanding a class's activity counts into visible rows.
// Safe to import from client components.

import type {
  ClassActivity,
  PlanItem,
  QuestionGuideline,
} from "./types"

/**
 * Expand a class's easy/practice counts into visible activity rows.
 * Each row is a real starter or master prompt from the workbook guidelines
 * (or a clear placeholder), so "N total activities" always means N rows.
 */
export function buildClassActivities(
  item: Pick<
    PlanItem,
    "id" | "learningObjectives" | "easyActivities" | "practiceActivities"
  >,
  guidelines: QuestionGuideline[]
): ClassActivity[] {
  const objectives = item.learningObjectives
  if (objectives.length === 0) return []

  const activities: ClassActivity[] = []
  const easyTotal = Math.max(0, item.easyActivities)
  const practiceTotal = Math.max(0, item.practiceActivities)

  const guidelineFor = (objectiveId: string) =>
    guidelines.find((entry) => entry.learningObjectiveId === objectiveId)

  for (let index = 0; index < easyTotal; index += 1) {
    const objective = objectives[index % objectives.length]
    const guideline = guidelineFor(objective.id)
    const round = Math.floor(index / objectives.length) + 1
    activities.push({
      id: `${item.id}-starter-${index + 1}`,
      level: "starter",
      label: easyTotal > 1 ? `Starter Q${index + 1}` : "Starter Q",
      objectiveId: objective.id,
      objectiveSubtopic: objective.subtopic,
      objectiveText: objective.text,
      prompt:
        guideline?.starter ??
        `Starter practice: ${objective.text.replace(/\.$/, "")}.`,
      round,
    })
  }

  for (let index = 0; index < practiceTotal; index += 1) {
    const objective = objectives[index % objectives.length]
    const guideline = guidelineFor(objective.id)
    const round = Math.floor(index / objectives.length) + 1
    activities.push({
      id: `${item.id}-master-${index + 1}`,
      level: "master",
      label: practiceTotal > 1 ? `Master Q${index + 1}` : "Master Q",
      objectiveId: objective.id,
      objectiveSubtopic: objective.subtopic,
      objectiveText: objective.text,
      prompt:
        guideline?.master ??
        `Master practice: ${objective.text.replace(/\.$/, "")} in a multi-step context.`,
      round,
    })
  }

  return activities
}

export function groupActivitiesByObjective(activities: ClassActivity[]) {
  const groups: {
    objectiveId: string
    subtopic: string
    text: string
    items: ClassActivity[]
  }[] = []

  for (const activity of activities) {
    const existing = groups.find(
      (group) => group.objectiveId === activity.objectiveId
    )
    if (existing) {
      existing.items.push(activity)
    } else {
      groups.push({
        objectiveId: activity.objectiveId,
        subtopic: activity.objectiveSubtopic,
        text: activity.objectiveText,
        items: [activity],
      })
    }
  }

  return groups
}
