import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "pg"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const OUTPUT = path.join(ROOT, "docs", "mastery-analysis", "student-score-progression.html")

function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName)
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const match = /^(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/.exec(trimmed)
    if (!match || process.env[match[1]]?.trim()) continue
    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "")
  }
}

function databaseUrl() {
  loadEnvFile(".env")
  loadEnvFile(".env.local")
  const url = process.env.MAIN_DATABASE_READ_ONLY_URL?.trim()
  if (!url) throw new Error("MAIN_DATABASE_READ_ONLY_URL is missing")
  return url
}

function sslConfig(url) {
  if (/sslmode=disable/i.test(url)) return undefined
  return { rejectUnauthorized: false }
}

const SCORE_QUERY = `
with latest_attempt as (
  select
    a.test_session_question_id,
    a.verdict,
    row_number() over (
      partition by a.test_session_question_id
      order by a.attempt_number desc, a.submitted_at desc, a.id desc
    ) as rn
  from public.attempts a
), session_scores as (
  select
    s.id,
    s.student_id,
    s.test_id,
    s.started_at,
    s.completed_at,
    s.stopped_because,
    t.code as test_code,
    t.name as test_name,
    t.mode,
    t.scope,
    t.class_level,
    count(q.id)::int as question_count,
    count(*) filter (
      where la.verdict in ('correct', 'partial', 'incorrect')
    )::int as scored_count,
    count(*) filter (where la.verdict = 'correct')::int as correct_count,
    count(*) filter (where la.verdict = 'partial')::int as partial_count,
    count(*) filter (where la.verdict = 'incorrect')::int as incorrect_count,
    count(*) filter (where la.verdict = 'non_attempt')::int as non_attempt_count
  from public.test_sessions s
  join public.test_configs t on t.id = s.test_id
  join public.test_session_questions q on q.test_session_id = s.id
  left join latest_attempt la
    on la.test_session_question_id = q.id
   and la.rn = 1
  group by
    s.id, s.student_id, s.test_id, s.started_at, s.completed_at,
    s.stopped_because, t.code, t.name, t.mode, t.scope, t.class_level
)
select *
from session_scores
where scored_count > 0
order by student_id, coalesce(completed_at, started_at), id
`

function rowToSnapshot(row) {
  const scored = Number(row.scored_count)
  const correct = Number(row.correct_count)
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    testId: String(row.test_id),
    testCode: row.test_code,
    testName: row.test_name,
    mode: row.mode,
    scope: row.scope,
    grade: row.class_level,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.completed_at
      ? "completed"
      : row.stopped_because || "in progress",
    questionCount: Number(row.question_count),
    scoredCount: scored,
    correct,
    partial: Number(row.partial_count),
    incorrect: Number(row.incorrect_count),
    nonAttempt: Number(row.non_attempt_count),
    score: Math.round((correct / scored) * 1000) / 10,
  }
}

