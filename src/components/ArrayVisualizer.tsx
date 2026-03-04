"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ArrayState,
  ObjectState,
  LinkedListState,
  VariableState,
} from "@/engine/types";

/* ─── Pointer visualization helpers ─── */

// Common loop/search variable names that hold array indices
const POINTER_NAMES = new Set([
  "i",
  "j",
  "k",
  "l",
  "r",
  "p",
  "q",
  "left",
  "right",
  "low",
  "high",
  "mid",
  "start",
  "end",
  "slow",
  "fast",
  "tortoise",
  "hare",
  "idx",
  "pos",
  "minIdx",
  "maxIdx",
  "pivot",
  "top",
]);

// Cycling colour palette for up to 6 distinct pointers
const PTR_COLORS = [
  {
    badge: "border-amber-400 bg-amber-400/25 text-amber-300",
    dot: "bg-amber-400",
  },
  { badge: "border-sky-400 bg-sky-400/25 text-sky-300", dot: "bg-sky-400" },
  {
    badge: "border-emerald-400 bg-emerald-400/25 text-emerald-300",
    dot: "bg-emerald-400",
  },
  { badge: "border-rose-400 bg-rose-400/25 text-rose-300", dot: "bg-rose-400" },
  {
    badge: "border-violet-400 bg-violet-400/25 text-violet-300",
    dot: "bg-violet-400",
  },
  {
    badge: "border-fuchsia-400 bg-fuchsia-400/25 text-fuchsia-300",
    dot: "bg-fuchsia-400",
  },
];

function buildPointerMap(
  vars: VariableState[],
  arrLen: number,
): Map<number, { name: string; ci: number }[]> {
  const map = new Map<number, { name: string; ci: number }[]>();
  let ci = 0;
  for (const v of vars) {
    if (
      typeof v.value !== "number" ||
      !Number.isInteger(v.value) ||
      v.value < 0 ||
      v.value >= arrLen
    )
      continue;
    if (!POINTER_NAMES.has(v.name)) continue;
    if (!map.has(v.value as number)) map.set(v.value as number, []);
    map
      .get(v.value as number)!
      .push({ name: v.name, ci: ci++ % PTR_COLORS.length });
  }
  return map;
}

