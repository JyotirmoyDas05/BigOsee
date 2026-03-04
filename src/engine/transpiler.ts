/**
 * Multi-language transpiler: detects C/C++/Java/Python code
 * and converts it to equivalent JavaScript for the acorn interpreter.
 *
 * This is a lightweight regex-based transpiler — not a full compiler.
 * It handles the most common algorithm patterns students paste from
 * LeetCode, textbooks, and online resources.
 */

export type DetectedLanguage = "javascript" | "c" | "cpp" | "java" | "python" | "typescript";

interface TranspileResult {
  code: string;
  detectedLanguage: DetectedLanguage;
  wasTranspiled: boolean;
}

// ─── Language detection ──────────────────────────────────────────────

const C_CPP_INDICATORS = [
  /\b(int|void|float|double|char|long|short|unsigned|signed)\s+\w+\s*\(/,   // typed function decl
  /\bint\s*\[\s*\]/, // int[]
  /\bint\s+\w+\s*=/, // int x =
  /#include\s*</, // #include
  /\bprintf\s*\(/, // printf()
  /\bscanf\s*\(/,
  /\bstd::/,
  /\bcout\s*<</,
  /\bcin\s*>>/,
  /\bNULL\b/,
  /\bnullptr\b/,
  /\bvector\s*</,
  /\busing\s+namespace\b/,
  /\bsizeof\s*\(/,
  /\bmalloc\s*\(/,
  /\bfree\s*\(/,
  /\b(int|void|char|float|double|long)\s+main\s*\(/,
];

const JAVA_INDICATORS = [
  /\bpublic\s+(static\s+)?void\b/,
  /\bpublic\s+(static\s+)?int\b/,
  /\bpublic\s+class\b/,
  /\bprivate\s+(static\s+)?(void|int|String|boolean)\b/,
  /\bstatic\s+void\s+main\s*\(\s*String/,
  /\bSystem\.out\.print/,
  /\bArrayList\s*</,
  /\bHashMap\s*</,
  /\bLinkedList\s*</,
  /\bimport\s+java\./,
  /\bnew\s+(int|String|Integer)\s*\[/,
  /\.length\b(?!\s*\()/, // .length (property, not method — Java arrays)
  /\bint\[\]\s+\w+/, // int[] arr
  /\bString\[\]\s+\w+/,
  /\bboolean\b/,
];

const PYTHON_INDICATORS = [
  /\bdef\s+\w+\s*\(.*\)\s*:/,  // def func():
  /\bif\s+.*:\s*$/m,            // if condition:
  /\bfor\s+\w+\s+in\s+range\(/,
  /\belif\b/,
  /\bprint\s*\(/,
  /\bTrue\b/,
  /\bFalse\b/,
  /\bNone\b/,
  /\bself\./,
  /\bclass\s+\w+.*:\s*$/m,
  /\b__init__\b/,
  /\blen\s*\(/,
  /\brange\s*\(/,
  /\bappend\s*\(/,
  /^\s*#[^!]/m,  // Python comment (not shebang)
  /\bimport\s+\w+/,
  /\bfrom\s+\w+\s+import\b/,
  /\breturn\s+\w+\s*$/m, // return without semicolon at end of line
];

const TS_INDICATORS = [
  /:\s*(number|string|boolean|void)\b/,
  /\binterface\s+\w+/,
  /\btype\s+\w+\s*=/,
  /:\s*\w+\[\]/,
  /\bas\s+(number|string|boolean|any)\b/,
  /<\w+>\s*\(/,
];

function countMatches(code: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    if (p.test(code)) count++;
  }
  return count;
}

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  /** The winning pattern-match score. Low scores (< 3) indicate ambiguity. */
  score: number;
}

export function detectLanguage(code: string): DetectedLanguage {
  return detectLanguageWithScore(code).language;
}

/**
 * Detect language via regex pattern matching and return both
 * the result and the confidence score. Low scores (< 3) mean
 * the detection is ambiguous and Tree-sitter should be consulted.
 */
export function detectLanguageWithScore(code: string): LanguageDetectionResult {
  const trimmed = code.trim();

  // Quick check: if it parses as valid JS, it's probably JS
  // (but we don't want to import acorn here, so use heuristics)

  const cScore = countMatches(trimmed, C_CPP_INDICATORS);
  const javaScore = countMatches(trimmed, JAVA_INDICATORS);
  const pyScore = countMatches(trimmed, PYTHON_INDICATORS);
  const tsScore = countMatches(trimmed, TS_INDICATORS);

  // C++ specific extras
  const cppExtra = /\b(cout|cin|vector|string|std::)\b/.test(trimmed) ? 2 : 0;
  const cppScore = cScore + cppExtra;

  // If no non-JS indicators found, assume JS
  const maxScore = Math.max(cScore, cppScore, javaScore, pyScore, tsScore);
  if (maxScore < 2) return { language: "javascript", score: maxScore };

  // Discriminate between C, C++, Java
  if (javaScore >= cScore && javaScore >= pyScore && javaScore >= 2) {
    // Java vs C/C++: Java has "public", "class", "System.out", "String[]"
    if (/\b(public|private|protected)\b/.test(trimmed) || /\bSystem\.out\b/.test(trimmed)) {
      return { language: "java", score: javaScore };
    }
  }

  if (pyScore > cScore && pyScore > javaScore && pyScore >= 2) return { language: "python", score: pyScore };
  if (tsScore > 2 && tsScore > cScore && tsScore > javaScore) return { language: "typescript", score: tsScore };
  if (cppScore > cScore && cppScore >= 2) return { language: "cpp", score: cppScore };
  if (cScore >= 2) return { language: "c", score: cScore };
  if (javaScore >= 2) return { language: "java", score: javaScore };

  return { language: "javascript", score: maxScore };
}

// ─── Transpilers ─────────────────────────────────────────────────────

function transpileC(code: string): string {
  let js = code;

  // Remove #include directives
  js = js.replace(/#include\s*<[^>]*>\s*\n?/g, "");
  js = js.replace(/#include\s*"[^"]*"\s*\n?/g, "");
  js = js.replace(/#define\s+[^\n]*/g, "");

  // Remove printf/scanf → console.log
  js = js.replace(/printf\s*\(\s*"([^"]*)"(?:\s*,\s*([^)]*))?\s*\)/g, (_, fmt, args) => {
    if (!args) return `console.log("${fmt}")`;
    return `console.log(${args.trim()})`;
  });
  js = js.replace(/scanf\s*\([^)]*\)/g, "/* scanf removed */");

  // C++ I/O
  js = js.replace(/cout\s*<<\s*([^;]+);/g, (_, expr) => {
    const parts = expr.split("<<").map((p: string) => p.trim()).filter((p: string) => p !== "endl" && p !== "\"\\n\"");
    return `console.log(${parts.join(", ")});`;
  });

  // Remove `using namespace std;`
  js = js.replace(/using\s+namespace\s+\w+\s*;\s*\n?/g, "");

  // Convert typed declarations to let/const
  // int[] arr = {...}  →  let arr = [...]
  js = js.replace(/\b(int|float|double|long|char|short|unsigned\s+int|unsigned)\s*\[\s*\]\s+(\w+)\s*=\s*\{([^}]*)\}/g,
    (_, _type, name, vals) => `let ${name} = [${vals}]`);

  // int arr[] = {...}  →  let arr = [...]
  js = js.replace(/\b(int|float|double|long|char|short)\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g,
    (_, _type, name, vals) => `let ${name} = [${vals}]`);

  // int arr[N] = {...}  →  let arr = [...]
  js = js.replace(/\b(int|float|double|long|char|short)\s+(\w+)\s*\[\s*\w*\s*\]\s*=\s*\{([^}]*)\}/g,
    (_, _type, name, vals) => `let ${name} = [${vals}]`);

  // int arr[N];  →  let arr = new Array(N).fill(0);
  js = js.replace(/\b(int|float|double|long|char|short)\s+(\w+)\s*\[\s*(\w+)\s*\]\s*;/g,
    (_, _type, name, size) => `let ${name} = new Array(${size}).fill(0);`);

  // vector<int> v = {...}  →  let v = [...]
  js = js.replace(/\bvector\s*<[^>]*>\s+(\w+)\s*=?\s*\{([^}]*)\}/g,
    (_, name, vals) => `let ${name} = [${vals}]`);
  js = js.replace(/\bvector\s*<[^>]*>\s+(\w+)\s*\(\s*(\w+)\s*(?:,\s*(\w+))?\s*\)/g,
    (_, name, size, fill) => `let ${name} = new Array(${size}).fill(${fill || 0})`);

  // Type declarations: `int x = expr;`  →  `let x = expr;`
  js = js.replace(/\b(int|float|double|long|char|short|unsigned\s+int|unsigned|bool|boolean)\s+(\w+)\s*=/g,
    (_, _type, name) => `let ${name} =`);

  // Type declarations without initialization: `int x;` → `let x = 0;`
  js = js.replace(/\b(int|float|double|long|char|short|unsigned)\s+(\w+)\s*;/g,
    (_, _type, name) => `let ${name} = 0;`);

  // For-loop typed init: `for (int i = ...)` → `for (let i = ...)`
  js = js.replace(/\bfor\s*\(\s*(int|float|double|long|char|short)\s+/g, "for (let ");

  // Function declarations: `void/int/... funcName(int a, int[] b, ...)` → `function funcName(a, b, ...)`
  // Also handles: `vector<int> funcName(...)`, return type with &/*
  js = js.replace(
    /\b(void|int|float|double|long|char|short|bool|boolean|string|String|unsigned\s+\w+|vector\s*<[^>]*>\s*[&*]?)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    (_, _retType, name, params) => {
      const cleanParams = cleanParamList(params);
      return `function ${name}(${cleanParams}) {`;
    }
  );

  // `int main()` → wrap in IIFE
  js = js.replace(/\bfunction\s+main\s*\(\s*\)\s*\{/, "(function main() {");

  // If we opened an IIFE for main, close it
  if (/\(function\s+main\s*\(\s*\)/.test(js)) {
    // Find the matching closing brace for main and append ()
    const mainIdx = js.indexOf("(function main()");
    if (mainIdx >= 0) {
      let braceCount = 0;
      let inMain = false;
      let closeIdx = -1;
      for (let i = mainIdx; i < js.length; i++) {
        if (js[i] === "{") { braceCount++; inMain = true; }
        if (js[i] === "}") {
          braceCount--;
          if (inMain && braceCount === 0) { closeIdx = i; break; }
        }
      }
      if (closeIdx >= 0) {
        js = js.slice(0, closeIdx + 1) + ")();" + js.slice(closeIdx + 1);
      }
    }
  }

  // `sizeof(arr) / sizeof(arr[0])` → `arr.length`
  js = js.replace(/sizeof\s*\(\s*(\w+)\s*\)\s*\/\s*sizeof\s*\(\s*\w+\s*\[\s*0\s*\]\s*\)/g, "$1.length");

  // `NULL` → `null`, `nullptr` → `null`, `true/false` are the same
  js = js.replace(/\bNULL\b/g, "null");
  js = js.replace(/\bnullptr\b/g, "null");

  // swap(a, b) → { let _t = a; a = b; b = _t; }
  js = js.replace(/\bswap\s*\(\s*(\w+(?:\[\w+\])?)\s*,\s*(\w+(?:\[\w+\])?)\s*\)\s*;/g,
    "{ let _t = $1; $1 = $2; $2 = _t; }");

  // C++ STL method conversions
  js = js.replace(/\.size\s*\(\s*\)/g, ".length");
  js = js.replace(/\.push_back\s*\(/g, ".push(");
  js = js.replace(/\.pop_back\s*\(\s*\)/g, ".pop()");
  js = js.replace(/\.empty\s*\(\s*\)/g, "(.length === 0)");
  js = js.replace(/\.front\s*\(\s*\)/g, "[0]");
  js = js.replace(/\.back\s*\(\s*\)/g, "[.length - 1]");
  js = js.replace(/\.begin\s*\(\s*\)/g, "");
  js = js.replace(/\.end\s*\(\s*\)/g, "");
  js = js.replace(/\bsort\s*\(\s*(\w+)\.begin\s*\(\s*\)\s*,\s*\1\.end\s*\(\s*\)\s*\)/g,
    "$1.sort((a, b) => a - b)");

  // `return 0;` in main → remove (JS doesn't need it)
  // (the IIFE will auto-return)

  return js;
}

function transpileJava(code: string): string {
  let js = code;

  // Remove package/import statements
  js = js.replace(/\bpackage\s+[\w.]+\s*;\s*\n?/g, "");
  js = js.replace(/\bimport\s+[\w.*]+\s*;\s*\n?/g, "");

  // Remove class wrapper: `public class X { ... }` → unwrap contents
  // But keep the inner methods
  js = js.replace(/\b(public\s+)?class\s+\w+\s*\{/, "// class start");

  // Remove access modifiers from methods
  js = js.replace(/\b(public|private|protected)\s+(static\s+)?/g, (_, _acc, stat) => stat || "");

  // Convert typed function declarations (including generic return types like HashMap<K,V>)
  js = js.replace(
    /\b(static\s+)?(void|int|float|double|long|char|short|boolean|String|int\[\]|String\[\]|boolean\[\]|double\[\]|List<[^>]*>|ArrayList<[^>]*>|HashMap<[^>]*>|Map<[^>]*>|Set<[^>]*>)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    (_, _stat, _retType, name, params) => {
      const cleanParams = cleanParamList(params);
      return `function ${name}(${cleanParams}) {`;
    }
  );

  // `HashMap<K,V> map = new HashMap<>()` → `let map = new Map()`
  // Must come BEFORE generic type stripping to catch the full pattern
  js = js.replace(/\b(HashMap|TreeMap|LinkedHashMap)\s*<[^>]*>\s+(\w+)\s*=\s*/g,
    (_, _type, name) => `let ${name} = `);
  js = js.replace(/\b(HashSet|TreeSet|LinkedHashSet)\s*<[^>]*>\s+(\w+)\s*=\s*/g,
    (_, _type, name) => `let ${name} = `);
  js = js.replace(/\b(ArrayList|LinkedList|List)\s*<[^>]*>\s+(\w+)\s*=\s*/g,
    (_, _type, name) => `let ${name} = `);

  // `int[] arr = {1, 2, 3};` → `let arr = [1, 2, 3];`
  js = js.replace(/\b(int|float|double|long|char|short|boolean|String)\s*\[\s*\]\s+(\w+)\s*=\s*\{([^}]*)\}/g,
    (_, _type, name, vals) => `let ${name} = [${vals}]`);

  // `int[] arr = new int[n];` → `let arr = new Array(n).fill(0);`
  js = js.replace(/\b(int|float|double|long|char|short|boolean|String)\s*\[\s*\]\s+(\w+)\s*=\s*new\s+\w+\s*\[\s*([^\]]+)\s*\]\s*;/g,
    (_, _type, name, size) => `let ${name} = new Array(${size}).fill(0);`);

  // `new int[]{1,2,3}` → `[1,2,3]`
  js = js.replace(/new\s+(int|float|double|long|char|short|boolean|String)\s*\[\s*\]\s*\{([^}]*)\}/g,
    (_, _type, vals) => `[${vals}]`);

  // `new int[n]` → `new Array(n).fill(0)`
  js = js.replace(/new\s+(int|float|double|long|char|short)\s*\[\s*([^\]]+)\s*\]/g,
    (_, _type, size) => `new Array(${size}).fill(0)`);

  // Variable declarations with types (including array types like `int[]`)
  js = js.replace(/\b(int|float|double|long|char|short|boolean|String)\s*\[\s*\]\s+(\w+)\s*=/g,
    (_, _type, name) => `let ${name} =`);
  js = js.replace(/\b(int|float|double|long|char|short|boolean|String)\s+(\w+)\s*=/g,
    (_, _type, name) => `let ${name} =`);

  // Variable declarations without init
  js = js.replace(/\b(int|float|double|long|char|short|boolean)\s+(\w+)\s*;/g,
    (_, type, name) => {
      const defaultVal = type === "boolean" ? "false" : "0";
      return `let ${name} = ${defaultVal};`;
    });

  // For-loop typed init
  js = js.replace(/\bfor\s*\(\s*(int|float|double|long|char|short)\s+/g, "for (let ");

  // `System.out.println(x)` → `console.log(x)`
  js = js.replace(/System\.out\.println?\s*\(/g, "console.log(");

  // `.length` stays the same for arrays (already JS compatible)

  // ArrayList methods: `.add(x)` → `.push(x)`, `.size()` → `.length`
  // Note: `.get(i)` is left as-is — works for both Map.get() and interpreter handles array.get()
  js = js.replace(/\.add\s*\(/g, ".push(");
  js = js.replace(/\.size\s*\(\s*\)/g, ".length");
  js = js.replace(/\.isEmpty\s*\(\s*\)/g, "(.length === 0)");

  // HashMap methods: `.put(k,v)` → `.set(k,v)`, `.containsKey(k)` → `.has(k)`,
  // `.containsValue(v)` → handled, `.remove(k)` stays, `.keySet()` → `.keys()`
  js = js.replace(/\.put\s*\(/g, ".set(");
  js = js.replace(/\.containsKey\s*\(/g, ".has(");
  js = js.replace(/\.containsValue\s*\(/g, ".has(");
  js = js.replace(/\.getOrDefault\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, ".get($1) ?? $2");
  js = js.replace(/\.keySet\s*\(\s*\)/g, ".keys()");
  js = js.replace(/\.values\s*\(\s*\)/g, ".values()");
  js = js.replace(/\.entrySet\s*\(\s*\)/g, ".entries()");

  // `new ArrayList<>()` → `[]`
  js = js.replace(/new\s+ArrayList\s*<[^>]*>\s*\(\s*\)/g, "[]");
  js = js.replace(/new\s+LinkedList\s*<[^>]*>\s*\(\s*\)/g, "[]");

  // `new HashMap<>()` → `new Map()`
  js = js.replace(/new\s+HashMap\s*<[^>]*>\s*\(\s*\)/g, "new Map()");
  js = js.replace(/new\s+HashSet\s*<[^>]*>\s*\(\s*\)/g, "new Set()");

  // Handle `static void main(String[] args)` → IIFE
  js = js.replace(/\bfunction\s+main\s*\(\s*args?\s*\)\s*\{/, "(function main() {");

  if (/\(function\s+main\s*\(\s*\)/.test(js)) {
    const mainIdx = js.indexOf("(function main()");
    if (mainIdx >= 0) {
      let braceCount = 0;
      let inMain = false;
      let closeIdx = -1;
      for (let i = mainIdx; i < js.length; i++) {
        if (js[i] === "{") { braceCount++; inMain = true; }
        if (js[i] === "}") {
          braceCount--;
          if (inMain && braceCount === 0) { closeIdx = i; break; }
        }
      }
      if (closeIdx >= 0) {
        js = js.slice(0, closeIdx + 1) + ")();" + js.slice(closeIdx + 1);
      }
    }
  }

  // Remove trailing class brace (from "class X {" unwrap)
  // Find last `}` and check if it corresponds to the class wrapper
  if (/\/\/\s*class\s+start/.test(js)) {
    js = js.replace(/\/\/\s*class\s+start\s*\n?/, "");
    // Remove the very last closing brace
    const lastBrace = js.lastIndexOf("}");
    if (lastBrace >= 0) {
      js = js.slice(0, lastBrace) + js.slice(lastBrace + 1);
    }
  }

  // `true`/`false` stay the same in Java/JS
  // `null` stays the same

  // Swap pattern (common in Java):
  // int temp = arr[j]; arr[j] = arr[j+1]; arr[j+1] = temp;
  // → already valid JS after type stripping

  return js;
}

function transpilePython(code: string): string {
  let js = "";
  const lines = code.split("\n");
  const indentStack: number[] = [0]; // track indentation levels
  const blockStack: string[] = []; // track what block type we're in
  const declaredVars = new Set<string>(); // track which vars have been declared (for `let` prefix)

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - line.trimStart().length;

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      js += trimmed.startsWith("#") ? trimmed.replace(/^#/, "//") + "\n" : "\n";
      continue;
    }

    // Close blocks when indentation decreases
    while (indentStack.length > 1 && indent <= indentStack[indentStack.length - 1] && trimmed !== "") {
      indentStack.pop();
      const block = blockStack.pop();
      const braceIndent = "  ".repeat(indentStack.length - 1);
      // Check if next keyword is elif/else — if so, don't close yet
      if (block === "if" && (trimmed.startsWith("elif ") || trimmed.startsWith("else:"))) {
        // Don't close the brace yet, the elif/else will continue it
        js += braceIndent + "} ";
        break;
      } else if (block === "if" || block === "elif") {
        if (trimmed.startsWith("elif ") || trimmed.startsWith("else:")) {
          js += braceIndent + "} ";
          break;
        }
      }
      js += braceIndent + "}\n";
    }

    const jsIndent = "  ".repeat(Math.max(0, indentStack.length - 1));

    // def func(params): → function func(params) {
    const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:/);
    if (funcMatch) {
      const [, name, params] = funcMatch;
      const paramNames = params.split(",").map((p: string) => p.trim().split(/\s*[:=]\s*/)[0].trim()).filter(Boolean);
      // Register function params as declared vars
      for (const pn of paramNames) declaredVars.add(pn);
      const cleanParams = paramNames.join(", ");
      js += `${jsIndent}function ${name}(${cleanParams}) {\n`;
      indentStack.push(indent);
      blockStack.push("def");
      continue;
    }

    // class Name: → (skip class wrapper, we'll inline methods)
    if (/^class\s+\w+.*:\s*$/.test(trimmed)) {
      js += `${jsIndent}// ${trimmed}\n`;
      indentStack.push(indent);
      blockStack.push("class");
      continue;
    }

    // if condition: → if (condition) {
    const ifMatch = trimmed.match(/^if\s+(.+):\s*$/);
    if (ifMatch) {
      const cond = convertPythonExpr(ifMatch[1]);
      js += `${jsIndent}if (${cond}) {\n`;
      indentStack.push(indent);
      blockStack.push("if");
      continue;
    }

    // elif condition: → else if (condition) {
    const elifMatch = trimmed.match(/^elif\s+(.+):\s*$/);
    if (elifMatch) {
      const cond = convertPythonExpr(elifMatch[1]);
      js += `else if (${cond}) {\n`;
      indentStack.push(indent);
      blockStack.push("elif");
      continue;
    }

    // else: → else {
    if (/^else\s*:\s*$/.test(trimmed)) {
      js += `else {\n`;
      indentStack.push(indent);
      blockStack.push("else");
      continue;
    }

    // for i in range(n): → for (let i = 0; i < n; i++) {
    const rangeMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\s*\(\s*([^)]*)\s*\)\s*:/);
    if (rangeMatch) {
      const [, varName, rangeArgs] = rangeMatch;
      declaredVars.add(varName);
      const args = rangeArgs.split(",").map((s: string) => s.trim());
      let forStr: string;
      if (args.length === 1) {
        forStr = `for (let ${varName} = 0; ${varName} < ${args[0]}; ${varName}++)`;
      } else if (args.length === 2) {
        forStr = `for (let ${varName} = ${args[0]}; ${varName} < ${args[1]}; ${varName}++)`;
      } else {
        const step = args[2];
        const cmp = step.startsWith("-") ? ">" : "<";
        forStr = `for (let ${varName} = ${args[0]}; ${varName} ${cmp} ${args[1]}; ${varName} += ${step})`;
      }
      js += `${jsIndent}${forStr} {\n`;
      indentStack.push(indent);
      blockStack.push("for");
      continue;
    }

    // for item in iterable: → for (const item of iterable) {
    const forInMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+):\s*$/);
    if (forInMatch) {
      const [, varName, iterable] = forInMatch;
      declaredVars.add(varName);
      js += `${jsIndent}for (const ${varName} of ${convertPythonExpr(iterable)}) {\n`;
      indentStack.push(indent);
      blockStack.push("for");
      continue;
    }

    // while condition: → while (condition) {
    const whileMatch = trimmed.match(/^while\s+(.+):\s*$/);
    if (whileMatch) {
      const cond = convertPythonExpr(whileMatch[1]);
      js += `${jsIndent}while (${cond}) {\n`;
      indentStack.push(indent);
      blockStack.push("while");
      continue;
    }

    // return expr → return expr;
    if (/^return\b/.test(trimmed)) {
      const expr = trimmed.replace(/^return\s*/, "");
      js += `${jsIndent}return ${convertPythonExpr(expr)};\n`;
      continue;
    }

    // print(...) → console.log(...)
    line = trimmed.replace(/\bprint\s*\(/g, "console.log(");

    // len(x) → x.length
    line = line.replace(/\blen\s*\(\s*(\w+)\s*\)/g, "$1.length");

    // True/False/None → true/false/null
    line = line.replace(/\bTrue\b/g, "true");
    line = line.replace(/\bFalse\b/g, "false");
    line = line.replace(/\bNone\b/g, "null");

    // `and`/`or`/`not` → `&&`/`||`/`!`
    line = line.replace(/\band\b/g, "&&");
    line = line.replace(/\bor\b/g, "||");
    line = line.replace(/\bnot\b/g, "!");

    // `x // y` → `Math.floor(x / y)` (integer division)
    // Handle complex expressions like `(left + right) // 2` and simple `a // b`
    // Use a broad pattern that catches parens and operators on the left side
    line = line.replace(/(\([^)]+\))\s*\/\/\s*(\w+(?:\[.*?\])?)/g, "Math.floor($1 / $2)");
    line = line.replace(/(\w+(?:\[.*?\])?)\s*\/\/\s*(\w+(?:\[.*?\])?)/g, "Math.floor($1 / $2)");

    // `x ** y` → `Math.pow(x, y)` (or `**` is valid in JS, so keep it)
    // Actually `**` is valid in ES2020 JS, so we leave it

    // `.append(x)` → `.push(x)`
    line = line.replace(/\.append\s*\(/g, ".push(");

    // `.pop(0)` → `.shift()` (dequeue), `.pop()` stays the same
    line = line.replace(/\.pop\s*\(\s*0\s*\)/g, ".shift()");

    // `x in arr` (membership test outside of for-loop) — leave as-is for now,
    // the interpreter handles it

    // Assignment without let — in Python all vars are auto-declared
    // but in our transpiled output they need `let` for first assignment.
    // Track which vars have been declared to avoid re-declaring with `let`
    const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch && !line.includes("==") && !line.includes("let ")) {
      const varName = assignMatch[1];
      if (!declaredVars.has(varName)) {
        declaredVars.add(varName);
        line = `let ${line}`;
      }
    }

    // Ensure semicolons
    if (line && !line.endsWith("{") && !line.endsWith("}") && !line.endsWith(";") && !line.endsWith("//") && !line.startsWith("//")) {
      line = line + ";";
    }

    js += `${jsIndent}${line}\n`;
  }

  // Close any remaining open blocks
  while (indentStack.length > 1) {
    indentStack.pop();
    blockStack.pop();
    const braceIndent = "  ".repeat(indentStack.length - 1);
    js += `${braceIndent}}\n`;
  }

  return js;
}

function convertPythonExpr(expr: string): string {
  let result = expr.trim();
  result = result.replace(/\bTrue\b/g, "true");
  result = result.replace(/\bFalse\b/g, "false");
  result = result.replace(/\bNone\b/g, "null");
  result = result.replace(/\band\b/g, "&&");
  result = result.replace(/\bor\b/g, "||");
  result = result.replace(/\bnot\b/g, "!");
  result = result.replace(/\blen\s*\(\s*(\w+)\s*\)/g, "$1.length");
  // Integer division: `(a + b) // 2` and `a // b`
  result = result.replace(/(\([^)]+\))\s*\/\/\s*(\w+(?:\[.*?\])?)/g, "Math.floor($1 / $2)");
  result = result.replace(/(\w+(?:\[.*?\])?)\s*\/\/\s*(\w+(?:\[.*?\])?)/g, "Math.floor($1 / $2)");
  return result;
}

function transpileTypeScript(code: string): string {
  let js = code;

  // Remove type annotations from variable declarations: `let x: number = 5` → `let x = 5`
  js = js.replace(/:\s*(number|string|boolean|any|void|never|unknown|null|undefined)(\[\])*(\s*[=;,)\n])/g, "$3");

  // Remove type annotations from function params: `(a: number, b: string)` → `(a, b)`
  js = js.replace(/(\w+)\s*:\s*(number|string|boolean|any|void|never|unknown|null|undefined)(\[\])*/g, "$1");

  // Remove type annotations from return types: `): number {` → `) {`
  js = js.replace(/\)\s*:\s*(number|string|boolean|any|void|never|unknown|null|undefined)(\[\])*\s*\{/g, ") {");

  // Remove interface/type declarations
  js = js.replace(/\b(interface|type)\s+\w+\s*(\{[^}]*\}|=[^;]*;)\s*\n?/g, "");

  // Remove `as Type` casts
  js = js.replace(/\bas\s+(number|string|boolean|any|unknown|void|never|null|undefined)(\[\])*/g, "");

  // Remove generic type params from calls: `Array<number>` → `Array`
  js = js.replace(/<\s*(number|string|boolean|any|unknown|void|never)(\[\])*\s*>/g, "");

  return js;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Strip type annotations from a C/Java parameter list */
function cleanParamList(params: string): string {
  if (!params.trim()) return "";
  return params
    .split(",")
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // Handle `int[] arr`, `int arr[]`, `int arr`, `String[] args`, `final int x`,
      // `vector<int>& arr`, `int* ptr`, `const int& x`
      const parts = trimmed
        .replace(/\bfinal\s+/g, "")
        .replace(/\bconst\s+/g, "")
        .replace(/\[\s*\]/g, "")
        .replace(/[&*]/g, "")
        .replace(/\bvector\s*<[^>]*>/g, "")
        .trim()
        .split(/\s+/);
      // Last token is the parameter name
      return parts[parts.length - 1];
    })
    .filter(Boolean)
    .join(", ");
}

// ─── Main API ────────────────────────────────────────────────────────

/**
 * Detects the language of the input code and transpiles it to JavaScript
 * if needed. Returns the (possibly transpiled) code, detected language,
 * and whether transpilation occurred.
 */
export function transpileToJS(code: string): TranspileResult {
  const lang = detectLanguage(code);

  switch (lang) {
    case "c":
    case "cpp":
      return { code: transpileC(code), detectedLanguage: lang, wasTranspiled: true };
    case "java":
      return { code: transpileJava(code), detectedLanguage: lang, wasTranspiled: true };
    case "python":
      return { code: transpilePython(code), detectedLanguage: lang, wasTranspiled: true };
    case "typescript":
      return { code: transpileTypeScript(code), detectedLanguage: lang, wasTranspiled: true };
    case "javascript":
    default:
      return { code, detectedLanguage: "javascript", wasTranspiled: false };
  }
}

/** Friendly language labels for the UI */
export const LANGUAGE_LABELS: Record<DetectedLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  c: "C",
  cpp: "C++",
  java: "Java",
  python: "Python",
};
