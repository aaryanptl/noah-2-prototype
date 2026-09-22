# Mastery analysis (copied from noah-content-cli)

Reports on real student data that back the mastery-learning / personalisation flow.
Scripts read the production replica via `MAIN_DATABASE_READ_ONLY_URL` (add it to `.env.local`)
and must be run from the repo root:

```
node scripts/mastery-analysis/build-mastery-demo.mjs               # -> docs/mastery-analysis/mastery-learning-real-data.html
node scripts/mastery-analysis/build-performance-audit.mjs          # -> docs/mastery-analysis/student-performance-mastery-analysis.html + output/analysis/performance-mastery-audit.json
node scripts/mastery-analysis/build-student-score-progression.mjs  # -> docs/mastery-analysis/student-score-progression.html
node scripts/mastery-analysis/analyze-score-patterns.mjs           # -> output/analysis/student-score-patterns-<date>.json
```

Pre-built copies of the reports are in `docs/mastery-analysis/`. `output/` is gitignored.

Related in-app code: `lib/learning-plan/mastery.ts` (rule ladder R0–R7),
`app/learning-plan-builder/mastery-view.tsx`, `public/mastery-loop.html`.

## Back-test on production data (21 Sep 2026)

```
node scripts/mastery-analysis/q.mjs "<sql>"        # ad-hoc read-only query
node scripts/mastery-analysis/pull-dataset.mjs     # -> output/analysis/dataset.json (all completed sessions, first/final attempt per question)
node scripts/mastery-analysis/analyze-1.mjs        # coverage, test-retest, accuracy by mode/difficulty, LO coverage
node scripts/mastery-analysis/analyze-2.mjs        # scorer comparison, certification precision, stalls
node scripts/mastery-analysis/analyze-3.mjs        # homework/practice predictiveness, time decay
```

Decisions taken from these are in `docs/mastery-analysis/decisions.md`.
