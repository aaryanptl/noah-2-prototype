/**
 * Who and what `/mastery/story` shows. Shared by the page and by
 * `scripts/mastery-analysis/build-story-snapshot.ts`, which saves their
 * evidence to `story-data.json` so the page needs no database.
 *
 * The students are picked to get three different next steps from the same
 * rules. Their evidence is frozen at UNTIL so the story does not change as
 * new sessions arrive. IDs are the platform's pseudonymous student IDs.
 */
export const TOPIC_ID = 49;
export const UNTIL = "2026-10-15T23:59:59Z";
export const CAST = [
  { id: "maALlSSBdo", label: "Student A", headline: "Knows it, but slowly" },
  {
    id: "ctBuuxn0XzcSpU",
    label: "Student B",
    headline: "Good, except one spot",
  },
  { id: "DL5z7dnm7w", label: "Student C", headline: "Rushing, not learning" },
];
/**
 * Wrong answers shown being read by Jev, by served-question id: one each that
 * Jev judged a guess, a missing idea, a misread question and a slip.
 */
export const EXAMPLES = [
  { tsq: 144887, student: "Student C" },
  { tsq: 144914, student: "Student C" },
  { tsq: 209819, student: "Student B" },
  { tsq: 144878, student: "Student C" },
];
