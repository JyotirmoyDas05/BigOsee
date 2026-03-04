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
 * Set NEXT_PUBLIC_JUDGE0_URL in .env.local to your Judge0 endpoint.
 * If not set, Judge0 features are silently disabled.
 */

import type { Snapshot } from "./types";

const JUDGE0_URL =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_JUDGE0_URL ?? "")
    : "";

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
 */
export function isJudge0Available(): boolean {
  return JUDGE0_URL.length > 0;
}

/**
 * Submit code to Judge0 and wait for the result.
 * Returns stdout, stderr, and execution status.
 *
 * @throws Error if the language is not supported, the request fails,
 *         or execution times out (15s max).
 */
export async function executeWithJudge0(
  code: string,
  language: string,
): Promise<Judge0Result> {
  if (!JUDGE0_URL) {
    throw new Error("Judge0 is not configured. Set NEXT_PUBLIC_JUDGE0_URL in .env.local");
  }

  const langId = LANGUAGE_IDS[language];
  if (!langId) {
    throw new Error(`Language "${language}" is not supported by Judge0. Supported: ${Object.keys(LANGUAGE_IDS).join(", ")}`);
  }

  // Submit the code
  const submitRes = await fetch(
    `${JUDGE0_URL}/submissions/?base64_encoded=true&wait=false`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: btoa(unescape(encodeURIComponent(code))),
        language_id: langId,
        cpu_time_limit: 5,
        memory_limit: 128000, // 128 MB
      }),
    },
  );

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`Judge0 submission failed (${submitRes.status}): ${text}`);
  }

  const { token } = await submitRes.json();
  if (!token) {
    throw new Error("Judge0 returned no submission token");
  }

  // Poll for result (max 15 seconds)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));

    const resultRes = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true`,
    );

    if (!resultRes.ok) continue;

    const result = await resultRes.json();

    // Status IDs: 1 = In Queue, 2 = Processing, 3+ = finished
    if (result.status?.id > 2) {
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
        status: result.status.description ?? "Unknown",
        compileOutput: decode(result.compile_output),
        time: result.time ?? "0",
        memory: result.memory ?? 0,
      };
    }
  }

  throw new Error("Judge0 execution timed out (15s). The code may be stuck in an infinite loop.");
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
