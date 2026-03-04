/* universal AST interpreter - executes JS step by step */
import * as acorn from "acorn";
import type {
  Snapshot,
  ArrayState,
  VariableState,
  ObjectState,
  LLNodeState,
  LinkedListState,
} from "./types";

type Scope = Map<string, unknown>;

interface ExecContext {
  snapshots: Snapshot[];
  comparisons: number;
  swaps: number;
  stepCount: number;
  scopes: Scope[];
  trackedArrays: Map<string, number[]>;
  trackedObjects: Map<string, Record<string, unknown>>;
  highlights: number[];
  swapped: number[];
  sorted: number[];
  callStack: string[];
  logs: string[];
  maxSteps: number;
  swapPhase: number;
  edges: [number, number][]; // graph edges extracted from adjacency lists
  thisContext: unknown; // current `this` binding for class constructors
  nodeIdMap: WeakMap<object, number>; // stable identity for LL nodes
  nextNodeId: number;
}

function createContext(maxSteps = 5000): ExecContext {
  return {
    snapshots: [],
    comparisons: 0,
    swaps: 0,
    stepCount: 0,
    scopes: [new Map()],
    trackedArrays: new Map(),
    trackedObjects: new Map(),
    highlights: [],
    swapped: [],
    sorted: [],
    callStack: [],
    logs: [],
    maxSteps,
    swapPhase: 0,
    edges: [],
    thisContext: undefined,
    nodeIdMap: new WeakMap(),
    nextNodeId: 0,
  };
}

function currentScope(ctx: ExecContext): Scope {
  return ctx.scopes[ctx.scopes.length - 1];
}

function lookupVar(ctx: ExecContext, name: string): unknown {
  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    if (ctx.scopes[i].has(name)) return ctx.scopes[i].get(name);
  }
  return undefined;
}

function setVar(ctx: ExecContext, name: string, value: unknown) {
  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    if (ctx.scopes[i].has(name)) {
      ctx.scopes[i].set(name, value);
      trackValue(ctx, name, value);
      return;
    }
  }
  currentScope(ctx).set(name, value);
  trackValue(ctx, name, value);
}

// track arrays and objects by name
function trackValue(ctx: ExecContext, name: string, value: unknown) {
  if (Array.isArray(value)) {
    // Detect adjacency list: array of arrays → extract graph edges
    if (value.length > 0 && Array.isArray(value[0])) {
      const edges: [number, number][] = [];
      value.forEach((neighbors, src) => {
        if (Array.isArray(neighbors)) {
          (neighbors as number[]).forEach((dst) => {
            if (typeof dst === "number") edges.push([src, dst]);
          });
        }
      });
      if (edges.length > 0) ctx.edges = edges;
      // Also flatten for array tracking
      ctx.trackedArrays.set(
        name,
        value.flat().map((v) => (typeof v === "number" ? v : 0)),
      );
      ctx.trackedObjects.delete(name);
      return;
    }
    ctx.trackedArrays.set(name, value as number[]);
    ctx.trackedObjects.delete(name);
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    ctx.trackedObjects.set(name, value as Record<string, unknown>);
    ctx.trackedArrays.delete(name);
  }
}

function pushScope(ctx: ExecContext) {
  ctx.scopes.push(new Map());
}
function popScope(ctx: ExecContext) {
  if (ctx.scopes.length > 1) ctx.scopes.pop();
}

function getArraySnapshot(ctx: ExecContext): ArrayState[] {
  const arrays: ArrayState[] = [];
  ctx.trackedArrays.forEach((rawArr, name) => {
    const arr = rawArr as unknown[];
    const hasNonNumeric = arr.some((v) => typeof v !== "number");
    // Map values: booleans → 0/1, strings → char code, else 0
    const nums = arr.map((v) => {
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "string" && v.length > 0) return v.charCodeAt(0);
      return 0;
    });
    // Build display labels for non-numeric arrays
    const labels: string[] | undefined = hasNonNumeric
      ? arr.map((v) => {
          if (v === null || v === undefined) return "·";
          if (typeof v === "boolean") return v ? "T" : "F";
          if (typeof v === "string") return v.slice(0, 4);
          if (typeof v === "number") return String(v);
          return "?";
        })
      : undefined;
    arrays.push({
      name,
      values: [...nums],
      labels,
      highlights: [...ctx.highlights],
      swapped: [...ctx.swapped],
      sorted: [...ctx.sorted],
    });
  });
  return arrays;
}

function getObjectSnapshot(ctx: ExecContext): ObjectState[] {
  const objects: ObjectState[] = [];
  const prevSnap = ctx.snapshots[ctx.snapshots.length - 1];
  const prevObjMap = new Map<string, Map<string, unknown>>();
  if (prevSnap) {
    prevSnap.objects.forEach((o) => {
      const m = new Map<string, unknown>();
      o.entries.forEach((e) => m.set(e.key, e.value));
      prevObjMap.set(o.name, m);
    });
  }

  ctx.trackedObjects.forEach((obj, name) => {
    const prevEntries = prevObjMap.get(name);
    const entries = Object.keys(obj).map((key) => ({
      key,
      value: obj[key],
      changed: prevEntries ? prevEntries.get(key) !== obj[key] : true,
    }));
    objects.push({ name, entries });
  });
  return objects;
}

