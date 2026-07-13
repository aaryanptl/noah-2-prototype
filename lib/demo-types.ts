import type {
  ClassLevel,
  DiagnosticRegion,
  DiagnosticReport,
  QuestionBankQuestion,
  Subject,
  TestMode,
} from "../agents/diagnostic/types/index";

export interface DemoQuizCatalogEntry {
  subject: Subject;
  classLevel: ClassLevel;
  topic: string;
  learningObjectives: string[];
  questionCount: number;
}

export interface DemoQuizCatalog {
  entries: DemoQuizCatalogEntry[];
}

export interface CreateSessionInput {
  studentId: string;
  testMode: TestMode;
  subject: Subject;
  classLevel: ClassLevel;
  topic: string;
  topics?: string[];
  maxQuestions: number;
  region?: DiagnosticRegion;
}

export type DemoQuizQuestion = Omit<
  QuestionBankQuestion,
  | "correctAnswer"
  | "modelAnswer"
  | "minimumCorrect"
  | "expectedUnit"
  | "wordProblemStyle"
  | "payload"
> & {
  payload?: Record<string, unknown>;
};

export interface DemoLoadedQuiz {
  studentId: string;
  testMode: TestMode;
  subject: Subject;
  classLevel: ClassLevel;
  topic: string | null;
  selectedTopics?: string[];
  expectedLearningObjectives: string[];
  topicsInGrade?: string[];
  maxQuestions: number;
  region?: DiagnosticRegion;
  gradeTargets?: Record<string, number>;
  questions: DemoQuizQuestion[];
  parentAssessmentId?: string;
}

export interface DemoQuizAnswerSubmission {
  questionId: string;
  answer: string;
}

export interface DemoQuizLoadResponse {
  quiz: DemoLoadedQuiz;
}

export interface DemoQuizSubmitResponse {
  report: DiagnosticReport;
  assessmentId?: string;
  studentDbId?: string;
}
