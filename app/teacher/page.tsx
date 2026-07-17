import { StudentsOverview } from "@/components/teacher/StudentsOverview";
import { getTeacherRoster } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const students = await getTeacherRoster();
  return <StudentsOverview students={students} />;
}
