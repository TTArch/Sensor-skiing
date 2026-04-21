/**
 * useCoach hook - provides voice coaching and run analysis
 * Accumulates issue frequencies across a run with 20s cooldown per issue type.
 */
import { useState, useCallback, useRef } from 'react';
import type { SkiIssue, IssueType, ProcessedFrame, RunData, RunResult } from '../types';
import { useStore } from '../store';

export interface UseCoachReturn {
  currentTip: string | null;
  isSpeaking: boolean;
  speak: (text: string, issue?: IssueType | null) => void;
  startRun: () => void;
  finalizeRun: (runData: RunData) => RunResult;
  onFrame: (frame: ProcessedFrame) => void;
}

const COOLDOWN_MS = 20000; // 20 seconds

export function useCoach(): UseCoachReturn {
  const { setCurrentRun, addRunToHistory } = useStore();
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Accumulated issue counts (frequency map)
  const issueCounts = useRef<
    Record<
      IssueType,
      { count: number; maxSeverity: SkiIssue['severity']; tip: string }
    >
  >({
    back_seat: { count: 0, maxSeverity: 'low', tip: '' },
    forward_pressure: { count: 0, maxSeverity: 'low', tip: '' },
    upper_body_rotation: { count: 0, maxSeverity: 'low', tip: '' },
    poor_angulation: { count: 0, maxSeverity: 'low', tip: '' },
    skidding: { count: 0, maxSeverity: 'low', tip: '' },
    weight_imbalance: { count: 0, maxSeverity: 'low', tip: '' },
  });

  // Cooldown tracking
  const lastSpokenRef = useRef<Record<IssueType, number>>({
    back_seat: 0,
    forward_pressure: 0,
    upper_body_rotation: 0,
    poor_angulation: 0,
    skidding: 0,
    weight_imbalance: 0,
  });
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((text: string, issue: IssueType | null = null) => {
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    setCurrentTip(text);
    setIsSpeaking(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setCurrentTip(null);
      setIsSpeaking(false);
    }, 3000);
  }, []);

  const startRun = useCallback(() => {
    // Reset issue counts
    const types: IssueType[] = [
      'back_seat',
      'forward_pressure',
      'upper_body_rotation',
      'poor_angulation',
      'skidding',
      'weight_imbalance',
    ];
    for (const t of types) {
      issueCounts.current[t] = { count: 0, maxSeverity: 'low', tip: '' };
      lastSpokenRef.current[t] = 0;
    }
    setCurrentTip(null);
    setIsSpeaking(false);
  }, []);

  const onFrame = useCallback(
    (frame: ProcessedFrame) => {
      const now = Date.now();
      for (const issue of frame.issues) {
        const entry = issueCounts.current[issue.type];
        entry.count++;
        const severityOrder = ['low', 'medium', 'high'];
        if (
          severityOrder.indexOf(issue.severity) >
          severityOrder.indexOf(entry.maxSeverity)
        ) {
          entry.maxSeverity = issue.severity;
        }
        if (!entry.tip) entry.tip = issue.tip;

        // Only speak for medium+ severity
        if (
          (issue.severity === 'medium' || issue.severity === 'high') &&
          now - lastSpokenRef.current[issue.type] >= COOLDOWN_MS
        ) {
          lastSpokenRef.current[issue.type] = now;
          speak(issue.tip, issue.type);
        }
      }
    },
    [speak]
  );

  const finalizeRun = useCallback(
    (runData: RunData): RunResult => {
      const aggregated: SkiIssue[] = [];
      for (const [type, entry] of Object.entries(
        issueCounts.current
      ) as [IssueType, { count: number; maxSeverity: SkiIssue['severity']; tip: string }][]) {
        if (entry.count > 0) {
          aggregated.push({
            type,
            severity: entry.maxSeverity,
            frequency: entry.count,
            tip: entry.tip,
          });
        }
      }

      const runResult: RunResult = {
        id: runData.id,
        startTime: runData.startTime,
        endTime: runData.endTime,
        duration: runData.duration,
        turnCount: runData.turnCount,
        score: runData.score,
        issues: aggregated,
        dominantIssue:
          aggregated.length > 0
            ? aggregated.reduce((max, i) => (i.frequency > max.frequency ? i : max))
                .type
            : null,
      };

      setCurrentRun(runResult);
      addRunToHistory(runResult);
      return runResult;
    },
    [setCurrentRun, addRunToHistory]
  );

  return { currentTip, isSpeaking, speak, startRun, finalizeRun, onFrame };
}
