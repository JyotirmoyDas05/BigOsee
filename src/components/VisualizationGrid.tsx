"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useTimelineStore } from "@/stores/timelineStore";
import { useCodeStore } from "@/stores/codeStore";
import { ALGORITHM_DATA } from "@/data/algorithms";
import {
  ArrayCard,
  SortingCard,
  StackCard,
  HashMapCard,
  DPCard,
  TreeCard,
  GraphCard,
  LinkedListCard,
  MatrixCard,
} from "./ArrayVisualizer";
import { IconResetLayout } from "./icons";

// question → category
const Q_CAT: Record<string, string> = {};
ALGORITHM_DATA.forEach((c) =>
  c.questions.forEach((q) => {
    Q_CAT[q.id] = c.name;
  }),
);

type VizType =
  | "array"
  | "sorting"
  | "stack"
  | "hashmap"
  | "tree"
  | "graph"
  | "dp"
  | "linked-list"
  | "matrix";

const CATEGORY_PANELS: Record<string, VizType[]> = {
  "Arrays & Hashing": ["array"],
  "Advanced Matrix": ["matrix", "array"],
  "Binary Search Variants": ["array"],
  "Sorting Algorithms": ["sorting", "array"],
  "Recursion & Backtracking": ["array"],
  "Stack Algorithms": ["stack", "array"],
  "Linked List": ["linked-list"],
  "Tree Algorithms": ["tree", "array"],
  "Binary Search Tree": ["tree", "array"],
  "Graph Algorithms": ["graph", "array"],
  "Dynamic Programming": ["dp", "array"],
  "Greedy Algorithms": ["array"],
  "String Algorithms": ["array"],
  "Heap Algorithms": ["sorting", "tree"],
  "Graph Traversals": ["graph", "array"],
  "Advanced Cache": ["hashmap", "array"],
};

const VIZ_META: Record<VizType, { label: string; color: string }> = {
  array: { label: "Array", color: "text-blue" },
  sorting: { label: "Sorting", color: "text-accent" },
  stack: { label: "Stack", color: "text-purple" },
  hashmap: { label: "HashMap", color: "text-green" },
  tree: { label: "Tree", color: "text-teal" },
  graph: { label: "Graph", color: "text-orange" },
  dp: { label: "DP Table", color: "text-pink" },
  "linked-list": { label: "Linked List", color: "text-teal" },
  matrix: { label: "Matrix", color: "text-orange" },
};

// how many grid rows each viz type needs
const VIZ_ROWS: Record<VizType, number> = {
  array: 2,
  sorting: 3,
  stack: 3,
  hashmap: 2,
  tree: 3,
  graph: 3,
  dp: 2,
  "linked-list": 3,
  matrix: 3,
};

function DragHandle() {
  return (
    <span className="drag-handle cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary text-xs select-none px-1 leading-none">
      ⋮⋮
    </span>
  );
}

function PanelHeader({ title, color }: { title: string; color?: string }) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border shrink-0">
      <DragHandle />
      <span
        className={`text-[10px] font-semibold tracking-widest uppercase ${color || "text-text-muted"}`}
      >
        {title}
      </span>
    </div>
  );
}

