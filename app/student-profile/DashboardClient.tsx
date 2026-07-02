"use client";

import { useState } from "react";
import {
  FileText,
  TrendingUp,
  Trophy,
  Target,
  ClipboardList,
  BookOpen,
  Users,
  X
} from "lucide-react";

export function DashboardClient({ profile, avgScore }: { profile: any, avgScore: number }) {
  const [selectedActionPlan, setSelectedActionPlan] = useState<"teacher" | "parent" | "student" | null>(null);
  const [selectedTest, setSelectedTest] = useState<any | null>(null);

  // Helper to render action plan content
  const renderActionPlanContent = () => {
    if (!selectedActionPlan) return null;
    
    let title = "";
    let data: string[] = [];
    
    if (selectedActionPlan === "teacher") {
      title = "Teacher Action Plan";
      data = profile.actionPlan.teacherFocus;
    } else if (selectedActionPlan === "parent") {
      title = "Parent Support Plan";
      data = profile.actionPlan.parentSupport;
    } else {
      title = "Student Next Steps";
      data = profile.actionPlan.studentNextSteps;
    }

    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
            <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              {title}
            </h3>
            <button onClick={() => setSelectedActionPlan(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {data.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No specific action steps required at this time.</p>
            ) : (
              <ul className="space-y-4">
                {data.map((step, i) => (
                  <li key={i} className="flex gap-3 text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button onClick={() => setSelectedActionPlan(null)} className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTestModal = () => {
    if (!selectedTest) return null;
    
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-800 capitalize">
                {selectedTest.subject} {selectedTest.topic ? `- ${selectedTest.topic}` : ''}
              </h3>
              <p className="text-sm text-slate-500 mt-1 uppercase tracking-wider">{selectedTest.testMode.replace('_', ' ')}</p>
            </div>
            <button onClick={() => setSelectedTest(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {selectedTest.learningObjectives && selectedTest.learningObjectives.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTest.learningObjectives.map((lo: any, i: number) => {
                  const isStrong = ["mastered", "secure"].includes(lo.masteryState);
                  return (
                    <div key={i} className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${isStrong ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                      <div>
                        <p className={`font-semibold text-[14px] leading-tight mb-2 ${isStrong ? 'text-emerald-900' : 'text-rose-900'}`}>
                          {lo.learningObjective}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex w-fit items-center gap-1 ${isStrong ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {lo.masteryState.replace('_', ' ')}
                        </span>
                      </div>
                      <div className={`font-black text-lg ${isStrong ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {lo.score}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No detailed learning objective data available for this test.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderActionPlanContent()}
      {renderTestModal()}
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 relative z-10">
            <FileText className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-slate-800">{profile.student.totalAssessments}</div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide mt-1">Tests Appeared</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total Tests Completed</div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 relative z-10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-slate-800">{avgScore}%</div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide mt-1">Average Score</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across All Tests</div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 relative z-10">
            <Target className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-slate-800">{profile.weakAreas.length}</div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide mt-1">Concepts to Review</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Needs Teaching</div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 relative z-10">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-slate-800">{profile.strongAreas.length}</div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide mt-1">Strong Domains</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Mastered Concepts</div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Table & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Column (Table) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-500" /> Tests Appeared
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-500 text-xs uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold border-b border-slate-100">Test Name</th>
                  <th className="px-6 py-4 font-semibold border-b border-slate-100">Date</th>
                  <th className="px-6 py-4 font-semibold border-b border-slate-100">Score</th>
                  <th className="px-6 py-4 font-semibold border-b border-slate-100">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profile.assessmentHistory.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">No tests available</td></tr>
                ) : (
                  profile.assessmentHistory.map((test: any, idx: number) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTest(test)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 capitalize">{test.subject} {test.topic ? `- ${test.topic}` : ''}</div>
                        <div className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider">{test.testMode.replace('_', ' ')}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(test.submittedAt).toLocaleDateString("en-GB", { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${test.score >= 80 ? 'text-emerald-500' : test.score >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>
                          {Math.round(test.score)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (Action Plans & Next Steps) */}
        <div className="space-y-6">
          
          {/* Target Focus / Action Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> Focus Areas
              </h3>
            </div>
            <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {profile.weakAreas.length === 0 ? (
                <div className="p-4 text-sm text-slate-400 text-center">No focus areas needed.</div>
              ) : (
                profile.weakAreas.map((area: any, idx: number) => (
                  <div key={idx} className="p-3 flex items-start gap-4 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 mt-1">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 line-clamp-2">{area.learningObjective}</h4>
                      <p className="text-xs text-slate-400 mt-1">Needs Teaching • Score: {area.score}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Action Plans</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSelectedActionPlan("teacher")} className="flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors border-none text-left w-full">
                <Users className="w-6 h-6 text-indigo-600 mb-2" />
                <span className="text-xs font-semibold text-indigo-900">For Teachers</span>
              </button>
              <button onClick={() => setSelectedActionPlan("parent")} className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors border-none text-left w-full">
                <Users className="w-6 h-6 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold text-emerald-900">For Parents</span>
              </button>
              <button onClick={() => setSelectedActionPlan("student")} className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors col-span-2 border-none text-left w-full">
                <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                <span className="text-xs font-semibold text-purple-900">Student Next Steps</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
