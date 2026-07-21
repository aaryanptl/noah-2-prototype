// ─────────────────────────────────────────────────────────────────────────────
// Demo student profiles for the learning-plan builder.
//
// These are hand-authored (no DB read) so the builder is fully demo-able, but
// the ids are fixed UUIDs that `scripts/seed-demo-students.ts` inserts into
// diagnostic_students — that keeps the learning_plans.student_id foreign key
// satisfied when a generated plan is saved.
// ─────────────────────────────────────────────────────────────────────────────

import type { PlanSnapshot, PlanStudentOption } from "@/lib/learning-plans";

export type DemoMastery =
  | "not_started"
  | "emerging"
  | "developing"
  | "secure"
  | "advanced";

export interface DemoTopicSignal {
  /** Curriculum topic this signal belongs to. */
  topic: string;
  learningObjective: string;
  masteryState: DemoMastery;
  /** 0–100 accuracy on the most recent evidence. */
  score: number;
  /** What the teacher actually saw — fed to the model as diagnosis context. */
  note: string;
}

export interface DemoStudentProfile {
  id: string;
  displayName: string;
  classLevel: string;
  subject: string;
  avgScore: number;
  testsTaken: number;
  lastActiveDaysAgo: number;
  /** Attendance across the last 20 scheduled classes, as a percentage. */
  attendance: number;
  trend: "up" | "flat" | "down";
  /** Pace the plan should assume — the model uses this to size each session. */
  pace: "needs support" | "steady" | "fast";
  teacherNote: string;
  weakAreas: DemoTopicSignal[];
  strongAreas: DemoTopicSignal[];
}

