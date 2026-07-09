"use client";

import { useEffect, useRef, useState } from "react";

export interface PracticeQ {
  index: number;
  id: string;
  questionType: string;
  difficulty: string;
  question: string;
  questionSvg?: string;
  options?: Array<{ text: string; svg?: string }>;
  payload?: Record<string, unknown>;
}

export type Band = "easy" | "medium" | "hard";

export interface PracticeData {
  grade: number;
  gradeLabel: string;
  topic: string;
  /** Session length — runs to this many answered questions. */
  targetCount: number;
  /** Band the session was seeded at (the student's current practice level). */
  seedBand: Band;
  /** Initial buffer of questions (1 current + up to 2 ahead). */
  questions: PracticeQ[];
}

type Verdict = "correct" | "wrong" | "partial";

const BANDS: Band[] = ["easy", "medium", "hard"];
const BAND_LABEL: Record<Band, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const promote = (b: Band): Band => BANDS[Math.min(BANDS.indexOf(b) + 1, 2)];
const demote = (b: Band): Band => BANDS[Math.max(BANDS.indexOf(b) - 1, 0)];

/**
 * Streak Ladder: two correct in a row promotes the band up (resetting the
 * streak); one wrong (or skip/reveal) demotes it down; a partial holds the band
 * but resets the streak. Returns the band + streak to use for the NEXT question.
 */
function ladderNext(
  band: Band,
  streak: number,
  verdict: Verdict,
): { band: Band; streak: number } {
  if (verdict === "correct") {
    const s = streak + 1;
    return s >= 2 ? { band: promote(band), streak: 0 } : { band, streak: s };
  }
  if (verdict === "wrong") return { band: demote(band), streak: 0 };
  return { band, streak: 0 }; // partial: hold band, reset streak
}

/** Fetch one more question at `band` (just-in-time). Returns null if exhausted. */
async function fetchNextQuestion(
  grade: number,
  topic: string,
  band: Band,
  excludeIds: string[],
): Promise<PracticeQ | null> {
  const res = await fetch("/api/prototype/practice/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade, topic, band, excludeIds }),
  });
  const json = await res.json();
  return json?.success ? ((json.data?.question as PracticeQ) ?? null) : null;
}

export interface PracticeResult {
  elapsedMs: number;
  aiHelpCount: number; // questions where AI help was taken
  incorrectAttempts: number; // total wrong tries across all questions
  log: Array<{
    index: number;
    question: string;
    questionSvg?: string;
    answer: string;
    answerSvg?: string;
  }>;
}

interface Try {
  answer: string;
  correct: boolean;
}

type Noah =
  | { phase: "intro" }
  | { phase: "offer"; message: string }
  | { phase: "loading"; level: number }
  | {
      phase: "hint";
      level: number;
      kind: "hint" | "reveal";
      content: string;
      revealedAnswer: string | null;
      canMore: boolean;
    }
  | { phase: "error"; message: string };

const OPT_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Noah's greeting on the very first question.
const FIRST_INTROS = [
  "Hey, I'm Noah — I'll be right here while you practice. Give this one a shot: type your answer and I'll help if you want.",
  "Hi, I'm Noah! Try this one — type your answer, and tap me if you'd like a hand.",
  "Hey there! I'm Noah, your practice buddy. Give it a go, and I'll help whenever you want.",
  "I'm Noah! Have a try at this one — and if you get stuck, I'm right here to help.",
];

// Noah's message when moving on after solving the previous question. Picked at
// random per question so it doesn't feel repetitive.
const TRANSITIONS = [
  "Good job on the last one! Now give this one a try.",
  "Nice work! Ready for the next one?",
  "You're on a roll — here's the next one!",
  "Awesome! Let's keep going.",
  "Great effort! Try this one now.",
  "Way to go! Here comes another.",
  "Sweet! Give this next question a shot.",
  "You've got this — next one's up!",
  "Nice thinking! Let's tackle this one.",
  "Keep it up! Here's your next challenge.",
];

