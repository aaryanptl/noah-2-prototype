import { PlanBuilderPage } from "@/components/teacher/PlanBuilderPage";
import { DEMO_STUDENT_PROFILES, getDemoStudent } from "@/lib/demo-students";
import { getAvailablePlanTopics } from "@/lib/plan-ai";

export const dynamic = "force-dynamic";

export default async function NewLearningPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  // Student profiles are demo data; the plan itself is AI-generated against the
  // live syllabus and saved to learning_plans.
  // A ?studentId from the roster pages may not be one of the demo profiles —
  // ignore it rather than preselecting a student the builder can't plan for.
  const preselected = studentId ? getDemoStudent(studentId)?.id : undefined;
  const topicEntries = await Promise.all(
    DEMO_STUDENT_PROFILES.map(
      async (student) =>
        [student.id, await getAvailablePlanTopics(student)] as const,
    ),
  );

  return (
    <PlanBuilderPage
      students={DEMO_STUDENT_PROFILES}
      defaultStudentId={preselected}
      topicsByStudentId={Object.fromEntries(topicEntries)}
    />
  );
}
