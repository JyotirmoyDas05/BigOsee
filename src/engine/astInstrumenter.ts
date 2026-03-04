/**
 * AST-based code instrumenter for BigOsee.
 *
 * Uses Tree-sitter to parse Java / C / C++ into a Concrete Syntax Tree,
 * then injects structured snapshot-capture statements at key execution
 * points (variable declarations, assignments, loops, comparisons, swaps).
 *
 * The instrumented code is compiled and run natively via Judge0.
 * Its stdout contains `__SNAP__ {...json...}` lines that are parsed
 * back into Snapshot[] by snapshotParser.ts.
 *
 * This replaces the primitive regex-based instrumentJavaCode() function.
 */

// ─── Tree-sitter lazy loading (same pattern as languageParser.ts) ────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tsModule: any = null;
let parserReady = false;
let initPromise: Promise<void> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const grammarCache = new Map<string, any>();

const GRAMMAR_PATHS: Record<string, string> = {
  java: "/wasm/tree-sitter-java.wasm",
  c: "/wasm/tree-sitter-c.wasm",
  cpp: "/wasm/tree-sitter-cpp.wasm",
};

async function ensureTreeSitter(): Promise<void> {
  if (parserReady) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    tsModule = await import(/* webpackIgnore: true */ "web-tree-sitter");
    await tsModule.Parser.init({
      locateFile: (file: string) =>
        file === "tree-sitter.wasm" ? "/wasm/tree-sitter.wasm" : file,
    });
    parserReady = true;
  })();
  return initPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadGrammar(lang: string): Promise<any> {
  const path = GRAMMAR_PATHS[lang];
  if (!path) throw new Error(`No grammar for "${lang}"`);
  const cached = grammarCache.get(path);
  if (cached) return cached;
  const grammar = await tsModule.Language.load(path);
  grammarCache.set(path, grammar);
  return grammar;
}

// ─── Type classification ─────────────────────────────────────────────

type VarKind =
  | "primitive"
  | "string"
  | "intArray"
  | "doubleArray"
  | "boolArray"
  | "stringArray"
  | "int2dArray"
  | "list"
  | "map"
  | "set"
  | "priorityQueue"
  | "object";

interface VarInfo {
  name: string;
  type: string; // raw type text from source
  kind: VarKind;
  declLine: number; // 1-indexed
}

interface InjectionPoint {
  offset: number; // byte offset in original source where to inject AFTER
  code: string; // language-specific capture statement
}

function classifyJavaType(typeText: string): VarKind {
  const t = typeText.trim();
  if (/^int\s*\[\s*\]\s*\[\s*\]$/.test(t)) return "int2dArray";
  if (/^(int|long|short|byte)\s*\[\s*\]$/.test(t)) return "intArray";
  if (/^(double|float)\s*\[\s*\]$/.test(t)) return "doubleArray";
  if (/^boolean\s*\[\s*\]$/.test(t)) return "boolArray";
  if (/^(String|char)\s*\[\s*\]$/.test(t)) return "stringArray";
  if (/^(int|long|short|byte|char|float|double|boolean)$/.test(t))
    return "primitive";
  if (t === "String") return "string";
  if (/^(List|ArrayList|LinkedList|Vector)\b/.test(t)) return "list";
  if (/^(Map|HashMap|TreeMap|LinkedHashMap|Hashtable)\b/.test(t)) return "map";
  if (/^(Set|HashSet|TreeSet|LinkedHashSet)\b/.test(t)) return "set";
  if (/^PriorityQueue\b/.test(t)) return "priorityQueue";
  return "object";
}

function classifyCType(typeText: string): VarKind {
  const t = typeText.trim();
  if (/^(int|long|short|unsigned|signed|size_t|char|float|double)\b/.test(t)) {
    return "primitive";
  }
  // C arrays are detected by declarator, not type — handled separately
  return "object";
}

// ─── Java preamble ───────────────────────────────────────────────────