export const DEMO_STUDENT_PROFILES: DemoStudentProfile[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    displayName: "Aarav Sharma",
    classLevel: "6",
    subject: "Maths",
    avgScore: 52,
    testsTaken: 4,
    lastActiveDaysAgo: 5,
    attendance: 90,
    trend: "up",
    pace: "steady",
    teacherNote:
      "Confident with whole numbers but loses the thread the moment a question mixes fractions and decimals. Responds well to visual models.",
    weakAreas: [
      {
        topic: "Fractions",
        learningObjective:
          "Students can compare fractions with unlike denominators",
        masteryState: "emerging",
        score: 25,
        note: "Compares numerators only — says 3/8 > 1/2 because 3 > 1.",
      },
      {
        topic: "Decimals",
        learningObjective:
          "Students can convert between fractions and decimals",
        masteryState: "emerging",
        score: 30,
        note: "No stable link between place value and tenths/hundredths.",
      },
      {
        topic: "Fractions",
        learningObjective:
          "Students can add and subtract fractions with the same denominator",
        masteryState: "developing",
        score: 55,
        note: "Adds denominators as well as numerators about half the time.",
      },
    ],
    strongAreas: [
      {
        topic: "Fractions",
        learningObjective: "Students can identify equivalent fractions",
        masteryState: "secure",
        score: 85,
        note: "Fluent with times-tables reasoning behind equivalence.",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    displayName: "Diya Patel",
    classLevel: "6",
    subject: "Maths",
    avgScore: 45,
    testsTaken: 3,
    lastActiveDaysAgo: 3,
    attendance: 75,
    trend: "down",
    pace: "needs support",
    teacherNote:
      "Strong spatial intuition, weak on the vocabulary and notation that carries it. Misses classes often, so each session needs a short recap.",
    weakAreas: [
      {
        topic: "2D & 3D Geometry",
        learningObjective: "Students can classify angles by size",
        masteryState: "emerging",
        score: 28,
        note: "Mixes up obtuse and reflex; guesses when no protractor is shown.",
      },
      {
        topic: "Algebraic Expressions",
        learningObjective:
          "Students can write algebraic expressions from word descriptions",
        masteryState: "emerging",
        score: 32,
        note: "Writes 3n for 'three more than n'.",
      },
      {
        topic: "2D & 3D Geometry",
        learningObjective:
          "Students can find the perimeter of rectilinear shapes",
        masteryState: "developing",
        score: 52,
        note: "Forgets to work out unlabelled sides on compound shapes.",
      },
    ],
    strongAreas: [
      {
        topic: "2D & 3D Geometry",
        learningObjective: "Students can name 3D shapes from their properties",
        masteryState: "advanced",
        score: 95,
        note: "Reasons confidently about faces, edges and vertices.",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    displayName: "Kabir Verma",
    classLevel: "7",
    subject: "Maths",
    avgScore: 58,
    testsTaken: 5,
    lastActiveDaysAgo: 4,
    attendance: 95,
    trend: "up",
    pace: "steady",
    teacherNote:
      "Reliable and methodical. Gets stuck when a rule has to be applied backwards, e.g. subtracting a negative or scaling a ratio down.",
    weakAreas: [
      {
        topic: "Integers",
        learningObjective:
          "Students can add and subtract integers using a number line",
        masteryState: "emerging",
        score: 34,
        note: "Treats 5 − (−3) as 5 − 3.",
      },
      {
        topic: "Integers",
        learningObjective: "Students can order and compare negative numbers",
        masteryState: "developing",
        score: 57,
        note: "Orders by magnitude, so −9 lands above −2.",
      },
      {
        topic: "Ratio & Proportion",
        learningObjective: "Students can simplify ratios to their lowest terms",
        masteryState: "developing",
        score: 62,
        note: "Divides by a common factor but rarely the highest one.",
      },
    ],
    strongAreas: [
      {
        topic: "Ratio & Proportion",
        learningObjective: "Students can share a quantity in a given ratio",
        masteryState: "secure",
        score: 88,
        note: "Sets out the parts clearly and checks the total.",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    displayName: "Ishita Rao",
    classLevel: "7",
    subject: "Maths",
    avgScore: 71,
    testsTaken: 6,
    lastActiveDaysAgo: 2,
    attendance: 100,
    trend: "up",
    pace: "fast",
    teacherNote:
      "Well ahead of the class on procedure. Needs stretch and reasoning work rather than re-teaching — gets bored by repetition.",
    weakAreas: [
      {
        topic: "Percentages",
        learningObjective:
          "Students can find a percentage increase or decrease",
        masteryState: "developing",
        score: 61,
        note: "Applies the percentage to the new total instead of the original.",
      },
      {
        topic: "Data Handling",
        learningObjective: "Students can interpret a grouped frequency table",
        masteryState: "developing",
        score: 64,
        note: "Reads values correctly but can't justify which average to use.",
      },
    ],
    strongAreas: [
      {
        topic: "Algebraic Expressions",
        learningObjective:
          "Students can simplify expressions by collecting like terms",
        masteryState: "advanced",
        score: 94,
        note: "Fast and accurate, including with negative coefficients.",
      },
      {
        topic: "Integers",
        learningObjective: "Students can apply the four operations to integers",
        masteryState: "secure",
        score: 86,
        note: "Sign rules are automatic.",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    displayName: "Rohan Mehta",
    classLevel: "8",
    subject: "Maths",
    avgScore: 38,
    testsTaken: 3,
    lastActiveDaysAgo: 11,
    attendance: 65,
    trend: "down",
    pace: "needs support",
    teacherNote:
      "Grade 8 content is sitting on Grade 6 foundations that never set. Needs the prerequisites rebuilt before the current syllabus will stick.",
    weakAreas: [
      {
        topic: "Linear Equations",
        learningObjective:
          "Students can solve linear equations with the unknown on one side",
        masteryState: "not_started",
        score: 12,
        note: "No inverse-operation strategy; tries to guess the answer.",
      },
      {
        topic: "Fractions",
        learningObjective: "Students can multiply and divide fractions",
        masteryState: "emerging",
        score: 27,
        note: "Cross-multiplies whenever two fractions appear.",
      },
      {
        topic: "Percentages",
        learningObjective:
          "Students can convert between fractions, decimals and percentages",
        masteryState: "emerging",
        score: 31,
        note: "Moves the decimal point in the wrong direction.",
      },
    ],
    strongAreas: [
      {
        topic: "Data Handling",
        learningObjective: "Students can read values from a bar chart",
        masteryState: "secure",
        score: 79,
        note: "Careful with scales — a genuine strength to build confidence on.",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    displayName: "Sara Khan",
    classLevel: "8",
    subject: "Maths",
    avgScore: 64,
    testsTaken: 5,
    lastActiveDaysAgo: 6,
    attendance: 85,
    trend: "flat",
    pace: "steady",
    teacherNote:
      "Plateaued for a month. Accurate on single-step questions, falls apart when a problem needs two steps chained together.",
    weakAreas: [
      {
        topic: "Linear Equations",
        learningObjective:
          "Students can solve equations with brackets and unknowns on both sides",
        masteryState: "emerging",
        score: 35,
        note: "Expands brackets correctly, then loses track of the sign.",
      },
      {
        topic: "Mensuration",
        learningObjective: "Students can find the area of compound 2D shapes",
        masteryState: "developing",
        score: 54,
        note: "Splits the shape well but reuses a shared side length twice.",
      },
    ],
    strongAreas: [
      {
        topic: "Ratio & Proportion",
        learningObjective: "Students can solve direct proportion problems",
        masteryState: "secure",
        score: 82,
        note: "Unitary method is secure.",
      },
      {
        topic: "Mensuration",
        learningObjective: "Students can find the area of a triangle",
        masteryState: "secure",
        score: 84,
        note: "Picks the correct perpendicular height every time.",
      },
    ],
  },
];

export function getDemoStudent(id: string): DemoStudentProfile | undefined {
  return DEMO_STUDENT_PROFILES.find((student) => student.id === id);
}

export function demoStudentOption(
  profile: DemoStudentProfile,
): PlanStudentOption {
  return {
    id: profile.id,
    displayName: profile.displayName,
    classLevel: profile.classLevel,
  };
}

/** The builder's progress card reads the same shape the DB path produced. */
export function demoSnapshot(profile: DemoStudentProfile): PlanSnapshot {
  const toArea = (signal: DemoTopicSignal) => ({
    learningObjective: signal.learningObjective,
    topic: signal.topic,
    masteryState: signal.masteryState,
    score: signal.score,
  });
  return {
    totalTests: profile.testsTaken,
    avgScore: profile.avgScore,
    lastActive: new Date(
      Date.now() - profile.lastActiveDaysAgo * 86_400_000,
    ).toISOString(),
    weakAreas: profile.weakAreas.map(toArea),
    strongAreas: profile.strongAreas.map(toArea),
  };
}
