import type {
  CurriculumTopic,
  DemoStudent,
  LearningObjective,
  QuestionGuideline,
} from "@/lib/learning-plan/types"

function objective(
  topicId: number,
  key: string,
  subtopic: string,
  text: string
): LearningObjective {
  return {
    id: `${topicId}-${key}`,
    subtopic,
    text,
  }
}

export const curriculumTopics: CurriculumTopic[] = [
  {
    id: 313,
    sequence: 1,
    name: "Number Sense & Operations",
    family: "Number Sense",
    priority: "high",
    prerequisiteIds: [],
    idealClasses: 5,
    idealActivities: 20,
    easyPercent: 60,
    practicePercent: 40,
    reason:
      "Foundational for the whole year; order of operations is needed again in Algebra.",
    learningObjectives: [
      objective(
        313,
        "large-numbers",
        "Large Numbers",
        "Read, write, and work with numbers up to 10 million"
      ),
      objective(
        313,
        "estimation",
        "Large Numbers",
        "Use estimation strategies to check the reasonableness of calculations"
      ),
      objective(
        313,
        "order-operations",
        "Order of Operations",
        "Apply the correct order of operations to evaluate expressions"
      ),
      objective(
        313,
        "brackets",
        "Order of Operations",
        "Use brackets to change the order of evaluation"
      ),
    ],
  },
  {
    id: 314,
    sequence: 2,
    name: "Multi-Digit Operations",
    family: "Multiplication & Division",
    priority: "high",
    prerequisiteIds: [313],
    idealClasses: 6,
    idealActivities: 24,
    easyPercent: 60,
    practicePercent: 40,
    reason:
      "Long division consistently needs the most teaching and practice time at this grade.",
    learningObjectives: [
      objective(
        314,
        "multiplication-standard",
        "Multi-Digit Multiplication",
        "Multiply 4-digit numbers by 2-digit numbers using the standard algorithm"
      ),
      objective(
        314,
        "multiplication-problems",
        "Multi-Digit Multiplication",
        "Apply multiplication to solve real-world problems"
      ),
      objective(
        314,
        "long-division",
        "Long Division",
        "Divide up to 4-digit numbers by 2-digit divisors"
      ),
      objective(
        314,
        "remainders",
        "Long Division",
        "Interpret remainders and express them as fractions or decimals"
      ),
    ],
  },
  {
    id: 315,
    sequence: 3,
    name: "Factors, Multiples & Primes",
    family: "Number Theory",
    priority: "high",
    prerequisiteIds: [314],
    idealClasses: 6,
    idealActivities: 25,
    easyPercent: 60,
    practicePercent: 40,
    reason:
      "HCF/LCM must be secure before adding fractions with unlike denominators.",
    learningObjectives: [
      objective(
        315,
        "hcf",
        "HCF & LCM",
        "Find the highest common factor of two or more numbers"
      ),
      objective(
        315,
        "lcm",
        "HCF & LCM",
        "Find the lowest common multiple of two or more numbers"
      ),
      objective(
        315,
        "hcf-lcm-problems",
        "HCF & LCM",
        "Apply HCF and LCM to solve real-world problems"
      ),
      objective(
        315,
        "prime-factors",
        "Prime Factorisation",
        "Express a number as a product of its prime factors"
      ),
      objective(
        315,
        "factor-trees",
        "Prime Factorisation",
        "Use factor trees and index notation"
      ),
    ],
  },
  {
    id: 321,
    sequence: 4,
    name: "Data Analysis",
    family: "Data & Statistics",
    priority: "medium",
    prerequisiteIds: [],
    idealClasses: 5,
    idealActivities: 16,
    easyPercent: 65,
    practicePercent: 35,
    reason:
      "Placed early as a lighter topic between two heavy number blocks to maintain engagement.",
    learningObjectives: [
      objective(
        321,
        "graphs",
        "Graphs & Charts",
        "Read and construct line graphs, pie charts, and bar charts"
      ),
      objective(
        321,
        "choose-graph",
        "Graphs & Charts",
        "Choose an appropriate graph type for a given data set"
      ),
      objective(
        321,
        "mean",
        "Mean, Median & Mode",
        "Calculate the mean of a data set"
      ),
      objective(
        321,
        "median-mode",
        "Mean, Median & Mode",
        "Identify the median and mode of a data set"
      ),
    ],
  },
  {
    id: 316,
    sequence: 5,
    name: "Fraction Arithmetic",
    family: "Fractions",
    priority: "high",
    prerequisiteIds: [315],
    idealClasses: 8,
    idealActivities: 30,
    easyPercent: 55,
    practicePercent: 45,
    reason:
      "Core Grade 5 concept with six objectives including fraction division; students need the most support here.",
    learningObjectives: [
      objective(
        316,
        "common-denominator",
        "Adding & Subtracting Unlike Fractions",
        "Find a common denominator to add and subtract fractions"
      ),
      objective(
        316,
        "mixed-numbers",
        "Adding & Subtracting Unlike Fractions",
        "Add and subtract mixed numbers with unlike denominators"
      ),
      objective(
        316,
        "multiply-fractions",
        "Multiplying Fractions",
        "Multiply a fraction by a whole number and a fraction by a fraction"
      ),
      objective(
        316,
        "multiply-problems",
        "Multiplying Fractions",
        "Solve word problems involving multiplication of fractions"
      ),
      objective(
        316,
        "divide-fractions",
        "Dividing Fractions",
        "Divide a unit fraction by a whole number and a whole number by a unit fraction"
      ),
      objective(
        316,
        "division-diagrams",
        "Dividing Fractions",
        "Represent and solve fraction division using diagrams"
      ),
    ],
  },
  {
    id: 317,
    sequence: 6,
    name: "Decimal Arithmetic",
    family: "Decimals",
    priority: "high",
    prerequisiteIds: [316],
    idealClasses: 6,
    idealActivities: 22,
    easyPercent: 60,
    practicePercent: 40,
    reason:
      "Builds directly on fraction understanding; decimal operations are heavily used in later topics.",
    learningObjectives: [
      objective(
        317,
        "add-subtract",
        "Adding & Subtracting Decimals",
        "Add and subtract decimals up to three decimal places"
      ),
      objective(
        317,
        "align-points",
        "Adding & Subtracting Decimals",
        "Align decimal points and apply the standard algorithm"
      ),
      objective(
        317,
        "multiply",
        "Multiplying & Dividing Decimals",
        "Multiply decimals by whole numbers and other decimals"
      ),
      objective(
        317,
        "divide",
        "Multiplying & Dividing Decimals",
        "Divide decimals by whole numbers and interpret the result"
      ),
    ],
  },
  {
    id: 319,
    sequence: 7,
    name: "2D & 3D Geometry",
    family: "Geometry",
    priority: "medium",
    prerequisiteIds: [],
    idealClasses: 5,
    idealActivities: 16,
    easyPercent: 65,
    practicePercent: 35,
    reason:
      "A visual topic that gives students a break after the fractions and decimals block.",
    learningObjectives: [
      objective(
        319,
        "classify-shapes",
        "Properties of 2D Shapes",
        "Classify triangles and quadrilaterals by properties"
      ),
      objective(
        319,
        "missing-angles",
        "Properties of 2D Shapes",
        "Find missing angles in triangles and quadrilaterals"
      ),
      objective(
        319,
        "prisms-pyramids",
        "3D Shapes",
        "Identify and describe prisms and pyramids by their properties"
      ),
      objective(319, "nets", "3D Shapes", "Draw nets of common 3D shapes"),
    ],
  },
  {
    id: 320,
    sequence: 8,
    name: "Perimeter, Area & Measurement",
    family: "Measurement",
    priority: "high",
    prerequisiteIds: [317, 319],
    idealClasses: 7,
    idealActivities: 25,
    easyPercent: 60,
    practicePercent: 40,
    reason:
      "Volume and area are key Grade 5 outcomes; calculations require decimals and shape knowledge.",
    learningObjectives: [
      objective(
        320,
        "area-polygons",
        "Area of Polygons",
        "Calculate the area of triangles, parallelograms, and composite shapes"
      ),
      objective(
        320,
        "area-problems",
        "Area of Polygons",
        "Solve problems involving area in real-world contexts"
      ),
      objective(
        320,
        "volume",
        "Volume",
        "Calculate the volume of rectangular prisms using a formula"
      ),
      objective(320, "capacity", "Volume", "Relate volume to capacity"),
      objective(
        320,
        "convert-units",
        "Unit Conversion",
        "Convert between metric and, where applicable, imperial units"
      ),
      objective(
        320,
        "select-units",
        "Unit Conversion",
        "Select appropriate units for a given measurement context"
      ),
    ],
  },
  {
    id: 582,
    sequence: 9,
    name: "Algebraic Expressions",
    family: "Patterns & Algebra",
    priority: "high",
    prerequisiteIds: [313],
    idealClasses: 5,
    idealActivities: 20,
    easyPercent: 60,
    practicePercent: 40,
    reason:
      "A bridge to middle school maths that depends on a strong grasp of order of operations.",
    learningObjectives: [
      objective(
        582,
        "write-expressions",
        "Writing & Simplifying Expressions",
        "Write algebraic expressions from word descriptions"
      ),
      objective(
        582,
        "simplify",
        "Writing & Simplifying Expressions",
        "Simplify expressions by collecting like terms"
      ),
      objective(
        582,
        "substitute",
        "Evaluating Expressions",
        "Substitute values into expressions and evaluate them"
      ),
      objective(
        582,
        "compare",
        "Evaluating Expressions",
        "Compare expressions and determine when they are equal"
      ),
    ],
  },
  {
    id: 589,
    sequence: 10,
    name: "Geometric Transformations",
    family: "Geometry",
    priority: "medium",
    prerequisiteIds: [319],
    idealClasses: 4,
    idealActivities: 14,
    easyPercent: 65,
    practicePercent: 35,
    reason:
      "Coordinate-grid work; a shorter topic because the concepts are visual and quickly grasped.",
    learningObjectives: [
      objective(
        589,
        "reflect",
        "Reflections & Rotations",
        "Reflect shapes in a given mirror line"
      ),
      objective(
        589,
        "rotate",
        "Reflections & Rotations",
        "Rotate shapes through 90, 180, and 270 degrees"
      ),
      objective(
        589,
        "translate",
        "Translations",
        "Translate shapes on a coordinate grid"
      ),
      objective(
        589,
        "describe-translation",
        "Translations",
        "Describe a translation using direction and distance"
      ),
    ],
  },
  {
    id: 585,
    sequence: 11,
    name: "Theoretical & Experimental Probability",
    family: "Probability",
    priority: "medium",
    prerequisiteIds: [316],
    idealClasses: 4,
    idealActivities: 14,
    easyPercent: 65,
    practicePercent: 35,
    reason:
      "Probabilities are expressed as fractions, so fraction skills must come first.",
    learningObjectives: [
      objective(
        585,
        "simple-events",
        "Theoretical Probability",
        "Calculate the probability of simple events as a fraction, decimal, or percentage"
      ),
      objective(
        585,
        "sample-space",
        "Theoretical Probability",
        "List all outcomes using a sample space"
      ),
      objective(
        585,
        "experiments",
        "Experimental Probability",
        "Conduct probability experiments and record results in a frequency table"
      ),
      objective(
        585,
        "compare-results",
        "Experimental Probability",
        "Compare experimental results with theoretical predictions"
      ),
    ],
  },
  {
    id: 404,
    sequence: 12,
    name: "Logical Reasoning",
    family: "Enrichment",
    priority: "medium",
    prerequisiteIds: [],
    idealClasses: 3,
    idealActivities: 10,
    easyPercent: 70,
    practicePercent: 30,
    reason:
      "An enrichment topic that strengthens thinking skills and can be shortened if classes are limited.",
    learningObjectives: [
      objective(
        404,
        "analogies",
        "Analogies & Classification",
        "Complete analogies involving numbers and shapes"
      ),
      objective(
        404,
        "classification",
        "Analogies & Classification",
        "Classify items into groups using logical criteria"
      ),
      objective(
        404,
        "deduce",
        "Logical Deduction",
        "Use given conditions to deduce a correct answer"
      ),
      objective(
        404,
        "multi-step",
        "Logical Deduction",
        "Work through multi-step reasoning problems"
      ),
    ],
  },
  {
    id: 403,
    sequence: 13,
    name: "Vedic Mathematics",
    family: "Enrichment",
    priority: "low",
    prerequisiteIds: [314],
    idealClasses: 2,
    idealActivities: 6,
    easyPercent: 70,
    practicePercent: 30,
    reason:
      "Supplementary speed-maths content; the first topic dropped when classes are limited.",
    learningObjectives: [
      objective(
        403,
        "duplex",
        "Advanced Squaring",
        "Find squares of 2-digit numbers using the Vedic duplex method"
      ),
      objective(
        403,
        "near-base",
        "Advanced Squaring",
        "Apply the Vedic near-base squaring method"
      ),
    ],
  },
]

