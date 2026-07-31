export type Priority = "high" | "medium" | "low"
export type EvidenceTone = "strong" | "steady" | "support"
export type PlanItemKind = "teaching" | "checkpoint" | "rdp" | "ptm"
export type PlanItemStatus = "completed" | "next" | "planned"
export type ClassOutcome = "faster" | "on-track" | "needs-time"

export interface LearningObjective {
  id: string
  subtopic: string
  text: string
}

export interface CurriculumTopic {
  id: number
  sequence: number
  name: string
  family: string
  priority: Priority
  prerequisiteIds: number[]
  idealClasses: number
  idealActivities: number
  easyPercent: number
  practicePercent: number
  reason: string
  learningObjectives: LearningObjective[]
}

export interface PlacementResult {
  topicId: number
  score: number
}

export interface CompletedTopic {
  topicId: number
  plannedClasses: number
  actualClasses: number
}

export interface ObjectiveEvidence {
  learningObjectiveId: string
  level: "starter" | "master"
  result: "secure" | "not-secure"
  note: string
}

export interface DemoStudent {
  id: string
  scenario: "A" | "B" | "C" | "D"
  name: string
  initials: string
  grade: number
  region: "US"
  classesRemaining: number
  placementStatus: "completed" | "not-taken" | "not-applicable"
  placementResults: PlacementResult[]
  defaultPlacementScore?: number
  completedTopics: CompletedTopic[]
  currentTopicId?: number
  objectiveEvidence: ObjectiveEvidence[]
  parentRequestedTopicId?: number
  previousPlanLabel?: string
  currentTopicClassAdjustment?: number
}

export interface AiTopicRecommendation {
  topicId: number
  decision: "include" | "skip" | "defer"
  evidence:
    | "placement"
    | "mastery"
    | "priority"
    | "current-progress"
    | "parent-request"
    | "capacity"
  reason: string
}

export interface AiPlanSuggestion {
  selectedTopicIds: number[]
  skippableTopicIds: number[]
  recommendations: AiTopicRecommendation[]
  evidenceSummary: string[]
}

export interface ManualTopicAdjustment {
  classes?: number
  activities?: number
  easyPercent?: number
}

export type ManualAdjustments = Record<number, ManualTopicAdjustment>

export interface PlanTopicAllocation {
  topicId: number
  topicName: string
  sequence: number
  priority: Priority
  classes: number
  idealClasses: number
  activities: number
  easyActivities: number
  practiceActivities: number
  easyPercent: number
  practicePercent: number
  learningObjectives: LearningObjective[]
  reasons: string[]
  isCompressedRefresher: boolean
  manuallyEdited: boolean
}

export interface PlanItem {
  id: string
  classNumber: number
  kind: PlanItemKind
  status: PlanItemStatus
  title: string
  subtitle: string
  topicId?: number
  topicName?: string
  priority?: Priority
  learningObjectives: LearningObjective[]
  easyActivities: number
  practiceActivities: number
  reason: string
}

export interface DroppedTopic {
  topicId: number
  topicName: string
  priority: Priority
  reason: string
}

export interface PlanWarning {
  id: string
  title: string
  message: string
  severity: "warning" | "attention"
}

export interface PlanCapacity {
  available: number
  teaching: number
  structural: number
  total: number
  difference: number
}

export interface GeneratedPlan {
  id: string
  version: number
  studentId: string
  generatedAt: string
  allocations: PlanTopicAllocation[]
  items: PlanItem[]
  droppedTopics: DroppedTopic[]
  warnings: PlanWarning[]
  capacity: PlanCapacity
  explanations: string[]
  changesFromPrevious: string[]
}

export interface QuestionGuideline {
  topicId: number
  learningObjectiveId: string
  starter: string
  master: string
}
