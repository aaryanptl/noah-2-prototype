import { CurriculumDashboard } from "@/components/syllabus/CurriculumDashboard";
import { getSyllabusOverview } from "@/lib/syllabus";

export const dynamic = "force-dynamic";

export default async function TeacherSyllabusPage() {
  const overview = await getSyllabusOverview();
  return <CurriculumDashboard overview={overview} />;
}