export const demoStudents: DemoStudent[] = [
  {
    id: "student-a",
    scenario: "A",
    name: "Maya Thompson",
    initials: "MT",
    grade: 5,
    region: "US",
    // Full-year package from workbook: 66 teaching + 13 structural = 79
    classesRemaining: 79,
    placementStatus: "completed",
    placementResults: [
      { topicId: 316, score: 30 },
      { topicId: 314, score: 35 },
      { topicId: 313, score: 85 },
      { topicId: 321, score: 80 },
    ],
    defaultPlacementScore: 60,
    completedTopics: [],
    objectiveEvidence: [],
  },
  {
    id: "student-b",
    scenario: "B",
    name: "Ethan Carter",
    initials: "EC",
    grade: 5,
    region: "US",
    classesRemaining: 79,
    placementStatus: "not-taken",
    placementResults: [],
    completedTopics: [],
    objectiveEvidence: [],
  },
  {
    id: "student-c",
    scenario: "C",
    name: "Aarav Shah",
    initials: "AS",
    grade: 5,
    region: "US",
    classesRemaining: 45,
    placementStatus: "not-applicable",
    placementResults: [],
    completedTopics: [
      { topicId: 313, plannedClasses: 5, actualClasses: 4 },
      { topicId: 314, plannedClasses: 6, actualClasses: 6 },
    ],
    currentTopicId: 315,
    currentTopicClassesUsed: 2,
    objectiveEvidence: [
      {
        learningObjectiveId: "315-hcf",
        level: "starter",
        result: "secure",
        note: "Solves Starter-level HCF questions correctly.",
      },
      {
        learningObjectiveId: "315-lcm",
        level: "starter",
        result: "secure",
        note: "Solves Starter-level LCM questions correctly.",
      },
      {
        learningObjectiveId: "315-hcf-lcm-problems",
        level: "master",
        result: "not-secure",
        note: "Gets Master-level real-world HCF and LCM questions wrong.",
      },
      {
        learningObjectiveId: "315-factor-trees",
        level: "master",
        result: "not-secure",
        note: "Needs support with factor trees and index notation.",
      },
    ],
    questionAttemptEvidence: [
      { topicId: 313, learningObjectiveId: "313-order-operations", level: "starter", correct: 3, attempted: 4, note: "Uses the order-of-operations routine accurately on familiar expressions." },
      { topicId: 313, learningObjectiveId: "313-brackets", level: "master", correct: 1, attempted: 3, note: "Loses track of how brackets change the order in multi-step expressions." },
      { topicId: 315, learningObjectiveId: "315-hcf-lcm-problems", level: "starter", correct: 4, attempted: 4, note: "Finds HCF and LCM correctly when the method is named." },
      { topicId: 315, learningObjectiveId: "315-hcf-lcm-problems", level: "master", correct: 1, attempted: 4, note: "Needs to decide whether an unfamiliar real-world problem calls for HCF or LCM." },
      { topicId: 316, learningObjectiveId: "316-common-denominator", level: "starter", correct: 1, attempted: 4, note: "Still needs fluency finding equivalent fractions and a common denominator." },
      { topicId: 316, learningObjectiveId: "316-common-denominator", level: "master", correct: 3, attempted: 4, note: "Can reason through a supported multi-step fraction task, but the basic routine is not reliable yet." },
    ],
    previousPlanLabel: "Baseline plan · 11 classes completed",
  },
  {
    id: "student-d",
    scenario: "D",
    name: "Sofia Martinez",
    initials: "SM",
    grade: 5,
    region: "US",
    classesRemaining: 79,
    placementStatus: "not-taken",
    placementResults: [],
    completedTopics: [],
    objectiveEvidence: [],
    parentRequestedTopicId: 316,
  },
]

