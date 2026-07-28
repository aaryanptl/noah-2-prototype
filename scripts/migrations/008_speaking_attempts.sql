CREATE TABLE IF NOT EXISTS public.speaking_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_name text NOT NULL DEFAULT 'anonymous',
  practice_id text NOT NULL,
  transcript text NOT NULL,
  was_moderated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS speaking_attempts_child_practice_idx
  ON public.speaking_attempts (child_name, practice_id, created_at DESC);