const JAVA_SNAP_CLASS = `
  // ── BigOsee instrumentation ──
  static int __step = 0;
  static int __comp = 0;
  static int __swp = 0;
  static final int __MAX = 2000;
  static String __hl = "[]";
  static String __sw = "[]";
  static java.util.ArrayList<String> __cs = new java.util.ArrayList<>(java.util.Arrays.asList("main"));

  static void __enter(String fn) { __cs.add(fn); }
  static void __exit() { if (__cs.size() > 1) __cs.remove(__cs.size() - 1); }

  static String __q(String s) {
    if (s == null) return "null";
    return "\\"" + s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", "\\\\n") + "\\"";
  }
  static String __csJson() {
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < __cs.size(); i++) { if (i > 0) sb.append(","); sb.append(__q(__cs.get(i))); }
    return sb.append("]").toString();
  }
  static String __ia(int[] a) {
    if (a == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < Math.min(a.length, 200); i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
    return sb.append("]").toString();
  }
  static String __da(double[] a) {
    if (a == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < Math.min(a.length, 200); i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
    return sb.append("]").toString();
  }
  static String __ba(boolean[] a) {
    if (a == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < Math.min(a.length, 200); i++) { if (i > 0) sb.append(","); sb.append(a[i] ? 1 : 0); }
    return sb.append("]").toString();
  }
  static String __la(java.util.List<?> l) {
    if (l == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < Math.min(l.size(), 200); i++) { if (i > 0) sb.append(","); sb.append(__jv(l.get(i))); }
    return sb.append("]").toString();
  }
  static String __ma(java.util.Map<?,?> m) {
    if (m == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    boolean f = true;
    int c = 0;
    for (java.util.Map.Entry<?,?> e : m.entrySet()) {
      if (c++ >= 50) break;
      if (!f) sb.append(",");
      sb.append("{").append(__q(String.valueOf(e.getKey()))).append(":").append(__jv(e.getValue())).append("}");
      f = false;
    }
    return sb.append("]").toString();
  }
  static String __sa(java.util.Set<?> s) {
    if (s == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    boolean f = true;
    int c = 0;
    for (Object o : s) {
      if (c++ >= 50) break;
      if (!f) sb.append(",");
      sb.append("{").append(__q(String.valueOf(o))).append(":true}");
      f = false;
    }
    return sb.append("]").toString();
  }
  static String __pqa(java.util.PriorityQueue<?> pq) {
    if (pq == null) return "null";
    Object[] a = pq.toArray();
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < Math.min(a.length, 200); i++) { if (i > 0) sb.append(","); sb.append(__jv(a[i])); }
    return sb.append("]").toString();
  }
  static String __jv(Object v) {
    if (v == null) return "null";
    if (v instanceof Number || v instanceof Boolean) return String.valueOf(v);
    if (v instanceof String) return __q((String) v);
    if (v instanceof int[]) return __ia((int[]) v);
    if (v instanceof double[]) return __da((double[]) v);
    if (v instanceof boolean[]) return __ba((boolean[]) v);
    if (v instanceof java.util.List) return __la((java.util.List<?>) v);
    if (v instanceof java.util.Map) return __ma((java.util.Map<?,?>) v);
    if (v instanceof java.util.Set) return __sa((java.util.Set<?>) v);
    if (v instanceof java.util.PriorityQueue) return __pqa((java.util.PriorityQueue<?>) v);
    return __q(String.valueOf(v));
  }
  static void __cmp() { __comp++; }
  static void __doSwp() { __swp++; }
  static void __setHl(int... idx) {
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < idx.length; i++) { if (i > 0) sb.append(","); sb.append(idx[i]); }
    __hl = sb.append("]").toString();
  }
  static void __setSw(int... idx) {
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < idx.length; i++) { if (i > 0) sb.append(","); sb.append(idx[i]); }
    __sw = sb.append("]").toString();
  }
  static void __clr() { __hl = "[]"; __sw = "[]"; }
`;

