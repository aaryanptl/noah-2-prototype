import { PlanBuilderPage } from "@/components/teacher/PlanBuilderPage";
import {
  DEMO_STUDENT_PROFILES,
  type DemoStudentProfile,
} from "@/lib/demo-students";
import { getAvailablePlanTopics } from "@/lib/plan-ai";
import {
  getStudentEvidence,
  listStudentsWithEvidence,
  type StudentEvidenceSummary,
} from "@/lib/student-evidence";

export const dynamic = "force-dynamic";

export default async function NewLearningPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;

  // Students are sourced from real diagnostic evidence — placement tests and
  // topic assessments — rather than the hand-authored demo profiles. Those remain
  // only as a fallback, for a student with no assessments on record.
  const withEvidence = await listStudentsWithEvidence("Maths");
  const evidence = (
    await Promise.all(
      withEvidence.map((s) => getStudentEvidence(s.studentId, "Maths")),
    )
  ).filter((e): e is NonNullable<typeof e> => e !== null);

  const realProfiles = evidence.map((e) => e.profile);
  const evidenceById: Record<string, StudentEvidenceSummary> =
    Object.fromEntries(evidence.map((e) => [e.profile.id, e.summary]));

  const realIds = new Set(realProfiles.map((p) => p.id));
  const students: DemoStudentProfile[] = [
    ...realProfiles,
    ...DEMO_STUDENT_PROFILES.filter((p) => !realIds.has(p.id)),
  ];

  const preselected = studentId
    ? students.find((s) => s.id === studentId)?.id
    : undefined;

  const topicEntries = await Promise.all(
    students.map(
      async (student) =>
        [student.id, await getAvailablePlanTopics(student)] as const,
    ),
  );

  return (
    <PlanBuilderPage
      students={students}
      defaultStudentId={preselected}
      topicsByStudentId={Object.fromEntries(topicEntries)}
      evidenceById={evidenceById}
    />
  );
}
