import { getStudentList, getStudentProfile } from "@/lib/profile-agent";
import { Sidebar } from "./Sidebar";
import { DashboardClient } from "./DashboardClient";
import { StudentSelector } from "./StudentSelector";
import { Users, Bell, ChevronDown, Mail, Phone, MapPin, IdCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const students = await getStudentList();
  const selectedStudentId = resolvedSearchParams.studentId || students[0]?.id;
  
  let profile = null;
  if (selectedStudentId) {
    profile = await getStudentProfile(selectedStudentId);
  }

  // Calculate stats
  let avgScore = 0;
  if (profile && profile.assessmentHistory.length > 0) {
    const total = profile.assessmentHistory.reduce((sum, test) => sum + test.score, 0);
    avgScore = Math.round(total / profile.assessmentHistory.length);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-slate-900">

      {/* Main Dashboard Area */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {profile ? `Welcome back, ${profile.student.displayName.split(' ')[0]}!` : 'Select a student'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">Here's your progress overview.</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {profile && (
              <StudentSelector students={students} currentStudentId={profile.student.id} />
            )}
          </div>
        </header>

        {profile && (
          <div className="p-8 max-w-7xl mx-auto space-y-6">
            
            {/* Memphis Interactive Dashboard Content */}
            <DashboardClient profile={profile} avgScore={avgScore} />
            
          </div>
        )}
      </main>
    </div>
  );
}
