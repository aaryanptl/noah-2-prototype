import { z } from "zod";

// Coding content is built around ONE interactive challenge per learning
// objective — not the mcq/fitb/drag_drop packs the math/english agents emit.
// Each item maps directly onto the WebLab runtime (CodingChallenge) and grades
// itself through self-describing goal checks.

export const questionTypeEnumSchema = z.enum(["code_challenge"]);

// The Web Dev syllabus uses these exact Bloom labels.
export const bloomsLevelSchema = z.enum([
  "Remembering",
  "Understanding",
  "Applying",
  "Analyzing",
  "Evaluating",
  "Creating",
]);

export const difficultyLevelSchema = z.enum(["easy", "medium", "hard"]);
export const cognitiveTierSchema = z.enum(["Lower-Order", "Higher-Order"]);
export const skillAreaSchema = z.enum(["html", "css", "js", "mixed"]);
export const fileSchema = z.enum(["html", "css", "js"]);

export const nonEmptyStringSchema = z.string().trim().min(1);

// ── Metadata: aligned to the Web Dev syllabus columns ──
export const generationMetadataSchema = z.object({
  subject: nonEmptyStringSchema, // "Web Development"
  courseLevel: nonEmptyStringSchema, // "Level 1" | "Level 2" | "Level 3"
  module: nonEmptyStringSchema, // "HTML Foundations"
  topic: nonEmptyStringSchema, // "Introduction to Web Development"
  topicType: nonEmptyStringSchema, // "Concept" | "Mini Project" | "Capstone" ...
  topicFamily: z.string().trim().default(""), // "HTML Document Structure"
  subtopic: nonEmptyStringSchema, // = syllabus "Sub Topic"
  learning_objective: nonEmptyStringSchema,
  bloomsVerb: z.string().trim().default(""), // "Code", "Apply", "Define"
  cognitiveTier: cognitiveTierSchema,
  skillArea: skillAreaSchema,
});

// ── The three editor buffers a challenge works with ──
export const fileBufferSchema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
});

// ── Self-describing goal check (replaces the runtime's hardcoded dictionary) ──
// Stored flat; the runtime/loader nests it under `check`. Every field is
// required so OpenAI structured output stays happy.
export const goalCheckSchema = z.object({
  id: nonEmptyStringSchema, // "has-h1"
  label: nonEmptyStringSchema, // "Has an <h1> heading"
  target: fileSchema, // which buffer to test
  kind: z.enum(["regex", "css_declaration", "js_includes"]),
  rule: nonEmptyStringSchema, // regex source tested against the target buffer
  flags: nonEmptyStringSchema, // e.g. "i" or "ig"
  minCount: z.coerce.number().int().min(1), // ≥2 → needs two matches
});

export const hintSchema = z.object({
  tier: z.enum(["nudge", "approach"]),
  text: nonEmptyStringSchema,
});

export const reviewNoteSchema = z.object({
  type: z.enum(["good", "tip"]),
  text: nonEmptyStringSchema,
});

// One step of the guide-mode walkthrough. `code` is the cumulative content of
// the START file shown at this step; `explain` is the teaching popup. The model
// groups the solution into a few logical steps (not one per line).
export const guideStepSchema = z.object({
  explain: nonEmptyStringSchema, // friendly one-sentence popup for this step
  label: nonEmptyStringSchema, // 2-4 word step title (e.g. "Add the heading")
  code: z.string(), // cumulative start-file code visible after this step
});

// ── What the generator agent returns for one challenge ──
// Metadata is attached afterward from the syllabus row, so it is not part of the
// model's output (keeps the structured-output schema focused and deterministic).
export const codeChallengeDraftSchema = z.object({
  title: nonEmptyStringSchema, // "Your First Web Page"
  lesson: nonEmptyStringSchema, // "L1 · HTML Foundations"
  desc: nonEmptyStringSchema, // prompt; simple inline HTML (<code>) allowed
  startFile: fileSchema,
  goals: z.array(goalCheckSchema).min(1).max(5),
  targetHtml: nonEmptyStringSchema, // rendered target for the visual match panel
  targetSub: nonEmptyStringSchema, // caption under the target preview
  files: z.object({
    guide: fileBufferSchema, // fully worked, commented
    pair: fileBufferSchema, // partial — student fills the gap
    solo: fileBufferSchema, // empty buffers — from scratch
  }),
  solution: fileBufferSchema, // canonical answer (must pass every goal check)
  hints: z.array(hintSchema).min(2).max(4),
  review: z.array(reviewNoteSchema).min(2).max(4),
  // Guide-mode walkthrough: 3-5 logical steps that progressively build the
  // start-file solution, each with a popup explanation.
  guideSteps: z.array(guideStepSchema).min(2).max(6),
  blooms_level: bloomsLevelSchema,
  difficulty_level: difficultyLevelSchema,
  difficulty_rating: z.coerce.number().min(1).max(5),
});

// The full content item = the agent draft + syllabus-sourced metadata.
export const codeChallengeItemSchema = codeChallengeDraftSchema.extend({
  questionType: questionTypeEnumSchema.default("code_challenge"),
  visualMatchThreshold: z.coerce.number().min(0).max(100).default(90),
  metadata: generationMetadataSchema,
});

// ── Optional quality review pass ──
export const reviewDecisionSchema = z.object({
  status: z.enum(["approved", "needs_revision"]),
  reasons: z.array(nonEmptyStringSchema).default([]),
  solutions: z.array(nonEmptyStringSchema).default([]),
});

// ── The content-bank CSV row (coding-flavoured columns; challenge in payload) ──
export const csvRowSchema = z.object({
  rowNumber: z.coerce.number().int().min(1).optional(),
  queueId: nonEmptyStringSchema,
  questionNumber: nonEmptyStringSchema,
  questionType: questionTypeEnumSchema,
  questionText: nonEmptyStringSchema, // = challenge title, for human scanning
  subject: nonEmptyStringSchema,
  courseLevel: nonEmptyStringSchema,
  module: nonEmptyStringSchema,
  topic: nonEmptyStringSchema,
  subtopic: nonEmptyStringSchema,
  learningObjective: nonEmptyStringSchema,
  bloomsLevel: bloomsLevelSchema,
  difficultyLevel: difficultyLevelSchema,
  difficultyRating: z.coerce.number().int().min(1).max(5),
  summary: nonEmptyStringSchema,
  // Code challenges have no MCQ choices; always empty.
  options: z.array(z.unknown()).default([]),
  // The entire interactive challenge object (codeChallengeItemSchema).
  payload: z.record(z.string(), z.unknown()),
  generationMetadata: z.record(z.string(), z.unknown()),
});

export type GenerationMetadata = z.infer<typeof generationMetadataSchema>;
export type GoalCheck = z.infer<typeof goalCheckSchema>;
export type FileBuffer = z.infer<typeof fileBufferSchema>;
export type CodeChallengeDraft = z.infer<typeof codeChallengeDraftSchema>;
export type CodeChallengeItem = z.infer<typeof codeChallengeItemSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type CsvRow = z.infer<typeof csvRowSchema>;
