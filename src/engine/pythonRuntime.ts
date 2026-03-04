/**
 * Pyodide-based Python runtime for BigOsee.
 *
 * Runs real CPython (compiled to WebAssembly) inside a Web Worker.
 * Uses Python's sys.settrace to capture variable state at each line,
 * producing Snapshot[] in the same format as the JS interpreter.
 */

import type { Snapshot } from "./types";

// ─── Python tracer script ──────────────────────────────────────────
// Injected before user code. Uses sys.settrace to capture locals
// at each line executed. The filename '<user_code>' lets us filter
// out instrumentation frames.

const TRACER_SCRIPT = `
import sys, copy, types
import builtins

_snapshots = []
_logs = []
_step = 0
_comparisons = 0
_swaps = 0
_prev_locals = {}

_PRIMITIVES = (int, float, str, bool, type(None))
_MAX_STEPS = 5000

# Types to skip — these are not user data
_SKIP_TYPES = (types.ModuleType, types.FunctionType, types.BuiltinFunctionType,
               types.BuiltinMethodType, type, types.CodeType, types.FrameType)

def _is_user_var(name, val):
    """Return True if this variable should be captured in a snapshot."""
    if name.startswith('_'):
        return False
    if isinstance(val, _SKIP_TYPES):
        return False
    # Skip common exec() injected names
    if name in ('__builtins__', '__name__', '__doc__', '__package__',
                '__loader__', '__spec__', '__file__', '__cached__'):
        return False
    return True

def _safe_repr(v):
    """Convert Python values to JSON-safe representations."""
    if isinstance(v, _PRIMITIVES):
        return v
    if isinstance(v, list):
        return [_safe_repr(x) for x in v[:100]]
    if isinstance(v, dict):
        return {str(k): _safe_repr(v2) for k, v2 in list(v.items())[:30]}
    if isinstance(v, (set, frozenset)):
        try:
            return sorted([_safe_repr(x) for x in list(v)[:30]])
        except TypeError:
            return [str(x) for x in list(v)[:30]]
    if isinstance(v, tuple):
        return [_safe_repr(x) for x in v[:50]]
    return str(v)

def _safe_deepcopy(v):
    """Deep copy a value, falling back to the value itself if not copyable."""
    try:
        return copy.deepcopy(v)
    except Exception:
        # For non-copyable objects, store a string snapshot for comparison
        try:
            return str(v)
        except Exception:
            return None

def _detect_changes(prev, current):
    """Return set of variable names that changed since last snapshot."""
    changed = set()
    for name, val in current.items():
        if name not in prev:
            changed.add(name)
        else:
            try:
                if prev[name] != val:
                    changed.add(name)
            except Exception:
                changed.add(name)
    return changed

def _tracer(frame, event, arg):
    global _step, _comparisons, _swaps, _prev_locals
    if event != 'line':
        return _tracer
    if _step >= _MAX_STEPS:
        return None  # stop tracing

    # Skip the instrumentation frames themselves
    if frame.f_code.co_filename != '<user_code>':
        return _tracer

    local_vars = {}
    arrays = []
    objects = []

    # Snapshot only user variables from frame locals
    frame_locals = {k: v for k, v in frame.f_locals.items() if _is_user_var(k, v)}

    # Detect which variables changed
    changed_names = _detect_changes(_prev_locals, frame_locals)

    # Store safe copies for next comparison
    _prev_locals = {}
    for k, v in frame_locals.items():
        _prev_locals[k] = _safe_deepcopy(v)

    for name, val in frame_locals.items():
        is_changed = name in changed_names

        if isinstance(val, list) and len(val) > 0 and all(isinstance(x, (int, float)) for x in val):
            # Numeric array -> visualization bar chart
            arrays.append({
                "name": name,
                "values": [x for x in val[:100]],
                "highlights": [],
                "swapped": [],
                "sorted": [],
            })
        elif isinstance(val, dict):
            # Dict -> object panel
            entries = []
            for k2, v2 in list(val.items())[:30]:
                entries.append({
                    "key": str(k2),
                    "value": _safe_repr(v2),
                    "changed": is_changed,
                })
            objects.append({"name": name, "entries": entries})
        elif isinstance(val, (set, frozenset)):
            entries = []
            try:
                items = sorted(list(val))[:30]
            except TypeError:
                items = list(val)[:30]
            for item in items:
                entries.append({
                    "key": str(item),
                    "value": True,
                    "changed": is_changed,
                })
            objects.append({"name": name, "entries": entries})
        else:
            local_vars[name] = _safe_repr(val)

    # Build the call stack
    call_stack = []
    f = frame
    while f is not None:
        if f.f_code.co_filename == '<user_code>':
            call_stack.append(f.f_code.co_name)
        f = f.f_back
    call_stack.reverse()

    # Compute description
    line_no = frame.f_lineno
    func_name = frame.f_code.co_name
    desc = f"Line {line_no}"
    if func_name != '<module>':
        desc = f"{func_name}(): line {line_no}"

    _snapshots.append({
        "step": _step,
        "line": line_no,
        "variables": [
            {
                "name": k,
                "value": v,
                "type": type(frame_locals.get(k, None)).__name__,
                "changed": k in changed_names,
            }
            for k, v in local_vars.items()
        ],
        "arrays": arrays,
        "objects": objects,
        "callStack": call_stack if call_stack else ["<module>"],
        "logs": list(_logs),
        "comparisons": _comparisons,
        "swaps": _swaps,
        "description": desc,
        "edges": None,
        "linkedList": None,
    })
    _step += 1
    return _tracer

# Override print to capture logs
_orig_print = builtins.print
def _captured_print(*args, **kwargs):
    _logs.append(" ".join(str(a) for a in args))
    _orig_print(*args, **kwargs)
builtins.print = _captured_print

sys.settrace(_tracer)
`;

