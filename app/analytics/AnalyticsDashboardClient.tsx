"use client";

import { GlobalAnalytics } from "@/lib/analytics-agent";
import {
  Users,
  FileText,
  TrendingUp,
  Target,
  BookOpen
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AnalyticsDashboardClient({ data }: { data: GlobalAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.testModeStats.map((stat, idx) => {
          let icon = <FileText className="w-6 h-6" />;
          let colorClass = "bg-blue-50 text-blue-500";
          let label = stat.mode.charAt(0).toUpperCase() + stat.mode.slice(1).replace('_', ' ') + " Test";
          
          if (stat.mode.toLowerCase() === "placement") {
            icon = <Target className="w-6 h-6" />;
            colorClass = "bg-purple-50 text-purple-500";
            label = "Placement Test";
          } else if (stat.mode.toLowerCase() === "topic") {
            icon = <BookOpen className="w-6 h-6" />;
            colorClass = "bg-orange-50 text-orange-500";
            label = "Topic Test";
          } else if (stat.mode.toLowerCase() === "multi_topic") {
            icon = <TrendingUp className="w-6 h-6" />;
            colorClass = "bg-emerald-50 text-emerald-500";
            label = "Multi-Topic Test";
          } else if (stat.mode.toLowerCase() === "diagnostic") {
            icon = <FileText className="w-6 h-6" />;
            colorClass = "bg-blue-50 text-blue-500";
            label = "Diagnostic Test";
          } else if (stat.mode.toLowerCase() === "grade") {
            icon = <FileText className="w-6 h-6" />;
            colorClass = "bg-indigo-50 text-indigo-500";
            label = "Grade Test";
          }

          return (
            <div key={idx} className="group bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 relative z-10 ${colorClass}`}>
                {icon}
              </div>
              <div className="relative z-10">
                <div className="flex items-end gap-2">
                  <div className="text-2xl font-black text-slate-800">{stat.count}</div>
                  <div className="text-sm font-bold text-slate-400 mb-1">tests</div>
                </div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-1">{label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Avg Score: <span className="text-slate-700 font-bold">{stat.avgScore}%</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Recent Assessment Activity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.activityTimeline} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Breakdown Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" /> Subject Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.subjectBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.subjectBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Global Focus Areas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Global Focus Areas</h3>
            <p className="text-xs text-slate-500">Concepts most frequently flagged as "Needs Teaching" across all students</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.globalFocusAreas.length === 0 ? (
            <p className="text-slate-500 col-span-full">No focus areas identified.</p>
          ) : (
            data.globalFocusAreas.map((area, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors flex gap-4 items-start">
                <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0 shadow-sm">
                  #{idx + 1}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-2">{area.learningObjective}</h4>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                    <BookOpen className="w-3 h-3" />
                    {area.count} Students Struggling
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
