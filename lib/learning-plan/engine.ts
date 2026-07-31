import type {
  AiPlanSuggestion,
  AiTopicRecommendation,
  CurriculumTopic,
  DemoStudent,
  DroppedTopic,
  GeneratedPlan,
  LearningObjective,
  ManualAdjustments,
  PlanItem,
  PlanTopicAllocation,
  PlanWarning,
  Priority,
} from "./types"

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const CHECKPOINT_LABELS = [
  "Foundation checkpoint",
  "Progress checkpoint",
  "Mid-plan checkpoint",
  "Application checkpoint",
  "Final checkpoint",
]

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getTopicMap(topics: CurriculumTopic[]) {
  return new Map(topics.map((topic) => [topic.id, topic]))
}

function getCompletedTopicIds(student: DemoStudent) {
  return new Set(student.completedTopics.map((topic) => topic.topicId))
}

function getPlacementScore(student: DemoStudent, topicId: number) {
  const exact = student.placementResults.find(
    (result) => result.topicId === topicId
  )
  return exact?.score ?? student.defaultPlacementScore
}

function getPrerequisiteChain(
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
      ...getPrerequisiteChain(prerequisiteId, topicMap, visited),
      prerequisiteId
    )
  }
  return [...new Set(chain)]
}

function estimateStructuralCounts(
  topicCount: number,
  classesRemaining: number
) {
  return {
    checkpoints: 0,
    rdps: 0,
    ptms: 0,
    total: 0,
  }
}

