BEGIN;

-- 1. Create a temporary table mapping each student to their "primary" ID
-- We choose the row with the most recent updated_at as the primary record
CREATE TEMP TABLE student_mapping AS
WITH ranked_students AS (
  SELECT 
    id,
    normalized_name,
    ROW_NUMBER() OVER (PARTITION BY normalized_name ORDER BY updated_at DESC) as rank
  FROM public.diagnostic_students
)
SELECT 
  s.id as old_id,
  p.id as primary_id
FROM ranked_students s
JOIN ranked_students p ON s.normalized_name = p.normalized_name AND p.rank = 1
WHERE s.rank > 1;

-- 2. Update diagnostic_assessments to point to the primary ID
UPDATE public.diagnostic_assessments a
SET student_id = m.primary_id
FROM student_mapping m
WHERE a.student_id = m.old_id;

-- 3. Delete the redundant student records
DELETE FROM public.diagnostic_students
WHERE id IN (SELECT old_id FROM student_mapping);

-- 4. Drop the old unique index that includes class_level
DROP INDEX IF EXISTS public.diagnostic_students_normalized_name_class_level_idx;

-- 5. Create the new unique index strictly on normalized_name
CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_students_normalized_name_idx
  ON public.diagnostic_students (normalized_name);

COMMIT;