const CSS = String.raw`
:root {
  color-scheme: dark;
  --ink: #f5f3e8;
  --muted: #9ba8a1;
  --deep: #0d1715;
  --panel: rgba(18, 31, 28, .88);
  --panel-solid: #14231f;
  --line: rgba(211, 230, 206, .14);
  --lime: #d8f36a;
  --coral: #ff806d;
  --cyan: #79d8d1;
  --orange: #f5b95e;
  --shadow: 0 22px 70px rgba(0, 0, 0, .24);
}
* { box-sizing: border-box; }
html { background: var(--deep); }
body {
  margin: 0;
  min-width: 320px;
  color: var(--ink);
  background:
    radial-gradient(circle at 82% 4%, rgba(216, 243, 106, .12), transparent 26rem),
    radial-gradient(circle at 0% 38%, rgba(121, 216, 209, .08), transparent 30rem),
    linear-gradient(145deg, #0c1513 0%, #13221e 52%, #0d1715 100%);
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  line-height: 1.45;
}
body::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: .18;
  content: "";
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}
button, input, select { font: inherit; }
button, select { cursor: pointer; }
.shell { max-width: 1440px; margin: 0 auto; padding: 30px 34px 70px; }
.hero { display: flex; gap: 32px; align-items: end; justify-content: space-between; padding: 28px 0 38px; }
.eyebrow { color: var(--lime); font: 700 11px/1.2 "Avenir Next", sans-serif; letter-spacing: .18em; text-transform: uppercase; }
h1, h2, h3, p { margin: 0; }
h1 { max-width: 780px; margin-top: 12px; color: #fbf8e8; font: 400 clamp(42px, 7vw, 96px)/.91 Georgia, serif; letter-spacing: -.065em; }
.hero-copy { max-width: 760px; }
.hero-copy p { max-width: 620px; margin-top: 18px; color: var(--muted); font-size: 15px; }
.stamp { min-width: 170px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 2px; color: var(--muted); font-size: 11px; line-height: 1.35; text-transform: uppercase; letter-spacing: .08em; transform: rotate(2deg); }
.stamp strong { display: block; margin-top: 5px; color: var(--ink); font-size: 13px; letter-spacing: .02em; }
.panel { border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); backdrop-filter: blur(14px); }
.controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; padding: 18px; border-radius: 3px; }
.control { display: grid; gap: 6px; min-width: 150px; }
.control.search { min-width: min(330px, 100%); flex: 1 1 260px; }
.control label { color: var(--muted); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
select, input[type="search"] { width: 100%; min-height: 40px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 2px; outline: 0; color: var(--ink); background: #0e1b18; }
select:focus, input[type="search"]:focus { border-color: var(--lime); box-shadow: 0 0 0 3px rgba(216, 243, 106, .12); }
.controls > button { min-height: 40px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 2px; color: var(--ink); background: rgba(216, 243, 106, .08); }
.controls > button:hover { border-color: var(--lime); background: rgba(216, 243, 106, .15); }
.toggle { display: flex; gap: 8px; align-items: center; min-height: 40px; color: var(--muted); font-size: 12px; }
.toggle input { accent-color: var(--lime); }
.stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1px; margin: 28px 0; border: 1px solid var(--line); background: var(--line); }
.stat { min-height: 112px; padding: 17px 18px; background: rgba(18, 31, 28, .82); }
.stat .value { color: var(--lime); font: 400 clamp(27px, 3vw, 42px)/1 Georgia, serif; letter-spacing: -.05em; }
.stat .label { margin-top: 8px; color: var(--muted); font-size: 10px; letter-spacing: .11em; text-transform: uppercase; }
.chart-panel { padding: 22px 22px 14px; border-radius: 3px; }
.section-head { display: flex; gap: 18px; align-items: start; justify-content: space-between; margin-bottom: 15px; }
.kicker { color: var(--lime); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
h2 { margin-top: 5px; font: 400 29px/1.05 Georgia, serif; letter-spacing: -.04em; }
.section-head p { max-width: 460px; margin-top: 6px; color: var(--muted); font-size: 12px; }
.legend { display: flex; gap: 13px; flex-wrap: wrap; justify-content: end; color: var(--muted); font-size: 11px; }
.key { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
.key i { display: inline-block; width: 22px; height: 3px; border-radius: 4px; background: var(--lime); }
.key i.ribbon { height: 10px; background: rgba(216, 243, 106, .18); border: 1px solid rgba(216, 243, 106, .23); }
.key i.student { background: var(--coral); }
.chart-wrap { position: relative; min-height: 380px; overflow: hidden; border: 1px solid rgba(211, 230, 206, .08); background: rgba(8, 17, 15, .54); }
canvas { display: block; width: 100%; height: 430px; }
.empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: 13px; }
.chart-note { display: flex; gap: 20px; flex-wrap: wrap; justify-content: space-between; padding-top: 12px; color: var(--muted); font-size: 11px; }
.chart-note strong { color: var(--ink); font-weight: 600; }
.lower { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(300px, .75fr); gap: 18px; margin-top: 18px; }
.table-panel, .detail-panel { min-width: 0; padding: 20px; border-radius: 3px; }
.table-scroll { overflow: auto; max-height: 580px; margin: 0 -20px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 11px 12px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
th { position: sticky; top: 0; color: var(--muted); background: var(--panel-solid); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; z-index: 1; }
tbody tr { transition: background .16s ease; }
tbody tr:hover, tbody tr.selected { background: rgba(216, 243, 106, .09); }
tbody tr { cursor: pointer; }
.student-id { color: var(--cyan); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
.score { color: var(--ink); font-variant-numeric: tabular-nums; }
.delta.up { color: var(--lime); } .delta.down { color: var(--coral); } .delta.flat { color: var(--muted); }
.detail-empty { padding: 40px 0; color: var(--muted); font-size: 13px; }
.detail-card { padding: 16px; border: 1px solid var(--line); background: rgba(8, 17, 15, .44); }
.detail-card .student-id { font-size: 14px; }
.detail-card .meta { margin-top: 5px; color: var(--muted); font-size: 11px; }
.detail-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 17px; }
.detail-metric { padding: 9px; background: rgba(216, 243, 106, .06); }
.detail-metric b { display: block; color: var(--lime); font: 400 22px Georgia, serif; }
.detail-metric span { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
.runs { display: grid; gap: 0; margin: 15px 0 0; padding: 0; list-style: none; }
.runs li { display: grid; grid-template-columns: 28px 1fr auto; gap: 9px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--line); }
.run-no { color: var(--muted); font: 12px Georgia, serif; }
.run-name { overflow: hidden; color: var(--ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.run-date { display: block; margin-top: 2px; color: var(--muted); font-size: 10px; }
.run-score { color: var(--lime); font: 400 18px Georgia, serif; }
footer { display: flex; gap: 20px; flex-wrap: wrap; justify-content: space-between; margin-top: 22px; padding: 16px 2px; color: var(--muted); font-size: 11px; }
footer code { color: var(--cyan); }
@media (max-width: 920px) { .hero { align-items: start; flex-direction: column; } .stamp { align-self: end; } .stats { grid-template-columns: repeat(2, 1fr); } .lower { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .shell { padding: 20px 14px 50px; } .hero { padding-top: 10px; } h1 { font-size: 54px; } .stats { grid-template-columns: 1fr 1fr; } .stat:last-child { grid-column: span 2; } .chart-panel, .table-panel, .detail-panel { padding: 15px; } .section-head { flex-direction: column; } .legend { justify-content: start; } }
`

