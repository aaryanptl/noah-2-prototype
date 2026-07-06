import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const OUTPUT_STUDENTS_DIR = path.join(
  process.cwd(),
  "profile-agent",
  "output profile"
)
const DATA_STUDENTS_DIR = path.join(process.cwd(), "data", "students")
const DEFAULT_SEED_PATH = path.join(process.cwd(), "data", "shared-student-memory.md")

function sanitizeStudentId(studentId: string): string {
  const normalized = studentId.trim().toLowerCase()
  const safe = normalized.replace(/[^a-z0-9-_]/g, "")
  return safe || "student-001"
}

function profilePaths(studentId: string) {
  const safeId = sanitizeStudentId(studentId)
  return {
    safeId,
    outputPath: path.join(OUTPUT_STUDENTS_DIR, `${safeId}.md`),
    seedPath: path.join(DATA_STUDENTS_DIR, `${safeId}.md`),
  }
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8")
  } catch {
    return null
  }
}

export async function readExistingProfile(studentId: string): Promise<string> {
  const { outputPath, seedPath } = profilePaths(studentId)
  const fromOutput = await readIfExists(outputPath)
  if (fromOutput) {
    return fromOutput
  }

  const fromSeed = await readIfExists(seedPath)
  if (fromSeed) {
    return fromSeed
  }

  const fromDefaultSeed = await readIfExists(DEFAULT_SEED_PATH)
  return fromDefaultSeed ?? ""
}

export async function writeProfile(studentId: string, markdown: string): Promise<string> {
  const { outputPath } = profilePaths(studentId)
  await mkdir(OUTPUT_STUDENTS_DIR, { recursive: true })
  await writeFile(outputPath, markdown.trim() + "\n", "utf8")
  return outputPath
}

export function extractConfidence(markdown: string): number {
  const normalized = markdown.replace(/\r\n/g, "\n")
  const confidencePatterns = [
    /\*\*Confidence:\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Overall Confidence:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Confidence Level:\s*(\d+(?:\.\d+)?)/i,
  ]

  for (const pattern of confidencePatterns) {
    const match = normalized.match(pattern)
    if (match) {
      const value = Number(match[1])
      if (Number.isFinite(value)) {
        return Math.max(0, Math.min(10, Math.round(value)))
      }
    }
  }

  return 0
}

export function extractSectionBullets(markdown: string, heading: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n")
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const sectionRegex = new RegExp(
    `(?:^|\\n)#{1,6}\\s*${escapedHeading}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s|$)`,
    "i"
  )
  const match = normalized.match(sectionRegex)

  if (!match) {
    return []
  }

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean)
}

export function extractSummary(markdown: string): string {
  const headingFirst = extractSectionBullets(markdown, "Summary")
  if (headingFirst.length > 0) {
    return headingFirst.join(" ")
  }

  const lineMatch = markdown.match(/summary\s*:\s*(.+)$/im)
  return lineMatch?.[1]?.trim() ?? ""
}

export async function getLatestContentBankCsvPath(): Promise<string | null> {
  const profileAgentCsvPath = path.join(
    process.cwd(),
    "agents",
    "profile-agent",
    "Content for Grade6 - v0 - grade6-delivery-export-200 (2).csv"
  )
  const profileAgentCsvExists = await readIfExists(profileAgentCsvPath)
  if (profileAgentCsvExists) {
    return profileAgentCsvPath
  }

  const explicitPath = process.env.QUIZ_BANK_CSV_PATH
  if (explicitPath) {
    return explicitPath
  }

  const preferredDataCsvPath = path.join(
    process.cwd(),
    "data",
    "Content for Grade6 - v0 - grade6-delivery-export-200 (1).csv"
  )
  const preferredDataCsvExists = await readIfExists(preferredDataCsvPath)
  if (preferredDataCsvExists) {
    return preferredDataCsvPath
  }

  const dataDir = path.join(process.cwd(), "data")

  try {
    const dataFiles = await readdir(dataDir)
    const deliveryExportCsvFiles = dataFiles
      .filter(
        (name) =>
          name.startsWith("Content for Grade6 - v0 - grade6-delivery-export") &&
          name.endsWith(".csv")
      )
      .sort((a, b) => b.localeCompare(a))

    if (deliveryExportCsvFiles.length > 0) {
      return path.join(dataDir, deliveryExportCsvFiles[0])
    }
  } catch {
    // Fall through to legacy paths.
  }

  const rootCsvPath = path.join(process.cwd(), "content-bank-grade6.csv")
  const rootCsvExists = await readIfExists(rootCsvPath)
  if (rootCsvExists) {
    return rootCsvPath
  }

  const outputDir = path.join(process.cwd(), "agents", "output")

  try {
    const files = await readdir(outputDir)
    const csvFiles = files
      .filter((name) => name.startsWith("content-bank-") && name.endsWith(".csv"))
      .sort((a, b) => b.localeCompare(a))

    if (csvFiles.length === 0) {
      return null
    }

    return path.join(outputDir, csvFiles[0])
  } catch {
    return null
  }
}
