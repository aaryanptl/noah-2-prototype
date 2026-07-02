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
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <Sidebar students={students} />

      {/* Main Dashboard Area */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {profile ? `Welcome back, ${profile.student.displayName.split(' ')[0]}!` : 'Select a student'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Here's your progress overview.</p>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>
            {profile && (
              <StudentSelector students={students} currentStudentId={profile.student.id} />
            )}
          </div>
        </header>

        {profile && (
          <div className="p-8 max-w-7xl mx-auto space-y-6">
            
            {/* Top Row: Profile Card & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-8 shadow-sm">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white relative group">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <span className="text-5xl font-black drop-shadow-sm">{profile.student.displayName.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">{profile.student.displayName}</h2>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-semibold">
                      Class {profile.student.currentClassLevel.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" /> {profile.student.normalizedName}@school.edu
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" /> Parent Contact on file
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> Regional Center
                    </div>
                    <div className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-slate-400" /> ID: {profile.student.id.split('-')[0].toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Overall Progress</h3>
                  <span className="text-3xl font-black text-emerald-500">{avgScore}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${avgScore}%` }}></div>
                </div>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="text-amber-500">⭐</span> Keep going! You're performing great.
                </p>
              </div>

            </div>

            {/* Interactive Dashboard Content (Stats, Table, Actions) */}
            <DashboardClient profile={profile} avgScore={avgScore} />
            
          </div>
        )}
      </main>
    </div>
  );
}