export const questionGuidelines: QuestionGuideline[] = [
  {
    topicId: 316,
    learningObjectiveId: "316-common-denominator",
    starter: "1/4 + 2/4 = ?",
    master:
      "5/6 − 3/8 + 1/4 = ? (three unlike denominators; simplify the answer)",
  },
  {
    topicId: 316,
    learningObjectiveId: "316-mixed-numbers",
    starter: "1½ + 2½ = ?",
    master: "4⅖ − 2¾ = ? (requires borrowing across the whole number)",
  },
  {
    topicId: 316,
    learningObjectiveId: "316-multiply-fractions",
    starter: "½ × 4 = ?",
    master:
      "¾ × ⅚ = ? Then explain why the product is smaller than both fractions.",
  },
  {
    topicId: 316,
    learningObjectiveId: "316-multiply-problems",
    starter: "A recipe needs ½ cup of sugar. How much for 2 recipes?",
    master:
      "A tank is ¾ full. ⅔ of that water is used. What fraction of the full tank was used?",
  },
  {
    topicId: 316,
    learningObjectiveId: "316-divide-fractions",
    starter: "½ ÷ 2 = ?",
    master:
      "How many ¼-litre bottles can be filled from 6 litres, and what does the answer represent?",
  },
  {
    topicId: 316,
    learningObjectiveId: "316-division-diagrams",
    starter: "Shade a diagram to show ½ ÷ 2.",
    master:
      "Draw a model for 3 ÷ ⅕ and write the matching division sentence and answer.",
  },
  {
    topicId: 315,
    learningObjectiveId: "315-hcf",
    starter: "Find the HCF of 8 and 12.",
    master:
      "Find the HCF of 24, 36, and 60, and explain what it tells you about the three numbers.",
  },
  {
    topicId: 315,
    learningObjectiveId: "315-lcm",
    starter: "Find the LCM of 4 and 6.",
    master:
      "Two bells ring every 12 and 18 minutes. They ring together now—after how many minutes will they ring together again?",
  },
  {
    topicId: 315,
    learningObjectiveId: "315-hcf-lcm-problems",
    starter:
      "Ribbons of 6 cm and 9 cm—what is the longest piece that measures both exactly?",
    master:
      "Three ropes of 42 m, 56 m, and 70 m must be cut into equal pieces of the greatest possible length with nothing left over. Find the length and total number of pieces.",
  },
  {
    topicId: 315,
    learningObjectiveId: "315-prime-factors",
    starter: "Write 12 as a product of prime factors.",
    master:
      "Write 360 as a product of prime factors in index notation, and use it to say whether 360 is divisible by 27.",
  },
  {
    topicId: 315,
    learningObjectiveId: "315-factor-trees",
    starter: "Complete a factor tree for 18.",
    master:
      "Complete two different factor trees for 48 and explain why both end with the same prime factors.",
  },
  {
    topicId: 313,
    learningObjectiveId: "313-large-numbers",
    starter: "Write 4,205,000 in words.",
    master:
      "Write ‘seven million forty thousand and nine’, then increase it by 100,000.",
  },
  {
    topicId: 313,
    learningObjectiveId: "313-estimation",
    starter: "Estimate 298 + 512 by rounding to hundreds.",
    master:
      "A student says 4,890 × 21 ≈ 10,000. Is that reasonable? Estimate properly and explain the error.",
  },
  {
    topicId: 313,
    learningObjectiveId: "313-order-operations",
    starter: "12 + 3 × 2 = ?",
    master: "36 ÷ (2 + 4) × 3 − 5 = ?",
  },
  {
    topicId: 313,
    learningObjectiveId: "313-brackets",
    starter: "Solve (5 + 3) × 2 and 5 + 3 × 2. Why do they differ?",
    master: "Insert brackets to make this true: 4 + 8 ÷ 2 × 3 = 18.",
  },
]

export const topicById = new Map(
  curriculumTopics.map((topic) => [topic.id, topic])
)