function javaSnapCall(
  line: number,
  desc: string,
  vars: VarInfo[],
): string {
  if (vars.length === 0) {
    return `if(__step<__MAX){System.out.println("__SNAP__ {\\"step\\":"+(__step++)+",\\"line\\":${line}"+",\\"desc\\":\\"${esc(desc)}\\""+",\\"comp\\":"+__comp+",\\"swap\\":"+__swp+",\\"cs\\":"+__csJson()+",\\"v\\":{},\\"a\\":{},\\"o\\":{}}");__clr();}`;
  }

  const vParts: string[] = [];
  const aParts: string[] = [];
  const oParts: string[] = [];

  for (const v of vars) {
    const n = v.name;
    const qn = `\\"${n}\\":`;
    switch (v.kind) {
      case "primitive":
        vParts.push(`"${qn}"+${n}`);
        break;
      case "string":
        vParts.push(`"${qn}"+__q(${n})`);
        break;
      case "intArray":
        aParts.push(
          `"${qn}{\\"values\\":"+__ia(${n})+",\\"highlights\\":"+__hl+",\\"swapped\\":"+__sw+",\\"sorted\\":[]}"`,
        );
        break;
      case "doubleArray":
        aParts.push(
          `"${qn}{\\"values\\":"+__da(${n})+",\\"highlights\\":"+__hl+",\\"swapped\\":"+__sw+",\\"sorted\\":[]}"`,
        );
        break;
      case "boolArray":
        aParts.push(
          `"${qn}{\\"values\\":"+__ba(${n})+",\\"highlights\\":[],\\"swapped\\":[],\\"sorted\\":[]}"`,
        );
        break;
      case "int2dArray":
        // Flatten 2D array
        vParts.push(`"${qn}\\"[2D array]\\""`);
        break;
      case "stringArray":
        vParts.push(`"${qn}"+__jv(${n})`);
        break;
      case "list":
        aParts.push(
          `"${qn}{\\"values\\":"+__la(${n})+",\\"highlights\\":[],\\"swapped\\":[],\\"sorted\\":[]}"`,
        );
        break;
      case "map":
        oParts.push(`"${qn}"+__ma(${n})`);
        break;
      case "set":
        oParts.push(`"${qn}"+__sa(${n})`);
        break;
      case "priorityQueue":
        aParts.push(
          `"${qn}{\\"values\\":"+__pqa(${n})+",\\"highlights\\":[],\\"swapped\\":[],\\"sorted\\":[]}"`,
        );
        break;
      case "object":
        vParts.push(`"${qn}"+__jv(${n})`);
        break;
    }
  }

  const vExpr =
    vParts.length > 0 ? vParts.join('+","+'): '""';
  const aExpr =
    aParts.length > 0 ? aParts.join('+","+'): '""';
  const oExpr =
    oParts.length > 0 ? oParts.join('+","+'): '""';

  return (
    `if(__step<__MAX){System.out.println("__SNAP__ {\\"step\\":"+(__step++)+` +
    `",\\"line\\":${line}"+` +
    `",\\"desc\\":\\"${esc(desc)}\\""+` +
    `",\\"comp\\":"+__comp+",\\"swap\\":"+__swp+` +
    `",\\"cs\\":"+__csJson()+` +
    `",\\"v\\":{"+${vExpr}+` +
    `"},\\"a\\":{"+${aExpr}+` +
    `"},\\"o\\":{"+${oExpr}+` +
    `"}}");__clr();}`
  );
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

// ─── C / C++ preamble ────────────────────────────────────────────────

const C_PREAMBLE = `
/* ── BigOsee instrumentation ── */
#include <stdio.h>
static int __step = 0, __comp = 0, __swp = 0;
#define __MAX 2000
static void __snap_begin(int line, const char* desc) {
  printf("__SNAP__ {\\"step\\":%d,\\"line\\":%d,\\"desc\\":\\"%s\\",\\"comp\\":%d,\\"swap\\":%d,\\"cs\\":[\\"main\\"],", __step++, line, desc, __comp, __swp);
}
static void __snap_vars_begin(void) { printf("\\"v\\":{"); }
static void __snap_vi(const char* name, int val, int first) { printf(first ? "\\"%s\\":%d" : ",\\"%s\\":%d", name, val); }
static void __snap_vd(const char* name, double val, int first) { printf(first ? "\\"%s\\":%f" : ",\\"%s\\":%f", name, val); }
static void __snap_arr_begin(void) { printf("},\\"a\\":{"); }
static void __snap_ia(const char* name, int* a, int len, int h1, int h2, int s1, int s2) {
  printf("\\"%s\\":{\\"values\\":[", name);
  for (int i = 0; i < len && i < 200; i++) { if (i) printf(","); printf("%d", a[i]); }
  printf("],\\"highlights\\":[");
  if (h1 >= 0) { printf("%d", h1); if (h2 >= 0) printf(",%d", h2); }
  printf("],\\"swapped\\":[");
  if (s1 >= 0) { printf("%d", s1); if (s2 >= 0) printf(",%d", s2); }
  printf("],\\"sorted\\":[]}");
}
static void __snap_obj_begin(void) { printf("},\\"o\\":{"); }
static void __snap_end(void) { printf("}}\\n"); }
static int __h1 = -1, __h2 = -1, __s1 = -1, __s2 = -1;
static void __set_hl(int a, int b) { __h1=a; __h2=b; }
static void __set_sw(int a, int b) { __s1=a; __s2=b; }
static void __clr(void) { __h1=-1;__h2=-1;__s1=-1;__s2=-1; }
`;

// ─── CST walking helpers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TSNode = any;

function getChildren(node: TSNode): TSNode[] {
  const kids: TSNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    kids.push(node.child(i));
  }
  return kids;
}

function findDescendants(node: TSNode, type: string): TSNode[] {
  const results: TSNode[] = [];
  const visit = (n: TSNode) => {
    if (n.type === type) results.push(n);
    for (let i = 0; i < n.childCount; i++) visit(n.child(i));
  };
  visit(node);
  return results;
}

function findFirst(node: TSNode, type: string): TSNode | null {
  if (node.type === type) return node;
  for (let i = 0; i < node.childCount; i++) {
    const r = findFirst(node.child(i), type);
    if (r) return r;
  }
  return null;
}

function childByField(node: TSNode, fieldName: string): TSNode | null {
  return node.childForFieldName?.(fieldName) ?? null;
}

/** Get the block body of a function/method/loop/if node */
function getBlock(node: TSNode): TSNode | null {
  return findFirst(node, "block");
}

/** Get all statement-level children of a block */
function getStatements(block: TSNode): TSNode[] {
  return getChildren(block).filter(
    (c: TSNode) =>
      c.type !== "{" &&
      c.type !== "}" &&
      c.type !== "comment" &&
      c.type !== "line_comment" &&
      c.type !== "block_comment",
  );
}