function adjustTopic(
  topic: CurriculumTopic,
  student: DemoStudent,
  manualAdjustments: ManualAdjustments,
  compressedPrerequisiteIds: Set<number>
): PlanTopicAllocation {
  let classes = topic.idealClasses
  let easyPercent = topic.easyPercent
  const reasons = [
    `${topic.priority[0].toUpperCase()}${topic.priority.slice(1)} priority in the Grade 5 US curriculum.`,
  ]

  const placementScore = getPlacementScore(student, topic.id)
  if (student.placementStatus === "completed" && placementScore !== undefined) {
    if (placementScore < 40) {
      easyPercent = clamp(topic.easyPercent - 15, 40, 80)
      reasons.push(
        `Placement score ${placementScore}% is below 40%, so the full class allocation is kept and practice is increased.`
      )
    } else if (placementScore >= 75) {
      const reduction = Math.ceil(topic.idealClasses * 0.3)
      classes = Math.max(1, topic.idealClasses - reduction)
      easyPercent = clamp(topic.easyPercent + 15, 40, 80)
      reasons.push(
        `Placement score ${placementScore}% is 75% or higher, so the topic is shortened and shifted toward easier consolidation.`
      )
    } else {
      reasons.push(
        `Placement score ${placementScore}% is in the mid-range, so the ideal allocation is retained.`
      )
    }
  } else if (student.placementStatus === "not-taken") {
    reasons.push(
      "No placement result is available, so the ideal allocation is used."
    )
  }

  const topicObjectiveIds = new Set(
    topic.learningObjectives.map((objective) => objective.id)
  )
  const secureMasterCount = student.objectiveEvidence.filter(
    (evidence) =>
      topicObjectiveIds.has(evidence.learningObjectiveId) &&
      evidence.level === "master" &&
      evidence.result === "secure"
  ).length
  const secureMasterRatio =
    topic.learningObjectives.length === 0
      ? 0
      : secureMasterCount / topic.learningObjectives.length
  const placementAlreadyReduced =
    student.placementStatus === "completed" &&
    placementScore !== undefined &&
    placementScore >= 75

  if (
    !placementAlreadyReduced &&
    secureMasterCount >= 2 &&
    secureMasterRatio >= 0.75
  ) {
    const reduction = Math.ceil(topic.idealClasses * 0.3)
    classes = Math.max(1, topic.idealClasses - reduction)
    easyPercent = clamp(topic.easyPercent + 15, 40, 80)
    reasons.push(
      "Secure Master-level evidence shortens this topic without removing it from the plan."
    )
  }

  if (
    student.currentTopicId === topic.id &&
    student.currentTopicClassAdjustment
  ) {
    // Spec Rule: Auto-increases are capped at max +2 classes to prevent major schedule disruption
    const rawAdjustment = student.currentTopicClassAdjustment
    const cappedAdjustment = rawAdjustment > 0 ? Math.min(2, rawAdjustment) : rawAdjustment
    classes = Math.max(1, classes + cappedAdjustment)
    reasons.push(
      cappedAdjustment < 0
        ? "Current progress is strong at Starter level, so one class is returned to the pool."
        : "Current evidence shows more time is needed, so reinforcement is added (capped at max +2 classes per spec)."
    )
  }

  const isCompressedRefresher = compressedPrerequisiteIds.has(topic.id)
  if (isCompressedRefresher) {
    classes = Math.max(1, Math.ceil(topic.idealClasses / 2))
    reasons.push(
      "This prerequisite is scheduled as a compressed refresher before the parent-requested topic."
    )
  }

  const manual = manualAdjustments[topic.id]
  if (manual?.classes !== undefined) classes = Math.max(1, manual.classes)
  if (manual?.easyPercent !== undefined) {
    easyPercent = clamp(manual.easyPercent, 0, 100)
  }

  let activities = Math.max(
    1,
    Math.round(topic.idealActivities * (classes / topic.idealClasses))
  )
  if (manual?.activities !== undefined) {
    activities = Math.max(0, manual.activities)
  }

  const easyActivities = Math.round(activities * (easyPercent / 100))
  const practiceActivities = activities - easyActivities

  if (manual) {
    reasons.push(
      "A teacher override has been applied and locked into this version."
    )
  }

  // Rule G1: Weekly activity workload cap for Grade 5 (max 7 questions/week, ~3.5 per class)
  const maxActivitiesG1 = Math.floor(classes * 3.5)
  if (activities > maxActivitiesG1 && maxActivitiesG1 > 0 && !manual?.activities) {
    activities = maxActivitiesG1
    reasons.push(
      "Activity count adjusted per Rule G1 (max 7 questions/week cap for Grade 5)."
    )
  }

  return {
    topicId: topic.id,
    topicName: topic.name,
    sequence: topic.sequence,
    priority: topic.priority,
    classes,
    idealClasses: topic.idealClasses,
    activities,
    easyActivities,
    practiceActivities,
    easyPercent,
    practicePercent: 100 - easyPercent,
    learningObjectives: topic.learningObjectives,
    reasons,
    isCompressedRefresher,
    manuallyEdited: Boolean(manual),
  }
}

function distributeObjectives(
  objectives: LearningObjective[],
  classCount: number
) {
  if (classCount <= 0 || objectives.length === 0) return []

  if (classCount <= objectives.length) {
    return Array.from({ length: classCount }, (_, index) => {
      const start = Math.floor((index * objectives.length) / classCount)
      const end = Math.floor(((index + 1) * objectives.length) / classCount)
      return objectives.slice(start, Math.max(start + 1, end))
    })
  }

  const classes = objectives.map((objective) => [objective])
  let extra = classCount - objectives.length
  let cursor = objectives.length - 1
  while (extra > 0) {
    classes.push([objectives[Math.max(0, cursor)]])
    cursor = cursor > 0 ? cursor - 1 : objectives.length - 1
    extra -= 1
  }
  return classes
}

function distributeCount(total: number, slots: number) {
  if (slots <= 0) return []
  const base = Math.floor(total / slots)
  const remainder = total % slots
  return Array.from(
    { length: slots },
    (_, index) => base + (index < remainder ? 1 : 0)
  )
}