const TRACER_CLEANUP = `
sys.settrace(None)
builtins.print = _orig_print
`;

// ─── Worker communication ──────────────────────────────────────────
// Pyodide runs inside a Web Worker to avoid blocking the UI thread.
// The worker code is inlined as a blob URL (no build config needed).

const WORKER_CODE = `
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js");

let pyodide = null;
let initError = null;

async function init() {
  try {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/"
    });
  } catch (err) {
    initError = err.message || String(err);
  }
}

const initPromise = init();

self.onmessage = async (e) => {
  const { code, tracerScript, tracerCleanup, requestId } = e.data;

  try {
    await initPromise;

    if (initError) {
      self.postMessage({ requestId, snapshots: [], error: "Failed to load Python runtime: " + initError });
      return;
    }

    // Reset global tracer state between runs
    pyodide.runPython(\`
import sys, builtins
sys.settrace(None)
try:
    builtins.print = _orig_print
except NameError:
    pass
_snapshots = []
_logs = []
_step = 0
_comparisons = 0
_swaps = 0
_prev_locals = {}
\`);

    // Build the full script: tracer + user code + cleanup
    const fullScript = tracerScript + "\\n" +
      "exec(compile(" + JSON.stringify(code) + ", '<user_code>', 'exec'))\\n" +
      tracerCleanup;

    await pyodide.runPythonAsync(fullScript);

    // Extract snapshots back to JS
    const pySnapshots = pyodide.globals.get("_snapshots");
    const rawSnapshots = pySnapshots.toJs({ dict_converter: Object.fromEntries });
    pySnapshots.destroy();  // prevent memory leak

    // Convert proxy arrays to plain arrays
    const snapshots = Array.from(rawSnapshots).map(snap => ({
      step: snap.step,
      line: snap.line,
      variables: Array.from(snap.variables || []).map(v => ({
        name: v.name,
        value: v.value,
        type: v.type,
        changed: v.changed,
      })),
      arrays: Array.from(snap.arrays || []).map(a => ({
        name: a.name,
        values: Array.from(a.values || []),
        highlights: Array.from(a.highlights || []),
        swapped: Array.from(a.swapped || []),
        sorted: Array.from(a.sorted || []),
      })),
      objects: Array.from(snap.objects || []).map(o => ({
        name: o.name,
        entries: Array.from(o.entries || []).map(e => ({
          key: e.key,
          value: e.value,
          changed: e.changed,
        })),
      })),
      callStack: Array.from(snap.callStack || ["<module>"]),
      logs: Array.from(snap.logs || []),
      comparisons: snap.comparisons || 0,
      swaps: snap.swaps || 0,
      description: snap.description || "",
      edges: snap.edges ? Array.from(snap.edges) : undefined,
      linkedList: snap.linkedList || undefined,
    }));

    self.postMessage({ requestId, snapshots, error: null });
  } catch (err) {
    // Extract the most useful error message from Pyodide
    let msg = err.message || String(err);
    // Pyodide wraps Python errors — extract the last line for clarity
    const lines = msg.split("\\n").filter(l => l.trim());
    if (lines.length > 1) {
      msg = lines[lines.length - 1];
    }
    self.postMessage({ requestId, snapshots: [], error: msg });
  }
};

// Notify main thread when Pyodide finishes loading
initPromise.then(() => {
  self.postMessage({ type: "ready" });
}).catch(() => {
  self.postMessage({ type: "ready", error: initError });
});
`;

// ─── Worker lifecycle ──────────────────────────────────────────────

let worker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (worker) return worker;

  const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(blob));

  workerReadyPromise = new Promise<void>((resolve) => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "ready") {
        workerReady = true;
        worker?.removeEventListener("message", onMessage);
        resolve();
      }
    };
    worker!.addEventListener("message", onMessage);
  });

  return worker;
}

/**
 * Returns true if Pyodide has finished loading in the worker.
 */
export function isPyodideReady(): boolean {
  return workerReady;
}

/**
 * Pre-warm Pyodide by starting the worker early.
 * Call this on page load — fire and forget.
 */
export function prewarmPyodide(): void {
  if (typeof window === "undefined") return; // SSR guard
  getWorker(); // starts loading Pyodide in the background
}

/**
 * Execute Python code via Pyodide in a Web Worker.
 * Returns Snapshot[] in the same format as the JS interpreter.
 *
 * @param onStatusChange - Optional callback for progress messages
 */
export async function executePython(
  userCode: string,
  onStatusChange?: (status: string) => void,
): Promise<Snapshot[]> {
  const w = getWorker();

  // If Pyodide is still loading, notify the caller
  if (!workerReady) {
    onStatusChange?.("Loading Python runtime (first time only)…");
    await workerReadyPromise;
  }

  onStatusChange?.("Running Python code…");

  return new Promise<Snapshot[]>((resolve, reject) => {
    const requestId = Date.now() + Math.random();

    const handler = (e: MessageEvent) => {
      if (e.data?.requestId !== requestId) return;
      w.removeEventListener("message", handler);

      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.snapshots as Snapshot[]);
      }
    };

    w.addEventListener("message", handler);

    w.postMessage({
      code: userCode,
      tracerScript: TRACER_SCRIPT,
      tracerCleanup: TRACER_CLEANUP,
      requestId,
    });
  });
}
