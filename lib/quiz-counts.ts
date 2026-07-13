import type { ClassLevel, DifficultyBand } from "@/agents/diagnostic/types";

export const TOPIC_QUESTIONS_PER_LEARNING_OBJECTIVE = 3;

export const GRADE_TEST_PLANS: Record<
  ClassLevel,
  {
    total: number;
    difficultyTargets: Record<DifficultyBand, number>;
  }
> = {
  classKG: { total: 15, difficultyTargets: { easy: 3, medium: 5, hard: 7 } },
  class1: { total: 15, difficultyTargets: { easy: 3, medium: 5, hard: 7 } },
  class2: { total: 18, difficultyTargets: { easy: 4, medium: 6, hard: 8 } },
  class3: { total: 20, difficultyTargets: { easy: 4, medium: 7, hard: 9 } },
  class4: { total: 22, difficultyTargets: { easy: 5, medium: 7, hard: 10 } },
  class5: { total: 25, difficultyTargets: { easy: 6, medium: 8, hard: 11 } },
  class6: { total: 25, difficultyTargets: { easy: 6, medium: 8, hard: 11 } },
  class7: { total: 30, difficultyTargets: { easy: 7, medium: 10, hard: 13 } },
  class8: { total: 30, difficultyTargets: { easy: 7, medium: 10, hard: 13 } },
};

export function getTopicTestQuestionCount(learningObjectiveCount: number) {
  return Math.min(
    12,
    Math.max(0, learningObjectiveCount) *
      TOPIC_QUESTIONS_PER_LEARNING_OBJECTIVE,
  );
}

export function getGradeTestPlan(classLevel: ClassLevel) {
  return GRADE_TEST_PLANS[classLevel];
}

export function getValidMultiTopicQuestionCounts(topicCount: number) {
  if (topicCount < 1 || topicCount > 5) return [];

  return Array.from({ length: 21 }, (_, index) => index + 10).filter(
    (total) => total % topicCount === 0,
  );
}