// ─── Java analysis ───────────────────────────────────────────────────

function analyzeJava(
  root: TSNode,
  code: string,
): { vars: VarInfo[]; injections: InjectionPoint[] } {
  const allVars: VarInfo[] = [];
  const injections: InjectionPoint[] = [];

  // Find the main class body
  const classDecl = findFirst(root, "class_declaration");
  if (!classDecl) {
    return { vars: allVars, injections };
  }

  // Find all methods
  const methods = findDescendants(classDecl, "method_declaration");

  for (const method of methods) {
    const methodName =
      childByField(method, "name")?.text ?? "unknown";
    const body = getBlock(method);
    if (!body) continue;

    // Collect parameters
    const params = findFirst(method, "formal_parameters");
    if (params) {
      const paramDecls = findDescendants(params, "formal_parameter");
      for (const p of paramDecls) {
        const typeNode = childByField(p, "type");
        const nameNode = childByField(p, "name");
        // Check for array dimensions on the name (e.g., int[] arr or int arr[])
        const dimensions = findFirst(p, "dimensions");
        if (typeNode && nameNode) {
          let typeText = typeNode.text;
          if (dimensions) typeText += "[]";
          allVars.push({
            name: nameNode.text,
            type: typeText,
            kind: classifyJavaType(typeText),
            declLine: p.startPosition.row + 1,
          });
        }
      }
    }

    // Walk the body
    instrumentJavaBlock(body, allVars, injections, methodName, code);
  }

  return { vars: allVars, injections };
}

function instrumentJavaBlock(
  block: TSNode,
  scopeVars: VarInfo[],
  injections: InjectionPoint[],
  funcName: string,
  code: string,
): void {
  const stmts = getStatements(block);

  for (let si = 0; si < stmts.length; si++) {
    const stmt = stmts[si];
    const line = stmt.startPosition.row + 1;

    // ── Variable declarations ──
    if (stmt.type === "local_variable_declaration") {
      const typeNode = childByField(stmt, "type");
      const declarators = findDescendants(stmt, "variable_declarator");
      for (const d of declarators) {
        const nameNode = childByField(d, "name");
        // Check for array dimensions
        const dimensions = findFirst(d, "dimensions");
        if (typeNode && nameNode) {
          let typeText = typeNode.text;
          if (dimensions) typeText += "[]";
          const vi: VarInfo = {
            name: nameNode.text,
            type: typeText,
            kind: classifyJavaType(typeText),
            declLine: line,
          };
          scopeVars.push(vi);
        }
      }
      // Snapshot after declaration
      const visibleVars = scopeVars.filter((v) => v.declLine <= line);
      const desc = `${funcName}(): line ${line}`;
      injections.push({
        offset: stmt.endPosition.index,
        code: "\n" + javaSnapCall(line, desc, visibleVars),
      });
    }

    // ── Expression statements (assignments, method calls) ──
    else if (stmt.type === "expression_statement") {
      const expr = stmt.child(0);

      // Check for comparisons with array subscripts
      const comparisons = findDescendants(stmt, "binary_expression");
      for (const cmp of comparisons) {
        if (isArrayComparison(cmp)) {
          const { idx1Expr, idx2Expr } = extractComparisonIndices(cmp);
          if (idx1Expr && idx2Expr) {
            injections.push({
              offset: stmt.startPosition.index,
              code: `__cmp();__setHl(${idx1Expr},${idx2Expr});\n`,
            });
          }
        }
      }

      // Detect swap patterns (3 consecutive statements)
      if (si + 2 < stmts.length) {
        const swapInfo = detectSwapPattern(
          stmts[si],
          stmts[si + 1],
          stmts[si + 2],
          code,
        );
        if (swapInfo) {
          // Inject after the 3rd statement of the swap
          injections.push({
            offset: stmts[si + 2].endPosition.index,
            code: `\n__doSwp();__setSw(${swapInfo.idx1},${swapInfo.idx2});`,
          });
        }
      }

      // Snapshot after assignment/call
      const visibleVars = scopeVars.filter((v) => v.declLine <= line);
      const desc = describeStatement(expr, funcName, line);
      injections.push({
        offset: stmt.endPosition.index,
        code: "\n" + javaSnapCall(line, desc, visibleVars),
      });
    }

    // ── For loops ──
    else if (
      stmt.type === "for_statement" ||
      stmt.type === "enhanced_for_statement"
    ) {
      // Collect loop variable
      if (stmt.type === "for_statement") {
        const init = childByField(stmt, "init");
        if (init && init.type === "local_variable_declaration") {
          const typeNode = childByField(init, "type");
          const declarators = findDescendants(init, "variable_declarator");
          for (const d of declarators) {
            const nameNode = childByField(d, "name");
            if (typeNode && nameNode) {
              scopeVars.push({
                name: nameNode.text,
                type: typeNode.text,
                kind: classifyJavaType(typeNode.text),
                declLine: line,
              });
            }
          }
        }
      } else {
        // Enhanced for: for (Type name : iterable)
        const typeNode = childByField(stmt, "type");
        const nameNode = childByField(stmt, "name");
        if (typeNode && nameNode) {
          scopeVars.push({
            name: nameNode.text,
            type: typeNode.text,
            kind: classifyJavaType(typeNode.text),
            declLine: line,
          });
        }
      }

      const loopBody = getBlock(stmt);
      if (loopBody) {
        // Snapshot at start of loop body
        const visibleVars = scopeVars.filter((v) => v.declLine <= line);
        const desc = `${funcName}(): loop at line ${line}`;
        const loopStmts = getStatements(loopBody);
        if (loopStmts.length > 0) {
          injections.push({
            offset: loopStmts[0].startPosition.index,
            code: javaSnapCall(line, desc, visibleVars) + "\n",
          });
        }
        // Recurse into loop body
        instrumentJavaBlock(loopBody, [...scopeVars], injections, funcName, code);
      }
    }

    // ── While loops ──
    else if (stmt.type === "while_statement" || stmt.type === "do_statement") {
      const loopBody = getBlock(stmt);
      if (loopBody) {
        const visibleVars = scopeVars.filter((v) => v.declLine <= line);
        const desc = `${funcName}(): while loop at line ${line}`;
        const loopStmts = getStatements(loopBody);
        if (loopStmts.length > 0) {
          injections.push({
            offset: loopStmts[0].startPosition.index,
            code: javaSnapCall(line, desc, visibleVars) + "\n",
          });
        }
        instrumentJavaBlock(loopBody, [...scopeVars], injections, funcName, code);
      }
    }

    // ── If statements ──
    else if (stmt.type === "if_statement") {
      const condition = childByField(stmt, "condition");
      // Check for array comparisons in condition
      if (condition) {
        const comparisons = findDescendants(condition, "binary_expression");
        for (const cmp of comparisons) {
          if (isArrayComparison(cmp)) {
            const { idx1Expr, idx2Expr } = extractComparisonIndices(cmp);
            if (idx1Expr && idx2Expr) {
              injections.push({
                offset: stmt.startPosition.index,
                code: `__cmp();__setHl(${idx1Expr},${idx2Expr});\n`,
              });
            }
          }
        }
      }

      // Instrument consequence
      const consequence = childByField(stmt, "consequence");
      if (consequence && consequence.type === "block") {
        instrumentJavaBlock(
          consequence,
          [...scopeVars],
          injections,
          funcName,
          code,
        );
      }

      // Instrument alternative (else)
      const alternative = childByField(stmt, "alternative");
      if (alternative) {
        const altBlock = getBlock(alternative);
        if (altBlock) {
          instrumentJavaBlock(
            altBlock,
            [...scopeVars],
            injections,
            funcName,
            code,
          );
        } else if (alternative.type === "if_statement") {
          // else if — recurse as if statement
          // (handled next iteration naturally since we process children)
        }
      }
    }

    // ── Return statements ──
    else if (stmt.type === "return_statement") {
      const visibleVars = scopeVars.filter((v) => v.declLine <= line);
      const desc = `${funcName}(): return at line ${line}`;
      injections.push({
        offset: stmt.startPosition.index,
        code: javaSnapCall(line, desc, visibleVars) + "\n",
      });
    }
  }
}

