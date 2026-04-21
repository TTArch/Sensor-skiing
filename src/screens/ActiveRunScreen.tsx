/**
 * ActiveRunScreen - Main skiing screen
 * PERFORMANCE CRITICAL: Updates at 20Hz, must not lag
 * Designed for 0.5-second glances while on chairlift
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PressureViz from '../components/PressureViz';
import { useSensor } from '../hooks/useSensor';
import { useCoach } from '../hooks/useCoach';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, fontSize, spacing, borderRadius, touchTarget } from '../utils/theme';
import type { RunResult } from '../types';

type RootStackParamList = {
  Home: undefined;
  ActiveRun: undefined;
  RunReview: { run: RunResult };
};

// Coaching overlay component with its own state
function CoachingOverlay({ text }: { text: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (text) {
      opacity.setValue(1);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 3000,
        delay: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [text, opacity]);

  if (!text) return null;

  return (
    <Animated.View style={[styles.coachingBubble, { opacity }]}>
      <Text style={styles.coachingText}>{text}</Text>
    </Animated.View>
  );
}

// Timer component - updates every 1 second
function Timer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  return <Text style={styles.timerText}>{formatted}</Text>;
}

// Turn counter
function TurnCounter({ count, turnsLabel }: { count: number; turnsLabel: string }) {
  return (
    <View style={styles.turnCounter}>
      <Text style={styles.turnIcon}>↻</Text>
      <Text style={styles.turnCount}>{count}</Text>
      <Text style={styles.turnLabel}>{turnsLabel}</Text>
    </View>
  );
}

export default function ActiveRunScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveRun'>;
}) {
  const { t } = useLanguage();
  const { pressure, centerOfPressure, currentFrame, turnCount, startRun, endRun } =
    useSensor();
  const { onFrame, currentTip, finalizeRun } = useCoach();

  const runStartTime = useRef(Date.now());

  // Start the run on mount
  useEffect(() => {
    runStartTime.current = Date.now();
    startRun();
    // No cleanup needed — endRun handles adapter lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRun]);

  // Push frames to coach for issue accumulation and live tips
  useEffect(() => {
    if (currentFrame) {
      onFrame(currentFrame);
    }
  }, [currentFrame, onFrame]);

  const handleEndRun = useCallback(() => {
    const runData = endRun();
    const runResult = finalizeRun(runData);
    navigation.replace('RunReview', { run: runResult });
  }, [endRun, finalizeRun, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Timer startTime={runStartTime.current} />
        <TurnCounter count={turnCount} turnsLabel={t('activeRun.turns')} />
      </View>

      {/* Main pressure visualization area */}
      <View style={styles.mainArea}>
        {/* Coaching overlay */}
        <CoachingOverlay text={currentTip} />

        {/* Pressure visualization */}
        <PressureViz pressure={pressure} centerOfPressure={centerOfPressure} />
      </View>

      {/* Bottom stop button */}
      <TouchableOpacity
        style={styles.stopButton}
        onPress={handleEndRun}
        activeOpacity={0.8}
      >
        <Text style={styles.stopButtonText}>{t('activeRun.endRun')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  timerText: {
    color: colors.text,
    fontSize: fontSize.timer,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  turnCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnIcon: {
    color: colors.primary,
    fontSize: fontSize.title,
    marginRight: spacing.xs,
  },
  turnCount: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  turnLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
  },
  mainArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachingBubble: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    zIndex: 10,
  },
  coachingText: {
    color: colors.text,
    fontSize: fontSize.coaching,
    fontWeight: '600',
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: colors.danger,
    height: touchTarget.button,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  stopButtonText: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: 'bold',
  },
});
