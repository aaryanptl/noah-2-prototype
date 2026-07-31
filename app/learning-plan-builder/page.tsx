"use client"

import {
  buildLearningPlan,
  getAiAssistedTopicSuggestion,
  getSuggestedTopicIds,
} from "@/lib/learning-plan/engine"
import type {
  ClassOutcome,
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

function prioritySort(priority: Priority) {
  if (priority === "high") return 0
  if (priority === "medium") return 1
  return 2
}

function findNextTeachingItem(items: PlanItem[], completedCount: number) {
  return items.find(
    (item) => item.classNumber > completedCount && item.kind === "teaching"
  )
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

function sortTopicsForDisplay(topics: CurriculumTopic[], student: DemoStudent) {
  if (!student.parentRequestedTopicId) {
    return [...topics].sort(
      (a, b) => prioritySort(a.priority) - prioritySort(b.priority) || a.sequence - b.sequence
    )
  }

  const requestedId = student.parentRequestedTopicId
  const topicMap = new Map(topics.map((t) => [t.id, t]))
  const prereqChain = getPrerequisiteChainLocal(requestedId, topicMap)
  const frontIds = new Set([...prereqChain, requestedId])

  const prereqTopics = prereqChain
    .map((id) => topicMap.get(id))
    .filter((t): t is CurriculumTopic => Boolean(t))
  const requestedTopic = topicMap.get(requestedId)
  const remainingTopics = topics
    .filter((t) => !frontIds.has(t.id))
    .sort(
      (a, b) => prioritySort(a.priority) - prioritySort(b.priority) || a.sequence - b.sequence
    )

  return [
    ...prereqTopics,
    ...(requestedTopic ? [requestedTopic] : []),
    ...remainingTopics,
  ]
}

export default function LearningPlanBuilderPage() {
  const [student, setStudent] = useState<DemoStudent>(demoStudents[0])
  const [setupStep, setSetupStep] = useState(1)
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>(() =>
    getSuggestedTopicIds(curriculumTopics, demoStudents[0])
  )
  const [scopeMode, setScopeMode] = useState<"manual" | "ai">("manual")
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustments>(
    {}
  )
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [planTab, setPlanTab] = useState<"classes" | "topics" | "next2weeks">("classes")
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
  const requiredHighTopicIds = useMemo(
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
        manualAdjustments,
        version: plan?.version ?? 1,
      }),
    [manualAdjustments, plan?.version, selectedTopicIds, student]
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

  const activeDetailTopic =
    detailTopicId === null ? null : topicById.get(detailTopicId)
  const activeEditAllocation =
    editingTopicId === null
      ? null
      : plan?.allocations.find(
          (allocation) => allocation.topicId === editingTopicId
        )
  const nextTeachingItem = plan
    ? findNextTeachingItem(plan.items, completedCount)
    : undefined

  const chooseStudent = (nextStudent: DemoStudent) => {
    setStudent(nextStudent)
    setSelectedTopicIds(getSuggestedTopicIds(curriculumTopics, nextStudent))
    setScopeMode("manual")
    setManualAdjustments({})
    setPlan(null)
    setSetupStep(1)
    setPlanTab("classes")
    setCompletedCount(0)
    setExpandedItemId(null)
    setDetailTopicId(null)
    setEditingTopicId(null)
    setPendingUpdate(null)
  }

  const toggleTopic = (topicId: number) => {
    if (topicById.get(topicId)?.priority === "high") return
    setSelectedTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId]
    )
  }

  const applyAiPlan = () => {
    setScopeMode("ai")
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
      })
      .catch((err) => console.error("AI Plan error:", err))
      .finally(() => setAiLoading(false))
  }

  const unselectAiSkippableTopics = () => {
    setSelectedTopicIds((current) =>
      current.filter((topicId) => !aiSkippableSet.has(topicId))
    )
    setScopeMode("ai")
  }

  const unselectTopic = (topicId: number) => {
    if (topicById.get(topicId)?.priority === "high") return
    setSelectedTopicIds((current) =>
      current.filter((selectedId) => selectedId !== topicId)
    )
  }

  const buildPlan = () => {
    setPlan(
      buildLearningPlan({
        topics: curriculumTopics,
        student,
        selectedTopicIds,
        manualAdjustments,
        version: 1,
        changesFromPrevious:
          student.scenario === "C"
            ? [
                "Removed completed Number Sense and Multi-Digit Operations topic blocks.",
                "Refitted the remaining topics into the new 24-class window.",
              ]
            : [],
      })
    )
    setCompletedCount(0)
    setPlanTab("classes")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const returnToSetup = () => {
    setPlan(null)
    setSetupStep(4)
    setCompletedCount(0)
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
    setPlan(
      buildLearningPlan({
        topics: curriculumTopics,
        student,
        selectedTopicIds,
        manualAdjustments: nextAdjustments,
        version: plan.version + 1,
        changesFromPrevious: changes,
      })
    )
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
    const nextPlan = buildLearningPlan({
      topics: curriculumTopics,
      student,
      selectedTopicIds,
      manualAdjustments: nextAdjustments,
      version: plan.version + 1,
      changesFromPrevious: changes,
    })

    setPendingUpdate({
      plan: nextPlan,
      adjustments: nextAdjustments,
      changes,
    })
  }

  const approveClassOutcome = () => {
    if (!pendingUpdate) return
    setPlan(pendingUpdate.plan)
    setManualAdjustments(pendingUpdate.adjustments)
    setCompletedCount((current) => current + 1)
    setPendingUpdate(null)
    setOutcomeOpen(false)
    setOutcome("on-track")
    setOutcomeNote("")
  }

  const resetPrototype = () => chooseStudent(demoStudents[0])

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
                    const selected = candidate.id === student.id
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

                <footer className="lpb-setup-footer">
                  <span>
                    <FileText size={15} />
                    All information on this page is prototype dummy data.
                  </span>
                  <button
                    type="button"
                    className="lpb-button lpb-button-primary"
                    onClick={() => setSetupStep(2)}
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
                      <Lightbulb size={20} />
                      <span>Rule preview</span>
                      <h3>What will change?</h3>
                      <ul>
                        <li>
                          Scores below 40% keep the full allocation and receive
                          more Practice activities.
                        </li>
                        <li>
                          Scores of 75% or more shorten the topic and add Easy
                          consolidation.
                        </li>
                        <li>
                          Mid-range scores keep the ideal workbook values.
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
                      <span>66 teaching classes</span>
                      <span>242 activities</span>
                    </div>
                  </div>
                ) : null}

                {student.scenario === "C" ? (
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
                            if (plan !== null) {
                              const currentPlan = plan as GeneratedPlan
                              setPlan(
                                buildLearningPlan({
                                  topics: curriculumTopics,
                                  student: updatedStudent,
                                  selectedTopicIds: newSuggested,
                                  manualAdjustments,
                                  version: currentPlan.version + 1,
                                  changesFromPrevious: [
                                    `Parent requested starting topic changed to: ${topicById.get(newTopicId)?.name ?? "selected topic"}.`,
                                    "Prerequisite refreshers re-scheduled before the requested topic.",
                                  ],
                                })
                              )
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
                <header className="lpb-section-head">
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
                      <strong>Plan manually</strong>
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
                    className={`lpb-planning-mode ai${scopeMode === "ai" ? " active" : ""}`}
                    onClick={applyAiPlan}
                  >
                    <span className="lpb-mode-icon ai">
                      <Sparkles size={20} />
                    </span>
                    <span>
                      <strong>Plan with AI</strong>
                      <small>
                        Analyze placement, mastery, completed work and capacity,
                        keep every High topic, and suggest a teacher-editable
                        scope.
                      </small>
                    </span>
                    <span className="lpb-mode-action">
                      {scopeMode === "ai" ? "Applied" : "Use suggestion"}
                    </span>
                  </button>
                </div>

                {scopeMode === "ai" ? (
                  <section className="lpb-ai-scope-summary">
                    <div className="lpb-ai-summary-head">
                      <span>
                        <Sparkles size={16} />
                        AI-assisted scope
                      </span>
                      <strong>
                        {plural(aiSuggestion.skippableTopicIds.length, "topic")}{" "}
                        can be skipped
                      </strong>
                    </div>
                    <p>
                      The suggestion used the supplied prototype evidence. You
                      can edit optional topics, while High-priority topics stay
                      locked in the plan.
                    </p>
                    <div className="lpb-ai-evidence">
                      {aiSuggestion.evidenceSummary.map((summary) => (
                        <span key={summary}>
                          <CheckCircle2 size={13} />
                          {summary}
                        </span>
                      ))}
                    </div>
                  </section>
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
                        setSelectedTopicIds(requiredHighTopicIds)
                      }}
                    >
                      Clear optional
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScopeMode("manual")
                        setSelectedTopicIds(suggestedTopicIds)
                      }}
                    >
                      Restore recommended
                    </button>
                  </div>
                </div>

                <div className="lpb-topic-list">
                  {sortTopicsForDisplay(curriculumTopics, student).map((topic) => {
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
                      const aiReduced =
                        scopeMode === "ai" &&
                        selected &&
                        previewAllocation !== undefined &&
                        (previewAllocation.classes < topic.idealClasses ||
                          previewAllocation.activities < topic.idealActivities)
                      return (
                        <button
                          type="button"
                          key={topic.id}
                          disabled={completed}
                          aria-disabled={completed || topic.priority === "high"}
                          className={`lpb-topic-option${selected ? " selected" : ""}${completed ? " completed" : ""}${topic.priority === "high" ? " locked" : ""}`}
                          onClick={() => toggleTopic(topic.id)}
                        >
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
                              {scopeMode === "ai" && previewAllocation
                                ? previewAllocation.classes
                                : topic.idealClasses}
                            </b>
                            <small>
                              {aiReduced
                                ? `of ${topic.idealClasses} classes`
                                : "classes"}
                            </small>
                          </span>
                          <span className="lpb-topic-metrics">
                            <b>
                              {scopeMode === "ai" && previewAllocation
                                ? previewAllocation.activities
                                : topic.idealActivities}
                            </b>
                            <small>
                              {aiReduced
                                ? `of ${topic.idealActivities} activities`
                                : "activities"}
                            </small>
                          </span>
                          <span className="lpb-topic-state">
                            {completed ? (
                              "Completed"
                            ) : topic.priority === "high" ? (
                              <>
                                <LockKeyhole size={12} />
                                {aiReduced ? "AI reduced" : "Required"}
                              </>
                            ) : scopeMode === "ai" &&
                              aiRecommendation?.decision === "skip" ? (
                              "AI suggests skip"
                            ) : scopeMode === "ai" && selected ? (
                              "AI suggested"
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
                            {scopeMode === "ai"
                              ? "AI never removes High-priority topics. It only removes Medium or Low topics supported by strong skip evidence; the teacher can adjust optional topics or keep this warning."
                              : "Unselect topics or adjust allocations. The warning remains visible if the teacher keeps the larger plan."}
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
                          curriculum order
                        </p>
                      </div>
                    </div>
                    <div className="lpb-review-topic-list">
                      {reviewPlan.allocations.map((allocation, index) => {
                        const aiRecommendation = aiRecommendationById.get(
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
                              {scopeMode === "ai" && aiRecommendation ? (
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
                              {allocation.priority === "high" ? (
                                <span className="lpb-required-topic">
                                  <LockKeyhole size={12} />
                                  Required
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    unselectTopic(allocation.topicId)
                                  }
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
                    onClick={buildPlan}
                    disabled={selectedTopicIds.length === 0}
                  >
                    <CalendarDays size={16} />
                    Build learning plan
                  </button>
                </footer>
              </>
            ) : null}
          </section>
        </main>
      ) : (
        <main className="lpb-plan-shell">
          <section className="lpb-plan-hero">
            <div className="lpb-plan-student">
              <span className="lpb-avatar lpb-avatar-large">
                {student.initials}
              </span>
              <div>
                <span className="lpb-kicker">
                  Grade {student.grade} · United States · Version {plan.version}
                </span>
                <h1>{student.name}’s learning plan</h1>
                <p>
                  {plan.allocations.length} topics · {plan.capacity.teaching}{" "}
                  teaching classes · {plan.capacity.structural} structural
                  classes
                </p>
              </div>
            </div>
            <div className="lpb-hero-actions">
              <button
                type="button"
                className="lpb-button lpb-button-secondary"
                onClick={returnToSetup}
              >
                <SlidersHorizontal size={15} />
                Edit scope
              </button>
              <button
                type="button"
                className="lpb-button lpb-button-primary"
                onClick={() => setOutcomeOpen(true)}
                disabled={!nextTeachingItem}
              >
                <ClipboardCheck size={16} />
                Record class outcome
              </button>
            </div>
          </section>

          {plan.warnings.map((warning) => (
            <section className="lpb-plan-warning" key={warning.id}>
              <span>
                <AlertTriangle size={20} />
              </span>
              <div>
                <strong>{warning.title}</strong>
                <p>{warning.message}</p>
              </div>
              <button type="button" onClick={returnToSetup}>
                Review scope
                <ArrowRight size={14} />
              </button>
            </section>
          ))}

          {plan.changesFromPrevious.length > 0 ? (
            <section className="lpb-change-banner">
              <span className="lpb-change-icon">
                <RotateCcw size={18} />
              </span>
              <div>
                <strong>What changed in version {plan.version}</strong>
                <ul>
                  {plan.changesFromPrevious.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <div className="lpb-plan-grid">
            <div className="lpb-plan-main">
              {nextTeachingItem ? (
                <section className="lpb-next-card">
                  <div className="lpb-next-top">
                    <span className="lpb-next-kicker">
                      <span />
                      Next teaching class
                    </span>
                    <span className="lpb-mono">
                      Class {nextTeachingItem.classNumber} of{" "}
                      {plan.items.length}
                    </span>
                  </div>
                  <div className="lpb-next-body">
                    <div>
                      <span
                        className={`lpb-priority-pill ${nextTeachingItem.priority}`}
                      >
                        {nextTeachingItem.priority
                          ? PRIORITY_COPY[nextTeachingItem.priority].label
                          : ""}
                      </span>
                      <h2>{nextTeachingItem.title}</h2>
                      <p>{nextTeachingItem.subtitle}</p>
                    </div>
                    <div className="lpb-next-metrics">
                      <div>
                        <BookOpen size={17} />
                        <span>
                          <b>{nextTeachingItem.learningObjectives.length}</b>
                          objectives
                        </span>
                      </div>
                      <div>
                        <CheckCircle2 size={17} />
                        <span>
                          <b>{nextTeachingItem.easyActivities}</b>
                          Easy
                        </span>
                      </div>
                      <div>
                        <Target size={17} />
                        <span>
                          <b>{nextTeachingItem.practiceActivities}</b>
                          Practice
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="lpb-next-reason">
                    <Lightbulb size={17} />
                    <div>
                      <span>Why this class now</span>
                      <p>{nextTeachingItem.reason}</p>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="lpb-plan-board">
                <header className="lpb-plan-board-head">
                  <div>
                    <span className="lpb-kicker">Approved sequence</span>
                    <h2>Class-by-class plan</h2>
                  </div>
                  <div className="lpb-view-tabs">
                    <button
                      type="button"
                      className={planTab === "classes" ? "active" : ""}
                      onClick={() => setPlanTab("classes")}
                    >
                      <CalendarDays size={15} />
                      Classes
                    </button>
                    <button
                      type="button"
                      className={planTab === "topics" ? "active" : ""}
                      onClick={() => setPlanTab("topics")}
                    >
                      <Layers3 size={15} />
                      Topics
                    </button>
                    <button
                      type="button"
                      className={planTab === "next2weeks" ? "active" : ""}
                      onClick={() => setPlanTab("next2weeks")}
                    >
                      <Clock3 size={15} />
                      Next 2 Weeks
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
                                String(item.classNumber).padStart(2, "0")
                              )}
                            </span>
                            <span className="lpb-class-kind">
                              {KIND_COPY[item.kind].short}
                            </span>
                            <span className="lpb-class-title">
                              <strong>{item.title}</strong>
                              <small>{item.subtitle}</small>
                            </span>
                            {item.priority ? (
                              <span
                                className={`lpb-priority-pill ${item.priority}`}
                              >
                                {PRIORITY_COPY[item.priority].label}
                              </span>
                            ) : null}
                            <span className="lpb-class-activity">
                              {item.kind === "teaching"
                                ? `${item.easyActivities + item.practiceActivities} activities`
                                : "Structural"}
                            </span>
                            <span
                              className={`lpb-status-badge ${displayStatus}`}
                            >
                              {displayStatus === "completed"
                                ? "Completed"
                                : displayStatus === "next"
                                  ? "Next"
                                  : "Planned"}
                            </span>
                            {expanded ? (
                              <ChevronDown size={17} />
                            ) : (
                              <ChevronRight size={17} />
                            )}
                          </button>
                          {expanded ? (
                            <div className="lpb-class-detail">
                              <div className="lpb-lesson-plan-card">
                                <div className="lpb-lesson-header">
                                  <BookOpen size={18} />
                                  <div>
                                    <h4>Class Lesson Plan & Teaching Guide</h4>
                                    <p>Goal: Master {item.title} through structured instruction, guided practice, and application.</p>
                                  </div>
                                </div>

                                <div className="lpb-lesson-grid">
                                  <div className="lpb-lesson-col">
                                    <span className="lpb-detail-label">
                                      <Target size={14} />
                                      What to Teach & Learning Objectives
                                    </span>
                                    {item.learningObjectives.length > 0 ? (
                                      <ul className="lpb-lesson-bullets">
                                        {item.learningObjectives.map((objective) => (
                                          <li key={objective.id}>
                                            <strong>{objective.subtopic ? `${objective.subtopic}: ` : ""}</strong>
                                            {objective.text}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="lpb-muted-text">Standard teaching session.</p>
                                    )}

                                    <span className="lpb-detail-label" style={{ marginTop: "14px" }}>
                                      <Lightbulb size={14} />
                                      Key Teaching Points for Mentor
                                    </span>
                                    <ul className="lpb-lesson-bullets points">
                                      <li>Introduce core vocabulary and demonstrate 2 worked examples.</li>
                                      <li>Guide student through single-step starter questions with instant feedback.</li>
                                      <li>Challenge student with multi-step master application questions before closing.</li>
                                    </ul>
                                  </div>

                                  <div className="lpb-lesson-col">
                                    <span className="lpb-detail-label">
                                      <CheckCircle2 size={14} />
                                      Success Criteria
                                    </span>
                                    <p className="lpb-success-box">
                                      Student solves Starter questions with &ge;80% accuracy and attempts Master-level word problems confidently.
                                    </p>

                                    <span className="lpb-detail-label" style={{ marginTop: "14px" }}>
                                      <FileText size={14} />
                                      Placement & Planning Rationale
                                    </span>
                                    <p className="lpb-rationale-text">{item.reason}</p>
                                  </div>
                                </div>

                                {item.learningObjectives.length > 0 ? (
                                  <div className="lpb-assigned-questions-box">
                                    <span className="lpb-detail-label">
                                      <ListChecks size={15} />
                                      Assigned Questions & Practice Activities ({item.easyActivities + item.practiceActivities} total activities)
                                    </span>
                                    <div className="lpb-question-cards">
                                      {item.learningObjectives.map((obj) => {
                                        const guideline = questionGuidelines.find(
                                          (g) => g.learningObjectiveId === obj.id || g.topicId === item.topicId
                                        )
                                        return (
                                          <div key={obj.id} className="lpb-question-card">
                                            <span className="lpb-question-objective">
                                              {obj.subtopic ? `${obj.subtopic} · ` : ""}{obj.text}
                                            </span>
                                            {guideline ? (
                                              <div className="lpb-question-pairs">
                                                {guideline.starter ? (
                                                  <div className="lpb-question-item">
                                                    <span className="lpb-q-badge starter">Starter Q</span>
                                                    <p>{guideline.starter}</p>
                                                  </div>
                                                ) : null}
                                                {guideline.master ? (
                                                  <div className="lpb-question-item">
                                                    <span className="lpb-q-badge master">Master Q</span>
                                                    <p>{guideline.master}</p>
                                                  </div>
                                                ) : null}
                                              </div>
                                            ) : (
                                              <div className="lpb-question-pairs">
                                                <div className="lpb-question-item">
                                                  <span className="lpb-q-badge starter">Practice Q</span>
                                                  <p>Guided problem-solving exercises for {obj.text}.</p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
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
                ) : (
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
                                  <h4>{item.title}</h4>
                                  <p>{item.subtitle}</p>
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
                )}
              </section>
            </div>

            <aside className="lpb-plan-side">
              <section className="lpb-side-card lpb-side-capacity">
                <div className="lpb-side-card-head">
                  <div>
                    <span className="lpb-kicker">Plan capacity</span>
                    <h3>
                      {plan.capacity.total} / {plan.capacity.available}
                    </h3>
                  </div>
                  <Gauge size={22} />
                </div>
                <div className="lpb-capacity-bar">
                  <span
                    className={plan.capacity.difference > 0 ? "over" : ""}
                    style={{
                      width: `${Math.min(
                        100,
                        (plan.capacity.total / plan.capacity.available) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="lpb-side-capacity-grid">
                  <span>
                    <b>{plan.capacity.teaching}</b> teaching
                  </span>
                  <span>
                    <b>{plan.capacity.structural}</b> structural
                  </span>
                  <span>
                    <b>{plan.capacity.available}</b> available
                  </span>
                  <span className={plan.capacity.difference > 0 ? "over" : ""}>
                    <b>{Math.abs(plan.capacity.difference)}</b>{" "}
                    {plan.capacity.difference > 0 ? "over" : "free"}
                  </span>
                </div>
              </section>

              <section className="lpb-side-card">
                <div className="lpb-side-card-head">
                  <div>
                    <span className="lpb-kicker">Not scheduled</span>
                    <h3>{plan.droppedTopics.length} topics</h3>
                  </div>
                  <CircleAlert size={21} />
                </div>
                <div className="lpb-dropped-list">
                  {plan.droppedTopics.length > 0 ? (
                    plan.droppedTopics.map((topic) => (
                      <div key={topic.topicId}>
                        <span
                          className={`lpb-priority-dot ${topic.priority}`}
                        />
                        <div>
                          <strong>{topic.topicName}</strong>
                          <p>{topic.reason}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="lpb-side-empty">
                      Every available curriculum topic is included.
                    </p>
                  )}
                </div>
              </section>

              <section className="lpb-side-card">
                <div className="lpb-side-card-head">
                  <div>
                    <span className="lpb-kicker">Plan logic</span>
                    <h3>Why this plan?</h3>
                  </div>
                  <Lightbulb size={21} />
                </div>
                <ol className="lpb-logic-list">
                  {plan.explanations.map((explanation, index) => (
                    <li key={explanation}>
                      <span>{index + 1}</span>
                      <p>{explanation}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </aside>
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
              >
                <Save size={15} />
                Save new version
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
                    : nextTeachingItem.title}
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
