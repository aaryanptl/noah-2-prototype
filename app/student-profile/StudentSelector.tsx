"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, Users, Check } from "lucide-react";

export function StudentSelector({ students, currentStudentId }: { students: any[], currentStudentId?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStudent = students.find(s => s.id === currentStudentId) || students[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach(s => grades.add(s.currentClassLevel));
    return Array.from(grades).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = !searchQuery || 
        s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.currentClassLevel.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGrade = gradeFilter === "all" || s.currentClassLevel === gradeFilter;
      
      return matchesSearch && matchesGrade;
    });
  }, [students, searchQuery, gradeFilter]);

  // Group by grade
  const groupedStudents = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredStudents.forEach(s => {
      const grade = s.currentClassLevel;
      if (!groups[grade]) groups[grade] = [];
      groups[grade].push(s);
    });
    
    // Sort keys
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredStudents]);

  if (!currentStudent) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center gap-3 border-l border-slate-200 pl-6 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
          {currentStudent.displayName.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{currentStudent.displayName}</div>
          <div className="text-xs text-slate-500">Class {currentStudent.currentClassLevel.toUpperCase()}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 cursor-pointer"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="all">All Grades</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>Class {grade.toUpperCase()}</option>
              ))}
            </select>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {Object.keys(groupedStudents).length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No students found.</div>
            ) : (
              Object.entries(groupedStudents).map(([grade, gradeStudents]) => (
                <div key={grade}>
                  <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-y border-slate-100 z-10">
                    Class {grade}
                  </div>
                  <div className="p-1">
                    {gradeStudents.map(student => (
                      <div
                        key={student.id}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/student-profile?studentId=${student.id}`);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          currentStudentId === student.id 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            currentStudentId === student.id ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {student.displayName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{student.displayName}</span>
                        </div>
                        {currentStudentId === student.id && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