function buildTopicItems(allocation: PlanTopicAllocation) {
  const objectiveGroups = distributeObjectives(
    allocation.learningObjectives,
    allocation.classes
  )
  const easyByClass = distributeCount(
    allocation.easyActivities,
    allocation.classes
  )
  const practiceByClass = distributeCount(
    allocation.practiceActivities,
    allocation.classes
  )

  return objectiveGroups.map((objectives, index) => {
    const repeatedObjective =
      allocation.classes > allocation.learningObjectives.length &&
      index >= allocation.learningObjectives.length
    const title =
      objectives.length > 1
        ? objectives
            .map((objective) => objective.subtopic)
            .filter(
              (subtopic, position, list) => list.indexOf(subtopic) === position
            )
            .join(" + ")
        : (objectives[0]?.subtopic ?? allocation.topicName)

    return {
      id: `topic-${allocation.topicId}-class-${index + 1}`,
      classNumber: 0,
      kind: "teaching" as const,
      status: "planned" as const,
      title: repeatedObjective
        ? `${title}: reinforcement & application`
        : title,
      subtitle: allocation.isCompressedRefresher
        ? `${allocation.topicName} · compressed prerequisite refresher`
        : allocation.topicName,
      topicId: allocation.topicId,
      topicName: allocation.topicName,
      priority: allocation.priority,
      learningObjectives: objectives,
      easyActivities: easyByClass[index] ?? 0,
      practiceActivities: practiceByClass[index] ?? 0,
      reason: repeatedObjective
        ? "This additional class moves the objective from guided work toward independent application."
        : allocation.reasons[allocation.reasons.length - 1],
    }
  })
}

function orderAllocations(
  allocations: PlanTopicAllocation[],
  student: DemoStudent,
  topicMap: Map<number, CurriculumTopic>
) {
  const bySequence = [...allocations].sort((a, b) => a.sequence - b.sequence)
  if (!student.parentRequestedTopicId) return bySequence

  const requestedId = student.parentRequestedTopicId
  const selectedIds = new Set(
    allocations.map((allocation) => allocation.topicId)
  )
  const prerequisiteIds = getPrerequisiteChain(requestedId, topicMap).filter(
    (id) => selectedIds.has(id)
  )
  const frontIds = new Set([...prerequisiteIds, requestedId])

  return [
    ...prerequisiteIds
      .map((id) => allocations.find((allocation) => allocation.topicId === id))
      .filter((allocation): allocation is PlanTopicAllocation =>
        Boolean(allocation)
      ),
    ...allocations.filter((allocation) => allocation.topicId === requestedId),
    ...bySequence.filter((allocation) => !frontIds.has(allocation.topicId)),
  ]
}

