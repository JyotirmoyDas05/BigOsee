/**
 * Tree-sitter based language detection for BigOsee.
 *
 * Parses code with each grammar and picks the one with fewest errors.
 * Loaded lazily — grammars are only fetched from /wasm/ on first use.
 * Used as a fallback when the fast regex detectLanguage() is ambiguous.
 *
 * IMPORTANT: web-tree-sitter is loaded dynamically to avoid SSR issues
 * (it uses Node.js-specific imports at top level that break in Next.js).
 */

import type { DetectedLanguage } from "./transpiler";

// ─── Grammar config ─────────────────────────────────────────────

interface GrammarEntry {
  lang: DetectedLanguage;
  wasmPath: string;
  /** If true, this grammar is expensive to load and only used when
   *  the regex heuristic explicitly suggests it. */
  heavy?: boolean;
}

const GRAMMARS: GrammarEntry[] = [
  { lang: "python", wasmPath: "/wasm/tree-sitter-python.wasm" },
  { lang: "javascript", wasmPath: "/wasm/tree-sitter-javascript.wasm" },
  { lang: "c", wasmPath: "/wasm/tree-sitter-c.wasm" },
  { lang: "java", wasmPath: "/wasm/tree-sitter-java.wasm" },
  { lang: "typescript", wasmPath: "/wasm/tree-sitter-typescript.wasm", heavy: true },
  { lang: "cpp", wasmPath: "/wasm/tree-sitter-cpp.wasm", heavy: true },
];

// ─── Lazy module loading (avoids SSR crash) ─────────────────────
// web-tree-sitter does `import("module")` at top level which breaks
// in Next.js SSR. We load it dynamically only in the browser.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tsModule: any = null;
let parserReady = false;
let initPromise: Promise<void> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const grammarCache = new Map<string, any>();

async function ensureTreeSitter(): Promise<void> {
  if (parserReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Dynamic import — only runs in browser
    tsModule = await import(/* webpackIgnore: true */ "web-tree-sitter");

    const ParserClass = tsModule.Parser;
    await ParserClass.init({
      locateFile: (file: string) => {
        if (file === "tree-sitter.wasm") return "/wasm/tree-sitter.wasm";
        return file;
      },
    });

    parserReady = true;
  })();

  return initPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadGrammar(wasmPath: string): Promise<any> {
  const cached = grammarCache.get(wasmPath);
  if (cached) return cached;

  const lang = await tsModule.Language.load(wasmPath);
  grammarCache.set(wasmPath, lang);
  return lang;
}

// ─── Error counting ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countErrors(node: any): number {
  let count = 0;
  if (node.type === "ERROR" || node.isMissing) {
    count++;
  }
  for (let i = 0; i < node.childCount; i++) {
    count += countErrors(node.child(i));
  }
  return count;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countNodes(node: any): number {
  let count = 1;
  for (let i = 0; i < node.childCount; i++) {
    count += countNodes(node.child(i));
  }
  return count;
}

// ─── Public API ─────────────────────────────────────────────────

export interface DetectionResult {
  language: DetectedLanguage;
  confidence: number; // 0-1, higher = more confident
  errorCount: number;
  nodeCount: number;
}

/**
 * Detect language by parsing with all grammars and picking the one
 * with the lowest error-to-node ratio (fewest errors relative to
 * how much of the code was successfully parsed).
 *
 * @param code - Source code to analyze
 * @param candidates - Optional subset of languages to test (faster).
 *                     If omitted, tests all non-heavy grammars.
 */
export async function detectLanguageAccurate(
  code: string,
  candidates?: DetectedLanguage[],
): Promise<DetectionResult> {
  if (typeof window === "undefined") {
    // SSR fallback — can't load WASM on server
    return { language: "javascript", confidence: 0, errorCount: 0, nodeCount: 0 };
  }

  await ensureTreeSitter();

  const ParserClass = tsModule.Parser;
  const parser = new ParserClass();

  const results: DetectionResult[] = [];

  // Filter grammars to test
  const grammarsToTest = candidates
    ? GRAMMARS.filter((g) => candidates.includes(g.lang))
    : GRAMMARS.filter((g) => !g.heavy); // skip heavy grammars unless explicitly requested

  for (const entry of grammarsToTest) {
    try {
      const grammar = await loadGrammar(entry.wasmPath);
      parser.setLanguage(grammar);
      const tree = parser.parse(code);
      const errorCount = countErrors(tree.rootNode);
      const nodeCount = countNodes(tree.rootNode);

      // Confidence = proportion of successfully parsed nodes
      // A perfect parse has 0 errors → confidence 1.0
      const confidence = nodeCount > 0 ? Math.max(0, 1 - errorCount / nodeCount) : 0;

      results.push({
        language: entry.lang,
        confidence,
        errorCount,
        nodeCount,
      });

      tree.delete();
    } catch {
      // Grammar failed to load — skip
      results.push({
        language: entry.lang,
        confidence: 0,
        errorCount: Infinity,
        nodeCount: 0,
      });
    }
  }

  // Sort by: fewest errors first, then by most nodes (more successful parsing)
  results.sort((a, b) => {
    if (a.errorCount !== b.errorCount) return a.errorCount - b.errorCount;
    return b.nodeCount - a.nodeCount; // more nodes = parsed more successfully
  });

  parser.delete();

  return results[0] ?? { language: "javascript", confidence: 0, errorCount: 0, nodeCount: 0 };
}

/**
 * Quick check: is Tree-sitter available in this environment?
 * Returns false during SSR or if WASM fails to load.
 */
export function isTreeSitterAvailable(): boolean {
  return typeof window !== "undefined";
}

/**
 * Pre-warm Tree-sitter by initializing the parser core.
 * Call on page load for faster first detection.
 */
export function prewarmTreeSitter(): void {
  if (typeof window === "undefined") return;
  ensureTreeSitter().catch(() => {});
}
