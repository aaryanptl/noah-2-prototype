import { query } from "@/lib/db";

export interface GlobalAnalytics {
  totalStudents: number;
  totalAssessments: number;
  averageScore: number;
  subjectBreakdown: { name: string; value: number }[];
  activityTimeline: { name: string; value: number }[];
  globalFocusAreas: { learningObjective: string; count: number }[];
  testModeStats: { mode: string; count: number; avgScore: number }[];
}

export async function getGlobalAnalytics(): Promise<GlobalAnalytics> {
  const [
    studentsCountRes,
    assessmentsAggRes,
    subjectRes,
    timelineRes,
    focusAreasRes,
    testModeRes
  ] = await Promise.all([
    // Total students
    query(`SELECT COUNT(*) as count FROM diagnostic_students`),
    
    // Total assessments and average score
    query(`
      SELECT 
        COUNT(*) as count, 
        AVG(COALESCE(overall_readiness_score, attempted_readiness_score, 0)) as avg_score 
      FROM diagnostic_assessments
    `),

    // Subject breakdown
    query(`
      SELECT subject as name, COUNT(*)::int as value 
      FROM diagnostic_assessments 
      GROUP BY subject
    `),

    // Activity timeline (last 7 days, for a clean bar chart)
    query(`
      SELECT 
        TO_CHAR(submitted_at, 'Mon DD') as name, 
        COUNT(*)::int as value 
      FROM diagnostic_assessments 
      GROUP BY TO_CHAR(submitted_at, 'Mon DD')
      ORDER BY MIN(submitted_at) DESC
      LIMIT 7
    `),

    // Global Focus Areas (weakest LOs across platform)
    query(`
      SELECT 
        obj->>'learningObjective' as learning_objective,
        COUNT(*)::int as count
      FROM diagnostic_assessments,
      jsonb_array_elements(learning_objective_results) as obj
      WHERE obj->>'masteryState' = 'needs_teaching'
      GROUP BY obj->>'learningObjective'
      ORDER BY count DESC
      LIMIT 10
    `),

    // Stats grouped by test mode
    query(`
      SELECT 
        test_mode as mode,
        COUNT(*)::int as count,
        AVG(COALESCE(overall_readiness_score, attempted_readiness_score, 0)) as avg_score
      FROM diagnostic_assessments
      GROUP BY test_mode
    `)
  ]);

  return {
    totalStudents: parseInt(studentsCountRes.rows[0]?.count || '0'),
    totalAssessments: parseInt(assessmentsAggRes.rows[0]?.count || '0'),
    averageScore: Math.round(parseFloat(assessmentsAggRes.rows[0]?.avg_score || '0')),
    subjectBreakdown: subjectRes.rows,
    // Reverse timeline so oldest is first in the chart
    activityTimeline: timelineRes.rows.reverse(),
    globalFocusAreas: focusAreasRes.rows.map(r => ({
      learningObjective: r.learning_objective,
      count: r.count
    })),
    testModeStats: testModeRes.rows.map(r => ({
      mode: r.mode,
      count: r.count,
      avgScore: Math.round(parseFloat(r.avg_score || '0'))
    }))
  };
}
