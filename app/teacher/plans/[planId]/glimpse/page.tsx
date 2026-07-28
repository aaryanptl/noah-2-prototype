import { notFound } from "next/navigation";
import { GlimpseForm } from "@/components/teacher/GlimpseForm";
import { getPlanReport } from "@/lib/plan-report";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GlimpsePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) notFound();

  const report = await getPlanReport(planId);
  if (!report) notFound();

  return <GlimpseForm report={report} />;
}