/* ── Linked-list chain extraction from object graph ── */
function extractLinkedList(ctx: ExecContext): LinkedListState | undefined {
  // Collect all variables that point to potential LL nodes (objects with a "val" key)
  const seen = new Set<string>();
  const llVars: { name: string; obj: Record<string, unknown> }[] = [];

  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    ctx.scopes[i].forEach((val, name) => {
      if (seen.has(name)) return;
      seen.add(name);
      if (
        val &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        "val" in (val as Record<string, unknown>)
      ) {
        llVars.push({ name, obj: val as Record<string, unknown> });
      }
    });
  }

  if (llVars.length === 0) return undefined;

  // Walk all chains to discover every reachable node
  const allNodes = new Map<number, Record<string, unknown>>(); // id → obj
  const visited = new Set<object>();

  function walkChain(obj: unknown) {
    let node = obj;
    let safety = 0;
    while (
      node &&
      typeof node === "object" &&
      !Array.isArray(node) &&
      safety < 200
    ) {
      if (visited.has(node as object)) break;
      visited.add(node as object);
      const rec = node as Record<string, unknown>;
      if (!("val" in rec)) break;
      let id = ctx.nodeIdMap.get(rec);
      if (id === undefined) {
        id = ctx.nextNodeId++;
        ctx.nodeIdMap.set(rec, id);
      }
      allNodes.set(id, rec);
      node = rec.next;
      safety++;
    }
  }

  for (const { obj } of llVars) walkChain(obj);
  if (allNodes.size === 0) return undefined;

  // Sort by creation-order id → visual left-to-right position
  const sortedIds = [...allNodes.keys()].sort((a, b) => a - b);
  const idToIdx = new Map<number, number>();
  sortedIds.forEach((id, idx) => idToIdx.set(id, idx));

  // Build node states
  const nodes: LLNodeState[] = sortedIds.map((id) => {
    const obj = allNodes.get(id)!;
    const nextObj = obj.next;
    let nextIdx = -1;
    if (nextObj && typeof nextObj === "object" && !Array.isArray(nextObj)) {
      const nid = ctx.nodeIdMap.get(nextObj as Record<string, unknown>);
      if (nid !== undefined) nextIdx = idToIdx.get(nid) ?? -1;
    }
    return {
      id: idToIdx.get(id)!,
      val: typeof obj.val === "number" ? obj.val : 0,
      next: nextIdx,
      highlighted: false,
    };
  });

  // Map variable names → node indices
  const pointers: { name: string; nodeId: number }[] = [];
  for (const { name, obj } of llVars) {
    const id = ctx.nodeIdMap.get(obj);
    if (id !== undefined) {
      const idx = idToIdx.get(id);
      if (idx !== undefined) {
        pointers.push({ name, nodeId: idx });
      }
    }
  }

  return { nodes, pointers };
}

function recordSnapshot(ctx: ExecContext, line: number, desc: string) {
  const variables: VariableState[] = [];
  const seen = new Set<string>();

  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    ctx.scopes[i].forEach((val, name) => {
      if (seen.has(name)) return;
      seen.add(name);
      if (
        !Array.isArray(val) &&
        typeof val !== "function" &&
        !(val && typeof val === "object")
      ) {
        variables.push({
          name,
          value: val,
          type: typeof val,
          changed: false,
        });
      }
    });
  }

  const arrays = getArraySnapshot(ctx);
  const objects = getObjectSnapshot(ctx);
  const linkedList = extractLinkedList(ctx);

  // mark changed vars
  const prevSnap = ctx.snapshots[ctx.snapshots.length - 1];
  if (prevSnap) {
    const prevMap = new Map(prevSnap.variables.map((v) => [v.name, v.value]));
    variables.forEach((v) => {
      if (prevMap.has(v.name) && prevMap.get(v.name) !== v.value)
        v.changed = true;
    });
  }

  ctx.snapshots.push({
    step: ctx.stepCount++,
    line,
    variables,
    arrays,
    objects,
    callStack: [...ctx.callStack],
    logs: [...ctx.logs],
    comparisons: ctx.comparisons,
    swaps: ctx.swaps,
    description: desc,
    edges: ctx.edges.length > 0 ? [...ctx.edges] : undefined,
    linkedList,
  });

  ctx.highlights = [];
  ctx.swapped = [];
}

