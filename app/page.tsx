import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Database,
  GraduationCap,
  LibraryBig,
  Mic,
  Repeat,
  SlidersHorizontal,
  SpellCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import styles from "./home.module.css";

const sections = [
  {
    id: "understand",
    title: "Understand your students",
    description:
      "Find the right starting point and see where each learner needs support.",
    items: [
      {
        href: "/diagnostic-test",
        title: "Diagnostic Test",
        description: "Spot strengths and gaps within a specific topic.",
        icon: Stethoscope,
        color: "teal",
      },
      {
        href: "/placement-test",
        title: "Placement Test",
        description:
          "Find the right class level and starting point across topics.",
        icon: GraduationCap,
        color: "violet",
      },
      {
        href: "/student-profile",
        title: "Student Profile",
        description:
          "Explore student progress, assessment insights, and action plans.",
        icon: Users,
        color: "blue",
      },
      {
        href: "/why-wrong",
        title: "Why It Was Wrong",
        description:
          "Explore the reasoning behind mistakes in a real student session.",
        icon: Compass,
        color: "coral",
      },
    ],
  },
  {
    id: "teach",
    title: "Plan and practise",
    description: "Turn what you know into a meaningful next step.",
    items: [
      {
        href: "/learning-plan-builder",
        title: "Learning Plan Builder",
        description:
          "Build a class-by-class plan from curriculum priorities and student evidence.",
        icon: SlidersHorizontal,
        color: "violet",
      },
      {
        href: "/mastery",
        title: "Mastery Loop",
        description:
          "See the next activity recommended for a student and why it was chosen.",
        icon: Repeat,
        color: "teal",
      },
      {
        href: "/homework-studio",
        title: "Homework Studio",
        description:
          "Create interactive homework with recaps, flashcards, and questions.",
        icon: BookOpen,
        color: "coral",
      },
      {
        href: "/speak-english",
        title: "Speak with Noah",
        description:
          "Practise stories, poems, and speeches with a realtime voice coach.",
        icon: Mic,
        color: "blue",
      },
    ],
  },
  {
    id: "explore",
    title: "Explore the content",
    description:
      "Take a closer look at the curriculum and the questions behind it.",
    items: [
      {
        href: "/teacher/syllabus",
        title: "Curriculum Library",
        description:
          "Browse subjects, topics, learning objectives, and active questions.",
        icon: LibraryBig,
        color: "teal",
      },
      {
        href: "/visualize-questions",
        title: "Question Explorer",
        description:
          "Explore multiple choice, fill-in-the-blank, and drag-and-drop questions.",
        icon: Database,
        color: "gold",
      },
      {
        href: "/fitb",
        title: "FITB Matching",
        description:
          "See how near-miss fill-in-the-blank answers are evaluated.",
        icon: SpellCheck,
        color: "blue",
      },
    ],
  },
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Noah home">
            <span className={styles.brandMark}>
              n<span>.</span>
            </span>
            <span>
              Noah <small>learning tools</small>
            </span>
          </Link>
          <span className={styles.headerNote}>
            A little more insight. A better next step.
          </span>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroLabel}>
              <span /> Your teaching workspace
            </span>
            <h1>
              Every learner has a<br className={styles.desktopBreak} /> next
              step.
            </h1>
            <p>
              Discover where students are, plan where they’re going, and find
              the tools to help them get there.
            </p>
            <a href="#understand" className={styles.heroButton}>
              Explore the tools <span>↓</span>
            </a>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.artOrbit} />
            <div className={styles.artCard}>
              <span className={styles.artIcon}>
                <BookOpen size={22} />
              </span>
              <span>
                <strong>Learning, made clearer</strong>
                <small>From insight to action</small>
              </span>
            </div>
            <div className={styles.artDotOne} />
            <div className={styles.artDotTwo} />
            <div className={styles.artPath}>
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <div className={styles.directoryHeading}>
          <div>
            <span className={styles.sectionKicker}>The toolkit</span>
            <h2>What would you like to do?</h2>
          </div>
          <p>Choose a starting point below.</p>
        </div>
        <nav className={styles.sectionNav} aria-label="Tool categories">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>

        <div className={styles.sections}>
          {sections.map((section) => (
            <section
              id={section.id}
              className={styles.toolSection}
              key={section.id}
            >
              <div className={styles.sectionIntro}>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
              <div className={styles.toolGrid}>
                {section.items.map(
                  ({ href, title, description, icon: Icon, color }) => (
                    <Link href={href} className={styles.tool} key={href}>
                      <span className={`${styles.icon} ${styles[color]}`}>
                        <Icon size={22} strokeWidth={1.8} />
                      </span>
                      <span className={styles.toolCopy}>
                        <span className={styles.toolTitle}>{title}</span>
                        <span className={styles.toolDescription}>
                          {description}
                        </span>
                      </span>
                      <ArrowUpRight
                        className={styles.arrow}
                        size={19}
                        aria-hidden="true"
                      />
                    </Link>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
        <footer className={styles.footer}>
          <span>
            Noah <span>·</span> learning tools
          </span>
          <span>Made for the next step in learning.</span>
        </footer>
      </div>
    </main>
  );
}