// ─── Comparison detection ────────────────────────────────────────────

function isArrayComparison(node: TSNode): boolean {
  if (node.type !== "binary_expression") return false;
  const ops = getChildren(node).filter(
    (c: TSNode) =>
      c.type === "<" ||
      c.type === ">" ||
      c.type === "<=" ||
      c.type === ">=" ||
      c.type === "==" ||
      c.type === "!=" ||
      c.text === "<" ||
      c.text === ">" ||
      c.text === "<=" ||
      c.text === ">=" ||
      c.text === "==" ||
      c.text === "!=",
  );
  if (ops.length === 0) return false;

  const left = node.child(0);
  const right = node.child(2);
  return hasArrayAccess(left) || hasArrayAccess(right);
}

function hasArrayAccess(node: TSNode): boolean {
  if (!node) return false;
  if (node.type === "array_access" || node.type === "subscript_expression")
    return true;
  for (let i = 0; i < node.childCount; i++) {
    if (hasArrayAccess(node.child(i))) return true;
  }
  return false;
}

function extractComparisonIndices(node: TSNode): {
  idx1Expr: string | null;
  idx2Expr: string | null;
} {
  const left = node.child(0);
  const right = node.child(2);

  const idx1 = extractArrayIndex(left);
  const idx2 = extractArrayIndex(right);

  return { idx1Expr: idx1, idx2Expr: idx2 ?? (idx1 ? "-1" : null) };
}