/* ─── Array Card (default box view with indices + pointer arrows) ─── */
export function ArrayCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {arrays.map((arr, ai) => {
        const ptrMap = buildPointerMap(variables, arr.values.length);
        return (
          <div key={arr.name || ai} className="px-4 pt-2 pb-3">
            {arrays.length > 1 && (
              <span className="text-[10px] font-mono text-text-muted mb-1 block">
                {arr.name}
              </span>
            )}
            {/* legend row */}
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-2 h-2 rounded-sm bg-accent inline-block" />{" "}
                comparing
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-2 h-2 rounded-sm bg-red inline-block" />{" "}
                swapped
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-2 h-2 rounded-sm bg-green inline-block" />{" "}
                done
              </span>
            </div>
            <div className="flex items-end gap-1.5 flex-wrap">
              {arr.values.map((val, idx) => {
                const isH = arr.highlights.includes(idx);
                const isS = arr.swapped.includes(idx);
                const isDone = arr.sorted.includes(idx);
                const ptrs = ptrMap.get(idx) ?? [];

                let border = "border-border";
                let text = "text-text-primary";
                let cellBg = "bg-surface";
                if (isDone) {
                  border = "border-green";
                  text = "text-green";
                  cellBg = "bg-green/5";
                }
                if (isH) {
                  border = "border-accent";
                  text = "text-accent";
                  cellBg = "bg-accent/10";
                }
                if (isS) {
                  border = "border-red";
                  text = "text-red";
                  cellBg = "bg-red/10";
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-0">
                    {/* pointer badge area — always 36px tall so cells align */}
                    <div className="h-9 flex flex-col items-center justify-end gap-0.5 pb-0.5">
                      <AnimatePresence>
                        {ptrs.map((ptr) => (
                          <motion.span
                            key={ptr.name}
                            initial={{ opacity: 0, y: -8, scale: 0.7 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 28,
                            }}
                            className={`text-[8px] font-bold leading-none px-1 py-px rounded border ${PTR_COLORS[ptr.ci].badge}`}
                          >
                            {ptr.name}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                    {/* connector line */}
                    <div className="h-2">
                      {ptrs.length > 0 && (
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          className={`w-0.5 h-full ${PTR_COLORS[ptrs[0].ci].dot} rounded-full`}
                        />
                      )}
                    </div>
                    {/* cell */}
                    <motion.div
                      className={`w-10 h-10 flex flex-col items-center justify-center rounded-md border-2 font-mono text-sm font-medium ${cellBg} ${border} ${text}`}
                      initial={false}
                      animate={{
                        scale: isS ? 1.2 : isH ? 1.1 : 1,
                        rotate: isS ? [0, -4, 4, 0] : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                        rotate: { type: "keyframes", duration: 0.3 },
                      }}
                    >
                      {val}
                      <span className="text-[7px] text-text-muted">{idx}</span>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SortingCard — reference-site style bar-chart
 *
 * Visual design:
 *   • Bars proportional to value (bigger number → taller bar)
 *   • Gradient fills: blue (default) / yellow (comparing) / red (swapping) / green (sorted)
 *   • Value label centered inside bar (or above if bar is too short)
 *   • Index label below each bar in a fixed footer row
 *   • Pointer badges (i, j, left, right …) shown above bars with colored pins
 *   • Horizontal baseline rule at the bottom of the chart
 *   • Legend row at top
 *
 * Animation:
 *   • FLIP-style `left` spring whenever exactly two values exchange position
 *   • Bars lift slightly (y: -12) and glow red while being swapped
 *   • Uses prevValsRef diffing — works correctly for forward AND backward steps
 * ─────────────────────────────────────────────────────────────────────────── */

// Gradient stop pairs per state
const BAR_GRADIENTS = {
  default: ["#60a5fa", "#2563eb"], // blue
  sorted: ["#4ade80", "#16a34a"], // green
  compare: ["#fde68a", "#f59e0b"], // amber/yellow
  swap: ["#fca5a5", "#dc2626"], // red
} as const;

function barGradient(id: string, top: string, bot: string) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={top} />
        <stop offset="100%" stopColor={bot} />
      </linearGradient>
    </defs>
  );
}
// silence unused — we use inline style gradients instead
void barGradient;

export function SortingCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  const arr = arrays[0];
  const n = arr.values.length;

  /* ── Bar identity: value-matching positional derivation ──────────────────
   *
   * barValues[id] = the value this bar represents — set ONCE at reset time
   *   (first render or when n changes) and NEVER changed.
   *   Heights and labels are derived from this forever.
   *
   * positionOf[id] = where bar `id` currently lives, rebuilt FRESH every
   *   render by matching arr.values against barValues. This means:
   *   - No cumulative mutation problems.
   *   - Works perfectly for forward AND backward stepping.
   *   - Works across all 3 sub-steps of a tmp-swap (no diff needed).
   *
   * Duplicate-safe algorithm:
   *   1. First assign bars whose value sits at the same index (unchanged).
   *   2. Then place remaining bars in the first unclaimed slot with their value.
   *   3. Any bar whose value is in a temp variable (missing from arr.values)
   *      gets the first unclaimed position so Framer can still render it.
   * ───────────────────────────────────────────────────────────────────────── */
  const [barIdentity, setBarIdentity] = useState<{
    values: number[];
    sig: string;
  }>({ values: [], sig: "" });

  // Reset whenever n changes OR the sorted signature changes (new question with same n)
  const curSig = [...arr.values].sort((a, b) => a - b).join(",");
  if (barIdentity.values.length !== n || curSig !== barIdentity.sig) {
    setBarIdentity({ values: [...arr.values], sig: curSig });
  }

  // compute max from the ACTUAL current array values
  const maxBarVal = useMemo(() => Math.max(...arr.values, 1), [arr.values]);

  // Rebuild positionOf fresh from current arr.values
  const positionOf = new Array<number>(n).fill(-1);
  const claimedPos = new Set<number>();

  // Pass 1: bars that haven't moved (value at same index)
  for (let id = 0; id < n; id++) {
    if (arr.values[id] === barIdentity.values[id]) {
      positionOf[id] = id;
      claimedPos.add(id);
    }
  }
  // Pass 2: displaced bars — find their value in any unclaimed position
  for (let id = 0; id < n; id++) {
    if (positionOf[id] !== -1) continue;
    for (let pos = 0; pos < n; pos++) {
      if (!claimedPos.has(pos) && arr.values[pos] === barIdentity.values[id]) {
        positionOf[id] = pos;
        claimedPos.add(pos);
        break;
      }
    }
  }
  // Pass 3: bars in temp var — park at any free slot
  for (let id = 0; id < n; id++) {
    if (positionOf[id] !== -1) continue;
    for (let pos = 0; pos < n; pos++) {
      if (!claimedPos.has(pos)) {
        positionOf[id] = pos;
        claimedPos.add(pos);
        break;
      }
    }
  }

  /* ── geometry — responsive to container ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 240 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setDims({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const LEGEND_H = 24; // top legend row
  const PTR_H = 28; // pointer badge zone above bars
  const IDX_H = 20; // index label row below bars
  const BASE_H = 2; // baseline stroke
  const CHART_H = Math.max(80, dims.h - LEGEND_H - PTR_H - IDX_H - BASE_H - 12);

  const GAP = Math.max(2, Math.min(6, Math.floor((dims.w * 0.08) / n)));
  const BAR_W = Math.max(
    8,
    Math.min(52, Math.floor((dims.w - 32 - GAP * (n - 1)) / n)),
  );
  const totalW = n * BAR_W + (n - 1) * GAP;

  const ptrMap = buildPointerMap(variables, n);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col select-none"
      style={{ minHeight: 140 }}
    >
      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: LEGEND_H }}
      >
        {[
          { color: "#3b82f6", label: "unsorted" },
          { color: "#f59e0b", label: "comparing" },
          { color: "#dc2626", label: "swapping" },
          { color: "#16a34a", label: "sorted" },
        ].map(({ color, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[9px] text-text-muted font-mono"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* ── Chart area ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-end justify-center px-4 pb-1"
        style={{ minHeight: 0 }}
      >
        <div
          className="relative shrink-0"
          style={{ width: totalW, height: PTR_H + CHART_H + IDX_H + BASE_H }}
        >
          {Array.from({ length: n }, (_, id) => {
            const pos = positionOf[id] ?? id;
            const isH = arr.highlights.includes(pos);
            const isS = arr.swapped.includes(pos);
            const isDone = arr.sorted.includes(pos);
            const ptrs = ptrMap.get(pos) ?? [];

            // ── Bar's FIXED value and height (never changes, regardless of position) ──
            // Use barValues[id] — the value this bar was born with — so the bar
            // carries its correct height as it slides to any column during a swap.
            const barVal = barIdentity.values[id] ?? arr.values[pos];
            const barH = Math.max(
              Math.round((barVal / maxBarVal) * CHART_H),
              14,
            );

            // ── TRANSFORM-based swap animation ────────────────────────────
            // Each bar is pinned to its IDENTITY position (id × step) via CSS
            // `left` (never changes → no layout thrash).  The visual offset is
            // carried by an `x` transform so Framer Motion can spring it cheaply
            // on the GPU.  When stabIds swaps two entries, `pos` changes for
            // those two ids → `xOffset` changes → Framer springs to new slot.
            const homeLeft = id * (BAR_W + GAP); // fixed CSS left — identity home
            const targLeft = pos * (BAR_W + GAP); // visual target column
            const xOffset = targLeft - homeLeft; // GPU-animated transform offset

            /* gradient pair */
            const [gradTop, gradBot] = isS
              ? BAR_GRADIENTS.swap
              : isH
                ? BAR_GRADIENTS.compare
                : isDone
                  ? BAR_GRADIENTS.sorted
                  : BAR_GRADIENTS.default;

            const glowColor = isS
              ? "rgba(220,38,38,0.7)"
              : isH
                ? "rgba(245,158,11,0.6)"
                : "transparent";

            /* font size scales with bar width */
            const valFontSz = Math.max(8, Math.min(13, BAR_W - 4));

            /* show value inside bar if tall enough, else just above */
            const valInsideBar = barH > valFontSz + 10;

            return (
              <motion.div
                key={id}
                className="absolute flex flex-col items-center"
                style={{ width: BAR_W, bottom: IDX_H + BASE_H, left: homeLeft }}
                /* x animates the SLIDE — height is fixed and never re-animates */
                initial={{ x: xOffset }}
                animate={{ x: xOffset }}
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 26, mass: 0.8 },
                }}
              >
                {/* ── Pointer badges + pin ── */}
                <div
                  className="absolute flex flex-col items-center gap-0.5"
                  style={{
                    bottom: barH + (valInsideBar ? 2 : valFontSz + 6),
                    width: "100%",
                  }}
                >
                  <AnimatePresence>
                    {ptrs.map((ptr) => (
                      <motion.span
                        key={ptr.name}
                        initial={{ opacity: 0, y: -6, scale: 0.7 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 28,
                        }}
                        className={`text-[7px] font-bold leading-none px-0.5 py-px rounded border whitespace-nowrap ${PTR_COLORS[ptr.ci].badge}`}
                      >
                        {ptr.name}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {ptrs.length > 0 && (
                    <div
                      className={`w-px h-2.5 rounded-full ${PTR_COLORS[ptrs[0].ci].dot}`}
                    />
                  )}
                </div>

                {/* ── Value label above bar (when bar is short) ── */}
                {!valInsideBar && (
                  <div
                    className="absolute font-mono font-bold text-text-primary whitespace-nowrap"
                    style={{
                      fontSize: valFontSz,
                      lineHeight: 1,
                      bottom: barH + 3,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {barVal}
                  </div>
                )}

                {/* ── The bar column ──────────────────────────────────────────
                 * height is set via `style` only — NOT animated — so it never
                 * changes after mount.  Only colour (via gradient) and lift (y)
                 * are animated, keeping the bar's proportions locked to barVal.
                 * ──────────────────────────────────────────────────────────── */}
                <motion.div
                  className="absolute bottom-0 w-full rounded-t"
                  animate={{ y: isS ? -12 : 0 }}
                  transition={{
                    y: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                  style={{
                    height: barH, // fixed — no animation on height
                    background: `linear-gradient(to bottom, ${gradTop}, ${gradBot})`,
                    boxShadow:
                      isS || isH
                        ? `0 0 18px 5px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.25)`
                        : "inset 0 1px 0 rgba(255,255,255,0.15)",
                    border: `1px solid ${gradBot}88`,
                    transformOrigin: "bottom center",
                  }}
                >
                  {/* Value label inside bar (near top) */}
                  {valInsideBar && (
                    <div
                      className="absolute w-full text-center font-mono font-bold text-white/95 leading-none"
                      style={{ fontSize: valFontSz, top: 5 }}
                    >
                      {barVal}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            );
          })}

          {/* ── Index labels row ── */}
          <div
            className="absolute left-0 right-0 flex"
            style={{ bottom: 0, height: IDX_H + BASE_H }}
          >
            {/* baseline */}
            <div
              className="absolute left-0 right-0 bg-border"
              style={{ top: 0, height: BASE_H }}
            />
            {/* index numbers */}
            {Array.from({ length: n }, (_, pos) => {
              const leftPx = pos * (BAR_W + GAP);
              const idxFontSz = Math.max(7, Math.min(11, BAR_W - 3));
              return (
                <div
                  key={pos}
                  className="absolute flex items-center justify-center font-mono text-text-muted"
                  style={{
                    left: leftPx,
                    width: BAR_W,
                    top: BASE_H + 2,
                    height: IDX_H - 2,
                    fontSize: idxFontSz,
                  }}
                >
                  {pos}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stack Card (vertical LIFO) ─── */
export function StackCard({
  arrays,
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  const arr = arrays[0];
  const reversed = useMemo(() => [...arr.values].reverse(), [arr.values]);

  return (
    <div className="flex flex-col items-center justify-end h-full px-4 py-3 gap-1 overflow-auto">
      <span className="text-[9px] text-text-muted font-mono mb-1">← top</span>
      <AnimatePresence mode="popLayout">
        {reversed.map((val, i) => {
          const origIdx = arr.values.length - 1 - i;
          const isH = arr.highlights.includes(origIdx);
          const isS = arr.swapped.includes(origIdx);
          const isTop = i === 0;

          let bg = "bg-surface border-border text-text-primary";
          if (isTop) bg = "bg-accent/10 border-accent text-accent";
          if (isH) bg = "bg-accent/20 border-accent text-accent";
          if (isS) bg = "bg-red/20 border-red text-red";

          return (
            <motion.div
              key={`${origIdx}-${val}`}
              className={`w-24 h-8 flex items-center justify-center rounded-md border-2 font-mono text-sm font-medium ${bg}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {val}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div className="w-28 h-0.5 bg-border mt-1" />
      <span className="text-[9px] text-text-muted font-mono">bottom →</span>
    </div>
  );
}

/* ─── HashMap Card (key-value pills with animated entries) ─── */
export function HashMapCard({ objects }: { objects: ObjectState[] }) {
  return (
    <div className="h-full overflow-auto">
      {objects.map((obj, oi) => (
        <div key={obj.name || oi} className="px-4 py-3">
          <span className="text-[10px] font-mono text-green font-semibold mb-2 block">
            {obj.name}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {obj.entries.map((e) => (
                <motion.div
                  key={e.key}
                  layout
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{
                    opacity: 1,
                    scale: e.changed ? [1, 1.12, 1] : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1.5 rounded-md border ${
                    e.changed
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface text-text-secondary"
                  }`}
                >
                  <span className="font-semibold">{e.key}</span>
                  <span className="text-text-muted">:</span>
                  <span>{fmtVal(e.value)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── DP Card (table/grid with pointer indicators) ─── */
export function DPCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  return (
    <div className="h-full overflow-auto px-4 py-3">
      {arrays.map((arr, ai) => {
        const ptrMap = buildPointerMap(variables, arr.values.length);
        return (
          <div key={arr.name || ai} className={ai > 0 ? "mt-4" : ""}>
            {arrays.length > 1 && (
              <span className="text-[10px] font-mono text-text-muted mb-1 block">
                {arr.name}
              </span>
            )}
            <div className="flex items-end gap-px flex-wrap">
              {arr.values.map((val, idx) => {
                const isH = arr.highlights.includes(idx);
                const isS = arr.swapped.includes(idx);
                const isDone = arr.sorted.includes(idx);
                const ptrs = ptrMap.get(idx) ?? [];

                let bg = "bg-surface border-border text-text-primary";
                if (isDone) bg = "bg-green/10 border-green text-green";
                if (isH) bg = "bg-accent/20 border-accent text-accent";
                if (isS) bg = "bg-red/20 border-red text-red";

                return (
                  <div key={idx} className="flex flex-col items-center">
                    {/* pointer badges */}
                    <div className="h-6 flex flex-col items-center justify-end gap-0.5">
                      <AnimatePresence>
                        {ptrs.map((ptr) => (
                          <motion.span
                            key={ptr.name}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`text-[7px] font-bold leading-none px-0.5 rounded border ${PTR_COLORS[ptr.ci].badge}`}
                          >
                            {ptr.name}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                    <motion.div
                      className={`w-9 h-9 flex flex-col items-center justify-center border font-mono text-xs ${bg}`}
                      animate={{ scale: isH || isS ? 1.1 : 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      <span className="font-medium">
                        {val === Infinity || val === 999 ? "∞" : val}
                      </span>
                      <span className="text-[7px] text-text-muted">{idx}</span>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tree Card (binary tree with SVG edges) ─── */
export function TreeCard({
  arrays,
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  const arr = arrays[0];
  const n = arr.values.length;

  const NODE_R = 18;
  const LEVEL_H = 60;
  const levels = Math.max(1, Math.ceil(Math.log2(n + 1)));
  const minWidth = 300;
  const CONTAINER_W = Math.max(
    minWidth,
    Math.pow(2, levels - 1) * (NODE_R * 2 + 16),
  );
  const CONTAINER_H = levels * LEVEL_H + NODE_R * 2 + 8;

  const positions = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, level) - 1);
      const nodesInLevel = Math.pow(2, level);
      const x = (posInLevel + 0.5) * (CONTAINER_W / nodesInLevel);
      const y = level * LEVEL_H + NODE_R + 8;
      return { x, y };
    });
  }, [n, CONTAINER_W]);

  if (n === 0) return null;

  return (
    <div className="flex items-start justify-center h-full overflow-auto py-2">
      <svg width={CONTAINER_W} height={CONTAINER_H}>
        {/* Edge lines */}
        {positions.map((pos, i) => {
          const left = 2 * i + 1;
          const right = 2 * i + 2;
          return (
            <g key={`edges-${i}`}>
              {left < n && (
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={positions[left].x}
                  y2={positions[left].y}
                  stroke="#30363d"
                  strokeWidth="1.5"
                />
              )}
              {right < n && (
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={positions[right].x}
                  y2={positions[right].y}
                  stroke="#30363d"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {arr.values.map((val, idx) => {
          const { x, y } = positions[idx];
          const isH = arr.highlights.includes(idx);
          const isS = arr.swapped.includes(idx);
          const isDone = arr.sorted.includes(idx);

          let fill = "#161b22";
          let stroke = "#21262d";
          let textFill = "#8b949e";
          if (isDone) {
            fill = "rgba(34,197,94,0.12)";
            stroke = "#22c55e";
            textFill = "#22c55e";
          }
          if (isH) {
            fill = "rgba(251,189,35,0.15)";
            stroke = "#fbbd23";
            textFill = "#fbbd23";
          }
          if (isS) {
            fill = "rgba(239,68,68,0.12)";
            stroke = "#ef4444";
            textFill = "#ef4444";
          }

          return (
            <g key={idx}>
              <circle
                cx={x}
                cy={y}
                r={NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textFill}
                fontSize="11"
                fontFamily="'JetBrains Mono',monospace"
                fontWeight="600"
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Graph Card (circular layout with SVG edges) ─── */
export function GraphCard({
  arrays,
  edges,
}: {
  arrays: ArrayState[];
  edges?: [number, number][];
}) {
  const arr = arrays[0];
  const n = arr.values.length;
  const NODE_R = 18;
  const graphEdges = edges ?? [];

  const { positions, svgW, svgH } = useMemo(() => {
    const outerR = Math.max(60, Math.min(110, 24 + n * 10));
    const cx = outerR + NODE_R + 8;
    const cy = outerR + NODE_R + 8;
    const w = cx * 2;
    const h = cy * 2;
    const pos = Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * outerR,
        y: cy + Math.sin(angle) * outerR,
      };
    });
    return { positions: pos, svgW: w, svgH: h };
  }, [n]);

  return (
    <div className="flex items-center justify-center h-full py-2 overflow-auto">
      <svg width={svgW} height={svgH}>
        {/* Edges */}
        {graphEdges.map(([src, dst], ei) => {
          if (src >= n || dst >= n) return null;
          const s = positions[src];
          const d = positions[dst];
          return (
            <line
              key={ei}
              x1={s.x}
              y1={s.y}
              x2={d.x}
              y2={d.y}
              stroke="#30363d"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}
        {/* Nodes */}
        {arr.values.map((val, idx) => {
          const { x, y } = positions[idx];
          const isH = arr.highlights.includes(idx);
          const isS = arr.swapped.includes(idx);
          const isDone = arr.sorted.includes(idx);

          let fill = "#161b22";
          let stroke = "#21262d";
          let textFill = "#8b949e";
          if (isDone) {
            fill = "rgba(34,197,94,0.12)";
            stroke = "#22c55e";
            textFill = "#22c55e";
          }
          if (isH) {
            fill = "rgba(251,189,35,0.15)";
            stroke = "#fbbd23";
            textFill = "#fbbd23";
          }
          if (isS) {
            fill = "rgba(239,68,68,0.12)";
            stroke = "#ef4444";
            textFill = "#ef4444";
          }

          return (
            <g key={idx}>
              <circle
                cx={x}
                cy={y}
                r={NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textFill}
                fontSize="11"
                fontFamily="'JetBrains Mono',monospace"
                fontWeight="600"
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Linked List Card (nodes with pointer-based arrows) ─── */
const POINTER_COLORS: Record<string, { stroke: string; text: string }> = {
  prev: { stroke: "#a855f7", text: "#a855f7" },
  slow: { stroke: "#22c55e", text: "#22c55e" },
  tortoise: { stroke: "#22c55e", text: "#22c55e" },
  fast: { stroke: "#ef4444", text: "#ef4444" },
  hare: { stroke: "#ef4444", text: "#ef4444" },
  curr: { stroke: "#3b82f6", text: "#3b82f6" },
  current: { stroke: "#3b82f6", text: "#3b82f6" },
  head: { stroke: "#fbbd23", text: "#fbbd23" },
  temp: { stroke: "#f97316", text: "#f97316" },
  tail: { stroke: "#f97316", text: "#f97316" },
  left: { stroke: "#22c55e", text: "#22c55e" },
  right: { stroke: "#ef4444", text: "#ef4444" },
  a: { stroke: "#3b82f6", text: "#3b82f6" },
  b: { stroke: "#a855f7", text: "#a855f7" },
  node: { stroke: "#3b82f6", text: "#3b82f6" },
  dummy: { stroke: "#8b949e", text: "#8b949e" },
  p1: { stroke: "#22c55e", text: "#22c55e" },
  p2: { stroke: "#ef4444", text: "#ef4444" },
  l1: { stroke: "#22c55e", text: "#22c55e" },
  l2: { stroke: "#ef4444", text: "#ef4444" },
  list1: { stroke: "#22c55e", text: "#22c55e" },
  list2: { stroke: "#ef4444", text: "#ef4444" },
  first: { stroke: "#22c55e", text: "#22c55e" },
  second: { stroke: "#ef4444", text: "#ef4444" },
  nextTemp: { stroke: "#f97316", text: "#f97316" },
  reversed: { stroke: "#a855f7", text: "#a855f7" },
};

/* ─── Class-based (object graph) LL renderer ─── */
function LinkedListFromState({ linkedList }: { linkedList: LinkedListState }) {
  const { nodes, pointers } = linkedList;
  const n = nodes.length;

  /* node index → pointer names sitting on it */
  const nodePointers = useMemo<Record<number, string[]>>(() => {
    const np: Record<number, string[]> = {};
    for (const p of pointers) {
      if (!np[p.nodeId]) np[p.nodeId] = [];
      np[p.nodeId].push(p.name);
    }
    return np;
  }, [pointers]);

  /* layout */
  const NODE_W = 52;
  const NODE_H = 36;
  const GAP = 44;
  const LABEL_H = 34;
  const CURVE_SPACE = 38;
  const nodeY = LABEL_H;
  const totalW = Math.max(200, n * (NODE_W + GAP) + 32);
  const totalH = LABEL_H + NODE_H + CURVE_SPACE + 4;
  const nx = (i: number) => i * (NODE_W + GAP);
  const ncx = (i: number) => nx(i) + NODE_W / 2;
  const ncy = nodeY + NODE_H / 2;

  /* Set of nodes pointed to by variables (for highlighting) */
  const pointedSet = useMemo(() => {
    const s = new Set<number>();
    for (const p of pointers) s.add(p.nodeId);
    return s;
  }, [pointers]);

  return (
    <div className="flex items-center justify-start h-full px-4 py-2 overflow-auto">
      <svg width={totalW} height={totalH} className="shrink-0">
        {/* ── Arrows based on next pointers ── */}
        {nodes.map((nd, idx) => {
          const t = nd.next; // target index, or -1
          const isPointed = pointedSet.has(idx);
          const color = isPointed ? "#fbbd23" : "#484f58";
          const sw = isPointed ? 2 : 1.5;

          /* null terminator ─| */
          if (t === -1) {
            const x1 = nx(idx) + NODE_W;
            return (
              <g key={`a${idx}`}>
                <line
                  x1={x1}
                  y1={ncy}
                  x2={x1 + 16}
                  y2={ncy}
                  stroke={color}
                  strokeWidth={sw}
                />
                <line
                  x1={x1 + 16}
                  y1={ncy - 6}
                  x2={x1 + 16}
                  y2={ncy + 6}
                  stroke={color}
                  strokeWidth={sw}
                />
                <line
                  x1={x1 + 20}
                  y1={ncy - 4}
                  x2={x1 + 20}
                  y2={ncy + 4}
                  stroke={color}
                  strokeWidth={sw * 0.7}
                />
              </g>
            );
          }

          /* forward adjacent → straight arrow */
          if (t === idx + 1) {
            const x1 = nx(idx) + NODE_W;
            const x2 = nx(t);
            return (
              <g key={`a${idx}`}>
                <line
                  x1={x1}
                  y1={ncy}
                  x2={x2 - 5}
                  y2={ncy}
                  stroke={color}
                  strokeWidth={sw}
                />
                <polygon
                  points={`${x2},${ncy} ${x2 - 7},${ncy - 4} ${x2 - 7},${ncy + 4}`}
                  fill={color}
                />
              </g>
            );
          }

          /* backward → curve below nodes */
          if (t < idx) {
            const depth =
              nodeY + NODE_H + 8 + Math.min(Math.abs(idx - t) * 10, 28);
            return (
              <g key={`a${idx}`}>
                <path
                  d={`M${ncx(idx)},${nodeY + NODE_H} C${ncx(idx)},${depth} ${ncx(t)},${depth} ${ncx(t)},${nodeY + NODE_H}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={sw}
                />
                <polygon
                  points={`${ncx(t)},${nodeY + NODE_H} ${ncx(t) - 4},${nodeY + NODE_H + 7} ${ncx(t) + 4},${nodeY + NODE_H + 7}`}
                  fill={color}
                />
              </g>
            );
          }

          /* forward skip → curve above nodes */
          const depth = nodeY - 4 - Math.min(Math.abs(t - idx) * 8, 20);
          return (
            <g key={`a${idx}`}>
              <path
                d={`M${ncx(idx)},${nodeY} C${ncx(idx)},${depth} ${ncx(t)},${depth} ${ncx(t)},${nodeY}`}
                fill="none"
                stroke={color}
                strokeWidth={sw}
              />
              <polygon
                points={`${ncx(t)},${nodeY} ${ncx(t) - 4},${nodeY - 7} ${ncx(t) + 4},${nodeY - 7}`}
                fill={color}
              />
            </g>
          );
        })}

        {/* ── Nodes ── */}
        {nodes.map((nd, idx) => {
          const bx = nx(idx);
          const by = nodeY;
          /* Highlight nodes that have a pointer on them */
          const ptrs = nodePointers[idx] ?? [];
          const hasPointer = ptrs.length > 0;

          let fill = "#161b22";
          let stroke = "#21262d";
          let textFill = "#e6edf3";
          if (hasPointer) {
            // Use the first pointer's color for the node highlight
            const pc = POINTER_COLORS[ptrs[0]] ?? {
              stroke: "#fbbd23",
              text: "#fbbd23",
            };
            fill = `${pc.stroke}18`;
            stroke = pc.stroke;
            textFill = pc.text;
          }

          return (
            <g key={`n${idx}`}>
              {/* Pointer labels above */}
              {ptrs.map((pName, pi) => {
                const pc = POINTER_COLORS[pName] ?? {
                  stroke: "#8b949e",
                  text: "#8b949e",
                };
                const ly = 2 + pi * 13;
                return (
                  <g key={pName}>
                    <line
                      x1={bx + NODE_W / 2}
                      y1={ly + 10}
                      x2={bx + NODE_W / 2}
                      y2={by}
                      stroke={pc.stroke}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                    <text
                      x={bx + NODE_W / 2}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="hanging"
                      fill={pc.text}
                      fontSize="9"
                      fontFamily="'JetBrains Mono',monospace"
                      fontWeight="700"
                    >
                      {pName}
                    </text>
                  </g>
                );
              })}
              {/* Node rectangle */}
              <rect
                x={bx}
                y={by}
                width={NODE_W}
                height={NODE_H}
                rx="6"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <text
                x={bx + NODE_W / 2}
                y={by + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textFill}
                fontSize="13"
                fontFamily="'JetBrains Mono',monospace"
                fontWeight="600"
              >
                {nd.val}
              </text>
              {/* Index label below */}
              <text
                x={bx + NODE_W / 2}
                y={by + NODE_H + 10}
                textAnchor="middle"
                dominantBaseline="hanging"
                fill="#484f58"
                fontSize="8"
                fontFamily="'JetBrains Mono',monospace"
              >
                {idx}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LinkedListCard({
  arrays,
  variables,
  linkedList,
}: {
  arrays: ArrayState[];
  variables?: { name: string; value: unknown }[];
  linkedList?: LinkedListState;
}) {
  /* ═══════════════════════════════════════════════════════
     Path B hooks: array-based LL data (must run unconditionally)
     ═══════════════════════════════════════════════════════ */
  /* Separate the "next-pointer" array from value arrays */
  const nextArr = useMemo(
    () => arrays.find((a) => a.name === "next" || a.name === "nxt"),
    [arrays],
  );
  const valsArr = useMemo(
    () => arrays.find((a) => a !== nextArr) ?? arrays[0],
    [arrays, nextArr],
  );

  const vals = valsArr?.values ?? [];
  const nextPtrs = nextArr?.values;
  const n = vals.length;

  /* pointer name → node index (skip -1 / out-of-range) */
  const pointerMap = useMemo<Record<string, number>>(() => {
    const pm: Record<string, number> = {};
    if (!variables) return pm;
    for (const v of variables) {
      if (
        typeof v.value === "number" &&
        v.name in POINTER_COLORS &&
        v.value >= 0 &&
        v.value < n
      ) {
        pm[v.name] = v.value;
      }
    }
    return pm;
  }, [variables, n]);

  /* Inverse: node index → pointer names */
  const nodePointers = useMemo<Record<number, string[]>>(() => {
    const np: Record<number, string[]> = {};
    for (const [name, idx] of Object.entries(pointerMap)) {
      if (!np[idx]) np[idx] = [];
      np[idx].push(name);
    }
    return np;
  }, [pointerMap]);

  /* ═══════════════════════════════════════════════════════
     Path A: class-based LL data from the interpreter
     ═══════════════════════════════════════════════════════ */
  if (linkedList && linkedList.nodes.length > 0) {
    return <LinkedListFromState linkedList={linkedList} />;
  }

  /* ═══════════════════════════════════════════════════════
     Path B: array-based LL data (fallback)
     ═══════════════════════════════════════════════════════ */

  /* Layout constants */
  const NODE_W = 52;
  const NODE_H = 36;
  const GAP = 44;
  const LABEL_H = 34;
  const CURVE_SPACE = 38;
  const nodeY = LABEL_H;
  const totalW = Math.max(200, n * (NODE_W + GAP) + 32);
  const totalH = LABEL_H + NODE_H + CURVE_SPACE + 4;
  const nx = (i: number) => i * (NODE_W + GAP);
  const ncx = (i: number) => nx(i) + NODE_W / 2;
  const ncy = nodeY + NODE_H / 2;

  if (n === 0) return null;

  /* ── arrow renderer for the "next" array ── */
  const renderNextArrows = () =>
    vals.map((_, i) => {
      const t = nextPtrs![i];
      if (t === undefined) return null;
      const isHL = nextArr!.highlights.includes(i);
      const color = isHL ? "#fbbd23" : "#484f58";
      const sw = isHL ? 2 : 1.5;

      /* null terminator ─|  */
      if (t === -1) {
        const x1 = nx(i) + NODE_W;
        return (
          <g key={`a${i}`}>
            <line
              x1={x1}
              y1={ncy}
              x2={x1 + 16}
              y2={ncy}
              stroke={color}
              strokeWidth={sw}
            />
            <line
              x1={x1 + 16}
              y1={ncy - 6}
              x2={x1 + 16}
              y2={ncy + 6}
              stroke={color}
              strokeWidth={sw}
            />
            <line
              x1={x1 + 20}
              y1={ncy - 4}
              x2={x1 + 20}
              y2={ncy + 4}
              stroke={color}
              strokeWidth={sw * 0.7}
            />
          </g>
        );
      }

      /* forward adjacent → straight arrow */
      if (t === i + 1) {
        const x1 = nx(i) + NODE_W;
        const x2 = nx(t);
        return (
          <g key={`a${i}`}>
            <line
              x1={x1}
              y1={ncy}
              x2={x2 - 5}
              y2={ncy}
              stroke={color}
              strokeWidth={sw}
            />
            <polygon
              points={`${x2},${ncy} ${x2 - 7},${ncy - 4} ${x2 - 7},${ncy + 4}`}
              fill={color}
            />
          </g>
        );
      }

      /* backward → curve below nodes */
      if (t < i) {
        const depth = nodeY + NODE_H + 8 + Math.min(Math.abs(i - t) * 10, 28);
        return (
          <g key={`a${i}`}>
            <path
              d={`M${ncx(i)},${nodeY + NODE_H} C${ncx(i)},${depth} ${ncx(t)},${depth} ${ncx(t)},${nodeY + NODE_H}`}
              fill="none"
              stroke={color}
              strokeWidth={sw}
            />
            <polygon
              points={`${ncx(t)},${nodeY + NODE_H} ${ncx(t) - 4},${nodeY + NODE_H + 7} ${ncx(t) + 4},${nodeY + NODE_H + 7}`}
              fill={color}
            />
          </g>
        );
      }

      /* forward skip → curve above nodes */
      const depth = nodeY - 4 - Math.min(Math.abs(t - i) * 8, 20);
      return (
        <g key={`a${i}`}>
          <path
            d={`M${ncx(i)},${nodeY} C${ncx(i)},${depth} ${ncx(t)},${depth} ${ncx(t)},${nodeY}`}
            fill="none"
            stroke={color}
            strokeWidth={sw}
          />
          <polygon
            points={`${ncx(t)},${nodeY} ${ncx(t) - 4},${nodeY - 7} ${ncx(t) + 4},${nodeY - 7}`}
            fill={color}
          />
        </g>
      );
    });

  /* ── fallback: sequential arrows when no next array ── */
  const renderFallbackArrows = () =>
    vals.map((_, i) => {
      if (i >= n - 1) {
        const x1 = nx(i) + NODE_W;
        return (
          <g key={`a${i}`}>
            <line
              x1={x1}
              y1={ncy}
              x2={x1 + 16}
              y2={ncy}
              stroke="#484f58"
              strokeWidth="1.5"
            />
            <line
              x1={x1 + 16}
              y1={ncy - 6}
              x2={x1 + 16}
              y2={ncy + 6}
              stroke="#484f58"
              strokeWidth="1.5"
            />
            <line
              x1={x1 + 20}
              y1={ncy - 4}
              x2={x1 + 20}
              y2={ncy + 4}
              stroke="#484f58"
              strokeWidth="1"
            />
          </g>
        );
      }
      const x1 = nx(i) + NODE_W;
      const x2 = nx(i + 1);
      return (
        <g key={`a${i}`}>
          <line
            x1={x1}
            y1={ncy}
            x2={x2 - 5}
            y2={ncy}
            stroke="#484f58"
            strokeWidth="1.5"
          />
          <polygon
            points={`${x2},${ncy} ${x2 - 7},${ncy - 4} ${x2 - 7},${ncy + 4}`}
            fill="#484f58"
          />
        </g>
      );
    });

  return (
    <div className="flex items-center justify-start h-full px-4 py-2 overflow-auto">
      <svg width={totalW} height={totalH} className="shrink-0">
        {/* ── Arrows ── */}
        {nextPtrs ? renderNextArrows() : renderFallbackArrows()}

        {/* ── Nodes ── */}
        {vals.map((val, idx) => {
          const bx = nx(idx);
          const by = nodeY;
          const isH =
            valsArr.highlights.includes(idx) ||
            (nextArr?.highlights.includes(idx) ?? false);
          const isS =
            valsArr.swapped.includes(idx) ||
            (nextArr?.swapped.includes(idx) ?? false);
          const isDone = valsArr.sorted.includes(idx);

          let fill = "#161b22";
          let stroke = "#21262d";
          let textFill = "#e6edf3";
          if (isDone) {
            fill = "rgba(34,197,94,0.12)";
            stroke = "#22c55e";
            textFill = "#22c55e";
          }
          if (isH) {
            fill = "rgba(251,189,35,0.15)";
            stroke = "#fbbd23";
            textFill = "#fbbd23";
          }
          if (isS) {
            fill = "rgba(239,68,68,0.12)";
            stroke = "#ef4444";
            textFill = "#ef4444";
          }

          const ptrs = nodePointers[idx] ?? [];

          return (
            <g key={`n${idx}`}>
              {/* Pointer labels above */}
              {ptrs.map((pName, pi) => {
                const pc = POINTER_COLORS[pName] ?? {
                  stroke: "#8b949e",
                  text: "#8b949e",
                };
                const ly = 2 + pi * 13;
                return (
                  <g key={pName}>
                    <line
                      x1={bx + NODE_W / 2}
                      y1={ly + 10}
                      x2={bx + NODE_W / 2}
                      y2={by}
                      stroke={pc.stroke}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                    <text
                      x={bx + NODE_W / 2}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="hanging"
                      fill={pc.text}
                      fontSize="9"
                      fontFamily="'JetBrains Mono',monospace"
                      fontWeight="700"
                    >
                      {pName}
                    </text>
                  </g>
                );
              })}
              {/* Node rectangle */}
              <rect
                x={bx}
                y={by}
                width={NODE_W}
                height={NODE_H}
                rx="6"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <text
                x={bx + NODE_W / 2}
                y={by + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textFill}
                fontSize="13"
                fontFamily="'JetBrains Mono',monospace"
                fontWeight="600"
              >
                {val}
              </text>
              {/* Index label below */}
              <text
                x={bx + NODE_W / 2}
                y={by + NODE_H + 10}
                textAnchor="middle"
                dominantBaseline="hanging"
                fill="#484f58"
                fontSize="8"
                fontFamily="'JetBrains Mono',monospace"
              >
                {idx}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Matrix Card (2D grid view) ─── */
export function MatrixCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  return (
    <div className="flex flex-col h-full overflow-auto gap-4 px-4 py-3">
      {arrays.map((arr, ai) => {
        const cols =
          arr.cols ?? Math.max(1, Math.round(Math.sqrt(arr.values.length)));
        const rows = Math.ceil(arr.values.length / cols);
        const ptrMap = buildPointerMap(variables, arr.values.length);

        return (
          <div key={arr.name ?? ai}>
            {arrays.length > 1 && (
              <span className="text-[10px] font-mono text-text-muted mb-2 block">
                {arr.name}
              </span>
            )}
            <div
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }}
            >
              {Array.from({ length: rows * cols }, (_, fi) => {
                const val = arr.values[fi];
                const hasVal = fi < arr.values.length;

                const isH = hasVal && arr.highlights.includes(fi);
                const isS = hasVal && arr.swapped.includes(fi);
                const isDone = hasVal && arr.sorted.includes(fi);
                const ptrs = ptrMap.get(fi);

                let border = "border-border";
                let text = hasVal ? "text-text-primary" : "text-transparent";
                if (isDone) {
                  border = "border-green";
                  text = "text-green";
                }
                if (isH) {
                  border = "border-accent";
                  text = "text-accent";
                }
                if (isS) {
                  border = "border-red";
                  text = "text-red";
                }

                return (
                  <motion.div
                    key={fi}
                    className={`relative w-10 h-10 flex items-center justify-center rounded border-2 font-mono text-sm font-medium bg-surface ${border} ${text}`}
                    initial={false}
                    animate={{ scale: isH || isS ? 1.12 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {hasVal ? val : ""}
                    {ptrs && ptrs.length > 0 && ptrs.map(({ name, ci }) => (
                      <span
                        key={name}
                        className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-mono px-0.5 rounded border ${PTR_COLORS[ci % PTR_COLORS.length].badge}`}
                      >
                        {name}
                      </span>
                    ))}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtVal(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 10 ? v.slice(0, 10) + "…" : v;
  return "…";
}
