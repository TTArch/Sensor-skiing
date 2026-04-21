/**
 * HomeScreen - Landing screen for Ski Coach MVP
 * Shows connection status, start button, simulator toggle, and recent runs
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../store';
import { useSensor } from '../hooks/useSensor';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, fontSize, spacing, borderRadius, touchTarget } from '../utils/theme';
import type { RunResult } from '../types';

type RootStackParamList = {
  Home: undefined;
  ActiveRun: undefined;
  RunReview: { run: RunResult };
};

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getScoreColor(score: number): string {
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function ConnectionIndicator({ status, battery }: { status: string; battery: number | null }) {
  const { t } = useLanguage();
  const dotColor =
    status === 'connected'
      ? colors.connected
      : status === 'simulated'
      ? colors.simulated
      : colors.disconnected;

  const statusText =
    status === 'connected'
      ? t('home.connected')
      : status === 'simulated'
      ? t('home.simulator')
      : t('home.disconnected');

  return (
    <View style={styles.connectionContainer}>
      <View style={styles.connectionRow}>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <Text style={styles.statusText}>{statusText}</Text>
        {status === 'connected' && battery !== null && (
          <View style={styles.batteryContainer}>
            <Text style={styles.batteryIcon}>🔋</Text>
            <Text style={styles.batteryText}>{battery}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function RecentRunItem({ item, onPress, turnsLabel }: { item: RunResult; onPress: () => void; turnsLabel: string }) {
  return (
    <TouchableOpacity style={styles.runItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.runDate}>{formatDate(item.startTime)}</Text>
      <Text style={[styles.runScore, { color: getScoreColor(item.score) }]}>
        {item.score}
      </Text>
      <Text style={styles.runTurns}>{item.turnCount} {turnsLabel}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { pastRuns, isSimulated, setSimulated, connectionStatus } = useStore();
  const { startScanning, batteryLevel } = useSensor();
  const { t, language, setLanguage } = useLanguage();

  const handleStartPress = useCallback(() => {
    if (connectionStatus === 'disconnected') {
      // Start BLE scan or simulator
      startScanning();
    } else {
      // Navigate to active run
      navigation.navigate('ActiveRun');
    }
  }, [connectionStatus, navigation, startScanning]);

  const handleRunPress = useCallback(
    (run: RunResult) => {
      navigation.navigate('RunReview', { run });
    },
    [navigation]
  );

  const handleSimulatorToggle = useCallback(
    (value: boolean) => {
      setSimulated(value);
      if (value) {
        startScanning();
      }
    },
    [setSimulated, startScanning]
  );

  const buttonText =
    connectionStatus === 'disconnected' ? t('home.connectDevice') : t('home.startSkiing');

  const recentRuns = pastRuns.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Connection Status */}
      <ConnectionIndicator status={connectionStatus} battery={batteryLevel} />

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Start Button - Hero Element */}
      <TouchableOpacity
        style={[
          styles.startButton,
          connectionStatus === 'disconnected' && styles.startButtonDisconnected,
        ]}
        onPress={handleStartPress}
        activeOpacity={0.8}
      >
        <Text style={styles.startButtonText}>{buttonText}</Text>
      </TouchableOpacity>

      {/* Simulator Toggle */}
      <View style={styles.simulatorRow}>
        <Text style={styles.simulatorLabel}>{t('home.demoMode')}</Text>
        <Switch
          value={isSimulated}
          onValueChange={handleSimulatorToggle}
          trackColor={{ false: '#333', true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {/* Language Switcher - Prominent Toggle */}
      <View style={styles.settingsRow}>
        <View style={styles.languageContainer}>
          <Text style={styles.languageLabel}>{t('home.language')}</Text>
          <View style={styles.languageToggle}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'en' && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'en' && styles.languageOptionTextActive,
                ]}
              >
                EN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'zh' && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage('zh')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'zh' && styles.languageOptionTextActive,
                ]}
              >
                中文
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Recent Runs */}
      <View style={styles.recentRunsContainer}>
        <Text style={styles.sectionTitle}>{t('home.recentRuns')}</Text>
        {recentRuns.length === 0 ? (
          <Text style={styles.emptyText}>{t('home.noRunsYet')}</Text>
        ) : (
          <FlatList
            data={recentRuns}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecentRunItem
                item={item}
                onPress={() => handleRunPress(item)}
                turnsLabel={t('activeRun.turns')}
              />
            )}
            style={styles.runsList}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  connectionContainer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  batteryIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  batteryText: {
    color: colors.text,
    fontSize: fontSize.label,
  },
  spacer: {
    flex: 1,
  },
  startButton: {
    backgroundColor: colors.primary,
    height: touchTarget.heroButton,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
  },
  startButtonDisconnected: {
    backgroundColor: colors.warning,
  },
  startButtonText: {
    color: colors.background,
    fontSize: fontSize.title,
    fontWeight: 'bold',
  },
  simulatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  simulatorLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    marginRight: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.card,
    padding: spacing.sm,
  },
  languageLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    marginRight: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  languageToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  languageOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: colors.primary,
  },
  languageOptionText: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    fontWeight: '600',
  },
  languageOptionTextActive: {
    color: colors.background,
    fontWeight: 'bold',
  },
  languageButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  languageText: {
    color: colors.primary,
    fontSize: fontSize.label,
    fontWeight: '600',
  },
  recentRunsContainer: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  runsList: {
    maxHeight: 250,
  },
  runItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  runDate: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    flex: 1,
  },
  runScore: {
    fontSize: fontSize.body,
    fontWeight: 'bold',
    marginRight: spacing.md,
    minWidth: 40,
    textAlign: 'right',
  },
  runTurns: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    minWidth: 80,
    textAlign: 'right',
  },
});
