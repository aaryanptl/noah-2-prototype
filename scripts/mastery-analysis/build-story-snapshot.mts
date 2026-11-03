// Saves the evidence `/mastery/story` shows, so the page runs without the
// production replica or the Jev key (e.g. on Vercel).
//
//   npx tsx --env-file=.env.local scripts/mastery-analysis/build-story-snapshot.mts
//
// Needs MAIN_DATABASE_READ_ONLY_URL, and a dev server on :3000 for the wrong
// answers (`/api/mastery/errors` reads Jev's cached judgements). Writes
// app/mastery/story/story-data.json. The page runs the engine on the saved
// sessions itself, so a rule change does not need a new snapshot.
import fs from "node:fs";

import { CAST, TOPIC_ID, UNTIL } from "../../app/mastery/story/cast";
import { loadTopicEvidence } from "../../lib/mastery/evidence";

const BASE = process.env.STORY_BASE_URL ?? "http://localhost:3000";
const OUT = "app/mastery/story/story-data.json";

let topic: { id: number; name: string; grade: string } | null = null;
let objectives: unknown[] = [];
const students: Record<string, unknown> = {};

for (const cast of CAST) {
  const evidence = await loadTopicEvidence(cast.id, TOPIC_ID, UNTIL);
  if (!evidence) throw new Error(`Topic ${TOPIC_ID} not found`);
  topic = evidence.topic;
  objectives = evidence.objectives;
  const query = `student=${encodeURIComponent(cast.id)}&topic=${TOPIC_ID}&until=${encodeURIComponent(UNTIL)}`;
  const res = await fetch(`${BASE}/api/mastery/errors?${query}`);
  const json = await res.json();
  if (!json.success)
    throw new Error(
      `${cast.label} errors: ${json.error?.message ?? res.status}`,
    );
  students[cast.id] = {
    measurements: evidence.measurements,
    placement: evidence.placement,
    answers: json.data.answers,
  };
  console.log(
    `${cast.label}: ${evidence.measurements.length} measurements, ${json.data.answers.length} wrong answers`,
  );
}

fs.writeFileSync(
  OUT,
  `${JSON.stringify({ savedAt: new Date().toISOString(), until: UNTIL, topic, objectives, students }, null, 1)}\n`,
);
console.log(`wrote ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
process.exit(0);
