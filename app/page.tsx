import {
  ArrowRight,
  BookOpen,
  Database,
  GraduationCap,
  LibraryBig,
  Mic,
  SlidersHorizontal,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";

const ASSESSMENT_OPTIONS = [
  {
    href: "/speak-english",
    title: "Speak with Noah",
    tagline: "English speaking coach",
    description:
      "Practise stories, poems, and short speeches with a friendly realtime voice coach.",
    icon: Mic,
    accent: "#5B7CFA",
  },
  {
    href: "/learning-plan-builder",
    title: "Learning Plan Builder",
    tagline: "Build & Adjust Plans",
    description:
      "Turn curriculum priorities and student evidence into a transparent, class-by-class learning plan.",
    icon: SlidersHorizontal,
    accent: "#7C5CFC",
  },
  {
    href: "/teacher/syllabus",
    title: "Curriculum Library",
    tagline: "Explore the syllabus",
    description:
      "Browse subjects, topics, learning objectives, and their active question versions in one teacher-friendly map.",
    icon: LibraryBig,
    accent: "#1F7169",
  },
  {
    href: "/student-profile",
    title: "Student Profile",
    tagline: "Track Performance",
    description:
      "View detailed analytics and student progress across all assessments and generate action plans.",
    icon: Users,
    accent: "#6366f1",
  },
  {
    href: "/diagnostic-test",
    title: "Diagnostic Test",
    tagline: "Spot strengths & gaps",
    description:
      "Identify a student's strengths and gaps within a specific topic to guide focused learning.",
    icon: Stethoscope,
    accent: "#2EC4B6",
  },
  {
    href: "/placement-test",
    title: "Placement Test",
    tagline: "Find the right level",
    description:
      "Determine the right class level and starting point across a broader range of topics.",
    icon: GraduationCap,
    accent: "#A78BFA",
  },
  {
    href: "/visualize-questions",
    title: "Question Explorer",
    tagline: "Explore the database",
    description:
      "Visualize all Multiple Choice, Fill in the Blanks, and Drag & Drop questions in the database with interactive formatting.",
    icon: Database,
    accent: "#F5A623",
  },
  {
    href: "/homework-studio",
    title: "Homework Studio",
    tagline: "AI Homework Builder",
    description:
      "Create and run custom interactive homework journeys with recaps, flashcards, physics sandboxes, and mixed questions.",
    icon: BookOpen,
    accent: "#E8734A",
  },
] as const;

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[var(--bg-warm)] px-5 py-12 sm:px-8 sm:py-16">
      <div className="w-full max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--heading)] sm:text-5xl">
            Choose your assessment
          </h1>
          <p className="mt-4 text-base text-[var(--text-dim)] sm:text-lg">
            Pick the experience that fits what you want to find out.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ASSESSMENT_OPTIONS.map(
            ({ href, title, tagline, description, icon: Icon, accent }) => {
              if (href === "/student-profile") {
                return (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-[0_4px_14px_rgba(26,26,46,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(26,26,46,0.08)]"
                  >
                    {/* Top Section - Mockup */}
                    <div className="relative flex h-48 shrink-0 justify-center overflow-hidden bg-[#fff0f5] px-4 pt-7">
                      <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-[#ffe4e6] opacity-70" />
                      <div className="absolute bottom-4 right-4 w-10 h-10 rounded-2xl bg-[#f3e8ff] opacity-80 rotate-12" />

                      <div className="relative z-10 mt-2 flex w-full min-w-0 max-w-[260px] flex-col overflow-hidden rounded-t-xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                        <div className="bg-[#f8fafc] px-3 py-2.5 flex gap-1.5 border-b border-slate-100">
                          <div className="w-2 h-2 rounded-full bg-[#f87171]" />
                          <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                          <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                        </div>
                        <div className="p-4 flex-1">
                          <div className="flex gap-3 mb-4 items-center">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              A
                            </div>
                            <div className="leading-tight">
                              <div className="font-extrabold text-slate-800 text-[13px]">
                                Aarav Patel
                              </div>
                              <div className="text-slate-500 text-[10px] mt-0.5 font-medium">
                                Grade 5 · Intermediate
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mb-4">
                            <div className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-100/50">
                              <span className="text-[10px] text-slate-800">
                                👤
                              </span>{" "}
                              Profile Calibrated
                            </div>
                            <div className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                              <span className="text-emerald-400">⚡</span> Live
                              Ingestion
                            </div>
                          </div>
                          <div className="border border-rose-50 rounded-lg p-2.5 bg-[#fafafa]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] text-slate-500 font-medium">
                                Cognitive Mastery:
                              </span>
                              <span className="text-xs font-bold text-rose-500">
                                84%
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded">
                                Fractions
                              </span>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded">
                                Geometry
                              </span>
                              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100/50 px-1.5 py-0.5 rounded">
                                Decimals
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex flex-1 flex-col justify-between bg-white p-6">
                      <div>
                        <h2 className="text-[22px] font-extrabold text-[#1e293b] mb-3">
                          Profile Agent
                        </h2>
                        <p className="text-[13.5px] leading-[1.6] text-slate-500 font-medium">
                          Maintains the unified student learning profile as the
                          primary source of truth across all evidence vectors.
                        </p>
                      </div>
                      <div
                        className="mt-8 inline-flex items-center gap-2 text-sm font-bold"
                        style={{ color: accent }}
                      >
                        Start
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className="group relative flex min-w-0 flex-col justify-between rounded-[24px] bg-white p-7 transition-all hover:-translate-y-1 2xl:p-8"
                  style={{
                    border: `2px solid ${accent}40`,
                    boxShadow: `0 6px 0 ${accent}33, 0 4px 14px rgba(26,26,46,0.06)`,
                  }}
                >
                  <div>
                    <div className="mb-6 flex items-center gap-3">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-4 ring-white"
                        style={{
                          backgroundColor: `${accent}1f`,
                          color: accent,
                        }}
                      >
                        <Icon className="h-7 w-7" strokeWidth={2.2} />
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${accent}1a`,
                          color: accent,
                        }}
                      >
                        {tagline}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-[var(--text)]">
                      {title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
                      {description}
                    </p>
                  </div>
                  <div
                    className="mt-8 inline-flex items-center gap-2 text-sm font-bold"
                    style={{ color: accent }}
                  >
                    Start
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            },
          )}
        </div>
      </div>
    </main>
  );
}
