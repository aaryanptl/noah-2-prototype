"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Users,
  LayoutDashboard,
  ClipboardList,
  LineChart,
  Filter
} from "lucide-react";

export function Sidebar({ students }: { students: any[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentStudentId = searchParams.get("studentId");
  
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const activeLinkClass = "flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium";
  const inactiveLinkClass = "flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors";

  // Get unique grades
  const grades = useMemo(() => {
    const unique = new Set(students.map(s => s.currentClassLevel));
    return Array.from(unique).sort();
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (gradeFilter === "all") return students;
    return students.filter(s => s.currentClassLevel === gradeFilter);
  }, [students, gradeFilter]);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-200">
          N
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800">Noah</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 flex flex-col">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Menu</div>
        <Link 
          href={`/student-profile${currentStudentId ? `?studentId=${currentStudentId}` : ''}`} 
          className={pathname === "/student-profile" ? activeLinkClass : inactiveLinkClass}
        >
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
        <Link 
          href={`/profile${currentStudentId ? `?studentId=${currentStudentId}` : ''}`} 
          className={pathname === "/profile" ? activeLinkClass : inactiveLinkClass}
        >
          <Users className="w-4 h-4" /> Profile
        </Link>
        <Link 
          href="/diagnostic-test" 
          className={pathname === "/diagnostic-test" ? activeLinkClass : inactiveLinkClass}
        >
          <ClipboardList className="w-4 h-4" /> Tests
        </Link>
        <Link 
          href="/analytics" 
          className={pathname === "/analytics" ? activeLinkClass : inactiveLinkClass}
        >
          <LineChart className="w-4 h-4" /> Analytics
        </Link>
      </nav>
    </aside>
  );
}

function GraduationCapIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.42 10.922a2 2 0 0 1-.01 3.83l-8.47 3.9a2 2 0 0 1-1.76 0l-8.47-3.9a2 2 0 0 1-.01-3.83l8.39-3.98a2 2 0 0 1 1.76 0l8.39 3.98z" />
      <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
      <path d="M22 13v-2" />
    </svg>
  );
}
