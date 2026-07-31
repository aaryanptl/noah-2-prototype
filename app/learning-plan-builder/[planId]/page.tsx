import LearningPlanBuilder from "../page"

/**
 * A saved plan at its own URL: /learning-plan-builder/<planId>.
 * The builder hydrates from the stored snapshot instead of starting at setup.
 */
export default async function SavedLearningPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  return <LearningPlanBuilder savedPlanId={planId} />
}
