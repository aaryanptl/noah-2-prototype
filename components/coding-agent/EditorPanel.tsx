"use client";

import Editor from "@monaco-editor/react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ScaffoldingMode = "guide" | "pair" | "solo";

export type DemoStep = {
  file: "html" | "css" | "js";
  code: string;
  prog: {
    pct: number;
    icon: string;
    l: string;
    s: string;
  };
  run?: boolean;
};

const MODE_CONFIG = {
  guide: {
    border: "#2ecc87",
    bg: "#172420",
    btn: "#2ecc87",
    label: "Guide",
    strip: "🤖 Noah writes and explains the markup & styles step by step.",
  },
  pair: {
    border: "#3b82f6",
    bg: "#181c2e",
    btn: "#3b82f6",
    label: "Pair",
    strip: "👫 Noah gives you the structure — you write the key logic.",
  },
  solo: {
    border: "#ef4444",
    bg: "#111111",
    btn: "#ef4444",
    label: "Solo",
    strip: "🦅 Blank canvas. Zero help. Bonus XP for completing this!",
  },
};

const FILES = [
  { key: "html", label: "index.html", dot: "#f46853" },
  { key: "css", label: "style.css", dot: "#5b8cff" },
  { key: "js", label: "script.js", dot: "#ffc53d" },
] as const;

// Monaco JetBrains Mono char width at fontSize 13 ≈ 7.8px; line number gutter ≈ 48px
const CHAR_W = 7.5;
const GUTTER_W = 46;

interface TooltipInfo {
  top: number;
  left: number;
  text: string;
}

interface EditorPanelProps {
  mode: ScaffoldingMode;
  onModeChange: (m: ScaffoldingMode) => void;
  activeFile: "html" | "css" | "js";
  onFileChange: (f: "html" | "css" | "js") => void;
  code: string;
  onCodeChange: (val: string) => void;
  isLoading: boolean;
  demoSteps: DemoStep[];
  currentStepIndex: number;
  stepKey: number;
  onStepNext: () => void;
  onStepPrev: () => void;
  showNudge?: boolean;
  nudgeExpanded?: boolean;
  onToggleNudge?: () => void;
  nudgeHint?: string;
  arcProgress?: number; // 0-100
  onSelectionChange?: (selectedText: string) => void;
}

