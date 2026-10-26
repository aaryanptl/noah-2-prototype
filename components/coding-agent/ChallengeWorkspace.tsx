"use client";

import confetti from "canvas-confetti";
import {
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CodingChallenge } from "@/agents/coding-agent/challenges";
import { type ChatMessage, ChatSidebar } from "./ChatSidebar";
import {
  type DemoStep,
  EditorPanel,
  type ScaffoldingMode,
} from "./EditorPanel";
import { ProblemCard } from "./ProblemCard";
import { Topbar } from "./Topbar";

interface ChallengeWorkspaceProps {
  challenge: CodingChallenge;
}

function compileDoc(html: string, css: string, js: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background-color: #ffffff; color: #1a1a2e; }
          ${css || ""}
        </style>
      </head>
      <body>
        ${html || ""}
        <script>
          try {
            ${js || ""}
          } catch (e) {
            document.body.insertAdjacentHTML('beforeend', '<pre style="color:#f46853;font:12px monospace;background:#fef2f2;padding:8px;border-radius:6px;border:1px solid #fee2e2;margin-top:10px;">' + e + '</pre>');
          }
        </script>
      </body>
    </html>
  `;
}

export function ChallengeWorkspace({ challenge }: ChallengeWorkspaceProps) {
  const [mode, setMode] = useState<ScaffoldingMode>("guide");
  const [activeFile, setActiveFile] = useState<"html" | "css" | "js">("html");
  const [buffers, setBuffers] = useState({ html: "", css: "", js: "" });

  const [isLoadingScaffold, setIsLoadingScaffold] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stepKey, setStepKey] = useState(0);

  // ── Matching & Target Design State ──
  const [goalsMet, setGoalsMet] = useState<Record<string, boolean>>({});
  const [matchPct, setMatchPct] = useState(0);
  const [showingTarget, setShowingTarget] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  // ── AI reviews & helps ──
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isHinting, setIsHinting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [review, setReview] = useState<
    { type: "good" | "tip"; text: string }[] | null
  >(null);

  // ── Topbar states ──
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // ── Student session state (parsed from query parameters safely) ──
  const [studentName, setStudentName] = useState("Riya Sharma");
  const [classLevel, setClassLevel] = useState("1");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const nameParam = params.get("studentName") || params.get("name");
      const levelParam = params.get("classLevel") || params.get("grade") || params.get("level");
      if (nameParam) setStudentName(nameParam);
      if (levelParam) setClassLevel(levelParam);
    }
  }, []);

  // ── Chatbot State ──
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedCode, setSelectedCode] = useState("");

  // ── Demo playback ──
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // ── Pair/Solo nudge system ──
  const lastActivityRef = useRef(Date.now());
  const hintShownRef = useRef(false);
  const hintFetchedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showBubble, setShowBubble] = useState(false);
  const [nudgeExpanded, setNudgeExpanded] = useState(false);
  const [nudgeHint, setNudgeHint] = useState<string | null>(null);
  const [arcProgress, setArcProgress] = useState(0);
  const [hasUserStarted, setHasUserStarted] = useState(false);

  // Sync editor buffers to local storage for the external sandbox preview tab
  useEffect(() => {
    localStorage.setItem(
      `weblab_buffers_ch${challenge.id}`,
      JSON.stringify(buffers),
    );
  }, [buffers, challenge.id]);

  // Fetch AI nudges for Pair mode fox bubble
  const fetchNudgeHint = useCallback(async () => {
    try {
      const res = await fetch("/api/coding-agent/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          html: buffers.html,
          css: buffers.css,
          js: buffers.js,
          age: 13,
          pairNudge: true,
          hintHistory: nudgeHint ? [nudgeHint] : [],
        }),
      });
      const data = await res.json();
      if (data.hint) setNudgeHint(data.hint);
    } catch {
      /* silent */
    }
  }, [challenge.id, buffers, nudgeHint]);

  // Evaluate goals list
  const evaluateGoals = useCallback(
    (htmlVal: string, cssVal: string, jsVal: string) => {
      if (!challenge) return 0;

      // Strip comments to avoid false positives from instructions or commented-out code
      const hClean = (htmlVal || "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .toLowerCase();
      const cssClean = (cssVal || "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .toLowerCase();
      const jsClean = (jsVal || "")
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
        .toLowerCase();

      const checks: Record<string, () => boolean> = {
        h1: () => /<h1[\s>]/.test(hClean),
        p: () => /<p[\s>]/.test(hClean),
        ul: () => /<ul[\s>]/.test(hClean),
        li3: () => (hClean.match(/<li[\s>]/g) || []).length >= 3,
        color: () => /color\s*:/i.test(cssClean),
        center: () => /text-align\s*:\s*center/i.test(cssClean),
        pad: () => /padding\s*:/i.test(cssClean),
        radius: () => /border-radius\s*:/i.test(cssClean),
        shadow: () => /box-shadow\s*:/i.test(cssClean),
        flex: () => /display\s*:\s*flex/i.test(cssClean),
        between: () => /justify-content\s*:/i.test(cssClean),
        align: () => /align-items\s*:/i.test(cssClean),
        listener: () => /addeventlistener/i.test(jsClean),
        update: () => /textcontent|innerhtml/i.test(jsClean),
      };

      // Generic evaluator for self-describing goals (AI-generated content).
      const buffersByTarget = { html: hClean, css: cssClean, js: jsClean };
      const evalCheck = (
        check: NonNullable<(typeof challenge.goals)[number]["check"]>,
      ) => {
        const src = buffersByTarget[check.target] ?? "";
        const flags = (check.flags ?? "i").includes("g")
          ? (check.flags ?? "i")
          : `${check.flags ?? "i"}g`;
        const hits = (src.match(new RegExp(check.rule, flags)) || []).length;
        return hits >= (check.minCount ?? 1);
      };

      let met = 0;
      const newGoalsMet: Record<string, boolean> = {};

      challenge.goals.forEach((g) => {
        // Prefer the goal's own check rule; fall back to the legacy dictionary.
        const ok = g.check
          ? evalCheck(g.check)
          : checks[g.id]
            ? checks[g.id]()
            : false;
        if (ok) met++;
        newGoalsMet[g.id] = ok;
      });

      setGoalsMet(newGoalsMet);
      const pct = Math.round((met / challenge.goals.length) * 100);
      setMatchPct(pct);
      return pct;
    },
    [challenge],
  );

  // Monitor live changes and evaluate
  useEffect(() => {
    evaluateGoals(buffers.html, buffers.css, buffers.js);
  }, [buffers, evaluateGoals]);

  // Setup loop nudge timer
  useEffect(() => {
    setShowBubble(false);
    setNudgeExpanded(false);
    setNudgeHint(null);
    setArcProgress(0);
    setHasUserStarted(false);
    hintShownRef.current = false;
    hintFetchedRef.current = false;
    lastActivityRef.current = Date.now();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);

    if (mode !== "pair") return;

    setShowBubble(true);

    intervalRef.current = setInterval(() => {
      if (!hasUserStartedRef.current) return;

      const idle = Date.now() - lastActivityRef.current;

      if (idle >= 2000) {
        setArcProgress(Math.min(100, ((idle - 2000) / 6000) * 100));
      } else {
        setArcProgress(0);
      }

      if (idle >= 7000 && !hintFetchedRef.current && !hintShownRef.current) {
        hintFetchedRef.current = true;
        fetchNudgeHint();
      }

      if (idle >= 8000 && !hintShownRef.current) {
        hintShownRef.current = true;
        setNudgeExpanded(true);
        nudgeTimerRef.current = setTimeout(() => setNudgeExpanded(false), 8000);
      }
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, challenge.id]);

  const hasUserStartedRef = useRef(hasUserStarted);
  useEffect(() => {
    hasUserStartedRef.current = hasUserStarted;
  }, [hasUserStarted]);

  const handleCodeChange = (v: string) => {
    setBuffers((prev) => ({ ...prev, [activeFile]: v }));
    if (!hasUserStarted) setHasUserStarted(true);

    lastActivityRef.current = Date.now();
    setArcProgress(0);
    hintShownRef.current = false;
    hintFetchedRef.current = false;
    if (nudgeExpanded) setNudgeExpanded(false);
  };

  const handleToggleNudge = () => {
    const next = !nudgeExpanded;
    setNudgeExpanded(next);
    if (next) {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = setTimeout(() => setNudgeExpanded(false), 8000);
    }
  };

  // Debounced auto-save for Solo mode response
  useEffect(() => {
    if (mode !== "solo") return;
    
    // Don't auto-save on initial load when buffers are empty
    if (!buffers.html && !buffers.css && !buffers.js) return;

    const delayDebounce = setTimeout(() => {
      const saveResponse = async () => {
        try {
          await fetch("/api/coding-agent/save-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentName,
              classLevel,
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              buffers,
              goalsMet,
              matchPct,
              stoppedBecause: "updating",
              topic: challenge.topic || "HTML",
            }),
          });
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      };
      saveResponse();
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(delayDebounce);
  }, [buffers, mode, studentName, classLevel, challenge, goalsMet, matchPct]);

  // Load scaffold templates
  const loadScaffold = useCallback(
    async (selectedMode: ScaffoldingMode) => {
      setIsLoadingScaffold(true);
      setReview(null);
      setCurrentStepIndex(0);
      setDemoSteps([]);
      setExplanation(null);
      setHint(null);

      // Load static files for the mode
      const filesData = challenge.files[selectedMode];
      setBuffers({
        html: filesData.html || "",
        css: filesData.css || "",
        js: filesData.js || "",
      });
      setActiveFile(challenge.startFile || "html");

      if (selectedMode === "guide") {
        const steps = challenge.demo?.guide ?? [];
        setDemoSteps(steps);
        if (steps.length > 0) {
          const firstStep = steps[0];
          setBuffers((prev) => ({ ...prev, [firstStep.file]: firstStep.code }));
          setActiveFile(firstStep.file);
        }
      }

      setIsLoadingScaffold(false);
    },
    [challenge],
  );

  useEffect(() => {
    loadScaffold(mode);
  }, [mode, loadScaffold]);

  const handleStepNext = () => {
    const next = currentStepIndex + 1;
    if (next < demoSteps.length) {
      setCurrentStepIndex(next);
      const step = demoSteps[next];
      setBuffers((prev) => ({ ...prev, [step.file]: step.code }));
      setActiveFile(step.file);
      setStepKey((k) => k + 1);
      if (step.run) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        setReview(challenge.review);
      }
    }
  };

  const handleStepPrev = () => {
    const prev = currentStepIndex - 1;
    if (prev >= 0) {
      setCurrentStepIndex(prev);
      const step = demoSteps[prev];
      setBuffers((prev) => ({ ...prev, [step.file]: step.code }));
      setActiveFile(step.file);
      setStepKey((k) => k + 1);
      setReview(null);
    }
  };

  // Visual document target renders
  const targetDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background-color: #ffffff; }
        </style>
      </head>
      <body>
        ${challenge.targetHtml}
      </body>
    </html>
  `;
  const studentDoc = compileDoc(buffers.html, buffers.css, buffers.js);
  const previewSrcDoc = showingTarget ? targetDoc : studentDoc;

  // Code run and evaluation
  const runCode = async () => {
    setIsExecuting(true);
    setExplanation(null);
    setHint(null);
    setReview(null);

    if (showingTarget) setShowingTarget(false);

    try {
      const pct = evaluateGoals(buffers.html, buffers.css, buffers.js);

      if (mode === "solo") {
        fetch("/api/coding-agent/save-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            classLevel,
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            buffers,
            goalsMet,
            matchPct: pct,
            stoppedBecause: pct >= 90 ? "completed" : "running",
            topic: challenge.topic || "HTML",
          }),
        }).catch((err) => console.error("Immediate save failed:", err));
      }

      if (pct >= 90) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        setReview(challenge.review);
        setXp(
          (prev) =>
            prev +
            (challenge.difficulty === "easy"
              ? 20
              : challenge.difficulty === "medium"
                ? 35
                : 50),
        );
        setStreak((prev) => prev + 1);
      } else {
        setExplanation(
          `Getting closer! Your visual similarity is ${pct}%. Check the unmet criteria on the left.`,
        );
      }
    } catch {
      setExplanation("Unable to match targets. Check your syntax!");
    } finally {
      setIsExecuting(false);
    }
  };

  // AI explanations
  const handleExplain = async () => {
    setIsExplaining(true);
    setExplanation(null);
    setHint(null);
    try {
      const res = await fetch("/api/coding-agent/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: buffers.html,
          css: buffers.css,
          js: buffers.js,
          ok: matchPct >= 90,
          challengeTitle: challenge.title,
          challengeDesc: challenge.desc,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setExplanation(
        "Check your styles and markup structure — the browser handles layouts based on rules!",
      );
    } finally {
      setIsExplaining(false);
    }
  };

  // AI hints
  const handleHint = async () => {
    setIsHinting(true);
    setHint(null);
    setExplanation(null);
    try {
      const res = await fetch("/api/coding-agent/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          html: buffers.html,
          css: buffers.css,
          js: buffers.js,
          question: "Provide guidance on the HTML/CSS tags",
          hintHistory: hint ? [hint] : [],
        }),
      });
      const data = await res.json();
      setHint(data.hint ?? "Examine the goals checklist carefully!");
    } catch {
      setHint(challenge.hints[0]?.text ?? "Review structural elements!");
    } finally {
      setIsHinting(false);
    }
  };

  const openSandboxTab = () => {
    window.open(`/coding-agent/preview/${challenge.id}`, "_blank");
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#faf8f5] font-sans text-[#1a1a2e]">
      <Topbar
        showBack
        xp={xp}
        streak={streak}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      <main
        className={`mx-auto flex w-full min-h-0 flex-1 flex-col gap-3 px-4 py-3 sm:px-6 transition-all duration-300 ease-in-out ${isChatOpen ? "max-w-[1550px]" : "max-w-[1280px]"}`}
      >
        {/* Question + goals — pinned at the top, full width. Scrolls
            internally only if the brief is long. */}
        <div className="max-h-[44vh] shrink-0 overflow-y-auto custom-scrollbar">
          <ProblemCard
            challenge={challenge}
            goalsMet={goalsMet}
            mode={mode}
            currentStepIndex={currentStepIndex}
            demoStepsLength={demoSteps.length}
          />
        </div>

        {/* Workspace fills the remaining viewport so the editor, preview and
            action buttons are all reachable without scrolling the page. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          {/* Left panel: Editor (grows to fill) + Actions */}
          <div className="flex min-h-0 flex-[1.25] flex-col gap-3">
            <div className="flex min-h-0 flex-1">
              <EditorPanel
                mode={mode}
                onModeChange={setMode}
                activeFile={activeFile}
                onFileChange={setActiveFile}
                code={buffers[activeFile] || ""}
                onCodeChange={handleCodeChange}
                isLoading={isLoadingScaffold}
                demoSteps={demoSteps}
                currentStepIndex={currentStepIndex}
                stepKey={stepKey}
                onStepNext={handleStepNext}
                onStepPrev={handleStepPrev}
                showNudge={showBubble}
                nudgeExpanded={nudgeExpanded}
                onToggleNudge={handleToggleNudge}
                nudgeHint={nudgeHint ?? ""}
                arcProgress={arcProgress}
                onSelectionChange={(text) => setSelectedCode(text)}
              />
            </div>

            {/* Action commands */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runCode}
                disabled={isExecuting || isLoadingScaffold}
                className="flex items-center gap-2 rounded-full bg-[#2ecc87] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExecuting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}
                {isExecuting ? "Loading..." : "Run & Preview"}
              </button>

              <button
                type="button"
                onClick={handleExplain}
                disabled={isExplaining}
                className="flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-bold text-[#5a5a72] transition-all hover:border-[#7c5cfc] hover:text-[#7c5cfc] disabled:opacity-50"
              >
                {isExplaining ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                Explain
              </button>

              <button
                type="button"
                onClick={handleHint}
                disabled={isHinting}
                className="flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-bold text-[#5a5a72] transition-all hover:border-[#ffc53d] hover:text-[#8a6400] disabled:opacity-50"
              >
                {isHinting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Lightbulb size={12} />
                )}
                Hint
              </button>

              <button
                type="button"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                  isChatOpen
                    ? "border-[#7c5cfc] bg-[#7c5cfc]/10 text-[#7c5cfc]"
                    : "border-black/8 bg-white text-[#5a5a72] hover:border-[#7c5cfc] hover:text-[#7c5cfc]"
                }`}
              >
                <MessageSquare size={12} />
                Ask Noah
              </button>

              <button
                type="button"
                onClick={() => loadScaffold(mode)}
                disabled={isLoadingScaffold}
                className="ml-auto flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-bold text-[#5a5a72] transition-all hover:border-red-400 hover:text-red-500 disabled:opacity-50"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>

            {/* Explain panel bubble */}
            {explanation && (
              <div className="relative flex items-start gap-3 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 p-4 pr-10 text-[0.8rem] text-[#4b2aad]">
                <span className="text-base">🦊</span>
                <div>
                  <span className="font-bold">Noah: </span>
                  {explanation}
                </div>
                <button
                  type="button"
                  onClick={() => setExplanation(null)}
                  className="absolute right-3 top-3 text-[#7c5cfc]/40 hover:text-[#7c5cfc]"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Hints panel bubble */}
            {hint && (
              <div className="relative flex items-start gap-3 rounded-xl border border-[#ffc53d]/30 bg-[#fff9e6] p-4 pr-10 text-[0.8rem] text-[#7a5500]">
                <span className="text-base">💡</span>
                <div>
                  <span className="font-bold">Noah's hint: </span>
                  {hint}
                </div>
                <button
                  type="button"
                  onClick={() => setHint(null)}
                  className="absolute right-3 top-3 text-[#7a5500]/40 hover:text-[#7a5500]"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Live preview (fills the column height) */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar">
            {/* Main Live Preview Chrome container */}
            <div className="flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-black/5 bg-[#f5f3f0] px-4">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                </div>

                <div className="mx-4 flex-1 max-w-[420px] rounded-full border border-black/5 bg-white px-3 py-1 font-mono text-[0.66rem] text-[#8a8aa0] truncate flex items-center gap-1.5">
                  <span>🔒</span> localhost:3000/index.html
                </div>

                <div className="flex items-center gap-3">
                  {/* Responsive viewport selectors */}
                  <div className="flex items-center gap-0.5 rounded-lg border border-black/5 bg-white p-0.5">
                    <button
                      onClick={() => setViewport("desktop")}
                      className={`rounded px-2 py-0.5 text-xs transition-colors ${viewport === "desktop" ? "bg-[#3a5ccc]/15 text-[#3a5ccc]" : "text-[#8a8aa0] hover:text-[#5a5a72]"}`}
                      title="Desktop View"
                    >
                      🖥
                    </button>
                    <button
                      onClick={() => setViewport("tablet")}
                      className={`rounded px-2 py-0.5 text-xs transition-colors ${viewport === "tablet" ? "bg-[#3a5ccc]/15 text-[#3a5ccc]" : "text-[#8a8aa0] hover:text-[#5a5a72]"}`}
                      title="Tablet View"
                    >
                      📱
                    </button>
                    <button
                      onClick={() => setViewport("mobile")}
                      className={`rounded px-2 py-0.5 text-xs transition-colors ${viewport === "mobile" ? "bg-[#3a5ccc]/15 text-[#3a5ccc]" : "text-[#8a8aa0] hover:text-[#5a5a72]"}`}
                      title="Mobile View"
                    >
                      📲
                    </button>
                  </div>

                  {/* Toggle the target design inside the preview */}
                  <button
                    type="button"
                    onClick={() => setShowingTarget((prev) => !prev)}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[0.66rem] font-bold transition-colors ${
                      showingTarget
                        ? "border-[#7c5cfc]/40 bg-[#7c5cfc]/10 text-[#7c5cfc]"
                        : "border-black/5 bg-white text-[#5a5a72] hover:border-black/10"
                    }`}
                    title="Toggle the target design in the preview"
                  >
                    {showingTarget ? "✏️ Show Mine" : "👁 Show Target"}
                  </button>

                  {/* Open live sandbox in a new tab */}
                  <button
                    type="button"
                    onClick={openSandboxTab}
                    className="flex items-center justify-center rounded-lg border border-black/5 bg-white px-2 py-1 text-[#5a5a72] transition-colors hover:border-black/10"
                    title="Open live sandbox in a new tab"
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>

              {/* Stage area */}
              <div
                className={`flex min-h-0 flex-1 justify-center p-0 transition-all duration-300 ${viewport !== "desktop" ? "bg-[#f5f3f0] py-4" : "bg-white"}`}
              >
                <iframe
                  srcDoc={previewSrcDoc}
                  sandbox="allow-scripts allow-same-origin"
                  className={`h-full border-none bg-white transition-all duration-300 ${
                    viewport === "mobile"
                      ? "w-[340px] max-w-[90%] rounded-xl border border-black/5 shadow-xl"
                      : viewport === "tablet"
                        ? "w-[560px] max-w-[95%] rounded-xl border border-black/5 shadow-xl"
                        : "w-full"
                  }`}
                  title="Web Lab Active rendering document"
                />
              </div>
            </div>

            {/* Review logs / advice */}
            {review && (
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-2 border-b border-black/5 pb-2.5 mb-3">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-[#3a5ccc] to-[#7c5cfc] text-xs text-white">
                    🦊
                  </div>
                  <span className="text-xs font-extrabold text-[#1a1a2e]">
                    Noah's Review
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {review.map((rv, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
                        rv.type === "good"
                          ? "border-green-100 bg-green-50/25 text-green-700"
                          : "border-yellow-100 bg-yellow-50/25 text-[#8a6400]"
                      }`}
                    >
                      <div className="font-extrabold uppercase text-[0.62rem] mb-1.5 tracking-wider">
                        {rv.type === "good" ? "✓ Excellent" : "💡 Suggestion"}
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: rv.text }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chatbot sidebar panel */}
          <ChatSidebar
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={chatMessages}
            setMessages={setChatMessages}
            html={buffers.html}
            css={buffers.css}
            js={buffers.js}
            selectedCode={selectedCode}
            challengeInfo={{
              title: challenge.title,
              description: challenge.desc,
              hintContext: challenge.lesson,
            }}
          />
        </div>
      </main>

      {/* Methodology Overlay Modal */}
      {isMethodologyOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-5 md:p-10 backdrop-blur-sm">
          <div className="relative flex flex-col w-full max-w-[680px] max-h-[85vh] rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#1a1a2e]">
                <HelpCircle size={16} className="text-[#7c5cfc]" />
                Web Lab Product Methodology
              </h3>
              <button
                onClick={() => setIsMethodologyOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-black/5 bg-white text-xs font-bold text-[#5a5a72] transition-colors hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed text-[#5a5a72] space-y-4">
              <p>
                Web Lab is Noah 2.0's{" "}
                <strong>
                  live-preview coding environment for web development
                </strong>
                . Unlike Code Lab (which checks logic against test cases), Web
                Lab teaches HTML &amp; CSS through what students <em>see</em>:
                every keystroke re-renders a real browser preview on the right,
                and students learn by matching their output to a target design.
              </p>

              <div className="rounded-xl border border-[#3a5ccc]/15 bg-[#3a5ccc]/5 p-4">
                <strong className="text-[#3a5ccc] block mb-1">
                  Principle:
                </strong>
                Web development is visual. You don't grade markup with
                assertions — you grade it with your eyes. Web Lab makes the
                feedback loop instant:{" "}
                <em>code on the left, result on the right, target to match.</em>
              </div>

              <h4 className="font-extrabold text-[#1a1a2e] text-xs">
                Three Scaffolding Modes
              </h4>
              <div className="space-y-2">
                <div className="rounded-xl border border-black/5 p-3.5 flex gap-3">
                  <span className="rounded-full bg-[#2ecc87]/10 px-2 py-0.5 font-bold text-[#2ecc87] h-fit">
                    Guide
                  </span>
                  <div>
                    Noah writes the full markup &amp; styles with commented
                    explanations of <em>why</em> each tag/property is used.
                    Student reads, then renders.
                  </div>
                </div>
                <div className="rounded-xl border border-black/5 p-3.5 flex gap-3">
                  <span className="rounded-full bg-[#3b82f6]/10 px-2 py-0.5 font-bold text-[#3b82f6] h-fit">
                    Pair
                  </span>
                  <div>
                    Noah provides the skeleton (DOCTYPE, structure, some styles)
                    and marks the spot with{" "}
                    <code>&lt;!-- 👈 YOUR CODE --&gt;</code>. Student adds the
                    key element or rule.
                  </div>
                </div>
                <div className="rounded-xl border border-black/5 p-3.5 flex gap-3">
                  <span className="rounded-full bg-[#ef4444]/10 px-2 py-0.5 font-bold text-[#ef4444] h-fit">
                    Solo
                  </span>
                  <div>
                    Blank files + the target image only. Student builds it from
                    scratch to match. Awards bonus XP.
                  </div>
                </div>
              </div>

              <h4 className="font-extrabold text-[#1a1a2e] text-xs">
                XP Scoring Model
              </h4>
              <table className="w-full border-collapse border border-black/5 text-left rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-[#f5f3f0]">
                    <th className="p-2.5 font-bold border-b border-black/5">
                      Factor
                    </th>
                    <th className="p-2.5 font-bold border-b border-black/5">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black/5">
                    <td className="p-2.5">Easy build base</td>
                    <td className="p-2.5 font-bold text-[#1a1a2e]">20 XP</td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="p-2.5">Medium build base</td>
                    <td className="p-2.5 font-bold text-[#1a1a2e]">35 XP</td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="p-2.5">Hard build base</td>
                    <td className="p-2.5 font-bold text-[#1a1a2e]">50 XP</td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="p-2.5">Each hint used</td>
                    <td className="p-2.5 font-bold text-[#f46853]">-5 XP</td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="p-2.5">Solo Mode completion bonus</td>
                    <td className="p-2.5 font-bold text-[#2ecc87]">+15 XP</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">
                      Goal visual match percentage requirement
                    </td>
                    <td className="p-2.5 font-bold text-[#3a5ccc]">
                      90%+ to pass
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <style>{`
        /* Custom scrollbar for panels */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.08);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.16);
        }
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.08) transparent;
        }
      `}</style>
    </div>
  );
}