function buildClassSequence(
  allocations: PlanTopicAllocation[],
  structural: ReturnType<typeof estimateStructuralCounts>
) {
  const items: PlanItem[] = []
  const checkpointAfter = new Set<number>()

  for (
    let checkpoint = 1;
    checkpoint <= structural.checkpoints;
    checkpoint += 1
  ) {
    checkpointAfter.add(
      Math.min(
        allocations.length,
        Math.max(
          1,
          Math.round((checkpoint * allocations.length) / structural.checkpoints)
        )
      )
    )
  }

  let checkpointIndex = 0
  let ptmsPlaced = 0

  allocations.forEach((allocation, topicIndex) => {
    items.push(...buildTopicItems(allocation))

    if (checkpointAfter.has(topicIndex + 1)) {
      const checkpointTitle =
        CHECKPOINT_LABELS[checkpointIndex] ??
        `Checkpoint ${checkpointIndex + 1}`
      items.push({
        id: `checkpoint-${checkpointIndex + 1}`,
        classNumber: 0,
        kind: "checkpoint",
        status: "planned",
        title: checkpointTitle,
        subtitle: "Checkpoint assessment",
        learningObjectives: [],
        easyActivities: 0,
        practiceActivities: 0,
        reason:
          "Checkpoint assessments are placed after every two to three topic blocks.",
      })
      items.push({
        id: `rdp-${checkpointIndex + 1}`,
        classNumber: 0,
        kind: "rdp",
        status: "planned",
        title: "Revision, doubts & practice",
        subtitle: `RDP after ${checkpointTitle.toLowerCase()}`,
        learningObjectives: [],
        easyActivities: 0,
        practiceActivities: 0,
        reason:
          "Every checkpoint is followed by an RDP class to close the gaps it reveals.",
      })
      checkpointIndex += 1

      const shouldPlacePtm =
        ptmsPlaced < structural.ptms &&
        checkpointIndex >=
          Math.round(
            ((ptmsPlaced + 1) * structural.checkpoints) / structural.ptms
          )
      if (shouldPlacePtm) {
        items.push({
          id: `ptm-${ptmsPlaced + 1}`,
          classNumber: 0,
          kind: "ptm",
          status: "planned",
          title: "Parent–teacher meeting",
          subtitle: "Progress review and next-term alignment",
          learningObjectives: [],
          easyActivities: 0,
          practiceActivities: 0,
          reason: "PTMs are included as structural classes in the plan.",
        })
        ptmsPlaced += 1
      }
    }
  })

  while (ptmsPlaced < structural.ptms) {
    items.push({
      id: `ptm-${ptmsPlaced + 1}`,
      classNumber: 0,
      kind: "ptm",
      status: "planned",
      title: "Parent–teacher meeting",
      subtitle: "Progress review and next-term alignment",
      learningObjectives: [],
      easyActivities: 0,
      practiceActivities: 0,
      reason: "PTMs are included as structural classes in the plan.",
    })
    ptmsPlaced += 1
  }

  return items.map((item, index) => ({
    ...item,
    classNumber: index + 1,
    status: index === 0 ? ("next" as const) : ("planned" as const),
  }))
}

export function getSuggestedTopicIds(
  topics: CurriculumTopic[],
  student: DemoStudent
) {
  const completedIds = getCompletedTopicIds(student)
  const topicMap = getTopicMap(topics)
  const availableTopics = topics.filter((topic) => !completedIds.has(topic.id))
  const highTopics = availableTopics.filter(
    (topic) => topic.priority === "high"
  )
  const selectedIds = new Set(highTopics.map((topic) => topic.id))

  if (student.parentRequestedTopicId) {
    selectedIds.add(student.parentRequestedTopicId)
    for (const prerequisiteId of getPrerequisiteChain(
      student.parentRequestedTopicId,
      topicMap
    )) {
      if (!completedIds.has(prerequisiteId)) selectedIds.add(prerequisiteId)
    }
  }

  const baseAllocations = availableTopics.map((topic) =>
    adjustTopic(topic, student, {}, new Set())
  )
  const selectedTeaching = sum(
    baseAllocations
      .filter((allocation) => selectedIds.has(allocation.topicId))
      .map((allocation) => allocation.classes)
  )
  const structural = estimateStructuralCounts(
    selectedIds.size,
    student.classesRemaining
  )
  let remaining = student.classesRemaining - selectedTeaching - structural.total

  const lowerPriorityTopics = availableTopics
    .filter((topic) => topic.priority !== "high" && !selectedIds.has(topic.id))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.sequence - b.sequence
    )

  for (const topic of lowerPriorityTopics) {
    const allocation = baseAllocations.find((item) => item.topicId === topic.id)
    if (!allocation) continue
    if (allocation.classes <= remaining) {
      selectedIds.add(topic.id)
      remaining -= allocation.classes
    }
  }

  return [...selectedIds]
}

