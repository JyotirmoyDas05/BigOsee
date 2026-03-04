"use client";

import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useCodeStore } from "@/stores/codeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useTheme } from "@/components/ThemeProvider";

export default function EditorPanel() {
  const { code, setCode } = useCodeStore();
  const { snapshots, currentStep } = useTimelineStore();
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const currentLine = snapshots[currentStep]?.line;

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // highlight active line
  const highlightLine = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !currentLine) return;

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: currentLine,
          startColumn: 1,
          endLineNumber: currentLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "active-line-highlight",
          glyphMarginClassName: "active-line-glyph",
        },
      },
    ]);
  }, [currentLine]);

  // trigger highlight whenever step changes
  useEffect(() => {
    if (editorRef.current && currentLine) {
      highlightLine();
    }
  }, [currentLine, highlightLine]);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-(--radius-panel) border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2 border-b border-border">
        <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
          Editor
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={(val) => setCode(val || "")}
          onMount={handleMount}
          theme={theme === "light" ? "vs" : "vs-dark"}
          options={{
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 8, bottom: 8 },
            lineNumbers: "on",
            renderLineHighlight: "none",
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "off",
            contextmenu: false,
            overviewRulerLanes: 0,
            lineNumbersMinChars: 3,
            glyphMargin: true,
            folding: false,
            scrollbar: {
              verticalScrollbarSize: 5,
              horizontalScrollbarSize: 5,
            },
          }}
          beforeMount={(monaco) => {
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: true,
              noSuggestionDiagnostics: true,
            });
          }}
        />
      </div>
    </div>
  );
}
