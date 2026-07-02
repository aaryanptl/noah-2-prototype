import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Stethoscope,
  Database,
  BookOpen,
  Users
} from "lucide-react";

const ASSESSMENT_OPTIONS = [
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-warm)] px-6 py-16">
      <div className="w-full max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--heading)] sm:text-5xl">
            Choose your assessment
          </h1>
          <p className="mt-4 text-base text-[var(--text-dim)] sm:text-lg">
            Pick the experience that fits what you want to find out.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 [&>*]:w-full sm:[&>*]:w-[calc(50%-12px)] lg:[&>*]:w-[calc(33.333%-16px)] xl:[&>*]:w-[calc(20%-20px)]">
          {ASSESSMENT_OPTIONS.map(
            ({ href, title, tagline, description, icon: Icon, accent }) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col justify-between rounded-[24px] bg-white p-8 transition-all hover:-translate-y-1"
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
            ),
          )}
        </div>
      </div>
    </main>
  );
}