const SCRIPT = String.raw`
const DATA = JSON.parse(document.getElementById("score-data").textContent)
const state = { mode: "all", grade: "all", completion: "all", student: "", selected: null, showStudents: false }
const $ = (selector) => document.querySelector(selector)
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))
const pct = (value) => value == null || Number.isNaN(value) ? "—" : Number(value).toFixed(value % 1 ? 1 : 0) + "%"
const dateLabel = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"
const dateTimeLabel = (value) => value ? new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"
const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))

function fillSelect(id, values, label) {
  const select = $(id)
  select.innerHTML = '<option value="all">' + label + '</option>' + values.map((value) => '<option value="' + esc(value) + '">' + esc(value) + '</option>').join("")
}

fillSelect("#mode", sortedUnique(DATA.rows.map((row) => row.mode)), "All test flows")
fillSelect("#grade", sortedUnique(DATA.rows.map((row) => row.grade)), "All grades")
$("#student-list").innerHTML = sortedUnique(DATA.rows.map((row) => row.studentId)).map((studentId) => '<option value="' + esc(studentId) + '"></option>').join("")

function filteredRows() {
  const needle = state.student.trim().toLowerCase()
  return DATA.rows.filter((row) =>
    (state.mode === "all" || row.mode === state.mode) &&
    (state.grade === "all" || row.grade === state.grade) &&
    (state.completion === "all" || row.status === "completed") &&
    (!needle || row.studentId.toLowerCase().includes(needle))
  )
}

function trajectories(rows) {
  const byStudent = new Map()
  for (const row of rows) {
    if (!byStudent.has(row.studentId)) byStudent.set(row.studentId, [])
    byStudent.get(row.studentId).push(row)
  }
  return [...byStudent.entries()].map(([studentId, runs]) => ({
    studentId,
    runs: runs.slice().sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt) || a.id.localeCompare(b.id)),
  }))
}

function summary(rows, people) {
  const scores = rows.map((row) => row.score).sort((a, b) => a - b)
  const mean = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null
  const firsts = people.filter((person) => person.runs.length).map((person) => person.runs[0].score)
  const lasts = people.filter((person) => person.runs.length).map((person) => person.runs.at(-1).score)
  const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  const movement = firsts.length ? avg(lasts) - avg(firsts) : null
  $("#stat-students").textContent = people.length.toLocaleString()
  $("#stat-tests").textContent = rows.length.toLocaleString()
  $("#stat-mean").textContent = pct(mean)
  $("#stat-first").textContent = pct(avg(firsts))
  $("#stat-movement").textContent = movement == null ? "—" : (movement >= 0 ? "+" : "") + movement.toFixed(1) + " pts"
}

function percentile(values, p) {
  if (!values.length) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index), upper = Math.ceil(index)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function aggregate(people) {
  const columns = new Map()
  for (const person of people) {
    person.runs.forEach((run, index) => {
      if (!columns.has(index + 1)) columns.set(index + 1, [])
      columns.get(index + 1).push(run.score)
    })
  }
  return [...columns.entries()].map(([sequence, values]) => ({
    sequence, count: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: percentile(values, .5), low: percentile(values, .25), high: percentile(values, .75),
  }))
}

function drawChart(people) {
  const canvas = $("#chart")
  const wrap = canvas.parentElement
  const width = Math.max(320, wrap.clientWidth)
  const height = 430
  const ratio = window.devicePixelRatio || 1
  canvas.width = width * ratio; canvas.height = height * ratio
  canvas.style.height = height + "px"
  const ctx = canvas.getContext("2d")
  ctx.scale(ratio, ratio)
  ctx.clearRect(0, 0, width, height)
  const pad = { top: 28, right: 30, bottom: 48, left: 54 }
  const plotW = width - pad.left - pad.right, plotH = height - pad.top - pad.bottom
  const maxSequence = Math.max(2, ...people.map((person) => person.runs.length))
  const x = (sequence) => pad.left + ((sequence - 1) / (maxSequence - 1)) * plotW
  const y = (score) => pad.top + (100 - score) / 100 * plotH
  ctx.font = "11px Avenir Next, Segoe UI, sans-serif"
  ctx.textAlign = "right"
  for (const tick of [0, 25, 50, 75, 100]) {
    ctx.strokeStyle = "rgba(211,230,206,.11)"; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, y(tick)); ctx.lineTo(width - pad.right, y(tick)); ctx.stroke()
    ctx.fillStyle = "rgba(155,168,161,.84)"; ctx.fillText(tick + "%", pad.left - 10, y(tick) + 4)
  }
  ctx.textAlign = "center"
  const xTicks = maxSequence <= 12 ? Array.from({ length: maxSequence }, (_, index) => index + 1) : [1, Math.ceil(maxSequence / 4), Math.ceil(maxSequence / 2), Math.ceil(maxSequence * .75), maxSequence]
  for (const tick of [...new Set(xTicks)]) { ctx.fillStyle = "rgba(155,168,161,.84)"; ctx.fillText("Test " + tick, x(tick), height - 18) }
  ctx.save(); ctx.translate(15, pad.top + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = "rgba(155,168,161,.84)"; ctx.fillText("Score", 0, 0); ctx.restore()
  const selected = state.selected ? people.find((person) => person.studentId === state.selected) : null
  if (!selected) {
    const points = aggregate(people)
    if (points.length) {
      ctx.beginPath()
      points.forEach((point, index) => { const px = x(point.sequence), py = y(point.high); index ? ctx.lineTo(px, py) : ctx.moveTo(px, py) })
      points.slice().reverse().forEach((point) => ctx.lineTo(x(point.sequence), y(point.low)))
      ctx.closePath(); ctx.fillStyle = "rgba(216,243,106,.13)"; ctx.fill()
      if (state.showStudents) {
        people.slice().sort((a, b) => b.runs.length - a.runs.length).slice(0, 90).forEach((person) => {
          ctx.beginPath(); person.runs.forEach((run, index) => { const px = x(index + 1), py = y(run.score); index ? ctx.lineTo(px, py) : ctx.moveTo(px, py) })
          ctx.strokeStyle = "rgba(121,216,209,.14)"; ctx.lineWidth = 1; ctx.stroke()
        })
      }
      ctx.beginPath(); points.forEach((point, index) => { const px = x(point.sequence), py = y(point.mean); index ? ctx.lineTo(px, py) : ctx.moveTo(px, py) })
      ctx.strokeStyle = "#d8f36a"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke()
      points.forEach((point) => { ctx.beginPath(); ctx.arc(x(point.sequence), y(point.mean), 3.5, 0, Math.PI * 2); ctx.fillStyle = "#d8f36a"; ctx.fill() })
      $("#chart-caption").innerHTML = "Cohort average with the middle 50% shaded. Each student contributes one score at each test number. <strong>" + people.length.toLocaleString() + " students</strong> in this view."
    }
  } else {
    ctx.beginPath(); selected.runs.forEach((run, index) => { const px = x(index + 1), py = y(run.score); index ? ctx.lineTo(px, py) : ctx.moveTo(px, py) })
    ctx.strokeStyle = "#ff806d"; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.stroke()
    selected.runs.forEach((run, index) => { ctx.beginPath(); ctx.arc(x(index + 1), y(run.score), 5, 0, Math.PI * 2); ctx.fillStyle = "#ff806d"; ctx.fill(); ctx.strokeStyle = "#0d1715"; ctx.lineWidth = 2; ctx.stroke() })
    $("#chart-caption").innerHTML = "Individual trail for <strong>" + esc(selected.studentId) + "</strong>. Click another student below or clear the search to return to the cohort view."
  }
  $("#chart-empty").hidden = Boolean(people.length)
}

function renderTable(people) {
  const ranked = people.slice().sort((a, b) => b.runs.length - a.runs.length || a.studentId.localeCompare(b.studentId)).slice(0, 160)
  $("#trajectory-count").textContent = people.length.toLocaleString() + " students"
  $("#trajectory-body").innerHTML = ranked.map((person) => {
    const first = person.runs[0], last = person.runs.at(-1), delta = last.score - first.score
    const tone = delta > .05 ? "up" : delta < -.05 ? "down" : "flat"
    return '<tr class="' + (state.selected === person.studentId ? "selected" : "") + '" data-student="' + esc(person.studentId) + '">' +
      '<td class="student-id">' + esc(person.studentId) + '</td><td>' + person.runs.length + '</td><td class="score">' + pct(first.score) + '</td><td class="score">' + pct(last.score) + '</td><td class="delta ' + tone + '">' + (delta >= 0 ? "+" : "") + delta.toFixed(1) + ' pts</td></tr>'
  }).join("") || '<tr><td colspan="5" class="detail-empty">No scored tests match these filters.</td></tr>'
  document.querySelectorAll("#trajectory-body tr[data-student]").forEach((row) => row.addEventListener("click", () => { state.selected = row.dataset.student; state.student = row.dataset.student; $("#student").value = state.student; render() }))
}

function renderDetail(people) {
  const selected = state.selected ? people.find((person) => person.studentId === state.selected) : null
  if (!selected) { $("#detail-content").innerHTML = '<div class="detail-empty">Select a student row to inspect every test from first to last.</div>'; return }
  const first = selected.runs[0], last = selected.runs.at(-1), delta = last.score - first.score
  $("#detail-content").innerHTML = '<div class="detail-card"><div class="student-id">' + esc(selected.studentId) + '</div><div class="meta">' + selected.runs.length + ' scored tests · ' + dateLabel(first.startedAt) + ' → ' + dateLabel(last.startedAt) + '</div><div class="detail-metrics"><div class="detail-metric"><b>' + pct(first.score) + '</b><span>first</span></div><div class="detail-metric"><b>' + pct(last.score) + '</b><span>last</span></div><div class="detail-metric"><b>' + (delta >= 0 ? "+" : "") + delta.toFixed(1) + '</b><span>point change</span></div></div></div><ol class="runs">' + selected.runs.map((run, index) => '<li><span class="run-no">' + String(index + 1).padStart(2, "0") + '</span><span class="run-name" title="' + esc(run.testName) + '">' + esc(run.testName) + '<span class="run-date">' + dateTimeLabel(run.startedAt) + ' · ' + esc(run.mode) + ' · ' + esc(run.status) + '</span></span><span class="run-score">' + pct(run.score) + '</span></li>').join("") + '</ol>'
}

function render() {
  const rows = filteredRows(), people = trajectories(rows)
  if (state.selected && !people.some((person) => person.studentId === state.selected)) state.selected = null
  summary(rows, people); drawChart(people); renderTable(people); renderDetail(people)
  $("#filtered-note").textContent = rows.length.toLocaleString() + " scored tests · " + people.length.toLocaleString() + " students"
}

$("#mode").addEventListener("change", (event) => { state.mode = event.target.value; state.selected = null; render() })
$("#grade").addEventListener("change", (event) => { state.grade = event.target.value; state.selected = null; render() })
$("#completion").addEventListener("change", (event) => { state.completion = event.target.value; state.selected = null; render() })
$("#student").addEventListener("input", (event) => { state.student = event.target.value; state.selected = event.target.value.trim() || null; render() })
$("#show-students").addEventListener("change", (event) => { state.showStudents = event.target.checked; render() })
$("#clear-student").addEventListener("click", () => { state.student = ""; state.selected = null; $("#student").value = ""; render() })
window.addEventListener("resize", () => { const people = trajectories(filteredRows()); drawChart(people) })
render()
`