export function EditorPanel({
  mode,
  onModeChange,
  activeFile,
  onFileChange,
  code,
  onCodeChange,
  isLoading,
  demoSteps,
  currentStepIndex,
  stepKey,
  onStepNext,
  onStepPrev,
  showNudge,
  nudgeExpanded,
  onToggleNudge,
  nudgeHint,
  arcProgress = 0,
  onSelectionChange,
}: EditorPanelProps) {
  const cfg = MODE_CONFIG[mode];
  const currentStep = demoSteps[currentStepIndex];
  const isLastStep = currentStepIndex === demoSteps.length - 1;

  // Monaco refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decsRef = useRef<any[]>([]);
  const prevCodeRef = useRef("");
  const clearTimer = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [tooltipClosing, setTooltipClosing] = useState(false);
  const lastRangeRef = useRef<{ start: number; end: number } | null>(null);

  const handleMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    prevCodeRef.current = code;

    // Register Guide theme
    monaco.editor.defineTheme("guide-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#172420",
        "editorLineNumber.foreground": "#2ecc8733",
        "editorLineNumber.activeForeground": "#2ecc87",
      },
    });

    // Register Pair theme
    monaco.editor.defineTheme("pair-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#181c2e",
        "editorLineNumber.foreground": "#5b8cff33",
        "editorLineNumber.activeForeground": "#5b8cff",
      },
    });

    // Register Solo theme
    monaco.editor.defineTheme("solo-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#111111",
        "editorLineNumber.foreground": "#f4685333",
        "editorLineNumber.activeForeground": "#f46853",
      },
    });

    // Apply the active theme
    monaco.editor.setTheme(`${mode}-theme`);

    editor.onDidChangeCursorSelection((e: any) => {
      if (onSelectionChange) {
        const selection = e.selection;
        const model = editor.getModel();
        if (model) {
          const selectedText = model.getValueInRange(selection);
          onSelectionChange(selectedText);
        }
      }
    });
  };

  // Update theme when mode changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(`${mode}-theme`);
    }
  }, [mode]);

  // ── Step animation effect ──
  useEffect(() => {
    if (stepKey === 0) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) {
      prevCodeRef.current = code;
      return;
    }

    const prevLines = prevCodeRef.current.split("\n");
    const currLines = code.split("\n");
    const added = currLines.length - prevLines.length;

    // Clear pending timers & decorations
    for (const t of clearTimer.current) {
      clearTimeout(t);
    }
    clearTimer.current = [];
    editor.deltaDecorations(decsRef.current, []);
    decsRef.current = [];
    setTooltip(null);
    setTooltipClosing(false);

    if (added > 0) {
      const startLine = prevLines.length + 1;
      const endLine = currLines.length;
      lastRangeRef.current = { start: startLine, end: endLine };

      // ── ENTER: green highlight + gutter bar ──
      decsRef.current = editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(startLine, 1, endLine, 1000),
            options: {
              isWholeLine: true,
              className: "noah-line-in",
              linesDecorationsClassName: "noah-gutter-in",
            },
          },
        ],
      );

      // Compute tooltip vertical position (mid-point of new lines)
      const lineHeight =
        editor.getOption(monaco.editor.EditorOption.lineHeight) ?? 19;
      const midLine = (startLine + endLine - 1) / 2;
      const tooltipTop = Math.round(16 + midLine * lineHeight);

      // Compute tooltip horizontal position (after code text end)
      const newLines = currLines.slice(prevLines.length);
      const maxLen = Math.max(...newLines.map((l: string) => l.length));
      const containerW = containerRef.current?.offsetWidth ?? 600;
      const TOOLTIP_W = 240;
      const rawLeft = GUTTER_W + maxLen * CHAR_W + 10; // 10px gap after code
      // Clamp: don't go off-screen right
      const tooltipLeft = Math.min(rawLeft, containerW - TOOLTIP_W - 8);

      setTooltipClosing(false);
      setTooltip({
        top: tooltipTop,
        left: tooltipLeft,
        text: currentStep?.prog?.s ?? "",
      });

      // t=1.1s → swap to EXIT highlight class
      const t1 = setTimeout(() => {
        const e = editorRef.current;
        const m = monacoRef.current;
        const r = lastRangeRef.current;
        if (!e || !m || !r) return;
        decsRef.current = e.deltaDecorations(decsRef.current, [
          {
            range: new m.Range(r.start, 1, r.end, 1000),
            options: {
              isWholeLine: true,
              className: "noah-line-out",
              linesDecorationsClassName: "noah-gutter-out",
            },
          },
        ]);
      }, 1100);

      // t=2.1s → tooltip starts closing
      const t2 = setTimeout(() => setTooltipClosing(true), 2100);

      // t=1.5s → remove Monaco decoration
      const t3 = setTimeout(() => {
        editorRef.current?.deltaDecorations(decsRef.current, []);
        decsRef.current = [];
      }, 1500);

      // t=2.5s → unmount tooltip
      const t4 = setTimeout(() => {
        setTooltip(null);
        setTooltipClosing(false);
      }, 2500);

      clearTimer.current = [t1, t2, t3, t4];
    }

    prevCodeRef.current = code;
    return () => {
      for (const t of clearTimer.current) {
        clearTimeout(t);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl transition-colors duration-300"
      style={{ border: `2px solid ${cfg.border}40`, backgroundColor: cfg.bg }}
    >
      {/* ── Top bar ── */}
      <div className="relative flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-2.5">
        <div className="flex gap-1.5">
          <span className="block h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="block h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="block h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[0.65rem] text-white/25">
          solution.{activeFile}
        </span>
        {/* Mode tabs */}
        <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
          {(["guide", "pair", "solo"] as ScaffoldingMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className="rounded-full px-3 py-1 text-[0.85rem] font-bold transition-all"
              style={{
                background: mode === m ? MODE_CONFIG[m].btn : "transparent",
                color: mode === m ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
          <div className="ml-1.5 flex items-center gap-0.5 rounded-md border border-white/10 bg-white/8 px-2 py-1 text-[0.8rem] font-bold text-white/45">
            Web <ChevronDown size={10} />
          </div>
        </div>
      </div>

      {/* ── File tabs ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] px-3.5 pt-1.5">
        {FILES.map((f) => (
          <button
            key={f.key}
            onClick={() => onFileChange(f.key)}
            className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 font-mono text-[0.72rem] font-bold transition-all ${
              activeFile === f.key
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: f.dot }}
            />
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Mode strip ── */}
      <div className="shrink-0 border-b border-white/[0.04] px-3.5 py-2 text-[0.78rem] text-white/35">
        {cfg.strip}
      </div>

      {/* ── Monaco editor ── */}
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {/* Tooltip — positioned at code-text end, vertically mid of new lines */}
        {tooltip && mode === "guide" && (
          <div
            className="pointer-events-none absolute z-50 flex w-[240px] items-center gap-2 rounded-lg border border-[#2ecc87]/25 p-1.5 px-2.5"
            style={{
              top: tooltip.top,
              left: tooltip.left,
              background: "rgba(10,35,25,0.98)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.7)",
              animation: tooltipClosing
                ? "tipOut 0.4s cubic-bezier(0.4,0,1,1) forwards"
                : "tipIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards",
            }}
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#2ecc87] to-[#3a5ccc] text-xs">
              🦊
            </div>
            <p className="text-[0.74rem] leading-tight text-white/90">
              {tooltip.text}
            </p>
          </div>
        )}

        {/* Pair nudge bubble — Pair mode only */}
        {showNudge &&
          mode === "pair" &&
          (() => {
            const CIRC = 81.7;
            const dash = (arcProgress / 100) * CIRC;
            const isOpen = !!nudgeExpanded;

            const containerTransition = [
              "width 560ms cubic-bezier(0.23,1,0.32,1)",
              "height 560ms cubic-bezier(0.23,1,0.32,1)",
              "border-radius 560ms cubic-bezier(0.23,1,0.32,1)",
              "padding 560ms cubic-bezier(0.23,1,0.32,1)",
              "box-shadow 400ms ease",
              "border-color 300ms ease",
            ].join(", ");

            return (
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  right: "12px",
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: isOpen ? "12px" : "0",
                  width: isOpen ? "235px" : "40px",
                  height: isOpen ? "60px" : "40px",
                  borderRadius: isOpen ? "18px" : "50%",
                  padding: isOpen ? "0 16px 0 10px" : "0",
                  border: `1px solid rgba(255,197,61,${isOpen ? 0.35 : 0.22})`,
                  background: "rgba(14,10,0,0.98)",
                  backdropFilter: "blur(18px)",
                  boxShadow: isOpen
                    ? "0 12px 36px rgba(0,0,0,0.65)"
                    : "0 2px 10px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: containerTransition,
                  justifyContent: isOpen ? "flex-start" : "center",
                }}
                onClick={onToggleNudge}
              >
                {/* Fox + SVG arc — fixed size, always centered */}
                <div
                  style={{
                    position: "relative",
                    display: "grid",
                    height: "32px",
                    width: "32px",
                    flexShrink: 0,
                    placeItems: "center",
                  }}
                >
                  <svg
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: "rotate(-90deg)",
                    }}
                    viewBox="0 0 32 32"
                    fill="none"
                  >
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      stroke="rgba(255,197,61,0.12)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      stroke="#ffc53d"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${CIRC}`}
                      style={{ transition: "stroke-dasharray 0.35s linear" }}
                    />
                  </svg>
                  <span
                    style={{
                      position: "relative",
                      zIndex: 1,
                      fontSize: "15px",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    🦊
                  </span>
                </div>

                {/* Text — always in DOM, fades via opacity */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateX(0)" : "translateX(-5px)",
                    transition: isOpen
                      ? "opacity 0.3s 0.3s ease, transform 0.3s 0.3s ease"
                      : "opacity 0.15s ease, transform 0.15s ease",
                    pointerEvents: isOpen ? "auto" : "none",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "#ffc53d",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    Noah
                  </p>
                  <p
                    style={{
                      fontSize: "0.72rem",
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.92)",
                      whiteSpace: "normal",
                    }}
                  >
                    {nudgeHint || (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.38)",
                          fontStyle: "italic",
                        }}
                      >
                        thinking…
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })()}

        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[0.82rem] text-white/35">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#2ecc87]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#5b8cff] [animation-delay:0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#f46853] [animation-delay:0.3s]" />
            <span className="ml-2">Noah is preparing your workspace…</span>
          </div>
        ) : (
          <Editor
            // Per-file key: mount a fresh editor per tab so each file's buffer
            // is applied as a clean value. Without this, switching tabs changes
            // Monaco's value + language together and the model desyncs (code
            // appears blank / stale on subsequent tabs).
            key={activeFile}
            height="100%"
            language={activeFile === "js" ? "javascript" : activeFile}
            theme={`${mode}-theme`}
            value={code}
            onMount={handleMount}
            onChange={(val) => onCodeChange(val ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'Space Mono','JetBrains Mono','Fira Code',monospace",
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              readOnly: mode === "guide",
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              overviewRulerLanes: 0,
              automaticLayout: true,
              renderLineHighlight: "none",
            }}
          />
        )}
      </div>

      {/* ── Accent line ── */}
      <div
        className="h-px opacity-40"
        style={{
          background: `linear-gradient(90deg,transparent,${cfg.border},transparent)`,
        }}
      />

      {/* ── Guide HUD ── */}
      {mode === "guide" && demoSteps.length > 0 && !isLoading && (
        <div className="flex h-12 items-center gap-2.5 bg-[#0f1715] border-t border-white/[0.04] px-4 text-white z-50 shrink-0">
          <span className="min-w-[32px] font-mono text-[0.8rem] font-bold text-white/50">
            {currentStepIndex + 1}/{demoSteps.length}
          </span>
          <div className="h-3.5 w-px bg-white/10" />
          <span className="flex-1 truncate text-[0.85rem] font-bold text-white/80">
            {currentStep?.prog?.l ?? "Guide"}
          </span>

          {/* Progress pill dots */}
          <div className="flex items-center gap-1.5">
            {demoSteps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 7,
                  width: i === currentStepIndex ? 20 : 7,
                  background:
                    i === currentStepIndex
                      ? cfg.border
                      : i < currentStepIndex
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onStepPrev}
              disabled={currentStepIndex === 0}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/60 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={onStepNext}
              disabled={isLastStep}
              className="h-8 min-w-[64px] rounded-lg px-4 text-[0.85rem] font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-20"
              style={{
                background: isLastStep ? "rgba(255,255,255,0.06)" : cfg.border,
              }}
            >
              {isLastStep ? "Done ✓" : "Next →"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* ── Line ENTER ── */
        .noah-line-in { animation: noahLineIn 0.4s ease-out forwards !important; }
        @keyframes noahLineIn {
          0%   { background: rgba(46,204,135,0)    !important; }
          35%  { background: rgba(46,204,135,0.45) !important; }
          100% { background: rgba(46,204,135,0.30) !important; }
        }
        /* ── Line EXIT ── */
        .noah-line-out { animation: noahLineOut 0.4s ease-in forwards !important; }
        @keyframes noahLineOut {
          from { background: rgba(46,204,135,0.30) !important; }
          to   { background: rgba(46,204,135,0)    !important; }
        }
        /* ── Gutter ENTER ── */
        .noah-gutter-in {
          background: #2ecc87 !important; width: 3px !important; border-radius: 2px;
          animation: noahGutterIn 0.4s ease-out forwards !important;
        }
        @keyframes noahGutterIn {
          from { opacity:0; transform: scaleY(0.2); }
          to   { opacity:1; transform: scaleY(1);   }
        }
        /* ── Gutter EXIT ── */
        .noah-gutter-out {
          background: #2ecc87 !important; width: 3px !important; border-radius: 2px;
          animation: noahGutterOut 0.4s ease-in forwards !important;
        }
        @keyframes noahGutterOut {
          from { opacity:1; transform: scaleY(1);   }
          to   { opacity:0; transform: scaleY(0.2); }
        }
        /* ── Tooltip ENTER: slide up + fade in ── */
        @keyframes tipIn {
          from { opacity:0; transform: translateY(8px) scale(0.95); }
          to   { opacity:1; transform: translateY(0)   scale(1);    }
        }
        /* ── Tooltip EXIT: slide down + fade out ── */
        @keyframes tipOut {
          from { opacity:1; transform: translateY(0)   scale(1);    }
          to   { opacity:0; transform: translateY(6px) scale(0.96); }
        }
        /* ── Noah bubble text entrance (delayed after container expands) ── */
        @keyframes noahTextIn {
          from { opacity:0; transform: translateX(-8px); }
          to   { opacity:1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  );
}
