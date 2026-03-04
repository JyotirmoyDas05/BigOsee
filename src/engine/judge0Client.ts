/**
 * Judge0 REST client for native C/C++/Java code execution.
 *
 * Sends code to a self-hosted Judge0 instance (or the free API)
 * for real compilation and execution. Returns stdout/stderr.
 *
 * Used in a hybrid approach:
 * 1. Regex transpiler → acorn interpreter for step-by-step visualization
 * 2. Judge0 for correctness verification and fallback when transpile fails
 *
 * Calls Judge0 through the /api/execute proxy (Next.js backend).
 * This avoids CORS issues and hides the Judge0 server IP from the browser.
 * If Judge0 is not configured server-side, features are silently disabled.
 */

import type { Snapshot } from "./types";

// Judge0 language IDs
// See: https://ce.judge0.com/languages
const LANGUAGE_IDS: Record<string, number> = {
  c: 50,       // C (GCC 9.2.0)
  cpp: 54,     // C++ (GCC 9.2.0)
  java: 62,    // Java (OpenJDK 13.0.1)
};

export interface Judge0Result {
  stdout: string;
  stderr: string;
  status: string;
  /** Compilation error output (for C/C++/Java) */
  compileOutput: string;
  /** Execution time in seconds */
  time: string;
  /** Memory usage in KB */
  memory: number;
}

/**
 * Returns true if a Judge0 endpoint is configured.
 * Always returns true on client side (availability is checked when calling the API).
 */
export function isJudge0Available(): boolean {
  return true; // API proxy will check server-side configuration
}

/**
 * Submit code to Judge0 for execution via the /api/execute proxy.
 * Returns stdout, stderr, and execution status.
 *
 * @throws Error if the language is not supported, the request fails,
 *         or execution times out.
 */
export async function executeWithJudge0(
  code: string,
  language: string,
): Promise<Judge0Result> {
  const langId = LANGUAGE_IDS[language];
  if (!langId) {
    throw new Error(`Language "${language}" is not supported by Judge0. Supported: ${Object.keys(LANGUAGE_IDS).join(", ")}`);
  }

  const payload = {
    source_code: btoa(unescape(encodeURIComponent(code))),
    language_id: langId,
    cpu_time_limit: 5,
    memory_limit: 128000, // 128 MB
  };

  // Call the Next.js API proxy (which forwards to Judge0 with wait=true)
  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Judge0 API returned status ${res.status}`
    );
  }

  const result = await res.json();

  // Decode base64 results from Judge0
  const decode = (b64: string | null): string => {
    if (!b64) return "";
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch {
      return atob(b64);
    }
  };

  return {
    stdout: decode(result.stdout),
    stderr: decode(result.stderr),
    status: result.status?.description ?? "Unknown",
    compileOutput: decode(result.compile_output),
    time: result.time ?? "0",
    memory: result.memory ?? 0,
  };
}

/**
 * Create a single "output" snapshot from Judge0 results.
 * Used when the regex transpiler fails but Judge0 succeeds.
 */
export function makeOutputSnapshot(
  result: Judge0Result,
  originalCode: string,
): Snapshot {
  const logs: string[] = [];

  if (result.stdout) {
    logs.push(...result.stdout.split("\n").filter((l) => l.trim()));
  }
  if (result.stderr) {
    logs.push(`[stderr] ${result.stderr}`);
  }
  if (result.compileOutput) {
    logs.push(`[compiler] ${result.compileOutput}`);
  }

  // Count approximate lines in the code for a reasonable line number
  const lineCount = originalCode.split("\n").length;

  return {
    step: 0,
    line: lineCount,
    variables: [],
    arrays: [],
    objects: [],
    callStack: ["main"],
    logs,
    comparisons: 0,
    swaps: 0,
    description: `Execution ${result.status} (${result.time}s, ${Math.round(result.memory / 1024)}MB)`,
    edges: undefined,
    linkedList: undefined,
  };
}
