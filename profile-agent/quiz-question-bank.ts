import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { parse } from "csv-parse/sync"

import type {
  QuizQuestion,
} from "@/profile-agent/types"

type CsvRow = Record<string, string>

type QuizOptions = {
  subjects: string[]
  topicsBySubject: Record<string, string[]>
}

type QuizGenerationResult = {
  questions: QuizQuestion[]
  requestedCount: number
  deliveredCount: number
  distribution: Array<{
    learningObjective: string
    questionCount: number
  }>
}

const DIAGNOSTIC_CSV_CANDIDATES = [
  path.join(process.cwd(), "agents", "diagnostic", "content2.csv"),
  path.join(process.cwd(), "agents", "diagnostic", "content.csv"),
]

let cachedQuestions: QuizQuestion[] | null = null

function cleanText(input: string): string {
  return input
    .replaceAll("Ã¢â€šÂ¹", "Rs ")
    .replaceAll("â‚¹", "Rs ")
    .replaceAll("Ã‚Â°C", " degC")
    .replaceAll("Â°C", " degC")
    .replaceAll("Ã¢â‚¬â€œ", "-")
    .replaceAll("Ã¢Ë†â€™", "-")
    .replaceAll("âˆ’", "-")
    .replaceAll("Ãƒâ€”", " x ")
    .replaceAll("Ã—", " x ")
    .replaceAll("ÃƒÂ·", " / ")
    .replaceAll("Ã·", " / ")
    .replaceAll("Â²", "^2")
    .replaceAll("Ã¢â€°Ë†", " approx ")
    .replace(/\s+/g, " ")
    .trim()
}

function pick(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }
  return ""
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function resolveDiagnosticCsvPath(): Promise<string> {
  for (const candidate of DIAGNOSTIC_CSV_CANDIDATES) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next candidate.
    }
  }

  return DIAGNOSTIC_CSV_CANDIDATES[0]
}

function parseQuestion(row: CsvRow, rowIndex: number): QuizQuestion | null {
  const questionType = pick(row, "question_type", "questionType").toLowerCase()

  let payload: unknown
  try {
    payload = JSON.parse(pick(row, "payload"))
  } catch {
    return null
  }

  const questionId = pick(row, "id", "queueId") || `q-${rowIndex}`
  const questionText = cleanText(pick(row, "question_text", "questionText"))
  const subject = cleanText(pick(row, "subject"))
  const topic = cleanText(pick(row, "topic"))
  const subtopic = cleanText(pick(row, "subtopic"))
  const learningObjective = cleanText(
    pick(row, "learning_objective", "learningObjective")
  )

  if (!subject || !topic || !questionText || !learningObjective) {
    return null
  }

  if (questionType === "mcq" && Array.isArray((payload as any).options)) {
    const options = (payload as any).options
      .map((option: any) => cleanText(String(option.text ?? "")))
      .filter(Boolean)
    const correctAnswer = cleanText(
      String(
        (payload as any).options.find((option: any) => option.correct === true)
          ?.text ?? ""
      )
    )

    if (options.length < 2 || !correctAnswer) return null

    return {
      id: questionId,
      question: questionText,
      options: shuffle(Array.from(new Set(options))),
      correctAnswer,
      subject,
      topic,
      subtopic,
      learningObjective,
    }
  }

  if (questionType === "fitb") {
    const correctAnswer = cleanText(String((payload as any).answer ?? ""))
    const distractors = Array.isArray((payload as any).distractors)
      ? (payload as any).distractors
          .map((distractor: unknown) => cleanText(String(distractor)))
          .filter(Boolean)
      : []
    const options = shuffle(Array.from(new Set([...distractors, correctAnswer])))

    if (options.length < 2 || !correctAnswer) return null

    return {
      id: questionId,
      question: questionText,
      options,
      correctAnswer,
      subject,
      topic,
      subtopic,
      learningObjective,
    }
  }

  if (questionType === "true_false") {
    const answer = (payload as { correctAnswer?: boolean }).correctAnswer
    if (typeof answer !== "boolean") return null

    return {
      id: questionId,
      question: questionText,
      options: ["True", "False"],
      correctAnswer: answer ? "True" : "False",
      subject,
      topic,
      subtopic,
      learningObjective,
    }
  }

  return null
}

export async function loadQuestionBank(): Promise<QuizQuestion[]> {
  if (cachedQuestions) return cachedQuestions

  const csvPath = await resolveDiagnosticCsvPath()
  const csv = await readFile(csvPath, "utf8")
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[]

  cachedQuestions = rows
    .map((row, index) => parseQuestion(row, index + 1))
    .filter((question): question is QuizQuestion => question !== null)

  return cachedQuestions
}

