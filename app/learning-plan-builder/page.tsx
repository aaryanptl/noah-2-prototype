"use client"

import {
  buildClassActivities,
  groupActivitiesByObjective,
} from "@/lib/learning-plan/activities"
import {
  buildLearningPlan,
  getAiAssistedTopicSuggestion,
  getSuggestedTopicIds,
} from "@/lib/learning-plan/engine"
import type {
  ClassOutcome,
  ClassTeachingContent,
  CurriculumTopic,
  DemoStudent,
  GeneratedPlan,
  ManualAdjustments,
  ManualTopicAdjustment,
  PlanItem,
  Priority,
} from "@/lib/learning-plan/types"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Gauge,
  GraduationCap,
  GripVertical,
  Layers3,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  curriculumTopics,
  demoStudents,
  questionGuidelines,
  topicById,
} from "./data"
import "./learning-plan-builder.css"

const SETUP_STEPS = [
  { id: 1, label: "Student" },
  { id: 2, label: "Evidence" },
  { id: 3, label: "Topic scope" },
  { id: 4, label: "Review" },
]

const SCENARIO_COPY: Record<
  DemoStudent["scenario"],
  { eyebrow: string; title: string; description: string }
> = {
  A: {
    eyebrow: "Placement completed",
    title: "New student with evidence",
    description: "High and low placement scores adjust the first plan.",
  },
  B: {
    eyebrow: "No placement",
    title: "New student without a test",
    description: "Uses the academic team’s ideal allocations exactly.",
  },
  C: {
    eyebrow: "Plan update",
    title: "Returning student",
    description: "Completed work and current evidence reshape the plan.",
  },
  D: {
    eyebrow: "Parent request",
    title: "Requested starting topic",
    description: "Prerequisite refreshers move before the requested topic.",
  },
}

const DEFAULT_EVIDENCE_STUDENT =
  demoStudents.find((candidate) => candidate.scenario === "C") ?? demoStudents[0]

const PRIORITY_COPY: Record<Priority, { label: string; description: string }> =
  {
    high: {
      label: "High",
      description: "Core Grade 5 outcome",
    },
    medium: {
      label: "Medium",
      description: "Added when capacity allows",
    },
    low: {
      label: "Low",
      description: "First to be dropped",
    },
  }

const KIND_COPY: Record<PlanItem["kind"], { label: string; short: string }> = {
  teaching: { label: "Teaching class", short: "Teaching" },
  checkpoint: { label: "Checkpoint assessment", short: "Checkpoint" },
  rdp: { label: "Revision, doubts & practice", short: "RDP" },
  ptm: { label: "Parent–teacher meeting", short: "PTM" },
}

interface TopicEditDraft {
  classes: number
  activities: number
  easyPercent: number
}

interface PendingPlanUpdate {
  plan: GeneratedPlan
  adjustments: ManualAdjustments
  changes: string[]
}

type PersistenceState = "idle" | "saving" | "saved" | "error"

function plural(value: number, singular: string, multiple = `${singular}s`) {
  return `${value} ${value === 1 ? singular : multiple}`
}

function placementTone(score: number) {
  if (score >= 75) return "strong"
  if (score < 40) return "support"
  return "steady"
}

function placementLabel(score: number) {
  if (score >= 75) return "Strong"
  if (score < 40) return "Needs support"
  return "On track"
}

type MentorObjectiveLevel = "master" | "stuck" | "not_attempted"

function getMentorObjectiveLevel(
  objectiveId: string,
  student: DemoStudent,
  attempts: NonNullable<DemoStudent["questionAttemptEvidence"]>
): MentorObjectiveLevel {
  const objectiveEvidence = student.objectiveEvidence.filter(
    (evidence) => evidence.learningObjectiveId === objectiveId
  )
  if (objectiveEvidence.some((evidence) => evidence.level === "master" && evidence.result === "secure")) {
    return "master"
  }
  if (objectiveEvidence.some((evidence) => evidence.result === "not-secure")) {
    return "stuck"
  }

  const objectiveAttempts = attempts.filter(
    (attempt) => attempt.learningObjectiveId === objectiveId
  )
  if (objectiveAttempts.some((attempt) => attempt.level === "master" && attempt.correct / attempt.attempted >= 0.75)) {
    return "master"
  }
  if (objectiveAttempts.some((attempt) => attempt.correct / attempt.attempted < 0.5)) {
    return "stuck"
  }
  return "not_attempted"
}

function mentorLevelCopy(level: MentorObjectiveLevel) {
  if (level === "master") return "Master ✓"
  if (level === "stuck") return "Stuck after Starter"
  return "Not attempted"
}

function findNextTeachingItem(items: PlanItem[], completedCount: number) {
  return items.find(
    (item) => item.classNumber > completedCount && item.kind === "teaching"
  )
}

/** Primary line for a plan row: curriculum topic name, not LO subtopic/family. */
function planItemPrimaryLabel(item: PlanItem) {
  if (item.kind === "teaching") {
    return item.topicName ?? item.title
  }
  return item.title
}

/** Secondary line: class focus (subtopic), structural type, activities. */
function planItemSecondaryLabel(item: PlanItem) {
  if (item.kind !== "teaching") {
    return item.subtitle || KIND_COPY[item.kind].short
  }

  const parts: string[] = []
  const focus = item.title
  const topic = item.topicName
  if (focus && focus !== topic) parts.push(focus)
  if (item.subtitle?.toLowerCase().includes("compressed")) {
    parts.push("compressed refresher")
  }
  parts.push(
    `${item.easyActivities + item.practiceActivities} act.`
  )
  return parts.join(" · ")
}

function getPrerequisiteChainLocal(
  topicId: number,
  topicMap: Map<number, CurriculumTopic>,
  visited = new Set<number>()
): number[] {
  if (visited.has(topicId)) return []
  visited.add(topicId)
  const topic = topicMap.get(topicId)
  if (!topic) return []

  const chain: number[] = []
  for (const prerequisiteId of topic.prerequisiteIds) {
    chain.push(
      ...getPrerequisiteChainLocal(prerequisiteId, topicMap, visited),
      prerequisiteId
    )
  }
  return [...new Set(chain)]
}

function getDefaultTopicOrder(topics: CurriculumTopic[]) {
  return [...topics]
    .sort((a, b) => a.sequence - b.sequence)
    .map((topic) => topic.id)
}

function sortTopicsForDisplay(
  topics: CurriculumTopic[],
  student: DemoStudent,
  topicOrder: number[]
) {
  const orderIndex = new Map(topicOrder.map((topicId, index) => [topicId, index]))
  const inMentorOrder = (items: CurriculumTopic[]) =>
    [...items].sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.sequence - b.sequence
    )

  if (!student.parentRequestedTopicId) {
    return inMentorOrder(topics)
  }

  const requestedId = student.parentRequestedTopicId
  const topicMap = new Map(topics.map((t) => [t.id, t]))
  const prereqChain = getPrerequisiteChainLocal(requestedId, topicMap)
  const frontIds = new Set([...prereqChain, requestedId])

  const prereqTopics = prereqChain
    .map((id) => topicMap.get(id))
    .filter((t): t is CurriculumTopic => Boolean(t))
  const requestedTopic = topicMap.get(requestedId)
  const remainingTopics = inMentorOrder(
    topics.filter((t) => !frontIds.has(t.id))
  )

  return [
    ...prereqTopics,
    ...(requestedTopic ? [requestedTopic] : []),
    ...remainingTopics,
  ]
}

function describePlanChanges(
  previousPlan: GeneratedPlan,
  nextPlan: GeneratedPlan
) {
  const changes: string[] = []
  const previousByTopicId = new Map(
    previousPlan.allocations.map((allocation) => [allocation.topicId, allocation])
  )
  const nextByTopicId = new Map(
    nextPlan.allocations.map((allocation) => [allocation.topicId, allocation])
  )

  for (const allocation of nextPlan.allocations) {
    const previous = previousByTopicId.get(allocation.topicId)
    if (!previous) {
      changes.push(`${allocation.topicName} was added to the scheduled plan.`)
      continue
    }
    if (previous.classes !== allocation.classes) {
      changes.push(
        `${allocation.topicName}: ${previous.classes} → ${allocation.classes} classes.`
      )
    }
    if (previous.activities !== allocation.activities) {
      changes.push(
        `${allocation.topicName}: ${previous.activities} → ${allocation.activities} activities.`
      )
    }
  }

  for (const allocation of previousPlan.allocations) {
    if (!nextByTopicId.has(allocation.topicId)) {
      changes.push(`${allocation.topicName} was removed from the scheduled plan.`)
    }
  }

  if (previousPlan.capacity.total !== nextPlan.capacity.total) {
    changes.push(
      `Total planned capacity: ${previousPlan.capacity.total} → ${nextPlan.capacity.total} classes.`
    )
  }

  return changes
}

function mergePlanChanges(...groups: string[][]) {
  return [...new Set(groups.flat().filter(Boolean))]
}