export function getAiAssistedTopicSuggestion(
  topics: CurriculumTopic[],
  student: DemoStudent
): AiPlanSuggestion {
  const completedIds = getCompletedTopicIds(student)
  const topicMap = getTopicMap(topics)
  const availableTopics = topics.filter((topic) => !completedIds.has(topic.id))
  const recommendations = new Map<number, AiTopicRecommendation>()
  const skippableTopicIds = new Set<number>()
  const mustIncludeIds = new Set<number>()
  const baseAllocations = new Map(
    availableTopics.map((topic) => [
      topic.id,
      adjustTopic(topic, student, {}, new Set()),
    ])
  )

  if (student.parentRequestedTopicId) {
    mustIncludeIds.add(student.parentRequestedTopicId)
    for (const prerequisiteId of getPrerequisiteChain(
      student.parentRequestedTopicId,
      topicMap
    )) {
      if (!completedIds.has(prerequisiteId)) mustIncludeIds.add(prerequisiteId)
    }
  }
  if (student.currentTopicId && !completedIds.has(student.currentTopicId)) {
    mustIncludeIds.add(student.currentTopicId)
  }

  for (const topic of availableTopics) {
    const exactPlacement = student.placementResults.find(
      (result) => result.topicId === topic.id
    )
    const topicObjectiveIds = new Set(
      topic.learningObjectives.map((objective) => objective.id)
    )
    const secureMasterEvidence = student.objectiveEvidence.filter(
      (evidence) =>
        topicObjectiveIds.has(evidence.learningObjectiveId) &&
        evidence.level === "master" &&
        evidence.result === "secure"
    )
    const secureMasterRatio =
      topic.learningObjectives.length === 0
        ? 0
        : secureMasterEvidence.length / topic.learningObjectives.length

    if (mustIncludeIds.has(topic.id)) {
      const isRequested = student.parentRequestedTopicId === topic.id
      recommendations.set(topic.id, {
        topicId: topic.id,
        decision: "include",
        evidence: isRequested ? "parent-request" : "current-progress",
        reason: isRequested
          ? "Keep because this is the parent-requested starting topic."
          : "Keep because this topic is active or required before the requested topic.",
      })
      continue
    }

    if (
      topic.priority === "high" &&
      exactPlacement &&
      exactPlacement.score >= 75
    ) {
      const allocation = baseAllocations.get(topic.id)
      mustIncludeIds.add(topic.id)
      recommendations.set(topic.id, {
        topicId: topic.id,
        decision: "include",
        evidence: "placement",
        reason: `High priority is never skipped. Placement score ${exactPlacement.score}% compresses ${topic.idealClasses} → ${allocation?.classes ?? topic.idealClasses} classes and ${topic.idealActivities} → ${allocation?.activities ?? topic.idealActivities} activities.`,
      })
      continue
    }

    if (exactPlacement && exactPlacement.score >= 75) {
      skippableTopicIds.add(topic.id)
      recommendations.set(topic.id, {
        topicId: topic.id,
        decision: "skip",
        evidence: "placement",
        reason: `Placement score ${exactPlacement.score}% indicates secure readiness, so AI suggests skipping this topic.`,
      })
      continue
    }

    if (
      topic.priority === "high" &&
      secureMasterEvidence.length >= 2 &&
      secureMasterRatio >= 0.75
    ) {
      const allocation = baseAllocations.get(topic.id)
      mustIncludeIds.add(topic.id)
      recommendations.set(topic.id, {
        topicId: topic.id,
        decision: "include",
        evidence: "mastery",
        reason: `High priority is never skipped. Secure mastery compresses ${topic.idealClasses} → ${allocation?.classes ?? topic.idealClasses} classes and ${topic.idealActivities} → ${allocation?.activities ?? topic.idealActivities} activities.`,
      })
      continue
    }

    if (secureMasterEvidence.length >= 2 && secureMasterRatio >= 0.75) {
      skippableTopicIds.add(topic.id)
      recommendations.set(topic.id, {
        topicId: topic.id,
        decision: "skip",
        evidence: "mastery",
        reason: `${secureMasterEvidence.length} Master-level objectives are secure, so AI suggests skipping this topic.`,
      })
      continue
    }

    if (exactPlacement && exactPlacement.score < 40) {
      mustIncludeIds.add(topic.id)
      recommendations.set(topic.id, {
        topicId: topic.id,
        decision: "include",
        evidence: "placement",
        reason: `Placement score ${exactPlacement.score}% shows support is needed, so this topic stays in the plan.`,
      })
    }
  }

  const selectedIds = new Set<number>(mustIncludeIds)

  for (const topic of availableTopics) {
    if (topic.priority === "high" && !skippableTopicIds.has(topic.id)) {
      selectedIds.add(topic.id)
      if (!recommendations.has(topic.id)) {
        recommendations.set(topic.id, {
          topicId: topic.id,
          decision: "include",
          evidence: "priority",
          reason:
            "No secure mastery evidence was found, so this High-priority topic stays in the plan.",
        })
      }
    }
  }

  const lowerPriorityTopics = availableTopics
    .filter(
      (topic) =>
        topic.priority !== "high" &&
        !selectedIds.has(topic.id) &&
        !skippableTopicIds.has(topic.id)
    )
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.sequence - b.sequence
    )

  for (const topic of lowerPriorityTopics) {
    const candidateIds = new Set(selectedIds)
    candidateIds.add(topic.id)
    const candidateTeaching = sum(
      [...candidateIds].map(
        (topicId) => baseAllocations.get(topicId)?.classes ?? 0
      )
    )
    const candidateStructural = estimateStructuralCounts(
      candidateIds.size,
      student.classesRemaining
    )
    const fits =
      candidateTeaching + candidateStructural.total <= student.classesRemaining

    recommendations.set(topic.id, {
      topicId: topic.id,
      decision: fits ? "include" : "defer",
      evidence: fits ? "priority" : "capacity",
      reason: fits
        ? `${formatPriority(topic.priority)} priority fits after higher-priority needs.`
        : `${formatPriority(topic.priority)} priority is deferred because it does not fit after higher-priority needs.`,
    })
    if (fits) selectedIds.add(topic.id)
  }

  for (const topicId of skippableTopicIds) {
    selectedIds.delete(topicId)
  }

  const evidenceSummary = [
    student.placementStatus === "completed"
      ? `${student.placementResults.length} placement topic scores reviewed`
      : "No placement test available",
    student.objectiveEvidence.length > 0
      ? `${student.objectiveEvidence.length} mastery observations reviewed`
      : "No objective-level mastery evidence available",
    `${student.completedTopics.length} completed topics excluded`,
  ]

  return {
    selectedTopicIds: [...selectedIds],
    skippableTopicIds: [...skippableTopicIds],
    recommendations: availableTopics.map(
      (topic) =>
        recommendations.get(topic.id) ?? {
          topicId: topic.id,
          decision: "defer",
          evidence: "capacity",
          reason: "Deferred after reviewing priority and available classes.",
        }
    ),
    evidenceSummary,
  }
}