export async function getQuizOptions(): Promise<QuizOptions> {
  const questions = await loadQuestionBank()
  const subjectSet = new Set<string>()
  const topicsBySubject = new Map<string, Set<string>>()

  for (const question of questions) {
    subjectSet.add(question.subject)
    if (!topicsBySubject.has(question.subject)) {
      topicsBySubject.set(question.subject, new Set<string>())
    }
    topicsBySubject.get(question.subject)?.add(question.topic)
  }

  const subjects = [...subjectSet].sort((a, b) => a.localeCompare(b))
  const map: Record<string, string[]> = {}

  for (const subject of subjects) {
    map[subject] = [...(topicsBySubject.get(subject) ?? new Set<string>())].sort(
      (a, b) => a.localeCompare(b)
    )
  }

  return {
    subjects,
    topicsBySubject: map,
  }
}

function selectBalancedQuestions(
  questions: QuizQuestion[],
  requestedCount: number
): QuizGenerationResult {
  const uniqueQuestions = Array.from(
    new Map(questions.map((question) => [question.id, question])).values()
  )
  const byLearningObjective = new Map<string, QuizQuestion[]>()

  for (const question of shuffle(uniqueQuestions)) {
    const bucket = byLearningObjective.get(question.learningObjective) ?? []
    bucket.push(question)
    byLearningObjective.set(question.learningObjective, bucket)
  }

  const objectives = Array.from(byLearningObjective.keys()).sort((a, b) =>
    a.localeCompare(b)
  )

  if (objectives.length === 0) {
    return {
      questions: [],
      requestedCount,
      deliveredCount: 0,
      distribution: [],
    }
  }

  const safeRequestedCount = Math.max(
    1,
    Math.min(requestedCount, uniqueQuestions.length)
  )
  const basePerObjective = Math.floor(safeRequestedCount / objectives.length)
  let remainder = safeRequestedCount % objectives.length

  const targetPerObjective = new Map<string, number>()
  for (const objective of objectives) {
    let target = basePerObjective
    if (remainder > 0) {
      target += 1
      remainder -= 1
    }
    targetPerObjective.set(objective, target)
  }

  const selected: QuizQuestion[] = []
  const selectedIds = new Set<string>()
  const selectedCounts = new Map<string, number>(
    objectives.map((objective) => [objective, 0])
  )

  for (const objective of objectives) {
    const pool = byLearningObjective.get(objective) ?? []
    const target = targetPerObjective.get(objective) ?? 0
    while (
      (selectedCounts.get(objective) ?? 0) < target &&
      pool.length > 0 &&
      selected.length < safeRequestedCount
    ) {
      const nextQuestion = pool.shift()
      if (!nextQuestion || selectedIds.has(nextQuestion.id)) {
        continue
      }

      selected.push(nextQuestion)
      selectedIds.add(nextQuestion.id)
      selectedCounts.set(objective, (selectedCounts.get(objective) ?? 0) + 1)
    }
  }

  // Fill any shortfall from remaining questions while keeping counts as even as possible.
  while (selected.length < safeRequestedCount) {
    const objective = objectives
      .filter((key) => (byLearningObjective.get(key)?.length ?? 0) > 0)
      .sort((left, right) => {
        const countDiff =
          (selectedCounts.get(left) ?? 0) - (selectedCounts.get(right) ?? 0)
        if (countDiff !== 0) return countDiff
        return left.localeCompare(right)
      })[0]

    if (!objective) {
      break
    }

    const pool = byLearningObjective.get(objective) ?? []
    const nextQuestion = pool.shift()
    if (!nextQuestion || selectedIds.has(nextQuestion.id)) {
      continue
    }

    selected.push(nextQuestion)
    selectedIds.add(nextQuestion.id)
    selectedCounts.set(objective, (selectedCounts.get(objective) ?? 0) + 1)
  }

  const distribution = objectives.map((objective) => ({
    learningObjective: objective,
    questionCount: selectedCounts.get(objective) ?? 0,
  }))

  return {
    questions: shuffle(selected).map((question) => ({
      ...question,
      options: shuffle(question.options),
    })),
    requestedCount: safeRequestedCount,
    deliveredCount: selected.length,
    distribution,
  }
}

export async function generateQuizBySelection(params: {
  subject: string
  topic: string
  count: number
}): Promise<QuizGenerationResult> {
  const allQuestions = await loadQuestionBank()
  const filtered = allQuestions.filter(
    (question) =>
      question.subject === params.subject && question.topic === params.topic
  )

  return selectBalancedQuestions(filtered, params.count)
}
