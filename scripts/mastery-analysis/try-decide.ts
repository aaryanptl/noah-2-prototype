import fs from "node:fs"
for (const file of [".env", ".env.local"]) if (fs.existsSync(file)) for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) { const m = /^([\w_]+)=(.*)$/.exec(line); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "") }
import { listCandidates, loadTopicEvidence } from "../../lib/mastery/evidence"
import { replay } from "../../lib/mastery/rules"

async function main() {
const t0 = Date.now()
const cands = await listCandidates(24)
console.log("candidates", cands.length, "in", Date.now() - t0, "ms")
for (const c of cands.slice(0, 24)) console.log(" ", c.studentId.padEnd(12), c.topicName.padEnd(34), c.grade.padEnd(8), "sess", c.sessions, "d/h/p", c.diagnostics, c.homeworks, c.practices, "acc", c.accuracy)
const pick = [cands.find(c => (c.accuracy ?? 0) >= 85)!, cands.find(c => (c.accuracy ?? 0) >= 60 && (c.accuracy ?? 0) < 80)!]
for (const c of pick) {
  const t1 = Date.now()
  const ev = await loadTopicEvidence(c.studentId, c.topicId)
  if (!ev) continue
  const { steps, now, card } = replay(ev.objectives, ev.measurements)
  console.log("\n==", c.studentId, ev.topic.name, "| LOs", ev.objectives.length, "| measurements", ev.measurements.length, "| placement", JSON.stringify(ev.placement), "|", Date.now() - t1, "ms")
  for (const s of steps) console.log("  ", s.session.at.slice(0, 10), s.session.mode.padEnd(10), `${s.session.correct}/${s.session.answered}`.padEnd(6), "| loop said:", s.prescribed.rule, s.prescribed.activity.padEnd(11), s.matched ? "✓" : "✗")
  console.log("  NOW:", now.rule, now.activity, "—", now.because, JSON.stringify(now.homeworkPlan ?? ""))
  for (const r of card.rows) console.log("   ", r.name.slice(0, 50).padEnd(52), "score", String(r.score).padStart(5), "ev", String(r.evidence).padStart(5), r.state.padEnd(10), "hist", r.history.map(h => h.accuracy).join(","))
  console.log("   topic", card.topicScore, "ev", card.topicEvidence, "badge", card.badge, "surveyDone", card.surveyDone)
}
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