function formatPriority(priority: Priority) {
  return `${priority[0].toUpperCase()}${priority.slice(1)}`
}

export function buildLearningPlan({
  topics,
  student,
  selectedTopicIds,
  manualAdjustments = {},
  version = 1,
  changesFromPrevious = [],
}: {
  topics: CurriculumTopic[]
  student: DemoStudent
  selectedTopicIds: number[]
  manualAdjustments?: ManualAdjustments
  version?: number
  changesFromPrevious?: string[]
}): GeneratedPlan {
  const topicMap = getTopicMap(topics)
  const completedIds = getCompletedTopicIds(student)
  const requestedPrerequisites = student.parentRequestedTopicId
    ? getPrerequisiteChain(student.parentRequestedTopicId, topicMap)
    : []
  const compressedPrerequisiteIds = new Set(
    requestedPrerequisites.filter((id) => selectedTopicIds.includes(id))
  )
  const selectedSet = new Set(selectedTopicIds)
  for (const topic of topics) {
    if (topic.priority === "high" && !completedIds.has(topic.id)) {
      selectedSet.add(topic.id)
    }
  }

  const allocations = topics
    .filter((topic) => selectedSet.has(topic.id) && !completedIds.has(topic.id))
    .map((topic) =>
      adjustTopic(topic, student, manualAdjustments, compressedPrerequisiteIds)
    )

  const orderedAllocations = orderAllocations(allocations, student, topicMap)
  const structural = estimateStructuralCounts(
    orderedAllocations.length,
    student.classesRemaining
  )
  const teaching = sum(
    orderedAllocations.map((allocation) => allocation.classes)
  )
  const total = teaching + structural.total
  const difference = total - student.classesRemaining
  const warnings: PlanWarning[] = []

  if (difference > 0) {
    warnings.push({
      id: "over-capacity",
      title: `Plan exceeds capacity by ${difference} ${difference === 1 ? "class" : "classes"}`,
      message:
        "High-priority topics were not removed automatically. The teacher can edit the allocations or keep this visible warning.",
      severity: "warning",
    })
  }

  const selectedHighIds = new Set(
    topics
      .filter(
        (topic) => topic.priority === "high" && !completedIds.has(topic.id)
      )
      .map((topic) => topic.id)
  )
  const missingHighTopics = topics.filter(
    (topic) => selectedHighIds.has(topic.id) && !selectedSet.has(topic.id)
  )
  if (missingHighTopics.length > 0) {
    warnings.push({
      id: "high-priority-removed",
      title: `${missingHighTopics.length} High-priority ${missingHighTopics.length === 1 ? "topic is" : "topics are"} not selected`,
      message:
        "This is a teacher decision. The system will not treat the topic as automatically dropped.",
      severity: "attention",
    })
  }

  const droppedTopics: DroppedTopic[] = topics
    .filter(
      (topic) => !selectedSet.has(topic.id) && !completedIds.has(topic.id)
    )
    .sort(
      (a, b) =>
        PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
        b.sequence - a.sequence
    )
    .map((topic) => ({
      topicId: topic.id,
      topicName: topic.name,
      priority: topic.priority,
      reason:
        topic.priority === "low"
          ? "Low priority and did not fit after higher-priority topics."
          : topic.priority === "medium"
            ? "Medium priority and did not fit after High-priority topics."
            : "Removed by the teacher; High-priority topics are never dropped silently.",
    }))

  if (student.completedTopics.length > 0) {
    const savedClasses = sum(
      student.completedTopics.map(
        (topic) => topic.plannedClasses - topic.actualClasses
      )
    )
    if (savedClasses > 0) {
      changesFromPrevious = [
        `Returned ${savedClasses} saved ${savedClasses === 1 ? "class" : "classes"} from completed topics to the available pool.`,
        ...changesFromPrevious,
      ]
    }
  }

  const explanations = [
    "Topics are selected High priority first, then Medium, then Low according to remaining classes.",
    "Prerequisites are kept before dependent topics unless the parent-request flow moves them forward as compressed refreshers.",
  ]
  if (student.placementStatus === "completed") {
    explanations.push(
      "Placement scores below 40% keep the full allocation; scores of 75% or more shorten the topic and increase easy consolidation."
    )
  }
  if (student.parentRequestedTopicId) {
    explanations.push(
      "The parent-requested topic is moved forward after its unmet prerequisite refreshers."
    )
  }
  if (student.classesRemaining >= total * 2) {
    explanations.push(
      `Surplus remaining capacity (${student.classesRemaining} classes) exceeds 2x plan requirements (${total} classes). Excess capacity is reserved as 'Revision / School Help'.`
    )
  }

  const hasManualEdits = Object.keys(manualAdjustments).length > 0

  return {
    id: `plan-${student.id}-v${version}`,
    version,
    studentId: student.id,
    generatedAt: "Prototype data",
    lastModificationType: hasManualEdits ? "manual" : "auto",
    allocations: orderedAllocations,
    items: buildClassSequence(orderedAllocations, structural),
    droppedTopics,
    warnings,
    capacity: {
      available: student.classesRemaining,
      teaching,
      structural: structural.total,
      total,
      difference,
    },
    explanations,
    changesFromPrevious,
  }
}
