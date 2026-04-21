/**
 * Zustand store with AsyncStorage persistence for Ski Coach MVP
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConnectionStatus, RunResult, LLMSummaryResult } from '../types';
import type { Language } from '../utils/i18n';

interface AppState {
  // State
  connectionStatus: ConnectionStatus;
  isSimulated: boolean;
  currentRun: RunResult | null;
  pastRuns: RunResult[];

  // LLM summarization state
  isSummarizing: boolean;
  llmSummary: LLMSummaryResult | null;
  llmError: string | null;

  // Language state
  language: Language;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSimulated: (simulated: boolean) => void;
  setCurrentRun: (run: RunResult | null) => void;
  addRunToHistory: (run: RunResult) => void;
  clearHistory: () => void;

  // LLM actions
  setSummarizing: (isSummarizing: boolean) => void;
  setLlmSummary: (summary: LLMSummaryResult | null) => void;
  setLlmError: (error: string | null) => void;
  clearSummary: () => void;
  setLanguage: (language: Language) => void;
}

const MAX_PAST_RUNS = 50;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectionStatus: 'disconnected',
      isSimulated: true,
      currentRun: null,
      pastRuns: [],
      isSummarizing: false,
      llmSummary: null,
      llmError: null,
      language: 'en' as Language,

      // Actions
      setConnectionStatus: (status) => set({ connectionStatus: status }),

      setSimulated: (simulated) => {
        set({
          isSimulated: simulated,
          connectionStatus: simulated ? 'simulated' : 'disconnected',
        });
      },

      setCurrentRun: (run) => set({ currentRun: run }),

      addRunToHistory: (run) => {
        const { pastRuns } = get();
        const updated = [run, ...pastRuns].slice(0, MAX_PAST_RUNS);
        set({ pastRuns: updated });
      },

      clearHistory: () => set({ pastRuns: [] }),

      // LLM summarization actions
      setSummarizing: (isSummarizing) => set({ isSummarizing }),
      setLlmSummary: (summary) =>
        set({ llmSummary: summary, llmError: null }),
      setLlmError: (error) => set({ llmError: error, isSummarizing: false }),
      clearSummary: () =>
        set({ llmSummary: null, llmError: null, isSummarizing: false }),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'ski-coach-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pastRuns: state.pastRuns,
        isSimulated: state.isSimulated,
        language: state.language,
      }),
    }
  )
);
