// Emits a one-row Web Dev content-bank CSV for the coding agent.
// The entire interactive challenge lives in the `payload` column as JSON;
// `options` stays empty (code challenges have no MCQ choices).
//
//   node agents/content-generation-coding/scripts/write-sample-csv.mjs
//
// This is a hand-authored fixture that mirrors what the real generator will
// emit, so the coding-agent page can render straight from a CSV bank.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = "agents/content-generation-coding/output";
const FILE_NAME = "content-bank-webdev-sample.csv";

// ── The interactive challenge (one content item) ──
const payload = {
  questionType: "code_challenge",
  title: "Write Your Article Intro",
  lesson: "L1 · HTML Foundations · Document Structure",
  desc: "Build the top of a blog article. Add an <code>&lt;h1&gt;</code> title, an <code>&lt;h2&gt;</code> subtitle, and <strong>two</strong> <code>&lt;p&gt;</code> paragraphs below it. This is the heading-and-paragraph skeleton every article uses.",
  startFile: "html",
  goals: [
    {
      id: "has-h1",
      label: "Has one <h1> title",
      target: "html",
      kind: "regex",
      rule: "<h1[\\s>]",
      flags: "i",
      minCount: 1,
    },
    {
      id: "has-h2",
      label: "Has an <h2> subtitle",
      target: "html",
      kind: "regex",
      rule: "<h2[\\s>]",
      flags: "i",
      minCount: 1,
    },
    {
      id: "two-paras",
      label: "Has at least 2 paragraphs",
      target: "html",
      kind: "regex",
      rule: "<p[\\s>]",
      flags: "ig",
      minCount: 2,
    },
  ],
  targetHtml:
    "<h1>My First Blog Post</h1>\n<h2>Why I started writing</h2>\n<p>Welcome to my very first article. 🎉</p>\n<p>Today I want to share why I picked up writing.</p>",
  targetSub: "A title, a subtitle, and two short paragraphs.",
  visualMatchThreshold: 90,
  files: {
    guide: {
      html: "<!-- h1 is the main title — one per page. -->\n<h1>My First Blog Post</h1>\n\n<!-- h2 is a subtitle / section heading. -->\n<h2>Why I started writing</h2>\n\n<!-- Each <p> is one paragraph. The browser\n     adds space between them automatically. -->\n<p>Welcome to my very first article. 🎉</p>\n<p>Today I want to share why I picked up writing.</p>",
      css: "/* No styles needed — HTML defaults are fine. */",
      js: "// No JavaScript for this one.",
    },
    pair: {
      html: "<h1>My First Blog Post</h1>\n<h2>Why I started writing</h2>\n\n<!-- 👈 YOUR CODE:\n     Add two <p> paragraphs below the headings. -->\n",
      css: "/* Empty */",
      js: "// Empty",
    },
    solo: { html: "", css: "", js: "" },
  },
  solution: {
    html: "<h1>My First Blog Post</h1>\n<h2>Why I started writing</h2>\n<p>Welcome to my very first article. 🎉</p>\n<p>Today I want to share why I picked up writing.</p>",
    css: "",
    js: "",
  },
  hints: [
    {
      tier: "nudge",
      text: "The big title is <h1>, a smaller heading is <h2>.",
    },
    {
      tier: "approach",
      text: "Below the headings, add two separate <p>...</p> lines.",
    },
  ],
  review: [
    {
      type: "good",
      text: "Clean structure — one <code>h1</code>, one <code>h2</code>, and two <code>p</code> tags. That's the article skeleton! 🎉",
    },
    {
      type: "tip",
      text: "Try wrapping it all in an <code>&lt;article&gt;</code> tag later — it's the semantic home for a post.",
    },
  ],
  blooms_level: "Applying",
  difficulty_level: "easy",
  difficulty_rating: 2,
  metadata: {
    subject: "Web Development",
    courseLevel: "Level 1",
    module: "HTML Foundations",
    topic: "Introduction to Web Development",
    topicType: "Concept",
    topicFamily: "HTML Document Structure",
    subtopic: "How to create paragraphs",
    learning_objective:
      "Code a webpage that uses paragraph (<p>) and heading tags",
    bloomsVerb: "Code",
    cognitiveTier: "Lower-Order",
    skillArea: "html",
  },
};

const generationMetadata = {
  version: "v1",
  source: "syllabus/coding-subjects-syllabus.xlsx#Web Dev",
  course: "Web Development",
  courseLevel: "Level 1",
  module: "HTML Foundations",
};

// ── Row in the content-bank (coding-flavoured headers) ──
const headers = [
  "rowNumber",
  "queueId",
  "questionNumber",
  "questionType",
  "questionText",
  "subject",
  "courseLevel",
  "module",
  "topic",
  "subtopic",
  "learningObjective",
  "bloomsLevel",
  "difficultyLevel",
  "difficultyRating",
  "summary",
  "options",
  "payload",
  "generationMetadata",
];

const row = {
  rowNumber: 1,
  queueId: "webdev-L1-html-foundations-0001",
  questionNumber: "Q1",
  questionType: "code_challenge",
  questionText: "Write Your Article Intro",
  subject: "Web Development",
  courseLevel: "Level 1",
  module: "HTML Foundations",
  topic: "Introduction to Web Development",
  subtopic: "How to create paragraphs",
  learningObjective:
    "Code a webpage that uses paragraph (<p>) and heading tags",
  bloomsLevel: "Applying",
  difficultyLevel: "easy",
  difficultyRating: 2,
  summary:
    "Build an article header: an h1 title, an h2 subtitle, and two paragraphs.",
  options: "[]",
  payload: JSON.stringify(payload),
  generationMetadata: JSON.stringify(generationMetadata),
};

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const normalized = String(value);
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

const csv = [
  headers.join(","),
  headers.map((header) => escapeCsvValue(row[header])).join(","),
].join("\n");

const absoluteDir = path.join(process.cwd(), OUTPUT_DIR);
mkdirSync(absoluteDir, { recursive: true });
const outputPath = path.join(absoluteDir, FILE_NAME);
writeFileSync(outputPath, csv, "utf8");
console.log(`Wrote ${outputPath}`);
