import { notFound } from "next/navigation";
import { StudentDetail } from "@/components/teacher/StudentDetail";
import { getStudentPerformanceDetail } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  if (!UUID_PATTERN.test(studentId)) notFound();
  const detail = await getStudentPerformanceDetail(studentId);
  if (!detail) notFound();
  return <StudentDetail detail={detail} />;
}
