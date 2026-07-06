export type LearningStatus = "weak" | "developing" | "exploring" | "progressing"

export type LearningObjectiveStatus =
  | "strong"
  | "developing"
  | "needs_practice"

export type LearningObjectivePerformance = {
  learningObjective: string
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  scorePercent: number
  status: LearningObjectiveStatus
}

export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  subject: string
  topic: string
  subtopic: string
  learningObjective: string
}

export type QuizAnswer = {
  questionId: string
  selectedAnswer: string
}

export type AgentFinalResponse = {
  score: number
  confidence: number
  strengths: string[]
  weaknesses: string[]
  learning_status: LearningStatus
  summary: string
  learningObjectivePerformance: LearningObjectivePerformance[]
  strongLearningObjectives: string[]
  practiceLearningObjectives: string[]
}

export type ProfileAgentState = {
  studentId: string
  confidence: number
  hasProfile: boolean
  strengths: string[]
  weakAreas: string[]
  summary: string
  profileMarkdown: string
}