// Noah's line when a wrong answer opens the help flow. Varied so it doesn't
// read the same on every miss.
const OFFERS = [
  "Good try — you're close. Want to look at it together?",
  "Not quite yet. Want me to help you work it out?",
  "Hmm, that's not it. Shall we figure it out together?",
  "So close! Want a little help with this one?",
  "Let's take another look at this one together?",
  "That one's tricky. Want me to walk through it with you?",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** POST the answer to the check endpoint; returns correctness + performance. */
async function postCheck(
  id: string,
  studentAnswer: unknown,
): Promise<{ isCorrect: boolean; performance: number }> {
  const res = await fetch("/api/prototype/practice/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, studentAnswer }),
  });
  const json = await res.json();
  return {
    isCorrect: json?.data?.isCorrect ?? false,
    performance: json?.data?.performance ?? 0,
  };
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${String(sec).padStart(2, "0")}s` : `${sec} s`;
}

/** Clean a revealed answer for display — no em/en dashes or arrows. */
function cleanAnswer(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, " ")
    .replace(/\s*→\s*/g, " ")
    .trim();
}

function answerDisplay(q: PracticeQ, a: unknown): string {
  if (a === null || a === undefined || a === "") return "";
  if (q.questionType === "mcq") {
    const i = typeof a === "number" ? a : -1;
    const opt = q.options?.[i];
    if (!opt) return "";
    const letter = OPT_LETTERS[i] ?? String(i + 1);
    return opt.text?.trim()
      ? `Option ${letter}: ${opt.text}`
      : `Option ${letter}`;
  }
  if (q.questionType === "drag_drop" && a && typeof a === "object") {
    return Object.entries(a as Record<string, string>)
      .map(([k, v]) => `${k} → ${v}`)
      .join(", ");
  }
  return String(a);
}

function hasAnswer(q: PracticeQ, a: unknown): boolean {
  if (q.questionType === "mcq") return typeof a === "number" && a >= 0;
  if (q.questionType === "drag_drop")
    return !!a && typeof a === "object" && Object.keys(a).length > 0;
  return typeof a === "string" && a.trim().length > 0;
}

export default function PracticeRunner({
  practice,
  onComplete,
  onExit,
}: {
  practice: PracticeData;
  onComplete: (result: PracticeResult) => void;
  onExit: () => void;
}) {
  // The question buffer grows just-in-time: it starts with the seed batch and
  // gains one question per answer (fetched at the Streak Ladder's current band).
  const [buffer, setBuffer] = useState<PracticeQ[]>(practice.questions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [tries, setTries] = useState<Record<string, Try[]>>({});
  // Best performance (0..1) seen per question — lets a revealed drag_drop that
  // was partially right count as a "partial" verdict rather than a full "wrong".
  const [bestPerf, setBestPerf] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<
    Record<string, { answer: string; svg?: string }>
  >({});
  const [finals, setFinals] = useState<
    Record<string, { answer: string; svg?: string }>
  >({});
  // Streak Ladder state: the band the next question is served at, and how many
  // correct answers in a row we're on.
  const [band, setBand] = useState<Band>(practice.seedBand);
  const [streak, setStreak] = useState(0);
  const [hintCount, setHintCount] = useState(0); // total AI hints taken (all levels, all questions)
  const [wrongCount, setWrongCount] = useState(0);
  const [noah, setNoah] = useState<Noah>({ phase: "intro" });
  const [checking, setChecking] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [intro, setIntro] = useState<string>(() => pickRandom(FIRST_INTROS));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (shakeRef.current) clearTimeout(shakeRef.current);
    };
  }, []);

  // Briefly shake the Noah panel to signal "still not right, stay on this hint".
  const triggerShake = () => {
    setShaking(false);
    requestAnimationFrame(() => {
      setShaking(true);
      if (shakeRef.current) clearTimeout(shakeRef.current);
      shakeRef.current = setTimeout(() => setShaking(false), 500);
    });
  };

  const target = practice.targetCount;
  const step = buffer[index];
  if (!step) return null;

  const answer = answers[step.id];
  const stepTries = tries[step.id] ?? [];
  // "Last" = answering this one reaches the target length.
  const isLast = index + 1 >= target;

  const setAnswer = (a: unknown) =>
    setAnswers((prev) => ({ ...prev, [step.id]: a }));

  const answerSvg = (a: unknown): string | undefined =>
    step.questionType === "mcq" && typeof a === "number"
      ? step.options?.[a]?.svg
      : undefined;

  const recordTry = (display: string, correct: boolean) =>
    setTries((prev) => ({
      ...prev,
      [step.id]: [...(prev[step.id] ?? []), { answer: display, correct }],
    }));

  // Verdict for a question the student had REVEALED (they needed the answer):
  // "partial" if a prior try was partially right, else "wrong".
  const revealVerdict = (): Verdict => {
    const bp = bestPerf[step.id] ?? 0;
    return bp > 0 && bp < 1 ? "partial" : "wrong";
  };

  const finish = (
    finalsMap: Record<string, { answer: string; svg?: string }>,
    resolvedCount: number,
  ) => {
    onComplete({
      elapsedMs: elapsed,
      aiHelpCount: hintCount,
      incorrectAttempts: wrongCount,
      log: buffer.slice(0, resolvedCount).map((q, i) => ({
        index: i + 1,
        question: q.question,
        questionSvg: q.questionSvg,
        answer: finalsMap[q.id]?.answer ?? "",
        answerSvg: finalsMap[q.id]?.svg,
      })),
    });
  };

  // Resolve the current question, advance the Streak Ladder, then move to the
  // next buffered question (fetching one more in the background to stay ~2 ahead).
  const resolveAndAdvance = async (
    finalAnswer: string,
    svg: string | undefined,
    verdict: Verdict,
  ) => {
    const nextFinals = {
      ...finals,
      [step.id]: { answer: finalAnswer, svg },
    };
    setFinals(nextFinals);

    const resolvedCount = index + 1;
    const next = ladderNext(band, streak, verdict);
    setBand(next.band);
    setStreak(next.streak);

    if (resolvedCount >= target) {
      finish(nextFinals, resolvedCount);
      return;
    }

    const servedIds = buffer.map((b) => b.id);

    // Normal path: the next question is already buffered, so advance instantly
    // and refill the buffer in the background at the ladder's new band.
    if (index + 1 < buffer.length) {
      setIndex((i) => i + 1);
      setIntro(pickRandom(TRANSITIONS));
      setNoah({ phase: "intro" });
      if (buffer.length < target) {
        const q = await fetchNextQuestion(
          practice.grade,
          practice.topic,
          next.band,
          servedIds,
        );
        if (q) setBuffer((prev) => [...prev, { ...q, index: prev.length + 1 }]);
      }
      return;
    }

    // Buffer ran dry — fetch synchronously before advancing (rare).
    setChecking(true);
    try {
      const q =
        buffer.length < target
          ? await fetchNextQuestion(
              practice.grade,
              practice.topic,
              next.band,
              servedIds,
            )
          : null;
      if (q) {
        setBuffer((prev) => [...prev, { ...q, index: prev.length + 1 }]);
        setIndex((i) => i + 1);
        setIntro(pickRandom(TRANSITIONS));
        setNoah({ phase: "intro" });
      } else {
        finish(nextFinals, resolvedCount); // pool exhausted — end here
      }
    } finally {
      setChecking(false);
    }
  };

  // The single CTA: check the answer, then advance if correct / already resolved,
  // otherwise open the Noah help flow (and stay on the question).
  const handleNext = async () => {
    const id = step.id;
    const rev = revealed[id];
    const answered = hasAnswer(step, answer);

    // Revealed and nothing entered: move on with the revealed answer.
    if (rev && !answered) {
      resolveAndAdvance(rev.answer, rev.svg, revealVerdict());
      return;
    }
    if (!answered) return;

    setChecking(true);
    let graded: { isCorrect: boolean; performance: number };
    try {
      graded = await postCheck(id, answer);
    } catch {
      setChecking(false);
      setNoah({ phase: "error", message: "Couldn't check that — try again." });
      return;
    }
    setChecking(false);

    const display = answerDisplay(step, answer);
    recordTry(display, graded.isCorrect);
    setBestPerf((prev) => ({
      ...prev,
      [id]: Math.max(prev[id] ?? 0, graded.performance),
    }));

    // Already revealed: record the student's own (edited) answer, but the ladder
    // verdict reflects that they needed the reveal.
    if (rev) {
      resolveAndAdvance(display, answerSvg(answer), revealVerdict());
      return;
    }

    if (graded.isCorrect) {
      resolveAndAdvance(display, answerSvg(answer), "correct");
    } else {
      setWrongCount((c) => c + 1);
      if (noah.phase === "offer" || noah.phase === "hint") {
        // A help card (offer or hint) is already showing and it's still wrong:
        // keep it exactly where it is and just shake. Only the help buttons advance.
        triggerShake();
      } else {
        // First wrong answer: open the offer (no shake here).
        setNoah({ phase: "offer", message: pickRandom(OFFERS) });
      }
    }
  };

  const requestHint = async (level: number) => {
    setNoah({ phase: "loading", level });
    try {
      const res = await fetch("/api/prototype/practice/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: step.id,
          grade: practice.grade,
          level,
          tries: stepTries,
        }),
      });
      const json = await res.json();
      if (!json?.success)
        throw new Error(json?.error?.message ?? "hint failed");
      const d = json.data;
      const revealAns = d.revealedAnswer
        ? cleanAnswer(String(d.revealedAnswer))
        : null;
      if (d.kind === "reveal" && revealAns) {
        // Match the revealed answer to an option so its visual shows in the log.
        const matchedSvg =
          step.questionType === "mcq"
            ? step.options?.find(
                (o) => o.text?.trim() && cleanAnswer(o.text) === revealAns,
              )?.svg
            : undefined;
        setRevealed((prev) => ({
          ...prev,
          [step.id]: { answer: revealAns, svg: matchedSvg },
        }));
      }
      setHintCount((c) => c + 1);
      setNoah({
        phase: "hint",
        level: d.level,
        kind: d.kind,
        content: d.content,
        revealedAnswer: revealAns,
        canMore: d.canRequestMore,
      });
    } catch {
      setNoah({
        phase: "error",
        message: "Noah couldn't help right now — try again.",
      });
    }
  };

  return (
    <div className="pr">
      <style>{STYLES}</style>

      <div className="pr-topbar">
        <h1 className="pr-h1">Practice</h1>
        <button type="button" className="pr-exit" onClick={onExit}>
          Exit ✕
        </button>
      </div>

      <div className="pr-banner">
        <div className="pr-banner-left">
          <span className="pr-pill">Practice</span>
          <div className="pr-banner-topic">{practice.topic}</div>
          <div className="pr-banner-activity">
            <strong>Activity {index + 1}</strong> of {target}
          </div>
        </div>
        <div className="pr-banner-right">
          <div className="pr-banner-level">
            <div className="pr-time-label">LEVEL</div>
            <div className={`pr-level-val pr-level-${band}`}>
              {BAND_LABEL[band]}
            </div>
          </div>
          <div className="pr-banner-time">
            <div className="pr-time-label">TIME TAKEN</div>
            <div className="pr-time-val">{formatElapsed(elapsed)}</div>
          </div>
        </div>
      </div>

      <div className="pr-body">
        <div className="pr-card">
          <div className="pr-q-wrap">
            <h2 className="pr-q">{step.question}</h2>
            {step.questionSvg && (
              <div
                className="pr-qsvg"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                dangerouslySetInnerHTML={{ __html: step.questionSvg }}
              />
            )}
            <DiagnosticBody
              step={step}
              answer={answer}
              disabled={checking}
              onAnswer={setAnswer}
            />
          </div>

          <div className="pr-card-foot">
            <button
              type="button"
              className="pr-next"
              disabled={checking}
              onClick={handleNext}
            >
              {checking ? "Checking…" : isLast ? "Finish" : "Next question"}{" "}
              <span aria-hidden>➜</span>
            </button>
          </div>
        </div>

        <NoahPanel
          noah={noah}
          shaking={shaking}
          introMessage={intro}
          onOfferYes={() => requestHint(1)}
          onMore={() => requestHint(2)}
          onReveal={() => requestHint(3)}
          onRetry={() =>
            setNoah({ phase: "offer", message: pickRandom(OFFERS) })
          }
        />
      </div>
    </div>
  );
}

function NoahPanel({
  noah,
  shaking,
  introMessage,
  onOfferYes,
  onMore,
  onReveal,
  onRetry,
}: {
  noah: Noah;
  shaking: boolean;
  introMessage: string;
  onOfferYes: () => void;
  onMore: () => void;
  onReveal: () => void;
  onRetry: () => void;
}) {
  let title = "Noah AI is here to help!";
  let body: React.ReactNode = null;
  let button: React.ReactNode = null;

  if (noah.phase === "intro") {
    body = introMessage;
  } else if (noah.phase === "offer") {
    body = noah.message;
    button = (
      <button type="button" className="pn-btn" onClick={onOfferYes}>
        Yes, help me solve this
      </button>
    );
  } else if (noah.phase === "loading") {
    body = <span className="pn-dots">Noah is thinking…</span>;
  } else if (noah.phase === "error") {
    title = "Hmm…";
    body = noah.message;
    button = (
      <button type="button" className="pn-btn" onClick={onRetry}>
        Try again
      </button>
    );
  } else {
    title =
      noah.kind === "reveal"
        ? "Here's the answer"
        : noah.level === 1
          ? "Here's a hint for you"
          : "Here's more help";
    body = (
      <>
        {noah.content}
        {noah.kind === "reveal" && noah.revealedAnswer && (
          <span className="pn-answer">{noah.revealedAnswer}</span>
        )}
      </>
    );
    if (noah.canMore) {
      button = (
        <button
          type="button"
          className="pn-btn"
          onClick={noah.level === 1 ? onMore : onReveal}
        >
          {noah.level === 1 ? "I need more help" : "Reveal answer"}
        </button>
      );
    }
  }

  return (
    <aside className={shaking ? "pn pn-shake" : "pn"}>
      <div className="pn-head">
        <span className="pn-spark" aria-hidden>
          ✦
        </span>
        {title}
      </div>
      <div className="pn-body">{body}</div>
      {button}
    </aside>
  );
}

function DiagnosticBody({
  step,
  answer,
  disabled,
  onAnswer,
}: {
  step: PracticeQ;
  answer: unknown;
  disabled: boolean;
  onAnswer: (a: unknown) => void;
}) {
  const payload = step.payload ?? {};
  const hasOptionSvg = step.options?.some((o) => o.svg) ?? false;

  if (step.questionType === "mcq" && step.options) {
    return (
      <div className={hasOptionSvg ? "pr-opts pr-opts-grid" : "pr-opts"}>
        {step.options.map((opt, i) => (
          <button
            type="button"
            key={`${step.id}-${i}`}
            disabled={disabled}
            className={`pr-opt ${opt.svg ? "pr-opt-visual" : ""} ${answer === i ? "pr-opt-sel" : ""}`}
            onClick={() => onAnswer(i)}
          >
            <span className="pr-opt-letter">{OPT_LETTERS[i]}</span>
            {opt.svg ? (
              <>
                <span
                  className="pr-opt-svg"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                  dangerouslySetInnerHTML={{ __html: opt.svg }}
                />
                {opt.text?.trim() && (
                  <span className="pr-opt-cap">{opt.text}</span>
                )}
              </>
            ) : (
              <span className="pr-opt-text">{opt.text}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (step.questionType === "fitb") {
    return (
      <input
        className="pr-input"
        placeholder="Enter your answer"
        disabled={disabled}
        value={typeof answer === "string" ? answer : ""}
        onChange={(e) => onAnswer(e.target.value)}
      />
    );
  }

  if (step.questionType === "drag_drop") {
    const items = Array.isArray(payload.draggableItems)
      ? (payload.draggableItems as string[])
      : [];
    const zones = Array.isArray(payload.dropZones)
      ? (payload.dropZones as string[])
      : [];
    const current = (
      answer && typeof answer === "object" ? answer : {}
    ) as Record<string, string>;
    return (
      <div className="pr-dnd">
        {items.map((item, i) => (
          <div className="pr-dnd-row" key={`${step.id}-dnd-${i}`}>
            <span className="pr-chip">{item}</span>
            <span className="pr-arrow">→</span>
            <select
              className="pr-select"
              disabled={disabled}
              value={current[item] ?? ""}
              onChange={(e) => onAnswer({ ...current, [item]: e.target.value })}
            >
              <option value="" disabled hidden>
                Pick a group…
              </option>
              {zones.map((z, zi) => (
                <option key={`${step.id}-zone-${zi}`} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

const STYLES = `
.pr { max-width: 1180px; margin: 0 auto; padding: 18px 22px 60px; font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif; color: #1f2430; }
.pr-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.pr-h1 { font-size: 1.7rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
.pr-exit { background: #f3f4f7; border: none; border-radius: 999px; padding: 8px 16px; font-size: 0.85rem; font-weight: 700; color: #6b7280; cursor: pointer; }
.pr-exit:hover { background: #e9eaef; }

.pr-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #eef3ff; border: 2px solid #c3d4ff; border-radius: 16px; padding: 16px 22px; margin-bottom: 18px; }
.pr-pill { display: inline-block; background: #3b6ef6; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 4px 14px; border-radius: 999px; }
.pr-banner-topic { margin: 8px 0 2px; color: #3b6ef6; font-size: 0.92rem; font-weight: 800; }
.pr-banner-activity { font-size: 1.15rem; color: #4b5168; font-weight: 600; }
.pr-banner-activity strong { color: #1f2430; font-weight: 900; }
.pr-banner-right { display: flex; align-items: center; gap: 22px; }
.pr-banner-level { text-align: right; }
.pr-banner-time { text-align: right; }
.pr-time-label { font-size: 0.66rem; font-weight: 800; letter-spacing: .08em; color: #9aa0b4; }
.pr-time-val { font-size: 1.35rem; font-weight: 900; color: #1f2430; font-variant-numeric: tabular-nums; }
.pr-level-val { font-size: 1.05rem; font-weight: 900; }
.pr-level-easy { color: #1e9e5b; }
.pr-level-medium { color: #d98a00; }
.pr-level-hard { color: #d1495b; }

.pr-body { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
@media (max-width: 900px) { .pr-body { grid-template-columns: 1fr; } }

.pr-card { background: #fff; border: 1px solid #eceef3; border-radius: 18px; min-height: 520px; display: flex; flex-direction: column; box-shadow: 0 2px 14px rgba(20,24,58,.04); overflow: hidden; }
.pr-q-wrap { flex: 1; padding: 40px 36px 16px; display: flex; flex-direction: column; align-items: center; }
.pr-q { text-align: center; font-size: 1.6rem; line-height: 1.35; font-weight: 800; color: #1f2430; margin: 6px 0 26px; max-width: 760px; }
.pr-qsvg { display: grid; place-items: center; margin: 0 auto 26px; }
.pr-qsvg svg { width: auto; height: 200px; max-width: 100%; display: block; }

.pr-opts { display: grid; gap: 12px; width: 100%; max-width: 620px; }
.pr-opts-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; max-width: 720px; }
.pr-opt { display: flex; align-items: center; gap: 12px; text-align: left; padding: 15px 18px; border: 1.5px solid #e6e8ef; border-radius: 14px; background: #fff; font-size: 1rem; cursor: pointer; transition: border-color .12s, background .12s; color: #1f2430; }
.pr-opt:hover:not(:disabled) { border-color: #f5cf6b; background: #fffdf6; }
.pr-opt:disabled { cursor: default; opacity: .85; }
.pr-opt-sel { border-color: #f3b500; background: #fff6da; }
.pr-opt-visual { flex-direction: column; align-items: stretch; gap: 8px; padding: 14px; }
.pr-opt-visual .pr-opt-letter { align-self: flex-start; }
.pr-opt-svg { min-height: 120px; display: grid; place-items: center; }
.pr-opt-svg svg { width: 120px; height: 120px; display: block; }
.pr-opt-cap { text-align: center; font-size: 0.85rem; font-weight: 700; color: #6b7280; }
.pr-opt-text { flex: 1; }
.pr-opt-letter { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: #f0f1f7; font-size: 0.78rem; font-weight: 800; color: #555; flex-shrink: 0; }
.pr-input { width: 100%; max-width: 560px; height: 54px; border: 1.5px solid #dfe1ea; border-radius: 14px; padding: 0 18px; font-size: 1rem; text-align: center; }
.pr-input:focus { outline: none; border-color: #f3b500; box-shadow: 0 0 0 3px #fff1c2; }
.pr-input:disabled { background: #f6f7f9; color: #6b7280; }
.pr-dnd { display: grid; gap: 12px; width: 100%; max-width: 520px; }
.pr-dnd-row { display: flex; align-items: center; gap: 12px; }
.pr-chip { background: #f0f1f7; border: 1px solid #e0e2ee; border-radius: 10px; padding: 9px 15px; font-size: 0.95rem; min-width: 80px; text-align: center; }
.pr-arrow { color: #9aa0b4; font-weight: 800; }
.pr-select { flex: 1; height: 44px; border: 1.5px solid #dfe1ea; border-radius: 10px; padding: 0 12px; font-size: 0.95rem; background: #fff; cursor: pointer; }

.pr-card-foot { display: flex; justify-content: center; padding: 16px 24px 28px; }
.pr-next { display: inline-flex; align-items: center; gap: 9px; background: #fbc52b; color: #4a3a00; border: none; border-radius: 999px; padding: 13px 34px; font-size: 1rem; font-weight: 900; cursor: pointer; box-shadow: 0 4px 0 #e0a800; transition: transform .08s, box-shadow .08s; }
.pr-next:hover:not(:disabled) { filter: brightness(1.03); }
.pr-next:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #e0a800; }
.pr-next:disabled { opacity: .6; cursor: default; }

/* Noah assist panel */
.pn { background: linear-gradient(150deg, #3b4ea8 0%, #5b3f9d 62%, #8a5ea0 100%); border-radius: 18px; padding: 22px 20px; color: #fff; box-shadow: 0 6px 22px rgba(60,52,137,.28); position: relative; overflow: hidden; min-height: 190px; }
/* decorative glow — must NOT intercept clicks on the button */
.pn::after { content: ''; position: absolute; right: -40px; bottom: -50px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(245,180,120,.55), transparent 70%); pointer-events: none; }
/* wrong answer while a hint is up: small shake, hint stays put */
.pn-shake { animation: pn-shake .45s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes pn-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-5px); }
  40%, 60% { transform: translateX(5px); }
}
.pn-head { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.02rem; text-align: center; justify-content: center; position: relative; z-index: 1; }
.pn-spark { color: #ffd98a; }
.pn-body { margin: 12px 4px 16px; font-size: 0.95rem; line-height: 1.5; font-weight: 600; text-align: center; position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.pn-answer { display: inline-block; margin-top: 14px; background: #fff; color: #2a2350; font-weight: 900; padding: 9px 22px; border-radius: 12px; font-size: 1.15rem; }
.pn-dots { opacity: .9; }
.pn-btn { display: block; width: 100%; background: #fff; color: #2a2350; border: none; border-radius: 12px; padding: 13px 16px; font-size: 0.95rem; font-weight: 800; cursor: pointer; position: relative; z-index: 2; transition: transform .08s; }
.pn-btn:hover { filter: brightness(0.97); }
.pn-btn:active { transform: translateY(1px); }
`;
