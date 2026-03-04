import { create } from "zustand";
import type { Snapshot } from "@/engine/types";

interface TimelineState {
    snapshots: Snapshot[];
    currentStep: number;
    isPlaying: boolean;
    speed: number; // 0.25 to 4
    totalComparisons: number;
    totalSwaps: number;

    // actions
    setSnapshots: (snapshots: Snapshot[]) => void;
    setCurrentStep: (step: number) => void;
    stepForward: () => void;
    stepBackward: () => void;
    togglePlay: () => void;
    setSpeed: (speed: number) => void;
    reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
    snapshots: [],
    currentStep: 0,
    isPlaying: false,
    speed: 1,
    totalComparisons: 0,
    totalSwaps: 0,

    setSnapshots: (snapshots) =>
        set({ snapshots, currentStep: 0, isPlaying: false, totalComparisons: 0, totalSwaps: 0 }),

    setCurrentStep: (step) => {
        const { snapshots } = get();
        if (step >= 0 && step < snapshots.length) {
            const snap = snapshots[step];
            set({
                currentStep: step,
                totalComparisons: snap.comparisons,
                totalSwaps: snap.swaps,
            });
        }
    },

    stepForward: () => {
        const { currentStep, snapshots } = get();
        if (currentStep < snapshots.length - 1) {
            const next = currentStep + 1;
            const snap = snapshots[next];
            set({
                currentStep: next,
                totalComparisons: snap.comparisons,
                totalSwaps: snap.swaps,
            });
        } else {
            set({ isPlaying: false });
        }
    },

    stepBackward: () => {
        const { currentStep, snapshots } = get();
        if (currentStep > 0) {
            const prev = currentStep - 1;
            const snap = snapshots[prev];
            set({
                currentStep: prev,
                totalComparisons: snap.comparisons,
                totalSwaps: snap.swaps,
            });
        }
    },

    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

    setSpeed: (speed) => set({ speed }),

    reset: () =>
        set({
            snapshots: [],
            currentStep: 0,
            isPlaying: false,
            totalComparisons: 0,
            totalSwaps: 0,
        }),
}));