async function main() {
  const url = databaseUrl()
  const client = new Client({ connectionString: url, ssl: sslConfig(url) })
  try {
    await client.connect()
    const result = await client.query(SCORE_QUERY)
    const rows = result.rows.map(rowToSnapshot)
    const payload = {
      generatedAt: new Date().toISOString(),
      rows,
      scoreRule:
        "Last recorded verdict per question in each session; correct / (correct + partial + incorrect) × 100. Sessions with at least one scored response are included.",
      sourceTables: [
        "test_sessions",
        "test_configs",
        "test_session_questions",
        "attempts",
      ],
    }
    const json = JSON.stringify(payload).replace(/</g, "\\u003c")
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Student score trail</title>
<style>${CSS}</style>
</head>
<body>
<div class="shell">
  <header class="hero">
    <div class="hero-copy">
      <div class="eyebrow">Noah / student performance atlas</div>
      <h1>From first try<br>to last try.</h1>
      <p>Follow how scores move as students take more tests. The cohort view shows the shape of the whole group; focus any student to see the exact test-by-test trail underneath.</p>
    </div>
    <div class="stamp">Read-only database snapshot<strong>${new Date(payload.generatedAt).toLocaleString()}</strong></div>
  </header>
  <main>
    <section class="controls panel" aria-label="Filters">
      <div class="control"><label for="mode">Test flow</label><select id="mode"></select></div>
      <div class="control"><label for="grade">Grade</label><select id="grade"></select></div>
      <div class="control"><label for="completion">Session status</label><select id="completion"><option value="all">All scored sessions</option><option value="completed">Completed only</option></select></div>
      <div class="control search"><label for="student">Focus a student ID</label><input id="student" type="search" list="student-list" placeholder="e.g. bHSrtkaVe9"><datalist id="student-list"></datalist></div>
      <button id="clear-student" type="button">Clear focus</button>
      <label class="toggle"><input id="show-students" type="checkbox"> show individual trails</label>
    </section>
    <section class="stats" aria-label="Summary">
      <div class="stat"><div id="stat-students" class="value">—</div><div class="label">students in view</div></div>
      <div class="stat"><div id="stat-tests" class="value">—</div><div class="label">scored tests</div></div>
      <div class="stat"><div id="stat-mean" class="value">—</div><div class="label">average test score</div></div>
      <div class="stat"><div id="stat-first" class="value">—</div><div class="label">average first test</div></div>
      <div class="stat"><div id="stat-movement" class="value">—</div><div class="label">average first → last</div></div>
    </section>
    <section class="chart-panel panel">
      <div class="section-head"><div><div class="kicker">01 / movement</div><h2>Does performance change with repetition?</h2><p id="chart-caption">Loading score movement…</p></div><div class="legend"><span class="key"><i></i> cohort average</span><span class="key"><i class="ribbon"></i> middle 50%</span><span class="key"><i class="student"></i> focused student</span></div></div>
      <div class="chart-wrap"><canvas id="chart" aria-label="Score movement chart"></canvas><div id="chart-empty" class="empty" hidden>No scored tests match these filters.</div></div>
      <div class="chart-note"><span id="filtered-note">—</span><span>Horizontal axis = each student’s chronological test number, not a single test configuration.</span></div>
    </section>
    <section class="lower">
      <div class="table-panel panel"><div class="section-head"><div><div class="kicker">02 / roster</div><h2>Student trajectories</h2><p>Click a row to draw that student’s full trail. The table is ranked by number of scored tests.</p></div><div id="trajectory-count" class="legend">—</div></div><div class="table-scroll"><table><thead><tr><th>Student</th><th>Tests</th><th>First</th><th>Last</th><th>Change</th></tr></thead><tbody id="trajectory-body"></tbody></table></div></div>
      <aside class="detail-panel panel"><div class="section-head"><div><div class="kicker">03 / close read</div><h2>One student, one line</h2></div></div><div id="detail-content"></div></aside>
    </section>
  </main>
  <footer><span>Source tables: <code>${payload.sourceTables.join(" · ")}</code></span><span>${payload.scoreRule}</span></footer>
</div>
<script id="score-data" type="application/json">${json}</script>
<script>${SCRIPT}</script>
</body>
</html>`
    fs.writeFileSync(OUTPUT, html)
    console.log(`Wrote ${OUTPUT}`)
    console.log(
      `Included ${rows.length.toLocaleString()} scored sessions across ${new Set(rows.map((row) => row.studentId)).size.toLocaleString()} students.`,
    )
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
})