function extractArrayIndex(node: TSNode): string | null {
  if (!node) return null;
  if (node.type === "array_access" || node.type === "subscript_expression") {
    // index is typically the last child before ']'
    const children = getChildren(node);
    for (let i = children.length - 1; i >= 0; i--) {
      if (
        children[i].type !== "]" &&
        children[i].type !== "[" &&
        children[i].type !== node.child(0)?.type
      ) {
        return children[i].text;
      }
    }
    // Fallback: second child (array[index])
    if (children.length >= 2) return children[1]?.text ?? null;
  }
  // Recurse into children
  for (let i = 0; i < node.childCount; i++) {
    const r = extractArrayIndex(node.child(i));
    if (r) return r;
  }
  return null;
}

// ─── Swap detection ──────────────────────────────────────────────────

interface SwapInfo {
  idx1: string;
  idx2: string;
}

function detectSwapPattern(
  s1: TSNode,
  s2: TSNode,
  s3: TSNode,
  code: string,
): SwapInfo | null {
  // Pattern: temp = arr[X]; arr[X] = arr[Y]; arr[Y] = temp;
  if (
    s1.type !== "expression_statement" &&
    s1.type !== "local_variable_declaration"
  )
    return null;
  if (s2.type !== "expression_statement") return null;
  if (s3.type !== "expression_statement") return null;

  const text1 = code.slice(s1.startPosition.index, s1.endPosition.index);
  const text2 = code.slice(s2.startPosition.index, s2.endPosition.index);
  const text3 = code.slice(s3.startPosition.index, s3.endPosition.index);

  // Simple pattern matching on text
  // s1: (int )? temp = arr[X];
  const m1 = text1.match(
    /(?:int\s+|long\s+|double\s+|float\s+|char\s+)?(\w+)\s*=\s*(\w+)\s*\[([^\]]+)\]/,
  );
  if (!m1) return null;
  const [, tempName, arrName1, idx1] = m1;

  // s2: arr[X] = arr[Y];
  const m2 = text2.match(
    /(\w+)\s*\[([^\]]+)\]\s*=\s*(\w+)\s*\[([^\]]+)\]/,
  );
  if (!m2) return null;
  const [, arrName2, idx2Left, arrName3, idx2Right] = m2;
  if (arrName2 !== arrName1 || arrName3 !== arrName1) return null;
  if (idx2Left !== idx1) return null;

  // s3: arr[Y] = temp;
  const m3 = text3.match(/(\w+)\s*\[([^\]]+)\]\s*=\s*(\w+)/);
  if (!m3) return null;
  const [, arrName4, idx3, tempName2] = m3;
  if (arrName4 !== arrName1 || tempName2 !== tempName) return null;
  if (idx3 !== idx2Right) return null;

  return { idx1: idx1.trim(), idx2: idx2Right.trim() };
}

// ─── Statement description ───────────────────────────────────────────

function describeStatement(
  expr: TSNode,
  funcName: string,
  line: number,
): string {
  if (!expr) return `${funcName}(): line ${line}`;

  if (expr.type === "assignment_expression") {
    const lhs = expr.child(0);
    if (lhs?.type === "array_access" || lhs?.type === "subscript_expression") {
      return `${funcName}(): assign to array at line ${line}`;
    }
    return `${funcName}(): assignment at line ${line}`;
  }

  if (expr.type === "method_invocation" || expr.type === "call_expression") {
    const methodName = childByField(expr, "name")?.text ?? "";
    return `${funcName}(): call ${methodName}() at line ${line}`;
  }

  if (expr.type === "update_expression") {
    return `${funcName}(): increment at line ${line}`;
  }

  return `${funcName}(): line ${line}`;
}

// ─── C/C++ analysis (simplified) ─────────────────────────────────────

function analyzeC(
  root: TSNode,
  code: string,
  lang: "c" | "cpp",
): { vars: VarInfo[]; injections: InjectionPoint[] } {
  const allVars: VarInfo[] = [];
  const injections: InjectionPoint[] = [];

  // Find all function definitions
  const functions = findDescendants(root, "function_definition");

  for (const func of functions) {
    const declarator = childByField(func, "declarator");
    const funcName =
      findFirst(declarator, "identifier")?.text ?? "unknown";
    const body = childByField(func, "body");
    if (!body) continue;

    // Collect parameters
    const paramList = findFirst(declarator, "parameter_list");
    if (paramList) {
      const params = findDescendants(paramList, "parameter_declaration");
      for (const p of params) {
        const pdeclarator = childByField(p, "declarator");
        const typeNode = childByField(p, "type");
        if (pdeclarator && typeNode) {
          const name = findFirst(pdeclarator, "identifier")?.text ?? pdeclarator.text;
          const isArray = pdeclarator.type === "array_declarator" || pdeclarator.type === "pointer_declarator";
          allVars.push({
            name,
            type: typeNode.text + (isArray ? "[]" : ""),
            kind: isArray ? "intArray" : classifyCType(typeNode.text),
            declLine: p.startPosition.row + 1,
          });
        }
      }
    }

    // Walk the body
    instrumentCBlock(body, allVars, injections, funcName, code, lang);
  }

  return { vars: allVars, injections };
}