function ClassLessonGuide({
  item,
  student,
  contentGenerating,
  contentSource,
}: {
  item: PlanItem
  student: DemoStudent
  contentGenerating: boolean
  contentSource: "ai" | "fallback" | null
}) {
  const activities =
    item.activities ?? buildClassActivities(item, questionGuidelines)
  const activityGroups = groupActivitiesByObjective(activities)
  const totalActivities = item.easyActivities + item.practiceActivities
  const teaching: ClassTeachingContent | undefined = item.teachingContent
  const topicAttempts = (student.questionAttemptEvidence ?? []).filter(
    (attempt) => attempt.topicId === item.topicId
  )
  const starterAttempt = topicAttempts.find((attempt) => attempt.level === "starter")
  const masterAttempt = topicAttempts.find((attempt) => attempt.level === "master")

  return (
    <div className="lpb-lesson-plan-card lpb-lesson-minimal">
      <p className="lpb-lesson-goal">
        {teaching?.goal ??
          `Master ${item.title} through instruction, guided practice, and application.`}
        {contentGenerating ? (
          <span className="lpb-content-source generating">Generating…</span>
        ) : teaching?.source === "ai" ? (
          <span className="lpb-content-source ai">AI</span>
        ) : null}
      </p>

      {starterAttempt && masterAttempt ? (
        <section className="lpb-class-attempt-score" aria-label="Question attempt evidence">
          <div>
            <span className="lpb-detail-label">Student attempt evidence</span>
            <strong>Use these results to decide what to teach</strong>
          </div>
          <div className="lpb-class-attempt-badges">
            <span className={starterAttempt.correct / starterAttempt.attempted >= 0.75 ? "secure" : "not-secure"}>
              Starter <b>{starterAttempt.correct}/{starterAttempt.attempted}</b>
            </span>
            <span className={masterAttempt.correct / masterAttempt.attempted >= 0.75 ? "secure" : "not-secure"}>
              Master <b>{masterAttempt.correct}/{masterAttempt.attempted}</b>
            </span>
          </div>
          <p>{starterAttempt.note} {masterAttempt.note}</p>
        </section>
      ) : null}

      {item.learningObjectives.length > 0 ? (
        <div className="lpb-lesson-block">
          <span className="lpb-detail-label">Objectives</span>
          <ul className="lpb-lesson-bullets">
            {item.learningObjectives.map((objective) => (
              <li key={objective.id}>
                {objective.subtopic ? (
                  <strong>{objective.subtopic}: </strong>
                ) : null}
                {objective.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="lpb-lesson-block">
        <span className="lpb-detail-label">Teach</span>
        <ul className="lpb-lesson-bullets points">
          {(
            teaching?.teachingPoints ?? [
              "Introduce vocabulary with 2 worked examples.",
              "Guide starter questions with feedback.",
              "Close with a master application question.",
            ]
          ).map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="lpb-lesson-block">
        <span className="lpb-detail-label">Success</span>
        <p className="lpb-rationale-text">
          {teaching?.successCriteria ??
            "≥80% on starter questions; attempts a master word problem with reasoning."}
        </p>
      </div>

      <div className="lpb-lesson-block">
        <span className="lpb-detail-label">
          Activities · {totalActivities} ({item.easyActivities} starter ·{" "}
          {item.practiceActivities} master)
        </span>
        {activityGroups.length > 0 ? (
          <div className="lpb-question-pairs lpb-question-pairs-flat">
            {activityGroups.flatMap((group) =>
              group.items.map((activity) => (
                <div key={activity.id} className="lpb-question-item">
                  <span className={`lpb-q-badge ${activity.level}`}>
                    {activity.label}
                  </span>
                  <p>
                    {activity.prompt}
                    {activity.round > 1 ? (
                      <em className="lpb-activity-round">
                        {" "}
                        · Round {activity.round}
                      </em>
                    ) : null}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="lpb-muted-text">No activities on this class.</p>
        )}
      </div>

      {(teaching?.rationale ?? item.reason) ? (
        <p className="lpb-lesson-why">{teaching?.rationale ?? item.reason}</p>
      ) : null}
    </div>
  )
}

export default function LearningPlanBuilderPage() {
  const [student, setStudent] = useState<DemoStudent>(DEFAULT_EVIDENCE_STUDENT)
  const [studentSelected, setStudentSelected] = useState(false)
  const [setupStep, setSetupStep] = useState(1)
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>(() =>
    getSuggestedTopicIds(curriculumTopics, DEFAULT_EVIDENCE_STUDENT)
  )
  const [topicOrder, setTopicOrder] = useState<number[]>(() =>
    getDefaultTopicOrder(curriculumTopics)
  )
  const [draggedTopicId, setDraggedTopicId] = useState<number | null>(null)
  const [scopeMode, setScopeMode] = useState<"manual" | "evidence">("manual")
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustments>(
    {}
  )
  const [manualOverrideActive, setManualOverrideActive] = useState(false)
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [planTab, setPlanTab] = useState<
    "classes" | "topics" | "structure" | "next2weeks" | "mentor"
  >("classes")
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [detailTopicId, setDetailTopicId] = useState<number | null>(null)
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<TopicEditDraft | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const [outcome, setOutcome] = useState<ClassOutcome>("on-track")
  const [outcomeNote, setOutcomeNote] = useState("")
  const [pendingUpdate, setPendingUpdate] = useState<PendingPlanUpdate | null>(
    null
  )
  const [aiParentExplanation, setAiParentExplanation] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [contentGenerating, setContentGenerating] = useState(false)
  const [contentSource, setContentSource] = useState<"ai" | "fallback" | null>(
    null
  )
  const [databasePlanId, setDatabasePlanId] = useState<string | null>(null)
  const [persistenceState, setPersistenceState] =
    useState<PersistenceState>("idle")

  const runAiAnalysisOnChooseScope = () => {
    setSetupStep(3)

    if (!student.parentRequestedTopicId) {
      setAiParentExplanation(null)
      return
    }

    const targetTopic = topicById.get(student.parentRequestedTopicId)
    if (!targetTopic) return

    const prereqIds = targetTopic.prerequisiteIds || []
    const prereqNames = prereqIds
      .map((id) => topicById.get(id)?.name)
      .filter((name): name is string => Boolean(name))

    setAiLoading(true)
    fetch("/api/learning-plan/parent-request-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestedTopicName: targetTopic.name,
        prerequisites: prereqNames,
        studentName: student.name,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.aiExplanation) {
          setAiParentExplanation(data.aiExplanation)
        }
      })
      .catch((err) => {
        console.error("AI analysis error:", err)
      })
      .finally(() => {
        setAiLoading(false)
      })
  }

  const suggestedTopicIds = useMemo(
    () => getSuggestedTopicIds(curriculumTopics, student),
    [student]
  )
  const highTopicIds = useMemo(
    () =>
      curriculumTopics
        .filter(
          (topic) =>
            topic.priority === "high" &&
            !student.completedTopics.some(
              (completed) => completed.topicId === topic.id
            )
        )
        .map((topic) => topic.id),
    [student]
  )
  const suggestedSet = useMemo(
    () => new Set(suggestedTopicIds),
    [suggestedTopicIds]
  )
  const selectedSet = useMemo(
    () => new Set(selectedTopicIds),
    [selectedTopicIds]
  )
  const aiSuggestion = useMemo(
    () => getAiAssistedTopicSuggestion(curriculumTopics, student),
    [student]
  )
  const aiRecommendationById = useMemo(
    () =>
      new Map(
        aiSuggestion.recommendations.map((recommendation) => [
          recommendation.topicId,
          recommendation,
        ])
      ),
    [aiSuggestion]
  )
  const aiSkippableSet = useMemo(
    () => new Set(aiSuggestion.skippableTopicIds),
    [aiSuggestion.skippableTopicIds]
  )
  const selectedAiSkippableCount = aiSuggestion.skippableTopicIds.filter(
    (topicId) => selectedSet.has(topicId)
  ).length

  const reviewPlan = useMemo(
    () =>
      buildLearningPlan({
        topics: curriculumTopics,
        student,
        selectedTopicIds,
        topicOrder,
        manualAdjustments,
        version: plan?.version ?? 1,
      }),
    [manualAdjustments, plan?.version, selectedTopicIds, student, topicOrder]
  )
  const reviewAllocationById = useMemo(
    () =>
      new Map(
        reviewPlan.allocations.map((allocation) => [
          allocation.topicId,
          allocation,
        ])
      ),
    [reviewPlan]
  )
  const placementClassAdjustments = useMemo(
    () =>
      reviewPlan.allocations.flatMap((allocation) => {
        const score = student.placementResults.find(
          (result) => result.topicId === allocation.topicId
        )?.score
        const savedClasses = allocation.idealClasses - allocation.classes

        if (score === undefined || score < 75 || savedClasses <= 0) {
          return []
        }

        return [
          {
            topicName: allocation.topicName,
            score,
            idealClasses: allocation.idealClasses,
            classes: allocation.classes,
            savedClasses,
          },
        ]
      }),
    [reviewPlan.allocations, student.placementResults]
  )
  const placementClassesSaved = placementClassAdjustments.reduce(
    (total, adjustment) => total + adjustment.savedClasses,
    0
  )
  const attemptProfiles = useMemo(() => {
    const attempts = student.questionAttemptEvidence ?? []
    return [...new Set(attempts.map((attempt) => attempt.topicId))].map(
      (topicId) => ({
        topic: topicById.get(topicId),
        starter: attempts.find(
          (attempt) => attempt.topicId === topicId && attempt.level === "starter"
        ),
        master: attempts.find(
          (attempt) => attempt.topicId === topicId && attempt.level === "master"
        ),
      })
    )
  }, [student.questionAttemptEvidence])

  const activeDetailTopic =
    detailTopicId === null ? null : topicById.get(detailTopicId)
  const activeEditAllocation =
    editingTopicId === null
      ? null
      : plan?.allocations.find(
          (allocation) => allocation.topicId === editingTopicId
        )
  const editWouldExceedCapacity = Boolean(
    plan &&
      activeEditAllocation &&
      editDraft &&
      plan.capacity.total - activeEditAllocation.classes + editDraft.classes >
        student.classesRemaining
  )
  const nextTeachingItem = plan
    ? findNextTeachingItem(plan.items, completedCount)
    : undefined
  const structuralItems = plan
    ? plan.items.filter((item) => item.kind !== "teaching")
    : []
  const mentorTopic =
    plan?.allocations.find((allocation) => allocation.topicId === student.currentTopicId) ??
    plan?.allocations[0]
  const mentorAttempts = (student.questionAttemptEvidence ?? []).filter(
    (attempt) => attempt.topicId === mentorTopic?.topicId
  )
  const isNewStudent = student.completedTopics.length === 0 && !student.currentTopicId
  const mentorObjectiveLevels = useMemo(
    () =>
      new Map(
        (mentorTopic?.learningObjectives ?? []).map((objective) => [
          objective.id,
          getMentorObjectiveLevel(objective.id, student, mentorAttempts),
        ])
      ),
    [mentorAttempts, mentorTopic?.learningObjectives, student]
  )
  const mentorFixText = useMemo(() => {
    if (!mentorTopic) return ""
    const needsFocus = mentorTopic.learningObjectives.filter((objective) => {
      const level = mentorObjectiveLevels.get(objective.id)
      return level === "stuck" || level === "not_attempted"
    })
    const focusText = needsFocus.length
      ? `Prioritize ${needsFocus.map((objective) => objective.subtopic).filter((value, index, values) => values.indexOf(value) === index).join(", ")}.`
      : "Continue extending the secure objectives with Master-level application."
    const testText = mentorTopic.classes < 2
      ? " A topic test should be scheduled before moving on."
      : ""
    return `${focusText}${testText}`
  }, [mentorObjectiveLevels, mentorTopic])

  const chooseStudent = (nextStudent: DemoStudent) => {
    setStudent(nextStudent)
    setStudentSelected(true)
    setSelectedTopicIds(getSuggestedTopicIds(curriculumTopics, nextStudent))
    setTopicOrder(getDefaultTopicOrder(curriculumTopics))
    setScopeMode("manual")
    setManualAdjustments({})
    setManualOverrideActive(false)
    setPlan(null)
    setSetupStep(1)
    setPlanTab("classes")
    setCompletedCount(0)
    setExpandedItemId(null)
    setDetailTopicId(null)
    setEditingTopicId(null)
    setPendingUpdate(null)
    setDatabasePlanId(null)
    setPersistenceState("idle")
  }

  const savePlanToDatabase = async (nextPlan: GeneratedPlan) => {
    setPersistenceState("saving")
    try {
      const response = await fetch("/api/learning-plan/prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", student, plan: nextPlan }),
      })
      if (!response.ok) throw new Error("Could not save the plan")
      const data = (await response.json()) as { planId: string }
      setDatabasePlanId(data.planId)
      setPersistenceState("saved")
    } catch (error) {
      console.error("Plan save failed:", error)
      setPersistenceState("error")
    }
  }

  const savePlanUpdate = async ({
    nextPlan,
    kind,
    changes,
    completedCount: nextCompletedCount,
    outcome: recordedOutcome,
    note,
    taughtPrototypeTopicId,
    autoApplied,
  }: {
    nextPlan: GeneratedPlan
    kind: "manual" | "class"
    changes: string[]
    completedCount: number
    outcome?: ClassOutcome
    note?: string
    taughtPrototypeTopicId?: number
    autoApplied?: boolean
  }) => {
    if (!databasePlanId) return
    setPersistenceState("saving")
    try {
      const response = await fetch("/api/learning-plan/prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          planId: databasePlanId,
          student,
          plan: nextPlan,
          update: {
            kind,
            changes,
            completedCount: nextCompletedCount,
            outcome: recordedOutcome,
            note,
            taughtPrototypeTopicId,
            autoApplied,
          },
        }),
      })
      if (!response.ok) throw new Error("Could not save the plan update")
      setPersistenceState("saved")
    } catch (error) {
      console.error("Plan update save failed:", error)
      setPersistenceState("error")
    }
  }

  const toggleTopic = (topicId: number) => {
    setManualOverrideActive(true)
    setSelectedTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId]
    )
  }

  const applyEvidencePlan = () => {
    if (manualOverrideActive) return
    setScopeMode("evidence")
    setAiLoading(true)
    fetch("/api/learning-plan/ai-plan-generator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student,
        topics: curriculumTopics,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.strategy) {
          setAiParentExplanation(data.strategy)
        }
        if (data.classAdjustments && typeof data.classAdjustments === "object") {
          const newAdjustments: ManualAdjustments = { ...manualAdjustments }
          for (const [topicIdStr, adj] of Object.entries(data.classAdjustments)) {
            const topicId = Number(topicIdStr)
            const castAdj = adj as { classes: number; activities: number }
            newAdjustments[topicId] = {
              classes: castAdj.classes,
              activities: castAdj.activities,
            }
          }
          setManualAdjustments(newAdjustments)
        }
        setSelectedTopicIds(aiSuggestion.selectedTopicIds)
        setTopicOrder(getDefaultTopicOrder(curriculumTopics))
      })
      .catch((err) => console.error("AI Plan error:", err))
      .finally(() => setAiLoading(false))
  }

  const unselectAiSkippableTopics = () => {
    if (manualOverrideActive) return
    setSelectedTopicIds((current) =>
      current.filter((topicId) => !aiSkippableSet.has(topicId))
    )
    setScopeMode("evidence")
  }

  const unselectTopic = (topicId: number) => {
    setManualOverrideActive(true)
    setSelectedTopicIds((current) =>
      current.filter((selectedId) => selectedId !== topicId)
    )
  }

  const moveTopic = (targetTopicId: number) => {
    if (draggedTopicId === null || draggedTopicId === targetTopicId) return
    setTopicOrder((current) => {
      const nextOrder = current.filter((topicId) => topicId !== draggedTopicId)
      const targetIndex = nextOrder.indexOf(targetTopicId)
      nextOrder.splice(targetIndex < 0 ? nextOrder.length : targetIndex, 0, draggedTopicId)
      return nextOrder
    })
    setManualOverrideActive(true)
    setDraggedTopicId(null)
  }

  /**
   * Build structure deterministically, then generate mentor prose the same way
   * /teacher/plans does (llmStructured when a key is present; fallback templates otherwise).
   * Always attach expanded activity rows so "N total activities" lists N items.
   */
  const enrichPlan = async (basePlan: GeneratedPlan): Promise<GeneratedPlan> => {
    const withLocalActivities: GeneratedPlan = {
      ...basePlan,
      items: basePlan.items.map((item) =>
        item.kind === "teaching"
          ? {
              ...item,
              activities: buildClassActivities(item, questionGuidelines),
            }
          : item
      ),
    }

    setContentGenerating(true)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch("/api/learning-plan/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          student,
          items: withLocalActivities.items,
          guidelines: questionGuidelines,
        }),
      })
      if (!response.ok) {
        throw new Error(`generate-content failed: ${response.status}`)
      }
      const data = (await response.json()) as {
        items: PlanItem[]
        source: "ai" | "fallback"
      }
      setContentSource(data.source)
      return {
        ...withLocalActivities,
        items: data.items,
        explanations: [
          data.source === "ai"
            ? "Teaching guide prose was generated by AI for each class (structure stayed rule-based)."
            : "Teaching guide prose used local fallback templates (AI provider unavailable).",
          ...withLocalActivities.explanations,
        ],
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.warn(
          "Teaching-guide generation timed out; continuing with local guide content."
        )
      } else {
        console.error("Plan content enrichment failed:", error)
      }
      setContentSource("fallback")
      return withLocalActivities
    } finally {
      window.clearTimeout(timeoutId)
      setContentGenerating(false)
    }
  }

  const buildPlan = async () => {
    const basePlan = buildLearningPlan({
      topics: curriculumTopics,
      student,
      selectedTopicIds,
      topicOrder,
      manualAdjustments,
      version: 1,
      changesFromPrevious:
        student.scenario === "C"
          ? [
              "Removed completed Number Sense and Multi-Digit Operations topic blocks.",
              "Refitted the remaining topics into the new 24-class window.",
            ]
          : [],
      lastModificationType: manualOverrideActive ? "manual" : "auto",
    })
    if (basePlan.capacity.difference > 0) {
      setSetupStep(4)
      return
    }
    // Attach activity rows immediately so the count matches the list
    // while AI prose is still generating.
    const withActivities: GeneratedPlan = {
      ...basePlan,
      items: basePlan.items.map((item) =>
        item.kind === "teaching"
          ? {
              ...item,
              activities: buildClassActivities(item, questionGuidelines),
            }
          : item
      ),
    }
    setPlan(withActivities)
    setCompletedCount(0)
    setPlanTab("classes")
    window.scrollTo({ top: 0, behavior: "smooth" })
    await savePlanToDatabase(withActivities)
    const enriched = await enrichPlan(withActivities)
    setPlan(enriched)
  }

  const returnToSetup = () => {
    setPlan(null)
    setSetupStep(4)
    setCompletedCount(0)
    setDatabasePlanId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (topicId: number) => {
    const allocation = plan?.allocations.find(
      (item) => item.topicId === topicId
    )
    if (!allocation) return
    setEditingTopicId(topicId)
    setEditDraft({
      classes: allocation.classes,
      activities: allocation.activities,
      easyPercent: allocation.easyPercent,
    })
  }

  const saveTopicEdit = () => {
    if (!plan || editingTopicId === null || !editDraft) return
    const previous = plan.allocations.find(
      (allocation) => allocation.topicId === editingTopicId
    )
    if (!previous) return

    const adjustment: ManualTopicAdjustment = {
      classes: editDraft.classes,
      activities: editDraft.activities,
      easyPercent: editDraft.easyPercent,
    }
    const nextAdjustments = {
      ...manualAdjustments,
      [editingTopicId]: adjustment,
    }
    const changes = [
      `${previous.topicName}: ${previous.classes} → ${editDraft.classes} classes.`,
      `${previous.activities} → ${editDraft.activities} activities with a ${editDraft.easyPercent}:${100 - editDraft.easyPercent} Easy-to-Practice split.`,
      "The teacher override is locked into this plan version.",
    ]

    setManualAdjustments(nextAdjustments)
    setManualOverrideActive(true)
    const nextBasePlan = buildLearningPlan({
      topics: curriculumTopics,
      student,
      selectedTopicIds,
      topicOrder,
      manualAdjustments: nextAdjustments,
      version: plan.version + 1,
      lastModificationType: "manual",
    })
    if (nextBasePlan.capacity.difference > 0) return
    const nextPlan: GeneratedPlan = {
      ...nextBasePlan,
      changesFromPrevious: mergePlanChanges(
        changes,
        describePlanChanges(plan, nextBasePlan)
      ),
    }
    setPlan(nextPlan)
    void enrichPlan(nextPlan).then(setPlan)
    void savePlanUpdate({
      nextPlan,
      kind: "manual",
      changes: nextPlan.changesFromPrevious,
      completedCount,
    })
    setEditingTopicId(null)
    setEditDraft(null)
  }

  const previewClassOutcome = () => {
    if (!plan || !nextTeachingItem?.topicId) return
    const allocation = plan.allocations.find(
      (item) => item.topicId === nextTeachingItem.topicId
    )
    if (!allocation) return

    const changes: string[] = [
      `Marked Class ${nextTeachingItem.classNumber} as completed.`,
    ]
    let nextClasses = allocation.classes

    if (outcome === "faster") {
      nextClasses = Math.max(1, allocation.classes - 1)
      changes.push(
        `${allocation.topicName} is progressing faster: ${allocation.classes} → ${nextClasses} classes.`
      )
    } else if (outcome === "needs-time") {
      const idealPlusTwo = allocation.idealClasses + 2
      nextClasses = Math.min(idealPlusTwo, allocation.classes + 1)
      changes.push(
        `${allocation.topicName} needs reinforcement: ${allocation.classes} → ${nextClasses} classes.`
      )
    } else {
      changes.push(
        `${allocation.topicName} remains on its approved allocation.`
      )
    }

    if (outcomeNote.trim()) {
      changes.push(`Teacher note saved: “${outcomeNote.trim()}”`)
    }

    const nextAdjustments = {
      ...manualAdjustments,
      [allocation.topicId]: {
        ...manualAdjustments[allocation.topicId],
        classes: nextClasses,
      },
    }
    const nextBasePlan = buildLearningPlan({
      topics: curriculumTopics,
      student,
      selectedTopicIds,
      topicOrder,
      manualAdjustments: nextAdjustments,
      version: plan.version + 1,
      lastModificationType: "class",
    })
    if (nextBasePlan.capacity.difference > 0) return
    const nextPlan: GeneratedPlan = {
      ...nextBasePlan,
      changesFromPrevious: mergePlanChanges(
        changes,
        describePlanChanges(plan, nextBasePlan)
      ),
    }

    setPendingUpdate({
      plan: nextPlan,
      adjustments: nextAdjustments,
      changes,
    })
  }

  const approveClassOutcome = () => {
    if (!pendingUpdate) return
    setPlan(pendingUpdate.plan)
    void enrichPlan(pendingUpdate.plan).then(setPlan)
    setManualAdjustments(pendingUpdate.adjustments)
    setManualOverrideActive(false)
    setCompletedCount((current) => current + 1)
    void savePlanUpdate({
      nextPlan: pendingUpdate.plan,
      kind: "class",
      changes: pendingUpdate.changes,
      completedCount: completedCount + 1,
      outcome,
      note: outcomeNote,
      taughtPrototypeTopicId: nextTeachingItem?.topicId,
      autoApplied: outcome !== "on-track",
    })
    setPendingUpdate(null)
    setOutcomeOpen(false)
    setOutcome("on-track")
    setOutcomeNote("")
  }

  const resetPrototype = () => {
    chooseStudent(DEFAULT_EVIDENCE_STUDENT)
    setStudentSelected(false)
  }

  return (
    <div className="lpb">
      <link
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <header className="lpb-topbar">
        <Link href="/" className="lpb-brand" aria-label="Noah home">
          <span className="lpb-logo" aria-hidden="true">
            <span />
          </span>
          <span className="lpb-brand-word">
            Noah <b>2.0</b>
          </span>
        </Link>
        <span className="lpb-top-divider" />
        <span className="lpb-product-name">Learning Plan Builder</span>
        <div className="lpb-top-actions">
          <button
            type="button"
            className="lpb-button lpb-button-ghost"
            onClick={resetPrototype}
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </header>

      {plan === null ? (
        <main className="lpb-setup-shell">
          <section className="lpb-setup-heading">
            <div>
              <span className="lpb-kicker">
                Maths · Grade 5 · US curriculum
              </span>
              <h1>Build a plan a teacher can trust.</h1>
              <p>
                Turn curriculum priorities and student evidence into a
                class-by-class plan—without hiding the rules.
              </p>
            </div>
          </section>

          <nav className="lpb-stepper" aria-label="Plan setup">
            {SETUP_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                className={
                  setupStep === step.id
                    ? "active"
                    : setupStep > step.id
                      ? "complete"
                      : ""
                }
                onClick={() => {
                  if (step.id <= setupStep) setSetupStep(step.id)
                }}
              >
                <span>
                  {setupStep > step.id ? <Check size={15} /> : step.id}
                </span>
                {step.label}
              </button>
            ))}
          </nav>

          <section className="lpb-setup-card">
            {setupStep === 1 ? (
              <>
                <header className="lpb-section-head">
                  <div>
                    <span className="lpb-section-no">01</span>
                    <h2>Choose a demo student</h2>
                    <p>
                      Each student shows a different planning path from the
                      supplied test scenarios.
                    </p>
                  </div>
                  <span className="lpb-count-chip">4 profiles</span>
                </header>

                <div className="lpb-student-grid">
                  {demoStudents.map((candidate) => {
                    const copy = SCENARIO_COPY[candidate.scenario]
                    const selected = studentSelected && candidate.id === student.id
                    return (
                      <button
                        type="button"
                        key={candidate.id}
                        className={`lpb-student-card${selected ? " selected" : ""}`}
                        onClick={() => chooseStudent(candidate)}
                      >
                        <span className="lpb-scenario-tag">
                          Demo {candidate.scenario}
                        </span>
                        <span className="lpb-student-card-top">
                          <span className="lpb-avatar">
                            {candidate.initials}
                          </span>
                          {selected ? (
                            <span className="lpb-selected-check">
                              <Check size={14} />
                            </span>
                          ) : null}
                        </span>
                        <strong>{candidate.name}</strong>
                        <span className="lpb-card-eyebrow">{copy.eyebrow}</span>
                        <b>{copy.title}</b>
                        <p>{copy.description}</p>
                      </button>
                    )
                  })}
                </div>

                {studentSelected ? (
                <div className="lpb-profile-strip">
                  <div>
                    <span>Student</span>
                    <strong>{student.name}</strong>
                  </div>
                  <div>
                    <span>Grade</span>
                    <strong>Grade {student.grade}</strong>
                  </div>
                  <div>
                    <span>Region</span>
                    <strong>United States</strong>
                  </div>
                  <div>
                    <span>Classes remaining</span>
                    <strong>{student.classesRemaining}</strong>
                  </div>
                  <div>
                    <span>Placement</span>
                    <strong>
                      {student.placementStatus === "completed"
                        ? "Completed"
                        : student.placementStatus === "not-taken"
                          ? "Not taken"
                          : "Previous plan"}
                    </strong>
                  </div>
                </div>
                ) : (
                  <div className="lpb-profile-strip lpb-profile-empty">
                    <strong>Select a student profile to review their evidence and build a plan.</strong>
                  </div>
                )}

                <footer className="lpb-setup-footer">
                  <span>
                    <FileText size={15} />
                    All information on this page is prototype dummy data.
                  </span>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={() => setSetupStep(2)}
                    disabled={!studentSelected}
                  >
                    Review evidence
                    <ArrowRight size={16} />
                  </button>
                </footer>
              </>
            ) : null}

            {setupStep === 2 ? (
              <>
                <header className="lpb-section-head">
                  <div>
                    <span className="lpb-section-no">02</span>
                    <h2>Review the evidence</h2>
                    <p>
                      This is the information the rules will use. Nothing is
                      inferred outside the dummy dataset.
                    </p>
                  </div>
                  <span className="lpb-count-chip">
                    Demo {student.scenario}
                  </span>
                </header>

                {student.placementStatus === "completed" ? (
                  <div className="lpb-evidence-layout">
                    <section className="lpb-evidence-panel">
                      <div className="lpb-panel-title">
                        <Target size={18} />
                        <div>
                          <h3>Placement results</h3>
                          <p>Scores out of 100 by assessed topic</p>
                        </div>
                      </div>
                      <div className="lpb-score-list">
                        {student.placementResults.map((result) => {
                          const topic = topicById.get(result.topicId)
                          return (
                            <div className="lpb-score-row" key={result.topicId}>
                              <div>
                                <strong>{topic?.name}</strong>
                                <span>{topic?.family}</span>
                              </div>
                              <div className="lpb-score-track">
                                <span
                                  style={{ width: `${result.score}%` }}
                                  className={placementTone(result.score)}
                                />
                              </div>
                              <b className={placementTone(result.score)}>
                                {result.score}%
                              </b>
                              <span
                                className={`lpb-evidence-status ${placementTone(result.score)}`}
                              >
                                {placementLabel(result.score)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="lpb-evidence-note">
                        Other assessed topics use a mid-range prototype score of{" "}
                        {student.defaultPlacementScore}%.
                      </div>
                    </section>

                    <aside className="lpb-rule-preview">
                      <div className="lpb-rule-preview-topline">
                        <span className="lpb-rule-preview-icon">
                          <Lightbulb size={20} />
                        </span>
                        <span>Placement rule analysis</span>
                      </div>
                      <h3>How scores change the plan</h3>
                      <ul>
                        <li>
                          <strong>Below 40%</strong>
                          <span>Keep the full class allocation and add more Practice activities.</span>
                        </li>
                        <li>
                          <strong>75% or more</strong>
                          <span>Shorten the topic and add Easy consolidation.</span>
                        </li>
                        <li>
                          <strong>40%–74%</strong>
                          <span>Keep the ideal workbook class and activity values.</span>
                        </li>
                      </ul>
                    </aside>
                  </div>
                ) : null}

                {student.placementStatus === "not-taken" &&
                student.parentRequestedTopicId === undefined ? (
                  <div className="lpb-empty-evidence">
                    <span className="lpb-empty-icon">
                      <BookOpenCheck size={28} />
                    </span>
                    <div>
                      <span className="lpb-kicker">No placement test</span>
                      <h3>Use the academic defaults.</h3>
                      <p>
                        Every selected topic starts with its ideal class,
                        activity and Easy-to-Practice allocation from the
                        workbook.
                      </p>
                    </div>
                    <div className="lpb-default-summary">
                      <span>13 curriculum topics</span>
                      <span>66 teaching + 13 structural = 79 classes</span>
                      <span>242 activities</span>
                    </div>
                  </div>
                ) : null}

                {student.scenario === "C" ? (
                  <>
                    <div className="lpb-returning-layout">
                      <section className="lpb-evidence-panel">
                      <div className="lpb-panel-title">
                        <CheckCircle2 size={18} />
                        <div>
                          <h3>Completed since the previous plan</h3>
                          <p>{student.previousPlanLabel}</p>
                        </div>
                      </div>
                      <div className="lpb-completed-list">
                        {student.completedTopics.map((completed) => {
                          const topic = topicById.get(completed.topicId)
                          const saved =
                            completed.plannedClasses - completed.actualClasses
                          return (
                            <div key={completed.topicId}>
                              <span className="lpb-mini-check">
                                <Check size={13} />
                              </span>
                              <div>
                                <strong>{topic?.name}</strong>
                                <span>
                                  {completed.actualClasses} of{" "}
                                  {completed.plannedClasses} planned classes
                                </span>
                              </div>
                              <b>{saved > 0 ? `${saved} saved` : "On plan"}</b>
                            </div>
                          )
                        })}
                      </div>
                      </section>
                      <section className="lpb-evidence-panel">
                      <div className="lpb-panel-title">
                        <Gauge size={18} />
                        <div>
                          <h3>Current-topic evidence</h3>
                          <p>
                            {topicById.get(student.currentTopicId ?? 0)?.name}
                          </p>
                        </div>
                      </div>
                      <div className="lpb-signal-list">
                        {student.objectiveEvidence.map((evidence) => (
                          <div
                            key={`${evidence.learningObjectiveId}-${evidence.level}`}
                            className={evidence.result}
                          >
                            {evidence.result === "secure" ? (
                              <TrendingUp size={16} />
                            ) : (
                              <TrendingDown size={16} />
                            )}
                            <span>{evidence.note}</span>
                          </div>
                        ))}
                      </div>
                      </section>
                    </div>
                    <section className="lpb-attempt-evidence">
                      <div>
                        <span className="lpb-detail-label">Attempted questions</span>
                        <h3>What the plan will teach next</h3>
                        <p>Starter and Master results are used to choose the teaching response—not just to list questions.</p>
                      </div>
                      <div className="lpb-attempt-profile-list">
                        {attemptProfiles.map(({ topic, starter, master }) => {
                          if (!topic || !starter || !master) return null
                          const starterStrong = starter.correct / starter.attempted >= 0.75
                          const masterStrong = master.correct / master.attempted >= 0.75
                          const focus = starterStrong && !masterStrong
                            ? "Bridge secure methods into unfamiliar Master tasks."
                            : !starterStrong && masterStrong
                              ? "Repair the Starter routine so the stronger reasoning is reliable."
                              : "Use both levels to confirm the next teaching step."
                          return (
                            <article key={topic.id}>
                              <strong>{topic.name}</strong>
                              <div className="lpb-attempt-scores">
                                <span className={starterStrong ? "secure" : "not-secure"}>Starter {starter.correct}/{starter.attempted}</span>
                                <span className={masterStrong ? "secure" : "not-secure"}>Master {master.correct}/{master.attempted}</span>
                              </div>
                              <p>{focus}</p>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  </>
                ) : null}

                {student.scenario === "D" || student.parentRequestedTopicId ? (
                  <div className="lpb-parent-request">
                    <span className="lpb-parent-icon">
                      <UsersRound size={24} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <span className="lpb-kicker">Parent request</span>
                      <div className="lpb-parent-header-row">
                        <h3>Start with:</h3>
                        <select
                          className="lpb-parent-select"
                          value={student.parentRequestedTopicId ?? curriculumTopics[0]?.id}
                          onChange={(e) => {
                            const newTopicId = Number(e.target.value)
                            const updatedStudent = {
                              ...student,
                              parentRequestedTopicId: newTopicId,
                            }
                            setStudent(updatedStudent)
                            const newSuggested = getSuggestedTopicIds(curriculumTopics, updatedStudent)
                            setSelectedTopicIds(newSuggested)
                            const newTopicOrder = getDefaultTopicOrder(curriculumTopics)
                            setTopicOrder(newTopicOrder)
                            if (plan !== null) {
                              const currentPlan = plan as GeneratedPlan
                              const nextBasePlan = buildLearningPlan({
                                topics: curriculumTopics,
                                student: updatedStudent,
                                selectedTopicIds: newSuggested,
                                topicOrder: newTopicOrder,
                                manualAdjustments,
                                version: currentPlan.version + 1,
                              })
                              if (nextBasePlan.capacity.difference <= 0) {
                                setPlan({
                                  ...nextBasePlan,
                                  changesFromPrevious: mergePlanChanges(
                                    [
                                      `Parent requested starting topic changed to: ${topicById.get(newTopicId)?.name ?? "selected topic"}.`,
                                      "Prerequisite refreshers were re-scheduled before the requested topic.",
                                    ],
                                    describePlanChanges(currentPlan, nextBasePlan)
                                  ),
                                })
                              }
                            }
                          }}
                        >
                          {curriculumTopics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              Topic {topic.sequence}: {topic.name} ({topic.priority} priority, {topic.idealClasses} classes)
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="lpb-parent-subtext">
                        The plan will move unmet prerequisite topics forward as
                        compressed refreshers, then return to the normal
                        curriculum sequence.
                      </p>
                    </div>
                    <span className="lpb-request-pill">Requested start</span>
                  </div>
                ) : null}

                <footer className="lpb-setup-footer">
                  <button
                    type="button"
                    className="lpb-button lpb-button-secondary"
                    onClick={() => setSetupStep(1)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={runAiAnalysisOnChooseScope}
                  >
                    Choose topic scope
                    <ArrowRight size={16} />
                  </button>
                </footer>
              </>
            ) : null}

            {setupStep === 3 ? (
              <>
                <header className="lpb-section-head lpb-topic-scope-head">
                  <div>
                    <span className="lpb-section-no">03</span>
                    <h2>Choose the topic scope</h2>
                    <p>
                      Recommended topics are preselected. The teacher controls
                      the final scope.
                    </p>
                  </div>
                  <span className="lpb-count-chip">
                    {selectedTopicIds.length} selected
                  </span>
                </header>

                {aiLoading ? (
                  <div className="lpb-ai-analysis-banner loading" style={{ marginBottom: "20px" }}>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Analyzing topic scope & prerequisites with OpenAI...</span>
                  </div>
                ) : student.parentRequestedTopicId && aiParentExplanation ? (
                  <div className="lpb-ai-analysis-banner" style={{ marginBottom: "20px" }}>
                    <Sparkles size={16} />
                    <div>
                      <strong>AI Curriculum Analysis (OpenAI)</strong>
                      <p>{aiParentExplanation}</p>
                    </div>
                  </div>
                ) : null}

                <div className="lpb-planning-modes">
                  <button
                    type="button"
                    className={`lpb-planning-mode${scopeMode === "manual" ? " active" : ""}`}
                    onClick={() => setScopeMode("manual")}
                  >
                    <span className="lpb-mode-icon manual">
                      <SlidersHorizontal size={20} />
                    </span>
                    <span>
                      <strong>Manual scope</strong>
                      <small>
                        Select or unselect every topic yourself. Workbook
                        recommendations remain visible.
                      </small>
                    </span>
                    <span className="lpb-mode-choice">
                      {scopeMode === "manual" ? <Check size={14} /> : null}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`lpb-planning-mode evidence${scopeMode === "evidence" ? " active" : ""}`}
                    onClick={applyEvidencePlan}
                    disabled={manualOverrideActive}
                  >
                    <span className="lpb-mode-icon evidence">
                      <Lightbulb size={20} />
                    </span>
                    <span>
                      <strong>Use evidence</strong>
                      <small>
                        Use placement, mastery, completed work and capacity.
                        Start with evidence-based recommendations, then refine
                        the scope and order yourself.
                      </small>
                    </span>
                    <span className="lpb-mode-action">
                      {scopeMode === "evidence" ? "Applied" : "Apply rules"}
                    </span>
                  </button>
                </div>

                {scopeMode === "evidence" ? (
                  <section className="lpb-evidence-scope-summary">
                    <div className="lpb-evidence-summary-head">
                      <span>
                        <Lightbulb size={16} />
                        Evidence-based scope
                      </span>
                      <strong>
                        All topics that fit are selected
                      </strong>
                    </div>
                    <p>
                      Scope was shaped from the student&apos;s placement,
                      mastery and progress signals. You can include, remove or
                      reorder every topic before building the plan. Strong
                      scores shorten a topic; they do not remove it.
                    </p>
                    <div className="lpb-evidence-chips">
                      {aiSuggestion.evidenceSummary.map((summary) => (
                        <span key={summary}>
                          <CheckCircle2 size={13} />
                          {summary}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {manualOverrideActive ? (
                  <output className="lpb-manual-override-notice">
                    <LockKeyhole size={16} />
                    Manual change recorded — automatic updates stay paused until the next class data arrives.
                  </output>
                ) : null}

                <div className="lpb-topic-tools">
                  <div className="lpb-priority-legend">
                    {(["high", "medium", "low"] as const).map((priority) => (
                      <span key={priority} className={priority}>
                        <i />
                        {PRIORITY_COPY[priority].label}
                      </span>
                    ))}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setScopeMode("manual")
                        setManualOverrideActive(true)
                        setSelectedTopicIds(
                          curriculumTopics
                            .filter(
                              (topic) =>
                                !student.completedTopics.some(
                                  (completed) => completed.topicId === topic.id
                                )
                            )
                            .map((topic) => topic.id)
                        )
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScopeMode("manual")
                        setManualOverrideActive(true)
                        setSelectedTopicIds(highTopicIds)
                      }}
                    >
                      Clear optional
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScopeMode("manual")
                        setManualOverrideActive(true)
                        setSelectedTopicIds(suggestedTopicIds)
                      }}
                    >
                      Restore recommended
                    </button>
                  </div>
                </div>

                <p className="lpb-topic-order-hint">
                  <GripVertical size={15} />
                  Drag topics into the teaching sequence. For placement results,
                  topics scoring below 40% start first.
                </p>

                <div className="lpb-topic-list">
                  {sortTopicsForDisplay(curriculumTopics, student, topicOrder).map((topic) => {
                      const completed = student.completedTopics.some(
                        (item) => item.topicId === topic.id
                      )
                      const selected = selectedSet.has(topic.id)
                      const suggested = suggestedSet.has(topic.id)
                      const aiRecommendation = aiRecommendationById.get(
                        topic.id
                      )
                      const previewAllocation = reviewAllocationById.get(
                        topic.id
                      )
                      const evidenceCompressed =
                        scopeMode === "evidence" &&
                        selected &&
                        previewAllocation !== undefined &&
                        (previewAllocation.classes < topic.idealClasses ||
                          previewAllocation.activities < topic.idealActivities)
                      return (
                        <button
                          type="button"
                          key={topic.id}
                          disabled={completed}
                          draggable={!completed}
                          aria-disabled={completed}
                          className={`lpb-topic-option${selected ? " selected" : ""}${completed ? " completed" : ""}${draggedTopicId === topic.id ? " dragging" : ""}`}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move"
                            event.dataTransfer.setData("text/plain", String(topic.id))
                            setDraggedTopicId(topic.id)
                          }}
                          onDragEnd={() => setDraggedTopicId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault()
                            moveTopic(topic.id)
                          }}
                          onClick={() => toggleTopic(topic.id)}
                        >
                          <span className="lpb-topic-drag" title={`Drag ${topic.name} to reorder`}>
                            <GripVertical size={17} />
                          </span>
                          <span className="lpb-topic-check">
                            {completed || selected ? <Check size={14} /> : null}
                          </span>
                          <span className="lpb-topic-sequence">
                            {String(topic.sequence).padStart(2, "0")}
                          </span>
                          <span className="lpb-topic-main">
                            <strong>{topic.name}</strong>
                            <small>
                              {topic.family} ·{" "}
                              {plural(
                                topic.learningObjectives.length,
                                "learning objective"
                              )}
                            </small>
                          </span>
                          <span
                            className={`lpb-priority-pill ${topic.priority}`}
                          >
                            {PRIORITY_COPY[topic.priority as Priority].label}
                          </span>
                          <span className="lpb-topic-metrics">
                            <b>
                              {scopeMode === "evidence" && previewAllocation
                                ? previewAllocation.classes
                                : topic.idealClasses}
                            </b>
                            <small>
                              {evidenceCompressed
                                ? `of ${topic.idealClasses} classes`
                                : "classes"}
                            </small>
                          </span>
                          <span className="lpb-topic-metrics">
                            <b>
                              {scopeMode === "evidence" && previewAllocation
                                ? previewAllocation.activities
                                : topic.idealActivities}
                            </b>
                            <small>
                              {evidenceCompressed
                                ? `of ${topic.idealActivities} activities`
                                : "activities"}
                            </small>
                          </span>
                          <span className="lpb-topic-state">
                            {completed ? (
                              "Completed"
                            ) : topic.priority === "high" ? (
                              evidenceCompressed ? "Compressed" : selected ? "Selected by mentor" : "Not selected"
                            ) : scopeMode === "evidence" &&
                              aiRecommendation?.decision === "defer" ? (
                              "Deferred for capacity"
                            ) : scopeMode === "evidence" && selected ? (
                              "Evidence suggested"
                            ) : suggested ? (
                              "Recommended"
                            ) : selected ? (
                              "Teacher added"
                            ) : (
                              "Not selected"
                            )}
                          </span>
                        </button>
                      )
                    })}
                </div>

                <footer className="lpb-setup-footer">
                  <button
                    type="button"
                    className="lpb-button lpb-button-secondary"
                    onClick={() => setSetupStep(2)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={() => setSetupStep(4)}
                    disabled={selectedTopicIds.length === 0}
                  >
                    Review capacity
                    <ArrowRight size={16} />
                  </button>
                </footer>
              </>
            ) : null}

            {setupStep === 4 ? (
              <>
                <header className="lpb-section-head">
                  <div>
                    <span className="lpb-section-no">04</span>
                    <h2>Review before building</h2>
                    <p>
                      Check the selected scope, structural reserve and any
                      capacity warnings.
                    </p>
                  </div>
                  <span className="lpb-count-chip">
                    {reviewPlan.capacity.difference > 0
                      ? "Capacity warning"
                      : "Ready to build"}
                  </span>
                </header>

                <div className="lpb-review-layout">
                  <section className="lpb-capacity-card">
                    <div className="lpb-capacity-top">
                      <div>
                        <span className="lpb-kicker">Capacity check</span>
                        <h3>
                          {reviewPlan.capacity.difference > 0
                            ? `${reviewPlan.capacity.difference} classes over`
                            : `${Math.abs(reviewPlan.capacity.difference)} classes available`}
                        </h3>
                      </div>
                      <span
                        className={`lpb-capacity-orb${reviewPlan.capacity.difference > 0 ? " over" : ""}`}
                      >
                        {reviewPlan.capacity.total}
                        <small>planned</small>
                      </span>
                    </div>
                    {placementClassesSaved > 0 ? (
                      <div className="lpb-placement-capacity-note">
                        <div className="lpb-placement-capacity-head">
                          <span>
                            <TrendingUp size={17} />
                            Important capacity adjustment
                          </span>
                          <b>−{placementClassesSaved} classes</b>
                        </div>
                        <strong>
                          Strong placement reduced teaching from {reviewPlan.capacity.teaching + placementClassesSaved} to {reviewPlan.capacity.teaching} classes.
                        </strong>
                        <p>
                          {placementClassAdjustments
                            .map(
                              (adjustment) =>
                                `${adjustment.topicName} (${adjustment.score}%): ${adjustment.idealClasses} → ${adjustment.classes}`
                            )
                            .join(" · ")}
                        </p>
                      </div>
                    ) : null}
                    <div className="lpb-capacity-bar">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            (reviewPlan.capacity.total /
                              reviewPlan.capacity.available) *
                              100
                          )}%`,
                        }}
                        className={
                          reviewPlan.capacity.difference > 0 ? "over" : ""
                        }
                      />
                    </div>
                    <div className="lpb-capacity-breakdown">
                      <div>
                        <span>Available</span>
                        <b>{reviewPlan.capacity.available}</b>
                      </div>
                      <div>
                        <span>Teaching</span>
                        <b>{reviewPlan.capacity.teaching}</b>
                      </div>
                      <div>
                        <span>Structural</span>
                        <b>{reviewPlan.capacity.structural}</b>
                      </div>
                      <div>
                        <span>Total</span>
                        <b>{reviewPlan.capacity.total}</b>
                      </div>
                    </div>
                    {reviewPlan.capacity.difference > 0 ? (
                      <div className="lpb-inline-warning">
                        <AlertTriangle size={18} />
                        <div>
                          <strong>
                            Plan is still over available capacity.
                          </strong>
                          <span>
                            {scopeMode === "evidence"
                              ? "Evidence provides a starting recommendation. Remove topics or adjust allocations before generating the plan."
                              : "Unselect topics or adjust allocations before generating the plan."}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="lpb-review-list-card">
                    <div className="lpb-panel-title">
                      <ListChecks size={18} />
                      <div>
                        <h3>Selected plan scope</h3>
                        <p>
                          {plural(reviewPlan.allocations.length, "topic")} in
                          mentor-selected order
                        </p>
                      </div>
                    </div>
                    <div className="lpb-review-topic-list">
                      {reviewPlan.allocations.map((allocation, index) => {
                        const aiRecommendation = aiRecommendationById.get(
                          allocation.topicId
                        )
                        const isRequiredPrerequisite = !selectedSet.has(
                          allocation.topicId
                        )
                        return (
                          <div key={allocation.topicId}>
                            <span>{index + 1}</span>
                            <div>
                              <strong>{allocation.topicName}</strong>
                              <small>
                                {allocation.isCompressedRefresher
                                  ? "Compressed refresher · "
                                  : ""}
                                {allocation.classes} classes ·{" "}
                                {allocation.activities} activities
                              </small>
                              {scopeMode === "evidence" && aiRecommendation ? (
                                <em>
                                  {aiRecommendation.decision === "defer"
                                    ? `Teacher kept this topic. ${aiRecommendation.reason}`
                                    : aiRecommendation.reason}
                                </em>
                              ) : null}
                            </div>
                            <div className="lpb-review-topic-actions">
                              <span
                                className={`lpb-priority-pill ${allocation.priority}`}
                              >
                                {PRIORITY_COPY[allocation.priority].label}
                              </span>
                              {isRequiredPrerequisite ? (
                                <span className="lpb-required-topic">
                                  Required prerequisite
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => unselectTopic(allocation.topicId)}
                                  aria-label={`Unselect ${allocation.topicName}`}
                                >
                                  <X size={14} />
                                  Unselect
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                </div>

                <footer className="lpb-setup-footer">
                  <button
                    type="button"
                    className="lpb-button lpb-button-secondary"
                    onClick={() => setSetupStep(3)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={() => void buildPlan()}
                    disabled={
                      selectedTopicIds.length === 0 ||
                      contentGenerating ||
                      reviewPlan.capacity.difference > 0
                    }
                  >
                    <CalendarDays size={16} />
                    {reviewPlan.capacity.difference > 0
                      ? "Resolve capacity to build"
                      : contentGenerating
                      ? "Generating AI teaching guides…"
                      : "Build learning plan"}
                  </button>
                </footer>
              </>
            ) : null}
          </section>
        </main>
      ) : (
        <main className="lpb-plan-shell lpb-plan-minimal">
          <section className="lpb-plan-hero lpb-plan-hero-minimal">
            <div className="lpb-plan-student">
              <span className="lpb-avatar">{student.initials}</span>
              <div>
                <h1>{student.name}</h1>
                <p>
                  Grade {student.grade} · v{plan.version} ·{" "}
                  {plan.allocations.length} topics · {plan.capacity.teaching}/
                  {plan.capacity.available} classes
                  {plan.capacity.difference > 0
                    ? ` · ${plan.capacity.difference} over`
                    : ""}
                </p>
              </div>
            </div>
            <div className="lpb-hero-actions">
              <button
                type="button"
                className="lpb-button lpb-button-ghost"
                onClick={returnToSetup}
              >
                Edit scope
              </button>
              <button
                type="button"
                className="lpb-button lpb-button-primary"
                onClick={() => setOutcomeOpen(true)}
                disabled={!nextTeachingItem}
              >
                Record outcome
              </button>
            </div>
          </section>

          {(contentGenerating ||
            persistenceState !== "idle" ||
            plan.warnings.length > 0 ||
            plan.changesFromPrevious.length > 0 ||
            manualOverrideActive) && (
            <div className="lpb-status-strip">
              {persistenceState === "saving" ? (
                <span className="lpb-status-chip generating">
                  <Save size={13} />
                  Saving plan changesâ€¦
                </span>
              ) : null}
              {persistenceState === "saved" ? (
                <span className="lpb-status-chip muted">
                  <CheckCircle2 size={13} />
                  Saved to plan history
                </span>
              ) : null}
              {persistenceState === "error" ? (
                <span className="lpb-status-chip warning">
                  <CircleAlert size={13} />
                  Could not save changes. Try again after editing or recording an outcome.
                </span>
              ) : null}
              {contentGenerating ? (
                <span className="lpb-status-chip generating">
                  <Sparkles size={13} />
                  Writing teaching guides…
                </span>
              ) : null}
              {plan.warnings.map((warning) => (
                <button
                  key={warning.id}
                  type="button"
                  className="lpb-status-chip warning"
                  onClick={returnToSetup}
                >
                  <AlertTriangle size={13} />
                  {warning.title}
                </button>
              ))}
              {plan.changesFromPrevious.length > 0 ? (
                <span className="lpb-status-chip muted">
                  Updated: {plan.changesFromPrevious[0]}
                </span>
              ) : null}
              {manualOverrideActive ? (
                <span className="lpb-status-chip manual">
                  <LockKeyhole size={13} />
                  Manual change recorded — automatic updates paused until the next class data arrives.
                </span>
              ) : null}
            </div>
          )}

          {plan.explanations.length > 0 ? (
            <section className="lpb-plan-ordering" aria-label="Plan order explanation">
              <ListChecks size={17} />
              <div>
                <strong>Why this topic order</strong>
                {plan.explanations.map((explanation) => (
                  <p key={explanation}>{explanation}</p>
                ))}
              </div>
            </section>
          ) : null}

          {plan.changesFromPrevious.length > 0 ? (
            <section className="lpb-plan-changes" aria-label="Changes from previous plan">
              <div className="lpb-plan-changes-head">
                <Clock3 size={16} />
                <div>
                  <span className="lpb-kicker">Plan version {plan.version}</span>
                  <h2>What changed</h2>
                </div>
              </div>
              <ul>
                {plan.changesFromPrevious.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="lpb-plan-grid lpb-plan-grid-minimal">
            <div className="lpb-plan-main">
              <section className="lpb-plan-board lpb-plan-board-minimal">
                <header className="lpb-plan-board-head">
                  <div>
                    <h2>Sequence</h2>
                    <p className="lpb-board-meta">
                      {plan.items.length} classes
                      {nextTeachingItem
                        ? ` · next: ${planItemPrimaryLabel(nextTeachingItem)}`
                        : ""}
                    </p>
                  </div>
                  <div className="lpb-view-tabs">
                    <button
                      type="button"
                      className={planTab === "classes" ? "active" : ""}
                      onClick={() => setPlanTab("classes")}
                    >
                      Classes
                    </button>
                    <button
                      type="button"
                      className={planTab === "topics" ? "active" : ""}
                      onClick={() => setPlanTab("topics")}
                    >
                      Topics
                    </button>
                    <button
                      type="button"
                      className={planTab === "structure" ? "active" : ""}
                      onClick={() => setPlanTab("structure")}
                    >
                      Structure
                    </button>
                    <button
                      type="button"
                      className={planTab === "next2weeks" ? "active" : ""}
                      onClick={() => setPlanTab("next2weeks")}
                    >
                      2 weeks
                    </button>
                    <button
                      type="button"
                      className={planTab === "mentor" ? "active" : ""}
                      onClick={() => setPlanTab("mentor")}
                    >
                      Mentor view
                    </button>
                  </div>
                </header>

                {planTab === "classes" ? (
                  <div className="lpb-class-list">
                    {plan.items.map((item) => {
                      const expanded = expandedItemId === item.id
                      const displayStatus =
                        item.classNumber <= completedCount
                          ? "completed"
                          : item.classNumber === completedCount + 1
                            ? "next"
                            : "planned"
                      return (
                        <article
                          key={item.id}
                          className={`lpb-class-row ${item.kind} ${displayStatus}`}
                        >
                          <button
                            type="button"
                            className="lpb-class-summary"
                            onClick={() =>
                              setExpandedItemId(expanded ? null : item.id)
                            }
                          >
                            <span className="lpb-class-number">
                              {displayStatus === "completed" ? (
                                <Check size={15} />
                              ) : (
                                <>Class {String(item.classNumber).padStart(2, "0")}</>
                              )}
                            </span>
                            <span className="lpb-class-title">
                              <strong>{planItemPrimaryLabel(item)}</strong>
                              <small>{planItemSecondaryLabel(item)}</small>
                            </span>
                            {item.kind === "teaching" ? (
                              <span className="lpb-class-activity-badge">
                                {item.easyActivities + item.practiceActivities} activities
                              </span>
                            ) : null}
                            {displayStatus === "next" ? (
                              <span className="lpb-status-badge next">Next</span>
                            ) : displayStatus === "completed" ? (
                              <span className="lpb-status-badge completed">
                                Done
                              </span>
                            ) : null}
                            {expanded ? (
                              <ChevronDown size={17} />
                            ) : (
                              <ChevronRight size={17} />
                            )}
                          </button>
                          {expanded ? (
                            <div className="lpb-class-detail">
                              {item.kind === "teaching" ? (
                                <ClassLessonGuide
                                  item={item}
                                  student={student}
                                  contentGenerating={contentGenerating}
                                  contentSource={contentSource}
                                />
                              ) : (
                                <div className="lpb-lesson-plan-card">
                                  <div className="lpb-lesson-header">
                                    <BookOpen size={18} />
                                    <div>
                                      <h4>{KIND_COPY[item.kind].label}</h4>
                                      <p>{item.reason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                ) : planTab === "topics" ? (
                  <div className="lpb-allocation-grid">
                    {plan.allocations.map((allocation, index) => (
                      <article
                        className="lpb-allocation-card"
                        key={allocation.topicId}
                      >
                        <div className="lpb-allocation-top">
                          <span className="lpb-allocation-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`lpb-priority-pill ${allocation.priority}`}
                          >
                            {PRIORITY_COPY[allocation.priority].label}
                          </span>
                          {allocation.manuallyEdited ? (
                            <span className="lpb-lock-chip">
                              <LockKeyhole size={11} />
                              Teacher locked
                            </span>
                          ) : null}
                        </div>
                        <h3>{allocation.topicName}</h3>
                        <p>{allocation.reasons.at(-1)}</p>
                        <div className="lpb-allocation-stats">
                          <div>
                            <b>{allocation.classes}</b>
                            <span>classes</span>
                          </div>
                          <div>
                            <b>{allocation.activities}</b>
                            <span>activities</span>
                          </div>
                          <div>
                            <b>
                              {allocation.easyPercent}:
                              {allocation.practicePercent}
                            </b>
                            <span>Easy : Practice</span>
                          </div>
                        </div>
                        <div className="lpb-allocation-actions">
                          <button
                            type="button"
                            onClick={() => setDetailTopicId(allocation.topicId)}
                          >
                            <Eye size={14} />
                            View progression
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(allocation.topicId)}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : planTab === "structure" ? (
                  <div className="lpb-structural-view">
                    <header>
                      <span className="lpb-detail-label">Structural classes</span>
                      <h3>{plan.capacity.structural} of 13 full-package structural classes</h3>
                      <p>Checkpoints assess the preceding block; each is followed by revision, doubts and practice. PTMs keep families aligned.</p>
                    </header>
                    <div className="lpb-structural-list">
                      {structuralItems.map((item) => (
                        <article key={item.id} className={item.kind}>
                          <span>Class {String(item.classNumber).padStart(2, "0")}</span>
                          <div>
                            <strong>{KIND_COPY[item.kind].label}</strong>
                            <p>{item.title} · {item.reason}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : planTab === "next2weeks" ? (
                  <div className="lpb-next2weeks-view">
                    {(() => {
                      const classesPerWeek = student.classesPerWeek ?? 2
                      const twoWeekClassCount = classesPerWeek * 2
                      return (
                        <>
                          <div className="lpb-next2weeks-header">
                            <h3>Descriptive Plan for Next 2 Weeks</h3>
                            <p>
                              Based on {student.name}&rsquo;s schedule of {classesPerWeek} classes/week ({twoWeekClassCount} classes over 2 weeks).
                            </p>
                          </div>

                          {plan.allocations[0] && plan.allocations[0].classes <= 2 ? (
                            <div className="lpb-test-warning-banner">
                              <AlertTriangle size={18} />
                              <div>
                                <strong>Topic Test Scheduled in Next 2 Weeks</strong>
                                <p>
                                  Less than 2 classes remaining for topic &ldquo;{plan.allocations[0].topicName}&rdquo;. A topic test will be conducted in the next 2 weeks to evaluate mastery before transitioning.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          <div className="lpb-next2weeks-list">
                            {plan.items.slice(0, twoWeekClassCount).map((item, idx) => (
                              <div key={item.id} className="lpb-next2weeks-card">
                                <span className="lpb-next2weeks-num">Class {idx + 1}</span>
                                <div style={{ flex: 1 }}>
                                  <h4>{planItemPrimaryLabel(item)}</h4>
                                  <p>{planItemSecondaryLabel(item)}</p>
                                  {item.learningObjectives.length > 0 ? (
                                    <ul className="lpb-next2weeks-los">
                                      {item.learningObjectives.map((lo) => (
                                        <li key={lo.id}>{lo.text}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                                <span className="lpb-next2weeks-badge">
                                  {item.easyActivities + item.practiceActivities} Questions
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="lpb-mentor-view">
                    <section className="lpb-mentor-snapshot">
                      <div>
                        <span>Classes remaining</span>
                        <b>{student.classesRemaining}</b>
                      </div>
                      <div>
                        <span>Topics completed</span>
                        <b>{student.completedTopics.length} of 13</b>
                      </div>
                      <div>
                        <span>Current topic</span>
                        <b>{mentorTopic?.topicName ?? "No topic selected"}</b>
                      </div>
                      <div>
                        <span>Structural classes</span>
                        <b>{plan.capacity.structural} planned</b>
                      </div>
                    </section>

                    <section className="lpb-mentor-timeline">
                      <span className="lpb-detail-label">Plan at a glance</span>
                      <div>
                        {student.completedTopics.map((completed) => (
                          <span className="done" key={completed.topicId}>
                            {topicById.get(completed.topicId)?.name}
                          </span>
                        ))}
                        {plan.allocations.map((allocation) => (
                          <span
                            className={allocation.topicId === mentorTopic?.topicId ? "current" : ""}
                            key={allocation.topicId}
                          >
                            {allocation.topicName} ({allocation.classes})
                          </span>
                        ))}
                        {structuralItems.filter((item) => item.kind === "checkpoint").map((item) => (
                          <span className="checkpoint" key={item.id}>{item.title}</span>
                        ))}
                      </div>
                    </section>

                    <section className="lpb-mentor-diagnosis">
                      <div className="lpb-mentor-section-head">
                        <div>
                          <span className="lpb-detail-label">Question-level diagnosis</span>
                          <h3>{mentorTopic?.topicName ?? "Selected topic"}</h3>
                        </div>
                        {mentorTopic ? (
                          <button type="button" onClick={() => startEdit(mentorTopic.topicId)}>
                            <SlidersHorizontal size={14} /> Adjust classes
                          </button>
                        ) : null}
                      </div>
                      {mentorTopic ? (
                        <div className="lpb-mentor-table-wrap">
                          {isNewStudent ? (
                            <p className="lpb-mentor-guidance">Starter and Master questions are shown as teaching guidance because this student has no attempt data yet.</p>
                          ) : null}
                          <table>
                            <thead><tr><th>Learning objective</th>{!isNewStudent ? <th>Level</th> : null}<th>Starter question</th><th>Master question</th></tr></thead>
                            <tbody>
                              {mentorTopic.learningObjectives.map((objective) => {
                                const guideline = questionGuidelines.find((item) => item.learningObjectiveId === objective.id)
                                const level = mentorObjectiveLevels.get(objective.id) ?? "not_attempted"
                                return <tr key={objective.id}>
                                  <td>{objective.text}</td>
                                  {!isNewStudent ? <td><span className={`lpb-diagnosis-pill ${level === "master" ? "secure" : level === "stuck" ? "support" : "neutral"}`}>{mentorLevelCopy(level)}</span></td> : null}
                                  <td>{guideline?.starter ?? "No supplied question"}</td>
                                  <td>{guideline?.master ?? "No supplied question"}</td>
                                </tr>
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </section>

                    {mentorTopic ? (
                      <section className="lpb-mentor-next">
                        <Lightbulb size={18} />
                        <div><span className="lpb-detail-label">What to fix in upcoming classes</span><p>{mentorFixText}</p></div>
                      </section>
                    ) : null}
                  </div>
                )}
              </section>

              {plan.droppedTopics.length > 0 ? (
                <section className="lpb-dropped-minimal">
                  <span className="lpb-detail-label">
                    Not scheduled · {plan.droppedTopics.length}
                  </span>
                  <div className="lpb-dropped-list">
                    {plan.droppedTopics.map((topic) => (
                      <article
                        key={topic.topicId}
                      >
                        <div>
                          <strong>{topic.topicName}</strong>
                          <span className={`lpb-priority-pill ${topic.priority}`}>
                            {PRIORITY_COPY[topic.priority].label}
                          </span>
                        </div>
                        <p>{topic.reason}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </main>
      )}

      {activeEditAllocation && editDraft ? (
        <div
          className="lpb-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingTopicId(null)
              setEditDraft(null)
            }
          }}
        >
          <aside className="lpb-drawer" aria-label="Edit topic allocation">
            <header>
              <div>
                <span className="lpb-kicker">Teacher override</span>
                <h2>Edit {activeEditAllocation.topicName}</h2>
                <p>
                  Preview the new capacity after saving. This override will be
                  locked into the next plan version.
                </p>
              </div>
              <button
                type="button"
                className="lpb-icon-button"
                onClick={() => {
                  setEditingTopicId(null)
                  setEditDraft(null)
                }}
                aria-label="Close edit panel"
              >
                <X size={18} />
              </button>
            </header>

            <div className="lpb-edit-form">
              <div className="lpb-edit-field">
                <span>
                  Classes
                  <small>
                    Workbook ideal: {activeEditAllocation.idealClasses}
                  </small>
                </span>
                <div className="lpb-step-input">
                  <button
                    type="button"
                    onClick={() =>
                      setEditDraft((current) =>
                        current
                          ? {
                              ...current,
                              classes: Math.max(1, current.classes - 1),
                            }
                          : current
                      )
                    }
                  >
                    −
                  </button>
                  <b>{editDraft.classes}</b>
                  <button
                    type="button"
                    onClick={() =>
                      setEditDraft((current) =>
                        current
                          ? { ...current, classes: current.classes + 1 }
                          : current
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <label>
                <span>
                  Activities
                  <small>Current: {activeEditAllocation.activities}</small>
                </span>
                <input
                  type="number"
                  min={0}
                  value={editDraft.activities}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current
                        ? {
                            ...current,
                            activities: Number(event.target.value),
                          }
                        : current
                    )
                  }
                />
              </label>

              <label className="lpb-split-field">
                <span>
                  Activity split
                  <small>
                    {editDraft.easyPercent}% Easy ·{" "}
                    {100 - editDraft.easyPercent}% Practice
                  </small>
                </span>
                <input
                  type="range"
                  min={30}
                  max={80}
                  step={5}
                  value={editDraft.easyPercent}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current
                        ? {
                            ...current,
                            easyPercent: Number(event.target.value),
                          }
                        : current
                    )
                  }
                />
                <div>
                  <span>More Practice</span>
                  <span>More Easy</span>
                </div>
              </label>
            </div>

            <div className="lpb-edit-impact">
              <span className="lpb-kicker">Impact preview</span>
              <div>
                <span>
                  Current plan
                  <b>{plan?.capacity.total}</b>
                </span>
                <ArrowRight size={16} />
                <span>
                  After edit
                  <b>
                    {(plan?.capacity.total ?? 0) -
                      activeEditAllocation.classes +
                      editDraft.classes}
                  </b>
                </span>
              </div>
              {(plan?.capacity.total ?? 0) -
                activeEditAllocation.classes +
                editDraft.classes >
              student.classesRemaining ? (
                <p>
                  <AlertTriangle size={15} />
                  The over-capacity warning will remain visible.
                </p>
              ) : (
                <p className="fits">
                  <Check size={15} />
                  This edit fits within the available capacity.
                </p>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="lpb-button lpb-button-secondary"
                onClick={() => {
                  setEditingTopicId(null)
                  setEditDraft(null)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lpb-button lpb-button-primary"
                onClick={saveTopicEdit}
                disabled={editWouldExceedCapacity}
              >
                <Save size={15} />
                {editWouldExceedCapacity
                  ? "Reduce classes to save"
                  : "Save new version"}
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {activeDetailTopic ? (
        <div
          className="lpb-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailTopicId(null)
          }}
        >
          <section className="lpb-detail-modal">
            <header>
              <div>
                <span className="lpb-kicker">Detailed Plan Viewer</span>
                <h2>{activeDetailTopic.name}</h2>
                <p>
                  Starter-to-Master question guidance for each learning
                  objective.
                </p>
              </div>
              <button
                type="button"
                className="lpb-icon-button"
                onClick={() => setDetailTopicId(null)}
                aria-label="Close detailed plan viewer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="lpb-progression-key">
              <span>
                <i className="starter" /> Starter: familiar, single-step
              </span>
              <span>
                <i className="master" /> Master: new context, multi-step
              </span>
              <span>
                <i className="evidence" /> Current activity evidence
              </span>
            </div>

            {student.objectiveEvidence.length > 0 &&
            activeDetailTopic.id === student.currentTopicId ? (
              <div className="lpb-mentor-focus-box">
                <Lightbulb size={18} />
                <div>
                  <strong>Mentor Teaching Focus (Activity Evidence)</strong>
                  <p>
                    Student solves Starter-level HCF & LCM questions correctly, but gets Master-level word problems wrong on &ldquo;Apply HCF and LCM to real-world problems&rdquo; and factor trees. Next classes should focus on applying HCF/LCM to real-world word problems and index notation.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="lpb-objective-list">
              {activeDetailTopic.learningObjectives.map(
                (learningObjective, index) => {
                  const guideline = questionGuidelines.find(
                    (item) => item.learningObjectiveId === learningObjective.id
                  )
                  const evidence = student.objectiveEvidence.find(
                    (item) => item.learningObjectiveId === learningObjective.id
                  )
                  return (
                    <article key={learningObjective.id}>
                      <div className="lpb-objective-head">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <small>{learningObjective.subtopic}</small>
                          <h3>{learningObjective.text}</h3>
                        </div>
                        {evidence ? (
                          <span
                            className={`lpb-current-level ${evidence.result}`}
                          >
                            {evidence.result === "secure"
                              ? "Secure at Starter"
                              : "Not secure at Master"}
                          </span>
                        ) : (
                          <span className="lpb-current-level no-data">
                            No activity evidence
                          </span>
                        )}
                      </div>

                      {guideline ? (
                        <div className="lpb-question-pair">
                          <div>
                            <span>Starter question</span>
                            <p>{guideline.starter}</p>
                          </div>
                          <span className="lpb-question-arrow">
                            <ArrowRight size={17} />
                          </span>
                          <div>
                            <span>Master question</span>
                            <p>{guideline.master}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="lpb-no-guideline">
                          <FileText size={16} />A Starter/Master question pair
                          was not supplied for this objective in the dummy
                          workbook.
                        </div>
                      )}

                      {evidence ? (
                        <div
                          className={`lpb-evidence-callout ${evidence.result}`}
                        >
                          {evidence.result === "secure" ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <CircleAlert size={16} />
                          )}
                          <div>
                            <span>Current evidence</span>
                            <p>{evidence.note}</p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )
                }
              )}
            </div>

            <footer>
              <span className="lpb-modal-lock-note">
                <LockKeyhole size={14} />
                <span>Questions are workbook samples—no live generation.</span>
              </span>
              <button
                type="button"
                className="lpb-button lpb-button-primary"
                onClick={() => setDetailTopicId(null)}
              >
                Done
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {outcomeOpen && nextTeachingItem ? (
        <div
          className="lpb-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOutcomeOpen(false)
              setPendingUpdate(null)
            }
          }}
        >
          <section className="lpb-outcome-modal">
            <header>
              <div>
                <span className="lpb-kicker">
                  After Class {nextTeachingItem.classNumber}
                </span>
                <h2>
                  {pendingUpdate
                    ? "Review the plan update"
                    : "How did the class go?"}
                </h2>
                <p>
                  {pendingUpdate
                    ? "Nothing changes until the teacher approves this version."
                    : planItemPrimaryLabel(nextTeachingItem)}
                </p>
              </div>
              <button
                type="button"
                className="lpb-icon-button"
                onClick={() => {
                  setOutcomeOpen(false)
                  setPendingUpdate(null)
                }}
                aria-label="Close class outcome"
              >
                <X size={18} />
              </button>
            </header>

            {pendingUpdate ? (
              <>
                <div className="lpb-update-comparison">
                  <div>
                    <span>Current plan</span>
                    <b>{plan?.capacity.total} classes</b>
                    <small>Version {plan?.version}</small>
                  </div>
                  <ArrowRight size={20} />
                  <div>
                    <span>Proposed plan</span>
                    <b>{pendingUpdate.plan.capacity.total} classes</b>
                    <small>Version {pendingUpdate.plan.version}</small>
                  </div>
                </div>
                <div className="lpb-update-list">
                  {pendingUpdate.changes.map((change) => (
                    <div key={change}>
                      <Check size={14} />
                      <span>{change}</span>
                    </div>
                  ))}
                </div>
                {pendingUpdate.plan.capacity.difference > 0 ? (
                  <div className="lpb-inline-warning">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>
                        The updated plan is{" "}
                        {pendingUpdate.plan.capacity.difference} classes over
                        capacity.
                      </strong>
                      <span>The warning will stay visible after approval.</span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="lpb-outcome-options">
                  <button
                    type="button"
                    className={outcome === "faster" ? "selected" : ""}
                    onClick={() => setOutcome("faster")}
                  >
                    <TrendingUp size={20} />
                    <strong>Completed faster</strong>
                    <span>Return one class to the pool</span>
                  </button>
                  <button
                    type="button"
                    className={outcome === "on-track" ? "selected" : ""}
                    onClick={() => setOutcome("on-track")}
                  >
                    <CheckCircle2 size={20} />
                    <strong>On track</strong>
                    <span>Keep the approved allocation</span>
                  </button>
                  <button
                    type="button"
                    className={outcome === "needs-time" ? "selected" : ""}
                    onClick={() => setOutcome("needs-time")}
                  >
                    <Clock3 size={20} />
                    <strong>Needs more time</strong>
                    <span>Add reinforcement, up to +2</span>
                  </button>
                </div>
                <label className="lpb-note-field">
                  <span>
                    Optional teacher note
                    <small>Saved as evidence; not interpreted by AI</small>
                  </span>
                  <textarea
                    value={outcomeNote}
                    onChange={(event) => setOutcomeNote(event.target.value)}
                    placeholder="What did the student understand or struggle with?"
                    rows={4}
                  />
                </label>
              </>
            )}

            <footer>
              {pendingUpdate ? (
                <>
                  <button
                    type="button"
                    className="lpb-button lpb-button-secondary"
                    onClick={() => setPendingUpdate(null)}
                  >
                    <ArrowLeft size={15} />
                    Change outcome
                  </button>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={approveClassOutcome}
                  >
                    <Check size={15} />
                    Approve version {pendingUpdate.plan.version}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="lpb-button lpb-button-secondary"
                    onClick={() => setOutcomeOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={previewClassOutcome}
                  >
                    Preview plan update
                    <ArrowRight size={15} />
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  )
}
