import {
  extractConfidence,
  extractSectionBullets,
  extractSummary,
  readExistingProfile,
} from "@/profile-agent/profile-tools"
import { DEFAULT_PROFILE_STUDENT_ID } from "@/profile-agent/constants"
import type { ProfileAgentState } from "@/profile-agent/types"

export function normalizeStudentId(studentId?: string): string {
  const raw = studentId?.trim().toLowerCase() ?? ""
  const safe = raw.replace(/[^a-z0-9-_]/g, "")
  return safe || DEFAULT_PROFILE_STUDENT_ID
}

export async function loadProfileAgentState(studentId: string): Promise<ProfileAgentState> {
  const normalizedId = normalizeStudentId(studentId)
  const profileMarkdown = await readExistingProfile(normalizedId)

  const confidence = extractConfidence(profileMarkdown)
  const strengths = extractSectionBullets(profileMarkdown, "Strengths").slice(0, 5)
  const weakAreas = [
    ...extractSectionBullets(profileMarkdown, "Weak Areas"),
    ...extractSectionBullets(profileMarkdown, "Weaknesses"),
  ].slice(0, 5)

  const summary =
    extractSummary(profileMarkdown) ||
    "No summary exists yet. Run a quiz to generate and store profile insights."

  return {
    studentId: normalizedId,
    confidence,
    hasProfile: profileMarkdown.trim().length > 0,
    strengths,
    weakAreas,
    summary,
    profileMarkdown,
  }
}
