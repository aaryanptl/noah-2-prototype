"use client";

import { useCallback, useEffect, useState } from "react";
import PracticeRunner, {
  type PracticeData,
  type PracticeResult,
} from "@/components/prototype/practice/PracticeRunner";

interface TopicOption {
  topic: string;
  diagnosticCount: number;
  interactiveCount: number;
}

const GRADES = [
  { value: 0, label: "KG" },
  { value: 1, label: "Grade 1" },
  { value: 2, label: "Grade 2" },
  { value: 3, label: "Grade 3" },
  { value: 4, label: "Grade 4" },
  { value: 5, label: "Grade 5" },
  { value: 6, label: "Grade 6" },
  { value: 7, label: "Grade 7" },
  { value: 8, label: "Grade 8" },
];

type Screen = "start" | "running" | "done";

const EMPTY_RESULT: PracticeResult = {
  elapsedMs: 0,
  aiHelpCount: 0,
  incorrectAttempts: 0,
  log: [],
};

function formatTime(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min >= 1) return `${min} min`;
  return `${Math.round(ms / 1000)}s`;
}

const LEVELS: Array<{ value: "easy" | "medium" | "hard"; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const COUNTS = [5, 10, 15];

export default function PracticePage() {
  const [screen, setScreen] = useState<Screen>("start");
  const [grade, setGrade] = useState(5);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topic, setTopic] = useState("");
  // Prototype-only knobs: seed band (student's "current practice level") + length.
  const [seedBand, setSeedBand] = useState<"easy" | "medium" | "hard">("easy");
  const [count, setCount] = useState(5);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [practice, setPractice] = useState<PracticeData | null>(null);
  const [result, setResult] = useState<PracticeResult>(EMPTY_RESULT);

  const loadTopics = useCallback(async (g: number) => {
    setLoadingTopics(true);
    setTopics([]);
    setTopic("");
    try {
      const res = await fetch(`/api/prototype/topics?grade=${g}`);
      const json = await res.json();
      setTopics(json?.data?.topics ?? []);
    } catch {
      setError("Couldn't load topics.");
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    loadTopics(grade);
  }, [grade, loadTopics]);

  const start = async (chosenTopic?: string) => {
    const t = chosenTopic ?? topic;
    if (!t) return;
    setTopic(t);
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/prototype/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, topic: t, seedBand, targetCount: count }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error?.message ?? "failed");
      setPractice(json.data as PracticeData);
      setScreen("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build practice.");
      setScreen("start");
    } finally {
      setGenerating(false);
    }
  };

  if (screen === "running" && practice) {
    return (
      <PracticeRunner
        practice={practice}
        onComplete={(r) => {
          setResult(r);
          setScreen("done");
        }}
        onExit={() => setScreen("start")}
      />
    );
  }

  if (screen === "done" && practice) {
    const nextTopic = topics.find((t) => t.topic !== practice.topic)?.topic;
    return (
      <div className="pp pp-wide">
        <style>{STYLES}</style>

        <div className="pp-r-top">
          <button
            type="button"
            className="pp-exit"
            onClick={() => setScreen("start")}
          >
            Exit ✕
          </button>
        </div>

        <div className="pp-r-head">
          <h1 className="pp-r-h1">
            <span className="pp-r-check" aria-hidden>
              ✓
            </span>
            Practice complete!
          </h1>
          <span className="pp-ai-tag">✦ Powered by AI</span>
        </div>

        <div className="pp-stats">
          <div className="pp-stat">
            <div className="pp-stat-val">{result.aiHelpCount}</div>
            <div className="pp-stat-label">AI HELP TAKEN</div>
          </div>
          <div className="pp-stat">
            <div className="pp-stat-val">{result.incorrectAttempts}</div>
            <div className="pp-stat-label">INCORRECT ATTEMPTS</div>
          </div>
          <div className="pp-stat">
            <div className="pp-stat-val">{formatTime(result.elapsedMs)}</div>
            <div className="pp-stat-label">TOTAL TIME SPENT</div>
          </div>
        </div>

        <div className="pp-next">
          <div className="pp-next-head">
            Here's what you can do next{" "}
            <span className="pp-ai-tag">✦ Powered by AI</span>
          </div>
          <div className="pp-next-grid">
            <div className="pp-next-card">
              <div className="pp-next-kicker">Continue learning</div>
              <div className="pp-next-title">{practice.topic}</div>
              <button
                type="button"
                className="pp-next-btn"
                onClick={() => start(practice.topic)}
              >
                Practice ➜
              </button>
            </div>
            {nextTopic && (
              <div className="pp-next-card">
                <div className="pp-next-kicker pp-new">New!</div>
                <div className="pp-next-title">{nextTopic}</div>
                <button
                  type="button"
                  className="pp-next-btn"
                  onClick={() => start(nextTopic)}
                >
                  Practice ➜
                </button>
              </div>
            )}
          </div>
        </div>

        <h2 className="pp-log-h">Question log</h2>
        <div className="pp-log">
          {result.log.map((q) => (
            <div className="pp-log-item" key={q.index}>
              <div className="pp-log-num">Question {q.index}</div>
              <div className="pp-log-q">{q.question}</div>
              {q.questionSvg && (
                <div
                  className="pp-log-qsvg"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                  dangerouslySetInnerHTML={{ __html: q.questionSvg }}
                />
              )}
              <div className="pp-log-ans">
                <div className="pp-log-ans-label">Your answer is</div>
                <div className="pp-log-ans-row">
                  {q.answerSvg && (
                    <span
                      className="pp-log-ans-svg"
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                      dangerouslySetInnerHTML={{ __html: q.answerSvg }}
                    />
                  )}
                  <span className="pp-log-ans-val">{q.answer || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pp-home-wrap">
          <button
            type="button"
            className="pp-home"
            onClick={() => setScreen("start")}
          >
            ⌂ Go to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pp">
      <style>{STYLES}</style>
      <div className="pp-card">
        <span className="pp-badge">Prototype · Practice</span>
        <h1 className="pp-h1">Practice test</h1>
        <p className="pp-lead">
          An adaptive practice session from the diagnostic pool. It starts at
          the level you pick and the Streak Ladder moves it up or down as you
          go, with Noah AI ready to nudge, hint, and — if you're stuck — reveal.
        </p>

        <label className="pp-label" htmlFor="grade">
          Grade
        </label>
        <select
          id="grade"
          className="pp-select"
          value={grade}
          onChange={(e) => setGrade(Number(e.target.value))}
        >
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <label className="pp-label" htmlFor="topic">
          Topic
        </label>
        <select
          id="topic"
          className="pp-select"
          value={topic}
          disabled={loadingTopics || topics.length === 0}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="">
            {loadingTopics
              ? "Loading topics…"
              : topics.length === 0
                ? "No topics for this grade"
                : "Pick a topic…"}
          </option>
          {topics.map((t) => (
            <option key={t.topic} value={t.topic}>
              {t.topic} ({t.diagnosticCount} questions)
            </option>
          ))}
        </select>

        <div className="pp-row">
          <div className="pp-col">
            <label className="pp-label" htmlFor="level">
              Starting level
            </label>
            <select
              id="level"
              className="pp-select"
              value={seedBand}
              onChange={(e) =>
                setSeedBand(e.target.value as "easy" | "medium" | "hard")
              }
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="pp-col">
            <label className="pp-label" htmlFor="count">
              Questions
            </label>
            <select
              id="count"
              className="pp-select"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {COUNTS.map((c) => (
                <option key={c} value={c}>
                  {c} questions
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="pp-error">{error}</div>}

        <button
          type="button"
          className="pp-cta"
          disabled={!topic || generating}
          onClick={() => start()}
        >
          {generating ? "Building practice…" : "Start practice"}
        </button>
      </div>
    </div>
  );
}

const STYLES = `
.pp { max-width: 640px; margin: 40px auto; padding: 0 22px; font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif; color: #1f2430; }
.pp-wide { max-width: 880px; }
.pp-card { background: #fff; border: 1px solid #eceef3; border-radius: 20px; padding: 34px 32px; box-shadow: 0 4px 20px rgba(20,24,58,.05); }
.pp-badge { display: inline-block; background: #f0ecff; color: #6b45c9; font-size: 0.74rem; font-weight: 800; padding: 4px 12px; border-radius: 999px; }
.pp-h1 { font-size: 1.9rem; font-weight: 900; margin: 14px 0 6px; letter-spacing: -0.02em; }
.pp-lead { color: #6b7280; font-size: 0.98rem; line-height: 1.5; margin: 0 0 22px; }
.pp-label { display: block; font-size: 0.8rem; font-weight: 800; color: #8a8fa3; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .05em; }
.pp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pp-col { min-width: 0; }
.pp-select { width: 100%; height: 50px; border: 1.5px solid #dfe1ea; border-radius: 12px; padding: 0 14px; font-size: 1rem; background: #fff; cursor: pointer; }
.pp-select:focus { outline: none; border-color: #8a5ea0; box-shadow: 0 0 0 3px #efe7f8; }
.pp-error { margin-top: 14px; background: #fdecec; color: #c0392b; border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; font-weight: 700; }
.pp-cta { margin-top: 26px; width: 100%; background: #fbc52b; color: #4a3a00; border: none; border-radius: 999px; padding: 15px; font-size: 1.05rem; font-weight: 900; cursor: pointer; box-shadow: 0 4px 0 #e0a800; transition: transform .08s, box-shadow .08s; }
.pp-cta:hover:not(:disabled) { filter: brightness(1.03); }
.pp-cta:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #e0a800; }
.pp-cta:disabled { opacity: .5; cursor: default; box-shadow: 0 4px 0 #e0a800; }

/* results */
.pp-r-top { margin-bottom: 8px; }
.pp-exit { background: #f3f4f7; border: none; border-radius: 999px; padding: 7px 15px; font-size: 0.82rem; font-weight: 700; color: #6b7280; cursor: pointer; }
.pp-r-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
.pp-r-h1 { display: flex; align-items: center; gap: 12px; font-size: 1.9rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
.pp-r-check { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #1e9e5b; color: #fff; font-size: 0.95rem; }
.pp-ai-tag { display: inline-flex; align-items: center; gap: 5px; background: #f0ecff; color: #6b45c9; font-size: 0.72rem; font-weight: 800; padding: 4px 11px; border-radius: 999px; white-space: nowrap; }

.pp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 26px; }
.pp-stat { background: #fff; border: 1px solid #ececf1; border-radius: 14px; padding: 16px 18px; }
.pp-stat-val { font-size: 1.5rem; font-weight: 900; color: #1f2430; }
.pp-stat-label { font-size: 0.72rem; font-weight: 800; color: #9aa0b4; text-transform: uppercase; letter-spacing: .05em; margin-top: 4px; }

.pp-next { background: linear-gradient(120deg, #f6f4ff, #fff4ef); border: 1px solid #eee7f5; border-radius: 18px; padding: 20px; margin-bottom: 30px; }
.pp-next-head { display: flex; align-items: center; gap: 10px; font-size: 1.05rem; font-weight: 900; margin-bottom: 14px; }
.pp-next-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 700px) { .pp-next-grid, .pp-stats { grid-template-columns: 1fr; } }
.pp-next-card { background: #fff; border: 1px solid #eceef3; border-radius: 14px; padding: 16px 18px; }
.pp-next-kicker { font-size: 0.78rem; font-weight: 700; color: #8a8fa3; margin-bottom: 3px; }
.pp-next-kicker.pp-new { color: #6b45c9; }
.pp-next-title { font-size: 1.05rem; font-weight: 900; color: #1f2430; margin-bottom: 12px; }
.pp-next-btn { background: #fff; border: 1.5px solid #dfe1ea; border-radius: 10px; padding: 8px 16px; font-size: 0.9rem; font-weight: 800; color: #1f2430; cursor: pointer; }
.pp-next-btn:hover { border-color: #8a5ea0; color: #6b45c9; }

.pp-log-h { font-size: 1.3rem; font-weight: 900; margin: 0 0 14px; }
.pp-log { display: flex; flex-direction: column; gap: 14px; }
.pp-log-item { background: #f8f9fb; border: 1px solid #f0f1f5; border-radius: 14px; padding: 16px 18px; }
.pp-log-num { font-size: 0.78rem; font-weight: 700; color: #9aa0b4; }
.pp-log-q { font-size: 1rem; font-weight: 800; color: #1f2430; margin: 3px 0 12px; }
.pp-log-qsvg { display: inline-grid; place-items: center; background: #fff; border: 1px solid #eceef3; border-radius: 12px; padding: 12px; margin: 0 0 12px; }
.pp-log-qsvg svg { width: auto; height: 120px; max-width: 100%; display: block; }
.pp-log-ans { background: #fff; border: 1.5px solid #cfead9; border-radius: 12px; padding: 11px 15px; }
.pp-log-ans-label { font-size: 0.78rem; font-weight: 700; color: #8a8fa3; }
.pp-log-ans-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.pp-log-ans-svg { display: inline-grid; place-items: center; flex-shrink: 0; background: #f8faf9; border: 1px solid #cfead9; border-radius: 10px; padding: 6px; }
.pp-log-ans-svg svg { width: 56px; height: 56px; display: block; }
.pp-log-ans-val { font-size: 0.98rem; font-weight: 800; color: #1b7a45; }

.pp-home-wrap { display: flex; justify-content: center; margin: 30px 0 10px; }
.pp-home { background: #fff; border: 1.5px solid #dfe1ea; border-radius: 999px; padding: 11px 22px; font-size: 0.92rem; font-weight: 800; color: #4b5168; cursor: pointer; }
.pp-home:hover { border-color: #b9bfce; }
`;