// signals
type Signal =
  | { type: "return"; value: unknown }
  | { type: "break"; label?: string }
  | { type: "continue"; label?: string }
  | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalNode(node: any, ctx: ExecContext): unknown {
  if (ctx.stepCount >= ctx.maxSteps) return undefined;
  switch (node.type) {
    case "Program":
      for (const stmt of node.body) {
        const sig = evalStatement(stmt, ctx);
        if (sig) return sig;
      }
      return undefined;
    default:
      return evalExpr(node, ctx);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalStatement(node: any, ctx: ExecContext): Signal {
  if (ctx.stepCount >= ctx.maxSteps) return null;

  switch (node.type) {
    case "VariableDeclaration": {
      for (const decl of node.declarations) {
        const val = decl.init ? evalExpr(decl.init, ctx) : undefined;
        const line = node.loc?.start?.line ?? 0;

        if (decl.id.type === "Identifier") {
          // Normal: const x = …
          const name = decl.id.name;
          currentScope(ctx).set(name, val);
          trackValue(ctx, name, val);
          const POINTER_NAMES = new Set(["i","j","k","l","r","left","right","low","high","mid","start","end","slow","fast","ptr","prev","curr","head","tail","top","bottom"]);
          const desc = (POINTER_NAMES.has(name) && typeof val === "number")
            ? `Pointer ${name} ← ${val}`
            : `Declared ${name} = ${formatVal(val)}`;
          recordSnapshot(ctx, line, desc);

        } else if (decl.id.type === "ArrayPattern") {
          // Array destructuring: const [a, b, ...rest] = arr
          const arr = Array.isArray(val) ? val : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          decl.id.elements.forEach((el: any, i: number) => {
            if (!el) return; // hole: const [, b] = …
            if (el.type === "RestElement" && el.argument?.type === "Identifier") {
              const name = el.argument.name;
              const rest = arr.slice(i);
              currentScope(ctx).set(name, rest);
              trackValue(ctx, name, rest);
            } else if (el.type === "Identifier") {
              const v = i < arr.length ? arr[i] : undefined;
              currentScope(ctx).set(el.name, v);
              trackValue(ctx, el.name, v);
            } else if (el.type === "AssignmentPattern" && el.left?.type === "Identifier") {
              const v = (i < arr.length && arr[i] !== undefined) ? arr[i] : evalExpr(el.right, ctx);
              currentScope(ctx).set(el.left.name, v);
              trackValue(ctx, el.left.name, v);
            }
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const names = (decl.id.elements as any[])
            .filter(Boolean)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((el: any) => el.type === "RestElement" ? `...${el.argument?.name}` : (el.name ?? el.left?.name ?? "?"))
            .join(", ");
          recordSnapshot(ctx, line, `Destructured [${names}] from ${formatVal(val)}`);

        } else if (decl.id.type === "ObjectPattern") {
          // Object destructuring: const { x, y: z, ...rest } = obj
          const srcObj = (val && typeof val === "object" && !Array.isArray(val))
            ? val as Record<string, unknown> : {};
          const usedKeys = new Set<string>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const prop of decl.id.properties as any[]) {
            if (prop.type === "RestElement" && prop.argument?.type === "Identifier") {
              const restName = prop.argument.name;
              const rest: Record<string, unknown> = {};
              Object.keys(srcObj).forEach(k => { if (!usedKeys.has(k)) rest[k] = srcObj[k]; });
              currentScope(ctx).set(restName, rest);
              trackValue(ctx, restName, rest);
            } else {
              const key = prop.key?.type === "Identifier"
                ? prop.key.name
                : String(evalExpr(prop.key, ctx));
              usedKeys.add(key);
              let bindName = key;
              let bindVal: unknown = srcObj[key];
              if (prop.value?.type === "Identifier") {
                bindName = prop.value.name;
              } else if (prop.value?.type === "AssignmentPattern" && prop.value.left?.type === "Identifier") {
                bindName = prop.value.left.name;
                if (bindVal === undefined) bindVal = evalExpr(prop.value.right, ctx);
              }
              currentScope(ctx).set(bindName, bindVal);
              trackValue(ctx, bindName, bindVal);
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const names = (decl.id.properties as any[])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => p.type === "RestElement" ? `...${p.argument?.name}` : (p.key?.name ?? "?"))
            .join(", ");
          recordSnapshot(ctx, line, `Destructured {${names}} from ${formatVal(val)}`);

        } else {
          // Fallback for any other pattern
          currentScope(ctx).set("?", val);
          recordSnapshot(ctx, line, `Declared ? = ${formatVal(val)}`);
        }
      }
      return null;
    }

    case "ExpressionStatement": {
      evalExpr(node.expression, ctx);
      recordSnapshot(
        ctx,
        node.loc?.start?.line ?? 0,
        describeExpression(node.expression),
      );
      return null;
    }

    case "ForStatement": {
      if (node.init) {
        if (node.init.type === "VariableDeclaration")
          evalStatement(node.init, ctx);
        else evalExpr(node.init, ctx);
      }
      while (true) {
        if (ctx.stepCount >= ctx.maxSteps) break;
        if (node.test) {
          const test = evalExpr(node.test, ctx);
          const condText = describeExprShort(node.test);
          recordSnapshot(
            ctx,
            node.loc?.start?.line ?? 0,
            `for: ${condText} → ${test ? "continue" : "exit loop"}`,
          );
          if (!test) break;
        }
        const sig = evalBlock(node.body, ctx);
        if (sig?.type === "break") break;
        if (sig?.type === "return") return sig;
        if (node.update) evalExpr(node.update, ctx);
      }
      return null;
    }

    case "WhileStatement": {
      while (true) {
        if (ctx.stepCount >= ctx.maxSteps) break;
        const test = evalExpr(node.test, ctx);
        const whileCond = describeExprShort(node.test);
        recordSnapshot(
          ctx,
          node.test.loc?.start?.line ?? 0,
          `while (${whileCond}) → ${test ? "enter body" : "exit loop"}`,
        );
        if (!test) break;
        const sig = evalBlock(node.body, ctx);
        if (sig?.type === "break") break;
        if (sig?.type === "return") return sig;
      }
      return null;
    }

    case "DoWhileStatement": {
      do {
        if (ctx.stepCount >= ctx.maxSteps) break;
        const sig = evalBlock(node.body, ctx);
        if (sig?.type === "break") break;
        if (sig?.type === "return") return sig;
        const test = evalExpr(node.test, ctx);
        const doWhileCond = describeExprShort(node.test);
        recordSnapshot(
          ctx,
          node.test.loc?.start?.line ?? 0,
          `do-while (${doWhileCond}) → ${test ? "repeat" : "exit loop"}`,
        );
        if (!test) break;
      } while (true);
      return null;
    }

    case "ForInStatement": {
      const obj = evalExpr(node.right, ctx);
      if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj as Record<string, unknown>)) {
          if (ctx.stepCount >= ctx.maxSteps) break;
          if (node.left.type === "VariableDeclaration") {
            const name = node.left.declarations[0]?.id?.name;
            if (name) {
              currentScope(ctx).set(name, key);
              recordSnapshot(
                ctx,
                node.loc?.start?.line ?? 0,
                `for-in: ${name} = ${key}`,
              );
            }
          } else if (node.left.type === "Identifier") {
            setVar(ctx, node.left.name, key);
          }
          const sig = evalBlock(node.body, ctx);
          if (sig?.type === "break") break;
          if (sig?.type === "return") return sig;
        }
      }
      return null;
    }

    case "ForOfStatement": {
      const iterable = evalExpr(node.right, ctx);

      // Build a flat array of items regardless of source type
      let items: unknown[] = [];
      if (Array.isArray(iterable)) {
        items = iterable;
      } else if (typeof iterable === "string") {
        items = iterable.split(""); // iterate characters
      } else if (iterable && typeof iterable === "object") {
        const o = iterable as Record<string, unknown>;
        if (o._isMap && typeof o.entries === "function") {
          items = (o.entries as () => unknown[])();
        } else if (o._isSet && typeof o.forEach === "function") {
          const arr: unknown[] = [];
          (o.forEach as (fn: (v: unknown) => void) => void)((v) => arr.push(v));
          items = arr;
        }
      }

      for (const item of items) {
        if (ctx.stepCount >= ctx.maxSteps) break;

        if (node.left.type === "VariableDeclaration") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pattern = node.left.declarations[0]?.id as any;
          const forOfLine = node.loc?.start?.line ?? 0;

          if (pattern?.type === "Identifier") {
            currentScope(ctx).set(pattern.name, item);
            trackValue(ctx, pattern.name, item);
            recordSnapshot(ctx, forOfLine, `for-of: ${pattern.name} = ${formatVal(item)}`);

          } else if (pattern?.type === "ArrayPattern") {
            // for (const [k, v] of map.entries())
            const arr = Array.isArray(item) ? item : [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pattern.elements.forEach((el: any, i: number) => {
              if (el?.type === "Identifier") {
                currentScope(ctx).set(el.name, arr[i]);
                trackValue(ctx, el.name, arr[i]);
              } else if (el?.type === "AssignmentPattern" && el.left?.type === "Identifier") {
                const v = (i < arr.length && arr[i] !== undefined) ? arr[i] : evalExpr(el.right, ctx);
                currentScope(ctx).set(el.left.name, v);
                trackValue(ctx, el.left.name, v);
              }
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const names = (pattern.elements as any[]).filter(Boolean).map((e: any) => e.name ?? e.left?.name ?? "?").join(", ");
            recordSnapshot(ctx, forOfLine, `for-of: [${names}] = ${formatVal(item)}`);

          } else if (pattern?.type === "ObjectPattern") {
            // for (const { key, value } of entries)
            const src = (item && typeof item === "object" && !Array.isArray(item))
              ? item as Record<string, unknown> : {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const prop of pattern.properties as any[]) {
              if (prop.type === "RestElement") continue;
              const key = prop.key?.type === "Identifier" ? prop.key.name : String(evalExpr(prop.key, ctx));
              const bindName = prop.value?.type === "Identifier" ? prop.value.name : key;
              currentScope(ctx).set(bindName, src[key]);
              trackValue(ctx, bindName, src[key]);
            }
            recordSnapshot(ctx, forOfLine, `for-of: {…} = ${formatVal(item)}`);
          }

        } else if (node.left.type === "Identifier") {
          setVar(ctx, node.left.name, item);
        }

        const sig = evalBlock(node.body, ctx);
        if (sig?.type === "break") break;
        if (sig?.type === "return") return sig;
        // continue: just go to next iteration
      }
      return null;
    }

    case "IfStatement": {
      const test = evalExpr(node.test, ctx);
      ctx.comparisons++;
      const ifCond = describeExprShort(node.test);
      const branch = test ? "true → if-branch" : node.alternate ? "false → else-branch" : "false → skip";
      recordSnapshot(ctx, node.loc?.start?.line ?? 0, `if (${ifCond}): ${branch}`);
      if (test) {
        return evalBlock(node.consequent, ctx);
      } else if (node.alternate) {
        return evalBlock(node.alternate, ctx);
      }
      return null;
    }

    case "SwitchStatement": {
      const disc = evalExpr(node.discriminant, ctx);
      let matched = false;
      for (const c of node.cases) {
        if (ctx.stepCount >= ctx.maxSteps) break;
        if (!matched && c.test) {
          const tv = evalExpr(c.test, ctx);
          if (tv !== disc) continue;
          matched = true;
        }
        if (matched || !c.test) {
          matched = true;
          for (const stmt of c.consequent) {
            const sig = evalStatement(stmt, ctx);
            if (sig?.type === "break") return null;
            if (sig?.type === "return") return sig;
          }
        }
      }
      return null;
    }

    case "BlockStatement": {
      pushScope(ctx);
      for (const stmt of node.body) {
        const sig = evalStatement(stmt, ctx);
        if (sig) {
          popScope(ctx);
          return sig;
        }
      }
      popScope(ctx);
      return null;
    }

    case "ReturnStatement": {
      const val = node.argument ? evalExpr(node.argument, ctx) : undefined;
      const fnName = ctx.callStack.length > 0
        ? ctx.callStack[ctx.callStack.length - 1].split(":")[0]
        : "function";
      recordSnapshot(
        ctx,
        node.loc?.start?.line ?? 0,
        `${fnName} → returns ${formatVal(val)}`,
      );
      return { type: "return", value: val };
    }

    case "BreakStatement":
      return { type: "break", label: node.label?.name };

    case "ContinueStatement":
      return { type: "continue", label: node.label?.name };

    case "FunctionDeclaration": {
      const fn = makeFn(node, ctx);
      currentScope(ctx).set(node.id.name, fn);
      return null;
    }

    case "ClassDeclaration": {
      const className = node.id.name;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ctorNode: any = null;
      for (const item of node.body.body) {
        if (item.type === "MethodDefinition" && item.kind === "constructor") {
          ctorNode = item.value;
        }
      }
      const closureScopes = ctx.scopes.map((s) => new Map(s));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctor = (...args: any[]) => {
        const instance: Record<string, unknown> = {};
        ctx.nodeIdMap.set(instance, ctx.nextNodeId++);
        if (ctorNode) {
          const savedThis = ctx.thisContext;
          const savedScopes = ctx.scopes;
          ctx.thisContext = instance;
          const localScope = new Map<string, unknown>();
          ctx.scopes = [...closureScopes, localScope];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ctorNode.params.forEach((p: any, i: number) => {
            if (p.type === "Identifier") {
              localScope.set(p.name, i < args.length ? args[i] : undefined);
            } else if (p.type === "AssignmentPattern") {
              const name = p.left.name;
              const val =
                i < args.length && args[i] !== undefined
                  ? args[i]
                  : evalExpr(p.right, ctx);
              localScope.set(name, val);
            }
          });
          evalBlock(ctorNode.body, ctx);
          ctx.scopes = savedScopes;
          ctx.thisContext = savedThis;
        }
        return instance;
      };
      currentScope(ctx).set(className, ctor);
      return null;
    }

    case "EmptyStatement":
      return null;

    case "TryStatement": {
      let sig: Signal = null;
      try {
        sig = evalBlock(node.block, ctx);
      } catch (e: unknown) {
        if (node.handler) {
          pushScope(ctx);
          if (node.handler.param?.type === "Identifier") {
            const errName = node.handler.param.name;
            const errMsg = e instanceof Error ? e.message : String(e);
            currentScope(ctx).set(errName, errMsg);
            recordSnapshot(
              ctx,
              node.handler.loc?.start?.line ?? 0,
              `Caught exception in "${errName}": ${errMsg}`,
            );
          }
          sig = evalBlock(node.handler.body, ctx);
          popScope(ctx);
        }
      } finally {
        if (node.finalizer) {
          const finSig = evalBlock(node.finalizer, ctx);
          if (finSig) sig = finSig; // finally overrides return/break
        }
      }
      return sig;
    }

    case "ThrowStatement": {
      const val = evalExpr(node.argument, ctx);
      recordSnapshot(
        ctx,
        node.loc?.start?.line ?? 0,
        `Throw: ${formatVal(val)}`,
      );
      if (val && typeof val === "object" && "message" in (val as Record<string, unknown>)) {
        throw new Error(String((val as Record<string, unknown>).message));
      }
      throw new Error(String(val));
    }

    case "LabeledStatement": {
      const label: string = node.label.name;
      const sig = evalStatement(node.body, ctx);
      // Consume the signal if it targets this label
      if ((sig?.type === "break" || sig?.type === "continue") && sig.label === label) return null;
      return sig;
    }

    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalBlock(node: any, ctx: ExecContext): Signal {
  return evalStatement(node, ctx);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeFn(node: any, ctx: ExecContext) {
  const fnName = node.id?.name || "anonymous";
  const closureScopes = ctx.scopes.map((s) => new Map(s));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (...args: any[]) => {
    const savedScopes = ctx.scopes;
    // Patch closure with any functions declared AFTER this fn was created
    // (fixes mutual recursion and sibling-function visibility)
    for (
      let si = 0;
      si < closureScopes.length && si < savedScopes.length;
      si++
    ) {
      savedScopes[si].forEach((v, k) => {
        if (!closureScopes[si].has(k) && typeof v === "function") {
          closureScopes[si].set(k, v);
        }
      });
    }
    // Create a fresh local scope; add self-reference so functions can recurse
    const localScope = new Map<string, unknown>();
    if (fnName !== "anonymous") localScope.set(fnName, fn);
    ctx.scopes = [...closureScopes, localScope];
    const scope = currentScope(ctx);
    const line = node.body?.loc?.start?.line ?? 0;
    ctx.callStack.push(`${fnName}:${line}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node.params.forEach((p: any, i: number) => {
      const argVal = i < args.length ? args[i] : undefined;

      if (p.type === "Identifier") {
        scope.set(p.name, argVal);
        trackValue(ctx, p.name, argVal);
      } else if (
        p.type === "AssignmentPattern" &&
        p.left.type === "Identifier"
      ) {
        const val = (argVal !== undefined) ? argVal : evalExpr(p.right, ctx);
        scope.set(p.left.name, val);
        trackValue(ctx, p.left.name, val);
      } else if (p.type === "RestElement" && p.argument.type === "Identifier") {
        const rest = args.slice(i);
        scope.set(p.argument.name, rest);
        trackValue(ctx, p.argument.name, rest);
      } else if (p.type === "ArrayPattern") {
        // function f([a, b]) {}
        const arr = Array.isArray(argVal) ? argVal : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p.elements as any[]).forEach((el: any, j: number) => {
          if (!el) return;
          if (el.type === "Identifier") {
            scope.set(el.name, arr[j]);
            trackValue(ctx, el.name, arr[j]);
          } else if (el.type === "AssignmentPattern" && el.left?.type === "Identifier") {
            const v = (j < arr.length && arr[j] !== undefined) ? arr[j] : evalExpr(el.right, ctx);
            scope.set(el.left.name, v);
            trackValue(ctx, el.left.name, v);
          } else if (el.type === "RestElement" && el.argument?.type === "Identifier") {
            const rest = arr.slice(j);
            scope.set(el.argument.name, rest);
            trackValue(ctx, el.argument.name, rest);
          }
        });
      } else if (p.type === "ObjectPattern") {
        // function f({x, y}) {}
        const src = (argVal && typeof argVal === "object" && !Array.isArray(argVal))
          ? argVal as Record<string, unknown> : {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const prop of p.properties as any[]) {
          if (prop.type === "RestElement" && prop.argument?.type === "Identifier") {
            const usedKeys = new Set<string>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            p.properties.forEach((pp: any) => {
              if (pp.type !== "RestElement" && pp.key?.name) usedKeys.add(pp.key.name);
            });
            const rest: Record<string, unknown> = {};
            Object.keys(src).forEach(k => { if (!usedKeys.has(k)) rest[k] = src[k]; });
            scope.set(prop.argument.name, rest);
            trackValue(ctx, prop.argument.name, rest);
          } else {
            const key = prop.key?.type === "Identifier" ? prop.key.name : String(evalExpr(prop.key, ctx));
            let bindName = key;
            let bindVal: unknown = src[key];
            if (prop.value?.type === "Identifier") {
              bindName = prop.value.name;
            } else if (prop.value?.type === "AssignmentPattern" && prop.value.left?.type === "Identifier") {
              bindName = prop.value.left.name;
              if (bindVal === undefined) bindVal = evalExpr(prop.value.right, ctx);
            }
            scope.set(bindName, bindVal);
            trackValue(ctx, bindName, bindVal);
          }
        }
      }
    });
    const sig = evalBlock(node.body, ctx);
    ctx.callStack.pop();
    ctx.scopes = savedScopes;
    if (sig?.type === "return") return sig.value;
    return undefined;
  };
  return fn;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalExpr(node: any, ctx: ExecContext): any {
  if (ctx.stepCount >= ctx.maxSteps) return undefined;

  switch (node.type) {
    case "Literal":
      return node.value;

    case "Identifier": {
      if (node.name === "undefined") return undefined;
      if (node.name === "Infinity") return Infinity;
      if (node.name === "NaN") return NaN;
      return lookupVar(ctx, node.name);
    }

    case "ArrayExpression":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return node.elements.map((el: any) =>
        el ? evalExpr(el, ctx) : undefined,
      );

    case "ObjectExpression": {
      const obj: Record<string, unknown> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const prop of node.properties as any[]) {
        if (prop.type === "SpreadElement") {
          // { ...other }
          const spread = evalExpr(prop.argument, ctx);
          if (spread && typeof spread === "object" && !Array.isArray(spread)) {
            Object.assign(obj, spread);
          }
          continue;
        }
        // computed key vs identifier key
        const key = prop.computed
          ? String(evalExpr(prop.key, ctx))
          : (prop.key.type === "Identifier" ? prop.key.name : String(evalExpr(prop.key, ctx)));
        // shorthand: { x } is sugar for { x: x }
        const value = prop.shorthand
          ? lookupVar(ctx, prop.key.name)
          : evalExpr(prop.value, ctx);
        obj[key] = value;
      }
      return obj;
    }

    case "BinaryExpression":
    case "LogicalExpression": {
      const left = evalExpr(node.left, ctx);
      // short circuit for logical
      if (node.type === "LogicalExpression") {
        if (node.operator === "&&" && !left) return left;
        if (node.operator === "||" && left) return left;
        if (node.operator === "??") return left ?? evalExpr(node.right, ctx);
      }
      const right = evalExpr(node.right, ctx);

      // highlight array comparisons (arr[i] vs arr[j] OR arr[i] vs scalar)
      if (
        ["<", ">", "<=", ">=", "===", "!==", "==", "!="].includes(node.operator)
      ) {
        if (
          node.left.type === "MemberExpression" &&
          node.right.type === "MemberExpression"
        ) {
          const li = evalExpr(node.left.property, ctx);
          const ri = evalExpr(node.right.property, ctx);
          if (typeof li === "number" && typeof ri === "number") {
            ctx.highlights = [li, ri];
          }
        } else if (node.left.type === "MemberExpression") {
          const li = evalExpr(node.left.property, ctx);
          if (typeof li === "number") ctx.highlights = [li];
        } else if (node.right.type === "MemberExpression") {
          const ri = evalExpr(node.right.property, ctx);
          if (typeof ri === "number") ctx.highlights = [ri];
        }
      }

      return applyBinaryOp(node.operator, left, right);
    }

    case "UnaryExpression": {
      const arg = evalExpr(node.argument, ctx);
      switch (node.operator) {
        case "-":
          return -arg;
        case "!":
          return !arg;
        case "+":
          return +arg;
        case "typeof":
          return typeof arg;
        case "~":
          return ~arg;
        case "void":
          return undefined;
        default:
          return undefined;
      }
    }

    case "UpdateExpression": {
      const val = evalExpr(node.argument, ctx) as number;
      const newVal = node.operator === "++" ? val + 1 : val - 1;
      assignToNode(node.argument, newVal, ctx);
      return node.prefix ? newVal : val;
    }

    case "AssignmentExpression": {
      // Logical assignment: short-circuit before evaluating RHS
      if (node.operator === "??=" || node.operator === "||=" || node.operator === "&&=") {
        const cur = evalExpr(node.left, ctx);
        const shouldAssign =
          node.operator === "??=" ? cur == null :
          node.operator === "||=" ? !cur :
          /* &&= */                  Boolean(cur);
        if (!shouldAssign) return cur;
        const rhs = evalExpr(node.right, ctx);
        assignToNode(node.left, rhs, ctx);
        return rhs;
      }

      let val = evalExpr(node.right, ctx);
      if (node.operator !== "=") {
        const cur = evalExpr(node.left, ctx);
        val = applyBinaryOp(node.operator.slice(0, -1), cur, val);
      }

      // detect array element writes for swap highlighting
      if (
        node.left.type === "MemberExpression" &&
        node.left.object.type === "Identifier"
      ) {
        const idx = evalExpr(node.left.property, ctx);
        if (typeof idx === "number") ctx.swapped.push(idx);
      }

      assignToNode(node.left, val, ctx);

      // detect swap pattern
      if (isSwapAssignment(node)) {
        ctx.swapPhase++;
        if (ctx.swapPhase >= 3) {
          ctx.swaps++;
          ctx.swapPhase = 0;
        }
      } else if (
        node.left.type === "MemberExpression" &&
        node.left.object.type === "Identifier"
      ) {
        ctx.swapPhase++;
        if (ctx.swapPhase >= 3) {
          ctx.swaps++;
          ctx.swapPhase = 0;
        }
      } else {
        if (
          node.left.type === "Identifier" &&
          node.right.type !== "MemberExpression"
        ) {
          ctx.swapPhase = 0;
        }
      }

      return val;
    }

    case "MemberExpression": {
      // Optional chaining: obj?.prop → undefined if obj is null/undefined
      const obj = evalExpr(node.object, ctx);
      if (node.optional && obj == null) return undefined;
      const prop = node.computed
        ? evalExpr(node.property, ctx)
        : node.property.name;
      if (obj == null) return undefined;

      // array properties and methods
      if (Array.isArray(obj)) {
        if (prop === "length") return obj.length;
        if (typeof prop === "number") return obj[prop];
        // array methods
        switch (prop) {
          case "push":
            return (...a: unknown[]) => {
              obj.push(...a);
              return obj.length;
            };
          case "pop":
            return () => obj.pop();
          case "shift":
            return () => obj.shift();
          case "unshift":
            return (...a: unknown[]) => {
              obj.unshift(...a);
              return obj.length;
            };
          case "splice":
            return (...a: unknown[]) =>
              (obj.splice as (...args: unknown[]) => unknown[])(...a);
          case "slice":
            return (...a: unknown[]) =>
              (obj.slice as (...args: unknown[]) => unknown[])(...a);
          case "indexOf":
            return (v: unknown) => obj.indexOf(v as never);
          case "includes":
            return (v: unknown) => obj.includes(v as never);
          case "concat":
            return (...a: unknown[]) => obj.concat(...a);
          case "reverse":
            return () => {
              obj.reverse();
              return obj;
            };
          case "join":
            return (s?: string) => obj.join(s);
          case "map":
            return (fn: (...args: unknown[]) => unknown) =>
              obj.map((v, i) => fn(v, i));
          case "filter":
            return (fn: (...args: unknown[]) => unknown) =>
              obj.filter((v, i) => fn(v, i));
          case "forEach":
            return (fn: (...args: unknown[]) => unknown) => {
              obj.forEach((v, i) => fn(v, i));
            };
          case "reduce":
            return (fn: (...args: unknown[]) => unknown, init: unknown) =>
              init !== undefined
                ? obj.reduce((a, v, i) => fn(a, v, i), init)
                : obj.reduce((a, v, i) => fn(a, v, i));
          case "find":
            return (fn: (...args: unknown[]) => unknown) =>
              obj.find((v, i) => fn(v, i));
          case "findIndex":
            return (fn: (...args: unknown[]) => unknown) =>
              obj.findIndex((v, i) => fn(v, i));
          case "some":
            return (fn: (...args: unknown[]) => unknown) =>
              obj.some((v, i) => fn(v, i));
          case "every":
            return (fn: (...args: unknown[]) => unknown) =>
              obj.every((v, i) => fn(v, i));
          case "flat":
            return () => obj.flat();
          case "fill":
            return (v: unknown, s?: number, e?: number) =>
              obj.fill(v as never, s, e);
          case "sort":
            return (fn?: (a: unknown, b: unknown) => number) =>
              fn ? obj.sort((a, b) => fn(a, b)) : obj.sort();
          case "at":
            return (i: number) => obj.at(i);
          case "flatMap":
            return (fn: (v: unknown, i: number) => unknown) => obj.flatMap((v, i) => fn(v, i));
          case "copyWithin":
            return (t: number, s?: number, e?: number) => obj.copyWithin(t, s as number, e as number);
          case "keys":
            return () => [...(obj as number[]).keys()];
          case "values":
            return () => [...(obj as number[]).values()];
          case "entries":
            return () => [...(obj as number[]).entries()];
        }
      }

      // string methods
      if (typeof obj === "string") {
        if (prop === "length") return obj.length;
        switch (prop) {
          case "charAt":
            return (i: number) => obj.charAt(i);
          case "charCodeAt":
            return (i: number) => obj.charCodeAt(i);
          case "indexOf":
            return (s: string) => obj.indexOf(s);
          case "includes":
            return (s: string) => obj.includes(s);
          case "slice":
            return (s: number, e?: number) => obj.slice(s, e);
          case "substring":
            return (s: number, e?: number) => obj.substring(s, e);
          case "split":
            return (s: string) => obj.split(s);
          case "toLowerCase":
            return () => obj.toLowerCase();
          case "toUpperCase":
            return () => obj.toUpperCase();
          case "trim":
            return () => obj.trim();
          case "replace":
            return (a: string, b: string) => obj.replace(a, b);
          case "repeat":
            return (n: number) => obj.repeat(n);
          case "startsWith":
            return (s: string) => obj.startsWith(s);
          case "endsWith":
            return (s: string) => obj.endsWith(s);
          case "padStart":
            return (len: number, fill?: string) => obj.padStart(len, fill);
          case "padEnd":
            return (len: number, fill?: string) => obj.padEnd(len, fill);
          case "replaceAll":
            return (a: string, b: string) => obj.replaceAll(a, b);
          case "at":
            return (i: number) => obj.at(i);
          case "trimStart":
            return () => obj.trimStart();
          case "trimEnd":
            return () => obj.trimEnd();
          case "match":
            return (re: RegExp | string) => obj.match(re);
          case "search":
            return (re: RegExp | string) => obj.search(re);
        }
        if (typeof prop === "number") return obj[prop];
      }

      return (obj as Record<string, unknown>)[prop];
    }

    case "CallExpression": {
      // Optional call: fn?.() → undefined if callee is null/undefined
      if (node.optional) {
        const calleeCheck = node.callee.type === "MemberExpression"
          ? evalExpr(node.callee.object, ctx)
          : evalExpr(node.callee, ctx);
        if (calleeCheck == null) return undefined;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = node.arguments.map((a: any) => evalExpr(a, ctx));

      // Math.*
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "Math"
      ) {
        const method = node.callee.property.name;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (Math as any)[method] === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (Math as any)[method](...args);
        }
      }

      // console.log
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "console"
      ) {
        ctx.logs.push(args.map(formatVal).join(" "));
        return undefined;
      }

      // Object.keys / Object.values / Object.entries
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "Object"
      ) {
        const m = node.callee.property.name;
        if (m === "keys" && args[0]) return Object.keys(args[0]);
        if (m === "values" && args[0]) return Object.values(args[0]);
        if (m === "entries" && args[0]) return Object.entries(args[0]);
        if (m === "assign") return Object.assign({}, ...args);
      }

      // Number(), String(), Boolean(), parseInt, parseFloat, isNaN, isFinite
      if (node.callee.type === "Identifier") {
        switch (node.callee.name) {
          case "Number":
            return Number(args[0]);
          case "String":
            return String(args[0]);
          case "Boolean":
            return Boolean(args[0]);
          case "parseInt":
            return parseInt(args[0], args[1]);
          case "parseFloat":
            return parseFloat(args[0]);
          case "isNaN":
            return isNaN(args[0]);
          case "isFinite":
            return isFinite(args[0]);
          case "Array":
            return new Array(args[0]);
        }
      }

      // Array.isArray
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "Array" &&
        node.callee.property.name === "isArray"
      ) {
        return Array.isArray(args[0]);
      }

      // Array.from(iterable, mapFn?)
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "Array" &&
        node.callee.property.name === "from"
      ) {
        const src = args[0];
        const mapFn = args[1] as ((v: unknown, i: number) => unknown) | undefined;
        let arr: unknown[];
        if (Array.isArray(src)) arr = [...src];
        else if (typeof src === "string") arr = src.split("");
        else if (src && typeof src === "object") {
          const o = src as Record<string, unknown>;
          if (o._isSet) {
            arr = [];
            (o.forEach as (fn: (v: unknown) => void) => void)((v) => (arr as unknown[]).push(v));
          } else if (typeof o.length === "number") {
            arr = Array.from({ length: o.length as number }, (_, i) => (o as Record<number, unknown>)[i]);
          } else arr = [];
        } else arr = [];
        return mapFn ? arr.map((v, i) => mapFn(v, i)) : arr;
      }

      // String.fromCharCode(...codes)
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "String" &&
        node.callee.property.name === "fromCharCode"
      ) {
        return String.fromCharCode(...(args as number[]));
      }

      // JSON.stringify / JSON.parse
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "JSON"
      ) {
        if (node.callee.property.name === "stringify")
          return JSON.stringify(args[0]);
        if (node.callee.property.name === "parse") return JSON.parse(args[0]);
      }

      const callee = evalExpr(node.callee, ctx);
      if (typeof callee === "function") return callee(...args);
      return undefined;
    }

    case "ConditionalExpression": {
      return evalExpr(node.test, ctx)
        ? evalExpr(node.consequent, ctx)
        : evalExpr(node.alternate, ctx);
    }

    case "SequenceExpression": {
      let result;
      for (const expr of node.expressions) result = evalExpr(expr, ctx);
      return result;
    }

    case "ArrowFunctionExpression":
    case "FunctionExpression": {
      return makeFn({ ...node, id: node.id || { name: "anonymous" } }, ctx);
    }

    case "TemplateLiteral": {
      let result = "";
      for (let i = 0; i < node.quasis.length; i++) {
        result += node.quasis[i].value.cooked;
        if (i < node.expressions.length) {
          result += String(evalExpr(node.expressions[i], ctx));
        }
      }
      return result;
    }

    case "SpreadElement":
      return evalExpr(node.argument, ctx);

    case "NewExpression": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nArgs = node.arguments.map((a: any) => evalExpr(a, ctx));

      if (node.callee.type === "Identifier") {
        if (node.callee.name === "Array") {
          return new Array(nArgs[0]);
        }
        if (node.callee.name === "Map") {
          // Use a real Map internally so object keys work (e.g. copy-with-random)
          const innerMap = new Map<unknown, unknown>();
          const mapObj: Record<string, unknown> = {
            _isMap: true,
            _inner: innerMap,
            set: (k: unknown, v: unknown) => {
              innerMap.set(k, v);
              return mapObj;
            },
            get: (k: unknown) => innerMap.get(k),
            has: (k: unknown) => innerMap.has(k),
            delete: (k: unknown) => innerMap.delete(k),
            get size() {
              return innerMap.size;
            },
            keys: () => [...innerMap.keys()],
            values: () => [...innerMap.values()],
            entries: () => [...innerMap.entries()],
            forEach: (fn: (v: unknown, k: unknown) => void) =>
              innerMap.forEach(fn),
            clear: () => { innerMap.clear(); },
          };
          return mapObj;
        }
        if (node.callee.name === "Set") {
          const innerSet = new Set<unknown>();
          const setObj: Record<string, unknown> = {
            _isSet: true,
            _inner: innerSet,
            add: (v: unknown) => {
              innerSet.add(v);
              return setObj;
            },
            has: (v: unknown) => innerSet.has(v),
            delete: (v: unknown) => innerSet.delete(v),
            get size() {
              return innerSet.size;
            },
            forEach: (fn: (v: unknown) => void) => innerSet.forEach(fn),
            clear: () => { innerSet.clear(); },
            values: () => [...innerSet.values()],
            keys: () => [...innerSet.values()], // Set keys === values
            entries: () => [...innerSet.entries()],
          };
          return setObj;
        }
      }

      // Custom constructor (from class declarations)
      const callee = evalExpr(node.callee, ctx);
      if (typeof callee === "function") return callee(...nArgs);
      return {};
    }

    case "ThisExpression":
      return ctx.thisContext;

    default:
      return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSwapAssignment(node: any): boolean {
  if (
    node.left.type === "Identifier" &&
    node.right.type === "MemberExpression"
  ) {
    return true;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assignToNode(node: any, value: unknown, ctx: ExecContext) {
  if (node.type === "Identifier") {
    setVar(ctx, node.name, value);
  } else if (node.type === "MemberExpression") {
    const obj = evalExpr(node.object, ctx);
    const prop = node.computed
      ? evalExpr(node.property, ctx)
      : node.property.name;
    if (obj != null) {
      (obj as Record<string, unknown>)[prop] = value;
      // sync tracking
      if (node.object.type === "Identifier") {
        if (Array.isArray(obj)) {
          ctx.trackedArrays.set(node.object.name, obj);
        } else if (typeof obj === "object") {
          ctx.trackedObjects.set(
            node.object.name,
            obj as Record<string, unknown>,
          );
        }
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBinaryOp(op: string, left: any, right: any): any {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    case "%":
      return left % right;
    case "**":
      return left ** right;
    case "<":
      return left < right;
    case ">":
      return left > right;
    case "<=":
      return left <= right;
    case ">=":
      return left >= right;
    case "===":
      return left === right;
    case "!==":
      return left !== right;
    case "==":
      return left == right;
    case "!=":
      return left != right;
    case "&&":
      return left && right;
    case "||":
      return left || right;
    case "??":
      return left ?? right;
    case "&":
      return left & right;
    case "|":
      return left | right;
    case "^":
      return left ^ right;
    case "<<":
      return left << right;
    case ">>":
      return left >> right;
    case ">>>":
      return left >>> right;
    case "in":
      return left in right;
    case "instanceof":
      return false;
    default:
      return undefined;
  }
}

function formatVal(v: unknown): string {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "{...}";
    }
  }
  return String(v);
}

// Produces a compact single-token summary of any expression node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeExprShort(node: any): string {
  if (!node) return "?";
  switch (node.type) {
    case "Literal":
      return String(node.value);
    case "Identifier":
      return node.name;
    case "MemberExpression": {
      const obj = node.object.type === "Identifier" ? node.object.name : "…";
      if (node.computed && node.property.type === "Identifier") return `${obj}[${node.property.name}]`;
      if (node.computed && node.property.type === "Literal") return `${obj}[${node.property.value}]`;
      if (node.computed) return `${obj}[${describeExprShort(node.property)}]`;
      return `${obj}.${node.property.name}`;
    }
    case "BinaryExpression":
      return `(${describeExprShort(node.left)} ${node.operator} ${describeExprShort(node.right)})`;
    case "CallExpression":
      if (node.callee.type === "Identifier") return `${node.callee.name}(…)`;
      if (node.callee.type === "MemberExpression") {
        const o = node.callee.object.type === "Identifier" ? node.callee.object.name : "…";
        return `${o}.${node.callee.property?.name ?? "?"}(…)`;
      }
      return "call(…)";
    case "UnaryExpression":
      return `${node.operator}${describeExprShort(node.argument)}`;
    case "UpdateExpression":
      return node.prefix ? `${node.operator}${describeExprShort(node.argument)}` : `${describeExprShort(node.argument)}${node.operator}`;
    case "ConditionalExpression":
      return `${describeExprShort(node.test)} ? … : …`;
    case "ArrayExpression":
      if (node.elements.length <= 3) return `[${node.elements.map(describeExprShort).join(", ")}]`;
      return `[${node.elements.slice(0, 2).map(describeExprShort).join(", ")}, …]`;
    default:
      return "…";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeExpression(node: any): string {
  switch (node.type) {
    case "AssignmentExpression": {
      const opLabel = node.operator === "=" ? "←" : node.operator;
      if (node.left.type === "Identifier") {
        return `${node.left.name} ${opLabel} ${describeExprShort(node.right)}`;
      }
      if (node.left.type === "MemberExpression") {
        const obj = node.left.object.type === "Identifier" ? node.left.object.name : "obj";
        const prop = node.left.computed
          ? `[${describeExprShort(node.left.property)}]`
          : `.${node.left.property.name}`;
        return `${obj}${prop} ${opLabel} ${describeExprShort(node.right)}`;
      }
      return "Assignment";
    }

    case "CallExpression": {
      if (node.callee.type === "Identifier") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const argStr = node.arguments.slice(0, 2).map((a: any) => describeExprShort(a)).join(", ");
        const ellipsis = node.arguments.length > 2 ? ", …" : "";
        return `Call ${node.callee.name}(${argStr}${ellipsis})`;
      }
      if (node.callee.type === "MemberExpression") {
        const obj = node.callee.object.type === "Identifier" ? node.callee.object.name : "obj";
        const method = node.callee.property?.name ?? "?";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const argStr = node.arguments.slice(0, 2).map((a: any) => describeExprShort(a)).join(", ");
        return `${obj}.${method}(${argStr})`;
      }
      return "Function call";
    }

    case "UpdateExpression": {
      const name = node.argument?.name ?? "?";
      const dir = node.operator === "++" ? "incremented" : "decremented";
      return `${name} ${dir} (${node.operator})`;
    }

    default:
      return "Expression evaluated";
  }
}

/**
 * Universal entry: parse and execute JS, returning step snapshots
 */
export function executeCode(code: string): Snapshot[] {
  const ast = acorn.parse(code, {
    ecmaVersion: 2020,
    sourceType: "script",
    locations: true,
  });

  const ctx = createContext();
  evalNode(ast, ctx);

  // mark final sorted state on arrays
  if (ctx.snapshots.length > 0) {
    const last = ctx.snapshots[ctx.snapshots.length - 1];
    last.arrays.forEach((a) => {
      a.sorted = a.values.map((_, i) => i);
    });
  }

  return ctx.snapshots;
}
