/**
 * Snapshot parser for BigOsee.
 *
 * Parses the `__SNAP__ {...json...}` lines from Judge0 stdout
 * (produced by the AST instrumenter) and converts them into
 * the standard Snapshot[] format used by the visualization panels.
 *
 * Wire format (one per line):
 *   __SNAP__ {"step":0,"line":5,"desc":"main(): line 5","comp":0,"swap":0,
 *             "cs":["main"],"v":{"i":0,"n":7},"a":{"arr":{"values":[5,2,8],
 *             "highlights":[0,1],"swapped":[],"sorted":[]}},"o":{"map":[...]}}
 *
 * Lines NOT starting with __SNAP__ are treated as user stdout → logs[].
 */

import type {
  Snapshot,
  VariableState,
  ArrayState,
  ObjectState,
} from "./types";

const SNAP_PREFIX = "__SNAP__ ";

/**
 * Parse structured snapshot output from instrumented code execution.
 *
 * @param stdout - Full stdout from Judge0 execution
 * @returns Snapshot[] ready for the timeline store
 */
export function parseSnapshots(stdout: string): Snapshot[] {
  const snapshots: Snapshot[] = [];
  const lines = stdout.split("\n");
  const userLogs: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith(SNAP_PREFIX)) {
      try {
        const jsonStr = trimmed.slice(SNAP_PREFIX.length);
        const raw = JSON.parse(jsonStr);

        // ── Convert vars → VariableState[] ──
        const variables: VariableState[] = [];
        if (raw.v && typeof raw.v === "object") {
          for (const [name, value] of Object.entries(raw.v)) {
            variables.push({
              name,
              value,
              type: inferType(value),
              changed: false, // computed below
            });
          }
        }

        // ── Convert arrays → ArrayState[] ──
        const arrays: ArrayState[] = [];
        if (raw.a && typeof raw.a === "object") {
          for (const [name, data] of Object.entries(raw.a)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = data as any;
            if (d && typeof d === "object" && "values" in d) {
              arrays.push({
                name,
                values: Array.isArray(d.values) ? d.values : [],
                highlights: Array.isArray(d.highlights) ? d.highlights : [],
                swapped: Array.isArray(d.swapped) ? d.swapped : [],
                sorted: Array.isArray(d.sorted) ? d.sorted : [],
                cols: d.cols,
              });
            } else if (Array.isArray(d)) {
              // Flat array format (fallback)
              arrays.push({
                name,
                values: d,
                highlights: [],
                swapped: [],
                sorted: [],
              });
            }
          }
        }

        // ── Convert objects → ObjectState[] ──
        const objects: ObjectState[] = [];
        if (raw.o && typeof raw.o === "object") {
          for (const [name, entries] of Object.entries(raw.o)) {
            if (Array.isArray(entries)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              objects.push({
                name,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                entries: entries.map((e: any) => {
                  // Format: { "key": value } or { key: value, changed: bool }
                  if (typeof e === "object" && e !== null) {
                    // Check if it's {key:value} format from __ma() / __sa()
                    const keys = Object.keys(e);
                    if (keys.length === 1) {
                      // Single key-value pair from map serialization
                      return {
                        key: keys[0],
                        value: e[keys[0]],
                        changed: false,
                      };
                    }
                    if ("key" in e) {
                      return {
                        key: String(e.key),
                        value: e.value,
                        changed: e.changed ?? false,
                      };
                    }
                  }
                  return { key: String(e), value: e, changed: false };
                }),
              });
            }
          }
        }

        // ── Detect changed variables ──
        if (snapshots.length > 0) {
          const prev = snapshots[snapshots.length - 1];
          const prevMap = new Map(
            prev.variables.map((v) => [v.name, v.value]),
          );
          for (const v of variables) {
            const prevVal = prevMap.get(v.name);
            if (prevVal === undefined) {
              v.changed = true; // new variable
            } else if (prevVal !== v.value) {
              v.changed = true; // value changed
            }
          }

          // Detect changed object entries
          const prevObjMap = new Map(
            prev.objects.map((o) => [o.name, o]),
          );
          for (const obj of objects) {
            const prevObj = prevObjMap.get(obj.name);
            if (prevObj) {
              const prevEntryMap = new Map(
                prevObj.entries.map((e) => [e.key, JSON.stringify(e.value)]),
              );
              for (const entry of obj.entries) {
                const prevEntryVal = prevEntryMap.get(entry.key);
                if (
                  prevEntryVal === undefined ||
                  prevEntryVal !== JSON.stringify(entry.value)
                ) {
                  entry.changed = true;
                }
              }
            } else {
              // New object — all entries changed
              for (const entry of obj.entries) {
                entry.changed = true;
              }
            }
          }
        } else {
          // First snapshot — everything is "changed" (new)
          for (const v of variables) v.changed = true;
          for (const obj of objects) {
            for (const entry of obj.entries) entry.changed = true;
          }
        }

        snapshots.push({
          step: raw.step ?? snapshots.length,
          line: raw.line ?? 0,
          variables,
          arrays,
          objects,
          callStack: Array.isArray(raw.cs) ? raw.cs : ["main"],
          logs: [...userLogs],
          comparisons: raw.comp ?? 0,
          swaps: raw.swap ?? 0,
          description: raw.desc ?? `Step ${raw.step ?? snapshots.length}`,
          edges: undefined,
          linkedList: undefined,
        });
      } catch {
        // Malformed __SNAP__ line — skip it
      }
    } else {
      // Regular stdout line → user log
      // Skip instrumentation artifacts
      if (
        !trimmed.startsWith("=== EXECUTION") &&
        !trimmed.startsWith("[LOOP]") &&
        !trimmed.startsWith("[VAR]")
      ) {
        userLogs.push(trimmed);
      }
    }
  }

  return snapshots;
}

/**
 * Infer a display type name from a runtime value.
 */
function inferType(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int" : "double";
  }
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return "array";
  return "object";
}
