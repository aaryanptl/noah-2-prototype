ALTER TABLE public.diagnostic_assessments
  DROP CONSTRAINT IF EXISTS diagnostic_assessments_test_mode_check;

ALTER TABLE public.diagnostic_assessments
  ADD CONSTRAINT diagnostic_assessments_test_mode_check CHECK (
    test_mode IN (
      'topic',
      'multi_topic',
      'grade',
      'recurring',
      'placement',
      'solo'
    )
  );

ALTER TABLE public.diagnostic_assessments
  DROP CONSTRAINT IF EXISTS diagnostic_assessments_topic_mode_check;

ALTER TABLE public.diagnostic_assessments
  ADD CONSTRAINT diagnostic_assessments_topic_mode_check CHECK (
    (
      test_mode IN ('topic', 'placement', 'recurring', 'solo')
      AND topic IS NOT NULL
    )
    OR (test_mode IN ('multi_topic', 'grade') AND topic IS NULL)
  );
