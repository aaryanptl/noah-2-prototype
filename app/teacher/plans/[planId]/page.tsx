import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/teacher/PlanDetail";
import { getLearningPlan } from "@/lib/learning-plans";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeacherPlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) notFound();

  const plan = await getLearningPlan(planId);
  if (!plan) notFound();

  return <PlanDetail plan={plan} />;
}