export default function VisualizationGrid() {
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  const { snapshots, currentStep } = useTimelineStore();
  const { activeQuestionId } = useCodeStore();
  const snapshot = snapshots[currentStep];
  const hasData = snapshots.length > 0;

  const arrays = useMemo(() => snapshot?.arrays ?? [], [snapshot]);
  const objects = useMemo(() => snapshot?.objects ?? [], [snapshot]);
  const variables = useMemo(() => snapshot?.variables ?? [], [snapshot]);

  // which viz panels to spawn
  const vizPanels = useMemo((): VizType[] => {
    if (!hasData) return [];
    if (!activeQuestionId) return ["array"];
    const cat = Q_CAT[activeQuestionId];
    return (cat && CATEGORY_PANELS[cat]) || ["array"];
  }, [activeQuestionId, hasData]);

  const showExtraHashmap =
    hasData && objects.length > 0 && !vizPanels.includes("hashmap");

  // build layout: viz panels stacked above, vars+stats at bottom
  const layout = useMemo(() => {
    const items: {
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minH: number;
      minW: number;
    }[] = [];
    let y = 0;

    // viz panels — full width, stacked
    for (const type of vizPanels) {
      const rows = VIZ_ROWS[type];
      items.push({
        i: `viz-${type}`,
        x: 0,
        y,
        w: 12,
        h: rows,
        minH: 1,
        minW: 6,
      });
      y += rows;
    }

    // extra hashmap
    if (showExtraHashmap) {
      items.push({
        i: "viz-hashmap-extra",
        x: 0,
        y,
        w: 12,
        h: 2,
        minH: 1,
        minW: 6,
      });
      y += 2;
    }

    // bottom row: vars + call stack — each takes exactly half
    items.push({ i: "vars", x: 0, y, w: 6, h: 1, minH: 1, minW: 3 });
    items.push({ i: "stats", x: 6, y, w: 6, h: 1, minH: 1, minW: 3 });

    return items;
  }, [vizPanels, showExtraHashmap]);

  // track which keys exist for the grid
  const panelKeys = useMemo(() => new Set(layout.map((l) => l.i)), [layout]);

  // resize — observe the grid container for accurate width
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridRef.current ?? containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setWidth(e.contentRect.width);
        setHeight(e.contentRect.height);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const totalRows = Math.max(
    2,
    layout.reduce((m, l) => Math.max(m, l.y + l.h), 0),
  );
  const rawRowH = Math.floor((height - 30 - (totalRows - 1) * 6) / totalRows);
  // When no simulation data, force a low fixed row height so panels are extremely compact
  const rowH = hasData ? Math.max(20, rawRowH) : 25;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customLayout, setCustomLayout] = useState<any[] | null>(null);
  const handleReset = useCallback(() => setCustomLayout(null), []);

  // reset custom layout when panels change
  const [prevPanelKeys, setPrevPanelKeys] = useState(panelKeys);
  if (prevPanelKeys !== panelKeys) {
    setCustomLayout(null);
    setPrevPanelKeys(panelKeys);
  }

  function renderViz(type: VizType) {
    if (arrays.length === 0 && objects.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <span className="text-xs text-text-muted">No data yet</span>
        </div>
      );
    }
    switch (type) {
      case "sorting":
        return arrays.length > 0 ? (
          <SortingCard arrays={arrays} variables={variables} />
        ) : null;
      case "stack":
        return arrays.length > 0 ? (
          <StackCard arrays={arrays} variables={variables} />
        ) : null;
      case "hashmap":
        return objects.length > 0 ? (
          <HashMapCard objects={objects} />
        ) : arrays.length > 0 ? (
          <ArrayCard arrays={arrays} variables={variables} />
        ) : null;
      case "tree":
        return arrays.length > 0 ? (
          <TreeCard arrays={arrays} variables={variables} />
        ) : null;
      case "graph":
        return arrays.length > 0 ? (
          <GraphCard arrays={arrays} edges={snapshot?.edges} />
        ) : null;
      case "dp":
        return arrays.length > 0 ? (
          <DPCard arrays={arrays} variables={variables} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 px-6 text-center">
            <span className="text-xs text-text-muted">No DP array detected yet.</span>
            <span className="text-[10px] text-text-muted/60 leading-relaxed">
              Declare an array named <code className="text-accent font-mono">dp</code> to see the table here.
            </span>
          </div>
        );
      case "linked-list":
        return arrays.length > 0 || snapshot?.linkedList ? (
          <LinkedListCard
            arrays={arrays}
            variables={snapshot?.variables}
            linkedList={snapshot?.linkedList}
          />
        ) : null;
      case "matrix":
        return arrays.length > 0 ? <MatrixCard arrays={arrays} variables={variables} /> : null;
      case "array":
      default:
        return arrays.length > 0 ? (
          <ArrayCard arrays={arrays} variables={variables} />
        ) : null;
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-end px-1 py-0.5 shrink-0">
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors bg-surface rounded-sm px-2 py-1"
        >
          <IconResetLayout size={10} />
          Reset Layout
        </button>
      </div>

      <div ref={gridRef} className="flex-1 overflow-auto rgl-container">
        <ReactGridLayout
          className="layout"
          layout={customLayout || layout}
          onLayoutChange={(newLayout) => setCustomLayout([...newLayout])}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ cols: 12 } as any)}
          rowHeight={rowH}
          width={width}
          draggableHandle=".drag-handle"
          isResizable={true}
          isDraggable={true}
          compactType="vertical"
          margin={[6, 6]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {/* Dynamic viz panels */}
          {vizPanels.map((type) => {
            const meta = VIZ_META[type];
            return (
              <div
                key={`viz-${type}`}
                className="rgl-panel w-full h-full rounded-(--radius-panel) border border-border bg-dark overflow-hidden flex flex-col"
              >
                <PanelHeader title={meta.label} color={meta.color} />
                <div className="flex-1 overflow-auto">{renderViz(type)}</div>
              </div>
            );
          })}

          {/* Extra hashmap */}
          {showExtraHashmap && (
            <div
              key="viz-hashmap-extra"
              className="rgl-panel w-full h-full rounded-(--radius-panel) border border-border bg-dark overflow-hidden flex flex-col"
            >
              <PanelHeader title="HashMap" color="text-green" />
              <div className="flex-1 overflow-auto">
                <HashMapCard objects={objects} />
              </div>
            </div>
          )}

          {/* Variables — always visible */}
          <div
            key="vars"
            className="rgl-panel w-full h-full rounded-(--radius-panel) border border-border bg-surface overflow-hidden flex flex-col"
          >
            <PanelHeader title="Variables" />
            <div className="flex-1 px-3 py-2 overflow-y-auto">
              {snapshot && snapshot.variables.length > 0 ? (
                <div className="space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {snapshot.variables.map((v) => (
                      <motion.div
                        key={v.name}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                        className={`flex items-center justify-between text-xs font-mono px-1.5 py-0.5 rounded-sm ${
                          v.changed ? "bg-accent/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary">{v.name}</span>
                          <span className="text-[9px] text-blue px-1 py-px bg-blue/10 rounded">
                            {v.type}
                          </span>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={`${v.name}-${JSON.stringify(v.value)}`}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12 }}
                            className={
                              v.changed
                                ? "text-accent font-semibold"
                                : "text-text-primary"
                            }
                          >
                            {JSON.stringify(v.value)}
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <span className="text-xs text-text-muted">No variables</span>
              )}
            </div>
          </div>

          {/* Call Stack — always visible */}
          <div
            key="stats"
            className="rgl-panel w-full h-full rounded-(--radius-panel) border border-border bg-surface overflow-hidden flex flex-col"
          >
            <PanelHeader title="Call Stack" />
            <div className="flex-1 px-3 py-2 overflow-y-auto">
              {snapshot?.callStack && snapshot.callStack.length > 0 ? (
                <div className="space-y-0.5">
                  {snapshot.callStack.map((entry, i) => {
                    const [name, line] = entry.split(":");
                    const isActive = i === snapshot.callStack.length - 1;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between text-xs font-mono px-2 py-1 rounded-md ${
                          isActive
                            ? "bg-accent/15 text-accent"
                            : "text-text-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-accent" : "bg-text-muted"}`}
                          />
                          <span>{name}()</span>
                        </div>
                        {line && line !== "0" && (
                          <span className="text-text-muted text-[10px]">
                            :{line}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs text-text-muted">No call stack</span>
              )}
            </div>
          </div>
        </ReactGridLayout>
      </div>
    </div>
  );
}
