import { LearningPlansDashboard } from "@/components/teacher/LearningPlansDashboard";
import { listLearningPlans } from "@/lib/learning-plans";

export const dynamic = "force-dynamic";

export default async function TeacherPlansPage() {
  const plans = await listLearningPlans();
  return <LearningPlansDashboard plans={plans} />;
}