function instrumentCBlock(
  block: TSNode,
  scopeVars: VarInfo[],
  injections: InjectionPoint[],
  funcName: string,
  code: string,
  lang: "c" | "cpp",
): void {
  const stmts = getStatements(block);

  for (let si = 0; si < stmts.length; si++) {
    const stmt = stmts[si];
    const line = stmt.startPosition.row + 1;

    if (stmt.type === "declaration") {
      const typeNode = childByField(stmt, "type");
      const declarators = findDescendants(stmt, "init_declarator");
      for (const d of declarators) {
        const declr = childByField(d, "declarator");
        if (typeNode && declr) {
          const name = findFirst(declr, "identifier")?.text ?? declr.text;
          const isArray = declr.type === "array_declarator";
          scopeVars.push({
            name,
            type: typeNode.text + (isArray ? "[]" : ""),
            kind: isArray ? "intArray" : classifyCType(typeNode.text),
            declLine: line,
          });
        }
      }
      // Snapshot after declaration
      const visibleVars = scopeVars.filter((v) => v.declLine <= line);
      injections.push({
        offset: stmt.endPosition.index,
        code: "\n" + cSnapCall(line, `${funcName}(): line ${line}`, visibleVars, lang),
      });
    } else if (stmt.type === "expression_statement") {
      // Check for swap patterns
      if (si + 2 < stmts.length) {
        const swapInfo = detectSwapPattern(stmts[si], stmts[si + 1], stmts[si + 2], code);
        if (swapInfo) {
          injections.push({
            offset: stmts[si + 2].endPosition.index,
            code: `\n__swp++;__set_sw(${swapInfo.idx1},${swapInfo.idx2});`,
          });
        }
      }

      // Check for comparisons
      const comparisons = findDescendants(stmt, "binary_expression");
      for (const cmp of comparisons) {
        if (isArrayComparison(cmp)) {
          const { idx1Expr, idx2Expr } = extractComparisonIndices(cmp);
          if (idx1Expr && idx2Expr) {
            injections.push({
              offset: stmt.startPosition.index,
              code: `__comp++;__set_hl(${idx1Expr},${idx2Expr});\n`,
            });
          }
        }
      }

      const visibleVars = scopeVars.filter((v) => v.declLine <= line);
      injections.push({
        offset: stmt.endPosition.index,
        code: "\n" + cSnapCall(line, `${funcName}(): line ${line}`, visibleVars, lang),
      });
    } else if (
      stmt.type === "for_statement" ||
      stmt.type === "while_statement" ||
      stmt.type === "do_statement"
    ) {
      const loopBody = getBlock(stmt) ?? childByField(stmt, "body");
      if (loopBody) {
        // Collect for-loop init variable
        if (stmt.type === "for_statement") {
          const init = childByField(stmt, "initializer");
          if (init && init.type === "declaration") {
            const typeNode = childByField(init, "type");
            const declarators = findDescendants(init, "init_declarator");
            for (const d of declarators) {
              const declr = childByField(d, "declarator");
              if (typeNode && declr) {
                const name = findFirst(declr, "identifier")?.text ?? declr.text;
                scopeVars.push({
                  name,
                  type: typeNode.text,
                  kind: classifyCType(typeNode.text),
                  declLine: line,
                });
              }
            }
          }
        }

        const visibleVars = scopeVars.filter((v) => v.declLine <= line);
        const loopStmts = getStatements(loopBody);
        if (loopStmts.length > 0) {
          injections.push({
            offset: loopStmts[0].startPosition.index,
            code: cSnapCall(line, `${funcName}(): loop at line ${line}`, visibleVars, lang) + "\n",
          });
        }
        instrumentCBlock(loopBody, [...scopeVars], injections, funcName, code, lang);
      }
    } else if (stmt.type === "if_statement") {
      const condition = childByField(stmt, "condition");
      if (condition) {
        const comparisons = findDescendants(condition, "binary_expression");
        for (const cmp of comparisons) {
          if (isArrayComparison(cmp)) {
            const { idx1Expr, idx2Expr } = extractComparisonIndices(cmp);
            if (idx1Expr && idx2Expr) {
              injections.push({
                offset: stmt.startPosition.index,
                code: `__comp++;__set_hl(${idx1Expr},${idx2Expr});\n`,
              });
            }
          }
        }
      }

      const consequence = childByField(stmt, "consequence");
      if (consequence) {
        instrumentCBlock(consequence, [...scopeVars], injections, funcName, code, lang);
      }
      const alternative = childByField(stmt, "alternative");
      if (alternative) {
        const altBody = getBlock(alternative) ?? alternative;
        instrumentCBlock(altBody, [...scopeVars], injections, funcName, code, lang);
      }
    } else if (stmt.type === "return_statement") {
      const visibleVars = scopeVars.filter((v) => v.declLine <= line);
      injections.push({
        offset: stmt.startPosition.index,
        code: cSnapCall(line, `${funcName}(): return`, visibleVars, lang) + "\n",
      });
    }
  }
}

