"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Target,
  Sparkles,
  Users,
  GraduationCap,
  BookOpen
} from "lucide-react";

export function ProfileTabs({ profile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState<"overview" | "action-plans" | "assessment-history">("overview");

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-8 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/60 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          Overview & Strengths
        </button>
        <button
          onClick={() => setActiveTab("assessment-history")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "assessment-history"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          Assessment History
        </button>
        <button
          onClick={() => setActiveTab("action-plans")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "action-plans"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          Action Plans
        </button>
      </div>

      {/* Tab Content: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Strong Areas */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Mastered Skills</h3>
                <p className="text-sm text-slate-500 font-medium">Areas of high proficiency</p>
              </div>
            </div>
            
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-slate-200/60 shadow-lg shadow-slate-200/20 space-y-4">
              {profile.strongAreas.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400">
                  <Sparkles className="w-8 h-8 mb-3 opacity-20" />
                  <p>More assessment data needed</p>
                </div>
              ) : (
                profile.strongAreas.map((area: any, idx: number) => (
                  <div key={idx} className="group relative bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-emerald-100/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    <div className="flex justify-between items-start pl-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[15px] leading-snug group-hover:text-emerald-700 transition-colors pr-4">{area.learningObjective}</h4>
                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-2.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {area.masteryState.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-xl w-14 h-14 border border-emerald-100 shrink-0">
                        <span className="text-lg font-black text-emerald-600">{area.score}</span>
                        <span className="text-[10px] font-bold text-emerald-400/80 -mt-1">%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weak Areas */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2.5 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl text-white shadow-lg shadow-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Target Areas</h3>
                <p className="text-sm text-slate-500 font-medium">Concepts needing attention</p>
              </div>
            </div>
            
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-slate-200/60 shadow-lg shadow-slate-200/20 space-y-4">
              {profile.weakAreas.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mb-3 opacity-20" />
                  <p>No critical gaps identified</p>
                </div>
              ) : (
                profile.weakAreas.map((area: any, idx: number) => (
                  <div key={idx} className="group relative bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-rose-100/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-rose-600" />
                    <div className="flex justify-between items-start pl-3 mb-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[15px] leading-snug group-hover:text-rose-700 transition-colors pr-4">{area.learningObjective}</h4>
                        <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mt-2.5 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          {area.masteryState.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-rose-50 rounded-xl w-14 h-14 border border-rose-100 shrink-0">
                        <span className="text-lg font-black text-rose-600">{area.score}</span>
                        <span className="text-[10px] font-bold text-rose-400/80 -mt-1">%</span>
                      </div>
                    </div>
                    
                    {area.recentIssues.length > 0 && (
                      <div className="ml-3 bg-slate-50/80 p-3.5 rounded-xl text-sm border border-slate-100/80">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Observed Misconceptions</span>
                        <div className="space-y-2">
                          {area.recentIssues.map((issue: string, i: number) => (
                            <div key={i} className="flex gap-2.5 items-start">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                              <span className="text-slate-600 font-medium leading-relaxed">{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Assessment History */}
      {activeTab === "assessment-history" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="p-2.5 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Assessment History</h3>
              <p className="text-sm text-slate-500 font-medium">Recent diagnostic tests and performance</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {profile.assessmentHistory.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-12 text-center border border-slate-200/60 shadow-lg shadow-slate-200/20 text-slate-400">
                No tests taken yet.
              </div>
            ) : (
              profile.assessmentHistory.map((test: any, idx: number) => (
                <div key={idx} className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  {/* Test Header */}
                  <div className="bg-gradient-to-r from-slate-50 to-white p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-md">
                          {test.testMode.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">
                          {new Date(test.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 capitalize">
                        {test.subject} {test.topic ? `- ${test.topic}` : ''}
                      </h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Score</div>
                        <div className="text-3xl font-black text-indigo-600">{Math.round(test.score)}<span className="text-lg text-indigo-400">%</span></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Test Details (LOs) */}
                  {test.learningObjectives && test.learningObjectives.length > 0 && (
                    <div className="p-6 bg-white">
                      <h5 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Performance Breakdown</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {test.learningObjectives.map((lo: any, i: number) => {
                          const isStrong = ["mastered", "secure"].includes(lo.masteryState);
                          return (
                            <div key={i} className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${isStrong ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                              <div>
                                <p className={`font-semibold text-[14px] leading-tight mb-2 ${isStrong ? 'text-emerald-900' : 'text-rose-900'}`}>
                                  {lo.learningObjective}
                                </p>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex w-fit items-center gap-1 ${isStrong ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {isStrong ? <CheckCircle2 className="w-3 h-3" /> : <Target className="w-3 h-3" />}
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
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Action Plans */}
      {activeTab === "action-plans" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/30 border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                  Dynamic Action Plan
                </h3>
                <p className="text-slate-400 font-medium mt-2">Personalized next steps automatically synthesized from recent diagnostic data.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
              
              {/* Teacher Plan */}
              <div className="p-8 hover:bg-slate-50/50 transition-colors">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-6">For Teachers</h4>
                {profile.actionPlan.teacherFocus.length === 0 ? (
                  <div className="text-sm font-medium text-slate-400 bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">No specific focus required.</div>
                ) : (
                  <ul className="space-y-4">
                    {profile.actionPlan.teacherFocus.map((focus: string, i: number) => (
                      <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50">
                        <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{focus}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Parent Plan */}
              <div className="p-8 hover:bg-slate-50/50 transition-colors">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-6">For Parents</h4>
                {profile.actionPlan.parentSupport.length === 0 ? (
                  <div className="text-sm font-medium text-slate-400 bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">No specific support required.</div>
                ) : (
                  <ul className="space-y-4">
                    {profile.actionPlan.parentSupport.map((support: string, i: number) => (
                      <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50">
                        <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{support}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Student Plan */}
              <div className="p-8 hover:bg-slate-50/50 transition-colors">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
                  <GraduationCap className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-6">For Students</h4>
                {profile.actionPlan.studentNextSteps.length === 0 ? (
                  <div className="text-sm font-medium text-slate-400 bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">No specific steps right now.</div>
                ) : (
                  <ul className="space-y-4">
                    {profile.actionPlan.studentNextSteps.map((step: string, i: number) => (
                      <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50">
                        <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
