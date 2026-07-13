import { getGlobalAnalytics } from "@/lib/analytics-agent";
import { AnalyticsSidebar } from "./AnalyticsSidebar";
import { AnalyticsDashboardClient } from "./AnalyticsDashboardClient";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analyticsData = await getGlobalAnalytics();

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <AnalyticsSidebar />

      {/* Main Dashboard Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Platform-wide student performance by assessment type.</p>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6 cursor-pointer group">
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white relative">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <span className="text-lg font-black drop-shadow-sm">A</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Admin User</div>
                <div className="text-xs text-slate-500">Global Admin</div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnalyticsDashboardClient data={analyticsData} />
        </div>
      </main>
    </div>
  );
}
