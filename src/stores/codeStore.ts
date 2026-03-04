import { create } from "zustand";
import type { AlgorithmInfo } from "@/engine/types";
import type { DetectedLanguage } from "@/engine/transpiler";

interface CodeState {
  code: string;
  language: string;
  detectedAlgorithm: AlgorithmInfo | null;
  activeQuestionId: string | null;
  runError: string | null;
  detectedInputLanguage: DetectedLanguage | null;
  wasTranspiled: boolean;
  isExecuting: boolean;
  executionStatus: string | null; // e.g. "Loading Python runtime…"

  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setDetectedAlgorithm: (info: AlgorithmInfo | null) => void;
  setActiveQuestion: (id: string, code: string) => void;
  setRunError: (err: string | null) => void;
  setDetectedInputLanguage: (lang: DetectedLanguage | null) => void;
  setWasTranspiled: (val: boolean) => void;
  setIsExecuting: (v: boolean) => void;
  setExecutionStatus: (status: string | null) => void;
}

const DEFAULT_CODE = `// paste or write your algorithm here
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
bubbleSort([64,34,25,12,22,11,90]);`;

export const useCodeStore = create<CodeState>((set) => ({
  code: DEFAULT_CODE,
  language: "javascript",
  detectedAlgorithm: null,
  activeQuestionId: null,
  runError: null,
  detectedInputLanguage: null,
  wasTranspiled: false,
  isExecuting: false,
  executionStatus: null,

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setDetectedAlgorithm: (info) => set({ detectedAlgorithm: info }),
  setActiveQuestion: (id, code) => set({ activeQuestionId: id, code }),
  setRunError: (err) => set({ runError: err }),
  setDetectedInputLanguage: (lang) => set({ detectedInputLanguage: lang }),
  setWasTranspiled: (val) => set({ wasTranspiled: val }),
  setIsExecuting: (v) => set({ isExecuting: v }),
  setExecutionStatus: (status) => set({ executionStatus: status }),
}));
