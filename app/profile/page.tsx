import { getStudentList } from "@/lib/profile-agent";
import { Sidebar } from "@/app/student-profile/Sidebar";
import { StudentSelector } from "@/app/student-profile/StudentSelector";
import { Mail, Phone, MapPin, IdCard, Calendar, Shield, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfileDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const students = await getStudentList();
  const selectedStudentId = resolvedSearchParams.studentId || students[0]?.id;
  
  const student = students.find(s => s.id === selectedStudentId) || students[0];

  if (!student) {
    return <div>No student found</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-900">
      <Sidebar students={students} />

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Personal details and account settings.</p>
          </div>
          <div className="flex items-center gap-6">
            <StudentSelector students={students} currentStudentId={student.id} />
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto space-y-6">
          
          {/* Main Profile Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <div className="px-8 pb-8 relative">
              <div className="flex justify-between items-end -mt-12 mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center text-3xl font-black text-indigo-600 shrink-0">
                  {student.displayName.charAt(0)}
                </div>
                <button className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Edit Profile
                </button>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{student.displayName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    Class {student.currentClassLevel.toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <IdCard className="w-4 h-4" /> ID: {student.id.split('-')[0].toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{student.displayName.toLowerCase().replace(' ', '.')}@school.edu</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent Contact</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">+1 (555) 019-2834</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">Regional Educational Center</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Account Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>
                    <div className="text-sm font-medium text-emerald-600 mt-0.5 font-bold flex items-center gap-1">
                      Active Account
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Since</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">September 2025</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
