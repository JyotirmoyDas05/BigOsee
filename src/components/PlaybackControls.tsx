"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconReset,
  IconStepBackward,
  IconStepForward,
  IconPlay,
  IconPause,
} from "./icons";
import { useTimelineStore } from "@/stores/timelineStore";
import { useCodeStore } from "@/stores/codeStore";
import { executeCode } from "@/engine/interpreter";
import { detectAlgorithm, detectByQuestionId } from "@/engine/detector";
import {
  transpileToJS,
  detectLanguageWithScore,
  LANGUAGE_LABELS,
} from "@/engine/transpiler";
import { executePython, prewarmPyodide } from "@/engine/pythonRuntime";
import {
  detectLanguageAccurate,
  prewarmTreeSitter,
} from "@/engine/languageParser";
import {
  isJudge0Available,
  executeWithJudge0,
  makeOutputSnapshot,
} from "@/engine/judge0Client";
import { instrumentCode } from "@/engine/astInstrumenter";
import { parseSnapshots } from "@/engine/snapshotParser";

export default function PlaybackControls() {
  const {
    currentStep,
    snapshots,
    isPlaying,
    speed,
    stepForward,
    stepBackward,
    togglePlay,
    setSpeed,
    setCurrentStep,
    setSnapshots,
  } = useTimelineStore();
  const {
    code,
    activeQuestionId,
    setDetectedAlgorithm,
    runError,
    setRunError,
    detectedInputLanguage,
    wasTranspiled,
    setDetectedInputLanguage,
    setWasTranspiled,
    isExecuting,
    setIsExecuting,
    executionStatus,
    setExecutionStatus,
  } = useCodeStore();

  const totalSteps = snapshots.length;
  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;
  const pct = totalSteps > 0 ? Math.round(progress) : 0;
  const snapshot = snapshots[currentStep];

  const logs = useMemo(() => snapshot?.logs ?? [], [snapshot]);

  // ─── Pre-warm Pyodide + Tree-sitter on page mount (background, no UI) ───
  useEffect(() => {
    prewarmPyodide();
    prewarmTreeSitter();
  }, []);

  // ─── Main execution handler ───────────────────────────────────
  const handleRun = useCallback(async () => {
    // Stop any in-flight playback BEFORE touching snapshots
    if (isPlaying) togglePlay();

    // Clear stale error banner
    setRunError(null);
    setIsExecuting(true);
    setExecutionStatus("Preparing…");

    // Yield to let React paint the loading state
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      // ── Language detection: fast regex first, Tree-sitter fallback ──
      const regexResult = detectLanguageWithScore(code);
      let detectedLanguage = regexResult.language;

      // If regex confidence is low (< 3 matches), consult Tree-sitter
      // for a more accurate grammar-based detection
      if (regexResult.score < 3) {
        try {
          setExecutionStatus("Detecting language…");
          const tsResult = await detectLanguageAccurate(code);
          if (tsResult.confidence > 0.7) {
            detectedLanguage = tsResult.language;
          }
        } catch {
          // Tree-sitter failed — stick with regex result
        }
      }

      setDetectedInputLanguage(detectedLanguage);

      let snaps: import("@/engine/types").Snapshot[];

      if (detectedLanguage === "python") {
        // ── Python path: real CPython via Pyodide ──
        setWasTranspiled(false);

        // Algorithm detection on the raw Python code (works with our detector)
        const algo = activeQuestionId
          ? detectByQuestionId(activeQuestionId) || detectAlgorithm(code)
          : detectAlgorithm(code);
        setDetectedAlgorithm(algo);

        snaps = await executePython(code, (status) => {
          setExecutionStatus(status);
        });
      } else {
        // ── JS / C / C++ / Java / TS path ──
        // Hybrid approach for C/C++/Java:
        //   1. Regex transpile → acorn interpreter for step-by-step visualization
        //   2. Judge0 (if configured) for correctness verification / fallback
        setExecutionStatus("Running…");

        const {
          code: jsCode,
          wasTranspiled: transpiled,
        } = transpileToJS(code);
        setWasTranspiled(transpiled);

        // Use the transpiled JS code for detection and execution
        const algo = activeQuestionId
          ? detectByQuestionId(activeQuestionId) || detectAlgorithm(jsCode)
          : detectAlgorithm(jsCode);
        setDetectedAlgorithm(algo);

        // Try the transpile → acorn path first (gives us step-by-step animation)
        let transpileSucceeded = false;
        try {
          snaps = executeCode(jsCode);
          transpileSucceeded = snaps.length > 0;
        } catch {
          snaps = []; // transpile/interpret failed — try Judge0 fallback
        }

        // For C/C++/Java: use AST-based instrumentation via Judge0
        // when transpile fails, or as correctness check when it succeeds
        const isNativeLanguage = ["c", "cpp", "java"].includes(detectedLanguage);
        if (isNativeLanguage && isJudge0Available()) {
          if (!transpileSucceeded) {
            // Transpile failed → use AST instrumentation for rich animation
            try {
              setExecutionStatus("Analyzing code structure…");
              const { instrumentedCode } = await instrumentCode(
                code,
                detectedLanguage as "java" | "c" | "cpp",
              );

              setExecutionStatus("Compiling natively via Judge0…");
              const j0Result = await executeWithJudge0(
                instrumentedCode,
                detectedLanguage,
              );

              if (j0Result.stdout) {
                snaps = parseSnapshots(j0Result.stdout);
              }

              // If AST instrumentation produced no snapshots, fall back to output-only
              if (snaps.length === 0) {
                snaps = [makeOutputSnapshot(j0Result, code)];
              }
            } catch {
              // AST instrumentation failed — try raw Judge0 as last resort
              try {
                setExecutionStatus("Running via Judge0…");
                const j0Result = await executeWithJudge0(code, detectedLanguage);
                snaps = [makeOutputSnapshot(j0Result, code)];
              } catch {
                // Judge0 also failed — no results
              }
            }
          } else {
            // Transpile succeeded → run Judge0 for correctness check
            try {
              setExecutionStatus("Verifying via Judge0…");
              const j0Result = await executeWithJudge0(code, detectedLanguage);
              if (j0Result.stdout && snaps.length > 0) {
                const lastSnap = snaps[snaps.length - 1];
                const j0Logs = j0Result.stdout.split("\n").filter((l) => l.trim());
                snaps[snaps.length - 1] = {
                  ...lastSnap,
                  logs: [...lastSnap.logs, "── Native output (Judge0) ──", ...j0Logs],
                };
              }
            } catch {
              // Judge0 failed — transpile results are still fine
            }
          }
        }
      }

      // ALWAYS call setSnapshots — even with empty array — so stale data clears
      setSnapshots(snaps);

      if (snaps.length === 0) {
        setRunError(
          "No steps captured. Make sure your code calls the function with test data below the definition.",
        );
      }
    } catch (e: unknown) {
      // Surface parse/runtime errors to the user
      const msg = e instanceof Error ? e.message : String(e);
      setRunError(msg);
      setSnapshots([]); // clear stale visualization
    } finally {
      setIsExecuting(false);
      setExecutionStatus(null);
    }
  }, [
    code,
    activeQuestionId,
    isPlaying,
    togglePlay,
    setRunError,
    setDetectedAlgorithm,
    setSnapshots,
    setDetectedInputLanguage,
    setWasTranspiled,
    setIsExecuting,
    setExecutionStatus,
  ]);

  // Auto-run + start playing when a question is selected
  const prevQuestionRef = useRef(activeQuestionId);
  const autoPlayTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeQuestionId && activeQuestionId !== prevQuestionRef.current) {
      prevQuestionRef.current = activeQuestionId;
      const t = setTimeout(() => {
        handleRun();
        // brief extra delay so snapshots settle before play starts
        // track this timeout so we can cancel it on cleanup
        if (autoPlayTimeoutRef.current !== null) {
          clearTimeout(autoPlayTimeoutRef.current);
        }
        autoPlayTimeoutRef.current = window.setTimeout(() => {
          // Read LIVE state, not the stale closure value
          const { isPlaying: liveIsPlaying } = useTimelineStore.getState();
          if (!liveIsPlaying) {
            togglePlay();
          }
        }, 250);
      }, 80);
      return () => {
        clearTimeout(t);
        if (autoPlayTimeoutRef.current !== null) {
          clearTimeout(autoPlayTimeoutRef.current);
          autoPlayTimeoutRef.current = null;
        }
      };
    }
  }, [activeQuestionId, handleRun, togglePlay]);

  // Auto-advance steps when playing
  useEffect(() => {
    if (!isPlaying) return;
    const ms = Math.max(80, 700 / speed);
    const id = setTimeout(stepForward, ms);
    return () => clearTimeout(id);
  }, [isPlaying, currentStep, speed, stepForward]);

  return (
    <div className="flex flex-col gap-3 shrink-0">
      {/* Run button with loading spinner */}
      <button
        onClick={handleRun}
        disabled={isExecuting}
        className="w-full py-2.5 text-sm font-semibold bg-accent text-black rounded-(--radius-panel) hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isExecuting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full" />
            {executionStatus || "Running…"}
          </span>
        ) : (
          "Run Simulation"
        )}
      </button>

      {/* Native Python execution badge */}
      {detectedInputLanguage === "python" && !wasTranspiled && snapshots.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/30 rounded-(--radius-panel) text-[10px] font-mono text-green">
          <span className="font-bold shrink-0">🐍 Python</span>
          <span className="text-green/70">
            executed natively via Pyodide (real CPython in browser)
          </span>
        </div>
      )}

      {/* Transpilation info badge (for C/C++/Java/TS) */}
      {wasTranspiled && detectedInputLanguage && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue/10 border border-blue/30 rounded-(--radius-panel) text-[10px] font-mono text-blue">
          <span className="font-bold shrink-0">
            {LANGUAGE_LABELS[detectedInputLanguage]}
          </span>
          <span className="text-blue/70">
            detected &amp; auto-converted to JavaScript for visualization
          </span>
        </div>
      )}

      {/* Error banner */}
      {runError && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red/10 border border-red/30 rounded-(--radius-panel) text-[11px] font-mono text-red">
          <span className="shrink-0 font-bold mt-px">Error:</span>
          <span className="break-all leading-snug flex-1">{runError}</span>
          <button
            onClick={() => setRunError(null)}
            className="ml-auto shrink-0 text-red/60 hover:text-red transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Step counter + playback */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
          <span>Step</span>
          <span className="text-text-primary font-semibold">
            {totalSteps > 0 ? `${currentStep + 1}/${totalSteps}` : "0/0"}
          </span>
          <span className="text-text-muted ml-1">{pct}%</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentStep(0)}
            disabled={totalSteps === 0}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Reset"
          >
            <IconReset size={14} />
          </button>

          <button
            onClick={stepBackward}
            disabled={currentStep <= 0}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Step Backward"
          >
            <IconStepBackward size={14} />
          </button>

          <button
            onClick={togglePlay}
            disabled={totalSteps === 0}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30 ${
              isPlaying
                ? "bg-accent text-black"
                : "bg-surface-hover text-text-primary hover:bg-accent hover:text-black"
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <IconPause size={13} /> : <IconPlay size={13} />}
          </button>

          <button
            onClick={stepForward}
            disabled={currentStep >= totalSteps - 1}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Step Forward"
          >
            <IconStepForward size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1 bg-border rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (totalSteps === 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          setCurrentStep(Math.round(p * (totalSteps - 1)));
        }}
      >
        <div
          className="h-full bg-accent rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Speed */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted">Speed</span>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.25"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="flex-1 h-1 appearance-none bg-border rounded-full cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
        <span className="text-[10px] text-text-muted font-mono w-5 text-right">
          {speed}x
        </span>
      </div>

      {/* Step description + console logs */}
      {snapshot && (
        <div className="border border-accent/30 rounded-(--radius-panel) bg-accent/5 overflow-hidden">
          {/* animated description bar */}
          <div className="px-3 py-2 border-b border-accent/20 overflow-hidden relative">
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-l" />
            <AnimatePresence mode="wait">
              <motion.div
                key={snapshot.step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-2 pl-2"
              >
                <span className="text-[9px] font-mono text-dark bg-accent px-1.5 py-0.5 rounded font-bold shrink-0 mt-px">
                  L{snapshot.line}
                </span>
                <p className="text-[11px] font-mono text-accent leading-snug">
                  {snapshot.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* comparisons + swaps stats */}
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-accent/10">
            <span className="text-[9px] font-mono text-text-muted">
              Comparisons:{" "}
              <span className="text-accent font-semibold">
                {snapshot.comparisons}
              </span>
            </span>
            <span className="text-[9px] font-mono text-text-muted">
              Swaps:{" "}
              <span className="text-red font-semibold">{snapshot.swaps}</span>
            </span>
          </div>

          {/* logs */}
          {logs.length > 0 && (
            <div className="px-3 py-2 space-y-0.5">
              {logs.slice(-3).map((log, i) => (
                <p
                  key={i}
                  className="text-[10px] font-mono text-green truncate"
                >
                  &gt; {log}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
