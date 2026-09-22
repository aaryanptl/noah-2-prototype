import { buildScorecard, routeNext, type Measurement, type MasteryMode, type MasteryObjective, CHECK_QUESTIONS, SURVEY_PER_LO } from "../../lib/mastery/rules"
const objectives: MasteryObjective[] = [1, 2, 3, 4, 5].map((id) => ({ id, name: `LO${id}`, sequence: id }))
const binomial = (n: number, p: number) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k }
const modeFor = (a: string): MasteryMode | null => a === "survey" || a === "topic_test" ? "diagnostic" : a === "homework" ? "homework" : a === "practice" ? "practice" : a === "check" ? "check" : a === "close" ? null : "class"
function run(p: number, rounds: number) {
  const tilt: Record<number, number> = {}; for (const o of objectives) tilt[o.id] = (Math.random() - 0.5) * 0.3
  const ms: Measurement[] = []; const seq: string[] = []
  for (let r = 1; r <= rounds; r++) {
    const d = routeNext(buildScorecard(objectives, ms)); seq.push(d.activity)
    if (d.activity === "close") break
    const mode = modeFor(d.activity)!; const at = new Date(Date.UTC(2026, 0, 1) + r * 864e5).toISOString()
    if (mode === "class") { for (const lo of d.targetLoIds) { ms.push({ sessionId: r, mode, at, loId: lo, answered: 0, correct: 0 }); tilt[lo] = Math.min(0.95 - p, tilt[lo] + 0.15) } continue }
    const plan = d.activity === "homework" ? d.homeworkPlan!.map((x) => [x.loId, x.questions]) : d.activity === "topic_test" ? d.testPlan!.map((x) => [x.loId, x.questions]) : d.targetLoIds.map((lo) => [lo, d.activity === "survey" ? SURVEY_PER_LO : d.activity === "check" ? CHECK_QUESTIONS : 5])
    for (const [lo, n] of plan as [number, number][]) ms.push({ sessionId: r, mode, at, loId: lo, answered: n, correct: binomial(n, Math.min(0.98, Math.max(0.02, p + tilt[lo]))) })
  }
  return seq
}
const ROUNDS = 10, N = 400
const seqs: string[][] = []
for (const p of [0.3, 0.45, 0.6, 0.75, 0.9]) for (let i = 0; i < N; i++) seqs.push(run(p, ROUNDS))
console.log("Share of students getting each activity, by round (mixed abilities, 5-LO topic):")
for (let r = 0; r < ROUNDS; r++) {
  const counts: Record<string, number> = {}
  for (const s of seqs) if (s[r]) counts[s[r]] = (counts[s[r]] ?? 0) + 1
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(100 * v / total)}%`).slice(0, 4).join("  ")
  console.log(`  round ${String(r + 1).padStart(2)}: ${top}`)
}
console.log("\nMost common first-5 sequences:")
const firsts: Record<string, number> = {}
for (const s of seqs) { const k = s.slice(0, 5).join(" → "); firsts[k] = (firsts[k] ?? 0) + 1 }
for (const [k, v] of Object.entries(firsts).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`  ${Math.round(100 * v / seqs.length)}%  ${k}`)
