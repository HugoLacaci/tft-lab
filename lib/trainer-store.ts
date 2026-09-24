"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { emptyProgress, isoDay, type Progress } from "./progress";
import { newEntry, review } from "./srs";
import type { ScenarioCategory } from "./scenario-categories";
import { safeGet, safeRemove, safeSet } from "./storage";

interface TrainerState {
  progress: Progress;
  record: (scenarioId: string, category: ScenarioCategory, correct: boolean, opts?: { hinted?: boolean }) => void;
  /** "I'm Gold" → unlock the path up to that module index. */
  setPlaced: (moduleIndex: number) => void;
  markLessonPassed: (lessonId: string) => void;
  reset: () => void;
  hydrated: boolean;
  setHydrated: () => void;
}

/** localStorage wrapped so a throwing storage degrades to in-memory state. */
const storage = createJSONStorage<Pick<TrainerState, "progress">>(() => ({
  getItem: (k) => safeGet(k),
  setItem: (k, v) => {
    safeSet(k, v);
  },
  removeItem: (k) => safeRemove(k),
}));

export const useTrainer = create<TrainerState>()(
  persist(
    (set, get) => ({
      progress: emptyProgress(),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      record: (scenarioId, category, correct, opts) => {
        const p = structuredClone(get().progress);
        const cat = p.perCategory[category] ?? { attempts: 0, correct: 0 };
        cat.attempts++;
        if (correct) cat.correct++;
        p.perCategory[category] = cat;
        p.rolling = [...p.rolling, correct].slice(-20);
        const day = isoDay();
        if (!p.activeDays.includes(day)) p.activeDays = [...p.activeDays, day].slice(-400);
        const seen = p.seen[scenarioId] ?? { attempts: 0, correct: 0 };
        seen.attempts++;
        if (correct) seen.correct++;
        seen.last = correct;
        seen.at = Date.now();
        if (opts?.hinted) seen.hinted = (seen.hinted ?? 0) + 1;
        p.seen[scenarioId] = seen;
        const entry = p.srs[scenarioId] ?? newEntry(scenarioId);
        p.srs[scenarioId] = review(entry, correct);
        set({ progress: p });
      },
      setPlaced: (moduleIndex) => set({ progress: { ...get().progress, placed: moduleIndex } }),
      markLessonPassed: (lessonId) => {
        const p = get().progress;
        if (p.lessonsPassed?.[lessonId]) return;
        set({ progress: { ...p, lessonsPassed: { ...(p.lessonsPassed ?? {}), [lessonId]: isoDay() } } });
      },
      reset: () => set({ progress: emptyProgress() }),
    }),
    {
      name: "tftlab.progress.v1",
      storage,
      partialize: (s) => ({ progress: s.progress }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