function cSnapCall(
  line: number,
  desc: string,
  vars: VarInfo[],
  _lang: "c" | "cpp",
): string {
  const lines: string[] = [];
  lines.push(`if(__step<__MAX){`);
  lines.push(`__snap_begin(${line},"${esc(desc)}");`);
  lines.push(`__snap_vars_begin();`);

  let first = true;
  const arrayVars: VarInfo[] = [];
  for (const v of vars) {
    if (v.kind === "intArray") {
      arrayVars.push(v);
      continue;
    }
    if (v.kind === "primitive") {
      // Determine if int or float
      if (/^(float|double)$/.test(v.type)) {
        lines.push(`__snap_vd("${v.name}",${v.name},${first ? 1 : 0});`);
      } else {
        lines.push(`__snap_vi("${v.name}",${v.name},${first ? 1 : 0});`);
      }
      first = false;
    }
  }

  lines.push(`__snap_arr_begin();`);
  for (const a of arrayVars) {
    // Need array length — use a heuristic or require it to be in scope
    // For now, try to find a variable named 'n' or the array length
    lines.push(
      `__snap_ia("${a.name}",${a.name},sizeof(${a.name})/sizeof(${a.name}[0]),__h1,__h2,__s1,__s2);`,
    );
  }

  lines.push(`__snap_obj_begin();`);
  lines.push(`__snap_end();__clr();}`);

  return lines.join("");
}

// ─── Public API ──────────────────────────────────────────────────────

export async function instrumentCode(
  code: string,
  lang: "java" | "c" | "cpp",
): Promise<{ instrumentedCode: string; originalLineCount: number }> {
  if (typeof window === "undefined") {
    throw new Error("AST instrumentation requires browser environment");
  }

  await ensureTreeSitter();

  const parser = new tsModule.Parser();
  const grammar = await loadGrammar(lang);
  parser.setLanguage(grammar);

  const tree = parser.parse(code);
  const root = tree.rootNode;

  let result: { vars: VarInfo[]; injections: InjectionPoint[] };

  if (lang === "java") {
    result = analyzeJava(root, code);
  } else {
    result = analyzeC(root, code, lang);
  }

  // Sort injections by offset descending (bottom-up to preserve offsets)
  result.injections.sort((a, b) => b.offset - a.offset);

  // Apply injections
  let instrumented = code;
  for (const inj of result.injections) {
    instrumented =
      instrumented.slice(0, inj.offset) +
      inj.code +
      instrumented.slice(inj.offset);
  }

  // Inject preamble
  if (lang === "java") {
    // Find the class body and inject after the opening brace
    const classBody = findFirst(root, "class_body");
    if (classBody) {
      // Find opening brace position in original code
      const bracePos = code.indexOf("{", classBody.startPosition.index);
      if (bracePos >= 0) {
        // Calculate offset shift from previous injections
        // Since we already did bottom-up injection, we need to find
        // the right position in the instrumented code
        const beforeBrace = code.slice(0, bracePos + 1);
        const afterBrace = code.slice(bracePos + 1);

        // Recalculate: start fresh — inject preamble into the already-instrumented code
        // Find the class opening brace in instrumented code
        const instrBracePos = findClassBraceInInstrumented(instrumented, code, bracePos);
        if (instrBracePos >= 0) {
          instrumented =
            instrumented.slice(0, instrBracePos + 1) +
            "\n" + JAVA_SNAP_CLASS + "\n" +
            instrumented.slice(instrBracePos + 1);
        }
      }
    }

    // Ensure java.util.* import is present
    if (!code.includes("import java.util.")) {
      instrumented = "import java.util.*;\n" + instrumented;
    }
  } else {
    // C/C++: prepend the preamble
    instrumented = C_PREAMBLE + "\n" + instrumented;
  }

  tree.delete();
  parser.delete();

  return {
    instrumentedCode: instrumented,
    originalLineCount: code.split("\n").length,
  };
}

/** Find the class body opening brace position in the instrumented code */
function findClassBraceInInstrumented(
  instrumented: string,
  original: string,
  originalBracePos: number,
): number {
  // Strategy: find the text before the brace in the original,
  // then search for it in the instrumented code
  const textBeforeBrace = original.slice(
    Math.max(0, originalBracePos - 50),
    originalBracePos,
  );
  // Find this text in instrumented code
  const searchPos = instrumented.indexOf(textBeforeBrace);
  if (searchPos >= 0) {
    return searchPos + textBeforeBrace.length;
  }
  // Fallback: find the first { after "class "
  const classIdx = instrumented.indexOf("class ");
  if (classIdx >= 0) {
    return instrumented.indexOf("{", classIdx);
  }
  return -1;
}
